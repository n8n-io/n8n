import { defineComponent as p, computed as f, openBlock as a, createElementBlock as d, toDisplayString as w, createCommentVNode as $, createElementVNode as l, pushScopeId as Z, popScopeId as v, createBlock as q, resolveDynamicComponent as k } from "vue";
const m = (e) => {
  let t = 0;
  for (let i = 0; i < e.length; i++) {
    const o = e.charCodeAt(i);
    t = (t << 5) - t + o, t = t & t;
  }
  return Math.abs(t);
}, I = (e, t) => Math.floor(e / Math.pow(10, t) % 10), C = (e, t) => !(I(e, t) % 2), h = (e, t, i) => {
  const o = e % t;
  return i && I(e, i) % 2 === 0 ? -o : o;
}, u = (e, t, i) => t[e % i], F = (e) => {
  e.slice(0, 1) === "#" && (e = e.slice(1));
  const t = parseInt(e.substring(0, 2), 16), i = parseInt(e.substring(2, 4), 16), o = parseInt(e.substring(4, 6), 16);
  return (t * 299 + i * 587 + o * 114) / 1e3 >= 128 ? "#000000" : "#FFFFFF";
}, B = 4, E = 80;
function z(e, t) {
  const i = m(e), o = t && t.length;
  return Array.from({ length: B }, (s, n) => ({
    color: u(i + n, t, o),
    translateX: h(i * (n + 1), E / 2 - (n + 17), 1),
    translateY: h(i * (n + 1), E / 2 - (n + 17), 2),
    rotate: h(i * (n + 1), 360),
    isSquare: C(i, 2)
  }));
}
const b = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    return { properties: f(() => z(e.name, e.colors)), SIZE: E };
  }
}), g = (e, t) => {
  const i = e.__vccOpts || e;
  for (const [o, r] of t)
    i[o] = r;
  return i;
}, A = ["viewBox", "width", "height"], M = { key: 0 }, N = ["width", "height"], U = ["width", "height", "rx"], L = { mask: "url(#mask__bauhaus)" }, O = ["width", "height", "fill"], T = ["x", "y", "width", "height", "fill", "transform"], X = ["cx", "cy", "fill", "r", "transform"], Y = ["y1", "x2", "y2", "stroke", "transform"];
function R(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", M, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__bauhaus",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, U)
    ], 8, N),
    l("g", L, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        fill: e.properties[0].color
      }, null, 8, O),
      l("rect", {
        x: (e.SIZE - 60) / 2,
        y: (e.SIZE - 20) / 2,
        width: e.SIZE,
        height: e.properties[1].isSquare ? e.SIZE : e.SIZE / 8,
        fill: e.properties[1].color,
        transform: `translate(${e.properties[1].translateX} ${e.properties[1].translateY}) rotate(${e.properties[1].rotate} ${e.SIZE / 2} ${e.SIZE / 2})`
      }, null, 8, T),
      l("circle", {
        cx: e.SIZE / 2,
        cy: e.SIZE / 2,
        fill: e.properties[2].color,
        r: e.SIZE / 5,
        transform: `translate(${e.properties[2].translateX} ${e.properties[2].translateY})`
      }, null, 8, X),
      l("line", {
        x1: 0,
        y1: e.SIZE / 2,
        x2: e.SIZE,
        y2: e.SIZE / 2,
        "stroke-width": 2,
        stroke: e.properties[3].color,
        transform: `translate(${e.properties[3].translateX} ${e.properties[3].translateY}) rotate(${e.properties[3].rotate} ${e.SIZE / 2} ${e.SIZE / 2})`
      }, null, 8, Y)
    ])
  ], 8, A);
}
const D = /* @__PURE__ */ g(b, [["render", R]]), c = 36;
function H(e, t) {
  const i = m(e), o = t && t.length, r = u(i, t, o), s = h(i, 10, 1), n = s < 5 ? s + c / 9 : s, y = h(i, 10, 2), _ = y < 5 ? y + c / 9 : y;
  return {
    wrapperColor: r,
    faceColor: F(r),
    backgroundColor: u(i + 13, t, o),
    wrapperTranslateX: n,
    wrapperTranslateY: _,
    wrapperRotate: h(i, 360),
    wrapperScale: 1 + h(i, c / 12) / 10,
    isMouthOpen: C(i, 2),
    isCircle: C(i, 1),
    eyeSpread: h(i, 5),
    mouthSpread: h(i, 3),
    faceRotate: h(i, 10, 3),
    faceTranslateX: n > c / 6 ? n / 2 : h(i, 8, 1),
    faceTranslateY: _ > c / 6 ? _ / 2 : h(i, 7, 2)
  };
}
const G = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    return { data: f(() => H(e.name, e.colors)), SIZE: c };
  }
}), P = ["viewBox", "width", "height"], V = { key: 0 }, j = ["width", "height"], J = ["width", "height", "rx"], K = { mask: "url(#mask__beam)" }, Q = ["width", "height", "fill"], W = ["width", "height", "transform", "fill", "rx"], x = ["transform"], ee = ["d", "stroke"], le = ["d", "fill"], te = ["x", "width", "fill"], ie = ["x", "width", "fill"];
function oe(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", V, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__beam",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, J)
    ], 8, j),
    l("g", K, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        fill: e.data.backgroundColor
      }, null, 8, Q),
      l("rect", {
        x: 0,
        y: 0,
        width: e.SIZE,
        height: e.SIZE,
        transform: `translate(${e.data.wrapperTranslateX} ${e.data.wrapperTranslateY}) rotate(${e.data.wrapperRotate} ${e.SIZE / 2} ${e.SIZE / 2}) scale(${e.data.wrapperScale})`,
        fill: e.data.wrapperColor,
        rx: e.data.isCircle ? e.SIZE : e.SIZE / 6
      }, null, 8, W),
      l("g", {
        transform: `translate(${e.data.faceTranslateX} ${e.data.faceTranslateY}) rotate(${e.data.faceRotate} ${e.SIZE / 2} ${e.SIZE / 2})`
      }, [
        e.data.isMouthOpen ? (a(), d("path", {
          key: 0,
          d: `M15 ${19 + e.data.mouthSpread}c2 1
        4 1 6 0`,
          stroke: e.data.faceColor,
          fill: "none",
          "stroke-linecap": "round"
        }, null, 8, ee)) : (a(), d("path", {
          key: 1,
          d: `M13,${19 + e.data.mouthSpread} a1,0.75 0 0,0 10,0`,
          fill: e.data.faceColor
        }, null, 8, le)),
        l("rect", {
          x: 14 - e.data.eyeSpread,
          y: 14,
          width: 1.5,
          height: 2,
          rx: 1,
          stroke: "none",
          fill: e.data.faceColor
        }, null, 8, te),
        l("rect", {
          x: 20 + e.data.eyeSpread,
          y: 14,
          width: 1.5,
          height: 2,
          rx: 1,
          stroke: "none",
          fill: e.data.faceColor
        }, null, 8, ie)
      ], 8, x)
    ])
  ], 8, P);
}
const re = /* @__PURE__ */ g(G, [["render", oe]]), se = 3, S = 80;
function ne(e, t) {
  const i = m(e), o = t && t.length;
  return Array.from({ length: se }, (s, n) => ({
    color: u(i + n, t, o),
    translateX: h(i * (n + 1), S / 10, 1),
    translateY: h(i * (n + 1), S / 10, 2),
    scale: 1.2 + h(i * (n + 1), S / 20) / 10,
    rotate: h(i * (n + 1), 360, 1)
  }));
}
const he = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    return { properties: f(() => ne(e.name, e.colors)), SIZE: S };
  }
});
const ae = (e) => (Z("data-v-3c8b58b0"), e = e(), v(), e), de = ["viewBox", "width", "height"], fe = { key: 0 }, ue = ["width", "height"], pe = ["width", "height", "rx"], ge = { mask: "url(#mask__marble)" }, ce = ["width", "height", "fill"], we = ["fill", "transform"], $e = ["fill", "transform"], me = /* @__PURE__ */ ae(() => /* @__PURE__ */ l("defs", null, [
  /* @__PURE__ */ l("filter", {
    id: "prefix__filter0_f",
    filterUnits: "userSpaceOnUse",
    "color-interpolation-filters": "sRGB"
  }, [
    /* @__PURE__ */ l("feFlood", {
      "flood-opacity": 0,
      result: "BackgroundImageFix"
    }),
    /* @__PURE__ */ l("feBlend", {
      in: "SourceGraphic",
      in2: "BackgroundImageFix",
      result: "shape"
    }),
    /* @__PURE__ */ l("feGaussianBlur", {
      stdDeviation: 7,
      result: "effect1_foregroundBlur"
    })
  ])
], -1));
function ye(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", fe, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__marble",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, pe)
    ], 8, ue),
    l("g", ge, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        fill: e.properties[0].color
      }, null, 8, ce),
      l("path", {
        filter: "url(#prefix__filter0_f)",
        d: "M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z",
        fill: e.properties[1].color,
        transform: `translate(${e.properties[1].translateX} ${e.properties[1].translateY}) rotate(${e.properties[1].rotate} ${e.SIZE / 2} ${e.SIZE / 2}) scale(${e.properties[2].scale})`
      }, null, 8, we),
      l("path", {
        filter: "url(#prefix__filter0_f)",
        class: "mix-blend-overlay",
        d: "M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z",
        fill: e.properties[2].color,
        transform: `translate(${e.properties[2].translateX} ${e.properties[2].translateY}) rotate(${e.properties[2].rotate} ${e.SIZE / 2} ${e.SIZE / 2}) scale(${e.properties[2].scale})`
      }, null, 8, $e)
    ]),
    me
  ], 8, de);
}
const Se = /* @__PURE__ */ g(he, [["render", ye], ["__scopeId", "data-v-3c8b58b0"]]), _e = 64, Ce = 80;
function Ee(e, t) {
  const i = m(e), o = t && t.length;
  return Array.from(
    { length: _e },
    (s, n) => u(i % n, t, o)
  );
}
const Ie = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    return { pixelColors: f(
      () => Ee(e.name, e.colors)
    ), SIZE: Ce };
  }
}), Ze = ["viewBox", "width", "height"], ve = { key: 0 }, qe = ["width", "height"], ke = ["width", "height", "rx"], Fe = { mask: "url(#mask__pixel)" }, Be = ["fill"], ze = ["fill"], be = ["fill"], Ae = ["fill"], Me = ["fill"], Ne = ["fill"], Ue = ["fill"], Le = ["fill"], Oe = ["fill"], Te = ["fill"], Xe = ["fill"], Ye = ["fill"], Re = ["fill"], De = ["fill"], He = ["fill"], Ge = ["fill"], Pe = ["fill"], Ve = ["fill"], je = ["fill"], Je = ["fill"], Ke = ["fill"], Qe = ["fill"], We = ["fill"], xe = ["fill"], el = ["fill"], ll = ["fill"], tl = ["fill"], il = ["fill"], ol = ["fill"], rl = ["fill"], sl = ["fill"], nl = ["fill"], hl = ["fill"], al = ["fill"], dl = ["fill"], fl = ["fill"], ul = ["fill"], pl = ["fill"], gl = ["fill"], cl = ["fill"], wl = ["fill"], $l = ["fill"], ml = ["fill"], yl = ["fill"], Sl = ["fill"], _l = ["fill"], Cl = ["fill"], El = ["fill"], Il = ["fill"], Zl = ["fill"], vl = ["fill"], ql = ["fill"], kl = ["fill"], Fl = ["fill"], Bl = ["fill"], zl = ["fill"], bl = ["fill"], Al = ["fill"], Ml = ["fill"], Nl = ["fill"], Ul = ["fill"], Ll = ["fill"], Ol = ["fill"], Tl = ["fill"];
function Xl(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", ve, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__pixel",
      "mask-type": "alpha",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, ke)
    ], 8, qe),
    l("g", Fe, [
      l("rect", {
        width: 10,
        height: 10,
        fill: e.pixelColors[0]
      }, null, 8, Be),
      l("rect", {
        x: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[1]
      }, null, 8, ze),
      l("rect", {
        x: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[2]
      }, null, 8, be),
      l("rect", {
        x: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[3]
      }, null, 8, Ae),
      l("rect", {
        x: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[4]
      }, null, 8, Me),
      l("rect", {
        x: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[5]
      }, null, 8, Ne),
      l("rect", {
        x: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[6]
      }, null, 8, Ue),
      l("rect", {
        x: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[7]
      }, null, 8, Le),
      l("rect", {
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[8]
      }, null, 8, Oe),
      l("rect", {
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[9]
      }, null, 8, Te),
      l("rect", {
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[10]
      }, null, 8, Xe),
      l("rect", {
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[11]
      }, null, 8, Ye),
      l("rect", {
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[12]
      }, null, 8, Re),
      l("rect", {
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[13]
      }, null, 8, De),
      l("rect", {
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[14]
      }, null, 8, He),
      l("rect", {
        x: 20,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[15]
      }, null, 8, Ge),
      l("rect", {
        x: 20,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[16]
      }, null, 8, Pe),
      l("rect", {
        x: 20,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[17]
      }, null, 8, Ve),
      l("rect", {
        x: 20,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[18]
      }, null, 8, je),
      l("rect", {
        x: 20,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[19]
      }, null, 8, Je),
      l("rect", {
        x: 20,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[20]
      }, null, 8, Ke),
      l("rect", {
        x: 20,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[21]
      }, null, 8, Qe),
      l("rect", {
        x: 40,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[22]
      }, null, 8, We),
      l("rect", {
        x: 40,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[23]
      }, null, 8, xe),
      l("rect", {
        x: 40,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[24]
      }, null, 8, el),
      l("rect", {
        x: 40,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[25]
      }, null, 8, ll),
      l("rect", {
        x: 40,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[26]
      }, null, 8, tl),
      l("rect", {
        x: 40,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[27]
      }, null, 8, il),
      l("rect", {
        x: 40,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[28]
      }, null, 8, ol),
      l("rect", {
        x: 60,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[29]
      }, null, 8, rl),
      l("rect", {
        x: 60,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[30]
      }, null, 8, sl),
      l("rect", {
        x: 60,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[31]
      }, null, 8, nl),
      l("rect", {
        x: 60,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[32]
      }, null, 8, hl),
      l("rect", {
        x: 60,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[33]
      }, null, 8, al),
      l("rect", {
        x: 60,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[34]
      }, null, 8, dl),
      l("rect", {
        x: 60,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[35]
      }, null, 8, fl),
      l("rect", {
        x: 10,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[36]
      }, null, 8, ul),
      l("rect", {
        x: 10,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[37]
      }, null, 8, pl),
      l("rect", {
        x: 10,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[38]
      }, null, 8, gl),
      l("rect", {
        x: 10,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[39]
      }, null, 8, cl),
      l("rect", {
        x: 10,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[40]
      }, null, 8, wl),
      l("rect", {
        x: 10,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[41]
      }, null, 8, $l),
      l("rect", {
        x: 10,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[42]
      }, null, 8, ml),
      l("rect", {
        x: 30,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[43]
      }, null, 8, yl),
      l("rect", {
        x: 30,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[44]
      }, null, 8, Sl),
      l("rect", {
        x: 30,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[45]
      }, null, 8, _l),
      l("rect", {
        x: 30,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[46]
      }, null, 8, Cl),
      l("rect", {
        x: 30,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[47]
      }, null, 8, El),
      l("rect", {
        x: 30,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[48]
      }, null, 8, Il),
      l("rect", {
        x: 30,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[49]
      }, null, 8, Zl),
      l("rect", {
        x: 50,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[50]
      }, null, 8, vl),
      l("rect", {
        x: 50,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[51]
      }, null, 8, ql),
      l("rect", {
        x: 50,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[52]
      }, null, 8, kl),
      l("rect", {
        x: 50,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[53]
      }, null, 8, Fl),
      l("rect", {
        x: 50,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[54]
      }, null, 8, Bl),
      l("rect", {
        x: 50,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[55]
      }, null, 8, zl),
      l("rect", {
        x: 50,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[56]
      }, null, 8, bl),
      l("rect", {
        x: 70,
        y: 10,
        width: 10,
        height: 10,
        fill: e.pixelColors[57]
      }, null, 8, Al),
      l("rect", {
        x: 70,
        y: 20,
        width: 10,
        height: 10,
        fill: e.pixelColors[58]
      }, null, 8, Ml),
      l("rect", {
        x: 70,
        y: 30,
        width: 10,
        height: 10,
        fill: e.pixelColors[59]
      }, null, 8, Nl),
      l("rect", {
        x: 70,
        y: 40,
        width: 10,
        height: 10,
        fill: e.pixelColors[60]
      }, null, 8, Ul),
      l("rect", {
        x: 70,
        y: 50,
        width: 10,
        height: 10,
        fill: e.pixelColors[61]
      }, null, 8, Ll),
      l("rect", {
        x: 70,
        y: 60,
        width: 10,
        height: 10,
        fill: e.pixelColors[62]
      }, null, 8, Ol),
      l("rect", {
        x: 70,
        y: 70,
        width: 10,
        height: 10,
        fill: e.pixelColors[63]
      }, null, 8, Tl)
    ])
  ], 8, Ze);
}
const Yl = /* @__PURE__ */ g(Ie, [["render", Xl]]), Rl = 90, Dl = 5;
function Hl(e, t) {
  const i = m(e), o = t && t.length, r = Array.from(
    { length: Dl },
    (n, y) => u(i + y, t, o)
  ), s = [];
  return s[0] = r[0], s[1] = r[1], s[2] = r[1], s[3] = r[2], s[4] = r[2], s[5] = r[3], s[6] = r[3], s[7] = r[0], s[8] = r[4], s;
}
const Gl = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    return { ringColors: f(() => Hl(e.name, e.colors)), SIZE: Rl };
  }
}), Pl = ["viewBox", "width", "height"], Vl = { key: 0 }, jl = ["width", "height"], Jl = ["width", "height", "rx"], Kl = { mask: "url(#mask__ring)" }, Ql = ["fill"], Wl = ["fill"], xl = ["fill"], et = ["fill"], lt = ["fill"], tt = ["fill"], it = ["fill"], ot = ["fill"], rt = ["fill"];
function st(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", Vl, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__ring",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, Jl)
    ], 8, jl),
    l("g", Kl, [
      l("path", {
        d: "M0 0h90v45H0z",
        fill: e.ringColors[0]
      }, null, 8, Ql),
      l("path", {
        d: "M0 45h90v45H0z",
        fill: e.ringColors[1]
      }, null, 8, Wl),
      l("path", {
        d: "M83 45a38 38 0 00-76 0h76z",
        fill: e.ringColors[2]
      }, null, 8, xl),
      l("path", {
        d: "M83 45a38 38 0 01-76 0h76z",
        fill: e.ringColors[3]
      }, null, 8, et),
      l("path", {
        d: "M77 45a32 32 0 10-64 0h64z",
        fill: e.ringColors[4]
      }, null, 8, lt),
      l("path", {
        d: "M77 45a32 32 0 11-64 0h64z",
        fill: e.ringColors[5]
      }, null, 8, tt),
      l("path", {
        d: "M71 45a26 26 0 00-52 0h52z",
        fill: e.ringColors[6]
      }, null, 8, it),
      l("path", {
        d: "M71 45a26 26 0 01-52 0h52z",
        fill: e.ringColors[7]
      }, null, 8, ot),
      l("circle", {
        cx: 45,
        cy: 45,
        r: 23,
        fill: e.ringColors[8]
      }, null, 8, rt)
    ])
  ], 8, Pl);
}
const nt = /* @__PURE__ */ g(Gl, [["render", st]]), ht = 4, at = 80;
function dt(e, t) {
  const i = m(e), o = t && t.length;
  return Array.from(
    { length: ht },
    (s, n) => u(i + n, t, o)
  );
}
const ft = p({
  props: {
    colors: {
      type: Array,
      required: !0
    },
    name: {
      type: String,
      required: !0
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !0
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup(e) {
    const t = f(
      () => dt(e.name, e.colors)
    ), i = f(() => e.name.replace(/\s/g, ""));
    return { sunsetColors: t, formattedName: i, SIZE: at };
  }
}), ut = ["viewBox", "width", "height"], pt = { key: 0 }, gt = ["width", "height"], ct = ["width", "height", "rx"], wt = { mask: "url(#mask__sunset)" }, $t = ["fill"], mt = ["fill"], yt = ["id", "x1", "x2", "y2"], St = ["stop-color"], _t = ["stop-color"], Ct = ["id", "x1", "y1", "x2", "y2"], Et = ["stop-color"], It = ["stop-color"];
function Zt(e, t, i, o, r, s) {
  return a(), d("svg", {
    viewBox: `0 0 ${e.SIZE} ${e.SIZE}`,
    fill: "none",
    role: "img",
    xmlns: "http://www.w3.org/2000/svg",
    width: e.size,
    height: e.size
  }, [
    e.title ? (a(), d("title", pt, w(e.name), 1)) : $("", !0),
    l("mask", {
      id: "mask__sunset",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: e.SIZE,
      height: e.SIZE
    }, [
      l("rect", {
        width: e.SIZE,
        height: e.SIZE,
        rx: e.square ? void 0 : e.SIZE * 2,
        fill: "#FFFFFF"
      }, null, 8, ct)
    ], 8, gt),
    l("g", wt, [
      l("path", {
        fill: `url(#gradient_paint0_linear_${e.formattedName})`,
        d: "M0 0h80v40H0z"
      }, null, 8, $t),
      l("path", {
        fill: `url(#gradient_paint1_linear_${e.formattedName})`,
        d: "M0 40h80v40H0z"
      }, null, 8, mt)
    ]),
    l("defs", null, [
      l("linearGradient", {
        id: `gradient_paint0_linear_${e.formattedName}`,
        x1: e.SIZE / 2,
        y1: 0,
        x2: e.SIZE / 2,
        y2: e.SIZE / 2,
        gradientUnits: "userSpaceOnUse"
      }, [
        l("stop", {
          "stop-color": e.sunsetColors[0]
        }, null, 8, St),
        l("stop", {
          offset: 1,
          "stop-color": e.sunsetColors[1]
        }, null, 8, _t)
      ], 8, yt),
      l("linearGradient", {
        id: `gradient_paint1_linear_${e.formattedName}`,
        x1: e.SIZE / 2,
        y1: e.SIZE / 2,
        x2: e.SIZE / 2,
        y2: e.SIZE,
        gradientUnits: "userSpaceOnUse"
      }, [
        l("stop", {
          "stop-color": e.sunsetColors[2]
        }, null, 8, Et),
        l("stop", {
          offset: 1,
          "stop-color": e.sunsetColors[3]
        }, null, 8, It)
      ], 8, Ct)
    ])
  ], 8, ut);
}
const vt = /* @__PURE__ */ g(ft, [["render", Zt]]), qt = p({
  name: "Avatar",
  props: {
    variant: {
      type: String,
      required: !1,
      default: "marble",
      validator(e) {
        return [
          "bauhaus",
          "beam",
          "marble",
          "pixel",
          "ring",
          "sunset"
        ].includes(e);
      }
    },
    colors: {
      type: Array,
      required: !1,
      default: () => ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]
    },
    name: {
      type: String,
      required: !1,
      default: "Clara Barton"
    },
    square: {
      type: Boolean,
      required: !1,
      default: !1
    },
    size: {
      type: Number,
      required: !1,
      default: 40
    },
    title: {
      type: Boolean,
      required: !1,
      default: !1
    }
  },
  setup() {
    return {};
  },
  components: {
    AvatarBauhaus: D,
    AvatarBeam: re,
    AvatarMarble: Se,
    AvatarPixel: Yl,
    AvatarRing: nt,
    AvatarSunset: vt
  }
});
function kt(e, t, i, o, r, s) {
  return a(), q(k(`avatar-${e.variant}`), {
    colors: e.colors,
    name: e.name,
    square: e.square,
    size: e.size,
    title: e.title
  }, null, 8, ["colors", "name", "square", "size", "title"]);
}
const zt = /* @__PURE__ */ g(qt, [["render", kt]]);
export {
  zt as default
};
