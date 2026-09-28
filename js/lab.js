/* =========================================================
   lab.js — 실험실 화면 (그리기 · 계기판 · 조작 · 미션)
   ---------------------------------------------------------
   계산은 galaxy.js 가 하고, 이 파일은 그것을 '보이게' 만든다.

   화면의 핵심 장치 세 가지
     ① 우리은하를 **위에서 / 옆에서** 나란히 볼 수 있게 한다.
        위에서는 막대와 나선팔, 옆에서는 볼록한 원반 — 학습지의 두 문장이 그대로 그림이 된다.
     ② 은하수 장면은 **원반 안에 있는 우리 자리에서 시선을 뻗어** 본다.
        시선이 원반을 얼마나 길게 지나는지가 곧 밝기다. 세 물음이 이 하나로 풀린다.
     ③ 성단·성운은 **짝을 나란히** 놓는다. 헷갈리는 것은 사실이 아니라 짝이기 때문이다.

   ⚠ 애니메이션이 없으므로 requestAnimationFrame 을 돌리지 않는다.
   ========================================================= */
(function () {
  "use strict";

  var G = window.Galaxy;

  var S = {
    scene: "shape",
    view: "top",          // top | side
    lon: 0,               // 은하 중심에서 벗어난 각 (도)
    lat: 0,               // 은하면에서 위아래 (도)
    season: "summer",
    obj: "cluster",       // cluster | nebula
    mission: null, predictPick: null, missionState: "ready"
  };

  var canvas, ctx, cssW = 900, cssH = 556;
  var records = [];
  var seen = { side: false, top: false, lonBack: false, latUp: false, winter: false, nebula: false };

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return G.clamp(v, a, b); }
  /* 화면에는 kpc 로 보여 준다(선생님 요청 2026-09-28). 엔진(galaxy.js)은 pc 로 계산한다.
     23500 pc → "23.5" · 30000 pc → "30" · 866 pc → "0.9" */
  function kpcNum(pc) { return String(Math.round(pc / 100) / 10); }

  /* ---------------------------------------------------------
     1. 미션
     --------------------------------------------------------- */
  var MISSIONS = [
    {
      id: 1, star: "🌌", title: "우리은하는 무슨 모양?",
      story: "우리은하를 <b>위에서</b> 보면 어떤 모양일까? <b>옆에서</b> 보면? " +
             "두 방향을 모두 보고 확인하자.",
      scene: "shape", setup: { view: "top" }, allow: ["view"],
      predict: { q: "우리은하는 어떤 은하로 분류될까?",
                 opts: ["타원은하", "막대나선은하", "불규칙은하"], ans: 1 },
      goals: [{ key: "sideView", text: "<b>옆에서</b> 본 모습 확인하기" }],
      why: "우리은하는 <b>막대나선은하</b>입니다.<br>" +
           "· <b>위에서</b> 보면 <b>막대</b> 모양의 중심부와 <b>나선팔</b>이 있습니다.<br>" +
           "· <b>옆에서</b> 보면 중심부가 볼록한 <b>원반</b> 모양입니다.<br>" +
           "은하는 <b>모양</b>을 기준으로 분류합니다."
    },
    {
      id: 2, star: "📍", title: "태양계는 어디에?",
      story: "우리은하의 지름은 약 <b>30 kpc</b>. 태양계는 은하의 <b>어디쯤</b>에 있을까? " +
             "위에서 본 모습에서 찾아보자.",
      scene: "shape", setup: { view: "side" }, allow: ["view"],
      predict: { q: "태양계는 우리은하의 어디에 있을까?",
                 opts: ["정중앙(중심)", "중심에서 8.5 kpc 떨어진 나선팔", "은하 바깥"], ans: 1 },
      goals: [{ key: "topView", text: "<b>위에서</b> 본 모습으로 태양계 자리 확인하기" }],
      why: "태양계는 은하 중심에서 약 <b>8.5 kpc</b> 떨어진 <b>나선팔</b>에 있습니다. " +
           "<b>중심이 아닙니다.</b><br>" +
           "지름이 30 kpc 이니 반지름은 15 kpc. 태양계는 그 절반이 조금 넘는 곳, " +
           "<b>변두리 쪽</b>에 있는 셈이에요.<br>" +
           "<em>이 사실이 다음 장면(은하수)의 열쇠가 됩니다 — 우리는 원반 <b>안</b>에 있습니다.</em>"
    },
    {
      id: 3, star: "🥛", title: "은하수는 왜 띠일까",
      story: "밤하늘의 은하수는 <b>띠</b> 모양이다. 왜 동그란 덩어리가 아니라 띠일까? " +
             "은하면에서 <b>위아래로</b> 시선을 올려 보며 밝기가 어떻게 변하는지 보자.",
      scene: "milky", setup: { lon: 0, lat: 0 }, allow: ["lon", "lat"],
      predict: { q: "은하면에서 위쪽으로 시선을 올리면 밝기는?",
                 opts: ["빠르게 어두워진다", "더 밝아진다", "변하지 않는다"], ans: 0 },
      goals: [{ key: "latUp", text: "은하면에서 <b>30° 이상</b> 위로 올려 보기" }],
      why: "<b>우리가 원반 안에 있기 때문</b>입니다.<br>" +
           "· 원반을 <b>따라</b> 보면 시선이 원반 속을 아주 길게 지나 <b>별이 겹겹이 겹쳐</b> 밝습니다.<br>" +
           "· 원반 <b>위아래</b>로 보면 금방 원반을 벗어나 별이 적어 <b>어둡습니다.</b><br>" +
           "그래서 밝은 부분이 하늘을 <b>가로지르는 띠</b>로 보이는 것입니다. " +
           "은하수는 <b>우리은하의 옆모습</b>이에요."
    },
    {
      id: 4, star: "🔭", title: "폭과 밝기는 일정할까",
      story: "은하수를 따라가며 보면 <b>폭과 밝기가 늘 같을까?</b> " +
             "중심에서 벗어난 각을 <b>180°</b>(정반대쪽)까지 돌려 보자.",
      scene: "milky", setup: { lon: 0, lat: 0 }, allow: ["lon", "lat"],
      predict: { q: "은하 중심 반대쪽을 보면 은하수는?",
                 opts: ["더 밝고 두껍다", "더 어둡고 얇다", "똑같다"], ans: 1 },
      goals: [{ key: "lonBack", text: "중심에서 <b>150° 이상</b> 돌려 보기" }],
      why: "<b>일정하지 않습니다.</b><br>" +
           "태양계는 은하 <b>중심에서 8.5 kpc 치우쳐</b> 있습니다. 그래서<br>" +
           "· <b>중심 쪽</b>을 보면 지나는 원반이 길고 별이 빽빽해 <b>밝고 두껍습니다.</b><br>" +
           "· <b>반대쪽(바깥)</b>을 보면 원반이 금방 끝나 <b>어둡고 얇습니다.</b>"
    },
    {
      id: 5, star: "☀️", title: "왜 여름에 잘 보일까",
      story: "은하수는 <b>겨울보다 여름</b>에 훨씬 잘 보인다. 왜 그럴까? " +
             "계절을 바꿔 보며 확인하자.",
      scene: "milky", setup: { lon: 0, lat: 0, season: "summer" }, allow: ["season", "lon"],
      predict: { q: "여름 밤하늘이 향하는 쪽은?",
                 opts: ["은하 중심 쪽", "은하 바깥쪽", "은하면 위쪽"], ans: 0 },
      goals: [{ key: "winter", text: "<b>겨울</b>로 바꿔 밝기 비교하기" }],
      why: "<b>여름 밤에는 지구의 밤 쪽이 은하 중심을 향하기 때문</b>입니다.<br>" +
           "중심 쪽에는 별이 훨씬 빽빽하니 은하수가 <b>밝고 두껍게</b> 보입니다.<br>" +
           "겨울 밤에는 반대로 은하 <b>바깥쪽</b>을 보게 되어 은하수가 <b>옅습니다.</b><br>" +
           "<em>지구가 태양을 도는 동안 밤에 향하는 방향이 바뀌기 때문이에요.</em>"
    },
    {
      id: 6, star: "✨", title: "성단과 성운 짝 맞추기",
      story: "우리은하 안에는 별 말고도 <b>성단</b>과 <b>성운</b>이 있다. " +
             "성단(산개·구상)과 성운(방출·반사·암흑)을 모두 살펴보자.",
      scene: "cluster", setup: { obj: "cluster" }, allow: ["obj"],
      predict: { q: "<b>구상 성단</b>은 주로 어떤 색 별들로 이루어져 있을까?",
                 opts: ["푸른색", "붉은색", "흰색"], ans: 1 },
      goals: [{ key: "nebula", text: "<b>성운</b>도 살펴보기" }],
      why: "<b>성단</b> — 많은 별들이 좁은 공간에 모여 있는 천체<br>" +
           "· <b>산개 성단</b> : 수십~수만 개 · 엉성하게 · <b>푸른색</b> · <b>나선팔</b>에<br>" +
           "· <b>구상 성단</b> : 수만~수십만 개 · 공 모양으로 빽빽하게 · <b>붉은색</b> · <b>중심부와 그 둘레</b>에<br><br>" +
           "<b>성운</b> — 성간 물질이 밀집되어 구름처럼 보이는 천체<br>" +
           "· <b>방출</b> 성운 : 별빛을 흡수해 <b>스스로 빛낸다</b> → 붉은색<br>" +
           "· <b>반사</b> 성운 : 별빛을 <b>반사한다</b> → 푸른색<br>" +
           "· <b>암흑</b> 성운 : 뒤쪽 별빛을 <b>가로막는다</b> → 검은색"
    }
  ];

  /* ---------------------------------------------------------
     2. 장면 · 크기
     --------------------------------------------------------- */
  function sceneKind() {
    if (S.scene === "mission") return S.mission ? S.mission.scene : "shape";
    return S.scene;
  }

  function layout() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    cssW = Math.max(320, Math.round(r.width || 900));
    cssH = Math.max(200, Math.round(r.height || cssW / 1.62));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------------------------------------------------
     3. 그리기
     --------------------------------------------------------- */
  var COL = { ink: "#e2e8f0", faint: "#64748b", line: "#94a3b8", sun: "#fde047", arm: "#c7d2fe" };

  function draw() {
    if (!ctx) return;
    var g = ctx;
    var grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, "#070b16"); grad.addColorStop(1, "#161f33");
    g.fillStyle = grad; g.fillRect(0, 0, cssW, cssH);
    var k = sceneKind();
    if (k === "shape") drawShape(g);
    else if (k === "milky") drawMilky(g);
    else drawCluster(g);
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* 별가루 — 씨앗을 고정해 다시 그려도 같은 자리에 찍힌다 */
  function seeded(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* ---- 장면 ① 우리은하의 모양 ---- */
  function drawShape(g) {
    var cx = cssW * 0.44, cy = cssH * 0.46;
    var R = Math.min(cssW * 0.30, cssH * 0.38);
    var sunR = R * (G.MW.sunFromCenterPc / (G.MW.diameterPc / 2));

    if (S.view === "top") {
      /* 나선팔 — 두 팔이 막대 끝에서 뻗어 나간다 */
      for (var arm = 0; arm < 2; arm++) {
        g.strokeStyle = "rgba(199,210,254,.30)";
        g.lineWidth = R * 0.20;
        g.lineCap = "round";
        g.beginPath();
        for (var t = 0; t <= 1.001; t += 0.02) {
          var ang = arm * Math.PI + t * Math.PI * 1.45;
          var rr = R * (0.22 + 0.78 * t);
          var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 1.0;
          if (t === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }
      /* 별가루 */
      for (var i = 0; i < 420; i++) {
        var a = seeded(i) * Math.PI * 2, rad = Math.sqrt(seeded(i + 900)) * R;
        g.fillStyle = "rgba(226,232,240," + (0.25 + seeded(i + 50) * 0.5) + ")";
        g.beginPath(); g.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 1.1, 0, Math.PI * 2); g.fill();
      }
      /* 막대 모양 중심부 */
      g.save();
      g.translate(cx, cy); g.rotate(-0.35);
      var bg = g.createLinearGradient(-R * 0.42, 0, R * 0.42, 0);
      bg.addColorStop(0, "rgba(253,224,71,.25)");
      bg.addColorStop(0.5, "rgba(253,224,71,.85)");
      bg.addColorStop(1, "rgba(253,224,71,.25)");
      g.fillStyle = bg;
      g.beginPath(); g.ellipse(0, 0, R * 0.42, R * 0.14, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      g.fillStyle = COL.ink; g.font = "bold 14px sans-serif"; g.textAlign = "center";
      g.fillText("막대 모양 중심부", cx, cy - R * 0.30);
      g.fillStyle = COL.faint;
      g.fillText("나선팔", cx + R * 0.72, cy + R * 0.62);

      /* 태양계 — 중심에서 **정확히 sunR** 떨어진 곳에 둔다.
         (예전에는 0.72·0.66 을 곱해 실제보다 2% 가까이 그려졌다) */
      var sunAng = Math.atan2(0.66, 0.72);
      var sx = cx + Math.cos(sunAng) * sunR, sy = cy + Math.sin(sunAng) * sunR;
      g.strokeStyle = COL.sun; g.lineWidth = 1.5;
      g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(sx, sy); g.stroke();
      g.setLineDash([]);
      g.fillStyle = COL.sun;
      g.beginPath(); g.arc(sx, sy, 6, 0, Math.PI * 2); g.fill();
      g.font = "bold 14px sans-serif"; g.textAlign = "left";
      g.fillText("☀️ 태양계", sx + 10, sy + 5);
      g.fillStyle = COL.faint; g.font = "13px sans-serif";
      g.fillText("중심에서 8.5 kpc", sx + 10, sy + 24);

      /* 지름 자 */
      var ry = cy + R + 26;
      g.strokeStyle = COL.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx - R, ry); g.lineTo(cx + R, ry); g.stroke();
      [cx - R, cx + R].forEach(function (x) {
        g.beginPath(); g.moveTo(x, ry - 6); g.lineTo(x, ry + 6); g.stroke();
      });
      g.fillStyle = COL.ink; g.font = "bold 14px sans-serif"; g.textAlign = "center";
      g.fillText("지름 약 30 kpc (약 10만 광년)", cx, ry - 12);

    } else {
      /* 옆에서 — 볼록한 원반 */
      /* ⚠ 원반 두께는 **일부러 부풀려** 그린다.
         실제 두께 1000 pc ÷ 지름 30000 pc = 1/30 이라, 그대로 그리면 R*0.033 —
         몇 픽셀짜리 실선이 되어 '볼록한 중심부'도 '원반'도 보이지 않는다.
         대신 그림 안에 **부풀렸다는 말과 실제 값**을 적어 둔다(아래 이름표). */
      var halfW = R, halfH = R * 0.16;
      for (var j = 0; j < 400; j++) {
        var u = (seeded(j) * 2 - 1), v = (seeded(j + 700) * 2 - 1);
        if (u * u + v * v > 1) continue;
        g.fillStyle = "rgba(226,232,240," + (0.2 + seeded(j + 30) * 0.5) + ")";
        g.beginPath(); g.arc(cx + u * halfW, cy + v * halfH, 1.1, 0, Math.PI * 2); g.fill();
      }
      /* 볼록한 중심부 */
      var bulge = g.createRadialGradient(cx, cy, 2, cx, cy, R * 0.24);
      bulge.addColorStop(0, "rgba(253,224,71,.9)");
      bulge.addColorStop(1, "rgba(253,224,71,0)");
      g.fillStyle = bulge;
      g.beginPath(); g.ellipse(cx, cy, R * 0.24, R * 0.16, 0, 0, Math.PI * 2); g.fill();
      /* 원반 윤곽 */
      g.strokeStyle = "rgba(199,210,254,.5)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(cx, cy, halfW, halfH, 0, 0, Math.PI * 2); g.stroke();

      g.fillStyle = COL.ink; g.font = "bold 14px sans-serif"; g.textAlign = "center";
      g.fillText("중심부가 볼록한 원반 모양", cx, cy - R * 0.40);
      g.fillStyle = COL.faint; g.font = "12px sans-serif";
      g.fillText("두께 약 1 kpc — 지름의 30분의 1. 보이도록 두껍게 그렸다", cx, cy - R * 0.40 + 18);

      /* 태양계 표시. 이름표는 **원반 아래 가운데**에 둔다 —
         점 옆에 붙이면 태양계가 오른쪽에 있어서 글자가 무대 밖으로 나간다(검증에서 걸렸다). */
      var sx2 = cx + sunR;
      g.fillStyle = COL.sun;
      g.beginPath(); g.arc(sx2, cy, 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(253,224,71,.6)"; g.lineWidth = 1.5;
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(sx2, cy + 8); g.lineTo(sx2, cy + R * 0.34); g.stroke();
      g.setLineDash([]);
      g.fillStyle = COL.sun; g.font = "bold 14px sans-serif"; g.textAlign = "center";
      g.fillText("☀️ 태양계 — 원반 안", cx, cy + R * 0.46);
      g.fillStyle = COL.faint; g.font = "13px sans-serif";
      g.fillText("그래서 은하수가 띠로 보인다", cx, cy + R * 0.46 + 20);
    }

    g.fillStyle = COL.faint; g.font = "14px sans-serif"; g.textAlign = "left";
    g.fillText(S.view === "top" ? "⬆️ 위에서 본 우리은하" : "➡️ 옆에서 본 우리은하", 16, 26);
  }

  /* ---- 장면 ② 은하수 ---- */
  function drawMilky(g) {
    var cx = cssW * 0.30, cy = cssH * 0.60;
    var R = Math.min(cssW * 0.24, cssH * 0.32);
    var sunR = R * (G.MW.sunFromCenterPc / (G.MW.diameterPc / 2));

    /* 위에서 본 은하 (작게) */
    for (var i = 0; i < 300; i++) {
      var a = seeded(i) * Math.PI * 2, rad = Math.sqrt(seeded(i + 900)) * R;
      g.fillStyle = "rgba(226,232,240," + (0.18 + seeded(i + 50) * 0.4) + ")";
      g.beginPath(); g.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 1, 0, Math.PI * 2); g.fill();
    }
    var bg = g.createRadialGradient(cx, cy, 2, cx, cy, R * 0.3);
    bg.addColorStop(0, "rgba(253,224,71,.7)"); bg.addColorStop(1, "rgba(253,224,71,0)");
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "center";
    g.fillText("은하 중심", cx, cy - R * 0.36);

    /* 태양계 — 중심 오른쪽 */
    var sx = cx + sunR, sy = cy;
    g.fillStyle = COL.sun;
    g.beginPath(); g.arc(sx, sy, 6, 0, Math.PI * 2); g.fill();
    g.font = "bold 12px sans-serif";
    g.fillText("☀️ 여기", sx, sy + 22);

    /* 시선 — 중심에서 lon 만큼 벗어난 쪽.
       ⚠ **그려진 길이가 곧 pc 다.** 세로만 0.35 배로 눌러 그리면(예전 코드)
          같은 pc 라도 옆을 볼 때 훨씬 짧아 보여, 그림이 숫자와 다른 말을 한다.
          그래서 눌러 그리지 않는다 — 대신 **어느 방향으로도 무대를 넘지 않는
          하나의 눈금(pxFull)** 을 미리 구해 모든 방향에 똑같이 쓴다. */
    var lonRad = (180 - S.lon) * Math.PI / 180;   // 화면에서 중심 쪽이 왼쪽
    var len = G.pathInDisk(S.lon, S.lat);
    var maxLen = G.MW.sunFromCenterPc + G.MW.diameterPc / 2;

    var pxFull = Infinity;
    for (var q = 0; q < 360; q += 5) {
      var frac = G.pathInDisk(q, 0) / maxLen;     // 그 방향에서 가장 긴 경우(lat = 0)
      if (!(frac > 0)) continue;
      var qr = (180 - q) * Math.PI / 180;
      var ux = Math.cos(qr), uy = Math.sin(qr);
      var roomX = ux < -1e-6 ? (sx - 14) / -ux : (ux > 1e-6 ? (cssW * 0.54 - sx) / ux : Infinity);
      var roomY = uy < -1e-6 ? (sy - 14) / -uy : (uy > 1e-6 ? (cssH - 30 - sy) / uy : Infinity);
      pxFull = Math.min(pxFull, roomX / frac, roomY / frac);
    }
    if (!isFinite(pxFull) || pxFull < 0) pxFull = R;

    var px = (len / maxLen) * pxFull;
    var ex = sx + Math.cos(lonRad) * px, ey = sy + Math.sin(lonRad) * px;
    g.strokeStyle = "#38bdf8"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = "#38bdf8"; g.font = "bold 13px sans-serif"; g.textAlign = "center";
    g.fillText("시선", (sx + ex) / 2, (sy + ey) / 2 - 10);

    /* 오른쪽 : 그 방향의 밤하늘 */
    var vx = cssW * 0.58, vy = cssH * 0.14, vw = cssW * 0.38, vh = cssH * 0.56;
    g.fillStyle = "#05070d";
    roundRect(g, vx, vy, vw, vh, 10); g.fill();
    g.strokeStyle = "rgba(148,163,184,.4)"; g.lineWidth = 1.5; g.stroke();

    var bright = G.milkyBrightness(S.lon, S.lat);
    /* 은하수 띠 — 밝기에 따라 두께와 진하기가 달라진다 */
    var bandY = vy + vh * (0.5 + clamp(S.lat / 90, 0, 1) * 0.45);
    var bandH = vh * (0.10 + bright * 0.34);
    var bandGrad = g.createLinearGradient(0, bandY - bandH / 2, 0, bandY + bandH / 2);
    bandGrad.addColorStop(0, "rgba(226,232,240,0)");
    bandGrad.addColorStop(0.5, "rgba(226,232,240," + (0.10 + bright * 0.62) + ")");
    bandGrad.addColorStop(1, "rgba(226,232,240,0)");
    g.save();
    g.beginPath(); roundRect(g, vx, vy, vw, vh, 10); g.clip();
    g.fillStyle = bandGrad;
    g.fillRect(vx, bandY - bandH / 2, vw, bandH);
    /* 낱별 */
    var n = Math.round(60 + bright * 320);
    for (var k = 0; k < n; k++) {
      var rx = vx + seeded(k + 5) * vw;
      var spread = (seeded(k + 60) * 2 - 1);
      var ry = bandY + spread * bandH * 0.5 * (0.4 + seeded(k + 120));
      g.fillStyle = "rgba(255,255,255," + (0.3 + seeded(k + 200) * 0.7) + ")";
      g.beginPath(); g.arc(rx, ry, seeded(k + 300) * 1.3 + 0.5, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    g.fillStyle = COL.ink; g.font = "bold 14px sans-serif"; g.textAlign = "left";
    g.fillText("이 방향의 밤하늘", vx + 10, vy - 8);
    g.fillStyle = bright > 0.5 ? "#fde047" : COL.faint;
    g.font = "bold 15px sans-serif"; g.textAlign = "center";
    g.fillText("밝기 " + Math.round(bright * 100) + " %", vx + vw / 2, vy + vh + 24);

    g.fillStyle = COL.faint; g.font = "13px sans-serif"; g.textAlign = "left";
    g.fillText("시선이 원반을 " + kpcNum(len) + " kpc 지난다", 16, 26);
    g.fillText("길게 지날수록 별이 겹쳐 밝다", 16, 46);
  }

  /* ---- 장면 ③ 성단과 성운 ---- */
  function drawCluster(g) {
    var list = (S.obj === "cluster") ? G.CLUSTERS : G.NEBULAE;
    var n = list.length;
    var cw = cssW / n;

    list.forEach(function (item, i) {
      var cx = cw * (i + 0.5), cy = cssH * 0.30;
      var R = Math.min(cw * 0.28, cssH * 0.20);

      if (S.obj === "cluster") {
        /* 산개는 엉성하게, 구상은 공 모양으로 빽빽하게 */
        var cnt = item.key === "open" ? 40 : 260;
        for (var k = 0; k < cnt; k++) {
          var a = seeded(k + i * 500) * Math.PI * 2;
          var rr = item.key === "open"
            ? seeded(k + i * 500 + 77) * R                       // 고르게 퍼진다
            : Math.pow(seeded(k + i * 500 + 77), 0.45) * R * 0.8; // 가운데가 빽빽
          g.fillStyle = item.css;
          g.globalAlpha = 0.35 + seeded(k + i * 500 + 33) * 0.6;
          g.beginPath();
          g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, item.key === "open" ? 2.4 : 1.5, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      } else {
        /* 성운 — 뿌연 구름. 암흑 성운은 뒤 별빛을 가린다 */
        if (item.key === "dark") {
          for (var s = 0; s < 90; s++) {
            g.fillStyle = "rgba(255,255,255," + (0.25 + seeded(s + i * 300) * 0.6) + ")";
            g.beginPath();
            g.arc(cx + (seeded(s + i * 300 + 11) * 2 - 1) * R * 1.25,
                  cy + (seeded(s + i * 300 + 22) * 2 - 1) * R * 1.25, 1.1, 0, Math.PI * 2);
            g.fill();
          }
        }
        var ng = g.createRadialGradient(cx, cy, 2, cx, cy, R);
        ng.addColorStop(0, item.key === "dark" ? "rgba(10,10,14,.98)" : hexA(item.css, 0.85));
        ng.addColorStop(1, item.key === "dark" ? "rgba(10,10,14,0)" : hexA(item.css, 0));
        g.fillStyle = ng;
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      }

      /* 이름과 설명 */
      g.fillStyle = COL.ink; g.font = "bold 18px sans-serif"; g.textAlign = "center";
      g.fillText(item.name, cx, cy + R + 34);
      g.fillStyle = item.css; g.font = "bold 15px sans-serif";
      g.fillText("주로 " + item.color, cx, cy + R + 58);

      g.fillStyle = COL.faint; g.font = "13px sans-serif";
      var lines = (S.obj === "cluster")
        ? [item.count, item.shape, "있는 곳 : " + item.where]
        : [stripTags(item.how)];
      var y = cy + R + 82;
      lines.forEach(function (t) {
        wrapText(g, t, cw - 24).forEach(function (ln) { g.fillText(ln, cx, y); y += 18; });
      });
      y += 6;
      g.fillStyle = "rgba(226,232,240,.55)"; g.font = "12px sans-serif";
      g.fillText("예 " + item.examples.join(" · "), cx, y);
    });

    g.fillStyle = COL.faint; g.font = "14px sans-serif"; g.textAlign = "left";
    g.fillText(S.obj === "cluster" ? "✨ 성단 — 많은 별이 좁은 공간에 모여 있다"
                                  : "🌈 성운 — 성간 물질이 밀집되어 구름처럼 보인다", 16, 24);
  }

  function hexA(hex, a) {
    var r = parseInt(hex.substr(1, 2), 16), gg = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return "rgba(" + r + "," + gg + "," + b + "," + a + ")";
  }
  function stripTags(s) { return String(s || "").replace(/<[^>]+>/g, ""); }
  function wrapText(g, text, maxW) {
    var out = [], line = "";
    Array.from(String(text)).forEach(function (ch) {
      var t = line + ch;
      if (line !== "" && g.measureText(t).width > maxW) { out.push(line); line = ch; }
      else line = t;
    });
    if (line) out.push(line);
    return out;
  }

  /* ---------------------------------------------------------
     4. 계기판
     --------------------------------------------------------- */
  function setBar(id, val, full) {
    $(id).querySelector(".bar-fill").style.width = clamp(val / full * 100, 0, 100) + "%";
  }
  function barText(id, t) { $(id).querySelector(".bar-val").textContent = t; }
  function ro(i, name, val, unit) {
    $("roName" + i).textContent = name; $("roVal" + i).textContent = val;
    $("roUnit" + i).textContent = unit || "";
  }

  function updatePanel() {
    var k = sceneKind();

    if (k === "shape") {
      $("gaugeTitle").textContent = "🌌 우리은하";
      $("gaugeSub").innerHTML = "크기와 태양계의 자리";
      $("barName1").textContent = "지름";
      $("barName2").textContent = "태양계까지";
      $("rowB").classList.remove("hidden");
      setBar("barA", G.MW.diameterPc, G.MW.diameterPc);
      barText("barA", kpcNum(G.MW.diameterPc) + " kpc");
      setBar("barB", G.MW.sunFromCenterPc, G.MW.diameterPc);
      barText("barB", kpcNum(G.MW.sunFromCenterPc) + " kpc");
      ro(1, "지름", kpcNum(G.MW.diameterPc), " kpc");
      ro(2, "태양계", kpcNum(G.MW.sunFromCenterPc), " kpc");
      ro(3, "별 수", "약 " + G.MW.stars, " 억 개");
      ro(4, "종류", G.MW.kind, "");
      $("fLaw").innerHTML = '지름 <span class="k">30</span> kpc ≒ 약 <span class="t">10만</span> 광년 ' +
                            '(1 kpc = 1000 pc · 1 pc = 3.26 광년)';
      $("fWhy").innerHTML = S.view === "top"
        ? '<em>위에서 보면 <b>막대</b> 모양 중심부와 <b>나선팔</b></em>'
        : '<em>옆에서 보면 중심부가 볼록한 <b>원반</b> 모양</em>';
      $("graphTitle").textContent = "📈 방향에 따른 은하수의 밝기";
      $("graphSub").innerHTML = "중심 쪽이 가장 밝다";

    } else if (k === "milky") {
      var len = G.pathInDisk(S.lon, S.lat);
      var bright = G.milkyBrightness(S.lon, S.lat);
      $("gaugeTitle").textContent = "🥛 은하수";
      $("gaugeSub").innerHTML = "시선이 원반을 <b>길게 지날수록</b> 밝다";
      $("barName1").textContent = "밝기";
      $("barName2").textContent = "지나는 거리";
      $("rowB").classList.remove("hidden");
      setBar("barA", bright, 1); barText("barA", Math.round(bright * 100) + " %");
      var maxLen = G.MW.sunFromCenterPc + G.MW.diameterPc / 2;
      setBar("barB", len, maxLen); barText("barB", kpcNum(len) + " kpc");
      ro(1, "중심에서", S.lon, " °");
      ro(2, "은하면에서", S.lat, " °");
      ro(3, "밝기", Math.round(bright * 100), " %");
      ro(4, "지나는 거리", kpcNum(len), " kpc");
      $("fLaw").innerHTML = '시선이 원반 속을 <span class="k">' + kpcNum(len) +
                            '</span> kpc 지난다 → 밝기 <span class="t">' + Math.round(bright * 100) + '</span> %';
      $("fWhy").innerHTML = (S.lat >= 25)
        ? '<em>은하면에서 많이 벗어났다 → 금방 원반을 벗어나 <b>어둡다</b></em>'
        : (S.lon >= 120
            ? '<em>은하 <b>바깥쪽</b>을 본다 → 원반이 금방 끝나 어둡고 얇다</em>'
            : '<em>은하 <b>중심 쪽</b>을 본다 → 별이 겹겹이 겹쳐 밝고 두껍다</em>');
      $("graphTitle").textContent = "📈 방향에 따른 은하수의 밝기";
      $("graphSub").innerHTML = "가로 = 중심에서 벗어난 각";

    } else {
      var list = (S.obj === "cluster") ? G.CLUSTERS : G.NEBULAE;
      $("gaugeTitle").textContent = (S.obj === "cluster") ? "✨ 성단" : "🌈 성운";
      $("gaugeSub").innerHTML = (S.obj === "cluster")
        ? "산개 ↔ 구상 을 나란히" : "방출 ↔ 반사 ↔ 암흑";
      $("rowB").classList.add("hidden");
      $("barName1").textContent = "종류";
      setBar("barA", 1, 1); barText("barA", list.length + " 가지");
      if (S.obj === "cluster") {
        ro(1, "산개 성단", "푸른색", "");
        ro(2, "산개 있는 곳", "나선팔", "");
        ro(3, "구상 성단", "붉은색", "");
        ro(4, "구상 있는 곳", "중심부 둘레", "");
        $("fLaw").innerHTML = '<span class="k">산개</span> 수십~수만 개 · 엉성하게 &nbsp;/&nbsp; ' +
                              '<span class="t">구상</span> 수만~수십만 개 · 공 모양';
        $("fWhy").innerHTML = '<em>성단 : 많은 별들이 좁은 공간에 집단을 이루고 있는 천체</em>';
      } else {
        ro(1, "방출 성운", "붉은색", "");
        ro(2, "반사 성운", "푸른색", "");
        ro(3, "암흑 성운", "검은색", "");
        ro(4, "성간 물질", "기체와 먼지", "");
        $("fLaw").innerHTML = '<span class="k">방출</span> 스스로 빛냄 · ' +
                              '<span class="t">반사</span> 별빛 반사 · 암흑 별빛 가림';
        $("fWhy").innerHTML = '<em>성운 : 성간 물질이 밀집되어 구름처럼 보이는 천체</em>';
      }
      $("graphTitle").textContent = "📈 방향에 따른 은하수의 밝기";
      $("graphSub").innerHTML = "중심 쪽이 가장 밝다";
    }

    $("tip").textContent = tipText();
    syncMissionGoals();
  }

  function tipText() {
    var k = sceneKind();
    if (k === "shape") return "위에서 / 옆에서 를 바꿔 보세요";
    if (k === "milky") return "각을 밀어 밤하늘이 어떻게 달라지는지 보세요";
    return "성단과 성운을 바꿔 보세요";
  }

  /* ---------------------------------------------------------
     5. 그래프 — 어느 장면에서나 '방향에 따른 밝기'를 보여 준다
     --------------------------------------------------------- */
  function drawGraph() {
    var c = $("graph");
    if (!c) return;
    var r = c.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, Math.round(r.width)), h = Math.max(100, Math.round(r.height));
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    var pad = 28;
    g.strokeStyle = "#cbd5e1"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad, h - pad); g.lineTo(w - 6, h - pad);
    g.moveTo(pad, 6); g.lineTo(pad, h - pad); g.stroke();

    var lat = (sceneKind() === "milky") ? S.lat : 0;
    g.strokeStyle = "#7c3aed"; g.lineWidth = 2.5;
    g.beginPath();
    for (var i = 0; i <= 60; i++) {
      var lon = 180 * i / 60;
      var x = pad + (w - pad - 6) * (lon / 180);
      var y = (h - pad) - (h - pad - 6) * G.milkyBrightness(lon, lat);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();

    if (sceneKind() === "milky") {
      var px = pad + (w - pad - 6) * (S.lon / 180);
      var py = (h - pad) - (h - pad - 6) * G.milkyBrightness(S.lon, S.lat);
      g.fillStyle = "#dc2626"; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.textAlign = "center";
    g.fillText("0° (중심)", pad + 24, h - 6);
    g.textAlign = "right";
    g.fillText("180° (바깥)", w - 8, h - 6);
  }

  /* ---------------------------------------------------------
     6. 조작 패널
     --------------------------------------------------------- */
  function syncControls() {
    var k = sceneKind();
    var allow = (S.scene === "mission" && S.mission) ? S.mission.allow : null;
    document.querySelectorAll("[data-for]").forEach(function (el) {
      var scenes = el.getAttribute("data-for").split(/\s+/);
      var need = el.getAttribute("data-need");
      var okScene = scenes.indexOf(S.scene) >= 0 || scenes.indexOf(k) >= 0;
      var okNeed = true;
      if (S.scene === "mission" && need) okNeed = allow && allow.indexOf(need) >= 0;
      el.classList.toggle("hidden", !(okScene && okNeed));
    });
    $("missionCard").classList.toggle("hidden", S.scene !== "mission");
    $("valLon").textContent = S.lon + "°";
    $("valLat").textContent = S.lat + "°";
  }

  function setChips(id, val) {
    var w = $(id); if (!w) return;
    w.querySelectorAll(".chip").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-val") === String(val));
    });
  }

  /* ---------------------------------------------------------
     7. 미션
     --------------------------------------------------------- */
  function loadProgress() {
    try { return JSON.parse(sessionStorage.getItem("ga_missions") || "[]"); } catch (e) { return []; }
  }
  function saveProgress(l) { try { sessionStorage.setItem("ga_missions", JSON.stringify(l)); } catch (e) {} }

  function renderMissionList() {
    var done = loadProgress(), host = $("missionList");
    host.innerHTML = "";
    MISSIONS.forEach(function (M) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mcard" + (S.mission && S.mission.id === M.id ? " on" : "") +
                    (done.indexOf(M.id) >= 0 ? " done" : "");
      b.innerHTML = '<span class="mno">미션 ' + M.id + (done.indexOf(M.id) >= 0 ? " ✅" : "") + '</span>' +
                    '<span class="mtitle"><span class="mstar">' + M.star + '</span> ' + M.title + '</span>';
      b.addEventListener("click", function () { pickMission(M); });
      host.appendChild(b);
    });
    $("missionScore").textContent = done.length + " / " + MISSIONS.length;
  }

  function pickMission(M) {
    S.scene = "mission";
    $("scenes").querySelectorAll(".scene-btn").forEach(function (x) {
      x.classList.toggle("on", x.getAttribute("data-scene") === "mission");
    });
    S.mission = M; S.predictPick = null;
    S.missionState = M.predict ? "predict" : "ready";
    Object.keys(M.setup || {}).forEach(function (kk) { S[kk] = M.setup[kk]; });
    seen = { side: false, top: false, lonBack: false, latUp: false, winter: false, nebula: false };
    $("rngLon").value = S.lon; $("rngLat").value = S.lat;
    setChips("chipView", S.view); setChips("chipSeason", S.season); setChips("chipObj", S.obj);
    syncControls(); renderMissionList(); renderMissionBody(); refresh();
  }

  function renderMissionBody() {
    var M = S.mission, body = $("missionBody");
    if (!M) { body.classList.add("hidden"); return; }
    body.classList.remove("hidden");
    $("mTitle").textContent = M.star + " 미션 " + M.id + " · " + M.title;
    $("mStory").innerHTML = M.story;

    var pd = $("mPredict");
    if (M.predict && S.missionState === "predict") {
      pd.classList.remove("hidden");
      $("mQ").innerHTML = M.predict.q;
      var opts = $("mOpts"); opts.innerHTML = "";
      M.predict.opts.forEach(function (t, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "opt";
        /* 예측 보기에는 굵은 글씨를 쓰지 않는다 — 정답만 굵으면 답이 드러난다(2026-09-28). */
        b.innerHTML = String(t).replace(/<\/?b>/g, "");
        b.addEventListener("click", function () {
          S.predictPick = i; S.missionState = "ready"; renderMissionBody();
        });
        opts.appendChild(b);
      });
    } else pd.classList.add("hidden");

    var gl = $("mGoals");
    if (M.goals && S.missionState !== "predict") {
      gl.classList.remove("hidden");
      gl.innerHTML = '<div class="q">목표</div>' + M.goals.map(function (gg) {
        var ok = checkGoal(gg.key);
        return '<div class="goal' + (ok ? " ok" : "") + '">' + (ok ? "✅ " : "⬜ ") + gg.text + '</div>';
      }).join("");
    } else gl.classList.add("hidden");

    var vd = $("mVerdict");
    if (S.missionState === "won") {
      vd.className = "verdict ok";
      vd.innerHTML = "<b>🎉 성공!</b>" + M.why +
        (M.predict && S.predictPick != null
          ? "<br><br>" + (S.predictPick === M.predict.ans
              ? "예측도 <b>맞았습니다.</b> 잘했어요!"
              : "예측은 달랐지만 <b>직접 확인해서 알아냈습니다.</b> 그것이 더 중요해요.")
          : "");
      vd.classList.remove("hidden");
    } else if (S.missionState === "predict") vd.classList.add("hidden");
    else {
      vd.className = "verdict no";
      vd.innerHTML = "<b>직접 확인하세요</b>목표를 모두 채우면 이유가 열립니다.";
      vd.classList.remove("hidden");
    }
  }

  function checkGoal(key) {
    switch (key) {
      case "sideView": return seen.side;
      case "topView": return seen.top;
      case "lonBack": return seen.lonBack;
      case "latUp": return seen.latUp;
      case "winter": return seen.winter;
      case "nebula": return seen.nebula;
      default: return false;
    }
  }

  function noteSeen() {
    var k = sceneKind();
    if (k === "shape") {
      if (S.view === "side") seen.side = true;
      if (S.view === "top") seen.top = true;
    } else if (k === "milky") {
      if (S.lon >= 150) seen.lonBack = true;
      if (S.lat >= 30) seen.latUp = true;
      if (S.season === "winter") seen.winter = true;
    } else {
      if (S.obj === "nebula") seen.nebula = true;
    }
  }

  function syncMissionGoals() {
    if (S.scene !== "mission" || !S.mission || S.missionState === "predict") return;
    var M = S.mission;
    if (!M.goals) return;
    var all = M.goals.every(function (gg) { return checkGoal(gg.key); });
    if (all && S.missionState !== "won") {
      S.missionState = "won";
      var done = loadProgress();
      if (done.indexOf(M.id) < 0) { done.push(M.id); saveProgress(done); }
      renderMissionList(); renderMissionBody();
    } else if (S.missionState !== "won") {
      var gl = $("mGoals");
      if (!gl.classList.contains("hidden")) {
        var rows = gl.querySelectorAll(".goal");
        M.goals.forEach(function (gg, i) {
          if (!rows[i]) return;
          var ok = checkGoal(gg.key);
          rows[i].className = "goal" + (ok ? " ok" : "");
          rows[i].innerHTML = (ok ? "✅ " : "⬜ ") + gg.text;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     8. 실험 기록
     --------------------------------------------------------- */
  function addRecord() {
    var k = sceneKind(), r;
    if (k === "shape") {
      r = { scene: "우리은하", who: S.view === "top" ? "위에서" : "옆에서",
            a: "지름 " + kpcNum(G.MW.diameterPc) + " kpc",
            b: "태양계 " + kpcNum(G.MW.sunFromCenterPc) + " kpc" };
    } else if (k === "milky") {
      r = { scene: "은하수", who: "중심 " + S.lon + "° · 은하면 " + S.lat + "°",
            a: "밝기 " + Math.round(G.milkyBrightness(S.lon, S.lat) * 100) + " %",
            b: kpcNum(G.pathInDisk(S.lon, S.lat)) + " kpc" };
    } else {
      var list = (S.obj === "cluster") ? G.CLUSTERS : G.NEBULAE;
      r = { scene: S.obj === "cluster" ? "성단" : "성운", who: list.map(function (x) { return x.name; }).join(" / "),
            a: list.map(function (x) { return x.color; }).join(" / "), b: "-" };
    }
    records.push(r); renderRecords();
    window.PdfKit.toast("기록했습니다. (" + records.length + "번째)", "ok");
  }

  function renderRecords() {
    var body = $("recBody");
    body.innerHTML = "";
    records.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + (i + 1) + "</td><td>" + r.scene + "</td><td>" + r.who +
                     "</td><td><b>" + r.a + "</b></td><td>" + r.b + "</td>";
      body.appendChild(tr);
    });
    $("recEmpty").classList.toggle("hidden", records.length > 0);
  }

  function refresh() { noteSeen(); draw(); updatePanel(); drawGraph(); }

  /* ---------------------------------------------------------
     9. 연결
     --------------------------------------------------------- */
  function bindChips(id, fn) {
    var w = $(id); if (!w) return;
    w.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".chip") : null;
      if (!b) return;
      w.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      fn(b.getAttribute("data-val"));
    });
  }
  function range(id, fn) {
    var el = $(id);
    if (el) el.addEventListener("input", function () { fn(parseFloat(el.value)); });
  }

  function bind() {
    $("scenes").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".scene-btn") : null;
      if (!b) return;
      $("scenes").querySelectorAll(".scene-btn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      S.scene = b.getAttribute("data-scene");
      if (S.scene === "mission" && !S.mission) pickMission(MISSIONS[0]);
      else { syncControls(); refresh(); }
      renderMissionList();
    });

    $("btnReset").addEventListener("click", function () {
      S.view = "top"; S.lon = 0; S.lat = 0; S.season = "summer"; S.obj = "cluster";
      $("rngLon").value = 0; $("rngLat").value = 0;
      setChips("chipView", "top"); setChips("chipSeason", "summer"); setChips("chipObj", "cluster");
      syncControls(); refresh();
    });
    $("btnRecord").addEventListener("click", addRecord);
    $("btnClearRec").addEventListener("click", function () {
      if (!records.length) return;
      if (!confirm("기록을 모두 지울까요?")) return;
      records.length = 0; renderRecords();
    });

    range("rngLon", function (v) { S.lon = v; syncControls(); refresh(); });
    range("rngLat", function (v) { S.lat = v; syncControls(); refresh(); });
    bindChips("chipView", function (v) { S.view = v; refresh(); });
    bindChips("chipObj", function (v) { S.obj = v; refresh(); });
    bindChips("chipSeason", function (v) {
      S.season = v;
      /* 계절을 바꾸면 밤하늘이 향하는 방향이 바뀐다 */
      S.lon = (v === "summer") ? 0 : 180;
      $("rngLon").value = S.lon;
      syncControls(); refresh();
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () { layout(); draw(); drawGraph(); }).observe(canvas);
    } else {
      window.addEventListener("resize", function () { layout(); draw(); drawGraph(); });
    }
  }

  function boot() {
    canvas = $("stage");
    layout(); bind(); syncControls();
    renderMissionList(); renderRecords(); refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.GaLab = {
    S: S, MISSIONS: MISSIONS,
    _test: {
      set: function (k, v) { S[k] = v; syncControls(); refresh(); },
      scene: function (n) { S.scene = n; syncControls(); refresh(); },
      pick: function (id) { pickMission(MISSIONS[id - 1]); },
      answer: function (i) { S.predictPick = i; S.missionState = "ready"; renderMissionBody(); refresh(); },
      goals: function () {
        if (!S.mission || !S.mission.goals) return null;
        return S.mission.goals.map(function (gg) { return [gg.key, checkGoal(gg.key)]; });
      },
      state: function () { return S.missionState; },
      records: function () { return records; },
      draw: function () { draw(); return true; }
    }
  };
})();
