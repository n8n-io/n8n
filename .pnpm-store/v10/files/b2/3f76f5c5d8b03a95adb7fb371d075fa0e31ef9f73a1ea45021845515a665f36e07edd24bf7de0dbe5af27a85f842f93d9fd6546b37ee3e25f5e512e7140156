var ie = Object.defineProperty;
var n = (r, e) => ie(r, "name", { value: e, configurable: !0 });

// ../node_modules/@babel/runtime/helpers/esm/extends.js
function v() {
  return v = Object.assign ? Object.assign.bind() : function(r) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var a in t) ({}).hasOwnProperty.call(t, a) && (r[a] = t[a]);
    }
    return r;
  }, v.apply(null, arguments);
}
n(v, "_extends");

// ../node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function q(r) {
  if (r === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return r;
}
n(q, "_assertThisInitialized");

// ../node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function m(r, e) {
  return m = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, a) {
    return t.__proto__ = a, t;
  }, m(r, e);
}
n(m, "_setPrototypeOf");

// ../node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function U(r, e) {
  r.prototype = Object.create(e.prototype), r.prototype.constructor = r, m(r, e);
}
n(U, "_inheritsLoose");

// ../node_modules/@babel/runtime/helpers/esm/getPrototypeOf.js
function F(r) {
  return F = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  }, F(r);
}
n(F, "_getPrototypeOf");

// ../node_modules/@babel/runtime/helpers/esm/isNativeFunction.js
function V(r) {
  try {
    return Function.toString.call(r).indexOf("[native code]") !== -1;
  } catch {
    return typeof r == "function";
  }
}
n(V, "_isNativeFunction");

// ../node_modules/@babel/runtime/helpers/esm/isNativeReflectConstruct.js
function T() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (T = /* @__PURE__ */ n(function() {
    return !!r;
  }, "_isNativeReflectConstruct"))();
}
n(T, "_isNativeReflectConstruct");

// ../node_modules/@babel/runtime/helpers/esm/construct.js
function N(r, e, t) {
  if (T()) return Reflect.construct.apply(null, arguments);
  var a = [null];
  a.push.apply(a, e);
  var i = new (r.bind.apply(r, a))();
  return t && m(i, t.prototype), i;
}
n(N, "_construct");

// ../node_modules/@babel/runtime/helpers/esm/wrapNativeSuper.js
function C(r) {
  var e = typeof Map == "function" ? /* @__PURE__ */ new Map() : void 0;
  return C = /* @__PURE__ */ n(function(a) {
    if (a === null || !V(a)) return a;
    if (typeof a != "function") throw new TypeError("Super expression must either be null or a function");
    if (e !== void 0) {
      if (e.has(a)) return e.get(a);
      e.set(a, i);
    }
    function i() {
      return N(a, arguments, F(this).constructor);
    }
    return n(i, "Wrapper"), i.prototype = Object.create(a.prototype, {
      constructor: {
        value: i,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }), m(i, a);
  }, "_wrapNativeSuper"), C(r);
}
n(C, "_wrapNativeSuper");

// ../node_modules/polished/dist/polished.esm.js
var oe = {
  1: `Passed invalid arguments to hsl, please pass multiple numbers e.g. hsl(360, 0.75, 0.4) or an object e.g. rgb({ hue: 255, saturation: 0\
.4, lightness: 0.75 }).

`,
  2: `Passed invalid arguments to hsla, please pass multiple numbers e.g. hsla(360, 0.75, 0.4, 0.7) or an object e.g. rgb({ hue: 255, satura\
tion: 0.4, lightness: 0.75, alpha: 0.7 }).

`,
  3: `Passed an incorrect argument to a color function, please pass a string representation of a color.

`,
  4: `Couldn't generate valid rgb string from %s, it returned %s.

`,
  5: `Couldn't parse the color string. Please provide the color as a string in hex, rgb, rgba, hsl or hsla notation.

`,
  6: `Passed invalid arguments to rgb, please pass multiple numbers e.g. rgb(255, 205, 100) or an object e.g. rgb({ red: 255, green: 205, bl\
ue: 100 }).

`,
  7: `Passed invalid arguments to rgba, please pass multiple numbers e.g. rgb(255, 205, 100, 0.75) or an object e.g. rgb({ red: 255, green: \
205, blue: 100, alpha: 0.75 }).

`,
  8: `Passed invalid argument to toColorString, please pass a RgbColor, RgbaColor, HslColor or HslaColor object.

`,
  9: `Please provide a number of steps to the modularScale helper.

`,
  10: `Please pass a number or one of the predefined scales to the modularScale helper as the ratio.

`,
  11: `Invalid value passed as base to modularScale, expected number or em string but got "%s"

`,
  12: `Expected a string ending in "px" or a number passed as the first argument to %s(), got "%s" instead.

`,
  13: `Expected a string ending in "px" or a number passed as the second argument to %s(), got "%s" instead.

`,
  14: `Passed invalid pixel value ("%s") to %s(), please pass a value like "12px" or 12.

`,
  15: `Passed invalid base value ("%s") to %s(), please pass a value like "12px" or 12.

`,
  16: `You must provide a template to this method.

`,
  17: `You passed an unsupported selector state to this method.

`,
  18: `minScreen and maxScreen must be provided as stringified numbers with the same units.

`,
  19: `fromSize and toSize must be provided as stringified numbers with the same units.

`,
  20: `expects either an array of objects or a single object with the properties prop, fromSize, and toSize.

`,
  21: "expects the objects in the first argument array to have the properties `prop`, `fromSize`, and `toSize`.\n\n",
  22: "expects the first argument object to have the properties `prop`, `fromSize`, and `toSize`.\n\n",
  23: `fontFace expects a name of a font-family.

`,
  24: `fontFace expects either the path to the font file(s) or a name of a local copy.

`,
  25: `fontFace expects localFonts to be an array.

`,
  26: `fontFace expects fileFormats to be an array.

`,
  27: `radialGradient requries at least 2 color-stops to properly render.

`,
  28: `Please supply a filename to retinaImage() as the first argument.

`,
  29: `Passed invalid argument to triangle, please pass correct pointingDirection e.g. 'right'.

`,
  30: "Passed an invalid value to `height` or `width`. Please provide a pixel based unit.\n\n",
  31: `The animation shorthand only takes 8 arguments. See the specification for more information: http://mdn.io/animation

`,
  32: `To pass multiple animations please supply them in arrays, e.g. animation(['rotate', '2s'], ['move', '1s'])
To pass a single animation please supply them in simple values, e.g. animation('rotate', '2s')

`,
  33: `The animation shorthand arrays can only have 8 elements. See the specification for more information: http://mdn.io/animation

`,
  34: `borderRadius expects a radius value as a string or number as the second argument.

`,
  35: `borderRadius expects one of "top", "bottom", "left" or "right" as the first argument.

`,
  36: `Property must be a string value.

`,
  37: `Syntax Error at %s.

`,
  38: `Formula contains a function that needs parentheses at %s.

`,
  39: `Formula is missing closing parenthesis at %s.

`,
  40: `Formula has too many closing parentheses at %s.

`,
  41: `All values in a formula must have the same unit or be unitless.

`,
  42: `Please provide a number of steps to the modularScale helper.

`,
  43: `Please pass a number or one of the predefined scales to the modularScale helper as the ratio.

`,
  44: `Invalid value passed as base to modularScale, expected number or em/rem string but got %s.

`,
  45: `Passed invalid argument to hslToColorString, please pass a HslColor or HslaColor object.

`,
  46: `Passed invalid argument to rgbToColorString, please pass a RgbColor or RgbaColor object.

`,
  47: `minScreen and maxScreen must be provided as stringified numbers with the same units.

`,
  48: `fromSize and toSize must be provided as stringified numbers with the same units.

`,
  49: `Expects either an array of objects or a single object with the properties prop, fromSize, and toSize.

`,
  50: `Expects the objects in the first argument array to have the properties prop, fromSize, and toSize.

`,
  51: `Expects the first argument object to have the properties prop, fromSize, and toSize.

`,
  52: `fontFace expects either the path to the font file(s) or a name of a local copy.

`,
  53: `fontFace expects localFonts to be an array.

`,
  54: `fontFace expects fileFormats to be an array.

`,
  55: `fontFace expects a name of a font-family.

`,
  56: `linearGradient requries at least 2 color-stops to properly render.

`,
  57: `radialGradient requries at least 2 color-stops to properly render.

`,
  58: `Please supply a filename to retinaImage() as the first argument.

`,
  59: `Passed invalid argument to triangle, please pass correct pointingDirection e.g. 'right'.

`,
  60: "Passed an invalid value to `height` or `width`. Please provide a pixel based unit.\n\n",
  61: `Property must be a string value.

`,
  62: `borderRadius expects a radius value as a string or number as the second argument.

`,
  63: `borderRadius expects one of "top", "bottom", "left" or "right" as the first argument.

`,
  64: `The animation shorthand only takes 8 arguments. See the specification for more information: http://mdn.io/animation.

`,
  65: `To pass multiple animations please supply them in arrays, e.g. animation(['rotate', '2s'], ['move', '1s'])\\nTo pass a single animatio\
n please supply them in simple values, e.g. animation('rotate', '2s').

`,
  66: `The animation shorthand arrays can only have 8 elements. See the specification for more information: http://mdn.io/animation.

`,
  67: `You must provide a template to this method.

`,
  68: `You passed an unsupported selector state to this method.

`,
  69: `Expected a string ending in "px" or a number passed as the first argument to %s(), got %s instead.

`,
  70: `Expected a string ending in "px" or a number passed as the second argument to %s(), got %s instead.

`,
  71: `Passed invalid pixel value %s to %s(), please pass a value like "12px" or 12.

`,
  72: `Passed invalid base value %s to %s(), please pass a value like "12px" or 12.

`,
  73: `Please provide a valid CSS variable.

`,
  74: `CSS variable not found and no default was provided.

`,
  75: `important requires a valid style object, got a %s instead.

`,
  76: `fromSize and toSize must be provided as stringified numbers with the same units as minScreen and maxScreen.

`,
  77: `remToPx expects a value in "rem" but you provided it in "%s".

`,
  78: `base must be set in "px" or "%" but you set it in "%s".
`
};
function se() {
  for (var r = arguments.length, e = new Array(r), t = 0; t < r; t++)
    e[t] = arguments[t];
  var a = e[0], i = [], o;
  for (o = 1; o < e.length; o += 1)
    i.push(e[o]);
  return i.forEach(function(u) {
    a = a.replace(/%[a-z]/, u);
  }), a;
}
n(se, "format");
var d = /* @__PURE__ */ function(r) {
  U(e, r);
  function e(t) {
    for (var a, i = arguments.length, o = new Array(i > 1 ? i - 1 : 0), u = 1; u < i; u++)
      o[u - 1] = arguments[u];
    return a = r.call(this, se.apply(void 0, [oe[t]].concat(o))) || this, q(a);
  }
  return n(e, "PolishedError"), e;
}(/* @__PURE__ */ C(Error));
function I(r) {
  return Math.round(r * 255);
}
n(I, "colorToInt");
function ue(r, e, t) {
  return I(r) + "," + I(e) + "," + I(t);
}
n(ue, "convertToInt");
function w(r, e, t, a) {
  if (a === void 0 && (a = ue), e === 0)
    return a(t, t, t);
  var i = (r % 360 + 360) % 360 / 60, o = (1 - Math.abs(2 * t - 1)) * e, u = o * (1 - Math.abs(i % 2 - 1)), f = 0, p = 0, l = 0;
  i >= 0 && i < 1 ? (f = o, p = u) : i >= 1 && i < 2 ? (f = u, p = o) : i >= 2 && i < 3 ? (p = o, l = u) : i >= 3 && i < 4 ? (p = u, l = o) :
  i >= 4 && i < 5 ? (f = u, l = o) : i >= 5 && i < 6 && (f = o, l = u);
  var h = t - o / 2, b = f + h, c = p + h, A = l + h;
  return a(b, c, A);
}
n(w, "hslToRgb");
var G = {
  aliceblue: "f0f8ff",
  antiquewhite: "faebd7",
  aqua: "00ffff",
  aquamarine: "7fffd4",
  azure: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "000",
  blanchedalmond: "ffebcd",
  blue: "0000ff",
  blueviolet: "8a2be2",
  brown: "a52a2a",
  burlywood: "deb887",
  cadetblue: "5f9ea0",
  chartreuse: "7fff00",
  chocolate: "d2691e",
  coral: "ff7f50",
  cornflowerblue: "6495ed",
  cornsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "00ffff",
  darkblue: "00008b",
  darkcyan: "008b8b",
  darkgoldenrod: "b8860b",
  darkgray: "a9a9a9",
  darkgreen: "006400",
  darkgrey: "a9a9a9",
  darkkhaki: "bdb76b",
  darkmagenta: "8b008b",
  darkolivegreen: "556b2f",
  darkorange: "ff8c00",
  darkorchid: "9932cc",
  darkred: "8b0000",
  darksalmon: "e9967a",
  darkseagreen: "8fbc8f",
  darkslateblue: "483d8b",
  darkslategray: "2f4f4f",
  darkslategrey: "2f4f4f",
  darkturquoise: "00ced1",
  darkviolet: "9400d3",
  deeppink: "ff1493",
  deepskyblue: "00bfff",
  dimgray: "696969",
  dimgrey: "696969",
  dodgerblue: "1e90ff",
  firebrick: "b22222",
  floralwhite: "fffaf0",
  forestgreen: "228b22",
  fuchsia: "ff00ff",
  gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff",
  gold: "ffd700",
  goldenrod: "daa520",
  gray: "808080",
  green: "008000",
  greenyellow: "adff2f",
  grey: "808080",
  honeydew: "f0fff0",
  hotpink: "ff69b4",
  indianred: "cd5c5c",
  indigo: "4b0082",
  ivory: "fffff0",
  khaki: "f0e68c",
  lavender: "e6e6fa",
  lavenderblush: "fff0f5",
  lawngreen: "7cfc00",
  lemonchiffon: "fffacd",
  lightblue: "add8e6",
  lightcoral: "f08080",
  lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2",
  lightgray: "d3d3d3",
  lightgreen: "90ee90",
  lightgrey: "d3d3d3",
  lightpink: "ffb6c1",
  lightsalmon: "ffa07a",
  lightseagreen: "20b2aa",
  lightskyblue: "87cefa",
  lightslategray: "789",
  lightslategrey: "789",
  lightsteelblue: "b0c4de",
  lightyellow: "ffffe0",
  lime: "0f0",
  limegreen: "32cd32",
  linen: "faf0e6",
  magenta: "f0f",
  maroon: "800000",
  mediumaquamarine: "66cdaa",
  mediumblue: "0000cd",
  mediumorchid: "ba55d3",
  mediumpurple: "9370db",
  mediumseagreen: "3cb371",
  mediumslateblue: "7b68ee",
  mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc",
  mediumvioletred: "c71585",
  midnightblue: "191970",
  mintcream: "f5fffa",
  mistyrose: "ffe4e1",
  moccasin: "ffe4b5",
  navajowhite: "ffdead",
  navy: "000080",
  oldlace: "fdf5e6",
  olive: "808000",
  olivedrab: "6b8e23",
  orange: "ffa500",
  orangered: "ff4500",
  orchid: "da70d6",
  palegoldenrod: "eee8aa",
  palegreen: "98fb98",
  paleturquoise: "afeeee",
  palevioletred: "db7093",
  papayawhip: "ffefd5",
  peachpuff: "ffdab9",
  peru: "cd853f",
  pink: "ffc0cb",
  plum: "dda0dd",
  powderblue: "b0e0e6",
  purple: "800080",
  rebeccapurple: "639",
  red: "f00",
  rosybrown: "bc8f8f",
  royalblue: "4169e1",
  saddlebrown: "8b4513",
  salmon: "fa8072",
  sandybrown: "f4a460",
  seagreen: "2e8b57",
  seashell: "fff5ee",
  sienna: "a0522d",
  silver: "c0c0c0",
  skyblue: "87ceeb",
  slateblue: "6a5acd",
  slategray: "708090",
  slategrey: "708090",
  snow: "fffafa",
  springgreen: "00ff7f",
  steelblue: "4682b4",
  tan: "d2b48c",
  teal: "008080",
  thistle: "d8bfd8",
  tomato: "ff6347",
  turquoise: "40e0d0",
  violet: "ee82ee",
  wheat: "f5deb3",
  white: "fff",
  whitesmoke: "f5f5f5",
  yellow: "ff0",
  yellowgreen: "9acd32"
};
function fe(r) {
  if (typeof r != "string") return r;
  var e = r.toLowerCase();
  return G[e] ? "#" + G[e] : r;
}
n(fe, "nameToHex");
var pe = /^#[a-fA-F0-9]{6}$/, le = /^#[a-fA-F0-9]{8}$/, de = /^#[a-fA-F0-9]{3}$/, ce = /^#[a-fA-F0-9]{4}$/, R = /^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,
me = /^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i, ge = /^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,
he = /^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;
function $(r) {
  if (typeof r != "string")
    throw new d(3);
  var e = fe(r);
  if (e.match(pe))
    return {
      red: parseInt("" + e[1] + e[2], 16),
      green: parseInt("" + e[3] + e[4], 16),
      blue: parseInt("" + e[5] + e[6], 16)
    };
  if (e.match(le)) {
    var t = parseFloat((parseInt("" + e[7] + e[8], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + e[1] + e[2], 16),
      green: parseInt("" + e[3] + e[4], 16),
      blue: parseInt("" + e[5] + e[6], 16),
      alpha: t
    };
  }
  if (e.match(de))
    return {
      red: parseInt("" + e[1] + e[1], 16),
      green: parseInt("" + e[2] + e[2], 16),
      blue: parseInt("" + e[3] + e[3], 16)
    };
  if (e.match(ce)) {
    var a = parseFloat((parseInt("" + e[4] + e[4], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + e[1] + e[1], 16),
      green: parseInt("" + e[2] + e[2], 16),
      blue: parseInt("" + e[3] + e[3], 16),
      alpha: a
    };
  }
  var i = R.exec(e);
  if (i)
    return {
      red: parseInt("" + i[1], 10),
      green: parseInt("" + i[2], 10),
      blue: parseInt("" + i[3], 10)
    };
  var o = me.exec(e.substring(0, 50));
  if (o)
    return {
      red: parseInt("" + o[1], 10),
      green: parseInt("" + o[2], 10),
      blue: parseInt("" + o[3], 10),
      alpha: parseFloat("" + o[4]) > 1 ? parseFloat("" + o[4]) / 100 : parseFloat("" + o[4])
    };
  var u = ge.exec(e);
  if (u) {
    var f = parseInt("" + u[1], 10), p = parseInt("" + u[2], 10) / 100, l = parseInt("" + u[3], 10) / 100, h = "rgb(" + w(f, p, l) + ")", b = R.
    exec(h);
    if (!b)
      throw new d(4, e, h);
    return {
      red: parseInt("" + b[1], 10),
      green: parseInt("" + b[2], 10),
      blue: parseInt("" + b[3], 10)
    };
  }
  var c = he.exec(e.substring(0, 50));
  if (c) {
    var A = parseInt("" + c[1], 10), ne = parseInt("" + c[2], 10) / 100, ae = parseInt("" + c[3], 10) / 100, W = "rgb(" + w(A, ne, ae) + ")",
    S = R.exec(W);
    if (!S)
      throw new d(4, e, W);
    return {
      red: parseInt("" + S[1], 10),
      green: parseInt("" + S[2], 10),
      blue: parseInt("" + S[3], 10),
      alpha: parseFloat("" + c[4]) > 1 ? parseFloat("" + c[4]) / 100 : parseFloat("" + c[4])
    };
  }
  throw new d(5);
}
n($, "parseToRgb");
function be(r) {
  var e = r.red / 255, t = r.green / 255, a = r.blue / 255, i = Math.max(e, t, a), o = Math.min(e, t, a), u = (i + o) / 2;
  if (i === o)
    return r.alpha !== void 0 ? {
      hue: 0,
      saturation: 0,
      lightness: u,
      alpha: r.alpha
    } : {
      hue: 0,
      saturation: 0,
      lightness: u
    };
  var f, p = i - o, l = u > 0.5 ? p / (2 - i - o) : p / (i + o);
  switch (i) {
    case e:
      f = (t - a) / p + (t < a ? 6 : 0);
      break;
    case t:
      f = (a - e) / p + 2;
      break;
    default:
      f = (e - t) / p + 4;
      break;
  }
  return f *= 60, r.alpha !== void 0 ? {
    hue: f,
    saturation: l,
    lightness: u,
    alpha: r.alpha
  } : {
    hue: f,
    saturation: l,
    lightness: u
  };
}
n(be, "rgbToHsl");
function Q(r) {
  return be($(r));
}
n(Q, "parseToHsl");
var ve = /* @__PURE__ */ n(function(e) {
  return e.length === 7 && e[1] === e[2] && e[3] === e[4] && e[5] === e[6] ? "#" + e[1] + e[3] + e[5] : e;
}, "reduceHexValue"), O = ve;
function g(r) {
  var e = r.toString(16);
  return e.length === 1 ? "0" + e : e;
}
n(g, "numberToHex");
function j(r) {
  return g(Math.round(r * 255));
}
n(j, "colorToHex");
function ye(r, e, t) {
  return O("#" + j(r) + j(e) + j(t));
}
n(ye, "convertToHex");
function z(r, e, t) {
  return w(r, e, t, ye);
}
n(z, "hslToHex");
function we(r, e, t) {
  if (typeof r == "number" && typeof e == "number" && typeof t == "number")
    return z(r, e, t);
  if (typeof r == "object" && e === void 0 && t === void 0)
    return z(r.hue, r.saturation, r.lightness);
  throw new d(1);
}
n(we, "hsl");
function xe(r, e, t, a) {
  if (typeof r == "number" && typeof e == "number" && typeof t == "number" && typeof a == "number")
    return a >= 1 ? z(r, e, t) : "rgba(" + w(r, e, t) + "," + a + ")";
  if (typeof r == "object" && e === void 0 && t === void 0 && a === void 0)
    return r.alpha >= 1 ? z(r.hue, r.saturation, r.lightness) : "rgba(" + w(r.hue, r.saturation, r.lightness) + "," + r.alpha + ")";
  throw new d(2);
}
n(xe, "hsla");
function k(r, e, t) {
  if (typeof r == "number" && typeof e == "number" && typeof t == "number")
    return O("#" + g(r) + g(e) + g(t));
  if (typeof r == "object" && e === void 0 && t === void 0)
    return O("#" + g(r.red) + g(r.green) + g(r.blue));
  throw new d(6);
}
n(k, "rgb");
function x(r, e, t, a) {
  if (typeof r == "string" && typeof e == "number") {
    var i = $(r);
    return "rgba(" + i.red + "," + i.green + "," + i.blue + "," + e + ")";
  } else {
    if (typeof r == "number" && typeof e == "number" && typeof t == "number" && typeof a == "number")
      return a >= 1 ? k(r, e, t) : "rgba(" + r + "," + e + "," + t + "," + a + ")";
    if (typeof r == "object" && e === void 0 && t === void 0 && a === void 0)
      return r.alpha >= 1 ? k(r.red, r.green, r.blue) : "rgba(" + r.red + "," + r.green + "," + r.blue + "," + r.alpha + ")";
  }
  throw new d(7);
}
n(x, "rgba");
var Se = /* @__PURE__ */ n(function(e) {
  return typeof e.red == "number" && typeof e.green == "number" && typeof e.blue == "number" && (typeof e.alpha != "number" || typeof e.alpha >
  "u");
}, "isRgb"), Fe = /* @__PURE__ */ n(function(e) {
  return typeof e.red == "number" && typeof e.green == "number" && typeof e.blue == "number" && typeof e.alpha == "number";
}, "isRgba"), Ce = /* @__PURE__ */ n(function(e) {
  return typeof e.hue == "number" && typeof e.saturation == "number" && typeof e.lightness == "number" && (typeof e.alpha != "number" || typeof e.
  alpha > "u");
}, "isHsl"), ze = /* @__PURE__ */ n(function(e) {
  return typeof e.hue == "number" && typeof e.saturation == "number" && typeof e.lightness == "number" && typeof e.alpha == "number";
}, "isHsla");
function Y(r) {
  if (typeof r != "object") throw new d(8);
  if (Fe(r)) return x(r);
  if (Se(r)) return k(r);
  if (ze(r)) return xe(r);
  if (Ce(r)) return we(r);
  throw new d(8);
}
n(Y, "toColorString");
function J(r, e, t) {
  return /* @__PURE__ */ n(function() {
    var i = t.concat(Array.prototype.slice.call(arguments));
    return i.length >= e ? r.apply(this, i) : J(r, e, i);
  }, "fn");
}
n(J, "curried");
function B(r) {
  return J(r, r.length, []);
}
n(B, "curry");
function M(r, e, t) {
  return Math.max(r, Math.min(e, t));
}
n(M, "guard");
function Ae(r, e) {
  if (e === "transparent") return e;
  var t = Q(e);
  return Y(v({}, t, {
    lightness: M(0, 1, t.lightness - parseFloat(r))
  }));
}
n(Ae, "darken");
var Te = /* @__PURE__ */ B(Ae), Z = Te;
function Ie(r, e) {
  if (e === "transparent") return e;
  var t = Q(e);
  return Y(v({}, t, {
    lightness: M(0, 1, t.lightness + parseFloat(r))
  }));
}
n(Ie, "lighten");
var Re = /* @__PURE__ */ B(Ie), X = Re;
function je(r, e) {
  if (e === "transparent") return e;
  var t = $(e), a = typeof t.alpha == "number" ? t.alpha : 1, i = v({}, t, {
    alpha: M(0, 1, +(a * 100 - parseFloat(r) * 100).toFixed(2) / 100)
  });
  return x(i);
}
n(je, "transparentize");
var Oe = /* @__PURE__ */ B(je), K = Oe;

// src/theming/base.ts
var s = {
  // Official color palette
  primary: "#FF4785",
  // coral
  secondary: "#029CFD",
  // ocean
  tertiary: "#FAFBFC",
  ancillary: "#22a699",
  // Complimentary
  orange: "#FC521F",
  gold: "#FFAE00",
  green: "#66BF3C",
  seafoam: "#37D5D3",
  purple: "#6F2CAC",
  ultraviolet: "#2A0481",
  // Monochrome
  lightest: "#FFFFFF",
  lighter: "#F7FAFC",
  light: "#EEF3F6",
  mediumlight: "#ECF4F9",
  medium: "#D9E8F2",
  mediumdark: "#73828C",
  dark: "#5C6870",
  darker: "#454E54",
  darkest: "#2E3438",
  // For borders
  border: "hsla(203, 50%, 30%, 0.15)",
  // Status
  positive: "#66BF3C",
  negative: "#FF4400",
  warning: "#E69D00",
  critical: "#FFFFFF",
  // Text
  defaultText: "#2E3438",
  inverseText: "#FFFFFF",
  positiveText: "#448028",
  negativeText: "#D43900",
  warningText: "#A15C20"
}, P = {
  app: "#F6F9FC",
  bar: s.lightest,
  content: s.lightest,
  preview: s.lightest,
  gridCellSize: 10,
  hoverable: K(0.9, s.secondary),
  // hover state for items in a list
  // Notification, error, and warning backgrounds
  positive: "#E1FFD4",
  negative: "#FEDED2",
  warning: "#FFF5CF",
  critical: "#FF4400"
}, y = {
  fonts: {
    base: [
      '"Nunito Sans"',
      "-apple-system",
      '".SFNSText-Regular"',
      '"San Francisco"',
      "BlinkMacSystemFont",
      '"Segoe UI"',
      '"Helvetica Neue"',
      "Helvetica",
      "Arial",
      "sans-serif"
    ].join(", "),
    mono: [
      "ui-monospace",
      "Menlo",
      "Monaco",
      '"Roboto Mono"',
      '"Oxygen Mono"',
      '"Ubuntu Monospace"',
      '"Source Code Pro"',
      '"Droid Sans Mono"',
      '"Courier New"',
      "monospace"
    ].join(", ")
  },
  weight: {
    regular: 400,
    bold: 700
  },
  size: {
    s1: 12,
    s2: 14,
    s3: 16,
    m1: 20,
    m2: 24,
    m3: 28,
    l1: 32,
    l2: 40,
    l3: 48,
    code: 90
  }
};

// src/theming/themes/dark.ts
var ke = {
  base: "dark",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: "#222425",
  appContentBg: "#1B1C1D",
  appPreviewBg: s.lightest,
  appBorderColor: "rgba(255,255,255,.1)",
  appBorderRadius: 4,
  // Fonts
  fontBase: y.fonts.base,
  fontCode: y.fonts.mono,
  // Text colors
  textColor: "#C9CDCF",
  textInverseColor: "#222425",
  textMutedColor: "#798186",
  // Toolbar default and active colors
  barTextColor: s.mediumdark,
  barHoverColor: s.secondary,
  barSelectedColor: s.secondary,
  barBg: "#292C2E",
  // Form colors
  buttonBg: "#222425",
  buttonBorder: "rgba(255,255,255,.1)",
  booleanBg: "#222425",
  booleanSelectedBg: "#2E3438",
  inputBg: "#1B1C1D",
  inputBorder: "rgba(255,255,255,.1)",
  inputTextColor: s.lightest,
  inputBorderRadius: 4
}, _ = ke;

// src/theming/themes/light.ts
var $e = {
  base: "light",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: P.app,
  appContentBg: s.lightest,
  appPreviewBg: s.lightest,
  appBorderColor: s.border,
  appBorderRadius: 4,
  // Fonts
  fontBase: y.fonts.base,
  fontCode: y.fonts.mono,
  // Text colors
  textColor: s.darkest,
  textInverseColor: s.lightest,
  textMutedColor: s.dark,
  // Toolbar default and active colors
  barTextColor: s.mediumdark,
  barHoverColor: s.secondary,
  barSelectedColor: s.secondary,
  barBg: s.lightest,
  // Form colors
  buttonBg: P.app,
  buttonBorder: s.medium,
  booleanBg: s.mediumlight,
  booleanSelectedBg: s.lightest,
  inputBg: s.lightest,
  inputBorder: s.border,
  inputTextColor: s.darkest,
  inputBorderRadius: 4
}, E = $e;

// ../node_modules/@storybook/global/dist/index.mjs
var ee = (() => {
  let r;
  return typeof window < "u" ? r = window : typeof globalThis < "u" ? r = globalThis : typeof global < "u" ? r = global : typeof self < "u" ?
  r = self : r = {}, r;
})();

// src/theming/utils.ts
import { logger as Be } from "@storybook/core/client-logger";
var { window: H } = ee;
var Me = /* @__PURE__ */ n((r) => typeof r != "string" ? (Be.warn(
  `Color passed to theme object should be a string. Instead ${r}(${typeof r}) was passed.`
), !1) : !0, "isColorString"), Pe = /* @__PURE__ */ n((r) => !/(gradient|var|calc)/.test(r), "isValidColorForPolished"), Ee = /* @__PURE__ */ n(
(r, e) => r === "darken" ? x(`${Z(1, e)}`, 0.95) : r === "lighten" ? x(`${X(1, e)}`, 0.95) : e, "applyPolished"), re = /* @__PURE__ */ n((r) => (e) => {
  if (!Me(e) || !Pe(e))
    return e;
  try {
    return Ee(r, e);
  } catch {
    return e;
  }
}, "colorFactory"), jr = re("lighten"), Or = re("darken"), te = /* @__PURE__ */ n(() => !H || !H.matchMedia ? "light" : H.matchMedia("(prefe\
rs-color-scheme: dark)").matches ? "dark" : "light", "getPreferredColorScheme");

// src/theming/create.ts
var L = {
  light: E,
  dark: _,
  normal: E
}, D = te(), Er = /* @__PURE__ */ n((r = { base: D }, e) => {
  let t = {
    ...L[D],
    ...L[r.base] || {},
    ...r,
    base: L[r.base] ? r.base : D
  };
  return {
    ...e,
    ...t,
    barSelectedColor: r.barSelectedColor || t.colorSecondary
  };
}, "create");
export {
  Er as create,
  L as themes
};
