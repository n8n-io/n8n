"use strict";
var oo = Object.create;
var Ve = Object.defineProperty;
var io = Object.getOwnPropertyDescriptor;
var so = Object.getOwnPropertyNames;
var uo = Object.getPrototypeOf, fo = Object.prototype.hasOwnProperty;
var o = (e, r) => Ve(e, "name", { value: r, configurable: !0 });
var k = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports), co = (e, r) => {
  for (var t in r)
    Ve(e, t, { get: r[t], enumerable: !0 });
}, Ht = (e, r, t, n) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let a of so(r))
      !fo.call(e, a) && a !== t && Ve(e, a, { get: () => r[a], enumerable: !(n = io(r, a)) || n.enumerable });
  return e;
};
var W = (e, r, t) => (t = e != null ? oo(uo(e)) : {}, Ht(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  r || !e || !e.__esModule ? Ve(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), lo = (e) => Ht(Ve({}, "__esModule", { value: !0 }), e);

// ../node_modules/react-is/cjs/react-is.production.min.js
var cn = k((_) => {
  "use strict";
  var B = typeof Symbol == "function" && Symbol.for, tt = B ? Symbol.for("react.element") : 60103, nt = B ? Symbol.for("react.portal") : 60106,
  wr = B ? Symbol.for("react.fragment") : 60107, Sr = B ? Symbol.for("react.strict_mode") : 60108, Er = B ? Symbol.for("react.profiler") : 60114,
  Tr = B ? Symbol.for("react.provider") : 60109, Cr = B ? Symbol.for("react.context") : 60110, at = B ? Symbol.for("react.async_mode") : 60111,
  Or = B ? Symbol.for("react.concurrent_mode") : 60111, Rr = B ? Symbol.for("react.forward_ref") : 60112, Ar = B ? Symbol.for("react.suspens\
e") : 60113, To = B ? Symbol.for("react.suspense_list") : 60120, _r = B ? Symbol.for("react.memo") : 60115, Fr = B ? Symbol.for("react.lazy") :
  60116, Co = B ? Symbol.for("react.block") : 60121, Oo = B ? Symbol.for("react.fundamental") : 60117, Ro = B ? Symbol.for("react.responder") :
  60118, Ao = B ? Symbol.for("react.scope") : 60119;
  function V(e) {
    if (typeof e == "object" && e !== null) {
      var r = e.$$typeof;
      switch (r) {
        case tt:
          switch (e = e.type, e) {
            case at:
            case Or:
            case wr:
            case Er:
            case Sr:
            case Ar:
              return e;
            default:
              switch (e = e && e.$$typeof, e) {
                case Cr:
                case Rr:
                case Fr:
                case _r:
                case Tr:
                  return e;
                default:
                  return r;
              }
          }
        case nt:
          return r;
      }
    }
  }
  o(V, "z");
  function fn(e) {
    return V(e) === Or;
  }
  o(fn, "A");
  _.AsyncMode = at;
  _.ConcurrentMode = Or;
  _.ContextConsumer = Cr;
  _.ContextProvider = Tr;
  _.Element = tt;
  _.ForwardRef = Rr;
  _.Fragment = wr;
  _.Lazy = Fr;
  _.Memo = _r;
  _.Portal = nt;
  _.Profiler = Er;
  _.StrictMode = Sr;
  _.Suspense = Ar;
  _.isAsyncMode = function(e) {
    return fn(e) || V(e) === at;
  };
  _.isConcurrentMode = fn;
  _.isContextConsumer = function(e) {
    return V(e) === Cr;
  };
  _.isContextProvider = function(e) {
    return V(e) === Tr;
  };
  _.isElement = function(e) {
    return typeof e == "object" && e !== null && e.$$typeof === tt;
  };
  _.isForwardRef = function(e) {
    return V(e) === Rr;
  };
  _.isFragment = function(e) {
    return V(e) === wr;
  };
  _.isLazy = function(e) {
    return V(e) === Fr;
  };
  _.isMemo = function(e) {
    return V(e) === _r;
  };
  _.isPortal = function(e) {
    return V(e) === nt;
  };
  _.isProfiler = function(e) {
    return V(e) === Er;
  };
  _.isStrictMode = function(e) {
    return V(e) === Sr;
  };
  _.isSuspense = function(e) {
    return V(e) === Ar;
  };
  _.isValidElementType = function(e) {
    return typeof e == "string" || typeof e == "function" || e === wr || e === Or || e === Er || e === Sr || e === Ar || e === To || typeof e ==
    "object" && e !== null && (e.$$typeof === Fr || e.$$typeof === _r || e.$$typeof === Tr || e.$$typeof === Cr || e.$$typeof === Rr || e.$$typeof ===
    Oo || e.$$typeof === Ro || e.$$typeof === Ao || e.$$typeof === Co);
  };
  _.typeOf = V;
});

// ../node_modules/react-is/cjs/react-is.development.js
var ln = k((F) => {
  "use strict";
  process.env.NODE_ENV !== "production" && function() {
    "use strict";
    var e = typeof Symbol == "function" && Symbol.for, r = e ? Symbol.for("react.element") : 60103, t = e ? Symbol.for("react.portal") : 60106,
    n = e ? Symbol.for("react.fragment") : 60107, a = e ? Symbol.for("react.strict_mode") : 60108, i = e ? Symbol.for("react.profiler") : 60114,
    s = e ? Symbol.for("react.provider") : 60109, u = e ? Symbol.for("react.context") : 60110, f = e ? Symbol.for("react.async_mode") : 60111,
    l = e ? Symbol.for("react.concurrent_mode") : 60111, d = e ? Symbol.for("react.forward_ref") : 60112, c = e ? Symbol.for("react.suspense") :
    60113, m = e ? Symbol.for("react.suspense_list") : 60120, T = e ? Symbol.for("react.memo") : 60115, y = e ? Symbol.for("react.lazy") : 60116,
    v = e ? Symbol.for("react.block") : 60121, x = e ? Symbol.for("react.fundamental") : 60117, S = e ? Symbol.for("react.responder") : 60118,
    I = e ? Symbol.for("react.scope") : 60119;
    function M(g) {
      return typeof g == "string" || typeof g == "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
      g === n || g === l || g === i || g === a || g === c || g === m || typeof g == "object" && g !== null && (g.$$typeof === y || g.$$typeof ===
      T || g.$$typeof === s || g.$$typeof === u || g.$$typeof === d || g.$$typeof === x || g.$$typeof === S || g.$$typeof === I || g.$$typeof ===
      v);
    }
    o(M, "isValidElementType");
    function w(g) {
      if (typeof g == "object" && g !== null) {
        var Yr = g.$$typeof;
        switch (Yr) {
          case r:
            var pr = g.type;
            switch (pr) {
              case f:
              case l:
              case n:
              case i:
              case a:
              case c:
                return pr;
              default:
                var jt = pr && pr.$$typeof;
                switch (jt) {
                  case u:
                  case d:
                  case y:
                  case T:
                  case s:
                    return jt;
                  default:
                    return Yr;
                }
            }
          case t:
            return Yr;
        }
      }
    }
    o(w, "typeOf");
    var R = f, C = l, E = u, X = s, ne = r, q = d, le = n, Vr = y, Gr = T, qr = t, Ua = i, Va = a, Ga = c, $t = !1;
    function qa(g) {
      return $t || ($t = !0, console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update you\
r code to use ReactIs.isConcurrentMode() instead. It has the exact same API.")), Dt(g) || w(g) === f;
    }
    o(qa, "isAsyncMode");
    function Dt(g) {
      return w(g) === l;
    }
    o(Dt, "isConcurrentMode");
    function Ya(g) {
      return w(g) === u;
    }
    o(Ya, "isContextConsumer");
    function Ja(g) {
      return w(g) === s;
    }
    o(Ja, "isContextProvider");
    function Ka(g) {
      return typeof g == "object" && g !== null && g.$$typeof === r;
    }
    o(Ka, "isElement");
    function Xa(g) {
      return w(g) === d;
    }
    o(Xa, "isForwardRef");
    function Za(g) {
      return w(g) === n;
    }
    o(Za, "isFragment");
    function Qa(g) {
      return w(g) === y;
    }
    o(Qa, "isLazy");
    function eo(g) {
      return w(g) === T;
    }
    o(eo, "isMemo");
    function ro(g) {
      return w(g) === t;
    }
    o(ro, "isPortal");
    function to(g) {
      return w(g) === i;
    }
    o(to, "isProfiler");
    function no(g) {
      return w(g) === a;
    }
    o(no, "isStrictMode");
    function ao(g) {
      return w(g) === c;
    }
    o(ao, "isSuspense"), F.AsyncMode = R, F.ConcurrentMode = C, F.ContextConsumer = E, F.ContextProvider = X, F.Element = ne, F.ForwardRef =
    q, F.Fragment = le, F.Lazy = Vr, F.Memo = Gr, F.Portal = qr, F.Profiler = Ua, F.StrictMode = Va, F.Suspense = Ga, F.isAsyncMode = qa, F.
    isConcurrentMode = Dt, F.isContextConsumer = Ya, F.isContextProvider = Ja, F.isElement = Ka, F.isForwardRef = Xa, F.isFragment = Za, F.isLazy =
    Qa, F.isMemo = eo, F.isPortal = ro, F.isProfiler = to, F.isStrictMode = no, F.isSuspense = ao, F.isValidElementType = M, F.typeOf = w;
  }();
});

// ../node_modules/react-is/index.js
var dn = k((xc, ot) => {
  "use strict";
  process.env.NODE_ENV === "production" ? ot.exports = cn() : ot.exports = ln();
});

// ../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js
var ut = k((wc, yn) => {
  "use strict";
  var it = dn(), _o = {
    childContextTypes: !0,
    contextType: !0,
    contextTypes: !0,
    defaultProps: !0,
    displayName: !0,
    getDefaultProps: !0,
    getDerivedStateFromError: !0,
    getDerivedStateFromProps: !0,
    mixins: !0,
    propTypes: !0,
    type: !0
  }, Fo = {
    name: !0,
    length: !0,
    prototype: !0,
    caller: !0,
    callee: !0,
    arguments: !0,
    arity: !0
  }, Io = {
    $$typeof: !0,
    render: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0
  }, gn = {
    $$typeof: !0,
    compare: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
    type: !0
  }, st = {};
  st[it.ForwardRef] = Io;
  st[it.Memo] = gn;
  function pn(e) {
    return it.isMemo(e) ? gn : st[e.$$typeof] || _o;
  }
  o(pn, "getStatics");
  var Po = Object.defineProperty, Mo = Object.getOwnPropertyNames, mn = Object.getOwnPropertySymbols, Lo = Object.getOwnPropertyDescriptor, ko = Object.
  getPrototypeOf, hn = Object.prototype;
  function bn(e, r, t) {
    if (typeof r != "string") {
      if (hn) {
        var n = ko(r);
        n && n !== hn && bn(e, n, t);
      }
      var a = Mo(r);
      mn && (a = a.concat(mn(r)));
      for (var i = pn(e), s = pn(r), u = 0; u < a.length; ++u) {
        var f = a[u];
        if (!Fo[f] && !(t && t[f]) && !(s && s[f]) && !(i && i[f])) {
          var l = Lo(r, f);
          try {
            Po(e, f, l);
          } catch {
          }
        }
      }
    }
    return e;
  }
  o(bn, "hoistNonReactStatics");
  yn.exports = bn;
});

// ../node_modules/@babel/runtime/helpers/extends.js
var Lr = k((Gc, ae) => {
  function bt() {
    return ae.exports = bt = Object.assign ? Object.assign.bind() : function(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = arguments[r];
        for (var n in t) ({}).hasOwnProperty.call(t, n) && (e[n] = t[n]);
      }
      return e;
    }, ae.exports.__esModule = !0, ae.exports.default = ae.exports, bt.apply(null, arguments);
  }
  o(bt, "_extends");
  ae.exports = bt, ae.exports.__esModule = !0, ae.exports.default = ae.exports;
});

// ../node_modules/@babel/runtime/helpers/assertThisInitialized.js
var zn = k((Tl, rr) => {
  function ti(e) {
    if (e === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }
  o(ti, "_assertThisInitialized");
  rr.exports = ti, rr.exports.__esModule = !0, rr.exports.default = rr.exports;
});

// ../node_modules/@babel/runtime/helpers/setPrototypeOf.js
var Br = k((Ol, ie) => {
  function yt(e, r) {
    return ie.exports = yt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, n) {
      return t.__proto__ = n, t;
    }, ie.exports.__esModule = !0, ie.exports.default = ie.exports, yt(e, r);
  }
  o(yt, "_setPrototypeOf");
  ie.exports = yt, ie.exports.__esModule = !0, ie.exports.default = ie.exports;
});

// ../node_modules/@babel/runtime/helpers/inheritsLoose.js
var Nn = k((Al, tr) => {
  var ni = Br();
  function ai(e, r) {
    e.prototype = Object.create(r.prototype), e.prototype.constructor = e, ni(e, r);
  }
  o(ai, "_inheritsLoose");
  tr.exports = ai, tr.exports.__esModule = !0, tr.exports.default = tr.exports;
});

// ../node_modules/@babel/runtime/helpers/getPrototypeOf.js
var Bn = k((Fl, se) => {
  function vt(e) {
    return se.exports = vt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(r) {
      return r.__proto__ || Object.getPrototypeOf(r);
    }, se.exports.__esModule = !0, se.exports.default = se.exports, vt(e);
  }
  o(vt, "_getPrototypeOf");
  se.exports = vt, se.exports.__esModule = !0, se.exports.default = se.exports;
});

// ../node_modules/@babel/runtime/helpers/isNativeFunction.js
var $n = k((Pl, nr) => {
  function oi(e) {
    try {
      return Function.toString.call(e).indexOf("[native code]") !== -1;
    } catch {
      return typeof e == "function";
    }
  }
  o(oi, "_isNativeFunction");
  nr.exports = oi, nr.exports.__esModule = !0, nr.exports.default = nr.exports;
});

// ../node_modules/@babel/runtime/helpers/isNativeReflectConstruct.js
var jn = k((Ll, ue) => {
  function Dn() {
    try {
      var e = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
    } catch {
    }
    return (ue.exports = Dn = /* @__PURE__ */ o(function() {
      return !!e;
    }, "_isNativeReflectConstruct"), ue.exports.__esModule = !0, ue.exports.default = ue.exports)();
  }
  o(Dn, "_isNativeReflectConstruct");
  ue.exports = Dn, ue.exports.__esModule = !0, ue.exports.default = ue.exports;
});

// ../node_modules/@babel/runtime/helpers/construct.js
var Hn = k((zl, ar) => {
  var ii = jn(), si = Br();
  function ui(e, r, t) {
    if (ii()) return Reflect.construct.apply(null, arguments);
    var n = [null];
    n.push.apply(n, r);
    var a = new (e.bind.apply(e, n))();
    return t && si(a, t.prototype), a;
  }
  o(ui, "_construct");
  ar.exports = ui, ar.exports.__esModule = !0, ar.exports.default = ar.exports;
});

// ../node_modules/@babel/runtime/helpers/wrapNativeSuper.js
var Wn = k((Bl, fe) => {
  var fi = Bn(), ci = Br(), li = $n(), di = Hn();
  function xt(e) {
    var r = typeof Map == "function" ? /* @__PURE__ */ new Map() : void 0;
    return fe.exports = xt = /* @__PURE__ */ o(function(n) {
      if (n === null || !li(n)) return n;
      if (typeof n != "function") throw new TypeError("Super expression must either be null or a function");
      if (r !== void 0) {
        if (r.has(n)) return r.get(n);
        r.set(n, a);
      }
      function a() {
        return di(n, arguments, fi(this).constructor);
      }
      return o(a, "Wrapper"), a.prototype = Object.create(n.prototype, {
        constructor: {
          value: a,
          enumerable: !1,
          writable: !0,
          configurable: !0
        }
      }), ci(a, n);
    }, "_wrapNativeSuper"), fe.exports.__esModule = !0, fe.exports.default = fe.exports, xt(e);
  }
  o(xt, "_wrapNativeSuper");
  fe.exports = xt, fe.exports.__esModule = !0, fe.exports.default = fe.exports;
});

// ../node_modules/@babel/runtime/helpers/taggedTemplateLiteralLoose.js
var Un = k((Dl, or) => {
  function pi(e, r) {
    return r || (r = e.slice(0)), e.raw = r, e;
  }
  o(pi, "_taggedTemplateLiteralLoose");
  or.exports = pi, or.exports.__esModule = !0, or.exports.default = or.exports;
});

// ../node_modules/polished/dist/polished.cjs.js
var jr = k((p) => {
  "use strict";
  Object.defineProperty(p, "__esModule", { value: !0 });
  var mi = Lr(), hi = zn(), gi = Nn(), bi = Wn(), yi = Un();
  function fr(e) {
    return e && typeof e == "object" && "default" in e ? e : { default: e };
  }
  o(fr, "_interopDefaultLegacy");
  var P = /* @__PURE__ */ fr(mi), vi = /* @__PURE__ */ fr(hi), xi = /* @__PURE__ */ fr(gi), wi = /* @__PURE__ */ fr(bi), aa = /* @__PURE__ */ fr(
  yi);
  function Vn() {
    var e;
    return e = arguments.length - 1, e < 0 || arguments.length <= e ? void 0 : arguments[e];
  }
  o(Vn, "last");
  function Si(e) {
    return -e;
  }
  o(Si, "negation");
  function Ei(e, r) {
    return e + r;
  }
  o(Ei, "addition");
  function Ti(e, r) {
    return e - r;
  }
  o(Ti, "subtraction");
  function Ci(e, r) {
    return e * r;
  }
  o(Ci, "multiplication");
  function Oi(e, r) {
    return e / r;
  }
  o(Oi, "division");
  function Ri() {
    return Math.max.apply(Math, arguments);
  }
  o(Ri, "max");
  function Ai() {
    return Math.min.apply(Math, arguments);
  }
  o(Ai, "min");
  function _i() {
    return Array.of.apply(Array, arguments);
  }
  o(_i, "comma");
  var Fi = {
    symbols: {
      "*": {
        infix: {
          symbol: "*",
          f: Ci,
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
          f: Oi,
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
          f: Ei,
          notation: "infix",
          precedence: 2,
          rightToLeft: 0,
          argCount: 2
        },
        prefix: {
          symbol: "+",
          f: Vn,
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
          f: Ti,
          notation: "infix",
          precedence: 2,
          rightToLeft: 0,
          argCount: 2
        },
        prefix: {
          symbol: "-",
          f: Si,
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
          f: _i,
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
          f: Vn,
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
          f: Ai,
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
          f: Ri,
          notation: "func",
          precedence: 0,
          rightToLeft: 0,
          argCount: 1
        },
        symbol: "max",
        regSymbol: "max\\b"
      }
    }
  }, Gn = Fi, Ii = {
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
  function Pi() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    var n = r[0], a = [], i;
    for (i = 1; i < r.length; i += 1)
      a.push(r[i]);
    return a.forEach(function(s) {
      n = n.replace(/%[a-z]/, s);
    }), n;
  }
  o(Pi, "format");
  var b = /* @__PURE__ */ function(e) {
    xi.default(r, e);
    function r(t) {
      var n;
      if (process.env.NODE_ENV === "production")
        n = e.call(this, "An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#" + t +
        " for more information.") || this;
      else {
        for (var a = arguments.length, i = new Array(a > 1 ? a - 1 : 0), s = 1; s < a; s++)
          i[s - 1] = arguments[s];
        n = e.call(this, Pi.apply(void 0, [Ii[t]].concat(i))) || this;
      }
      return vi.default(n);
    }
    return o(r, "PolishedError"), r;
  }(/* @__PURE__ */ wi.default(Error)), qn = /((?!\w)a|na|hc|mc|dg|me[r]?|xe|ni(?![a-zA-Z])|mm|cp|tp|xp|q(?!s)|hv|xamv|nimv|wv|sm|s(?!\D|$)|ged|darg?|nrut)/g;
  function Mi(e) {
    var r = {};
    return r.symbols = e ? P.default({}, Gn.symbols, e.symbols) : P.default({}, Gn.symbols), r;
  }
  o(Mi, "mergeSymbolMaps");
  function Yn(e, r) {
    var t, n = e.pop();
    return r.push(n.f.apply(n, (t = []).concat.apply(t, r.splice(-n.argCount)))), n.precedence;
  }
  o(Yn, "exec");
  function Li(e, r) {
    var t = Mi(r), n, a = [t.symbols["("].prefix], i = [], s = new RegExp(
      // Pattern for numbers
      "\\d+(?:\\.\\d+)?|" + // ...and patterns for individual operators/function names
      Object.keys(t.symbols).map(function(x) {
        return t.symbols[x];
      }).sort(function(x, S) {
        return S.symbol.length - x.symbol.length;
      }).map(function(x) {
        return x.regSymbol;
      }).join("|") + "|(\\S)",
      "g"
    );
    s.lastIndex = 0;
    var u = !1;
    do {
      n = s.exec(e);
      var f = n || [")", void 0], l = f[0], d = f[1], c = t.symbols[l], m = c && !c.prefix && !c.func, T = !c || !c.postfix && !c.infix;
      if (d || (u ? T : m))
        throw new b(37, n ? n.index : e.length, e);
      if (u) {
        var y = c.postfix || c.infix;
        do {
          var v = a[a.length - 1];
          if ((y.precedence - v.precedence || v.rightToLeft) > 0) break;
        } while (Yn(a, i));
        u = y.notation === "postfix", y.symbol !== ")" && (a.push(y), u && Yn(a, i));
      } else if (c) {
        if (a.push(c.prefix || c.func), c.func && (n = s.exec(e), !n || n[0] !== "("))
          throw new b(38, n ? n.index : e.length, e);
      } else
        i.push(+l), u = !0;
    } while (n && a.length);
    if (a.length)
      throw new b(39, n ? n.index : e.length, e);
    if (n)
      throw new b(40, n ? n.index : e.length, e);
    return i.pop();
  }
  o(Li, "calculate");
  function wt(e) {
    return e.split("").reverse().join("");
  }
  o(wt, "reverseString");
  function ki(e, r) {
    var t = wt(e), n = t.match(qn);
    if (n && !n.every(function(i) {
      return i === n[0];
    }))
      throw new b(41);
    var a = wt(t.replace(qn, ""));
    return "" + Li(a, r) + (n ? wt(n[0]) : "");
  }
  o(ki, "math");
  var zi = /--[\S]*/g;
  function Ni(e, r) {
    if (!e || !e.match(zi))
      throw new b(73);
    var t;
    if (typeof document < "u" && document.documentElement !== null && (t = getComputedStyle(document.documentElement).getPropertyValue(e)), t)
      return t.trim();
    if (r)
      return r;
    throw new b(74);
  }
  o(Ni, "cssVar");
  function ir(e) {
    return e.charAt(0).toUpperCase() + e.slice(1);
  }
  o(ir, "capitalizeString");
  var Bi = ["Top", "Right", "Bottom", "Left"];
  function $i(e, r) {
    if (!e) return r.toLowerCase();
    var t = e.split("-");
    if (t.length > 1)
      return t.splice(1, 0, r), t.reduce(function(a, i) {
        return "" + a + ir(i);
      });
    var n = e.replace(/([a-z])([A-Z])/g, "$1" + r + "$2");
    return e === n ? "" + e + r : n;
  }
  o($i, "generateProperty");
  function Di(e, r) {
    for (var t = {}, n = 0; n < r.length; n += 1)
      (r[n] || r[n] === 0) && (t[$i(e, Bi[n])] = r[n]);
    return t;
  }
  o(Di, "generateStyles");
  function ge(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    var a = t[0], i = t[1], s = i === void 0 ? a : i, u = t[2], f = u === void 0 ? a : u, l = t[3], d = l === void 0 ? s : l, c = [a, s, f, d];
    return Di(e, c);
  }
  o(ge, "directionalProperty");
  function Jn(e, r) {
    return e.substr(-r.length) === r;
  }
  o(Jn, "endsWith");
  var ji = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;
  function Ct(e) {
    if (typeof e != "string") return e;
    var r = e.match(ji);
    return r ? parseFloat(e) : e;
  }
  o(Ct, "stripUnit");
  var Hi = /* @__PURE__ */ o(function(r) {
    return function(t, n) {
      n === void 0 && (n = "16px");
      var a = t, i = n;
      if (typeof t == "string") {
        if (!Jn(t, "px"))
          throw new b(69, r, t);
        a = Ct(t);
      }
      if (typeof n == "string") {
        if (!Jn(n, "px"))
          throw new b(70, r, n);
        i = Ct(n);
      }
      if (typeof a == "string")
        throw new b(71, t, r);
      if (typeof i == "string")
        throw new b(72, n, r);
      return "" + a / i + r;
    };
  }, "pxtoFactory"), oa = Hi, Wi = /* @__PURE__ */ oa("em"), Ui = Wi, Vi = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;
  function te(e) {
    if (typeof e != "string") return [e, ""];
    var r = e.match(Vi);
    return r ? [parseFloat(e), r[2]] : [e, void 0];
  }
  o(te, "getValueAndUnit");
  function ia(e, r) {
    if (typeof e != "object" || e === null)
      throw new b(75, typeof e);
    var t = {};
    return Object.keys(e).forEach(function(n) {
      typeof e[n] == "object" && e[n] !== null ? t[n] = ia(e[n], r) : !r || r && (r === n || r.indexOf(n) >= 0) ? t[n] = e[n] + " !important" :
      t[n] = e[n];
    }), t;
  }
  o(ia, "important");
  var sa = {
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
  function Gi(e) {
    return sa[e];
  }
  o(Gi, "getRatio");
  function qi(e, r, t) {
    if (r === void 0 && (r = "1em"), t === void 0 && (t = 1.333), typeof e != "number")
      throw new b(42);
    if (typeof t == "string" && !sa[t])
      throw new b(43);
    var n = typeof r == "string" ? te(r) : [r, ""], a = n[0], i = n[1], s = typeof t == "string" ? Gi(t) : t;
    if (typeof a == "string")
      throw new b(44, r);
    return "" + a * Math.pow(s, e) + (i || "");
  }
  o(qi, "modularScale");
  var Yi = /* @__PURE__ */ oa("rem"), Ji = Yi, Ot = 16;
  function ua(e) {
    var r = te(e);
    if (r[1] === "px")
      return parseFloat(e);
    if (r[1] === "%")
      return parseFloat(e) / 100 * Ot;
    throw new b(78, r[1]);
  }
  o(ua, "convertBase");
  function Ki() {
    if (typeof document < "u" && document.documentElement !== null) {
      var e = getComputedStyle(document.documentElement).fontSize;
      return e ? ua(e) : Ot;
    }
    return Ot;
  }
  o(Ki, "getBaseFromDoc");
  function Xi(e, r) {
    var t = te(e);
    if (t[1] !== "rem" && t[1] !== "")
      throw new b(77, t[1]);
    var n = r ? ua(r) : Ki();
    return t[0] * n + "px";
  }
  o(Xi, "remToPx");
  var Zi = {
    back: "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
    circ: "cubic-bezier(0.600,  0.040, 0.980, 0.335)",
    cubic: "cubic-bezier(0.550,  0.055, 0.675, 0.190)",
    expo: "cubic-bezier(0.950,  0.050, 0.795, 0.035)",
    quad: "cubic-bezier(0.550,  0.085, 0.680, 0.530)",
    quart: "cubic-bezier(0.895,  0.030, 0.685, 0.220)",
    quint: "cubic-bezier(0.755,  0.050, 0.855, 0.060)",
    sine: "cubic-bezier(0.470,  0.000, 0.745, 0.715)"
  };
  function Qi(e) {
    return Zi[e.toLowerCase().trim()];
  }
  o(Qi, "easeIn");
  var es = {
    back: "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
    circ: "cubic-bezier(0.785,  0.135, 0.150, 0.860)",
    cubic: "cubic-bezier(0.645,  0.045, 0.355, 1.000)",
    expo: "cubic-bezier(1.000,  0.000, 0.000, 1.000)",
    quad: "cubic-bezier(0.455,  0.030, 0.515, 0.955)",
    quart: "cubic-bezier(0.770,  0.000, 0.175, 1.000)",
    quint: "cubic-bezier(0.860,  0.000, 0.070, 1.000)",
    sine: "cubic-bezier(0.445,  0.050, 0.550, 0.950)"
  };
  function rs(e) {
    return es[e.toLowerCase().trim()];
  }
  o(rs, "easeInOut");
  var ts = {
    back: "cubic-bezier(0.175,  0.885, 0.320, 1.275)",
    cubic: "cubic-bezier(0.215,  0.610, 0.355, 1.000)",
    circ: "cubic-bezier(0.075,  0.820, 0.165, 1.000)",
    expo: "cubic-bezier(0.190,  1.000, 0.220, 1.000)",
    quad: "cubic-bezier(0.250,  0.460, 0.450, 0.940)",
    quart: "cubic-bezier(0.165,  0.840, 0.440, 1.000)",
    quint: "cubic-bezier(0.230,  1.000, 0.320, 1.000)",
    sine: "cubic-bezier(0.390,  0.575, 0.565, 1.000)"
  };
  function ns(e) {
    return ts[e.toLowerCase().trim()];
  }
  o(ns, "easeOut");
  function Rt(e, r, t, n) {
    t === void 0 && (t = "320px"), n === void 0 && (n = "1200px");
    var a = te(e), i = a[0], s = a[1], u = te(r), f = u[0], l = u[1], d = te(t), c = d[0], m = d[1], T = te(n), y = T[0], v = T[1];
    if (typeof c != "number" || typeof y != "number" || !m || !v || m !== v)
      throw new b(47);
    if (typeof i != "number" || typeof f != "number" || s !== l)
      throw new b(48);
    if (s !== m || l !== v)
      throw new b(76);
    var x = (i - f) / (c - y), S = f - x * y;
    return "calc(" + S.toFixed(2) + (s || "") + " + " + (100 * x).toFixed(2) + "vw)";
  }
  o(Rt, "between");
  function as(e) {
    var r;
    e === void 0 && (e = "&");
    var t = e + "::after";
    return r = {}, r[t] = {
      clear: "both",
      content: '""',
      display: "table"
    }, r;
  }
  o(as, "clearFix");
  function os(e) {
    return e === void 0 && (e = 0), {
      position: "absolute",
      top: e,
      right: e,
      bottom: e,
      left: e
    };
  }
  o(os, "cover");
  function is(e, r) {
    r === void 0 && (r = 1);
    var t = {
      display: "inline-block",
      maxWidth: e || "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      wordWrap: "normal"
    };
    return r > 1 ? P.default({}, t, {
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: r,
      display: "-webkit-box",
      whiteSpace: "normal"
    }) : t;
  }
  o(is, "ellipsis");
  function ss(e, r) {
    var t = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
    if (t) return (t = t.call(e)).next.bind(t);
    if (Array.isArray(e) || (t = us(e)) || r && e && typeof e.length == "number") {
      t && (e = t);
      var n = 0;
      return function() {
        return n >= e.length ? { done: !0 } : { done: !1, value: e[n++] };
      };
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  o(ss, "_createForOfIteratorHelperLoose");
  function us(e, r) {
    if (e) {
      if (typeof e == "string") return Kn(e, r);
      var t = Object.prototype.toString.call(e).slice(8, -1);
      if (t === "Object" && e.constructor && (t = e.constructor.name), t === "Map" || t === "Set") return Array.from(e);
      if (t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)) return Kn(e, r);
    }
  }
  o(us, "_unsupportedIterableToArray");
  function Kn(e, r) {
    (r == null || r > e.length) && (r = e.length);
    for (var t = 0, n = new Array(r); t < r; t++)
      n[t] = e[t];
    return n;
  }
  o(Kn, "_arrayLikeToArray");
  function fs(e, r, t) {
    if (r === void 0 && (r = "320px"), t === void 0 && (t = "1200px"), !Array.isArray(e) && typeof e != "object" || e === null)
      throw new b(49);
    if (Array.isArray(e)) {
      for (var n = {}, a = {}, i = ss(e), s; !(s = i()).done; ) {
        var u, f, l = s.value;
        if (!l.prop || !l.fromSize || !l.toSize)
          throw new b(50);
        a[l.prop] = l.fromSize, n["@media (min-width: " + r + ")"] = P.default({}, n["@media (min-width: " + r + ")"], (u = {}, u[l.prop] = Rt(
        l.fromSize, l.toSize, r, t), u)), n["@media (min-width: " + t + ")"] = P.default({}, n["@media (min-width: " + t + ")"], (f = {}, f[l.
        prop] = l.toSize, f));
      }
      return P.default({}, a, n);
    } else {
      var d, c, m;
      if (!e.prop || !e.fromSize || !e.toSize)
        throw new b(51);
      return m = {}, m[e.prop] = e.fromSize, m["@media (min-width: " + r + ")"] = (d = {}, d[e.prop] = Rt(e.fromSize, e.toSize, r, t), d), m["\
@media (min-width: " + t + ")"] = (c = {}, c[e.prop] = e.toSize, c), m;
    }
  }
  o(fs, "fluidRange");
  var cs = /^\s*data:([a-z]+\/[a-z-]+(;[a-z-]+=[a-z-]+)?)?(;charset=[a-z0-9-]+)?(;base64)?,[a-z0-9!$&',()*+,;=\-._~:@/?%\s]*\s*$/i, ls = {
    woff: "woff",
    woff2: "woff2",
    ttf: "truetype",
    otf: "opentype",
    eot: "embedded-opentype",
    svg: "svg",
    svgz: "svg"
  };
  function Xn(e, r) {
    return r ? ' format("' + ls[e] + '")' : "";
  }
  o(Xn, "generateFormatHint");
  function ds(e) {
    return !!e.replace(/\s+/g, " ").match(cs);
  }
  o(ds, "isDataURI");
  function ps(e, r, t) {
    if (ds(e))
      return 'url("' + e + '")' + Xn(r[0], t);
    var n = r.map(function(a) {
      return 'url("' + e + "." + a + '")' + Xn(a, t);
    });
    return n.join(", ");
  }
  o(ps, "generateFileReferences");
  function ms(e) {
    var r = e.map(function(t) {
      return 'local("' + t + '")';
    });
    return r.join(", ");
  }
  o(ms, "generateLocalReferences");
  function hs(e, r, t, n) {
    var a = [];
    return r && a.push(ms(r)), e && a.push(ps(e, t, n)), a.join(", ");
  }
  o(hs, "generateSources");
  function gs(e) {
    var r = e.fontFamily, t = e.fontFilePath, n = e.fontStretch, a = e.fontStyle, i = e.fontVariant, s = e.fontWeight, u = e.fileFormats, f = u ===
    void 0 ? ["eot", "woff2", "woff", "ttf", "svg"] : u, l = e.formatHint, d = l === void 0 ? !1 : l, c = e.localFonts, m = c === void 0 ? [
    r] : c, T = e.unicodeRange, y = e.fontDisplay, v = e.fontVariationSettings, x = e.fontFeatureSettings;
    if (!r) throw new b(55);
    if (!t && !m)
      throw new b(52);
    if (m && !Array.isArray(m))
      throw new b(53);
    if (!Array.isArray(f))
      throw new b(54);
    var S = {
      "@font-face": {
        fontFamily: r,
        src: hs(t, m, f, d),
        unicodeRange: T,
        fontStretch: n,
        fontStyle: a,
        fontVariant: i,
        fontWeight: s,
        fontDisplay: y,
        fontVariationSettings: v,
        fontFeatureSettings: x
      }
    };
    return JSON.parse(JSON.stringify(S));
  }
  o(gs, "fontFace");
  function bs() {
    return {
      textIndent: "101%",
      overflow: "hidden",
      whiteSpace: "nowrap"
    };
  }
  o(bs, "hideText");
  function ys() {
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
  o(ys, "hideVisually");
  function fa(e) {
    return e === void 0 && (e = 1.3), `
    @media only screen and (-webkit-min-device-pixel-ratio: ` + e + `),
    only screen and (min--moz-device-pixel-ratio: ` + e + `),
    only screen and (-o-min-device-pixel-ratio: ` + e + `/1),
    only screen and (min-resolution: ` + Math.round(e * 96) + `dpi),
    only screen and (min-resolution: ` + e + `dppx)
  `;
  }
  o(fa, "hiDPI");
  function ca(e) {
    for (var r = "", t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), a = 1; a < t; a++)
      n[a - 1] = arguments[a];
    for (var i = 0; i < e.length; i += 1)
      if (r += e[i], i === n.length - 1 && n[i]) {
        var s = n.filter(function(u) {
          return !!u;
        });
        s.length > 1 ? (r = r.slice(0, -1), r += ", " + n[i]) : s.length === 1 && (r += "" + n[i]);
      } else n[i] && (r += n[i] + " ");
    return r.trim();
  }
  o(ca, "constructGradientValue");
  var Zn;
  function vs(e) {
    var r = e.colorStops, t = e.fallback, n = e.toDirection, a = n === void 0 ? "" : n;
    if (!r || r.length < 2)
      throw new b(56);
    return {
      backgroundColor: t || r[0].replace(/,\s+/g, ",").split(" ")[0].replace(/,(?=\S)/g, ", "),
      backgroundImage: ca(Zn || (Zn = aa.default(["linear-gradient(", "", ")"])), a, r.join(", ").replace(/,(?=\S)/g, ", "))
    };
  }
  o(vs, "linearGradient");
  function xs() {
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
  o(xs, "normalize");
  var Qn;
  function ws(e) {
    var r = e.colorStops, t = e.extent, n = t === void 0 ? "" : t, a = e.fallback, i = e.position, s = i === void 0 ? "" : i, u = e.shape, f = u ===
    void 0 ? "" : u;
    if (!r || r.length < 2)
      throw new b(57);
    return {
      backgroundColor: a || r[0].split(" ")[0],
      backgroundImage: ca(Qn || (Qn = aa.default(["radial-gradient(", "", "", "", ")"])), s, f, n, r.join(", "))
    };
  }
  o(ws, "radialGradient");
  function Ss(e, r, t, n, a) {
    var i;
    if (t === void 0 && (t = "png"), a === void 0 && (a = "_2x"), !e)
      throw new b(58);
    var s = t.replace(/^\./, ""), u = n ? n + "." + s : "" + e + a + "." + s;
    return i = {
      backgroundImage: "url(" + e + "." + s + ")"
    }, i[fa()] = P.default({
      backgroundImage: "url(" + u + ")"
    }, r ? {
      backgroundSize: r
    } : {}), i;
  }
  o(Ss, "retinaImage");
  var Es = {
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
  function Ts(e) {
    return Es[e];
  }
  o(Ts, "getTimingFunction");
  function Cs(e) {
    return Ts(e);
  }
  o(Cs, "timingFunctions");
  var Os = /* @__PURE__ */ o(function(r, t, n) {
    var a = "" + n[0] + (n[1] || ""), i = "" + n[0] / 2 + (n[1] || ""), s = "" + t[0] + (t[1] || ""), u = "" + t[0] / 2 + (t[1] || "");
    switch (r) {
      case "top":
        return "0 " + i + " " + s + " " + i;
      case "topLeft":
        return a + " " + s + " 0 0";
      case "left":
        return u + " " + a + " " + u + " 0";
      case "bottomLeft":
        return a + " 0 0 " + s;
      case "bottom":
        return s + " " + i + " 0 " + i;
      case "bottomRight":
        return "0 0 " + a + " " + s;
      case "right":
        return u + " 0 " + u + " " + a;
      case "topRight":
      default:
        return "0 " + a + " " + s + " 0";
    }
  }, "getBorderWidth"), Rs = /* @__PURE__ */ o(function(r, t) {
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
        throw new b(59);
    }
  }, "getBorderColor");
  function As(e) {
    var r = e.pointingDirection, t = e.height, n = e.width, a = e.foregroundColor, i = e.backgroundColor, s = i === void 0 ? "transparent" :
    i, u = te(n), f = te(t);
    if (isNaN(f[0]) || isNaN(u[0]))
      throw new b(60);
    return P.default({
      width: "0",
      height: "0",
      borderColor: s
    }, Rs(r, a), {
      borderStyle: "solid",
      borderWidth: Os(r, f, u)
    });
  }
  o(As, "triangle");
  function _s(e) {
    e === void 0 && (e = "break-word");
    var r = e === "break-word" ? "break-all" : e;
    return {
      overflowWrap: e,
      wordWrap: e,
      wordBreak: r
    };
  }
  o(_s, "wordWrap");
  function St(e) {
    return Math.round(e * 255);
  }
  o(St, "colorToInt");
  function Fs(e, r, t) {
    return St(e) + "," + St(r) + "," + St(t);
  }
  o(Fs, "convertToInt");
  function sr(e, r, t, n) {
    if (n === void 0 && (n = Fs), r === 0)
      return n(t, t, t);
    var a = (e % 360 + 360) % 360 / 60, i = (1 - Math.abs(2 * t - 1)) * r, s = i * (1 - Math.abs(a % 2 - 1)), u = 0, f = 0, l = 0;
    a >= 0 && a < 1 ? (u = i, f = s) : a >= 1 && a < 2 ? (u = s, f = i) : a >= 2 && a < 3 ? (f = i, l = s) : a >= 3 && a < 4 ? (f = s, l = i) :
    a >= 4 && a < 5 ? (u = s, l = i) : a >= 5 && a < 6 && (u = i, l = s);
    var d = t - i / 2, c = u + d, m = f + d, T = l + d;
    return n(c, m, T);
  }
  o(sr, "hslToRgb");
  var ea = {
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
  function Is(e) {
    if (typeof e != "string") return e;
    var r = e.toLowerCase();
    return ea[r] ? "#" + ea[r] : e;
  }
  o(Is, "nameToHex");
  var Ps = /^#[a-fA-F0-9]{6}$/, Ms = /^#[a-fA-F0-9]{8}$/, Ls = /^#[a-fA-F0-9]{3}$/, ks = /^#[a-fA-F0-9]{4}$/, Et = /^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i,
  zs = /^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i, Ns = /^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i,
  Bs = /^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;
  function ce(e) {
    if (typeof e != "string")
      throw new b(3);
    var r = Is(e);
    if (r.match(Ps))
      return {
        red: parseInt("" + r[1] + r[2], 16),
        green: parseInt("" + r[3] + r[4], 16),
        blue: parseInt("" + r[5] + r[6], 16)
      };
    if (r.match(Ms)) {
      var t = parseFloat((parseInt("" + r[7] + r[8], 16) / 255).toFixed(2));
      return {
        red: parseInt("" + r[1] + r[2], 16),
        green: parseInt("" + r[3] + r[4], 16),
        blue: parseInt("" + r[5] + r[6], 16),
        alpha: t
      };
    }
    if (r.match(Ls))
      return {
        red: parseInt("" + r[1] + r[1], 16),
        green: parseInt("" + r[2] + r[2], 16),
        blue: parseInt("" + r[3] + r[3], 16)
      };
    if (r.match(ks)) {
      var n = parseFloat((parseInt("" + r[4] + r[4], 16) / 255).toFixed(2));
      return {
        red: parseInt("" + r[1] + r[1], 16),
        green: parseInt("" + r[2] + r[2], 16),
        blue: parseInt("" + r[3] + r[3], 16),
        alpha: n
      };
    }
    var a = Et.exec(r);
    if (a)
      return {
        red: parseInt("" + a[1], 10),
        green: parseInt("" + a[2], 10),
        blue: parseInt("" + a[3], 10)
      };
    var i = zs.exec(r.substring(0, 50));
    if (i)
      return {
        red: parseInt("" + i[1], 10),
        green: parseInt("" + i[2], 10),
        blue: parseInt("" + i[3], 10),
        alpha: parseFloat("" + i[4]) > 1 ? parseFloat("" + i[4]) / 100 : parseFloat("" + i[4])
      };
    var s = Ns.exec(r);
    if (s) {
      var u = parseInt("" + s[1], 10), f = parseInt("" + s[2], 10) / 100, l = parseInt("" + s[3], 10) / 100, d = "rgb(" + sr(u, f, l) + ")",
      c = Et.exec(d);
      if (!c)
        throw new b(4, r, d);
      return {
        red: parseInt("" + c[1], 10),
        green: parseInt("" + c[2], 10),
        blue: parseInt("" + c[3], 10)
      };
    }
    var m = Bs.exec(r.substring(0, 50));
    if (m) {
      var T = parseInt("" + m[1], 10), y = parseInt("" + m[2], 10) / 100, v = parseInt("" + m[3], 10) / 100, x = "rgb(" + sr(T, y, v) + ")",
      S = Et.exec(x);
      if (!S)
        throw new b(4, r, x);
      return {
        red: parseInt("" + S[1], 10),
        green: parseInt("" + S[2], 10),
        blue: parseInt("" + S[3], 10),
        alpha: parseFloat("" + m[4]) > 1 ? parseFloat("" + m[4]) / 100 : parseFloat("" + m[4])
      };
    }
    throw new b(5);
  }
  o(ce, "parseToRgb");
  function $s(e) {
    var r = e.red / 255, t = e.green / 255, n = e.blue / 255, a = Math.max(r, t, n), i = Math.min(r, t, n), s = (a + i) / 2;
    if (a === i)
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
    var u, f = a - i, l = s > 0.5 ? f / (2 - a - i) : f / (a + i);
    switch (a) {
      case r:
        u = (t - n) / f + (t < n ? 6 : 0);
        break;
      case t:
        u = (n - r) / f + 2;
        break;
      default:
        u = (r - t) / f + 4;
        break;
    }
    return u *= 60, e.alpha !== void 0 ? {
      hue: u,
      saturation: l,
      lightness: s,
      alpha: e.alpha
    } : {
      hue: u,
      saturation: l,
      lightness: s
    };
  }
  o($s, "rgbToHsl");
  function Q(e) {
    return $s(ce(e));
  }
  o(Q, "parseToHsl");
  var Ds = /* @__PURE__ */ o(function(r) {
    return r.length === 7 && r[1] === r[2] && r[3] === r[4] && r[5] === r[6] ? "#" + r[1] + r[3] + r[5] : r;
  }, "reduceHexValue"), At = Ds;
  function Te(e) {
    var r = e.toString(16);
    return r.length === 1 ? "0" + r : r;
  }
  o(Te, "numberToHex");
  function Tt(e) {
    return Te(Math.round(e * 255));
  }
  o(Tt, "colorToHex");
  function js(e, r, t) {
    return At("#" + Tt(e) + Tt(r) + Tt(t));
  }
  o(js, "convertToHex");
  function $r(e, r, t) {
    return sr(e, r, t, js);
  }
  o($r, "hslToHex");
  function _t(e, r, t) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number")
      return $r(e, r, t);
    if (typeof e == "object" && r === void 0 && t === void 0)
      return $r(e.hue, e.saturation, e.lightness);
    throw new b(1);
  }
  o(_t, "hsl");
  function Ft(e, r, t, n) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number" && typeof n == "number")
      return n >= 1 ? $r(e, r, t) : "rgba(" + sr(e, r, t) + "," + n + ")";
    if (typeof e == "object" && r === void 0 && t === void 0 && n === void 0)
      return e.alpha >= 1 ? $r(e.hue, e.saturation, e.lightness) : "rgba(" + sr(e.hue, e.saturation, e.lightness) + "," + e.alpha + ")";
    throw new b(2);
  }
  o(Ft, "hsla");
  function ur(e, r, t) {
    if (typeof e == "number" && typeof r == "number" && typeof t == "number")
      return At("#" + Te(e) + Te(r) + Te(t));
    if (typeof e == "object" && r === void 0 && t === void 0)
      return At("#" + Te(e.red) + Te(e.green) + Te(e.blue));
    throw new b(6);
  }
  o(ur, "rgb");
  function je(e, r, t, n) {
    if (typeof e == "string" && typeof r == "number") {
      var a = ce(e);
      return "rgba(" + a.red + "," + a.green + "," + a.blue + "," + r + ")";
    } else {
      if (typeof e == "number" && typeof r == "number" && typeof t == "number" && typeof n == "number")
        return n >= 1 ? ur(e, r, t) : "rgba(" + e + "," + r + "," + t + "," + n + ")";
      if (typeof e == "object" && r === void 0 && t === void 0 && n === void 0)
        return e.alpha >= 1 ? ur(e.red, e.green, e.blue) : "rgba(" + e.red + "," + e.green + "," + e.blue + "," + e.alpha + ")";
    }
    throw new b(7);
  }
  o(je, "rgba");
  var Hs = /* @__PURE__ */ o(function(r) {
    return typeof r.red == "number" && typeof r.green == "number" && typeof r.blue == "number" && (typeof r.alpha != "number" || typeof r.alpha >
    "u");
  }, "isRgb"), Ws = /* @__PURE__ */ o(function(r) {
    return typeof r.red == "number" && typeof r.green == "number" && typeof r.blue == "number" && typeof r.alpha == "number";
  }, "isRgba"), Us = /* @__PURE__ */ o(function(r) {
    return typeof r.hue == "number" && typeof r.saturation == "number" && typeof r.lightness == "number" && (typeof r.alpha != "number" || typeof r.
    alpha > "u");
  }, "isHsl"), Vs = /* @__PURE__ */ o(function(r) {
    return typeof r.hue == "number" && typeof r.saturation == "number" && typeof r.lightness == "number" && typeof r.alpha == "number";
  }, "isHsla");
  function J(e) {
    if (typeof e != "object") throw new b(8);
    if (Ws(e)) return je(e);
    if (Hs(e)) return ur(e);
    if (Vs(e)) return Ft(e);
    if (Us(e)) return _t(e);
    throw new b(8);
  }
  o(J, "toColorString");
  function la(e, r, t) {
    return /* @__PURE__ */ o(function() {
      var a = t.concat(Array.prototype.slice.call(arguments));
      return a.length >= r ? e.apply(this, a) : la(e, r, a);
    }, "fn");
  }
  o(la, "curried");
  function G(e) {
    return la(e, e.length, []);
  }
  o(G, "curry");
  function Gs(e, r) {
    if (r === "transparent") return r;
    var t = Q(r);
    return J(P.default({}, t, {
      hue: t.hue + parseFloat(e)
    }));
  }
  o(Gs, "adjustHue");
  var qs = /* @__PURE__ */ G(Gs), Ys = qs;
  function Js(e) {
    if (e === "transparent") return e;
    var r = Q(e);
    return J(P.default({}, r, {
      hue: (r.hue + 180) % 360
    }));
  }
  o(Js, "complement");
  function He(e, r, t) {
    return Math.max(e, Math.min(r, t));
  }
  o(He, "guard");
  function Ks(e, r) {
    if (r === "transparent") return r;
    var t = Q(r);
    return J(P.default({}, t, {
      lightness: He(0, 1, t.lightness - parseFloat(e))
    }));
  }
  o(Ks, "darken");
  var Xs = /* @__PURE__ */ G(Ks), Zs = Xs;
  function Qs(e, r) {
    if (r === "transparent") return r;
    var t = Q(r);
    return J(P.default({}, t, {
      saturation: He(0, 1, t.saturation - parseFloat(e))
    }));
  }
  o(Qs, "desaturate");
  var eu = /* @__PURE__ */ G(Qs), ru = eu;
  function Dr(e) {
    if (e === "transparent") return 0;
    var r = ce(e), t = Object.keys(r).map(function(s) {
      var u = r[s] / 255;
      return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
    }), n = t[0], a = t[1], i = t[2];
    return parseFloat((0.2126 * n + 0.7152 * a + 0.0722 * i).toFixed(3));
  }
  o(Dr, "getLuminance");
  function It(e, r) {
    var t = Dr(e), n = Dr(r);
    return parseFloat((t > n ? (t + 0.05) / (n + 0.05) : (n + 0.05) / (t + 0.05)).toFixed(2));
  }
  o(It, "getContrast");
  function tu(e) {
    return e === "transparent" ? e : J(P.default({}, Q(e), {
      saturation: 0
    }));
  }
  o(tu, "grayscale");
  function nu(e) {
    if (typeof e == "object" && typeof e.hue == "number" && typeof e.saturation == "number" && typeof e.lightness == "number")
      return e.alpha && typeof e.alpha == "number" ? Ft({
        hue: e.hue,
        saturation: e.saturation,
        lightness: e.lightness,
        alpha: e.alpha
      }) : _t({
        hue: e.hue,
        saturation: e.saturation,
        lightness: e.lightness
      });
    throw new b(45);
  }
  o(nu, "hslToColorString");
  function au(e) {
    if (e === "transparent") return e;
    var r = ce(e);
    return J(P.default({}, r, {
      red: 255 - r.red,
      green: 255 - r.green,
      blue: 255 - r.blue
    }));
  }
  o(au, "invert");
  function ou(e, r) {
    if (r === "transparent") return r;
    var t = Q(r);
    return J(P.default({}, t, {
      lightness: He(0, 1, t.lightness + parseFloat(e))
    }));
  }
  o(ou, "lighten");
  var iu = /* @__PURE__ */ G(ou), su = iu;
  function uu(e, r) {
    var t = It(e, r);
    return {
      AA: t >= 4.5,
      AALarge: t >= 3,
      AAA: t >= 7,
      AAALarge: t >= 4.5
    };
  }
  o(uu, "meetsContrastGuidelines");
  function fu(e, r, t) {
    if (r === "transparent") return t;
    if (t === "transparent") return r;
    if (e === 0) return t;
    var n = ce(r), a = P.default({}, n, {
      alpha: typeof n.alpha == "number" ? n.alpha : 1
    }), i = ce(t), s = P.default({}, i, {
      alpha: typeof i.alpha == "number" ? i.alpha : 1
    }), u = a.alpha - s.alpha, f = parseFloat(e) * 2 - 1, l = f * u === -1 ? f : f + u, d = 1 + f * u, c = (l / d + 1) / 2, m = 1 - c, T = {
      red: Math.floor(a.red * c + s.red * m),
      green: Math.floor(a.green * c + s.green * m),
      blue: Math.floor(a.blue * c + s.blue * m),
      alpha: a.alpha * parseFloat(e) + s.alpha * (1 - parseFloat(e))
    };
    return je(T);
  }
  o(fu, "mix");
  var cu = /* @__PURE__ */ G(fu), Pt = cu;
  function lu(e, r) {
    if (r === "transparent") return r;
    var t = ce(r), n = typeof t.alpha == "number" ? t.alpha : 1, a = P.default({}, t, {
      alpha: He(0, 1, (n * 100 + parseFloat(e) * 100) / 100)
    });
    return je(a);
  }
  o(lu, "opacify");
  var du = /* @__PURE__ */ G(lu), pu = du, ra = "#000", ta = "#fff";
  function mu(e, r, t, n) {
    r === void 0 && (r = ra), t === void 0 && (t = ta), n === void 0 && (n = !0);
    var a = Dr(e) > 0.179, i = a ? r : t;
    return !n || It(e, i) >= 4.5 ? i : a ? ra : ta;
  }
  o(mu, "readableColor");
  function hu(e) {
    if (typeof e == "object" && typeof e.red == "number" && typeof e.green == "number" && typeof e.blue == "number")
      return typeof e.alpha == "number" ? je({
        red: e.red,
        green: e.green,
        blue: e.blue,
        alpha: e.alpha
      }) : ur({
        red: e.red,
        green: e.green,
        blue: e.blue
      });
    throw new b(46);
  }
  o(hu, "rgbToColorString");
  function gu(e, r) {
    if (r === "transparent") return r;
    var t = Q(r);
    return J(P.default({}, t, {
      saturation: He(0, 1, t.saturation + parseFloat(e))
    }));
  }
  o(gu, "saturate");
  var bu = /* @__PURE__ */ G(gu), yu = bu;
  function vu(e, r) {
    return r === "transparent" ? r : J(P.default({}, Q(r), {
      hue: parseFloat(e)
    }));
  }
  o(vu, "setHue");
  var xu = /* @__PURE__ */ G(vu), wu = xu;
  function Su(e, r) {
    return r === "transparent" ? r : J(P.default({}, Q(r), {
      lightness: parseFloat(e)
    }));
  }
  o(Su, "setLightness");
  var Eu = /* @__PURE__ */ G(Su), Tu = Eu;
  function Cu(e, r) {
    return r === "transparent" ? r : J(P.default({}, Q(r), {
      saturation: parseFloat(e)
    }));
  }
  o(Cu, "setSaturation");
  var Ou = /* @__PURE__ */ G(Cu), Ru = Ou;
  function Au(e, r) {
    return r === "transparent" ? r : Pt(parseFloat(e), "rgb(0, 0, 0)", r);
  }
  o(Au, "shade");
  var _u = /* @__PURE__ */ G(Au), Fu = _u;
  function Iu(e, r) {
    return r === "transparent" ? r : Pt(parseFloat(e), "rgb(255, 255, 255)", r);
  }
  o(Iu, "tint");
  var Pu = /* @__PURE__ */ G(Iu), Mu = Pu;
  function Lu(e, r) {
    if (r === "transparent") return r;
    var t = ce(r), n = typeof t.alpha == "number" ? t.alpha : 1, a = P.default({}, t, {
      alpha: He(0, 1, +(n * 100 - parseFloat(e) * 100).toFixed(2) / 100)
    });
    return je(a);
  }
  o(Lu, "transparentize");
  var ku = /* @__PURE__ */ G(Lu), zu = ku;
  function Nu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    var n = Array.isArray(r[0]);
    if (!n && r.length > 8)
      throw new b(64);
    var a = r.map(function(i) {
      if (n && !Array.isArray(i) || !n && Array.isArray(i))
        throw new b(65);
      if (Array.isArray(i) && i.length > 8)
        throw new b(66);
      return Array.isArray(i) ? i.join(" ") : i;
    }).join(", ");
    return {
      animation: a
    };
  }
  o(Nu, "animation");
  function Bu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return {
      backgroundImage: r.join(", ")
    };
  }
  o(Bu, "backgroundImages");
  function $u() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return {
      background: r.join(", ")
    };
  }
  o($u, "backgrounds");
  var Du = ["top", "right", "bottom", "left"];
  function ju(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    if (typeof e == "string" && Du.indexOf(e) >= 0) {
      var a;
      return a = {}, a["border" + ir(e) + "Width"] = t[0], a["border" + ir(e) + "Style"] = t[1], a["border" + ir(e) + "Color"] = t[2], a;
    } else
      return t.unshift(e), {
        borderWidth: t[0],
        borderStyle: t[1],
        borderColor: t[2]
      };
  }
  o(ju, "border");
  function Hu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return ge.apply(void 0, ["borderColor"].concat(r));
  }
  o(Hu, "borderColor");
  function Wu(e, r) {
    var t = ir(e);
    if (!r && r !== 0)
      throw new b(62);
    if (t === "Top" || t === "Bottom") {
      var n;
      return n = {}, n["border" + t + "RightRadius"] = r, n["border" + t + "LeftRadius"] = r, n;
    }
    if (t === "Left" || t === "Right") {
      var a;
      return a = {}, a["borderTop" + t + "Radius"] = r, a["borderBottom" + t + "Radius"] = r, a;
    }
    throw new b(63);
  }
  o(Wu, "borderRadius");
  function Uu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return ge.apply(void 0, ["borderStyle"].concat(r));
  }
  o(Uu, "borderStyle");
  function Vu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return ge.apply(void 0, ["borderWidth"].concat(r));
  }
  o(Vu, "borderWidth");
  function na(e, r) {
    var t = r ? ":" + r : "";
    return e(t);
  }
  o(na, "generateSelectors");
  function da(e, r, t) {
    if (!r) throw new b(67);
    if (e.length === 0) return na(r, null);
    for (var n = [], a = 0; a < e.length; a += 1) {
      if (t && t.indexOf(e[a]) < 0)
        throw new b(68);
      n.push(na(r, e[a]));
    }
    return n = n.join(","), n;
  }
  o(da, "statefulSelectors");
  var Gu = [void 0, null, "active", "focus", "hover"];
  function qu(e) {
    return "button" + e + `,
  input[type="button"]` + e + `,
  input[type="reset"]` + e + `,
  input[type="submit"]` + e;
  }
  o(qu, "template$1");
  function Yu() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return da(r, qu, Gu);
  }
  o(Yu, "buttons");
  function Ju() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return ge.apply(void 0, ["margin"].concat(r));
  }
  o(Ju, "margin");
  function Ku() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return ge.apply(void 0, ["padding"].concat(r));
  }
  o(Ku, "padding");
  var Xu = ["absolute", "fixed", "relative", "static", "sticky"];
  function Zu(e) {
    for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
      t[n - 1] = arguments[n];
    return Xu.indexOf(e) >= 0 && e ? P.default({}, ge.apply(void 0, [""].concat(t)), {
      position: e
    }) : ge.apply(void 0, ["", e].concat(t));
  }
  o(Zu, "position");
  function Qu(e, r) {
    return r === void 0 && (r = e), {
      height: e,
      width: r
    };
  }
  o(Qu, "size");
  var ef = [void 0, null, "active", "focus", "hover"];
  function rf(e) {
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
  o(rf, "template");
  function tf() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    return da(r, rf, ef);
  }
  o(tf, "textInputs");
  function nf() {
    for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
      r[t] = arguments[t];
    if (Array.isArray(r[0]) && r.length === 2) {
      var n = r[1];
      if (typeof n != "string")
        throw new b(61);
      var a = r[0].map(function(i) {
        return i + " " + n;
      }).join(", ");
      return {
        transition: a
      };
    } else
      return {
        transition: r.join(", ")
      };
  }
  o(nf, "transitions");
  p.adjustHue = Ys;
  p.animation = Nu;
  p.backgroundImages = Bu;
  p.backgrounds = $u;
  p.between = Rt;
  p.border = ju;
  p.borderColor = Hu;
  p.borderRadius = Wu;
  p.borderStyle = Uu;
  p.borderWidth = Vu;
  p.buttons = Yu;
  p.clearFix = as;
  p.complement = Js;
  p.cover = os;
  p.cssVar = Ni;
  p.darken = Zs;
  p.desaturate = ru;
  p.directionalProperty = ge;
  p.easeIn = Qi;
  p.easeInOut = rs;
  p.easeOut = ns;
  p.ellipsis = is;
  p.em = Ui;
  p.fluidRange = fs;
  p.fontFace = gs;
  p.getContrast = It;
  p.getLuminance = Dr;
  p.getValueAndUnit = te;
  p.grayscale = tu;
  p.hiDPI = fa;
  p.hideText = bs;
  p.hideVisually = ys;
  p.hsl = _t;
  p.hslToColorString = nu;
  p.hsla = Ft;
  p.important = ia;
  p.invert = au;
  p.lighten = su;
  p.linearGradient = vs;
  p.margin = Ju;
  p.math = ki;
  p.meetsContrastGuidelines = uu;
  p.mix = Pt;
  p.modularScale = qi;
  p.normalize = xs;
  p.opacify = pu;
  p.padding = Ku;
  p.parseToHsl = Q;
  p.parseToRgb = ce;
  p.position = Zu;
  p.radialGradient = ws;
  p.readableColor = mu;
  p.rem = Ji;
  p.remToPx = Xi;
  p.retinaImage = Ss;
  p.rgb = ur;
  p.rgbToColorString = hu;
  p.rgba = je;
  p.saturate = yu;
  p.setHue = wu;
  p.setLightness = Tu;
  p.setSaturation = Ru;
  p.shade = Fu;
  p.size = Qu;
  p.stripUnit = Ct;
  p.textInputs = tf;
  p.timingFunctions = Cs;
  p.tint = Mu;
  p.toColorString = J;
  p.transitions = nf;
  p.transparentize = zu;
  p.triangle = As;
  p.wordWrap = _s;
});

// ../node_modules/map-or-similar/src/similar.js
var ha = k((Vl, ma) => {
  function be() {
    return this.list = [], this.lastItem = void 0, this.size = 0, this;
  }
  o(be, "Similar");
  be.prototype.get = function(e) {
    var r;
    if (this.lastItem && this.isEqual(this.lastItem.key, e))
      return this.lastItem.val;
    if (r = this.indexOf(e), r >= 0)
      return this.lastItem = this.list[r], this.list[r].val;
  };
  be.prototype.set = function(e, r) {
    var t;
    return this.lastItem && this.isEqual(this.lastItem.key, e) ? (this.lastItem.val = r, this) : (t = this.indexOf(e), t >= 0 ? (this.lastItem =
    this.list[t], this.list[t].val = r, this) : (this.lastItem = { key: e, val: r }, this.list.push(this.lastItem), this.size++, this));
  };
  be.prototype.delete = function(e) {
    var r;
    if (this.lastItem && this.isEqual(this.lastItem.key, e) && (this.lastItem = void 0), r = this.indexOf(e), r >= 0)
      return this.size--, this.list.splice(r, 1)[0];
  };
  be.prototype.has = function(e) {
    var r;
    return this.lastItem && this.isEqual(this.lastItem.key, e) ? !0 : (r = this.indexOf(e), r >= 0 ? (this.lastItem = this.list[r], !0) : !1);
  };
  be.prototype.forEach = function(e, r) {
    var t;
    for (t = 0; t < this.size; t++)
      e.call(r || this, this.list[t].val, this.list[t].key, this);
  };
  be.prototype.indexOf = function(e) {
    var r;
    for (r = 0; r < this.size; r++)
      if (this.isEqual(this.list[r].key, e))
        return r;
    return -1;
  };
  be.prototype.isEqual = function(e, r) {
    return e === r || e !== e && r !== r;
  };
  ma.exports = be;
});

// ../node_modules/map-or-similar/src/map-or-similar.js
var ba = k((ql, ga) => {
  ga.exports = function(e) {
    if (typeof Map != "function" || e) {
      var r = ha();
      return new r();
    } else
      return /* @__PURE__ */ new Map();
  };
});

// ../node_modules/memoizerific/src/memoizerific.js
var xa = k((Yl, va) => {
  var ya = ba();
  va.exports = function(e) {
    var r = new ya(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), t = [];
    return function(n) {
      var a = /* @__PURE__ */ o(function() {
        var i = r, s, u, f = arguments.length - 1, l = Array(f + 1), d = !0, c;
        if ((a.numArgs || a.numArgs === 0) && a.numArgs !== f + 1)
          throw new Error("Memoizerific functions should always be called with the same number of arguments");
        for (c = 0; c < f; c++) {
          if (l[c] = {
            cacheItem: i,
            arg: arguments[c]
          }, i.has(arguments[c])) {
            i = i.get(arguments[c]);
            continue;
          }
          d = !1, s = new ya(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), i.set(arguments[c], s), i = s;
        }
        return d && (i.has(arguments[f]) ? u = i.get(arguments[f]) : d = !1), d || (u = n.apply(null, arguments), i.set(arguments[f], u)), e >
        0 && (l[f] = {
          cacheItem: i,
          arg: arguments[f]
        }, d ? af(t, l) : t.push(l), t.length > e && of(t.shift())), a.wasMemoized = d, a.numArgs = f + 1, u;
      }, "memoizerific");
      return a.limit = e, a.wasMemoized = !1, a.cache = r, a.lru = t, a;
    };
  };
  function af(e, r) {
    var t = e.length, n = r.length, a, i, s;
    for (i = 0; i < t; i++) {
      for (a = !0, s = 0; s < n; s++)
        if (!sf(e[i][s].arg, r[s].arg)) {
          a = !1;
          break;
        }
      if (a)
        break;
    }
    e.push(e.splice(i, 1)[0]);
  }
  o(af, "moveToMostRecentLru");
  function of(e) {
    var r = e.length, t = e[r - 1], n, a;
    for (t.cacheItem.delete(t.arg), a = r - 2; a >= 0 && (t = e[a], n = t.cacheItem.get(t.arg), !n || !n.size); a--)
      t.cacheItem.delete(t.arg);
  }
  o(of, "removeCachedResult");
  function sf(e, r) {
    return e === r || e !== e && r !== r;
  }
  o(sf, "isEqual");
});

// ../node_modules/@storybook/global/dist/index.js
var Ca = k((rd, Ta) => {
  "use strict";
  var kt = Object.defineProperty, cf = Object.getOwnPropertyDescriptor, lf = Object.getOwnPropertyNames, df = Object.prototype.hasOwnProperty,
  pf = /* @__PURE__ */ o((e, r) => {
    for (var t in r)
      kt(e, t, { get: r[t], enumerable: !0 });
  }, "__export"), mf = /* @__PURE__ */ o((e, r, t, n) => {
    if (r && typeof r == "object" || typeof r == "function")
      for (let a of lf(r))
        !df.call(e, a) && a !== t && kt(e, a, { get: /* @__PURE__ */ o(() => r[a], "get"), enumerable: !(n = cf(r, a)) || n.enumerable });
    return e;
  }, "__copyProps"), hf = /* @__PURE__ */ o((e) => mf(kt({}, "__esModule", { value: !0 }), e), "__toCommonJS"), Ea = {};
  pf(Ea, {
    global: /* @__PURE__ */ o(() => gf, "global")
  });
  Ta.exports = hf(Ea);
  var gf = (() => {
    let e;
    return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
    e = self : e = {}, e;
  })();
});

// ../node_modules/ts-dedent/dist/index.js
var ja = k((dr) => {
  "use strict";
  Object.defineProperty(dr, "__esModule", { value: !0 });
  dr.dedent = void 0;
  function Da(e) {
    for (var r = [], t = 1; t < arguments.length; t++)
      r[t - 1] = arguments[t];
    var n = Array.from(typeof e == "string" ? [e] : e);
    n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var a = n.reduce(function(u, f) {
      var l = f.match(/\n([\t ]+|(?!\s).)/g);
      return l ? u.concat(l.map(function(d) {
        var c, m;
        return (m = (c = d.match(/[\t ]/g)) === null || c === void 0 ? void 0 : c.length) !== null && m !== void 0 ? m : 0;
      })) : u;
    }, []);
    if (a.length) {
      var i = new RegExp(`
[	 ]{` + Math.min.apply(Math, a) + "}", "g");
      n = n.map(function(u) {
        return u.replace(i, `
`);
      });
    }
    n[0] = n[0].replace(/^\r?\n/, "");
    var s = n[0];
    return r.forEach(function(u, f) {
      var l = s.match(/(?:^|\n)( *)$/), d = l ? l[1] : "", c = u;
      typeof u == "string" && u.includes(`
`) && (c = String(u).split(`
`).map(function(m, T) {
        return T === 0 ? m : "" + d + m;
      }).join(`
`)), s += c + n[f + 1];
    }), s;
  }
  o(Da, "dedent");
  dr.dedent = Da;
  dr.default = Da;
});

// src/theming/index.ts
var zf = {};
co(zf, {
  CacheProvider: () => pt,
  ClassNames: () => Pn,
  Global: () => In,
  ThemeProvider: () => ht,
  background: () => ee,
  color: () => h,
  convert: () => Wr,
  create: () => xf,
  createCache: () => Xe,
  createGlobal: () => wa,
  createReset: () => Lt,
  css: () => De,
  darken: () => Ia,
  ensure: () => Lf,
  ignoreSsrWarning: () => kf,
  isPropValid: () => zr,
  jsx: () => kr,
  keyframes: () => Ee,
  lighten: () => Fa,
  styled: () => Nr,
  themes: () => Ue,
  typography: () => K,
  useTheme: () => mt,
  withTheme: () => gt
});
module.exports = lo(zf);

// ../node_modules/@babel/runtime/helpers/esm/extends.js
function ye() {
  return ye = Object.assign ? Object.assign.bind() : function(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = arguments[r];
      for (var n in t) ({}).hasOwnProperty.call(t, n) && (e[n] = t[n]);
    }
    return e;
  }, ye.apply(null, arguments);
}
o(ye, "_extends");

// ../node_modules/@emotion/react/dist/emotion-element-d59e098f.esm.js
var N = W(require("react")), er = require("react");

// ../node_modules/@emotion/sheet/dist/emotion-sheet.esm.js
var po = !1;
function mo(e) {
  if (e.sheet)
    return e.sheet;
  for (var r = 0; r < document.styleSheets.length; r++)
    if (document.styleSheets[r].ownerNode === e)
      return document.styleSheets[r];
}
o(mo, "sheetForTag");
function ho(e) {
  var r = document.createElement("style");
  return r.setAttribute("data-emotion", e.key), e.nonce !== void 0 && r.setAttribute("nonce", e.nonce), r.appendChild(document.createTextNode(
  "")), r.setAttribute("data-s", ""), r;
}
o(ho, "createStyleElement");
var Wt = /* @__PURE__ */ function() {
  function e(t) {
    var n = this;
    this._insertTag = function(a) {
      var i;
      n.tags.length === 0 ? n.insertionPoint ? i = n.insertionPoint.nextSibling : n.prepend ? i = n.container.firstChild : i = n.before : i =
      n.tags[n.tags.length - 1].nextSibling, n.container.insertBefore(a, i), n.tags.push(a);
    }, this.isSpeedy = t.speedy === void 0 ? !po : t.speedy, this.tags = [], this.ctr = 0, this.nonce = t.nonce, this.key = t.key, this.container =
    t.container, this.prepend = t.prepend, this.insertionPoint = t.insertionPoint, this.before = null;
  }
  o(e, "StyleSheet");
  var r = e.prototype;
  return r.hydrate = /* @__PURE__ */ o(function(n) {
    n.forEach(this._insertTag);
  }, "hydrate"), r.insert = /* @__PURE__ */ o(function(n) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(ho(this));
    var a = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var i = mo(a);
      try {
        i.insertRule(n, i.cssRules.length);
      } catch {
      }
    } else
      a.appendChild(document.createTextNode(n));
    this.ctr++;
  }, "insert"), r.flush = /* @__PURE__ */ o(function() {
    this.tags.forEach(function(n) {
      var a;
      return (a = n.parentNode) == null ? void 0 : a.removeChild(n);
    }), this.tags = [], this.ctr = 0;
  }, "flush"), e;
}();

// ../node_modules/stylis/src/Enum.js
var $ = "-ms-", Ge = "-moz-", A = "-webkit-", mr = "comm", Re = "rule", Ae = "decl";
var Ut = "@import";
var hr = "@keyframes";
var Vt = "@layer";

// ../node_modules/stylis/src/Utility.js
var Gt = Math.abs, ve = String.fromCharCode, qt = Object.assign;
function Yt(e, r) {
  return L(e, 0) ^ 45 ? (((r << 2 ^ L(e, 0)) << 2 ^ L(e, 1)) << 2 ^ L(e, 2)) << 2 ^ L(e, 3) : 0;
}
o(Yt, "hash");
function gr(e) {
  return e.trim();
}
o(gr, "trim");
function Jr(e, r) {
  return (e = r.exec(e)) ? e[0] : e;
}
o(Jr, "match");
function O(e, r, t) {
  return e.replace(r, t);
}
o(O, "replace");
function qe(e, r) {
  return e.indexOf(r);
}
o(qe, "indexof");
function L(e, r) {
  return e.charCodeAt(r) | 0;
}
o(L, "charat");
function de(e, r, t) {
  return e.slice(r, t);
}
o(de, "substr");
function D(e) {
  return e.length;
}
o(D, "strlen");
function _e(e) {
  return e.length;
}
o(_e, "sizeof");
function Fe(e, r) {
  return r.push(e), e;
}
o(Fe, "append");
function Kr(e, r) {
  return e.map(r).join("");
}
o(Kr, "combine");

// ../node_modules/stylis/src/Tokenizer.js
var br = 1, Ie = 1, Jt = 0, j = 0, z = 0, Me = "";
function Ye(e, r, t, n, a, i, s) {
  return { value: e, root: r, parent: t, type: n, props: a, children: i, line: br, column: Ie, length: s, return: "" };
}
o(Ye, "node");
function Le(e, r) {
  return qt(Ye("", null, null, "", null, null, 0), e, { length: -e.length }, r);
}
o(Le, "copy");
function Kt() {
  return z;
}
o(Kt, "char");
function Xt() {
  return z = j > 0 ? L(Me, --j) : 0, Ie--, z === 10 && (Ie = 1, br--), z;
}
o(Xt, "prev");
function H() {
  return z = j < Jt ? L(Me, j++) : 0, Ie++, z === 10 && (Ie = 1, br++), z;
}
o(H, "next");
function Y() {
  return L(Me, j);
}
o(Y, "peek");
function Je() {
  return j;
}
o(Je, "caret");
function ke(e, r) {
  return de(Me, e, r);
}
o(ke, "slice");
function Pe(e) {
  switch (e) {
    // \0 \t \n \r \s whitespace token
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    // ! + , / > @ ~ isolate token
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    // ; { } breakpoint token
    case 59:
    case 123:
    case 125:
      return 4;
    // : accompanied token
    case 58:
      return 3;
    // " ' ( [ opening delimit token
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    // ) ] closing delimit token
    case 41:
    case 93:
      return 1;
  }
  return 0;
}
o(Pe, "token");
function yr(e) {
  return br = Ie = 1, Jt = D(Me = e), j = 0, [];
}
o(yr, "alloc");
function vr(e) {
  return Me = "", e;
}
o(vr, "dealloc");
function ze(e) {
  return gr(ke(j - 1, Xr(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
o(ze, "delimit");
function Zt(e) {
  for (; (z = Y()) && z < 33; )
    H();
  return Pe(e) > 2 || Pe(z) > 3 ? "" : " ";
}
o(Zt, "whitespace");
function Qt(e, r) {
  for (; --r && H() && !(z < 48 || z > 102 || z > 57 && z < 65 || z > 70 && z < 97); )
    ;
  return ke(e, Je() + (r < 6 && Y() == 32 && H() == 32));
}
o(Qt, "escaping");
function Xr(e) {
  for (; H(); )
    switch (z) {
      // ] ) " '
      case e:
        return j;
      // " '
      case 34:
      case 39:
        e !== 34 && e !== 39 && Xr(z);
        break;
      // (
      case 40:
        e === 41 && Xr(e);
        break;
      // \
      case 92:
        H();
        break;
    }
  return j;
}
o(Xr, "delimiter");
function en(e, r) {
  for (; H() && e + z !== 57; )
    if (e + z === 84 && Y() === 47)
      break;
  return "/*" + ke(r, j - 1) + "*" + ve(e === 47 ? e : H());
}
o(en, "commenter");
function rn(e) {
  for (; !Pe(Y()); )
    H();
  return ke(e, j);
}
o(rn, "identifier");

// ../node_modules/stylis/src/Parser.js
function Zr(e) {
  return vr(xr("", null, null, null, [""], e = yr(e), 0, [0], e));
}
o(Zr, "compile");
function xr(e, r, t, n, a, i, s, u, f) {
  for (var l = 0, d = 0, c = s, m = 0, T = 0, y = 0, v = 1, x = 1, S = 1, I = 0, M = "", w = a, R = i, C = n, E = M; x; )
    switch (y = I, I = H()) {
      // (
      case 40:
        if (y != 108 && L(E, c - 1) == 58) {
          qe(E += O(ze(I), "&", "&\f"), "&\f") != -1 && (S = -1);
          break;
        }
      // " ' [
      case 34:
      case 39:
      case 91:
        E += ze(I);
        break;
      // \t \n \r \s
      case 9:
      case 10:
      case 13:
      case 32:
        E += Zt(y);
        break;
      // \
      case 92:
        E += Qt(Je() - 1, 7);
        continue;
      // /
      case 47:
        switch (Y()) {
          case 42:
          case 47:
            Fe(go(en(H(), Je()), r, t), f);
            break;
          default:
            E += "/";
        }
        break;
      // {
      case 123 * v:
        u[l++] = D(E) * S;
      // } ; \0
      case 125 * v:
      case 59:
      case 0:
        switch (I) {
          // \0 }
          case 0:
          case 125:
            x = 0;
          // ;
          case 59 + d:
            S == -1 && (E = O(E, /\f/g, "")), T > 0 && D(E) - c && Fe(T > 32 ? nn(E + ";", n, t, c - 1) : nn(O(E, " ", "") + ";", n, t, c - 2),
            f);
            break;
          // @ ;
          case 59:
            E += ";";
          // { rule/at-rule
          default:
            if (Fe(C = tn(E, r, t, l, d, a, u, M, w = [], R = [], c), i), I === 123)
              if (d === 0)
                xr(E, r, C, C, w, i, c, u, R);
              else
                switch (m === 99 && L(E, 3) === 110 ? 100 : m) {
                  // d l m s
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    xr(e, C, C, n && Fe(tn(e, C, C, 0, 0, a, u, M, a, w = [], c), R), a, R, c, u, n ? w : R);
                    break;
                  default:
                    xr(E, C, C, C, [""], R, 0, u, R);
                }
        }
        l = d = T = 0, v = S = 1, M = E = "", c = s;
        break;
      // :
      case 58:
        c = 1 + D(E), T = y;
      default:
        if (v < 1) {
          if (I == 123)
            --v;
          else if (I == 125 && v++ == 0 && Xt() == 125)
            continue;
        }
        switch (E += ve(I), I * v) {
          // &
          case 38:
            S = d > 0 ? 1 : (E += "\f", -1);
            break;
          // ,
          case 44:
            u[l++] = (D(E) - 1) * S, S = 1;
            break;
          // @
          case 64:
            Y() === 45 && (E += ze(H())), m = Y(), d = c = D(M = E += rn(Je())), I++;
            break;
          // -
          case 45:
            y === 45 && D(E) == 2 && (v = 0);
        }
    }
  return i;
}
o(xr, "parse");
function tn(e, r, t, n, a, i, s, u, f, l, d) {
  for (var c = a - 1, m = a === 0 ? i : [""], T = _e(m), y = 0, v = 0, x = 0; y < n; ++y)
    for (var S = 0, I = de(e, c + 1, c = Gt(v = s[y])), M = e; S < T; ++S)
      (M = gr(v > 0 ? m[S] + " " + I : O(I, /&\f/g, m[S]))) && (f[x++] = M);
  return Ye(e, r, t, a === 0 ? Re : u, f, l, d);
}
o(tn, "ruleset");
function go(e, r, t) {
  return Ye(e, r, t, mr, ve(Kt()), de(e, 2, -2), 0);
}
o(go, "comment");
function nn(e, r, t, n) {
  return Ye(e, r, t, Ae, de(e, 0, n), de(e, n + 1, -1), n);
}
o(nn, "declaration");

// ../node_modules/stylis/src/Serializer.js
function pe(e, r) {
  for (var t = "", n = _e(e), a = 0; a < n; a++)
    t += r(e[a], a, e, r) || "";
  return t;
}
o(pe, "serialize");
function Qr(e, r, t, n) {
  switch (e.type) {
    case Vt:
      if (e.children.length) break;
    case Ut:
    case Ae:
      return e.return = e.return || e.value;
    case mr:
      return "";
    case hr:
      return e.return = e.value + "{" + pe(e.children, n) + "}";
    case Re:
      e.value = e.props.join(",");
  }
  return D(t = pe(e.children, n)) ? e.return = e.value + "{" + t + "}" : "";
}
o(Qr, "stringify");

// ../node_modules/stylis/src/Middleware.js
function et(e) {
  var r = _e(e);
  return function(t, n, a, i) {
    for (var s = "", u = 0; u < r; u++)
      s += e[u](t, n, a, i) || "";
    return s;
  };
}
o(et, "middleware");
function an(e) {
  return function(r) {
    r.root || (r = r.return) && e(r);
  };
}
o(an, "rulesheet");

// ../node_modules/@emotion/weak-memoize/dist/emotion-weak-memoize.esm.js
var Ke = /* @__PURE__ */ o(function(r) {
  var t = /* @__PURE__ */ new WeakMap();
  return function(n) {
    if (t.has(n))
      return t.get(n);
    var a = r(n);
    return t.set(n, a), a;
  };
}, "weakMemoize");

// ../node_modules/@emotion/memoize/dist/emotion-memoize.esm.js
function Ne(e) {
  var r = /* @__PURE__ */ Object.create(null);
  return function(t) {
    return r[t] === void 0 && (r[t] = e(t)), r[t];
  };
}
o(Ne, "memoize");

// ../node_modules/@emotion/cache/dist/emotion-cache.esm.js
var rt = typeof document < "u", bo = /* @__PURE__ */ o(function(r, t, n) {
  for (var a = 0, i = 0; a = i, i = Y(), a === 38 && i === 12 && (t[n] = 1), !Pe(i); )
    H();
  return ke(r, j);
}, "identifierWithPointTracking"), yo = /* @__PURE__ */ o(function(r, t) {
  var n = -1, a = 44;
  do
    switch (Pe(a)) {
      case 0:
        a === 38 && Y() === 12 && (t[n] = 1), r[n] += bo(j - 1, t, n);
        break;
      case 2:
        r[n] += ze(a);
        break;
      case 4:
        if (a === 44) {
          r[++n] = Y() === 58 ? "&\f" : "", t[n] = r[n].length;
          break;
        }
      // fallthrough
      default:
        r[n] += ve(a);
    }
  while (a = H());
  return r;
}, "toRules"), vo = /* @__PURE__ */ o(function(r, t) {
  return vr(yo(yr(r), t));
}, "getRules"), on = /* @__PURE__ */ new WeakMap(), xo = /* @__PURE__ */ o(function(r) {
  if (!(r.type !== "rule" || !r.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  r.length < 1)) {
    for (var t = r.value, n = r.parent, a = r.column === n.column && r.line === n.line; n.type !== "rule"; )
      if (n = n.parent, !n) return;
    if (!(r.props.length === 1 && t.charCodeAt(0) !== 58 && !on.get(n)) && !a) {
      on.set(r, !0);
      for (var i = [], s = vo(t, i), u = n.props, f = 0, l = 0; f < s.length; f++)
        for (var d = 0; d < u.length; d++, l++)
          r.props[l] = i[f] ? s[f].replace(/&\f/g, u[d]) : u[d] + " " + s[f];
    }
  }
}, "compat"), wo = /* @__PURE__ */ o(function(r) {
  if (r.type === "decl") {
    var t = r.value;
    // charcode for l
    t.charCodeAt(0) === 108 && // charcode for b
    t.charCodeAt(2) === 98 && (r.return = "", r.value = "");
  }
}, "removeLabel");
function un(e, r) {
  switch (Yt(e, r)) {
    // color-adjust
    case 5103:
      return A + "print-" + e + e;
    // animation, animation-(delay|direction|duration|fill-mode|iteration-count|name|play-state|timing-function)
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    // text-decoration, filter, clip-path, backface-visibility, column, box-decoration-break
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    // mask, mask-image, mask-(mode|clip|size), mask-(repeat|origin), mask-position, mask-composite,
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    // background-clip, columns, column-(count|fill|gap|rule|rule-color|rule-style|rule-width|span|width)
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return A + e + e;
    // appearance, user-select, transform, hyphens, text-size-adjust
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return A + e + Ge + e + $ + e + e;
    // flex, flex-direction
    case 6828:
    case 4268:
      return A + e + $ + e + e;
    // order
    case 6165:
      return A + e + $ + "flex-" + e + e;
    // align-items
    case 5187:
      return A + e + O(e, /(\w+).+(:[^]+)/, A + "box-$1$2" + $ + "flex-$1$2") + e;
    // align-self
    case 5443:
      return A + e + $ + "flex-item-" + O(e, /flex-|-self/, "") + e;
    // align-content
    case 4675:
      return A + e + $ + "flex-line-pack" + O(e, /align-content|flex-|-self/, "") + e;
    // flex-shrink
    case 5548:
      return A + e + $ + O(e, "shrink", "negative") + e;
    // flex-basis
    case 5292:
      return A + e + $ + O(e, "basis", "preferred-size") + e;
    // flex-grow
    case 6060:
      return A + "box-" + O(e, "-grow", "") + A + e + $ + O(e, "grow", "positive") + e;
    // transition
    case 4554:
      return A + O(e, /([^-])(transform)/g, "$1" + A + "$2") + e;
    // cursor
    case 6187:
      return O(O(O(e, /(zoom-|grab)/, A + "$1"), /(image-set)/, A + "$1"), e, "") + e;
    // background, background-image
    case 5495:
    case 3959:
      return O(e, /(image-set\([^]*)/, A + "$1$`$1");
    // justify-content
    case 4968:
      return O(O(e, /(.+:)(flex-)?(.*)/, A + "box-pack:$3" + $ + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + A + e + e;
    // (margin|padding)-inline-(start|end)
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return O(e, /(.+)-inline(.+)/, A + "$1$2") + e;
    // (min|max)?(width|height|inline-size|block-size)
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      if (D(e) - 1 - r > 6) switch (L(e, r + 1)) {
        // (m)ax-content, (m)in-content
        case 109:
          if (L(e, r + 4) !== 45) break;
        // (f)ill-available, (f)it-content
        case 102:
          return O(e, /(.+:)(.+)-([^]+)/, "$1" + A + "$2-$3$1" + Ge + (L(e, r + 3) == 108 ? "$3" : "$2-$3")) + e;
        // (s)tretch
        case 115:
          return ~qe(e, "stretch") ? un(O(e, "stretch", "fill-available"), r) + e : e;
      }
      break;
    // position: sticky
    case 4949:
      if (L(e, r + 1) !== 115) break;
    // display: (flex|inline-flex)
    case 6444:
      switch (L(e, D(e) - 3 - (~qe(e, "!important") && 10))) {
        // stic(k)y
        case 107:
          return O(e, ":", ":" + A) + e;
        // (inline-)?fl(e)x
        case 101:
          return O(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + A + (L(e, 14) === 45 ? "inline-" : "") + "box$3$1" + A + "$2$3$1" + $ + "$2box$3") + e;
      }
      break;
    // writing-mode
    case 5936:
      switch (L(e, r + 11)) {
        // vertical-l(r)
        case 114:
          return A + e + $ + O(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
        // vertical-r(l)
        case 108:
          return A + e + $ + O(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
        // horizontal(-)tb
        case 45:
          return A + e + $ + O(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
      }
      return A + e + $ + e + e;
  }
  return e;
}
o(un, "prefix");
var So = /* @__PURE__ */ o(function(r, t, n, a) {
  if (r.length > -1 && !r.return) switch (r.type) {
    case Ae:
      r.return = un(r.value, r.length);
      break;
    case hr:
      return pe([Le(r, {
        value: O(r.value, "@", "@" + A)
      })], a);
    case Re:
      if (r.length) return Kr(r.props, function(i) {
        switch (Jr(i, /(::plac\w+|:read-\w+)/)) {
          // :read-(only|write)
          case ":read-only":
          case ":read-write":
            return pe([Le(r, {
              props: [O(i, /:(read-\w+)/, ":" + Ge + "$1")]
            })], a);
          // :placeholder
          case "::placeholder":
            return pe([Le(r, {
              props: [O(i, /:(plac\w+)/, ":" + A + "input-$1")]
            }), Le(r, {
              props: [O(i, /:(plac\w+)/, ":" + Ge + "$1")]
            }), Le(r, {
              props: [O(i, /:(plac\w+)/, $ + "input-$1")]
            })], a);
        }
        return "";
      });
  }
}, "prefixer"), sn = rt ? void 0 : Ke(function() {
  return Ne(function() {
    return {};
  });
}), Eo = [So], Xe = /* @__PURE__ */ o(function(r) {
  var t = r.key;
  if (rt && t === "css") {
    var n = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(n, function(w) {
      var R = w.getAttribute("data-emotion");
      R.indexOf(" ") !== -1 && (document.head.appendChild(w), w.setAttribute("data-s", ""));
    });
  }
  var a = r.stylisPlugins || Eo, i = {}, s, u = [];
  rt && (s = r.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + t + ' "]'),
    function(w) {
      for (var R = w.getAttribute("data-emotion").split(" "), C = 1; C < R.length; C++)
        i[R[C]] = !0;
      u.push(w);
    }
  ));
  var f, l = [xo, wo];
  if (sn) {
    var y = [Qr], v = et(l.concat(a, y)), x = /* @__PURE__ */ o(function(R) {
      return pe(Zr(R), v);
    }, "_stylis"), S = sn(a)(t), I = /* @__PURE__ */ o(function(R, C) {
      var E = C.name;
      return S[E] === void 0 && (S[E] = x(R ? R + "{" + C.styles + "}" : C.styles)), S[E];
    }, "getRules");
    f = /* @__PURE__ */ o(function(R, C, E, X) {
      var ne = C.name, q = I(R, C);
      if (M.compat === void 0)
        return X && (M.inserted[ne] = !0), q;
      if (X)
        M.inserted[ne] = q;
      else
        return q;
    }, "_insert");
  } else {
    var d, c = [Qr, an(function(w) {
      d.insert(w);
    })], m = et(l.concat(a, c)), T = /* @__PURE__ */ o(function(R) {
      return pe(Zr(R), m);
    }, "stylis");
    f = /* @__PURE__ */ o(function(R, C, E, X) {
      d = E, T(R ? R + "{" + C.styles + "}" : C.styles), X && (M.inserted[C.name] = !0);
    }, "insert");
  }
  var M = {
    key: t,
    sheet: new Wt({
      key: t,
      container: s,
      nonce: r.nonce,
      speedy: r.speedy,
      prepend: r.prepend,
      insertionPoint: r.insertionPoint
    }),
    nonce: r.nonce,
    inserted: i,
    registered: {},
    insert: f
  };
  return M.sheet.hydrate(u), M;
}, "createCache");

// ../node_modules/@emotion/react/_isolated-hnrs/dist/emotion-react-_isolated-hnrs.esm.js
var vn = W(ut());
var xn = /* @__PURE__ */ o(function(e, r) {
  return (0, vn.default)(e, r);
}, "hoistNonReactStatics");

// ../node_modules/@emotion/utils/dist/emotion-utils.esm.js
var ft = typeof document < "u";
function Be(e, r, t) {
  var n = "";
  return t.split(" ").forEach(function(a) {
    e[a] !== void 0 ? r.push(e[a] + ";") : a && (n += a + " ");
  }), n;
}
o(Be, "getRegisteredStyles");
var xe = /* @__PURE__ */ o(function(r, t, n) {
  var a = r.key + "-" + t.name;
  // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (n === !1 || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  ft === !1 && r.compat !== void 0) && r.registered[a] === void 0 && (r.registered[a] = t.styles);
}, "registerStyles"), we = /* @__PURE__ */ o(function(r, t, n) {
  xe(r, t, n);
  var a = r.key + "-" + t.name;
  if (r.inserted[t.name] === void 0) {
    var i = "", s = t;
    do {
      var u = r.insert(t === s ? "." + a : "", s, r.sheet, !0);
      !ft && u !== void 0 && (i += u), s = s.next;
    } while (s !== void 0);
    if (!ft && i.length !== 0)
      return i;
  }
}, "insertStyles");

// ../node_modules/@emotion/hash/dist/emotion-hash.esm.js
function wn(e) {
  for (var r = 0, t, n = 0, a = e.length; a >= 4; ++n, a -= 4)
    t = e.charCodeAt(n) & 255 | (e.charCodeAt(++n) & 255) << 8 | (e.charCodeAt(++n) & 255) << 16 | (e.charCodeAt(++n) & 255) << 24, t = /* Math.imul(k, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16), t ^= /* k >>> r: */
    t >>> 24, r = /* Math.imul(k, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16);
  switch (a) {
    case 3:
      r ^= (e.charCodeAt(n + 2) & 255) << 16;
    case 2:
      r ^= (e.charCodeAt(n + 1) & 255) << 8;
    case 1:
      r ^= e.charCodeAt(n) & 255, r = /* Math.imul(h, m): */
      (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16);
  }
  return r ^= r >>> 13, r = /* Math.imul(h, m): */
  (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16), ((r ^ r >>> 15) >>> 0).toString(36);
}
o(wn, "murmur2");

// ../node_modules/@emotion/unitless/dist/emotion-unitless.esm.js
var Sn = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
};

// ../node_modules/@emotion/serialize/dist/emotion-serialize.esm.js
var zo = !1, No = /[A-Z]|^ms/g, Bo = /_EMO_([^_]+?)_([^]*?)_EMO_/g, On = /* @__PURE__ */ o(function(r) {
  return r.charCodeAt(1) === 45;
}, "isCustomProperty"), En = /* @__PURE__ */ o(function(r) {
  return r != null && typeof r != "boolean";
}, "isProcessableValue"), ct = /* @__PURE__ */ Ne(function(e) {
  return On(e) ? e : e.replace(No, "-$&").toLowerCase();
}), Tn = /* @__PURE__ */ o(function(r, t) {
  switch (r) {
    case "animation":
    case "animationName":
      if (typeof t == "string")
        return t.replace(Bo, function(n, a, i) {
          return re = {
            name: a,
            styles: i,
            next: re
          }, a;
        });
  }
  return Sn[r] !== 1 && !On(r) && typeof t == "number" && t !== 0 ? t + "px" : t;
}, "processStyleValue"), $o = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or an\
other Emotion-aware compiler transform.";
function Ze(e, r, t) {
  if (t == null)
    return "";
  var n = t;
  if (n.__emotion_styles !== void 0)
    return n;
  switch (typeof t) {
    case "boolean":
      return "";
    case "object": {
      var a = t;
      if (a.anim === 1)
        return re = {
          name: a.name,
          styles: a.styles,
          next: re
        }, a.name;
      var i = t;
      if (i.styles !== void 0) {
        var s = i.next;
        if (s !== void 0)
          for (; s !== void 0; )
            re = {
              name: s.name,
              styles: s.styles,
              next: re
            }, s = s.next;
        var u = i.styles + ";";
        return u;
      }
      return Do(e, r, t);
    }
    case "function": {
      if (e !== void 0) {
        var f = re, l = t(e);
        return re = f, Ze(e, r, l);
      }
      break;
    }
  }
  var d = t;
  if (r == null)
    return d;
  var c = r[d];
  return c !== void 0 ? c : d;
}
o(Ze, "handleInterpolation");
function Do(e, r, t) {
  var n = "";
  if (Array.isArray(t))
    for (var a = 0; a < t.length; a++)
      n += Ze(e, r, t[a]) + ";";
  else
    for (var i in t) {
      var s = t[i];
      if (typeof s != "object") {
        var u = s;
        r != null && r[u] !== void 0 ? n += i + "{" + r[u] + "}" : En(u) && (n += ct(i) + ":" + Tn(i, u) + ";");
      } else {
        if (i === "NO_COMPONENT_SELECTOR" && zo)
          throw new Error($o);
        if (Array.isArray(s) && typeof s[0] == "string" && (r == null || r[s[0]] === void 0))
          for (var f = 0; f < s.length; f++)
            En(s[f]) && (n += ct(i) + ":" + Tn(i, s[f]) + ";");
        else {
          var l = Ze(e, r, s);
          switch (i) {
            case "animation":
            case "animationName": {
              n += ct(i) + ":" + l + ";";
              break;
            }
            default:
              n += i + "{" + l + "}";
          }
        }
      }
    }
  return n;
}
o(Do, "createStringFromObject");
var Cn = /label:\s*([^\s;{]+)\s*(;|$)/g, re;
function me(e, r, t) {
  if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0)
    return e[0];
  var n = !0, a = "";
  re = void 0;
  var i = e[0];
  if (i == null || i.raw === void 0)
    n = !1, a += Ze(t, r, i);
  else {
    var s = i;
    a += s[0];
  }
  for (var u = 1; u < e.length; u++)
    if (a += Ze(t, r, e[u]), n) {
      var f = i;
      a += f[u];
    }
  Cn.lastIndex = 0;
  for (var l = "", d; (d = Cn.exec(a)) !== null; )
    l += "-" + d[1];
  var c = wn(a) + l;
  return {
    name: c,
    styles: a,
    next: re
  };
}
o(me, "serializeStyles");

// ../node_modules/@emotion/use-insertion-effect-with-fallbacks/dist/emotion-use-insertion-effect-with-fallbacks.esm.js
var Qe = W(require("react"));
var jo = typeof document < "u", Rn = /* @__PURE__ */ o(function(r) {
  return r();
}, "syncFallback"), An = Qe.useInsertionEffect ? Qe.useInsertionEffect : !1, $e = jo && An || Rn, lt = An || Qe.useLayoutEffect;

// ../node_modules/@emotion/react/dist/emotion-element-d59e098f.esm.js
var Pr = !1, Se = typeof document < "u", Ir = /* @__PURE__ */ N.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ Xe({
    key: "css"
  }) : null
), pt = Ir.Provider;
var he = /* @__PURE__ */ o(function(r) {
  return /* @__PURE__ */ (0, er.forwardRef)(function(t, n) {
    var a = (0, er.useContext)(Ir);
    return r(t, a, n);
  });
}, "withEmotionCache");
Se || (he = /* @__PURE__ */ o(function(r) {
  return function(t) {
    var n = (0, er.useContext)(Ir);
    return n === null ? (n = Xe({
      key: "css"
    }), /* @__PURE__ */ N.createElement(Ir.Provider, {
      value: n
    }, r(t, n))) : r(t, n);
  };
}, "withEmotionCache"));
var Z = /* @__PURE__ */ N.createContext({}), mt = /* @__PURE__ */ o(function() {
  return N.useContext(Z);
}, "useTheme"), Ho = /* @__PURE__ */ o(function(r, t) {
  if (typeof t == "function") {
    var n = t(r);
    return n;
  }
  return ye({}, r, t);
}, "getTheme"), Wo = /* @__PURE__ */ Ke(function(e) {
  return Ke(function(r) {
    return Ho(e, r);
  });
}), ht = /* @__PURE__ */ o(function(r) {
  var t = N.useContext(Z);
  return r.theme !== t && (t = Wo(t)(r.theme)), /* @__PURE__ */ N.createElement(Z.Provider, {
    value: t
  }, r.children);
}, "ThemeProvider");
function gt(e) {
  var r = e.displayName || e.name || "Component", t = /* @__PURE__ */ N.forwardRef(/* @__PURE__ */ o(function(a, i) {
    var s = N.useContext(Z);
    return /* @__PURE__ */ N.createElement(e, ye({
      theme: s,
      ref: i
    }, a));
  }, "render"));
  return t.displayName = "WithTheme(" + r + ")", xn(t, e);
}
o(gt, "withTheme");
var Mr = {}.hasOwnProperty, dt = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", _n = /* @__PURE__ */ o(function(r, t) {
  var n = {};
  for (var a in t)
    Mr.call(t, a) && (n[a] = t[a]);
  return n[dt] = r, n;
}, "createEmotionProps"), Uo = /* @__PURE__ */ o(function(r) {
  var t = r.cache, n = r.serialized, a = r.isStringTag;
  xe(t, n, a);
  var i = $e(function() {
    return we(t, n, a);
  });
  if (!Se && i !== void 0) {
    for (var s, u = n.name, f = n.next; f !== void 0; )
      u += " " + f.name, f = f.next;
    return /* @__PURE__ */ N.createElement("style", (s = {}, s["data-emotion"] = t.key + " " + u, s.dangerouslySetInnerHTML = {
      __html: i
    }, s.nonce = t.sheet.nonce, s));
  }
  return null;
}, "Insertion"), Vo = /* @__PURE__ */ he(function(e, r, t) {
  var n = e.css;
  typeof n == "string" && r.registered[n] !== void 0 && (n = r.registered[n]);
  var a = e[dt], i = [n], s = "";
  typeof e.className == "string" ? s = Be(r.registered, i, e.className) : e.className != null && (s = e.className + " ");
  var u = me(i, void 0, N.useContext(Z));
  s += r.key + "-" + u.name;
  var f = {};
  for (var l in e)
    Mr.call(e, l) && l !== "css" && l !== dt && !Pr && (f[l] = e[l]);
  return f.className = s, t && (f.ref = t), /* @__PURE__ */ N.createElement(N.Fragment, null, /* @__PURE__ */ N.createElement(Uo, {
    cache: r,
    serialized: u,
    isStringTag: typeof a == "string"
  }), /* @__PURE__ */ N.createElement(a, f));
}), Fn = Vo;

// ../node_modules/@emotion/react/dist/emotion-react.esm.js
var U = W(require("react"));
var el = W(Lr());
var tl = W(ut());
var kr = /* @__PURE__ */ o(function(r, t) {
  var n = arguments;
  if (t == null || !Mr.call(t, "css"))
    return U.createElement.apply(void 0, n);
  var a = n.length, i = new Array(a);
  i[0] = Fn, i[1] = _n(r, t);
  for (var s = 2; s < a; s++)
    i[s] = n[s];
  return U.createElement.apply(null, i);
}, "jsx");
(function(e) {
  var r;
  r || (r = e.JSX || (e.JSX = {}));
})(kr || (kr = {}));
var In = /* @__PURE__ */ he(function(e, r) {
  var t = e.styles, n = me([t], void 0, U.useContext(Z));
  if (!Se) {
    for (var a, i = n.name, s = n.styles, u = n.next; u !== void 0; )
      i += " " + u.name, s += u.styles, u = u.next;
    var f = r.compat === !0, l = r.insert("", {
      name: i,
      styles: s
    }, r.sheet, f);
    return f ? null : /* @__PURE__ */ U.createElement("style", (a = {}, a["data-emotion"] = r.key + "-global " + i, a.dangerouslySetInnerHTML =
    {
      __html: l
    }, a.nonce = r.sheet.nonce, a));
  }
  var d = U.useRef();
  return lt(function() {
    var c = r.key + "-global", m = new r.sheet.constructor({
      key: c,
      nonce: r.sheet.nonce,
      container: r.sheet.container,
      speedy: r.sheet.isSpeedy
    }), T = !1, y = document.querySelector('style[data-emotion="' + c + " " + n.name + '"]');
    return r.sheet.tags.length && (m.before = r.sheet.tags[0]), y !== null && (T = !0, y.setAttribute("data-emotion", c), m.hydrate([y])), d.
    current = [m, T], function() {
      m.flush();
    };
  }, [r]), lt(function() {
    var c = d.current, m = c[0], T = c[1];
    if (T) {
      c[1] = !1;
      return;
    }
    if (n.next !== void 0 && we(r, n.next, !0), m.tags.length) {
      var y = m.tags[m.tags.length - 1].nextElementSibling;
      m.before = y, m.flush();
    }
    r.insert("", n, m, !1);
  }, [r, n.name]), null;
});
function De() {
  for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
    r[t] = arguments[t];
  return me(r);
}
o(De, "css");
function Ee() {
  var e = De.apply(void 0, arguments), r = "animation-" + e.name;
  return {
    name: r,
    styles: "@keyframes " + r + "{" + e.styles + "}",
    anim: 1,
    toString: /* @__PURE__ */ o(function() {
      return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
    }, "toString")
  };
}
o(Ee, "keyframes");
var Go = /* @__PURE__ */ o(function e(r) {
  for (var t = r.length, n = 0, a = ""; n < t; n++) {
    var i = r[n];
    if (i != null) {
      var s = void 0;
      switch (typeof i) {
        case "boolean":
          break;
        case "object": {
          if (Array.isArray(i))
            s = e(i);
          else {
            s = "";
            for (var u in i)
              i[u] && u && (s && (s += " "), s += u);
          }
          break;
        }
        default:
          s = i;
      }
      s && (a && (a += " "), a += s);
    }
  }
  return a;
}, "classnames");
function qo(e, r, t) {
  var n = [], a = Be(e, n, t);
  return n.length < 2 ? t : a + r(n);
}
o(qo, "merge");
var Yo = /* @__PURE__ */ o(function(r) {
  var t = r.cache, n = r.serializedArr, a = $e(function() {
    for (var s = "", u = 0; u < n.length; u++) {
      var f = we(t, n[u], !1);
      !Se && f !== void 0 && (s += f);
    }
    if (!Se)
      return s;
  });
  if (!Se && a.length !== 0) {
    var i;
    return /* @__PURE__ */ U.createElement("style", (i = {}, i["data-emotion"] = t.key + " " + n.map(function(s) {
      return s.name;
    }).join(" "), i.dangerouslySetInnerHTML = {
      __html: a
    }, i.nonce = t.sheet.nonce, i));
  }
  return null;
}, "Insertion"), Pn = /* @__PURE__ */ he(function(e, r) {
  var t = !1, n = [], a = /* @__PURE__ */ o(function() {
    if (t && Pr)
      throw new Error("css can only be used during render");
    for (var l = arguments.length, d = new Array(l), c = 0; c < l; c++)
      d[c] = arguments[c];
    var m = me(d, r.registered);
    return n.push(m), xe(r, m, !1), r.key + "-" + m.name;
  }, "css"), i = /* @__PURE__ */ o(function() {
    if (t && Pr)
      throw new Error("cx can only be used during render");
    for (var l = arguments.length, d = new Array(l), c = 0; c < l; c++)
      d[c] = arguments[c];
    return qo(r.registered, a, Go(d));
  }, "cx"), s = {
    css: a,
    cx: i,
    theme: U.useContext(Z)
  }, u = e.children(s);
  return t = !0, /* @__PURE__ */ U.createElement(U.Fragment, null, /* @__PURE__ */ U.createElement(Yo, {
    cache: r,
    serializedArr: n
  }), u);
});

// ../node_modules/@emotion/styled/base/dist/emotion-styled-base.esm.js
var oe = W(require("react"));

// ../node_modules/@emotion/is-prop-valid/dist/emotion-is-prop-valid.esm.js
var Jo = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/,
zr = /* @__PURE__ */ Ne(
  function(e) {
    return Jo.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
);

// ../node_modules/@emotion/styled/base/dist/emotion-styled-base.esm.js
var Ko = typeof document < "u", Xo = !1, Zo = zr, Qo = /* @__PURE__ */ o(function(r) {
  return r !== "theme";
}, "testOmitPropsOnComponent"), Mn = /* @__PURE__ */ o(function(r) {
  return typeof r == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  r.charCodeAt(0) > 96 ? Zo : Qo;
}, "getDefaultShouldForwardProp"), Ln = /* @__PURE__ */ o(function(r, t, n) {
  var a;
  if (t) {
    var i = t.shouldForwardProp;
    a = r.__emotion_forwardProp && i ? function(s) {
      return r.__emotion_forwardProp(s) && i(s);
    } : i;
  }
  return typeof a != "function" && n && (a = r.__emotion_forwardProp), a;
}, "composeShouldForwardProps"), ei = /* @__PURE__ */ o(function(r) {
  var t = r.cache, n = r.serialized, a = r.isStringTag;
  xe(t, n, a);
  var i = $e(function() {
    return we(t, n, a);
  });
  if (!Ko && i !== void 0) {
    for (var s, u = n.name, f = n.next; f !== void 0; )
      u += " " + f.name, f = f.next;
    return /* @__PURE__ */ oe.createElement("style", (s = {}, s["data-emotion"] = t.key + " " + u, s.dangerouslySetInnerHTML = {
      __html: i
    }, s.nonce = t.sheet.nonce, s));
  }
  return null;
}, "Insertion"), kn = /* @__PURE__ */ o(function e(r, t) {
  var n = r.__emotion_real === r, a = n && r.__emotion_base || r, i, s;
  t !== void 0 && (i = t.label, s = t.target);
  var u = Ln(r, t, n), f = u || Mn(a), l = !f("as");
  return function() {
    var d = arguments, c = n && r.__emotion_styles !== void 0 ? r.__emotion_styles.slice(0) : [];
    if (i !== void 0 && c.push("label:" + i + ";"), d[0] == null || d[0].raw === void 0)
      c.push.apply(c, d);
    else {
      var m = d[0];
      c.push(m[0]);
      for (var T = d.length, y = 1; y < T; y++)
        c.push(d[y], m[y]);
    }
    var v = he(function(x, S, I) {
      var M = l && x.as || a, w = "", R = [], C = x;
      if (x.theme == null) {
        C = {};
        for (var E in x)
          C[E] = x[E];
        C.theme = oe.useContext(Z);
      }
      typeof x.className == "string" ? w = Be(S.registered, R, x.className) : x.className != null && (w = x.className + " ");
      var X = me(c.concat(R), S.registered, C);
      w += S.key + "-" + X.name, s !== void 0 && (w += " " + s);
      var ne = l && u === void 0 ? Mn(M) : f, q = {};
      for (var le in x)
        l && le === "as" || ne(le) && (q[le] = x[le]);
      return q.className = w, I && (q.ref = I), /* @__PURE__ */ oe.createElement(oe.Fragment, null, /* @__PURE__ */ oe.createElement(ei, {
        cache: S,
        serialized: X,
        isStringTag: typeof M == "string"
      }), /* @__PURE__ */ oe.createElement(M, q));
    });
    return v.displayName = i !== void 0 ? i : "Styled(" + (typeof a == "string" ? a : a.displayName || a.name || "Component") + ")", v.defaultProps =
    r.defaultProps, v.__emotion_real = v, v.__emotion_base = a, v.__emotion_styles = c, v.__emotion_forwardProp = u, Object.defineProperty(v,
    "toString", {
      value: /* @__PURE__ */ o(function() {
        return s === void 0 && Xo ? "NO_COMPONENT_SELECTOR" : "." + s;
      }, "value")
    }), v.withComponent = function(x, S) {
      var I = e(x, ye({}, t, S, {
        shouldForwardProp: Ln(v, S, !0)
      }));
      return I.apply(void 0, c);
    }, v;
  };
}, "createStyled");

// ../node_modules/@emotion/styled/dist/emotion-styled.esm.js
var bl = W(Lr());
var wl = require("react");
var ri = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "text",
  "tspan"
], Nr = kn.bind(null);
ri.forEach(function(e) {
  Nr[e] = Nr(e);
});

// src/theming/base.ts
var pa = W(jr(), 1), h = {
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
}, ee = {
  app: "#F6F9FC",
  bar: h.lightest,
  content: h.lightest,
  preview: h.lightest,
  gridCellSize: 10,
  hoverable: (0, pa.transparentize)(0.9, h.secondary),
  // hover state for items in a list
  // Notification, error, and warning backgrounds
  positive: "#E1FFD4",
  negative: "#FEDED2",
  warning: "#FFF5CF",
  critical: "#FF4400"
}, K = {
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

// src/theming/global.ts
var Mt = W(xa(), 1), Lt = (0, Mt.default)(1)(
  ({ typography: e }) => ({
    body: {
      fontFamily: e.fonts.base,
      fontSize: e.size.s3,
      margin: 0,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
      WebkitOverflowScrolling: "touch"
    },
    "*": {
      boxSizing: "border-box"
    },
    "h1, h2, h3, h4, h5, h6": {
      fontWeight: e.weight.regular,
      margin: 0,
      padding: 0
    },
    "button, input, textarea, select": {
      fontFamily: "inherit",
      fontSize: "inherit",
      boxSizing: "border-box"
    },
    sub: {
      fontSize: "0.8em",
      bottom: "-0.2em"
    },
    sup: {
      fontSize: "0.8em",
      top: "-0.2em"
    },
    "b, strong": {
      fontWeight: e.weight.bold
    },
    hr: {
      border: "none",
      borderTop: "1px solid silver",
      clear: "both",
      marginBottom: "1.25rem"
    },
    code: {
      fontFamily: e.fonts.mono,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      display: "inline-block",
      paddingLeft: 2,
      paddingRight: 2,
      verticalAlign: "baseline",
      color: "inherit"
    },
    pre: {
      fontFamily: e.fonts.mono,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      lineHeight: "18px",
      padding: "11px 1rem",
      whiteSpace: "pre-wrap",
      color: "inherit",
      borderRadius: 3,
      margin: "1rem 0"
    }
  })
), wa = (0, Mt.default)(1)(({
  color: e,
  background: r,
  typography: t
}) => {
  let n = Lt({ typography: t });
  return {
    ...n,
    body: {
      ...n.body,
      color: e.defaultText,
      background: r.app,
      overflow: "hidden"
    },
    hr: {
      ...n.hr,
      borderTop: `1px solid ${e.border}`
    }
  };
});

// src/theming/themes/dark.ts
var uf = {
  base: "dark",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: "#222425",
  appContentBg: "#1B1C1D",
  appPreviewBg: h.lightest,
  appBorderColor: "rgba(255,255,255,.1)",
  appBorderRadius: 4,
  // Fonts
  fontBase: K.fonts.base,
  fontCode: K.fonts.mono,
  // Text colors
  textColor: "#C9CDCF",
  textInverseColor: "#222425",
  textMutedColor: "#798186",
  // Toolbar default and active colors
  barTextColor: h.mediumdark,
  barHoverColor: h.secondary,
  barSelectedColor: h.secondary,
  barBg: "#292C2E",
  // Form colors
  buttonBg: "#222425",
  buttonBorder: "rgba(255,255,255,.1)",
  booleanBg: "#222425",
  booleanSelectedBg: "#2E3438",
  inputBg: "#1B1C1D",
  inputBorder: "rgba(255,255,255,.1)",
  inputTextColor: h.lightest,
  inputBorderRadius: 4
}, Sa = uf;

// src/theming/themes/light.ts
var ff = {
  base: "light",
  // Storybook-specific color palette
  colorPrimary: "#FF4785",
  // coral
  colorSecondary: "#029CFD",
  // ocean
  // UI
  appBg: ee.app,
  appContentBg: h.lightest,
  appPreviewBg: h.lightest,
  appBorderColor: h.border,
  appBorderRadius: 4,
  // Fonts
  fontBase: K.fonts.base,
  fontCode: K.fonts.mono,
  // Text colors
  textColor: h.darkest,
  textInverseColor: h.lightest,
  textMutedColor: h.dark,
  // Toolbar default and active colors
  barTextColor: h.mediumdark,
  barHoverColor: h.secondary,
  barSelectedColor: h.secondary,
  barBg: h.lightest,
  // Form colors
  buttonBg: ee.app,
  buttonBorder: h.medium,
  booleanBg: h.mediumlight,
  booleanSelectedBg: h.lightest,
  inputBg: h.lightest,
  inputBorder: h.border,
  inputTextColor: h.darkest,
  inputBorderRadius: 4
}, We = ff;

// src/theming/utils.ts
var Oa = W(Ca(), 1), Ra = require("@storybook/core/client-logger"), Ce = W(jr(), 1);
var { window: zt } = Oa.global, Aa = /* @__PURE__ */ o((e) => ({ color: e }), "mkColor"), bf = /* @__PURE__ */ o((e) => typeof e != "string" ?
(Ra.logger.warn(
  `Color passed to theme object should be a string. Instead ${e}(${typeof e}) was passed.`
), !1) : !0, "isColorString"), yf = /* @__PURE__ */ o((e) => !/(gradient|var|calc)/.test(e), "isValidColorForPolished"), vf = /* @__PURE__ */ o(
(e, r) => e === "darken" ? (0, Ce.rgba)(`${(0, Ce.darken)(1, r)}`, 0.95) : e === "lighten" ? (0, Ce.rgba)(`${(0, Ce.lighten)(1, r)}`, 0.95) :
r, "applyPolished"), _a = /* @__PURE__ */ o((e) => (r) => {
  if (!bf(r) || !yf(r))
    return r;
  try {
    return vf(e, r);
  } catch {
    return r;
  }
}, "colorFactory"), Fa = _a("lighten"), Ia = _a("darken"), Hr = /* @__PURE__ */ o(() => !zt || !zt.matchMedia ? "light" : zt.matchMedia("(pr\
efers-color-scheme: dark)").matches ? "dark" : "light", "getPreferredColorScheme");

// src/theming/create.ts
var Ue = {
  light: We,
  dark: Sa,
  normal: We
}, Nt = Hr(), xf = /* @__PURE__ */ o((e = { base: Nt }, r) => {
  let t = {
    ...Ue[Nt],
    ...Ue[e.base] || {},
    ...e,
    base: Ue[e.base] ? e.base : Nt
  };
  return {
    ...r,
    ...t,
    barSelectedColor: e.barSelectedColor || t.colorSecondary
  };
}, "create");

// src/theming/convert.ts
var Ba = W(jr(), 1);

// src/theming/animation.ts
var Pa = {
  rubber: "cubic-bezier(0.175, 0.885, 0.335, 1.05)"
}, wf = Ee`
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
`, Ma = Ee`
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
`, Sf = Ee`
  0% { transform: translateY(1px); }
  25% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(1px); }
`, Ef = Ee`
  0%, 100% { transform:translate3d(0,0,0); }
  12.5%, 62.5% { transform:translate3d(-4px,0,0); }
  37.5%, 87.5% {  transform: translate3d(4px,0,0);  }
`, Tf = De`
  animation: ${Ma} 1.5s ease-in-out infinite;
  color: transparent;
  cursor: progress;
`, Cf = De`
  transition: all 150ms ease-out;
  transform: translate3d(0, 0, 0);

  &:hover {
    transform: translate3d(0, -2px, 0);
  }

  &:active {
    transform: translate3d(0, 0, 0);
  }
`, La = {
  rotate360: wf,
  glow: Ma,
  float: Sf,
  jiggle: Ef,
  inlineGlow: Tf,
  hoverable: Cf
};

// src/theming/modules/syntax.ts
var ka = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "rgb(36, 36, 36)",
  BASE_COLOR: "rgb(213, 213, 213)",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(227, 110, 236)",
  OBJECT_VALUE_NULL_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(127, 127, 127)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_STRING_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(233, 63, 59)",
  OBJECT_VALUE_NUMBER_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_BOOLEAN_COLOR: "hsl(252, 100%, 75%)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(85, 106, 242)",
  HTML_TAG_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_COLOR: "rgb(93, 176, 215)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(155, 187, 220)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(242, 151, 102)",
  HTML_COMMENT_COLOR: "rgb(137, 137, 137)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "rgb(145, 145, 145)",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "rgb(85, 85, 85)",
  TABLE_TH_BACKGROUND_COLOR: "rgb(44, 44, 44)",
  TABLE_TH_HOVER_COLOR: "rgb(48, 48, 48)",
  TABLE_SORT_ICON_COLOR: "black",
  // 'rgb(48, 57, 66)',
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0) 50%, rgba(51, 139, 255, 0.0980392) 50%, rgba(\
51, 139, 255, 0.0980392))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, za = {
  BASE_FONT_FAMILY: "Menlo, monospace",
  BASE_FONT_SIZE: "11px",
  BASE_LINE_HEIGHT: 1.2,
  BASE_BACKGROUND_COLOR: "white",
  BASE_COLOR: "black",
  OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
  OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
  OBJECT_NAME_COLOR: "rgb(136, 19, 145)",
  OBJECT_VALUE_NULL_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_UNDEFINED_COLOR: "rgb(128, 128, 128)",
  OBJECT_VALUE_REGEXP_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_STRING_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_SYMBOL_COLOR: "rgb(196, 26, 22)",
  OBJECT_VALUE_NUMBER_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_BOOLEAN_COLOR: "rgb(28, 0, 207)",
  OBJECT_VALUE_FUNCTION_PREFIX_COLOR: "rgb(13, 34, 170)",
  HTML_TAG_COLOR: "rgb(168, 148, 166)",
  HTML_TAGNAME_COLOR: "rgb(136, 18, 128)",
  HTML_TAGNAME_TEXT_TRANSFORM: "lowercase",
  HTML_ATTRIBUTE_NAME_COLOR: "rgb(153, 69, 0)",
  HTML_ATTRIBUTE_VALUE_COLOR: "rgb(26, 26, 166)",
  HTML_COMMENT_COLOR: "rgb(35, 110, 37)",
  HTML_DOCTYPE_COLOR: "rgb(192, 192, 192)",
  ARROW_COLOR: "#6e6e6e",
  ARROW_MARGIN_RIGHT: 3,
  ARROW_FONT_SIZE: 12,
  ARROW_ANIMATION_DURATION: "0",
  TREENODE_FONT_FAMILY: "Menlo, monospace",
  TREENODE_FONT_SIZE: "11px",
  TREENODE_LINE_HEIGHT: 1.2,
  TREENODE_PADDING_LEFT: 12,
  TABLE_BORDER_COLOR: "#aaa",
  TABLE_TH_BACKGROUND_COLOR: "#eee",
  TABLE_TH_HOVER_COLOR: "hsla(0, 0%, 90%, 1)",
  TABLE_SORT_ICON_COLOR: "#6e6e6e",
  TABLE_DATA_BACKGROUND_IMAGE: "linear-gradient(to bottom, white, white 50%, rgb(234, 243, 255) 50%, rgb(234, 243, 255))",
  TABLE_DATA_BACKGROUND_SIZE: "128px 32px"
}, Of = /* @__PURE__ */ o((e) => Object.entries(e).reduce((r, [t, n]) => ({ ...r, [t]: Aa(n) }), {}), "convertColors"), Na = /* @__PURE__ */ o(
({ colors: e, mono: r }) => {
  let t = Of(e);
  return {
    token: {
      fontFamily: r,
      WebkitFontSmoothing: "antialiased",
      "&.tag": t.red3,
      "&.comment": { ...t.green1, fontStyle: "italic" },
      "&.prolog": { ...t.green1, fontStyle: "italic" },
      "&.doctype": { ...t.green1, fontStyle: "italic" },
      "&.cdata": { ...t.green1, fontStyle: "italic" },
      "&.string": t.red1,
      "&.url": t.cyan1,
      "&.symbol": t.cyan1,
      "&.number": t.cyan1,
      "&.boolean": t.cyan1,
      "&.variable": t.cyan1,
      "&.constant": t.cyan1,
      "&.inserted": t.cyan1,
      "&.atrule": t.blue1,
      "&.keyword": t.blue1,
      "&.attr-value": t.blue1,
      "&.punctuation": t.gray1,
      "&.operator": t.gray1,
      "&.function": t.gray1,
      "&.deleted": t.red2,
      "&.important": {
        fontWeight: "bold"
      },
      "&.bold": {
        fontWeight: "bold"
      },
      "&.italic": {
        fontStyle: "italic"
      },
      "&.class-name": t.cyan2,
      "&.selector": t.red3,
      "&.attr-name": t.red4,
      "&.property": t.red4,
      "&.regex": t.red4,
      "&.entity": t.red4,
      "&.directive.tag .tag": {
        background: "#ffff00",
        ...t.gray1
      }
    },
    "language-json .token.boolean": t.blue1,
    "language-json .token.number": t.blue1,
    "language-json .token.property": t.cyan2,
    namespace: {
      opacity: 0.7
    }
  };
}, "create");

// src/theming/convert.ts
var Rf = {
  green1: "#008000",
  red1: "#A31515",
  red2: "#9a050f",
  red3: "#800000",
  red4: "#ff0000",
  gray1: "#393A34",
  cyan1: "#36acaa",
  cyan2: "#2B91AF",
  blue1: "#0000ff",
  blue2: "#00009f"
}, Af = {
  green1: "#7C7C7C",
  red1: "#92C379",
  red2: "#9a050f",
  red3: "#A8FF60",
  red4: "#96CBFE",
  gray1: "#EDEDED",
  cyan1: "#C6C5FE",
  cyan2: "#FFFFB6",
  blue1: "#B474DD",
  blue2: "#00009f"
}, _f = /* @__PURE__ */ o((e) => ({
  // Changeable colors
  primary: e.colorPrimary,
  secondary: e.colorSecondary,
  tertiary: h.tertiary,
  ancillary: h.ancillary,
  // Complimentary
  orange: h.orange,
  gold: h.gold,
  green: h.green,
  seafoam: h.seafoam,
  purple: h.purple,
  ultraviolet: h.ultraviolet,
  // Monochrome
  lightest: h.lightest,
  lighter: h.lighter,
  light: h.light,
  mediumlight: h.mediumlight,
  medium: h.medium,
  mediumdark: h.mediumdark,
  dark: h.dark,
  darker: h.darker,
  darkest: h.darkest,
  // For borders
  border: h.border,
  // Status
  positive: h.positive,
  negative: h.negative,
  warning: h.warning,
  critical: h.critical,
  defaultText: e.textColor || h.darkest,
  inverseText: e.textInverseColor || h.lightest,
  positiveText: h.positiveText,
  negativeText: h.negativeText,
  warningText: h.warningText
}), "createColors"), Wr = /* @__PURE__ */ o((e = Ue[Hr()]) => {
  let {
    base: r,
    colorPrimary: t,
    colorSecondary: n,
    appBg: a,
    appContentBg: i,
    appPreviewBg: s,
    appBorderColor: u,
    appBorderRadius: f,
    fontBase: l,
    fontCode: d,
    textColor: c,
    textInverseColor: m,
    barTextColor: T,
    barHoverColor: y,
    barSelectedColor: v,
    barBg: x,
    buttonBg: S,
    buttonBorder: I,
    booleanBg: M,
    booleanSelectedBg: w,
    inputBg: R,
    inputBorder: C,
    inputTextColor: E,
    inputBorderRadius: X,
    brandTitle: ne,
    brandUrl: q,
    brandImage: le,
    brandTarget: Vr,
    gridCellSize: Gr,
    ...qr
  } = e;
  return {
    ...qr,
    base: r,
    color: _f(e),
    background: {
      app: a,
      bar: x,
      content: i,
      preview: s,
      gridCellSize: Gr || ee.gridCellSize,
      hoverable: ee.hoverable,
      positive: ee.positive,
      negative: ee.negative,
      warning: ee.warning,
      critical: ee.critical
    },
    typography: {
      fonts: {
        base: l,
        mono: d
      },
      weight: K.weight,
      size: K.size
    },
    animation: La,
    easing: Pa,
    input: {
      background: R,
      border: C,
      borderRadius: X,
      color: E
    },
    button: {
      background: S || R,
      border: I || C
    },
    boolean: {
      background: M || C,
      selectedBackground: w || R
    },
    // UI
    layoutMargin: 10,
    appBorderColor: u,
    appBorderRadius: f,
    // Toolbar default/active colors
    barTextColor: T,
    barHoverColor: y || n,
    barSelectedColor: v || n,
    barBg: x,
    // Brand logo/text
    brand: {
      title: ne,
      url: q,
      image: le || (ne ? null : void 0),
      target: Vr
    },
    code: Na({
      colors: r === "light" ? Rf : Af,
      mono: d
    }),
    // Addon actions theme
    // API example https://github.com/storybookjs/react-inspector/blob/master/src/styles/themes/chromeLight.tsx
    addonActionsTheme: {
      ...r === "light" ? za : ka,
      BASE_FONT_FAMILY: d,
      BASE_FONT_SIZE: K.size.s2 - 1,
      BASE_LINE_HEIGHT: "18px",
      BASE_BACKGROUND_COLOR: "transparent",
      BASE_COLOR: c,
      ARROW_COLOR: (0, Ba.opacify)(0.2, u),
      ARROW_MARGIN_RIGHT: 4,
      ARROW_FONT_SIZE: 8,
      TREENODE_FONT_FAMILY: d,
      TREENODE_FONT_SIZE: K.size.s2 - 1,
      TREENODE_LINE_HEIGHT: "18px",
      TREENODE_PADDING_LEFT: 12
    }
  };
}, "convert");

// src/theming/ensure.ts
var Ha = require("@storybook/core/client-logger");

// ../node_modules/deep-object-diff/mjs/utils.js
var Bt = /* @__PURE__ */ o((e) => Object.keys(e).length === 0, "isEmpty"), Oe = /* @__PURE__ */ o((e) => e != null && typeof e == "object", "\
isObject"), cr = /* @__PURE__ */ o((e, ...r) => Object.prototype.hasOwnProperty.call(e, ...r), "hasOwnProperty");
var lr = /* @__PURE__ */ o(() => /* @__PURE__ */ Object.create(null), "makeObjectWithoutPrototype");

// ../node_modules/deep-object-diff/mjs/deleted.js
var $a = /* @__PURE__ */ o((e, r) => e === r || !Oe(e) || !Oe(r) ? {} : Object.keys(e).reduce((t, n) => {
  if (cr(r, n)) {
    let a = $a(e[n], r[n]);
    return Oe(a) && Bt(a) || (t[n] = a), t;
  }
  return t[n] = void 0, t;
}, lr()), "deletedDiff"), Ur = $a;

// src/theming/ensure.ts
var Wa = W(ja(), 1);
var Lf = /* @__PURE__ */ o((e) => {
  if (!e)
    return Wr(We);
  let r = Ur(We, e);
  return Object.keys(r).length && Ha.logger.warn(
    Wa.dedent`
          Your theme is missing properties, you should update your theme!

          theme-data missing:
        `,
    r
  ), Wr(e);
}, "ensure");

// src/theming/index.ts
var kf = "/* emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason */";
