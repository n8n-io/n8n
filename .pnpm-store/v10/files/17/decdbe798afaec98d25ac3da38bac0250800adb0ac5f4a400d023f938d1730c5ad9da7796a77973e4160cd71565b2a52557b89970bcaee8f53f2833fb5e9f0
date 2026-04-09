"use strict";
var lr = Object.create;
var E = Object.defineProperty;
var dr = Object.getOwnPropertyDescriptor;
var cr = Object.getOwnPropertyNames;
var mr = Object.getPrototypeOf, gr = Object.prototype.hasOwnProperty;
var a = (e, r) => E(e, "name", { value: r, configurable: !0 });
var S = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports), br = (e, r) => {
  for (var t in r)
    E(e, t, { get: r[t], enumerable: !0 });
}, Fe = (e, r, t, n) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let o of cr(r))
      !gr.call(e, o) && o !== t && E(e, o, { get: () => r[o], enumerable: !(n = dr(r, o)) || n.enumerable });
  return e;
};
var ee = (e, r, t) => (t = e != null ? lr(mr(e)) : {}, Fe(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  r || !e || !e.__esModule ? E(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), hr = (e) => Fe(E({}, "__esModule", { value: !0 }), e);

// ../node_modules/@babel/runtime/helpers/extends.js
var Ce = S((Ba, I) => {
  function re() {
    return I.exports = re = Object.assign ? Object.assign.bind() : function(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = arguments[r];
        for (var n in t) ({}).hasOwnProperty.call(t, n) && (e[n] = t[n]);
      }
      return e;
    }, I.exports.__esModule = !0, I.exports.default = I.exports, re.apply(null, arguments);
  }
  a(re, "_extends");
  I.exports = re, I.exports.__esModule = !0, I.exports.default = I.exports;
});

// ../node_modules/@babel/runtime/helpers/assertThisInitialized.js
var ze = S((Ha, q) => {
  function vr(e) {
    if (e === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  a(vr, "_assertThisInitialized");
  q.exports = vr, q.exports.__esModule = !0, q.exports.default = q.exports;
});

// ../node_modules/@babel/runtime/helpers/setPrototypeOf.js
var Z = S((Ea, O) => {
  function te(e, r) {
    return O.exports = te = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, n) {
      return t.__proto__ = n, t;
    }, O.exports.__esModule = !0, O.exports.default = O.exports, te(e, r);
  }
  a(te, "_setPrototypeOf");
  O.exports = te, O.exports.__esModule = !0, O.exports.default = O.exports;
});

// ../node_modules/@babel/runtime/helpers/inheritsLoose.js
var Te = S((Wa, W) => {
  var yr = Z();
  function xr(e, r) {
    e.prototype = Object.create(r.prototype), e.prototype.constructor = e, yr(e, r);
  }
  a(xr, "_inheritsLoose");
  W.exports = xr, W.exports.__esModule = !0, W.exports.default = W.exports;
});

// ../node_modules/@babel/runtime/helpers/getPrototypeOf.js
var Ae = S((Va, R) => {
  function ne(e) {
    return R.exports = ne = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(r) {
      return r.__proto__ || Object.getPrototypeOf(r);
    }, R.exports.__esModule = !0, R.exports.default = R.exports, ne(e);
  }
  a(ne, "_getPrototypeOf");
  R.exports = ne, R.exports.__esModule = !0, R.exports.default = R.exports;
});

// ../node_modules/@babel/runtime/helpers/isNativeFunction.js
var Ie = S((Ga, U) => {
  function wr(e) {
    try {
      return Function.toString.call(e).indexOf("[native code]") !== -1;
    } catch {
      return typeof e == "function";
    }
  }
  a(wr, "_isNativeFunction");
  U.exports = wr, U.exports.__esModule = !0, U.exports.default = U.exports;
});

// ../node_modules/@babel/runtime/helpers/isNativeReflectConstruct.js
var Re = S((Ya, j) => {
  function Oe() {
    try {
      var e = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch {
    }
    return (j.exports = Oe = /* @__PURE__ */ a(function() {
      return !!e;
    }, "_isNativeReflectConstruct"), j.exports.__esModule = !0, j.exports.default = j.exports)();
  }
  a(Oe, "_isNativeReflectConstruct");
  j.exports = Oe, j.exports.__esModule = !0, j.exports.default = j.exports;
});

// ../node_modules/@babel/runtime/helpers/construct.js
var je = S((Za, V) => {
  var Sr = Re(), Fr = Z();
  function Cr(e, r, t) {
    if (Sr()) return Reflect.construct.apply(null, arguments);
    var n = [null];
    n.push.apply(n, r);
    var o = new (e.bind.apply(e, n))();
    return t && Fr(o, t.prototype), o;
  }
  a(Cr, "_construct");
  V.exports = Cr, V.exports.__esModule = !0, V.exports.default = V.exports;
});

// ../node_modules/@babel/runtime/helpers/wrapNativeSuper.js
var Me = S((_a, M) => {
  var zr = Ae(), Tr = Z(), Ar = Ie(), Ir = je();
  function ae(e) {
    var r = typeof Map == "function" ? /* @__PURE__ */ new Map() : void 0;
    return M.exports = ae = /* @__PURE__ */ a(function(n) {
      if (n === null || !Ar(n)) return n;
      if (typeof n != "function") throw new TypeError("Super expression must either be null or a function");
      if (r !== void 0) {
        if (r.has(n)) return r.get(n);
        r.set(n, o);
      }
      function o() {
        return Ir(n, arguments, zr(this).constructor);
      }
      return a(o, "Wrapper"), o.prototype = Object.create(n.prototype, {
        constructor: {
          value: o,
          enumerable: !1,
          writable: !0,
          configurable: !0
        }
      }), Tr(o, n);
    }, "_wrapNativeSuper"), M.exports.__esModule = !0, M.exports.default = M.exports, ae(e);
  }
  a(ae, "_wrapNativeSuper");
  M.exports = ae, M.exports.__esModule = !0, M.exports.default = M.exports;
});

// ../node_modules/@babel/runtime/helpers/taggedTemplateLiteralLoose.js
var Pe = S((eo, N) => {
  function Or(e, r) {
    return r || (r = e.slice(0)), e.raw = r, e;
  }
  a(Or, "_taggedTemplateLiteralLoose");
  N.exports = Or, N.exports.__esModule = !0, N.exports.default = N.exports;
});

// ../node_modules/polished/dist/polished.cjs.js
var he = S((u) => {
  "use strict";
  Object.defineProperty(u, "__esModule", { value: !0 });
  var Rr = Ce(), jr = ze(), Mr = Te(), Pr = Me(), kr = Pe();
  function J(e) {
    return e && typeof e == "object" && "default" in e ? e : { default: e };
  }
  a(J, "_interopDefaultLegacy");
  var b = /* @__PURE__ */ J(Rr), $r = /* @__PURE__ */ J(jr), Br = /* @__PURE__ */ J(Mr), Lr = /* @__PURE__ */ J(Pr), Qe = /* @__PURE__ */ J(
  kr);
  function ke() {
    var e;
    return e = arguments.length - 1, e < 0 || arguments.length <= e ? void 0 : arguments[e];
  }
  a(ke, "last");
  function Hr(e) {
    return -e;
  }
  a(Hr, "negation");
  function Dr(e, r) {
    return e + r;
  }
  a(Dr, "addition");
  function Er(e, r) {
    return e - r;
  }
  a(Er, "subtraction");
  function qr(e, r) {
    return e * r;
  }
  a(qr, "multiplication");
  function Wr(e, r) {
    return e / r;
  }
  a(Wr, "division");
  function Ur() {
    return Math.max.apply(Math, arguments);
  }
  a(Ur, "max");
  function Vr() {
    return Math.min.apply(Math, arguments);
  }
  a(Vr, "min");
  function Nr() {
    return Array.of.apply(Array, arguments);
  }
  a(Nr, "comma");
  var Gr = {
    symbols: {
      "*": {
        infix: {
          symbol: "*",
          f: qr,
          notation: "infix",
          precedence: 4,
          rightToLeft: 0,
          argCount: 2
        },
        symbol: "*",
        regSymbol: "\\*"
      },
      "/": {
        infix: {
          symbol: "/",
          f: Wr,
          notation: "infix",
          precedence: 4,
          rightToLeft: 0,
          argCount: 2
        },
        symbol: "/",
        regSymbol: "/"
      },
      "+": {
        infix: {
          symbol: "+",
          f: Dr,
          notation: "infix",
          precedence: 2,
          rightToLeft: 0,
          argCount: 2
        },
        prefix: {
          symbol: "+",
          f: ke,
          notation: "prefix",
          precedence: 3,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "+",
        regSymbol: "\\+"
      },
      "-": {
        infix: {
          symbol: "-",
          f: Er,
          notation: "infix",
          precedence: 2,
          rightToLeft: 0,
          argCount: 2
        },
        prefix: {
          symbol: "-",
          f: Hr,
          notation: "prefix",
          precedence: 3,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "-",
        regSymbol: "-"
      },
      ",": {
        infix: {
          symbol: ",",
          f: Nr,
          notation: "infix",
          precedence: 1,
          rightToLeft: 0,
          argCount: 2
        },
        symbol: ",",
        regSymbol: ","
      },
      "(": {
        prefix: {
          symbol: "(",
          f: ke,
          notation: "prefix",
          precedence: 0,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "(",
        regSymbol: "\\("
      },
      ")": {
        postfix: {
          symbol: ")",
          f: void 0,
          notation: "postfix",
          precedence: 0,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: ")",
        regSymbol: "\\)"
      },
      min: {
        func: {
          symbol: "min",
          f: Vr,
          notation: "func",
          precedence: 0,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "min",
        regSymbol: "min\\b"
      },
      max: {
        func: {
          symbol: "max",
          f: Ur,
          notation: "func",
          precedence: 0,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "max",
        regSymbol: "max\\b"
      }
    }
  }, $e = Gr, Qr = {
    1: `Passed invalid arguments to hsl, please pass multiple numbers e.g. hsl(360, 0.75, 0.4) or an object e.g. rgb({ hue: 255, saturation:\
 0.4, lightness: 0.75 }).

`,
    2: `Passed invalid arguments to hsla, please pass multiple numbers e.g. hsla(360, 0.75, 0.4, 0.7) or an object e.g. rgb({ hue: 255, satu\
ration: 0.4, lightness: 0.75, alpha: 0.7 }).

`,
    3: `Passed an incorrect argument to a color function, please pass a string representation of a color.

`,
    4: `Couldn't generate valid rgb string from %s, it returned %s.

`,
    5: `Couldn't parse the color string. Please provide the color as a string in hex, rgb, rgba, hsl or hsla notation.

`,
    6: `Passed invalid arguments to rgb, please pass multiple numbers e.g. rgb(255, 205, 100) or an object e.g. rgb({ red: 255, green: 205, \
blue: 100 }).

`,
    7: `Passed invalid arguments to rgba, please pass multiple numbers e.g. rgb(255, 205, 100, 0.75) or an object e.g. rgb({ red: 255, green\
: 205, blue: 100, alpha: 0.75 }).

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
    65: `To pass multiple animations please supply them in arrays, e.g. animation(['rotate', '2s'], ['move', '1s'])\\nTo pass a single animat\
ion please supply them in simple values, e.g. animation('rotate', '2s').

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
  function Yr() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    var n = r[0], o = [], i;
    for (i = 1; i < r.length; i += 1)
      o.push(r[i]);
    return o.forEach(function(s) {
      n = n.replace(/%[a-z]/, s);
    }), n;
  }
  a(Yr, "format");
  var p = /* @__PURE__ */ function(e) {
    Br.default(r, e);
    function r(t) {
      var n;
      if (process.env.NODE_ENV === "production")
        n = e.call(this, "An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#" + t +
        " for more information.") || this;
      else {
        for (var o = arguments.length, i = new Array(o > 1 ? o - 1 : 0), s = 1; s < o; s++)
          i[s - 1] = arguments[s];
        n = e.call(this, Yr.apply(void 0, [Qr[t]].concat(i))) || this;
      }
      return $r.default(n);
    }
    return a(r, "PolishedError"), r;
  }(/* @__PURE__ */ Lr.default(Error)), Be = /((?!\w)a|na|hc|mc|dg|me[r]?|xe|ni(?![a-zA-Z])|mm|cp|tp|xp|q(?!s)|hv|xamv|nimv|wv|sm|s(?!\D|$)|ged|darg?|nrut)/g;
  function Jr(e) {
    var r = {};
    return r.symbols = e ? b.default({}, $e.symbols, e.symbols) : b.default({}, $e.symbols), r;
  }
  a(Jr, "mergeSymbolMaps");
  function Le(e, r) {
    var t, n = e.pop();
    return r.push(n.f.apply(n, (t = []).concat.apply(t, r.splice(-n.argCount)))), n.precedence;
  }
  a(Le, "exec");
  function Zr(e, r) {
    var t = Jr(r), n, o = [t.symbols["("].prefix], i = [], s = new RegExp(
      // Pattern for numbers
      "\\d+(?:\\.\\d+)?|" + // ...and patterns for individual operators/function names
      Object.keys(t.symbols).map(function(v) {
        return t.symbols[v];
      }).sort(function(v, T) {
        return T.symbol.length - v.symbol.length;
      }).map(function(v) {
        return v.regSymbol;
      }).join("|") + "|(\\S)",
      "g"
    );
    s.lastIndex = 0;
    var f = !1;
    do {
      n = s.exec(e);
      var l = n || [")", void 0], c = l[0], h = l[1], d = t.symbols[c], m = d && !d.prefix && !d.func, x = !d || !d.postfix && !d.infix;
      if (h || (f ? x : m))
        throw new p(37, n ? n.index : e.length, e);
      if (f) {
        var w = d.postfix || d.infix;
        do {
          var z = o[o.length - 1];
          if ((w.precedence - z.precedence || z.rightToLeft) > 0) break;
        } while (Le(o, i));
        f = w.notation === "postfix", w.symbol !== ")" && (o.push(w), f && Le(o, i));
      } else if (d) {
        if (o.push(d.prefix || d.func), d.func && (n = s.exec(e), !n || n[0] !== "("))
          throw new p(38, n ? n.index : e.length, e);
      } else
        i.push(+c), f = !0;
    } while (n && o.length);
    if (o.length)
      throw new p(39, n ? n.index : e.length, e);
    if (n)
      throw new p(40, n ? n.index : e.length, e);
    return i.pop();
  }
  a(Zr, "calculate");
  function oe(e) {
    return e.split("").reverse().join("");
  }
  a(oe, "reverseString");
  function Xr(e, r) {
    var t = oe(e), n = t.match(Be);
    if (n && !n.every(function(i) {
      return i === n[0];
    }))
      throw new p(41);
    var o = oe(t.replace(Be, ""));
    return "" + Zr(o, r) + (n ? oe(n[0]) : "");
  }
  a(Xr, "math");
  var _r = /--[\S]*/g;
  function Kr(e, r) {
    if (!e || !e.match(_r))
      throw new p(73);
    var t;
    if (typeof document < "u" && document.documentElement !== null && (t = getComputedStyle(document.documentElement).getPropertyValue(e)), t)
      return t.trim();
    if (r)
      return r;
    throw new p(74);
  }
  a(Kr, "cssVar");
  function G(e) {
    return e.charAt(0).toUpperCase() + e.slice(1);
  }
  a(G, "capitalizeString");
  var et = ["Top", "Right", "Bottom", "Left"];
  function rt(e, r) {
    if (!e) return r.toLowerCase();
    var t = e.split("-");
    if (t.length > 1)
      return t.splice(1, 0, r), t.reduce(function(o, i) {
        return "" + o + G(i);
      });
    var n = e.replace(/([a-z])([A-Z])/g, "$1" + r + "$2");
    return e === n ? "" + e + r : n;
  }
  a(rt, "generateProperty");
  function tt(e, r) {
    for (var t = {}, n = 0; n < r.length; n += 1)
      (r[n] || r[n] === 0) && (t[rt(e, et[n])] = r[n]);
    return t;
  }
  a(tt, "generateStyles");
  function k(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    var o = t[0], i = t[1], s = i === void 0 ? o : i, f = t[2], l = f === void 0 ? o : f, c = t[3], h = c === void 0 ? s : c, d = [o, s, l, h];
    return tt(e, d);
  }
  a(k, "directionalProperty");
  function He(e, r) {
    return e.substr(-r.length) === r;
  }
  a(He, "endsWith");
  var nt = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;
  function fe(e) {
    if (typeof e != "string") return e;
    var r = e.match(nt);
    return r ? parseFloat(e) : e;
  }
  a(fe, "stripUnit");
  var at = /* @__PURE__ */ a(function(r) {
    return function(t, n) {
      n === void 0 && (n = "16px");
      var o = t, i = n;
      if (typeof t == "string") {
        if (!He(t, "px"))
          throw new p(69, r, t);
        o = fe(t);
      }
      if (typeof n == "string") {
        if (!He(n, "px"))
          throw new p(70, r, n);
        i = fe(n);
      }
      if (typeof o == "string")
        throw new p(71, t, r);
      if (typeof i == "string")
        throw new p(72, n, r);
      return "" + o / i + r;
    };
  }, "pxtoFactory"), Ye = at, ot = /* @__PURE__ */ Ye("em"), it = ot, ut = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;
  function A(e) {
    if (typeof e != "string") return [e, ""];
    var r = e.match(ut);
    return r ? [parseFloat(e), r[2]] : [e, void 0];
  }
  a(A, "getValueAndUnit");
  function Je(e, r) {
    if (typeof e != "object" || e === null)
      throw new p(75, typeof e);
    var t = {};
    return Object.keys(e).forEach(function(n) {
      typeof e[n] == "object" && e[n] !== null ? t[n] = Je(e[n], r) : !r || r && (r === n || r.indexOf(n) >= 0) ? t[n] = e[n] + " !important" :
      t[n] = e[n];
    }), t;
  }
  a(Je, "important");
  var Ze = {
    minorSecond: 1.067,
    majorSecond: 1.125,
    minorThird: 1.2,
    majorThird: 1.25,
    perfectFourth: 1.333,
    augFourth: 1.414,
    perfectFifth: 1.5,
    minorSixth: 1.6,
    goldenSection: 1.618,
    majorSixth: 1.667,
    minorSeventh: 1.778,
    majorSeventh: 1.875,
    octave: 2,
    majorTenth: 2.5,
    majorEleventh: 2.667,
    majorTwelfth: 3,
    doubleOctave: 4
  };
  function st(e) {
    return Ze[e];
  }
  a(st, "getRatio");
  function ft(e, r, t) {
    if (r === void 0 && (r = "1em"), t === void 0 && (t = 1.333), typeof e != "number")
      throw new p(42);
    if (typeof t == "string" && !Ze[t])
      throw new p(43);
    var n = typeof r == "string" ? A(r) : [r, ""], o = n[0], i = n[1], s = typeof t == "string" ? st(t) : t;
    if (typeof o == "string")
      throw new p(44, r);
    return "" + o * Math.pow(s, e) + (i || "");
  }
  a(ft, "modularScale");
  var pt = /* @__PURE__ */ Ye("rem"), lt = pt, pe = 16;
  function Xe(e) {
    var r = A(e);
    if (r[1] === "px")
      return parseFloat(e);
    if (r[1] === "%")
      return parseFloat(e) / 100 * pe;
    throw new p(78, r[1]);
  }
  a(Xe, "convertBase");
  function dt() {
    if (typeof document < "u" && document.documentElement !== null) {
      var e = getComputedStyle(document.documentElement).fontSize;
      return e ? Xe(e) : pe;
    }
    return pe;
  }
  a(dt, "getBaseFromDoc");
  function ct(e, r) {
    var t = A(e);
    if (t[1] !== "rem" && t[1] !== "")
      throw new p(77, t[1]);
    var n = r ? Xe(r) : dt();
    return t[0] * n + "px";
  }
  a(ct, "remToPx");
  var mt = {
    back: "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
    circ: "cubic-bezier(0.600,  0.040, 0.980, 0.335)",
    cubic: "cubic-bezier(0.550,  0.055, 0.675, 0.190)",
    expo: "cubic-bezier(0.950,  0.050, 0.795, 0.035)",
    quad: "cubic-bezier(0.550,  0.085, 0.680, 0.530)",
    quart: "cubic-bezier(0.895,  0.030, 0.685, 0.220)",
    quint: "cubic-bezier(0.755,  0.050, 0.855, 0.060)",
    sine: "cubic-bezier(0.470,  0.000, 0.745, 0.715)"
  };
  function gt(e) {
    return mt[e.toLowerCase().trim()];
  }
  a(gt, "easeIn");
  var bt = {
    back: "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
    circ: "cubic-bezier(0.785,  0.135, 0.150, 0.860)",
    cubic: "cubic-bezier(0.645,  0.045, 0.355, 1.000)",
    expo: "cubic-bezier(1.000,  0.000, 0.000, 1.000)",
    quad: "cubic-bezier(0.455,  0.030, 0.515, 0.955)",
    quart: "cubic-bezier(0.770,  0.000, 0.175, 1.000)",
    quint: "cubic-bezier(0.860,  0.000, 0.070, 1.000)",
    sine: "cubic-bezier(0.445,  0.050, 0.550, 0.950)"
  };
  function ht(e) {
    return bt[e.toLowerCase().trim()];
  }
  a(ht, "easeInOut");
  var vt = {
    back: "cubic-bezier(0.175,  0.885, 0.320, 1.275)",
    cubic: "cubic-bezier(0.215,  0.610, 0.355, 1.000)",
    circ: "cubic-bezier(0.075,  0.820, 0.165, 1.000)",
    expo: "cubic-bezier(0.190,  1.000, 0.220, 1.000)",
    quad: "cubic-bezier(0.250,  0.460, 0.450, 0.940)",
    quart: "cubic-bezier(0.165,  0.840, 0.440, 1.000)",
    quint: "cubic-bezier(0.230,  1.000, 0.320, 1.000)",
    sine: "cubic-bezier(0.390,  0.575, 0.565, 1.000)"
  };
  function yt(e) {
    return vt[e.toLowerCase().trim()];
  }
  a(yt, "easeOut");
  function le(e, r, t, n) {
    t === void 0 && (t = "320px"), n === void 0 && (n = "1200px");
    var o = A(e), i = o[0], s = o[1], f = A(r), l = f[0], c = f[1], h = A(t), d = h[0], m = h[1], x = A(n), w = x[0], z = x[1];
    if (typeof d != "number" || typeof w != "number" || !m || !z || m !== z)
      throw new p(47);
    if (typeof i != "number" || typeof l != "number" || s !== c)
      throw new p(48);
    if (s !== m || c !== z)
      throw new p(76);
    var v = (i - l) / (d - w), T = l - v * w;
    return "calc(" + T.toFixed(2) + (s || "") + " + " + (100 * v).toFixed(2) + "vw)";
  }
  a(le, "between");
  function xt(e) {
    var r;
    e === void 0 && (e = "&");
    var t = e + "::after";
    return r = {}, r[t] = {
      clear: "both",
      content: '""',
      display: "table"
    }, r;
  }
  a(xt, "clearFix");
  function wt(e) {
    return e === void 0 && (e = 0), {
      position: "absolute",
      top: e,
      right: e,
      bottom: e,
      left: e
    };
  }
  a(wt, "cover");
  function St(e, r) {
    r === void 0 && (r = 1);
    var t = {
      display: "inline-block",
      maxWidth: e || "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      wordWrap: "normal"
    };
    return r > 1 ? b.default({}, t, {
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: r,
      display: "-webkit-box",
      whiteSpace: "normal"
    }) : t;
  }
  a(St, "ellipsis");
  function Ft(e, r) {
    var t = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
    if (t) return (t = t.call(e)).next.bind(t);
    if (Array.isArray(e) || (t = Ct(e)) || r && e && typeof e.length == "number") {
      t && (e = t);
      var n = 0;
      return function() {
        return n >= e.length ? { done: !0 } : { done: !1, value: e[n++] };
      };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  a(Ft, "_createForOfIteratorHelperLoose");
  function Ct(e, r) {
    if (e) {
      if (typeof e == "string") return De(e, r);
      var t = Object.prototype.toString.call(e).slice(8, -1);
      if (t === "Object" && e.constructor && (t = e.constructor.name), t === "Map" || t === "Set") return Array.from(e);
      if (t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)) return De(e, r);
    }
  }
  a(Ct, "_unsupportedIterableToArray");
  function De(e, r) {
    (r == null || r > e.length) && (r = e.length);
    for (var t = 0, n = new Array(r); t < r; t++)
      n[t] = e[t];
    return n;
  }
  a(De, "_arrayLikeToArray");
  function zt(e, r, t) {
    if (r === void 0 && (r = "320px"), t === void 0 && (t = "1200px"), !Array.isArray(e) && typeof e != "object" || e === null)
      throw new p(49);
    if (Array.isArray(e)) {
      for (var n = {}, o = {}, i = Ft(e), s; !(s = i()).done; ) {
        var f, l, c = s.value;
        if (!c.prop || !c.fromSize || !c.toSize)
          throw new p(50);
        o[c.prop] = c.fromSize, n["@media (min-width: " + r + ")"] = b.default({}, n["@media (min-width: " + r + ")"], (f = {}, f[c.prop] = le(
        c.fromSize, c.toSize, r, t), f)), n["@media (min-width: " + t + ")"] = b.default({}, n["@media (min-width: " + t + ")"], (l = {}, l[c.
        prop] = c.toSize, l));
      }
      return b.default({}, o, n);
    } else {
      var h, d, m;
      if (!e.prop || !e.fromSize || !e.toSize)
        throw new p(51);
      return m = {}, m[e.prop] = e.fromSize, m["@media (min-width: " + r + ")"] = (h = {}, h[e.prop] = le(e.fromSize, e.toSize, r, t), h), m["\
@media (min-width: " + t + ")"] = (d = {}, d[e.prop] = e.toSize, d), m;
    }
  }
  a(zt, "fluidRange");
  var Tt = /^\s*data:([a-z]+\/[a-z-]+(;[a-z-]+=[a-z-]+)?)?(;charset=[a-z0-9-]+)?(;base64)?,[a-z0-9!$&',()*+,;=\-._~:@/?%\s]*\s*$/i, At = {
    woff: "woff",
    woff2: "woff2",
    ttf: "truetype",
    otf: "opentype",
    eot: "embedded-opentype",
    svg: "svg",
    svgz: "svg"
  };
  function Ee(e, r) {
    return r ? ' format("' + At[e] + '")' : "";
  }
  a(Ee, "generateFormatHint");
  function It(e) {
    return !!e.replace(/\s+/g, " ").match(Tt);
  }
  a(It, "isDataURI");
  function Ot(e, r, t) {
    if (It(e))
      return 'url("' + e + '")' + Ee(r[0], t);
    var n = r.map(function(o) {
      return 'url("' + e + "." + o + '")' + Ee(o, t);
    });
    return n.join(", ");
  }
  a(Ot, "generateFileReferences");
  function Rt(e) {
    var r = e.map(function(t) {
      return 'local("' + t + '")';
    });
    return r.join(", ");
  }
  a(Rt, "generateLocalReferences");
  function jt(e, r, t, n) {
    var o = [];
    return r && o.push(Rt(r)), e && o.push(Ot(e, t, n)), o.join(", ");
  }
  a(jt, "generateSources");
  function Mt(e) {
    var r = e.fontFamily, t = e.fontFilePath, n = e.fontStretch, o = e.fontStyle, i = e.fontVariant, s = e.fontWeight, f = e.fileFormats, l = f ===
    void 0 ? ["eot", "woff2", "woff", "ttf", "svg"] : f, c = e.formatHint, h = c === void 0 ? !1 : c, d = e.localFonts, m = d === void 0 ? [
    r] : d, x = e.unicodeRange, w = e.fontDisplay, z = e.fontVariationSettings, v = e.fontFeatureSettings;
    if (!r) throw new p(55);
    if (!t && !m)
      throw new p(52);
    if (m && !Array.isArray(m))
      throw new p(53);
    if (!Array.isArray(l))
      throw new p(54);
    var T = {
      "@font-face": {
        fontFamily: r,
        src: jt(t, m, l, h),
        unicodeRange: x,
        fontStretch: n,
        fontStyle: o,
        fontVariant: i,
        fontWeight: s,
        fontDisplay: w,
        fontVariationSettings: z,
        fontFeatureSettings: v
      }
    };
    return JSON.parse(JSON.stringify(T));
  }
  a(Mt, "fontFace");
  function Pt() {
    return {
      textIndent: "101%",
      overflow: "hidden",
      whiteSpace: "nowrap"
    };
  }
  a(Pt, "hideText");
  function kt() {
    return {
      border: "0",
      clip: "rect(0 0 0 0)",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      padding: "0",
      position: "absolute",
      whiteSpace: "nowrap",
      width: "1px"
    };
  }
  a(kt, "hideVisually");
  function _e(e) {
    return e === void 0 && (e = 1.3), `
    @media only screen and (-webkit-min-device-pixel-ratio: ` + e + `),
    only screen and (min--moz-device-pixel-ratio: ` + e + `),
    only screen and (-o-min-device-pixel-ratio: ` + e + `/1),
    only screen and (min-resolution: ` + Math.round(e * 96) + `dpi),
    only screen and (min-resolution: ` + e + `dppx)
  `;
  }
  a(_e, "hiDPI");
  function Ke(e) {
    for (var r = "", t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
      n[o - 1] = arguments[o];
    for (var i = 0; i < e.length; i += 1)
      if (r += e[i], i === n.length - 1 && n[i]) {
        var s = n.filter(function(f) {
          return !!f;
        });
        s.length > 1 ? (r = r.slice(0, -1), r += ", " + n[i]) : s.length === 1 && (r += "" + n[i]);
      } else n[i] && (r += n[i] + " ");
    return r.trim();
  }
  a(Ke, "constructGradientValue");
  var qe;
  function $t(e) {
    var r = e.colorStops, t = e.fallback, n = e.toDirection, o = n === void 0 ? "" : n;
    if (!r || r.length < 2)
      throw new p(56);
    return {
      backgroundColor: t || r[0].replace(/,\s+/g, ",").split(" ")[0].replace(/,(?=\S)/g, ", "),
      backgroundImage: Ke(qe || (qe = Qe.default(["linear-gradient(", "", ")"])), o, r.join(", ").replace(/,(?=\S)/g, ", "))
    };
  }
  a($t, "linearGradient");
  function Bt() {
    var e;
    return [(e = {
      html: {
        lineHeight: "1.15",
        textSizeAdjust: "100%"
      },
      body: {
        margin: "0"
      },
      main: {
        display: "block"
      },
      h1: {
        fontSize: "2em",
        margin: "0.67em 0"
      },
      hr: {
        boxSizing: "content-box",
        height: "0",
        overflow: "visible"
      },
      pre: {
        fontFamily: "monospace, monospace",
        fontSize: "1em"
      },
      a: {
        backgroundColor: "transparent"
      },
      "abbr[title]": {
        borderBottom: "none",
        textDecoration: "underline"
      }
    }, e[`b,
    strong`] = {
      fontWeight: "bolder"
    }, e[`code,
    kbd,
    samp`] = {
      fontFamily: "monospace, monospace",
      fontSize: "1em"
    }, e.small = {
      fontSize: "80%"
    }, e[`sub,
    sup`] = {
      fontSize: "75%",
      lineHeight: "0",
      position: "relative",
      verticalAlign: "baseline"
    }, e.sub = {
      bottom: "-0.25em"
    }, e.sup = {
      top: "-0.5em"
    }, e.img = {
      borderStyle: "none"
    }, e[`button,
    input,
    optgroup,
    select,
    textarea`] = {
      fontFamily: "inherit",
      fontSize: "100%",
      lineHeight: "1.15",
      margin: "0"
    }, e[`button,
    input`] = {
      overflow: "visible"
    }, e[`button,
    select`] = {
      textTransform: "none"
    }, e[`button,
    html [type="button"],
    [type="reset"],
    [type="submit"]`] = {
      WebkitAppearance: "button"
    }, e[`button::-moz-focus-inner,
    [type="button"]::-moz-focus-inner,
    [type="reset"]::-moz-focus-inner,
    [type="submit"]::-moz-focus-inner`] = {
      borderStyle: "none",
      padding: "0"
    }, e[`button:-moz-focusring,
    [type="button"]:-moz-focusring,
    [type="reset"]:-moz-focusring,
    [type="submit"]:-moz-focusring`] = {
      outline: "1px dotted ButtonText"
    }, e.fieldset = {
      padding: "0.35em 0.625em 0.75em"
    }, e.legend = {
      boxSizing: "border-box",
      color: "inherit",
      display: "table",
      maxWidth: "100%",
      padding: "0",
      whiteSpace: "normal"
    }, e.progress = {
      verticalAlign: "baseline"
    }, e.textarea = {
      overflow: "auto"
    }, e[`[type="checkbox"],
    [type="radio"]`] = {
      boxSizing: "border-box",
      padding: "0"
    }, e[`[type="number"]::-webkit-inner-spin-button,
    [type="number"]::-webkit-outer-spin-button`] = {
      height: "auto"
    }, e['[type="search"]'] = {
      WebkitAppearance: "textfield",
      outlineOffset: "-2px"
    }, e['[type="search"]::-webkit-search-decoration'] = {
      WebkitAppearance: "none"
    }, e["::-webkit-file-upload-button"] = {
      WebkitAppearance: "button",
      font: "inherit"
    }, e.details = {
      display: "block"
    }, e.summary = {
      display: "list-item"
    }, e.template = {
      display: "none"
    }, e["[hidden]"] = {
      display: "none"
    }, e), {
      "abbr[title]": {
        textDecoration: "underline dotted"
      }
    }];
  }
  a(Bt, "normalize");
  var We;
  function Lt(e) {
    var r = e.colorStops, t = e.extent, n = t === void 0 ? "" : t, o = e.fallback, i = e.position, s = i === void 0 ? "" : i, f = e.shape, l = f ===
    void 0 ? "" : f;
    if (!r || r.length < 2)
      throw new p(57);
    return {
      backgroundColor: o || r[0].split(" ")[0],
      backgroundImage: Ke(We || (We = Qe.default(["radial-gradient(", "", "", "", ")"])), s, l, n, r.join(", "))
    };
  }
  a(Lt, "radialGradient");
  function Ht(e, r, t, n, o) {
    var i;
    if (t === void 0 && (t = "png"), o === void 0 && (o = "_2x"), !e)
      throw new p(58);
    var s = t.replace(/^\./, ""), f = n ? n + "." + s : "" + e + o + "." + s;
    return i = {
      backgroundImage: "url(" + e + "." + s + ")"
    }, i[_e()] = b.default({
      backgroundImage: "url(" + f + ")"
    }, r ? {
      backgroundSize: r
    } : {}), i;
  }
  a(Ht, "retinaImage");
  var Dt = {
    easeInBack: "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
    easeInCirc: "cubic-bezier(0.600,  0.040, 0.980, 0.335)",
    easeInCubic: "cubic-bezier(0.550,  0.055, 0.675, 0.190)",
    easeInExpo: "cubic-bezier(0.950,  0.050, 0.795, 0.035)",
    easeInQuad: "cubic-bezier(0.550,  0.085, 0.680, 0.530)",
    easeInQuart: "cubic-bezier(0.895,  0.030, 0.685, 0.220)",
    easeInQuint: "cubic-bezier(0.755,  0.050, 0.855, 0.060)",
    easeInSine: "cubic-bezier(0.470,  0.000, 0.745, 0.715)",
    easeOutBack: "cubic-bezier(0.175,  0.885, 0.320, 1.275)",
    easeOutCubic: "cubic-bezier(0.215,  0.610, 0.355, 1.000)",
    easeOutCirc: "cubic-bezier(0.075,  0.820, 0.165, 1.000)",
    easeOutExpo: "cubic-bezier(0.190,  1.000, 0.220, 1.000)",
    easeOutQuad: "cubic-bezier(0.250,  0.460, 0.450, 0.940)",
    easeOutQuart: "cubic-bezier(0.165,  0.840, 0.440, 1.000)",
    easeOutQuint: "cubic-bezier(0.230,  1.000, 0.320, 1.000)",
    easeOutSine: "cubic-bezier(0.390,  0.575, 0.565, 1.000)",
    easeInOutBack: "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
    easeInOutCirc: "cubic-bezier(0.785,  0.135, 0.150, 0.860)",
    easeInOutCubic: "cubic-bezier(0.645,  0.045, 0.355, 1.000)",
    easeInOutExpo: "cubic-bezier(1.000,  0.000, 0.000, 1.000)",
    easeInOutQuad: "cubic-bezier(0.455,  0.030, 0.515, 0.955)",
    easeInOutQuart: "cubic-bezier(0.770,  0.000, 0.175, 1.000)",
    easeInOutQuint: "cubic-bezier(0.860,  0.000, 0.070, 1.000)",
    easeInOutSine: "cubic-bezier(0.445,  0.050, 0.550, 0.950)"
  };
  function Et(e) {
    return Dt[e];
  }
  a(Et, "getTimingFunction");
  function qt(e) {
    return Et(e);
  }
  a(qt, "timingFunctions");
  var Wt = /* @__PURE__ */ a(function(r, t, n) {
    var o = "" + n[0] + (n[1] || ""), i = "" + n[0] / 2 + (n[1] || ""), s = "" + t[0] + (t[1] || ""), f = "" + t[0] / 2 + (t[1] || "");
    switch (r) {
      case "top":
        return "0 " + i + " " + s + " " + i;
      case "topLeft":
        return o + " " + s + " 0 0";
      case "left":
        return f + " " + o + " " + f + " 0";
      case "bottomLeft":
        return o + " 0 0 " + s;
      case "bottom":
        return s + " " + i + " 0 " + i;
      case "bottomRight":
        return "0 0 " + o + " " + s;
      case "right":
        return f + " 0 " + f + " " + o;
      case "topRight":
      default:
        return "0 " + o + " " + s + " 0";
    }
  }, "getBorderWidth"), Ut = /* @__PURE__ */ a(function(r, t) {
    switch (r) {
      case "top":
      case "bottomRight":
        return {
          borderBottomColor: t
        };
      case "right":
      case "bottomLeft":
        return {
          borderLeftColor: t
        };
      case "bottom":
      case "topLeft":
        return {
          borderTopColor: t
        };
      case "left":
      case "topRight":
        return {
          borderRightColor: t
        };
      default:
        throw new p(59);
    }
  }, "getBorderColor");
  function Vt(e) {
    var r = e.pointingDirection, t = e.height, n = e.width, o = e.foregroundColor, i = e.backgroundColor, s = i === void 0 ? "transparent" :
    i, f = A(n), l = A(t);
    if (isNaN(l[0]) || isNaN(f[0]))
      throw new p(60);
    return b.default({
      width: "0",
      height: "0",
      borderColor: s
    }, Ut(r, o), {
      borderStyle: "solid",
      borderWidth: Wt(r, l, f)
    });
  }
  a(Vt, "triangle");
  function Nt(e) {
    e === void 0 && (e = "break-word");
    var r = e === "break-word" ? "break-all" : e;
    return {
      overflowWrap: e,
      wordWrap: e,
      wordBreak: r
    };
  }
  a(Nt, "wordWrap");
  function ie(e) {
    return Math.round(e * 255);
  }
  a(ie, "colorToInt");
  function Gt(e, r, t) {
    return ie(e) + "," + ie(r) + "," + ie(t);
  }
  a(Gt, "convertToInt");
  function Q(e, r, t, n) {
    if (n === void 0 && (n = Gt), r === 0)
      return n(t, t, t);
    var o = (e % 360 + 360) % 360 / 60, i = (1 - Math.abs(2 * t - 1)) * r, s = i * (1 - Math.abs(o % 2 - 1)), f = 0, l = 0, c = 0;
    o >= 0 && o < 1 ? (f = i, l = s) : o >= 1 && o < 2 ? (f = s, l = i) : o >= 2 && o < 3 ? (l = i, c = s) : o >= 3 && o < 4 ? (l = s, c = i) :
    o >= 4 && o < 5 ? (f = s, c = i) : o >= 5 && o < 6 && (f = i, c = s);
    var h = t - i / 2, d = f + h, m = l + h, x = c + h;
    return n(d, m, x);
  }
  a(Q, "hslToRgb");
  var Ue = {
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
  function Qt(e) {
    if (typeof e != "string") return e;
    var r = e.toLowerCase();
    return Ue[r] ? "#" + Ue[r] : e;
  }
  a(Qt, "nameToHex");
  var Yt = /^#[a-fA-F0-9]{6}$/, Jt = /^#[a-fA-F0-9]{8}$/, Zt = /^#[a-fA-F0-9]{3}$/, Xt = /^#[a-fA-F0-9]{4}$/, ue = /^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,
  _t = /^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i, Kt = /^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,
  en = /^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;
  function P(e) {
    if (typeof e != "string")
      throw new p(3);
    var r = Qt(e);
    if (r.match(Yt))
      return {
        red: parseInt("" + r[1] + r[2], 16),
        green: parseInt("" + r[3] + r[4], 16),
        blue: parseInt("" + r[5] + r[6], 16)
      };
    if (r.match(Jt)) {
      var t = parseFloat((parseInt("" + r[7] + r[8], 16) / 255).toFixed(2));
      return {
        red: parseInt("" + r[1] + r[2], 16),
        green: parseInt("" + r[3] + r[4], 16),
        blue: parseInt("" + r[5] + r[6], 16),
        alpha: t
      };
    }
    if (r.match(Zt))
      return {
        red: parseInt("" + r[1] + r[1], 16),
        green: parseInt("" + r[2] + r[2], 16),
        blue: parseInt("" + r[3] + r[3], 16)
      };
    if (r.match(Xt)) {
      var n = parseFloat((parseInt("" + r[4] + r[4], 16) / 255).toFixed(2));
      return {
        red: parseInt("" + r[1] + r[1], 16),
        green: parseInt("" + r[2] + r[2], 16),
        blue: parseInt("" + r[3] + r[3], 16),
        alpha: n
      };
    }
    var o = ue.exec(r);
    if (o)
      return {
        red: parseInt("" + o[1], 10),
        green: parseInt("" + o[2], 10),
        blue: parseInt("" + o[3], 10)
      };
    var i = _t.exec(r.substring(0, 50));
    if (i)
      return {
        red: parseInt("" + i[1], 10),
        green: parseInt("" + i[2], 10),
        blue: parseInt("" + i[3], 10),
        alpha: parseFloat("" + i[4]) > 1 ? parseFloat("" + i[4]) / 100 : parseFloat("" + i[4])
      };
    var s = Kt.exec(r);
    if (s) {
      var f = parseInt("" + s[1], 10), l = parseInt("" + s[2], 10) / 100, c = parseInt("" + s[3], 10) / 100, h = "rgb(" + Q(f, l, c) + ")", d = ue.
      exec(h);
      if (!d)
        throw new p(4, r, h);
      return {
        red: parseInt("" + d[1], 10),
        green: parseInt("" + d[2], 10),
        blue: parseInt("" + d[3], 10)
      };
    }
    var m = en.exec(r.substring(0, 50));
    if (m) {
      var x = parseInt("" + m[1], 10), w = parseInt("" + m[2], 10) / 100, z = parseInt("" + m[3], 10) / 100, v = "rgb(" + Q(x, w, z) + ")", T = ue.
      exec(v);
      if (!T)
        throw new p(4, r, v);
      return {
        red: parseInt("" + T[1], 10),
        green: parseInt("" + T[2], 10),
        blue: parseInt("" + T[3], 10),
        alpha: parseFloat("" + m[4]) > 1 ? parseFloat("" + m[4]) / 100 : parseFloat("" + m[4])
      };
    }
    throw new p(5);
  }
  a(P, "parseToRgb");
  function rn(e) {
    var r = e.red / 255, t = e.green / 255, n = e.blue / 255, o = Math.max(r, t, n), i = Math.min(r, t, n), s = (o + i) / 2;
    if (o === i)
      return e.alpha !== void 0 ? {
        hue: 0,
        saturation: 0,
        lightness: s,
        alpha: e.alpha
      } : {
        hue: 0,
        saturation: 0,
        lightness: s
      };
    var f, l = o - i, c = s > 0.5 ? l / (2 - o - i) : l / (o + i);
    switch (o) {
      case r:
        f = (t - n) / l + (t < n ? 6 : 0);
        break;
      case t:
        f = (n - r) / l + 2;
        break;
      default:
        f = (r - t) / l + 4;
        break;
    }
    return f *= 60, e.alpha !== void 0 ? {
      hue: f,
      saturation: c,
      lightness: s,
      alpha: e.alpha
    } : {
      hue: f,
      saturation: c,
      lightness: s
    };
  }
  a(rn, "rgbToHsl");
  function C(e) {
    return rn(P(e));
  }
  a(C, "parseToHsl");
  var tn = /* @__PURE__ */ a(function(r) {
    return r.length === 7 && r[1] === r[2] && r[3] === r[4] && r[5] === r[6] ? "#" + r[1] + r[3] + r[5] : r;
  }, "reduceHexValue"), de = tn;
  function $(e) {
    var r = e.toString(16);
    return r.length === 1 ? "0" + r : r;
  }
  a($, "numberToHex");
  function se(e) {
    return $(Math.round(e * 255));
  }
  a(se, "colorToHex");
  function nn(e, r, t) {
    return de("#" + se(e) + se(r) + se(t));
  }
  a(nn, "convertToHex");
  function X(e, r, t) {
    return Q(e, r, t, nn);
  }
  a(X, "hslToHex");
  function ce(e, r, t) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number")
      return X(e, r, t);
    if (typeof e == "object" && r === void 0 && t === void 0)
      return X(e.hue, e.saturation, e.lightness);
    throw new p(1);
  }
  a(ce, "hsl");
  function me(e, r, t, n) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number" && typeof n == "number")
      return n >= 1 ? X(e, r, t) : "rgba(" + Q(e, r, t) + "," + n + ")";
    if (typeof e == "object" && r === void 0 && t === void 0 && n === void 0)
      return e.alpha >= 1 ? X(e.hue, e.saturation, e.lightness) : "rgba(" + Q(e.hue, e.saturation, e.lightness) + "," + e.alpha + ")";
    throw new p(2);
  }
  a(me, "hsla");
  function Y(e, r, t) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number")
      return de("#" + $(e) + $(r) + $(t));
    if (typeof e == "object" && r === void 0 && t === void 0)
      return de("#" + $(e.red) + $(e.green) + $(e.blue));
    throw new p(6);
  }
  a(Y, "rgb");
  function L(e, r, t, n) {
    if (typeof e == "string" && typeof r == "number") {
      var o = P(e);
      return "rgba(" + o.red + "," + o.green + "," + o.blue + "," + r + ")";
    } else {
      if (typeof e == "number" && typeof r == "number" && typeof t == "number" && typeof n == "number")
        return n >= 1 ? Y(e, r, t) : "rgba(" + e + "," + r + "," + t + "," + n + ")";
      if (typeof e == "object" && r === void 0 && t === void 0 && n === void 0)
        return e.alpha >= 1 ? Y(e.red, e.green, e.blue) : "rgba(" + e.red + "," + e.green + "," + e.blue + "," + e.alpha + ")";
    }
    throw new p(7);
  }
  a(L, "rgba");
  var an = /* @__PURE__ */ a(function(r) {
    return typeof r.red == "number" && typeof r.green == "number" && typeof r.blue == "number" && (typeof r.alpha != "number" || typeof r.alpha >
    "u");
  }, "isRgb"), on = /* @__PURE__ */ a(function(r) {
    return typeof r.red == "number" && typeof r.green == "number" && typeof r.blue == "number" && typeof r.alpha == "number";
  }, "isRgba"), un = /* @__PURE__ */ a(function(r) {
    return typeof r.hue == "number" && typeof r.saturation == "number" && typeof r.lightness == "number" && (typeof r.alpha != "number" || typeof r.
    alpha > "u");
  }, "isHsl"), sn = /* @__PURE__ */ a(function(r) {
    return typeof r.hue == "number" && typeof r.saturation == "number" && typeof r.lightness == "number" && typeof r.alpha == "number";
  }, "isHsla");
  function F(e) {
    if (typeof e != "object") throw new p(8);
    if (on(e)) return L(e);
    if (an(e)) return Y(e);
    if (sn(e)) return me(e);
    if (un(e)) return ce(e);
    throw new p(8);
  }
  a(F, "toColorString");
  function er(e, r, t) {
    return /* @__PURE__ */ a(function() {
      var o = t.concat(Array.prototype.slice.call(arguments));
      return o.length >= r ? e.apply(this, o) : er(e, r, o);
    }, "fn");
  }
  a(er, "curried");
  function y(e) {
    return er(e, e.length, []);
  }
  a(y, "curry");
  function fn(e, r) {
    if (r === "transparent") return r;
    var t = C(r);
    return F(b.default({}, t, {
      hue: t.hue + parseFloat(e)
    }));
  }
  a(fn, "adjustHue");
  var pn = /* @__PURE__ */ y(fn), ln = pn;
  function dn(e) {
    if (e === "transparent") return e;
    var r = C(e);
    return F(b.default({}, r, {
      hue: (r.hue + 180) % 360
    }));
  }
  a(dn, "complement");
  function H(e, r, t) {
    return Math.max(e, Math.min(r, t));
  }
  a(H, "guard");
  function cn(e, r) {
    if (r === "transparent") return r;
    var t = C(r);
    return F(b.default({}, t, {
      lightness: H(0, 1, t.lightness - parseFloat(e))
    }));
  }
  a(cn, "darken");
  var mn = /* @__PURE__ */ y(cn), gn = mn;
  function bn(e, r) {
    if (r === "transparent") return r;
    var t = C(r);
    return F(b.default({}, t, {
      saturation: H(0, 1, t.saturation - parseFloat(e))
    }));
  }
  a(bn, "desaturate");
  var hn = /* @__PURE__ */ y(bn), vn = hn;
  function _(e) {
    if (e === "transparent") return 0;
    var r = P(e), t = Object.keys(r).map(function(s) {
      var f = r[s] / 255;
      return f <= 0.03928 ? f / 12.92 : Math.pow((f + 0.055) / 1.055, 2.4);
    }), n = t[0], o = t[1], i = t[2];
    return parseFloat((0.2126 * n + 0.7152 * o + 0.0722 * i).toFixed(3));
  }
  a(_, "getLuminance");
  function ge(e, r) {
    var t = _(e), n = _(r);
    return parseFloat((t > n ? (t + 0.05) / (n + 0.05) : (n + 0.05) / (t + 0.05)).toFixed(2));
  }
  a(ge, "getContrast");
  function yn(e) {
    return e === "transparent" ? e : F(b.default({}, C(e), {
      saturation: 0
    }));
  }
  a(yn, "grayscale");
  function xn(e) {
    if (typeof e == "object" && typeof e.hue == "number" && typeof e.saturation == "number" && typeof e.lightness == "number")
      return e.alpha && typeof e.alpha == "number" ? me({
        hue: e.hue,
        saturation: e.saturation,
        lightness: e.lightness,
        alpha: e.alpha
      }) : ce({
        hue: e.hue,
        saturation: e.saturation,
        lightness: e.lightness
      });
    throw new p(45);
  }
  a(xn, "hslToColorString");
  function wn(e) {
    if (e === "transparent") return e;
    var r = P(e);
    return F(b.default({}, r, {
      red: 255 - r.red,
      green: 255 - r.green,
      blue: 255 - r.blue
    }));
  }
  a(wn, "invert");
  function Sn(e, r) {
    if (r === "transparent") return r;
    var t = C(r);
    return F(b.default({}, t, {
      lightness: H(0, 1, t.lightness + parseFloat(e))
    }));
  }
  a(Sn, "lighten");
  var Fn = /* @__PURE__ */ y(Sn), Cn = Fn;
  function zn(e, r) {
    var t = ge(e, r);
    return {
      AA: t >= 4.5,
      AALarge: t >= 3,
      AAA: t >= 7,
      AAALarge: t >= 4.5
    };
  }
  a(zn, "meetsContrastGuidelines");
  function Tn(e, r, t) {
    if (r === "transparent") return t;
    if (t === "transparent") return r;
    if (e === 0) return t;
    var n = P(r), o = b.default({}, n, {
      alpha: typeof n.alpha == "number" ? n.alpha : 1
    }), i = P(t), s = b.default({}, i, {
      alpha: typeof i.alpha == "number" ? i.alpha : 1
    }), f = o.alpha - s.alpha, l = parseFloat(e) * 2 - 1, c = l * f === -1 ? l : l + f, h = 1 + l * f, d = (c / h + 1) / 2, m = 1 - d, x = {
      red: Math.floor(o.red * d + s.red * m),
      green: Math.floor(o.green * d + s.green * m),
      blue: Math.floor(o.blue * d + s.blue * m),
      alpha: o.alpha * parseFloat(e) + s.alpha * (1 - parseFloat(e))
    };
    return L(x);
  }
  a(Tn, "mix");
  var An = /* @__PURE__ */ y(Tn), be = An;
  function In(e, r) {
    if (r === "transparent") return r;
    var t = P(r), n = typeof t.alpha == "number" ? t.alpha : 1, o = b.default({}, t, {
      alpha: H(0, 1, (n * 100 + parseFloat(e) * 100) / 100)
    });
    return L(o);
  }
  a(In, "opacify");
  var On = /* @__PURE__ */ y(In), Rn = On, Ve = "#000", Ne = "#fff";
  function jn(e, r, t, n) {
    r === void 0 && (r = Ve), t === void 0 && (t = Ne), n === void 0 && (n = !0);
    var o = _(e) > 0.179, i = o ? r : t;
    return !n || ge(e, i) >= 4.5 ? i : o ? Ve : Ne;
  }
  a(jn, "readableColor");
  function Mn(e) {
    if (typeof e == "object" && typeof e.red == "number" && typeof e.green == "number" && typeof e.blue == "number")
      return typeof e.alpha == "number" ? L({
        red: e.red,
        green: e.green,
        blue: e.blue,
        alpha: e.alpha
      }) : Y({
        red: e.red,
        green: e.green,
        blue: e.blue
      });
    throw new p(46);
  }
  a(Mn, "rgbToColorString");
  function Pn(e, r) {
    if (r === "transparent") return r;
    var t = C(r);
    return F(b.default({}, t, {
      saturation: H(0, 1, t.saturation + parseFloat(e))
    }));
  }
  a(Pn, "saturate");
  var kn = /* @__PURE__ */ y(Pn), $n = kn;
  function Bn(e, r) {
    return r === "transparent" ? r : F(b.default({}, C(r), {
      hue: parseFloat(e)
    }));
  }
  a(Bn, "setHue");
  var Ln = /* @__PURE__ */ y(Bn), Hn = Ln;
  function Dn(e, r) {
    return r === "transparent" ? r : F(b.default({}, C(r), {
      lightness: parseFloat(e)
    }));
  }
  a(Dn, "setLightness");
  var En = /* @__PURE__ */ y(Dn), qn = En;
  function Wn(e, r) {
    return r === "transparent" ? r : F(b.default({}, C(r), {
      saturation: parseFloat(e)
    }));
  }
  a(Wn, "setSaturation");
  var Un = /* @__PURE__ */ y(Wn), Vn = Un;
  function Nn(e, r) {
    return r === "transparent" ? r : be(parseFloat(e), "rgb(0, 0, 0)", r);
  }
  a(Nn, "shade");
  var Gn = /* @__PURE__ */ y(Nn), Qn = Gn;
  function Yn(e, r) {
    return r === "transparent" ? r : be(parseFloat(e), "rgb(255, 255, 255)", r);
  }
  a(Yn, "tint");
  var Jn = /* @__PURE__ */ y(Yn), Zn = Jn;
  function Xn(e, r) {
    if (r === "transparent") return r;
    var t = P(r), n = typeof t.alpha == "number" ? t.alpha : 1, o = b.default({}, t, {
      alpha: H(0, 1, +(n * 100 - parseFloat(e) * 100).toFixed(2) / 100)
    });
    return L(o);
  }
  a(Xn, "transparentize");
  var _n = /* @__PURE__ */ y(Xn), Kn = _n;
  function ea() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    var n = Array.isArray(r[0]);
    if (!n && r.length > 8)
      throw new p(64);
    var o = r.map(function(i) {
      if (n && !Array.isArray(i) || !n && Array.isArray(i))
        throw new p(65);
      if (Array.isArray(i) && i.length > 8)
        throw new p(66);
      return Array.isArray(i) ? i.join(" ") : i;
    }).join(", ");
    return {
      animation: o
    };
  }
  a(ea, "animation");
  function ra() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return {
      backgroundImage: r.join(", ")
    };
  }
  a(ra, "backgroundImages");
  function ta() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return {
      background: r.join(", ")
    };
  }
  a(ta, "backgrounds");
  var na = ["top", "right", "bottom", "left"];
  function aa(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    if (typeof e == "string" && na.indexOf(e) >= 0) {
      var o;
      return o = {}, o["border" + G(e) + "Width"] = t[0], o["border" + G(e) + "Style"] = t[1], o["border" + G(e) + "Color"] = t[2], o;
    } else
      return t.unshift(e), {
        borderWidth: t[0],
        borderStyle: t[1],
        borderColor: t[2]
      };
  }
  a(aa, "border");
  function oa() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return k.apply(void 0, ["borderColor"].concat(r));
  }
  a(oa, "borderColor");
  function ia(e, r) {
    var t = G(e);
    if (!r && r !== 0)
      throw new p(62);
    if (t === "Top" || t === "Bottom") {
      var n;
      return n = {}, n["border" + t + "RightRadius"] = r, n["border" + t + "LeftRadius"] = r, n;
    }
    if (t === "Left" || t === "Right") {
      var o;
      return o = {}, o["borderTop" + t + "Radius"] = r, o["borderBottom" + t + "Radius"] = r, o;
    }
    throw new p(63);
  }
  a(ia, "borderRadius");
  function ua() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return k.apply(void 0, ["borderStyle"].concat(r));
  }
  a(ua, "borderStyle");
  function sa() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return k.apply(void 0, ["borderWidth"].concat(r));
  }
  a(sa, "borderWidth");
  function Ge(e, r) {
    var t = r ? ":" + r : "";
    return e(t);
  }
  a(Ge, "generateSelectors");
  function rr(e, r, t) {
    if (!r) throw new p(67);
    if (e.length === 0) return Ge(r, null);
    for (var n = [], o = 0; o < e.length; o += 1) {
      if (t && t.indexOf(e[o]) < 0)
        throw new p(68);
      n.push(Ge(r, e[o]));
    }
    return n = n.join(","), n;
  }
  a(rr, "statefulSelectors");
  var fa = [void 0, null, "active", "focus", "hover"];
  function pa(e) {
    return "button" + e + `,
  input[type="button"]` + e + `,
  input[type="reset"]` + e + `,
  input[type="submit"]` + e;
  }
  a(pa, "template$1");
  function la() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return rr(r, pa, fa);
  }
  a(la, "buttons");
  function da() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return k.apply(void 0, ["margin"].concat(r));
  }
  a(da, "margin");
  function ca() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return k.apply(void 0, ["padding"].concat(r));
  }
  a(ca, "padding");
  var ma = ["absolute", "fixed", "relative", "static", "sticky"];
  function ga(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    return ma.indexOf(e) >= 0 && e ? b.default({}, k.apply(void 0, [""].concat(t)), {
      position: e
    }) : k.apply(void 0, ["", e].concat(t));
  }
  a(ga, "position");
  function ba(e, r) {
    return r === void 0 && (r = e), {
      height: e,
      width: r
    };
  }
  a(ba, "size");
  var ha = [void 0, null, "active", "focus", "hover"];
  function va(e) {
    return 'input[type="color"]' + e + `,
    input[type="date"]` + e + `,
    input[type="datetime"]` + e + `,
    input[type="datetime-local"]` + e + `,
    input[type="email"]` + e + `,
    input[type="month"]` + e + `,
    input[type="number"]` + e + `,
    input[type="password"]` + e + `,
    input[type="search"]` + e + `,
    input[type="tel"]` + e + `,
    input[type="text"]` + e + `,
    input[type="time"]` + e + `,
    input[type="url"]` + e + `,
    input[type="week"]` + e + `,
    input:not([type])` + e + `,
    textarea` + e;
  }
  a(va, "template");
  function ya() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return rr(r, va, ha);
  }
  a(ya, "textInputs");
  function xa() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    if (Array.isArray(r[0]) && r.length === 2) {
      var n = r[1];
      if (typeof n != "string")
        throw new p(61);
      var o = r[0].map(function(i) {
        return i + " " + n;
      }).join(", ");
      return {
        transition: o
      };
    } else
      return {
        transition: r.join(", ")
      };
  }
  a(xa, "transitions");
  u.adjustHue = ln;
  u.animation = ea;
  u.backgroundImages = ra;
  u.backgrounds = ta;
  u.between = le;
  u.border = aa;
  u.borderColor = oa;
  u.borderRadius = ia;
  u.borderStyle = ua;
  u.borderWidth = sa;
  u.buttons = la;
  u.clearFix = xt;
  u.complement = dn;
  u.cover = wt;
  u.cssVar = Kr;
  u.darken = gn;
  u.desaturate = vn;
  u.directionalProperty = k;
  u.easeIn = gt;
  u.easeInOut = ht;
  u.easeOut = yt;
  u.ellipsis = St;
  u.em = it;
  u.fluidRange = zt;
  u.fontFace = Mt;
  u.getContrast = ge;
  u.getLuminance = _;
  u.getValueAndUnit = A;
  u.grayscale = yn;
  u.hiDPI = _e;
  u.hideText = Pt;
  u.hideVisually = kt;
  u.hsl = ce;
  u.hslToColorString = xn;
  u.hsla = me;
  u.important = Je;
  u.invert = wn;
  u.lighten = Cn;
  u.linearGradient = $t;
  u.margin = da;
  u.math = Xr;
  u.meetsContrastGuidelines = zn;
  u.mix = be;
  u.modularScale = ft;
  u.normalize = Bt;
  u.opacify = Rn;
  u.padding = ca;
  u.parseToHsl = C;
  u.parseToRgb = P;
  u.position = ga;
  u.radialGradient = Lt;
  u.readableColor = jn;
  u.rem = lt;
  u.remToPx = ct;
  u.retinaImage = Ht;
  u.rgb = Y;
  u.rgbToColorString = Mn;
  u.rgba = L;
  u.saturate = $n;
  u.setHue = Hn;
  u.setLightness = qn;
  u.setSaturation = Vn;
  u.shade = Qn;
  u.size = ba;
  u.stripUnit = fe;
  u.textInputs = ya;
  u.timingFunctions = qt;
  u.tint = Zn;
  u.toColorString = F;
  u.transitions = xa;
  u.transparentize = Kn;
  u.triangle = Vt;
  u.wordWrap = Nt;
});

// ../node_modules/@storybook/global/dist/index.js
var ir = S((fo, or) => {
  "use strict";
  var xe = Object.defineProperty, Fa = Object.getOwnPropertyDescriptor, Ca = Object.getOwnPropertyNames, za = Object.prototype.hasOwnProperty,
  Ta = /* @__PURE__ */ a((e, r) => {
    for (var t in r)
      xe(e, t, { get: r[t], enumerable: !0 });
  }, "__export"), Aa = /* @__PURE__ */ a((e, r, t, n) => {
    if (r && typeof r == "object" || typeof r == "function")
      for (let o of Ca(r))
        !za.call(e, o) && o !== t && xe(e, o, { get: /* @__PURE__ */ a(() => r[o], "get"), enumerable: !(n = Fa(r, o)) || n.enumerable });
    return e;
  }, "__copyProps"), Ia = /* @__PURE__ */ a((e) => Aa(xe({}, "__esModule", { value: !0 }), e), "__toCommonJS"), ar = {};
  Ta(ar, {
    global: /* @__PURE__ */ a(() => Oa, "global")
  });
  or.exports = Ia(ar);
  var Oa = (() => {
    let e;
    return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
    e = self : e = {}, e;
  })();
});

// src/theming/create.ts
var ka = {};
br(ka, {
  create: () => Pa,
  themes: () => K
});
module.exports = hr(ka);

// src/theming/base.ts
var tr = ee(he(), 1), g = {
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
}, ve = {
  app: "#F6F9FC",
  bar: g.lightest,
  content: g.lightest,
  preview: g.lightest,
  gridCellSize: 10,
  hoverable: (0, tr.transparentize)(0.9, g.secondary),
  // hover state for items in a list
  // Notification, error, and warning backgrounds
  positive: "#E1FFD4",
  negative: "#FEDED2",
  warning: "#FFF5CF",
  critical: "#FF4400"
}, D = {
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
var wa = {
  base: "dark",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: "#222425",
  appContentBg: "#1B1C1D",
  appPreviewBg: g.lightest,
  appBorderColor: "rgba(255,255,255,.1)",
  appBorderRadius: 4,
  // Fonts
  fontBase: D.fonts.base,
  fontCode: D.fonts.mono,
  // Text colors
  textColor: "#C9CDCF",
  textInverseColor: "#222425",
  textMutedColor: "#798186",
  // Toolbar default and active colors
  barTextColor: g.mediumdark,
  barHoverColor: g.secondary,
  barSelectedColor: g.secondary,
  barBg: "#292C2E",
  // Form colors
  buttonBg: "#222425",
  buttonBorder: "rgba(255,255,255,.1)",
  booleanBg: "#222425",
  booleanSelectedBg: "#2E3438",
  inputBg: "#1B1C1D",
  inputBorder: "rgba(255,255,255,.1)",
  inputTextColor: g.lightest,
  inputBorderRadius: 4
}, nr = wa;

// src/theming/themes/light.ts
var Sa = {
  base: "light",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: ve.app,
  appContentBg: g.lightest,
  appPreviewBg: g.lightest,
  appBorderColor: g.border,
  appBorderRadius: 4,
  // Fonts
  fontBase: D.fonts.base,
  fontCode: D.fonts.mono,
  // Text colors
  textColor: g.darkest,
  textInverseColor: g.lightest,
  textMutedColor: g.dark,
  // Toolbar default and active colors
  barTextColor: g.mediumdark,
  barHoverColor: g.secondary,
  barSelectedColor: g.secondary,
  barBg: g.lightest,
  // Form colors
  buttonBg: ve.app,
  buttonBorder: g.medium,
  booleanBg: g.mediumlight,
  booleanSelectedBg: g.lightest,
  inputBg: g.lightest,
  inputBorder: g.border,
  inputTextColor: g.darkest,
  inputBorderRadius: 4
}, ye = Sa;

// src/theming/utils.ts
var ur = ee(ir(), 1), sr = require("@storybook/core/client-logger"), B = ee(he(), 1);
var { window: we } = ur.global;
var Ra = /* @__PURE__ */ a((e) => typeof e != "string" ? (sr.logger.warn(
  `Color passed to theme object should be a string. Instead ${e}(${typeof e}) was passed.`
), !1) : !0, "isColorString"), ja = /* @__PURE__ */ a((e) => !/(gradient|var|calc)/.test(e), "isValidColorForPolished"), Ma = /* @__PURE__ */ a(
(e, r) => e === "darken" ? (0, B.rgba)(`${(0, B.darken)(1, r)}`, 0.95) : e === "lighten" ? (0, B.rgba)(`${(0, B.lighten)(1, r)}`, 0.95) : r,
"applyPolished"), fr = /* @__PURE__ */ a((e) => (r) => {
  if (!Ra(r) || !ja(r))
    return r;
  try {
    return Ma(e, r);
  } catch {
    return r;
  }
}, "colorFactory"), lo = fr("lighten"), co = fr("darken"), pr = /* @__PURE__ */ a(() => !we || !we.matchMedia ? "light" : we.matchMedia("(pr\
efers-color-scheme: dark)").matches ? "dark" : "light", "getPreferredColorScheme");

// src/theming/create.ts
var K = {
  light: ye,
  dark: nr,
  normal: ye
}, Se = pr(), Pa = /* @__PURE__ */ a((e = { base: Se }, r) => {
  let t = {
    ...K[Se],
    ...K[e.base] || {},
    ...e,
    base: K[e.base] ? e.base : Se
  };
  return {
    ...r,
    ...t,
    barSelectedColor: e.barSelectedColor || t.colorSecondary
  };
}, "create");
