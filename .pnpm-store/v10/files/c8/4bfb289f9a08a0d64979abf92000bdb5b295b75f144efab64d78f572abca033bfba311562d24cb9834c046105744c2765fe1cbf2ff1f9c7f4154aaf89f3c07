var zn = Object.create;
var br = Object.defineProperty;
var Vn = Object.getOwnPropertyDescriptor;
var Hn = Object.getOwnPropertyNames;
var Wn = Object.getPrototypeOf, $n = Object.prototype.hasOwnProperty;
var s = (r, e) => br(r, "name", { value: e, configurable: !0 }), Fe = /* @__PURE__ */ ((r) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(r, {
  get: (e, t) => (typeof require < "u" ? require : e)[t]
}) : r)(function(r) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + r + '" is not supported');
});
var k = (r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports);
var Yn = (r, e, t, o) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let n of Hn(e))
      !$n.call(r, n) && n !== t && br(r, n, { get: () => e[n], enumerable: !(o = Vn(e, n)) || o.enumerable });
  return r;
};
var he = (r, e, t) => (t = r != null ? zn(Wn(r)) : {}, Yn(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !r || !r.__esModule ? br(t, "default", { value: r, enumerable: !0 }) : t,
  r
));

// ../node_modules/memoizerific/memoizerific.js
var _r = k((io, Mr) => {
  (function(r) {
    if (typeof io == "object" && typeof Mr < "u")
      Mr.exports = r();
    else if (typeof define == "function" && define.amd)
      define([], r);
    else {
      var e;
      typeof window < "u" ? e = window : typeof global < "u" ? e = global : typeof self < "u" ? e = self : e = this, e.memoizerific = r();
    }
  })(function() {
    var r, e, t;
    return (/* @__PURE__ */ s(function o(n, i, a) {
      function l(p, u) {
        if (!i[p]) {
          if (!n[p]) {
            var y = typeof Fe == "function" && Fe;
            if (!u && y) return y(p, !0);
            if (c) return c(p, !0);
            var m = new Error("Cannot find module '" + p + "'");
            throw m.code = "MODULE_NOT_FOUND", m;
          }
          var g = i[p] = { exports: {} };
          n[p][0].call(g.exports, function(S) {
            var h = n[p][1][S];
            return l(h || S);
          }, g, g.exports, o, n, i, a);
        }
        return i[p].exports;
      }
      s(l, "s");
      for (var c = typeof Fe == "function" && Fe, d = 0; d < a.length; d++) l(a[d]);
      return l;
    }, "e"))({ 1: [function(o, n, i) {
      n.exports = function(a) {
        if (typeof Map != "function" || a) {
          var l = o("./similar");
          return new l();
        } else
          return /* @__PURE__ */ new Map();
      };
    }, { "./similar": 2 }], 2: [function(o, n, i) {
      function a() {
        return this.list = [], this.lastItem = void 0, this.size = 0, this;
      }
      s(a, "Similar"), a.prototype.get = function(l) {
        var c;
        if (this.lastItem && this.isEqual(this.lastItem.key, l))
          return this.lastItem.val;
        if (c = this.indexOf(l), c >= 0)
          return this.lastItem = this.list[c], this.list[c].val;
      }, a.prototype.set = function(l, c) {
        var d;
        return this.lastItem && this.isEqual(this.lastItem.key, l) ? (this.lastItem.val = c, this) : (d = this.indexOf(l), d >= 0 ? (this.lastItem =
        this.list[d], this.list[d].val = c, this) : (this.lastItem = { key: l, val: c }, this.list.push(this.lastItem), this.size++, this));
      }, a.prototype.delete = function(l) {
        var c;
        if (this.lastItem && this.isEqual(this.lastItem.key, l) && (this.lastItem = void 0), c = this.indexOf(l), c >= 0)
          return this.size--, this.list.splice(c, 1)[0];
      }, a.prototype.has = function(l) {
        var c;
        return this.lastItem && this.isEqual(this.lastItem.key, l) ? !0 : (c = this.indexOf(l), c >= 0 ? (this.lastItem = this.list[c], !0) :
        !1);
      }, a.prototype.forEach = function(l, c) {
        var d;
        for (d = 0; d < this.size; d++)
          l.call(c || this, this.list[d].val, this.list[d].key, this);
      }, a.prototype.indexOf = function(l) {
        var c;
        for (c = 0; c < this.size; c++)
          if (this.isEqual(this.list[c].key, l))
            return c;
        return -1;
      }, a.prototype.isEqual = function(l, c) {
        return l === c || l !== l && c !== c;
      }, n.exports = a;
    }, {}], 3: [function(o, n, i) {
      var a = o("map-or-similar");
      n.exports = function(p) {
        var u = new a(!1), y = [];
        return function(m) {
          var g = /* @__PURE__ */ s(function() {
            var S = u, h, E, R = arguments.length - 1, f = Array(R + 1), b = !0, x;
            if ((g.numArgs || g.numArgs === 0) && g.numArgs !== R + 1)
              throw new Error("Memoizerific functions should always be called with the same number of arguments");
            for (x = 0; x < R; x++) {
              if (f[x] = {
                cacheItem: S,
                arg: arguments[x]
              }, S.has(arguments[x])) {
                S = S.get(arguments[x]);
                continue;
              }
              b = !1, h = new a(!1), S.set(arguments[x], h), S = h;
            }
            return b && (S.has(arguments[R]) ? E = S.get(arguments[R]) : b = !1), b || (E = m.apply(null, arguments), S.set(arguments[R], E)),
            p > 0 && (f[R] = {
              cacheItem: S,
              arg: arguments[R]
            }, b ? l(y, f) : y.push(f), y.length > p && c(y.shift())), g.wasMemoized = b, g.numArgs = R + 1, E;
          }, "memoizerific");
          return g.limit = p, g.wasMemoized = !1, g.cache = u, g.lru = y, g;
        };
      };
      function l(p, u) {
        var y = p.length, m = u.length, g, S, h;
        for (S = 0; S < y; S++) {
          for (g = !0, h = 0; h < m; h++)
            if (!d(p[S][h].arg, u[h].arg)) {
              g = !1;
              break;
            }
          if (g)
            break;
        }
        p.push(p.splice(S, 1)[0]);
      }
      s(l, "moveToMostRecentLru");
      function c(p) {
        var u = p.length, y = p[u - 1], m, g;
        for (y.cacheItem.delete(y.arg), g = u - 2; g >= 0 && (y = p[g], m = y.cacheItem.get(y.arg), !m || !m.size); g--)
          y.cacheItem.delete(y.arg);
      }
      s(c, "removeCachedResult");
      function d(p, u) {
        return p === u || p !== p && u !== u;
      }
      s(d, "isEqual");
    }, { "map-or-similar": 1 }] }, {}, [3])(3);
  });
});

// ../node_modules/picoquery/lib/string-util.js
var dt = k((ct) => {
  "use strict";
  Object.defineProperty(ct, "__esModule", { value: !0 });
  ct.encodeString = ta;
  var H = Array.from({ length: 256 }, (r, e) => "%" + ((e < 16 ? "0" : "") + e.toString(16)).toUpperCase()), ra = new Int8Array([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    0
  ]);
  function ta(r) {
    let e = r.length;
    if (e === 0)
      return "";
    let t = "", o = 0, n = 0;
    e: for (; n < e; n++) {
      let i = r.charCodeAt(n);
      for (; i < 128; ) {
        if (ra[i] !== 1 && (o < n && (t += r.slice(o, n)), o = n + 1, t += H[i]), ++n === e)
          break e;
        i = r.charCodeAt(n);
      }
      if (o < n && (t += r.slice(o, n)), i < 2048) {
        o = n + 1, t += H[192 | i >> 6] + H[128 | i & 63];
        continue;
      }
      if (i < 55296 || i >= 57344) {
        o = n + 1, t += H[224 | i >> 12] + H[128 | i >> 6 & 63] + H[128 | i & 63];
        continue;
      }
      if (++n, n >= e)
        throw new Error("URI malformed");
      let a = r.charCodeAt(n) & 1023;
      o = n + 1, i = 65536 + ((i & 1023) << 10 | a), t += H[240 | i >> 18] + H[128 | i >> 12 & 63] + H[128 | i >> 6 & 63] + H[128 | i & 63];
    }
    return o === 0 ? r : o < e ? t + r.slice(o) : t;
  }
  s(ta, "encodeString");
});

// ../node_modules/picoquery/lib/shared.js
var sr = k((W) => {
  "use strict";
  Object.defineProperty(W, "__esModule", { value: !0 });
  W.defaultOptions = W.defaultShouldSerializeObject = W.defaultValueSerializer = void 0;
  var pt = dt(), oa = /* @__PURE__ */ s((r) => {
    switch (typeof r) {
      case "string":
        return (0, pt.encodeString)(r);
      case "bigint":
      case "boolean":
        return "" + r;
      case "number":
        if (Number.isFinite(r))
          return r < 1e21 ? "" + r : (0, pt.encodeString)("" + r);
        break;
    }
    return r instanceof Date ? (0, pt.encodeString)(r.toISOString()) : "";
  }, "defaultValueSerializer");
  W.defaultValueSerializer = oa;
  var na = /* @__PURE__ */ s((r) => r instanceof Date, "defaultShouldSerializeObject");
  W.defaultShouldSerializeObject = na;
  var Bo = /* @__PURE__ */ s((r) => r, "identityFunc");
  W.defaultOptions = {
    nesting: !0,
    nestingSyntax: "dot",
    arrayRepeat: !1,
    arrayRepeatSyntax: "repeat",
    delimiter: 38,
    valueDeserializer: Bo,
    valueSerializer: W.defaultValueSerializer,
    keyDeserializer: Bo,
    shouldSerializeObject: W.defaultShouldSerializeObject
  };
});

// ../node_modules/picoquery/lib/object-util.js
var ut = k((ir) => {
  "use strict";
  Object.defineProperty(ir, "__esModule", { value: !0 });
  ir.getDeepObject = aa;
  ir.stringifyObject = zo;
  var de = sr(), sa = dt();
  function ia(r) {
    return r === "__proto__" || r === "constructor" || r === "prototype";
  }
  s(ia, "isPrototypeKey");
  function aa(r, e, t, o, n) {
    if (ia(e))
      return r;
    let i = r[e];
    return typeof i == "object" && i !== null ? i : !o && (n || typeof t == "number" || typeof t == "string" && t * 0 === 0 && t.indexOf(".") ===
    -1) ? r[e] = [] : r[e] = {};
  }
  s(aa, "getDeepObject");
  var la = 20, ca = "[]", da = "[", pa = "]", ua = ".";
  function zo(r, e, t = 0, o, n) {
    let { nestingSyntax: i = de.defaultOptions.nestingSyntax, arrayRepeat: a = de.defaultOptions.arrayRepeat, arrayRepeatSyntax: l = de.defaultOptions.
    arrayRepeatSyntax, nesting: c = de.defaultOptions.nesting, delimiter: d = de.defaultOptions.delimiter, valueSerializer: p = de.defaultOptions.
    valueSerializer, shouldSerializeObject: u = de.defaultOptions.shouldSerializeObject } = e, y = typeof d == "number" ? String.fromCharCode(
    d) : d, m = n === !0 && a, g = i === "dot" || i === "js" && !n;
    if (t > la)
      return "";
    let S = "", h = !0, E = !1;
    for (let R in r) {
      let f = r[R], b;
      o ? (b = o, m ? l === "bracket" && (b += ca) : g ? (b += ua, b += R) : (b += da, b += R, b += pa)) : b = R, h || (S += y), typeof f ==
      "object" && f !== null && !u(f) ? (E = f.pop !== void 0, (c || a && E) && (S += zo(f, e, t + 1, b, E))) : (S += (0, sa.encodeString)(b),
      S += "=", S += p(f, R)), h && (h = !1);
    }
    return S;
  }
  s(zo, "stringifyObject");
});

// ../node_modules/fast-decode-uri-component/index.js
var $o = k((df, Wo) => {
  "use strict";
  var Vo = 12, fa = 0, ft = [
    // The first part of the table maps bytes to character to a transition.
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    4,
    4,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    6,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    8,
    7,
    7,
    10,
    9,
    9,
    9,
    11,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    // The second part of the table maps a state to a new state when adding a
    // transition.
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    12,
    0,
    0,
    0,
    0,
    24,
    36,
    48,
    60,
    72,
    84,
    96,
    0,
    12,
    12,
    12,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    48,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    // The third part maps the current transition to a mask that needs to apply
    // to the byte.
    127,
    63,
    63,
    63,
    0,
    31,
    15,
    15,
    15,
    7,
    7,
    7
  ];
  function ya(r) {
    var e = r.indexOf("%");
    if (e === -1) return r;
    for (var t = r.length, o = "", n = 0, i = 0, a = e, l = Vo; e > -1 && e < t; ) {
      var c = Ho(r[e + 1], 4), d = Ho(r[e + 2], 0), p = c | d, u = ft[p];
      if (l = ft[256 + l + u], i = i << 6 | p & ft[364 + u], l === Vo)
        o += r.slice(n, a), o += i <= 65535 ? String.fromCharCode(i) : String.fromCharCode(
          55232 + (i >> 10),
          56320 + (i & 1023)
        ), i = 0, n = e + 3, e = a = r.indexOf("%", n);
      else {
        if (l === fa)
          return null;
        if (e += 3, e < t && r.charCodeAt(e) === 37) continue;
        return null;
      }
    }
    return o + r.slice(n);
  }
  s(ya, "decodeURIComponent");
  var ha = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    a: 10,
    A: 10,
    b: 11,
    B: 11,
    c: 12,
    C: 12,
    d: 13,
    D: 13,
    e: 14,
    E: 14,
    f: 15,
    F: 15
  };
  function Ho(r, e) {
    var t = ha[r];
    return t === void 0 ? 255 : t << e;
  }
  s(Ho, "hexCodeToInt");
  Wo.exports = ya;
});

// ../node_modules/picoquery/lib/parse.js
var Jo = k((X) => {
  "use strict";
  var ma = X && X.__importDefault || function(r) {
    return r && r.__esModule ? r : { default: r };
  };
  Object.defineProperty(X, "__esModule", { value: !0 });
  X.numberValueDeserializer = X.numberKeyDeserializer = void 0;
  X.parse = ba;
  var ar = ut(), pe = sr(), Yo = ma($o()), ga = /* @__PURE__ */ s((r) => {
    let e = Number(r);
    return Number.isNaN(e) ? r : e;
  }, "numberKeyDeserializer");
  X.numberKeyDeserializer = ga;
  var Sa = /* @__PURE__ */ s((r) => {
    let e = Number(r);
    return Number.isNaN(e) ? r : e;
  }, "numberValueDeserializer");
  X.numberValueDeserializer = Sa;
  var Ko = /\+/g, Xo = /* @__PURE__ */ s(function() {
  }, "Empty");
  Xo.prototype = /* @__PURE__ */ Object.create(null);
  function lr(r, e, t, o, n) {
    let i = r.substring(e, t);
    return o && (i = i.replace(Ko, " ")), n && (i = (0, Yo.default)(i) || i), i;
  }
  s(lr, "computeKeySlice");
  function ba(r, e) {
    let { valueDeserializer: t = pe.defaultOptions.valueDeserializer, keyDeserializer: o = pe.defaultOptions.keyDeserializer, arrayRepeatSyntax: n = pe.
    defaultOptions.arrayRepeatSyntax, nesting: i = pe.defaultOptions.nesting, arrayRepeat: a = pe.defaultOptions.arrayRepeat, nestingSyntax: l = pe.
    defaultOptions.nestingSyntax, delimiter: c = pe.defaultOptions.delimiter } = e ?? {}, d = typeof c == "string" ? c.charCodeAt(0) : c, p = l ===
    "js", u = new Xo();
    if (typeof r != "string")
      return u;
    let y = r.length, m = "", g = -1, S = -1, h = -1, E = u, R, f = "", b = "", x = !1, w = !1, A = !1, O = !1, N = !1, U = !1, ye = !1, C = 0,
    z = -1, Ce = -1, Pt = -1;
    for (let D = 0; D < y + 1; D++) {
      if (C = D !== y ? r.charCodeAt(D) : d, C === d) {
        if (ye = S > g, ye || (S = D), h !== S - 1 && (b = lr(r, h + 1, z > -1 ? z : S, A, x), f = o(b), R !== void 0 && (E = (0, ar.getDeepObject)(
        E, R, f, p && N, p && U))), ye || f !== "") {
          ye && (m = r.slice(S + 1, D), O && (m = m.replace(Ko, " ")), w && (m = (0, Yo.default)(m) || m));
          let Pe = t(m, f);
          if (a) {
            let Ve = E[f];
            Ve === void 0 ? z > -1 ? E[f] = [Pe] : E[f] = Pe : Ve.pop ? Ve.push(Pe) : E[f] = [Ve, Pe];
          } else
            E[f] = Pe;
        }
        m = "", g = D, S = D, x = !1, w = !1, A = !1, O = !1, N = !1, U = !1, z = -1, h = D, E = u, R = void 0, f = "";
      } else C === 93 ? (a && n === "bracket" && Pt === 91 && (z = Ce), i && (l === "index" || p) && S <= g && (h !== Ce && (b = lr(r, h + 1,
      D, A, x), f = o(b), R !== void 0 && (E = (0, ar.getDeepObject)(E, R, f, void 0, p)), R = f, A = !1, x = !1), h = D, U = !0, N = !1)) :
      C === 46 ? i && (l === "dot" || p) && S <= g && (h !== Ce && (b = lr(r, h + 1, D, A, x), f = o(b), R !== void 0 && (E = (0, ar.getDeepObject)(
      E, R, f, p)), R = f, A = !1, x = !1), N = !0, U = !1, h = D) : C === 91 ? i && (l === "index" || p) && S <= g && (h !== Ce && (b = lr(
      r, h + 1, D, A, x), f = o(b), p && R !== void 0 && (E = (0, ar.getDeepObject)(E, R, f, p)), R = f, A = !1, x = !1, N = !1, U = !0), h =
      D) : C === 61 ? S <= g ? S = D : w = !0 : C === 43 ? S > g ? O = !0 : A = !0 : C === 37 && (S > g ? w = !0 : x = !0);
      Ce = D, Pt = C;
    }
    return u;
  }
  s(ba, "parse");
});

// ../node_modules/picoquery/lib/stringify.js
var Qo = k((yt) => {
  "use strict";
  Object.defineProperty(yt, "__esModule", { value: !0 });
  yt.stringify = Ea;
  var Ta = ut();
  function Ea(r, e) {
    if (r === null || typeof r != "object")
      return "";
    let t = e ?? {};
    return (0, Ta.stringifyObject)(r, t);
  }
  s(Ea, "stringify");
});

// ../node_modules/picoquery/lib/main.js
var cr = k((B) => {
  "use strict";
  var Ra = B && B.__createBinding || (Object.create ? function(r, e, t, o) {
    o === void 0 && (o = t);
    var n = Object.getOwnPropertyDescriptor(e, t);
    (!n || ("get" in n ? !e.__esModule : n.writable || n.configurable)) && (n = { enumerable: !0, get: /* @__PURE__ */ s(function() {
      return e[t];
    }, "get") }), Object.defineProperty(r, o, n);
  } : function(r, e, t, o) {
    o === void 0 && (o = t), r[o] = e[t];
  }), xa = B && B.__exportStar || function(r, e) {
    for (var t in r) t !== "default" && !Object.prototype.hasOwnProperty.call(e, t) && Ra(e, r, t);
  };
  Object.defineProperty(B, "__esModule", { value: !0 });
  B.stringify = B.parse = void 0;
  var wa = Jo();
  Object.defineProperty(B, "parse", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return wa.parse;
  }, "get") });
  var va = Qo();
  Object.defineProperty(B, "stringify", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return va.stringify;
  }, "get") });
  xa(sr(), B);
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/maps/entities.json
var St = k((Cf, ka) => {
  ka.exports = { Aacute: "\xC1", aacute: "\xE1", Abreve: "\u0102", abreve: "\u0103", ac: "\u223E", acd: "\u223F", acE: "\u223E\u0333", Acirc: "\
\xC2", acirc: "\xE2", acute: "\xB4", Acy: "\u0410", acy: "\u0430", AElig: "\xC6", aelig: "\xE6", af: "\u2061", Afr: "\u{1D504}", afr: "\u{1D51E}",
  Agrave: "\xC0", agrave: "\xE0", alefsym: "\u2135", aleph: "\u2135", Alpha: "\u0391", alpha: "\u03B1", Amacr: "\u0100", amacr: "\u0101", amalg: "\
\u2A3F", amp: "&", AMP: "&", andand: "\u2A55", And: "\u2A53", and: "\u2227", andd: "\u2A5C", andslope: "\u2A58", andv: "\u2A5A", ang: "\u2220",
  ange: "\u29A4", angle: "\u2220", angmsdaa: "\u29A8", angmsdab: "\u29A9", angmsdac: "\u29AA", angmsdad: "\u29AB", angmsdae: "\u29AC", angmsdaf: "\
\u29AD", angmsdag: "\u29AE", angmsdah: "\u29AF", angmsd: "\u2221", angrt: "\u221F", angrtvb: "\u22BE", angrtvbd: "\u299D", angsph: "\u2222",
  angst: "\xC5", angzarr: "\u237C", Aogon: "\u0104", aogon: "\u0105", Aopf: "\u{1D538}", aopf: "\u{1D552}", apacir: "\u2A6F", ap: "\u2248", apE: "\
\u2A70", ape: "\u224A", apid: "\u224B", apos: "'", ApplyFunction: "\u2061", approx: "\u2248", approxeq: "\u224A", Aring: "\xC5", aring: "\xE5",
  Ascr: "\u{1D49C}", ascr: "\u{1D4B6}", Assign: "\u2254", ast: "*", asymp: "\u2248", asympeq: "\u224D", Atilde: "\xC3", atilde: "\xE3", Auml: "\
\xC4", auml: "\xE4", awconint: "\u2233", awint: "\u2A11", backcong: "\u224C", backepsilon: "\u03F6", backprime: "\u2035", backsim: "\u223D",
  backsimeq: "\u22CD", Backslash: "\u2216", Barv: "\u2AE7", barvee: "\u22BD", barwed: "\u2305", Barwed: "\u2306", barwedge: "\u2305", bbrk: "\
\u23B5", bbrktbrk: "\u23B6", bcong: "\u224C", Bcy: "\u0411", bcy: "\u0431", bdquo: "\u201E", becaus: "\u2235", because: "\u2235", Because: "\
\u2235", bemptyv: "\u29B0", bepsi: "\u03F6", bernou: "\u212C", Bernoullis: "\u212C", Beta: "\u0392", beta: "\u03B2", beth: "\u2136", between: "\
\u226C", Bfr: "\u{1D505}", bfr: "\u{1D51F}", bigcap: "\u22C2", bigcirc: "\u25EF", bigcup: "\u22C3", bigodot: "\u2A00", bigoplus: "\u2A01", bigotimes: "\
\u2A02", bigsqcup: "\u2A06", bigstar: "\u2605", bigtriangledown: "\u25BD", bigtriangleup: "\u25B3", biguplus: "\u2A04", bigvee: "\u22C1", bigwedge: "\
\u22C0", bkarow: "\u290D", blacklozenge: "\u29EB", blacksquare: "\u25AA", blacktriangle: "\u25B4", blacktriangledown: "\u25BE", blacktriangleleft: "\
\u25C2", blacktriangleright: "\u25B8", blank: "\u2423", blk12: "\u2592", blk14: "\u2591", blk34: "\u2593", block: "\u2588", bne: "=\u20E5", bnequiv: "\
\u2261\u20E5", bNot: "\u2AED", bnot: "\u2310", Bopf: "\u{1D539}", bopf: "\u{1D553}", bot: "\u22A5", bottom: "\u22A5", bowtie: "\u22C8", boxbox: "\
\u29C9", boxdl: "\u2510", boxdL: "\u2555", boxDl: "\u2556", boxDL: "\u2557", boxdr: "\u250C", boxdR: "\u2552", boxDr: "\u2553", boxDR: "\u2554",
  boxh: "\u2500", boxH: "\u2550", boxhd: "\u252C", boxHd: "\u2564", boxhD: "\u2565", boxHD: "\u2566", boxhu: "\u2534", boxHu: "\u2567", boxhU: "\
\u2568", boxHU: "\u2569", boxminus: "\u229F", boxplus: "\u229E", boxtimes: "\u22A0", boxul: "\u2518", boxuL: "\u255B", boxUl: "\u255C", boxUL: "\
\u255D", boxur: "\u2514", boxuR: "\u2558", boxUr: "\u2559", boxUR: "\u255A", boxv: "\u2502", boxV: "\u2551", boxvh: "\u253C", boxvH: "\u256A",
  boxVh: "\u256B", boxVH: "\u256C", boxvl: "\u2524", boxvL: "\u2561", boxVl: "\u2562", boxVL: "\u2563", boxvr: "\u251C", boxvR: "\u255E", boxVr: "\
\u255F", boxVR: "\u2560", bprime: "\u2035", breve: "\u02D8", Breve: "\u02D8", brvbar: "\xA6", bscr: "\u{1D4B7}", Bscr: "\u212C", bsemi: "\u204F",
  bsim: "\u223D", bsime: "\u22CD", bsolb: "\u29C5", bsol: "\\", bsolhsub: "\u27C8", bull: "\u2022", bullet: "\u2022", bump: "\u224E", bumpE: "\
\u2AAE", bumpe: "\u224F", Bumpeq: "\u224E", bumpeq: "\u224F", Cacute: "\u0106", cacute: "\u0107", capand: "\u2A44", capbrcup: "\u2A49", capcap: "\
\u2A4B", cap: "\u2229", Cap: "\u22D2", capcup: "\u2A47", capdot: "\u2A40", CapitalDifferentialD: "\u2145", caps: "\u2229\uFE00", caret: "\u2041",
  caron: "\u02C7", Cayleys: "\u212D", ccaps: "\u2A4D", Ccaron: "\u010C", ccaron: "\u010D", Ccedil: "\xC7", ccedil: "\xE7", Ccirc: "\u0108", ccirc: "\
\u0109", Cconint: "\u2230", ccups: "\u2A4C", ccupssm: "\u2A50", Cdot: "\u010A", cdot: "\u010B", cedil: "\xB8", Cedilla: "\xB8", cemptyv: "\u29B2",
  cent: "\xA2", centerdot: "\xB7", CenterDot: "\xB7", cfr: "\u{1D520}", Cfr: "\u212D", CHcy: "\u0427", chcy: "\u0447", check: "\u2713", checkmark: "\
\u2713", Chi: "\u03A7", chi: "\u03C7", circ: "\u02C6", circeq: "\u2257", circlearrowleft: "\u21BA", circlearrowright: "\u21BB", circledast: "\
\u229B", circledcirc: "\u229A", circleddash: "\u229D", CircleDot: "\u2299", circledR: "\xAE", circledS: "\u24C8", CircleMinus: "\u2296", CirclePlus: "\
\u2295", CircleTimes: "\u2297", cir: "\u25CB", cirE: "\u29C3", cire: "\u2257", cirfnint: "\u2A10", cirmid: "\u2AEF", cirscir: "\u29C2", ClockwiseContourIntegral: "\
\u2232", CloseCurlyDoubleQuote: "\u201D", CloseCurlyQuote: "\u2019", clubs: "\u2663", clubsuit: "\u2663", colon: ":", Colon: "\u2237", Colone: "\
\u2A74", colone: "\u2254", coloneq: "\u2254", comma: ",", commat: "@", comp: "\u2201", compfn: "\u2218", complement: "\u2201", complexes: "\u2102",
  cong: "\u2245", congdot: "\u2A6D", Congruent: "\u2261", conint: "\u222E", Conint: "\u222F", ContourIntegral: "\u222E", copf: "\u{1D554}", Copf: "\
\u2102", coprod: "\u2210", Coproduct: "\u2210", copy: "\xA9", COPY: "\xA9", copysr: "\u2117", CounterClockwiseContourIntegral: "\u2233", crarr: "\
\u21B5", cross: "\u2717", Cross: "\u2A2F", Cscr: "\u{1D49E}", cscr: "\u{1D4B8}", csub: "\u2ACF", csube: "\u2AD1", csup: "\u2AD0", csupe: "\u2AD2",
  ctdot: "\u22EF", cudarrl: "\u2938", cudarrr: "\u2935", cuepr: "\u22DE", cuesc: "\u22DF", cularr: "\u21B6", cularrp: "\u293D", cupbrcap: "\u2A48",
  cupcap: "\u2A46", CupCap: "\u224D", cup: "\u222A", Cup: "\u22D3", cupcup: "\u2A4A", cupdot: "\u228D", cupor: "\u2A45", cups: "\u222A\uFE00",
  curarr: "\u21B7", curarrm: "\u293C", curlyeqprec: "\u22DE", curlyeqsucc: "\u22DF", curlyvee: "\u22CE", curlywedge: "\u22CF", curren: "\xA4",
  curvearrowleft: "\u21B6", curvearrowright: "\u21B7", cuvee: "\u22CE", cuwed: "\u22CF", cwconint: "\u2232", cwint: "\u2231", cylcty: "\u232D",
  dagger: "\u2020", Dagger: "\u2021", daleth: "\u2138", darr: "\u2193", Darr: "\u21A1", dArr: "\u21D3", dash: "\u2010", Dashv: "\u2AE4", dashv: "\
\u22A3", dbkarow: "\u290F", dblac: "\u02DD", Dcaron: "\u010E", dcaron: "\u010F", Dcy: "\u0414", dcy: "\u0434", ddagger: "\u2021", ddarr: "\u21CA",
  DD: "\u2145", dd: "\u2146", DDotrahd: "\u2911", ddotseq: "\u2A77", deg: "\xB0", Del: "\u2207", Delta: "\u0394", delta: "\u03B4", demptyv: "\
\u29B1", dfisht: "\u297F", Dfr: "\u{1D507}", dfr: "\u{1D521}", dHar: "\u2965", dharl: "\u21C3", dharr: "\u21C2", DiacriticalAcute: "\xB4", DiacriticalDot: "\
\u02D9", DiacriticalDoubleAcute: "\u02DD", DiacriticalGrave: "`", DiacriticalTilde: "\u02DC", diam: "\u22C4", diamond: "\u22C4", Diamond: "\u22C4",
  diamondsuit: "\u2666", diams: "\u2666", die: "\xA8", DifferentialD: "\u2146", digamma: "\u03DD", disin: "\u22F2", div: "\xF7", divide: "\xF7",
  divideontimes: "\u22C7", divonx: "\u22C7", DJcy: "\u0402", djcy: "\u0452", dlcorn: "\u231E", dlcrop: "\u230D", dollar: "$", Dopf: "\u{1D53B}",
  dopf: "\u{1D555}", Dot: "\xA8", dot: "\u02D9", DotDot: "\u20DC", doteq: "\u2250", doteqdot: "\u2251", DotEqual: "\u2250", dotminus: "\u2238",
  dotplus: "\u2214", dotsquare: "\u22A1", doublebarwedge: "\u2306", DoubleContourIntegral: "\u222F", DoubleDot: "\xA8", DoubleDownArrow: "\u21D3",
  DoubleLeftArrow: "\u21D0", DoubleLeftRightArrow: "\u21D4", DoubleLeftTee: "\u2AE4", DoubleLongLeftArrow: "\u27F8", DoubleLongLeftRightArrow: "\
\u27FA", DoubleLongRightArrow: "\u27F9", DoubleRightArrow: "\u21D2", DoubleRightTee: "\u22A8", DoubleUpArrow: "\u21D1", DoubleUpDownArrow: "\
\u21D5", DoubleVerticalBar: "\u2225", DownArrowBar: "\u2913", downarrow: "\u2193", DownArrow: "\u2193", Downarrow: "\u21D3", DownArrowUpArrow: "\
\u21F5", DownBreve: "\u0311", downdownarrows: "\u21CA", downharpoonleft: "\u21C3", downharpoonright: "\u21C2", DownLeftRightVector: "\u2950",
  DownLeftTeeVector: "\u295E", DownLeftVectorBar: "\u2956", DownLeftVector: "\u21BD", DownRightTeeVector: "\u295F", DownRightVectorBar: "\u2957",
  DownRightVector: "\u21C1", DownTeeArrow: "\u21A7", DownTee: "\u22A4", drbkarow: "\u2910", drcorn: "\u231F", drcrop: "\u230C", Dscr: "\u{1D49F}",
  dscr: "\u{1D4B9}", DScy: "\u0405", dscy: "\u0455", dsol: "\u29F6", Dstrok: "\u0110", dstrok: "\u0111", dtdot: "\u22F1", dtri: "\u25BF", dtrif: "\
\u25BE", duarr: "\u21F5", duhar: "\u296F", dwangle: "\u29A6", DZcy: "\u040F", dzcy: "\u045F", dzigrarr: "\u27FF", Eacute: "\xC9", eacute: "\xE9",
  easter: "\u2A6E", Ecaron: "\u011A", ecaron: "\u011B", Ecirc: "\xCA", ecirc: "\xEA", ecir: "\u2256", ecolon: "\u2255", Ecy: "\u042D", ecy: "\
\u044D", eDDot: "\u2A77", Edot: "\u0116", edot: "\u0117", eDot: "\u2251", ee: "\u2147", efDot: "\u2252", Efr: "\u{1D508}", efr: "\u{1D522}",
  eg: "\u2A9A", Egrave: "\xC8", egrave: "\xE8", egs: "\u2A96", egsdot: "\u2A98", el: "\u2A99", Element: "\u2208", elinters: "\u23E7", ell: "\
\u2113", els: "\u2A95", elsdot: "\u2A97", Emacr: "\u0112", emacr: "\u0113", empty: "\u2205", emptyset: "\u2205", EmptySmallSquare: "\u25FB",
  emptyv: "\u2205", EmptyVerySmallSquare: "\u25AB", emsp13: "\u2004", emsp14: "\u2005", emsp: "\u2003", ENG: "\u014A", eng: "\u014B", ensp: "\
\u2002", Eogon: "\u0118", eogon: "\u0119", Eopf: "\u{1D53C}", eopf: "\u{1D556}", epar: "\u22D5", eparsl: "\u29E3", eplus: "\u2A71", epsi: "\u03B5",
  Epsilon: "\u0395", epsilon: "\u03B5", epsiv: "\u03F5", eqcirc: "\u2256", eqcolon: "\u2255", eqsim: "\u2242", eqslantgtr: "\u2A96", eqslantless: "\
\u2A95", Equal: "\u2A75", equals: "=", EqualTilde: "\u2242", equest: "\u225F", Equilibrium: "\u21CC", equiv: "\u2261", equivDD: "\u2A78", eqvparsl: "\
\u29E5", erarr: "\u2971", erDot: "\u2253", escr: "\u212F", Escr: "\u2130", esdot: "\u2250", Esim: "\u2A73", esim: "\u2242", Eta: "\u0397", eta: "\
\u03B7", ETH: "\xD0", eth: "\xF0", Euml: "\xCB", euml: "\xEB", euro: "\u20AC", excl: "!", exist: "\u2203", Exists: "\u2203", expectation: "\u2130",
  exponentiale: "\u2147", ExponentialE: "\u2147", fallingdotseq: "\u2252", Fcy: "\u0424", fcy: "\u0444", female: "\u2640", ffilig: "\uFB03",
  fflig: "\uFB00", ffllig: "\uFB04", Ffr: "\u{1D509}", ffr: "\u{1D523}", filig: "\uFB01", FilledSmallSquare: "\u25FC", FilledVerySmallSquare: "\
\u25AA", fjlig: "fj", flat: "\u266D", fllig: "\uFB02", fltns: "\u25B1", fnof: "\u0192", Fopf: "\u{1D53D}", fopf: "\u{1D557}", forall: "\u2200",
  ForAll: "\u2200", fork: "\u22D4", forkv: "\u2AD9", Fouriertrf: "\u2131", fpartint: "\u2A0D", frac12: "\xBD", frac13: "\u2153", frac14: "\xBC",
  frac15: "\u2155", frac16: "\u2159", frac18: "\u215B", frac23: "\u2154", frac25: "\u2156", frac34: "\xBE", frac35: "\u2157", frac38: "\u215C",
  frac45: "\u2158", frac56: "\u215A", frac58: "\u215D", frac78: "\u215E", frasl: "\u2044", frown: "\u2322", fscr: "\u{1D4BB}", Fscr: "\u2131",
  gacute: "\u01F5", Gamma: "\u0393", gamma: "\u03B3", Gammad: "\u03DC", gammad: "\u03DD", gap: "\u2A86", Gbreve: "\u011E", gbreve: "\u011F",
  Gcedil: "\u0122", Gcirc: "\u011C", gcirc: "\u011D", Gcy: "\u0413", gcy: "\u0433", Gdot: "\u0120", gdot: "\u0121", ge: "\u2265", gE: "\u2267",
  gEl: "\u2A8C", gel: "\u22DB", geq: "\u2265", geqq: "\u2267", geqslant: "\u2A7E", gescc: "\u2AA9", ges: "\u2A7E", gesdot: "\u2A80", gesdoto: "\
\u2A82", gesdotol: "\u2A84", gesl: "\u22DB\uFE00", gesles: "\u2A94", Gfr: "\u{1D50A}", gfr: "\u{1D524}", gg: "\u226B", Gg: "\u22D9", ggg: "\u22D9",
  gimel: "\u2137", GJcy: "\u0403", gjcy: "\u0453", gla: "\u2AA5", gl: "\u2277", glE: "\u2A92", glj: "\u2AA4", gnap: "\u2A8A", gnapprox: "\u2A8A",
  gne: "\u2A88", gnE: "\u2269", gneq: "\u2A88", gneqq: "\u2269", gnsim: "\u22E7", Gopf: "\u{1D53E}", gopf: "\u{1D558}", grave: "`", GreaterEqual: "\
\u2265", GreaterEqualLess: "\u22DB", GreaterFullEqual: "\u2267", GreaterGreater: "\u2AA2", GreaterLess: "\u2277", GreaterSlantEqual: "\u2A7E",
  GreaterTilde: "\u2273", Gscr: "\u{1D4A2}", gscr: "\u210A", gsim: "\u2273", gsime: "\u2A8E", gsiml: "\u2A90", gtcc: "\u2AA7", gtcir: "\u2A7A",
  gt: ">", GT: ">", Gt: "\u226B", gtdot: "\u22D7", gtlPar: "\u2995", gtquest: "\u2A7C", gtrapprox: "\u2A86", gtrarr: "\u2978", gtrdot: "\u22D7",
  gtreqless: "\u22DB", gtreqqless: "\u2A8C", gtrless: "\u2277", gtrsim: "\u2273", gvertneqq: "\u2269\uFE00", gvnE: "\u2269\uFE00", Hacek: "\u02C7",
  hairsp: "\u200A", half: "\xBD", hamilt: "\u210B", HARDcy: "\u042A", hardcy: "\u044A", harrcir: "\u2948", harr: "\u2194", hArr: "\u21D4", harrw: "\
\u21AD", Hat: "^", hbar: "\u210F", Hcirc: "\u0124", hcirc: "\u0125", hearts: "\u2665", heartsuit: "\u2665", hellip: "\u2026", hercon: "\u22B9",
  hfr: "\u{1D525}", Hfr: "\u210C", HilbertSpace: "\u210B", hksearow: "\u2925", hkswarow: "\u2926", hoarr: "\u21FF", homtht: "\u223B", hookleftarrow: "\
\u21A9", hookrightarrow: "\u21AA", hopf: "\u{1D559}", Hopf: "\u210D", horbar: "\u2015", HorizontalLine: "\u2500", hscr: "\u{1D4BD}", Hscr: "\
\u210B", hslash: "\u210F", Hstrok: "\u0126", hstrok: "\u0127", HumpDownHump: "\u224E", HumpEqual: "\u224F", hybull: "\u2043", hyphen: "\u2010",
  Iacute: "\xCD", iacute: "\xED", ic: "\u2063", Icirc: "\xCE", icirc: "\xEE", Icy: "\u0418", icy: "\u0438", Idot: "\u0130", IEcy: "\u0415", iecy: "\
\u0435", iexcl: "\xA1", iff: "\u21D4", ifr: "\u{1D526}", Ifr: "\u2111", Igrave: "\xCC", igrave: "\xEC", ii: "\u2148", iiiint: "\u2A0C", iiint: "\
\u222D", iinfin: "\u29DC", iiota: "\u2129", IJlig: "\u0132", ijlig: "\u0133", Imacr: "\u012A", imacr: "\u012B", image: "\u2111", ImaginaryI: "\
\u2148", imagline: "\u2110", imagpart: "\u2111", imath: "\u0131", Im: "\u2111", imof: "\u22B7", imped: "\u01B5", Implies: "\u21D2", incare: "\
\u2105", in: "\u2208", infin: "\u221E", infintie: "\u29DD", inodot: "\u0131", intcal: "\u22BA", int: "\u222B", Int: "\u222C", integers: "\u2124",
  Integral: "\u222B", intercal: "\u22BA", Intersection: "\u22C2", intlarhk: "\u2A17", intprod: "\u2A3C", InvisibleComma: "\u2063", InvisibleTimes: "\
\u2062", IOcy: "\u0401", iocy: "\u0451", Iogon: "\u012E", iogon: "\u012F", Iopf: "\u{1D540}", iopf: "\u{1D55A}", Iota: "\u0399", iota: "\u03B9",
  iprod: "\u2A3C", iquest: "\xBF", iscr: "\u{1D4BE}", Iscr: "\u2110", isin: "\u2208", isindot: "\u22F5", isinE: "\u22F9", isins: "\u22F4", isinsv: "\
\u22F3", isinv: "\u2208", it: "\u2062", Itilde: "\u0128", itilde: "\u0129", Iukcy: "\u0406", iukcy: "\u0456", Iuml: "\xCF", iuml: "\xEF", Jcirc: "\
\u0134", jcirc: "\u0135", Jcy: "\u0419", jcy: "\u0439", Jfr: "\u{1D50D}", jfr: "\u{1D527}", jmath: "\u0237", Jopf: "\u{1D541}", jopf: "\u{1D55B}",
  Jscr: "\u{1D4A5}", jscr: "\u{1D4BF}", Jsercy: "\u0408", jsercy: "\u0458", Jukcy: "\u0404", jukcy: "\u0454", Kappa: "\u039A", kappa: "\u03BA",
  kappav: "\u03F0", Kcedil: "\u0136", kcedil: "\u0137", Kcy: "\u041A", kcy: "\u043A", Kfr: "\u{1D50E}", kfr: "\u{1D528}", kgreen: "\u0138", KHcy: "\
\u0425", khcy: "\u0445", KJcy: "\u040C", kjcy: "\u045C", Kopf: "\u{1D542}", kopf: "\u{1D55C}", Kscr: "\u{1D4A6}", kscr: "\u{1D4C0}", lAarr: "\
\u21DA", Lacute: "\u0139", lacute: "\u013A", laemptyv: "\u29B4", lagran: "\u2112", Lambda: "\u039B", lambda: "\u03BB", lang: "\u27E8", Lang: "\
\u27EA", langd: "\u2991", langle: "\u27E8", lap: "\u2A85", Laplacetrf: "\u2112", laquo: "\xAB", larrb: "\u21E4", larrbfs: "\u291F", larr: "\u2190",
  Larr: "\u219E", lArr: "\u21D0", larrfs: "\u291D", larrhk: "\u21A9", larrlp: "\u21AB", larrpl: "\u2939", larrsim: "\u2973", larrtl: "\u21A2",
  latail: "\u2919", lAtail: "\u291B", lat: "\u2AAB", late: "\u2AAD", lates: "\u2AAD\uFE00", lbarr: "\u290C", lBarr: "\u290E", lbbrk: "\u2772",
  lbrace: "{", lbrack: "[", lbrke: "\u298B", lbrksld: "\u298F", lbrkslu: "\u298D", Lcaron: "\u013D", lcaron: "\u013E", Lcedil: "\u013B", lcedil: "\
\u013C", lceil: "\u2308", lcub: "{", Lcy: "\u041B", lcy: "\u043B", ldca: "\u2936", ldquo: "\u201C", ldquor: "\u201E", ldrdhar: "\u2967", ldrushar: "\
\u294B", ldsh: "\u21B2", le: "\u2264", lE: "\u2266", LeftAngleBracket: "\u27E8", LeftArrowBar: "\u21E4", leftarrow: "\u2190", LeftArrow: "\u2190",
  Leftarrow: "\u21D0", LeftArrowRightArrow: "\u21C6", leftarrowtail: "\u21A2", LeftCeiling: "\u2308", LeftDoubleBracket: "\u27E6", LeftDownTeeVector: "\
\u2961", LeftDownVectorBar: "\u2959", LeftDownVector: "\u21C3", LeftFloor: "\u230A", leftharpoondown: "\u21BD", leftharpoonup: "\u21BC", leftleftarrows: "\
\u21C7", leftrightarrow: "\u2194", LeftRightArrow: "\u2194", Leftrightarrow: "\u21D4", leftrightarrows: "\u21C6", leftrightharpoons: "\u21CB",
  leftrightsquigarrow: "\u21AD", LeftRightVector: "\u294E", LeftTeeArrow: "\u21A4", LeftTee: "\u22A3", LeftTeeVector: "\u295A", leftthreetimes: "\
\u22CB", LeftTriangleBar: "\u29CF", LeftTriangle: "\u22B2", LeftTriangleEqual: "\u22B4", LeftUpDownVector: "\u2951", LeftUpTeeVector: "\u2960",
  LeftUpVectorBar: "\u2958", LeftUpVector: "\u21BF", LeftVectorBar: "\u2952", LeftVector: "\u21BC", lEg: "\u2A8B", leg: "\u22DA", leq: "\u2264",
  leqq: "\u2266", leqslant: "\u2A7D", lescc: "\u2AA8", les: "\u2A7D", lesdot: "\u2A7F", lesdoto: "\u2A81", lesdotor: "\u2A83", lesg: "\u22DA\uFE00",
  lesges: "\u2A93", lessapprox: "\u2A85", lessdot: "\u22D6", lesseqgtr: "\u22DA", lesseqqgtr: "\u2A8B", LessEqualGreater: "\u22DA", LessFullEqual: "\
\u2266", LessGreater: "\u2276", lessgtr: "\u2276", LessLess: "\u2AA1", lesssim: "\u2272", LessSlantEqual: "\u2A7D", LessTilde: "\u2272", lfisht: "\
\u297C", lfloor: "\u230A", Lfr: "\u{1D50F}", lfr: "\u{1D529}", lg: "\u2276", lgE: "\u2A91", lHar: "\u2962", lhard: "\u21BD", lharu: "\u21BC",
  lharul: "\u296A", lhblk: "\u2584", LJcy: "\u0409", ljcy: "\u0459", llarr: "\u21C7", ll: "\u226A", Ll: "\u22D8", llcorner: "\u231E", Lleftarrow: "\
\u21DA", llhard: "\u296B", lltri: "\u25FA", Lmidot: "\u013F", lmidot: "\u0140", lmoustache: "\u23B0", lmoust: "\u23B0", lnap: "\u2A89", lnapprox: "\
\u2A89", lne: "\u2A87", lnE: "\u2268", lneq: "\u2A87", lneqq: "\u2268", lnsim: "\u22E6", loang: "\u27EC", loarr: "\u21FD", lobrk: "\u27E6", longleftarrow: "\
\u27F5", LongLeftArrow: "\u27F5", Longleftarrow: "\u27F8", longleftrightarrow: "\u27F7", LongLeftRightArrow: "\u27F7", Longleftrightarrow: "\
\u27FA", longmapsto: "\u27FC", longrightarrow: "\u27F6", LongRightArrow: "\u27F6", Longrightarrow: "\u27F9", looparrowleft: "\u21AB", looparrowright: "\
\u21AC", lopar: "\u2985", Lopf: "\u{1D543}", lopf: "\u{1D55D}", loplus: "\u2A2D", lotimes: "\u2A34", lowast: "\u2217", lowbar: "_", LowerLeftArrow: "\
\u2199", LowerRightArrow: "\u2198", loz: "\u25CA", lozenge: "\u25CA", lozf: "\u29EB", lpar: "(", lparlt: "\u2993", lrarr: "\u21C6", lrcorner: "\
\u231F", lrhar: "\u21CB", lrhard: "\u296D", lrm: "\u200E", lrtri: "\u22BF", lsaquo: "\u2039", lscr: "\u{1D4C1}", Lscr: "\u2112", lsh: "\u21B0",
  Lsh: "\u21B0", lsim: "\u2272", lsime: "\u2A8D", lsimg: "\u2A8F", lsqb: "[", lsquo: "\u2018", lsquor: "\u201A", Lstrok: "\u0141", lstrok: "\
\u0142", ltcc: "\u2AA6", ltcir: "\u2A79", lt: "<", LT: "<", Lt: "\u226A", ltdot: "\u22D6", lthree: "\u22CB", ltimes: "\u22C9", ltlarr: "\u2976",
  ltquest: "\u2A7B", ltri: "\u25C3", ltrie: "\u22B4", ltrif: "\u25C2", ltrPar: "\u2996", lurdshar: "\u294A", luruhar: "\u2966", lvertneqq: "\
\u2268\uFE00", lvnE: "\u2268\uFE00", macr: "\xAF", male: "\u2642", malt: "\u2720", maltese: "\u2720", Map: "\u2905", map: "\u21A6", mapsto: "\
\u21A6", mapstodown: "\u21A7", mapstoleft: "\u21A4", mapstoup: "\u21A5", marker: "\u25AE", mcomma: "\u2A29", Mcy: "\u041C", mcy: "\u043C", mdash: "\
\u2014", mDDot: "\u223A", measuredangle: "\u2221", MediumSpace: "\u205F", Mellintrf: "\u2133", Mfr: "\u{1D510}", mfr: "\u{1D52A}", mho: "\u2127",
  micro: "\xB5", midast: "*", midcir: "\u2AF0", mid: "\u2223", middot: "\xB7", minusb: "\u229F", minus: "\u2212", minusd: "\u2238", minusdu: "\
\u2A2A", MinusPlus: "\u2213", mlcp: "\u2ADB", mldr: "\u2026", mnplus: "\u2213", models: "\u22A7", Mopf: "\u{1D544}", mopf: "\u{1D55E}", mp: "\
\u2213", mscr: "\u{1D4C2}", Mscr: "\u2133", mstpos: "\u223E", Mu: "\u039C", mu: "\u03BC", multimap: "\u22B8", mumap: "\u22B8", nabla: "\u2207",
  Nacute: "\u0143", nacute: "\u0144", nang: "\u2220\u20D2", nap: "\u2249", napE: "\u2A70\u0338", napid: "\u224B\u0338", napos: "\u0149", napprox: "\
\u2249", natural: "\u266E", naturals: "\u2115", natur: "\u266E", nbsp: "\xA0", nbump: "\u224E\u0338", nbumpe: "\u224F\u0338", ncap: "\u2A43",
  Ncaron: "\u0147", ncaron: "\u0148", Ncedil: "\u0145", ncedil: "\u0146", ncong: "\u2247", ncongdot: "\u2A6D\u0338", ncup: "\u2A42", Ncy: "\u041D",
  ncy: "\u043D", ndash: "\u2013", nearhk: "\u2924", nearr: "\u2197", neArr: "\u21D7", nearrow: "\u2197", ne: "\u2260", nedot: "\u2250\u0338",
  NegativeMediumSpace: "\u200B", NegativeThickSpace: "\u200B", NegativeThinSpace: "\u200B", NegativeVeryThinSpace: "\u200B", nequiv: "\u2262",
  nesear: "\u2928", nesim: "\u2242\u0338", NestedGreaterGreater: "\u226B", NestedLessLess: "\u226A", NewLine: `
`, nexist: "\u2204", nexists: "\u2204", Nfr: "\u{1D511}", nfr: "\u{1D52B}", ngE: "\u2267\u0338", nge: "\u2271", ngeq: "\u2271", ngeqq: "\u2267\u0338",
  ngeqslant: "\u2A7E\u0338", nges: "\u2A7E\u0338", nGg: "\u22D9\u0338", ngsim: "\u2275", nGt: "\u226B\u20D2", ngt: "\u226F", ngtr: "\u226F",
  nGtv: "\u226B\u0338", nharr: "\u21AE", nhArr: "\u21CE", nhpar: "\u2AF2", ni: "\u220B", nis: "\u22FC", nisd: "\u22FA", niv: "\u220B", NJcy: "\
\u040A", njcy: "\u045A", nlarr: "\u219A", nlArr: "\u21CD", nldr: "\u2025", nlE: "\u2266\u0338", nle: "\u2270", nleftarrow: "\u219A", nLeftarrow: "\
\u21CD", nleftrightarrow: "\u21AE", nLeftrightarrow: "\u21CE", nleq: "\u2270", nleqq: "\u2266\u0338", nleqslant: "\u2A7D\u0338", nles: "\u2A7D\u0338",
  nless: "\u226E", nLl: "\u22D8\u0338", nlsim: "\u2274", nLt: "\u226A\u20D2", nlt: "\u226E", nltri: "\u22EA", nltrie: "\u22EC", nLtv: "\u226A\u0338",
  nmid: "\u2224", NoBreak: "\u2060", NonBreakingSpace: "\xA0", nopf: "\u{1D55F}", Nopf: "\u2115", Not: "\u2AEC", not: "\xAC", NotCongruent: "\
\u2262", NotCupCap: "\u226D", NotDoubleVerticalBar: "\u2226", NotElement: "\u2209", NotEqual: "\u2260", NotEqualTilde: "\u2242\u0338", NotExists: "\
\u2204", NotGreater: "\u226F", NotGreaterEqual: "\u2271", NotGreaterFullEqual: "\u2267\u0338", NotGreaterGreater: "\u226B\u0338", NotGreaterLess: "\
\u2279", NotGreaterSlantEqual: "\u2A7E\u0338", NotGreaterTilde: "\u2275", NotHumpDownHump: "\u224E\u0338", NotHumpEqual: "\u224F\u0338", notin: "\
\u2209", notindot: "\u22F5\u0338", notinE: "\u22F9\u0338", notinva: "\u2209", notinvb: "\u22F7", notinvc: "\u22F6", NotLeftTriangleBar: "\u29CF\u0338",
  NotLeftTriangle: "\u22EA", NotLeftTriangleEqual: "\u22EC", NotLess: "\u226E", NotLessEqual: "\u2270", NotLessGreater: "\u2278", NotLessLess: "\
\u226A\u0338", NotLessSlantEqual: "\u2A7D\u0338", NotLessTilde: "\u2274", NotNestedGreaterGreater: "\u2AA2\u0338", NotNestedLessLess: "\u2AA1\u0338",
  notni: "\u220C", notniva: "\u220C", notnivb: "\u22FE", notnivc: "\u22FD", NotPrecedes: "\u2280", NotPrecedesEqual: "\u2AAF\u0338", NotPrecedesSlantEqual: "\
\u22E0", NotReverseElement: "\u220C", NotRightTriangleBar: "\u29D0\u0338", NotRightTriangle: "\u22EB", NotRightTriangleEqual: "\u22ED", NotSquareSubset: "\
\u228F\u0338", NotSquareSubsetEqual: "\u22E2", NotSquareSuperset: "\u2290\u0338", NotSquareSupersetEqual: "\u22E3", NotSubset: "\u2282\u20D2",
  NotSubsetEqual: "\u2288", NotSucceeds: "\u2281", NotSucceedsEqual: "\u2AB0\u0338", NotSucceedsSlantEqual: "\u22E1", NotSucceedsTilde: "\u227F\u0338",
  NotSuperset: "\u2283\u20D2", NotSupersetEqual: "\u2289", NotTilde: "\u2241", NotTildeEqual: "\u2244", NotTildeFullEqual: "\u2247", NotTildeTilde: "\
\u2249", NotVerticalBar: "\u2224", nparallel: "\u2226", npar: "\u2226", nparsl: "\u2AFD\u20E5", npart: "\u2202\u0338", npolint: "\u2A14", npr: "\
\u2280", nprcue: "\u22E0", nprec: "\u2280", npreceq: "\u2AAF\u0338", npre: "\u2AAF\u0338", nrarrc: "\u2933\u0338", nrarr: "\u219B", nrArr: "\
\u21CF", nrarrw: "\u219D\u0338", nrightarrow: "\u219B", nRightarrow: "\u21CF", nrtri: "\u22EB", nrtrie: "\u22ED", nsc: "\u2281", nsccue: "\u22E1",
  nsce: "\u2AB0\u0338", Nscr: "\u{1D4A9}", nscr: "\u{1D4C3}", nshortmid: "\u2224", nshortparallel: "\u2226", nsim: "\u2241", nsime: "\u2244",
  nsimeq: "\u2244", nsmid: "\u2224", nspar: "\u2226", nsqsube: "\u22E2", nsqsupe: "\u22E3", nsub: "\u2284", nsubE: "\u2AC5\u0338", nsube: "\u2288",
  nsubset: "\u2282\u20D2", nsubseteq: "\u2288", nsubseteqq: "\u2AC5\u0338", nsucc: "\u2281", nsucceq: "\u2AB0\u0338", nsup: "\u2285", nsupE: "\
\u2AC6\u0338", nsupe: "\u2289", nsupset: "\u2283\u20D2", nsupseteq: "\u2289", nsupseteqq: "\u2AC6\u0338", ntgl: "\u2279", Ntilde: "\xD1", ntilde: "\
\xF1", ntlg: "\u2278", ntriangleleft: "\u22EA", ntrianglelefteq: "\u22EC", ntriangleright: "\u22EB", ntrianglerighteq: "\u22ED", Nu: "\u039D",
  nu: "\u03BD", num: "#", numero: "\u2116", numsp: "\u2007", nvap: "\u224D\u20D2", nvdash: "\u22AC", nvDash: "\u22AD", nVdash: "\u22AE", nVDash: "\
\u22AF", nvge: "\u2265\u20D2", nvgt: ">\u20D2", nvHarr: "\u2904", nvinfin: "\u29DE", nvlArr: "\u2902", nvle: "\u2264\u20D2", nvlt: "<\u20D2",
  nvltrie: "\u22B4\u20D2", nvrArr: "\u2903", nvrtrie: "\u22B5\u20D2", nvsim: "\u223C\u20D2", nwarhk: "\u2923", nwarr: "\u2196", nwArr: "\u21D6",
  nwarrow: "\u2196", nwnear: "\u2927", Oacute: "\xD3", oacute: "\xF3", oast: "\u229B", Ocirc: "\xD4", ocirc: "\xF4", ocir: "\u229A", Ocy: "\u041E",
  ocy: "\u043E", odash: "\u229D", Odblac: "\u0150", odblac: "\u0151", odiv: "\u2A38", odot: "\u2299", odsold: "\u29BC", OElig: "\u0152", oelig: "\
\u0153", ofcir: "\u29BF", Ofr: "\u{1D512}", ofr: "\u{1D52C}", ogon: "\u02DB", Ograve: "\xD2", ograve: "\xF2", ogt: "\u29C1", ohbar: "\u29B5",
  ohm: "\u03A9", oint: "\u222E", olarr: "\u21BA", olcir: "\u29BE", olcross: "\u29BB", oline: "\u203E", olt: "\u29C0", Omacr: "\u014C", omacr: "\
\u014D", Omega: "\u03A9", omega: "\u03C9", Omicron: "\u039F", omicron: "\u03BF", omid: "\u29B6", ominus: "\u2296", Oopf: "\u{1D546}", oopf: "\
\u{1D560}", opar: "\u29B7", OpenCurlyDoubleQuote: "\u201C", OpenCurlyQuote: "\u2018", operp: "\u29B9", oplus: "\u2295", orarr: "\u21BB", Or: "\
\u2A54", or: "\u2228", ord: "\u2A5D", order: "\u2134", orderof: "\u2134", ordf: "\xAA", ordm: "\xBA", origof: "\u22B6", oror: "\u2A56", orslope: "\
\u2A57", orv: "\u2A5B", oS: "\u24C8", Oscr: "\u{1D4AA}", oscr: "\u2134", Oslash: "\xD8", oslash: "\xF8", osol: "\u2298", Otilde: "\xD5", otilde: "\
\xF5", otimesas: "\u2A36", Otimes: "\u2A37", otimes: "\u2297", Ouml: "\xD6", ouml: "\xF6", ovbar: "\u233D", OverBar: "\u203E", OverBrace: "\u23DE",
  OverBracket: "\u23B4", OverParenthesis: "\u23DC", para: "\xB6", parallel: "\u2225", par: "\u2225", parsim: "\u2AF3", parsl: "\u2AFD", part: "\
\u2202", PartialD: "\u2202", Pcy: "\u041F", pcy: "\u043F", percnt: "%", period: ".", permil: "\u2030", perp: "\u22A5", pertenk: "\u2031", Pfr: "\
\u{1D513}", pfr: "\u{1D52D}", Phi: "\u03A6", phi: "\u03C6", phiv: "\u03D5", phmmat: "\u2133", phone: "\u260E", Pi: "\u03A0", pi: "\u03C0", pitchfork: "\
\u22D4", piv: "\u03D6", planck: "\u210F", planckh: "\u210E", plankv: "\u210F", plusacir: "\u2A23", plusb: "\u229E", pluscir: "\u2A22", plus: "\
+", plusdo: "\u2214", plusdu: "\u2A25", pluse: "\u2A72", PlusMinus: "\xB1", plusmn: "\xB1", plussim: "\u2A26", plustwo: "\u2A27", pm: "\xB1",
  Poincareplane: "\u210C", pointint: "\u2A15", popf: "\u{1D561}", Popf: "\u2119", pound: "\xA3", prap: "\u2AB7", Pr: "\u2ABB", pr: "\u227A",
  prcue: "\u227C", precapprox: "\u2AB7", prec: "\u227A", preccurlyeq: "\u227C", Precedes: "\u227A", PrecedesEqual: "\u2AAF", PrecedesSlantEqual: "\
\u227C", PrecedesTilde: "\u227E", preceq: "\u2AAF", precnapprox: "\u2AB9", precneqq: "\u2AB5", precnsim: "\u22E8", pre: "\u2AAF", prE: "\u2AB3",
  precsim: "\u227E", prime: "\u2032", Prime: "\u2033", primes: "\u2119", prnap: "\u2AB9", prnE: "\u2AB5", prnsim: "\u22E8", prod: "\u220F", Product: "\
\u220F", profalar: "\u232E", profline: "\u2312", profsurf: "\u2313", prop: "\u221D", Proportional: "\u221D", Proportion: "\u2237", propto: "\
\u221D", prsim: "\u227E", prurel: "\u22B0", Pscr: "\u{1D4AB}", pscr: "\u{1D4C5}", Psi: "\u03A8", psi: "\u03C8", puncsp: "\u2008", Qfr: "\u{1D514}",
  qfr: "\u{1D52E}", qint: "\u2A0C", qopf: "\u{1D562}", Qopf: "\u211A", qprime: "\u2057", Qscr: "\u{1D4AC}", qscr: "\u{1D4C6}", quaternions: "\
\u210D", quatint: "\u2A16", quest: "?", questeq: "\u225F", quot: '"', QUOT: '"', rAarr: "\u21DB", race: "\u223D\u0331", Racute: "\u0154", racute: "\
\u0155", radic: "\u221A", raemptyv: "\u29B3", rang: "\u27E9", Rang: "\u27EB", rangd: "\u2992", range: "\u29A5", rangle: "\u27E9", raquo: "\xBB",
  rarrap: "\u2975", rarrb: "\u21E5", rarrbfs: "\u2920", rarrc: "\u2933", rarr: "\u2192", Rarr: "\u21A0", rArr: "\u21D2", rarrfs: "\u291E", rarrhk: "\
\u21AA", rarrlp: "\u21AC", rarrpl: "\u2945", rarrsim: "\u2974", Rarrtl: "\u2916", rarrtl: "\u21A3", rarrw: "\u219D", ratail: "\u291A", rAtail: "\
\u291C", ratio: "\u2236", rationals: "\u211A", rbarr: "\u290D", rBarr: "\u290F", RBarr: "\u2910", rbbrk: "\u2773", rbrace: "}", rbrack: "]",
  rbrke: "\u298C", rbrksld: "\u298E", rbrkslu: "\u2990", Rcaron: "\u0158", rcaron: "\u0159", Rcedil: "\u0156", rcedil: "\u0157", rceil: "\u2309",
  rcub: "}", Rcy: "\u0420", rcy: "\u0440", rdca: "\u2937", rdldhar: "\u2969", rdquo: "\u201D", rdquor: "\u201D", rdsh: "\u21B3", real: "\u211C",
  realine: "\u211B", realpart: "\u211C", reals: "\u211D", Re: "\u211C", rect: "\u25AD", reg: "\xAE", REG: "\xAE", ReverseElement: "\u220B", ReverseEquilibrium: "\
\u21CB", ReverseUpEquilibrium: "\u296F", rfisht: "\u297D", rfloor: "\u230B", rfr: "\u{1D52F}", Rfr: "\u211C", rHar: "\u2964", rhard: "\u21C1",
  rharu: "\u21C0", rharul: "\u296C", Rho: "\u03A1", rho: "\u03C1", rhov: "\u03F1", RightAngleBracket: "\u27E9", RightArrowBar: "\u21E5", rightarrow: "\
\u2192", RightArrow: "\u2192", Rightarrow: "\u21D2", RightArrowLeftArrow: "\u21C4", rightarrowtail: "\u21A3", RightCeiling: "\u2309", RightDoubleBracket: "\
\u27E7", RightDownTeeVector: "\u295D", RightDownVectorBar: "\u2955", RightDownVector: "\u21C2", RightFloor: "\u230B", rightharpoondown: "\u21C1",
  rightharpoonup: "\u21C0", rightleftarrows: "\u21C4", rightleftharpoons: "\u21CC", rightrightarrows: "\u21C9", rightsquigarrow: "\u219D", RightTeeArrow: "\
\u21A6", RightTee: "\u22A2", RightTeeVector: "\u295B", rightthreetimes: "\u22CC", RightTriangleBar: "\u29D0", RightTriangle: "\u22B3", RightTriangleEqual: "\
\u22B5", RightUpDownVector: "\u294F", RightUpTeeVector: "\u295C", RightUpVectorBar: "\u2954", RightUpVector: "\u21BE", RightVectorBar: "\u2953",
  RightVector: "\u21C0", ring: "\u02DA", risingdotseq: "\u2253", rlarr: "\u21C4", rlhar: "\u21CC", rlm: "\u200F", rmoustache: "\u23B1", rmoust: "\
\u23B1", rnmid: "\u2AEE", roang: "\u27ED", roarr: "\u21FE", robrk: "\u27E7", ropar: "\u2986", ropf: "\u{1D563}", Ropf: "\u211D", roplus: "\u2A2E",
  rotimes: "\u2A35", RoundImplies: "\u2970", rpar: ")", rpargt: "\u2994", rppolint: "\u2A12", rrarr: "\u21C9", Rrightarrow: "\u21DB", rsaquo: "\
\u203A", rscr: "\u{1D4C7}", Rscr: "\u211B", rsh: "\u21B1", Rsh: "\u21B1", rsqb: "]", rsquo: "\u2019", rsquor: "\u2019", rthree: "\u22CC", rtimes: "\
\u22CA", rtri: "\u25B9", rtrie: "\u22B5", rtrif: "\u25B8", rtriltri: "\u29CE", RuleDelayed: "\u29F4", ruluhar: "\u2968", rx: "\u211E", Sacute: "\
\u015A", sacute: "\u015B", sbquo: "\u201A", scap: "\u2AB8", Scaron: "\u0160", scaron: "\u0161", Sc: "\u2ABC", sc: "\u227B", sccue: "\u227D",
  sce: "\u2AB0", scE: "\u2AB4", Scedil: "\u015E", scedil: "\u015F", Scirc: "\u015C", scirc: "\u015D", scnap: "\u2ABA", scnE: "\u2AB6", scnsim: "\
\u22E9", scpolint: "\u2A13", scsim: "\u227F", Scy: "\u0421", scy: "\u0441", sdotb: "\u22A1", sdot: "\u22C5", sdote: "\u2A66", searhk: "\u2925",
  searr: "\u2198", seArr: "\u21D8", searrow: "\u2198", sect: "\xA7", semi: ";", seswar: "\u2929", setminus: "\u2216", setmn: "\u2216", sext: "\
\u2736", Sfr: "\u{1D516}", sfr: "\u{1D530}", sfrown: "\u2322", sharp: "\u266F", SHCHcy: "\u0429", shchcy: "\u0449", SHcy: "\u0428", shcy: "\u0448",
  ShortDownArrow: "\u2193", ShortLeftArrow: "\u2190", shortmid: "\u2223", shortparallel: "\u2225", ShortRightArrow: "\u2192", ShortUpArrow: "\
\u2191", shy: "\xAD", Sigma: "\u03A3", sigma: "\u03C3", sigmaf: "\u03C2", sigmav: "\u03C2", sim: "\u223C", simdot: "\u2A6A", sime: "\u2243",
  simeq: "\u2243", simg: "\u2A9E", simgE: "\u2AA0", siml: "\u2A9D", simlE: "\u2A9F", simne: "\u2246", simplus: "\u2A24", simrarr: "\u2972", slarr: "\
\u2190", SmallCircle: "\u2218", smallsetminus: "\u2216", smashp: "\u2A33", smeparsl: "\u29E4", smid: "\u2223", smile: "\u2323", smt: "\u2AAA",
  smte: "\u2AAC", smtes: "\u2AAC\uFE00", SOFTcy: "\u042C", softcy: "\u044C", solbar: "\u233F", solb: "\u29C4", sol: "/", Sopf: "\u{1D54A}", sopf: "\
\u{1D564}", spades: "\u2660", spadesuit: "\u2660", spar: "\u2225", sqcap: "\u2293", sqcaps: "\u2293\uFE00", sqcup: "\u2294", sqcups: "\u2294\uFE00",
  Sqrt: "\u221A", sqsub: "\u228F", sqsube: "\u2291", sqsubset: "\u228F", sqsubseteq: "\u2291", sqsup: "\u2290", sqsupe: "\u2292", sqsupset: "\
\u2290", sqsupseteq: "\u2292", square: "\u25A1", Square: "\u25A1", SquareIntersection: "\u2293", SquareSubset: "\u228F", SquareSubsetEqual: "\
\u2291", SquareSuperset: "\u2290", SquareSupersetEqual: "\u2292", SquareUnion: "\u2294", squarf: "\u25AA", squ: "\u25A1", squf: "\u25AA", srarr: "\
\u2192", Sscr: "\u{1D4AE}", sscr: "\u{1D4C8}", ssetmn: "\u2216", ssmile: "\u2323", sstarf: "\u22C6", Star: "\u22C6", star: "\u2606", starf: "\
\u2605", straightepsilon: "\u03F5", straightphi: "\u03D5", strns: "\xAF", sub: "\u2282", Sub: "\u22D0", subdot: "\u2ABD", subE: "\u2AC5", sube: "\
\u2286", subedot: "\u2AC3", submult: "\u2AC1", subnE: "\u2ACB", subne: "\u228A", subplus: "\u2ABF", subrarr: "\u2979", subset: "\u2282", Subset: "\
\u22D0", subseteq: "\u2286", subseteqq: "\u2AC5", SubsetEqual: "\u2286", subsetneq: "\u228A", subsetneqq: "\u2ACB", subsim: "\u2AC7", subsub: "\
\u2AD5", subsup: "\u2AD3", succapprox: "\u2AB8", succ: "\u227B", succcurlyeq: "\u227D", Succeeds: "\u227B", SucceedsEqual: "\u2AB0", SucceedsSlantEqual: "\
\u227D", SucceedsTilde: "\u227F", succeq: "\u2AB0", succnapprox: "\u2ABA", succneqq: "\u2AB6", succnsim: "\u22E9", succsim: "\u227F", SuchThat: "\
\u220B", sum: "\u2211", Sum: "\u2211", sung: "\u266A", sup1: "\xB9", sup2: "\xB2", sup3: "\xB3", sup: "\u2283", Sup: "\u22D1", supdot: "\u2ABE",
  supdsub: "\u2AD8", supE: "\u2AC6", supe: "\u2287", supedot: "\u2AC4", Superset: "\u2283", SupersetEqual: "\u2287", suphsol: "\u27C9", suphsub: "\
\u2AD7", suplarr: "\u297B", supmult: "\u2AC2", supnE: "\u2ACC", supne: "\u228B", supplus: "\u2AC0", supset: "\u2283", Supset: "\u22D1", supseteq: "\
\u2287", supseteqq: "\u2AC6", supsetneq: "\u228B", supsetneqq: "\u2ACC", supsim: "\u2AC8", supsub: "\u2AD4", supsup: "\u2AD6", swarhk: "\u2926",
  swarr: "\u2199", swArr: "\u21D9", swarrow: "\u2199", swnwar: "\u292A", szlig: "\xDF", Tab: "	", target: "\u2316", Tau: "\u03A4", tau: "\u03C4",
  tbrk: "\u23B4", Tcaron: "\u0164", tcaron: "\u0165", Tcedil: "\u0162", tcedil: "\u0163", Tcy: "\u0422", tcy: "\u0442", tdot: "\u20DB", telrec: "\
\u2315", Tfr: "\u{1D517}", tfr: "\u{1D531}", there4: "\u2234", therefore: "\u2234", Therefore: "\u2234", Theta: "\u0398", theta: "\u03B8", thetasym: "\
\u03D1", thetav: "\u03D1", thickapprox: "\u2248", thicksim: "\u223C", ThickSpace: "\u205F\u200A", ThinSpace: "\u2009", thinsp: "\u2009", thkap: "\
\u2248", thksim: "\u223C", THORN: "\xDE", thorn: "\xFE", tilde: "\u02DC", Tilde: "\u223C", TildeEqual: "\u2243", TildeFullEqual: "\u2245", TildeTilde: "\
\u2248", timesbar: "\u2A31", timesb: "\u22A0", times: "\xD7", timesd: "\u2A30", tint: "\u222D", toea: "\u2928", topbot: "\u2336", topcir: "\u2AF1",
  top: "\u22A4", Topf: "\u{1D54B}", topf: "\u{1D565}", topfork: "\u2ADA", tosa: "\u2929", tprime: "\u2034", trade: "\u2122", TRADE: "\u2122",
  triangle: "\u25B5", triangledown: "\u25BF", triangleleft: "\u25C3", trianglelefteq: "\u22B4", triangleq: "\u225C", triangleright: "\u25B9",
  trianglerighteq: "\u22B5", tridot: "\u25EC", trie: "\u225C", triminus: "\u2A3A", TripleDot: "\u20DB", triplus: "\u2A39", trisb: "\u29CD", tritime: "\
\u2A3B", trpezium: "\u23E2", Tscr: "\u{1D4AF}", tscr: "\u{1D4C9}", TScy: "\u0426", tscy: "\u0446", TSHcy: "\u040B", tshcy: "\u045B", Tstrok: "\
\u0166", tstrok: "\u0167", twixt: "\u226C", twoheadleftarrow: "\u219E", twoheadrightarrow: "\u21A0", Uacute: "\xDA", uacute: "\xFA", uarr: "\
\u2191", Uarr: "\u219F", uArr: "\u21D1", Uarrocir: "\u2949", Ubrcy: "\u040E", ubrcy: "\u045E", Ubreve: "\u016C", ubreve: "\u016D", Ucirc: "\xDB",
  ucirc: "\xFB", Ucy: "\u0423", ucy: "\u0443", udarr: "\u21C5", Udblac: "\u0170", udblac: "\u0171", udhar: "\u296E", ufisht: "\u297E", Ufr: "\
\u{1D518}", ufr: "\u{1D532}", Ugrave: "\xD9", ugrave: "\xF9", uHar: "\u2963", uharl: "\u21BF", uharr: "\u21BE", uhblk: "\u2580", ulcorn: "\u231C",
  ulcorner: "\u231C", ulcrop: "\u230F", ultri: "\u25F8", Umacr: "\u016A", umacr: "\u016B", uml: "\xA8", UnderBar: "_", UnderBrace: "\u23DF",
  UnderBracket: "\u23B5", UnderParenthesis: "\u23DD", Union: "\u22C3", UnionPlus: "\u228E", Uogon: "\u0172", uogon: "\u0173", Uopf: "\u{1D54C}",
  uopf: "\u{1D566}", UpArrowBar: "\u2912", uparrow: "\u2191", UpArrow: "\u2191", Uparrow: "\u21D1", UpArrowDownArrow: "\u21C5", updownarrow: "\
\u2195", UpDownArrow: "\u2195", Updownarrow: "\u21D5", UpEquilibrium: "\u296E", upharpoonleft: "\u21BF", upharpoonright: "\u21BE", uplus: "\u228E",
  UpperLeftArrow: "\u2196", UpperRightArrow: "\u2197", upsi: "\u03C5", Upsi: "\u03D2", upsih: "\u03D2", Upsilon: "\u03A5", upsilon: "\u03C5",
  UpTeeArrow: "\u21A5", UpTee: "\u22A5", upuparrows: "\u21C8", urcorn: "\u231D", urcorner: "\u231D", urcrop: "\u230E", Uring: "\u016E", uring: "\
\u016F", urtri: "\u25F9", Uscr: "\u{1D4B0}", uscr: "\u{1D4CA}", utdot: "\u22F0", Utilde: "\u0168", utilde: "\u0169", utri: "\u25B5", utrif: "\
\u25B4", uuarr: "\u21C8", Uuml: "\xDC", uuml: "\xFC", uwangle: "\u29A7", vangrt: "\u299C", varepsilon: "\u03F5", varkappa: "\u03F0", varnothing: "\
\u2205", varphi: "\u03D5", varpi: "\u03D6", varpropto: "\u221D", varr: "\u2195", vArr: "\u21D5", varrho: "\u03F1", varsigma: "\u03C2", varsubsetneq: "\
\u228A\uFE00", varsubsetneqq: "\u2ACB\uFE00", varsupsetneq: "\u228B\uFE00", varsupsetneqq: "\u2ACC\uFE00", vartheta: "\u03D1", vartriangleleft: "\
\u22B2", vartriangleright: "\u22B3", vBar: "\u2AE8", Vbar: "\u2AEB", vBarv: "\u2AE9", Vcy: "\u0412", vcy: "\u0432", vdash: "\u22A2", vDash: "\
\u22A8", Vdash: "\u22A9", VDash: "\u22AB", Vdashl: "\u2AE6", veebar: "\u22BB", vee: "\u2228", Vee: "\u22C1", veeeq: "\u225A", vellip: "\u22EE",
  verbar: "|", Verbar: "\u2016", vert: "|", Vert: "\u2016", VerticalBar: "\u2223", VerticalLine: "|", VerticalSeparator: "\u2758", VerticalTilde: "\
\u2240", VeryThinSpace: "\u200A", Vfr: "\u{1D519}", vfr: "\u{1D533}", vltri: "\u22B2", vnsub: "\u2282\u20D2", vnsup: "\u2283\u20D2", Vopf: "\
\u{1D54D}", vopf: "\u{1D567}", vprop: "\u221D", vrtri: "\u22B3", Vscr: "\u{1D4B1}", vscr: "\u{1D4CB}", vsubnE: "\u2ACB\uFE00", vsubne: "\u228A\uFE00",
  vsupnE: "\u2ACC\uFE00", vsupne: "\u228B\uFE00", Vvdash: "\u22AA", vzigzag: "\u299A", Wcirc: "\u0174", wcirc: "\u0175", wedbar: "\u2A5F", wedge: "\
\u2227", Wedge: "\u22C0", wedgeq: "\u2259", weierp: "\u2118", Wfr: "\u{1D51A}", wfr: "\u{1D534}", Wopf: "\u{1D54E}", wopf: "\u{1D568}", wp: "\
\u2118", wr: "\u2240", wreath: "\u2240", Wscr: "\u{1D4B2}", wscr: "\u{1D4CC}", xcap: "\u22C2", xcirc: "\u25EF", xcup: "\u22C3", xdtri: "\u25BD",
  Xfr: "\u{1D51B}", xfr: "\u{1D535}", xharr: "\u27F7", xhArr: "\u27FA", Xi: "\u039E", xi: "\u03BE", xlarr: "\u27F5", xlArr: "\u27F8", xmap: "\
\u27FC", xnis: "\u22FB", xodot: "\u2A00", Xopf: "\u{1D54F}", xopf: "\u{1D569}", xoplus: "\u2A01", xotime: "\u2A02", xrarr: "\u27F6", xrArr: "\
\u27F9", Xscr: "\u{1D4B3}", xscr: "\u{1D4CD}", xsqcup: "\u2A06", xuplus: "\u2A04", xutri: "\u25B3", xvee: "\u22C1", xwedge: "\u22C0", Yacute: "\
\xDD", yacute: "\xFD", YAcy: "\u042F", yacy: "\u044F", Ycirc: "\u0176", ycirc: "\u0177", Ycy: "\u042B", ycy: "\u044B", yen: "\xA5", Yfr: "\u{1D51C}",
  yfr: "\u{1D536}", YIcy: "\u0407", yicy: "\u0457", Yopf: "\u{1D550}", yopf: "\u{1D56A}", Yscr: "\u{1D4B4}", yscr: "\u{1D4CE}", YUcy: "\u042E",
  yucy: "\u044E", yuml: "\xFF", Yuml: "\u0178", Zacute: "\u0179", zacute: "\u017A", Zcaron: "\u017D", zcaron: "\u017E", Zcy: "\u0417", zcy: "\
\u0437", Zdot: "\u017B", zdot: "\u017C", zeetrf: "\u2128", ZeroWidthSpace: "\u200B", Zeta: "\u0396", zeta: "\u03B6", zfr: "\u{1D537}", Zfr: "\
\u2128", ZHcy: "\u0416", zhcy: "\u0436", zigrarr: "\u21DD", zopf: "\u{1D56B}", Zopf: "\u2124", Zscr: "\u{1D4B5}", zscr: "\u{1D4CF}", zwj: "\u200D",
  zwnj: "\u200C" };
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/maps/legacy.json
var sn = k((Pf, ja) => {
  ja.exports = { Aacute: "\xC1", aacute: "\xE1", Acirc: "\xC2", acirc: "\xE2", acute: "\xB4", AElig: "\xC6", aelig: "\xE6", Agrave: "\xC0", agrave: "\
\xE0", amp: "&", AMP: "&", Aring: "\xC5", aring: "\xE5", Atilde: "\xC3", atilde: "\xE3", Auml: "\xC4", auml: "\xE4", brvbar: "\xA6", Ccedil: "\
\xC7", ccedil: "\xE7", cedil: "\xB8", cent: "\xA2", copy: "\xA9", COPY: "\xA9", curren: "\xA4", deg: "\xB0", divide: "\xF7", Eacute: "\xC9",
  eacute: "\xE9", Ecirc: "\xCA", ecirc: "\xEA", Egrave: "\xC8", egrave: "\xE8", ETH: "\xD0", eth: "\xF0", Euml: "\xCB", euml: "\xEB", frac12: "\
\xBD", frac14: "\xBC", frac34: "\xBE", gt: ">", GT: ">", Iacute: "\xCD", iacute: "\xED", Icirc: "\xCE", icirc: "\xEE", iexcl: "\xA1", Igrave: "\
\xCC", igrave: "\xEC", iquest: "\xBF", Iuml: "\xCF", iuml: "\xEF", laquo: "\xAB", lt: "<", LT: "<", macr: "\xAF", micro: "\xB5", middot: "\xB7",
  nbsp: "\xA0", not: "\xAC", Ntilde: "\xD1", ntilde: "\xF1", Oacute: "\xD3", oacute: "\xF3", Ocirc: "\xD4", ocirc: "\xF4", Ograve: "\xD2", ograve: "\
\xF2", ordf: "\xAA", ordm: "\xBA", Oslash: "\xD8", oslash: "\xF8", Otilde: "\xD5", otilde: "\xF5", Ouml: "\xD6", ouml: "\xF6", para: "\xB6",
  plusmn: "\xB1", pound: "\xA3", quot: '"', QUOT: '"', raquo: "\xBB", reg: "\xAE", REG: "\xAE", sect: "\xA7", shy: "\xAD", sup1: "\xB9", sup2: "\
\xB2", sup3: "\xB3", szlig: "\xDF", THORN: "\xDE", thorn: "\xFE", times: "\xD7", Uacute: "\xDA", uacute: "\xFA", Ucirc: "\xDB", ucirc: "\xFB",
  Ugrave: "\xD9", ugrave: "\xF9", uml: "\xA8", Uuml: "\xDC", uuml: "\xFC", Yacute: "\xDD", yacute: "\xFD", yen: "\xA5", yuml: "\xFF" };
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/maps/xml.json
var bt = k((Ff, La) => {
  La.exports = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/maps/decode.json
var an = k((If, Na) => {
  Na.exports = { "0": 65533, "128": 8364, "130": 8218, "131": 402, "132": 8222, "133": 8230, "134": 8224, "135": 8225, "136": 710, "137": 8240,
  "138": 352, "139": 8249, "140": 338, "142": 381, "145": 8216, "146": 8217, "147": 8220, "148": 8221, "149": 8226, "150": 8211, "151": 8212,
  "152": 732, "153": 8482, "154": 353, "155": 8250, "156": 339, "158": 382, "159": 376 };
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/decode_codepoint.js
var cn = k((ze) => {
  "use strict";
  var Ma = ze && ze.__importDefault || function(r) {
    return r && r.__esModule ? r : { default: r };
  };
  Object.defineProperty(ze, "__esModule", { value: !0 });
  var ln = Ma(an()), _a = (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    String.fromCodePoint || function(r) {
      var e = "";
      return r > 65535 && (r -= 65536, e += String.fromCharCode(r >>> 10 & 1023 | 55296), r = 56320 | r & 1023), e += String.fromCharCode(r),
      e;
    }
  );
  function qa(r) {
    return r >= 55296 && r <= 57343 || r > 1114111 ? "\uFFFD" : (r in ln.default && (r = ln.default[r]), _a(r));
  }
  s(qa, "decodeCodePoint");
  ze.default = qa;
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/decode.js
var Et = k(($) => {
  "use strict";
  var dr = $ && $.__importDefault || function(r) {
    return r && r.__esModule ? r : { default: r };
  };
  Object.defineProperty($, "__esModule", { value: !0 });
  $.decodeHTML = $.decodeHTMLStrict = $.decodeXML = void 0;
  var Tt = dr(St()), Ua = dr(sn()), Ga = dr(bt()), dn = dr(cn()), Ba = /&(?:[a-zA-Z0-9]+|#[xX][\da-fA-F]+|#\d+);/g;
  $.decodeXML = un(Ga.default);
  $.decodeHTMLStrict = un(Tt.default);
  function un(r) {
    var e = fn(r);
    return function(t) {
      return String(t).replace(Ba, e);
    };
  }
  s(un, "getStrictDecoder");
  var pn = /* @__PURE__ */ s(function(r, e) {
    return r < e ? 1 : -1;
  }, "sorter");
  $.decodeHTML = function() {
    for (var r = Object.keys(Ua.default).sort(pn), e = Object.keys(Tt.default).sort(pn), t = 0, o = 0; t < e.length; t++)
      r[o] === e[t] ? (e[t] += ";?", o++) : e[t] += ";";
    var n = new RegExp("&(?:" + e.join("|") + "|#[xX][\\da-fA-F]+;?|#\\d+;?)", "g"), i = fn(Tt.default);
    function a(l) {
      return l.substr(-1) !== ";" && (l += ";"), i(l);
    }
    return s(a, "replacer"), function(l) {
      return String(l).replace(n, a);
    };
  }();
  function fn(r) {
    return /* @__PURE__ */ s(function(t) {
      if (t.charAt(1) === "#") {
        var o = t.charAt(2);
        return o === "X" || o === "x" ? dn.default(parseInt(t.substr(3), 16)) : dn.default(parseInt(t.substr(2), 10));
      }
      return r[t.slice(1, -1)] || t;
    }, "replace");
  }
  s(fn, "getReplacer");
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/encode.js
var xt = k((_) => {
  "use strict";
  var yn = _ && _.__importDefault || function(r) {
    return r && r.__esModule ? r : { default: r };
  };
  Object.defineProperty(_, "__esModule", { value: !0 });
  _.escapeUTF8 = _.escape = _.encodeNonAsciiHTML = _.encodeHTML = _.encodeXML = void 0;
  var za = yn(bt()), hn = gn(za.default), mn = Sn(hn);
  _.encodeXML = En(hn);
  var Va = yn(St()), Rt = gn(Va.default), Ha = Sn(Rt);
  _.encodeHTML = $a(Rt, Ha);
  _.encodeNonAsciiHTML = En(Rt);
  function gn(r) {
    return Object.keys(r).sort().reduce(function(e, t) {
      return e[r[t]] = "&" + t + ";", e;
    }, {});
  }
  s(gn, "getInverseObj");
  function Sn(r) {
    for (var e = [], t = [], o = 0, n = Object.keys(r); o < n.length; o++) {
      var i = n[o];
      i.length === 1 ? e.push("\\" + i) : t.push(i);
    }
    e.sort();
    for (var a = 0; a < e.length - 1; a++) {
      for (var l = a; l < e.length - 1 && e[l].charCodeAt(1) + 1 === e[l + 1].charCodeAt(1); )
        l += 1;
      var c = 1 + l - a;
      c < 3 || e.splice(a, c, e[a] + "-" + e[l]);
    }
    return t.unshift("[" + e.join("") + "]"), new RegExp(t.join("|"), "g");
  }
  s(Sn, "getInverseReplacer");
  var bn = /(?:[\x80-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g,
  Wa = (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    String.prototype.codePointAt != null ? (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      function(r) {
        return r.codePointAt(0);
      }
    ) : (
      // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      function(r) {
        return (r.charCodeAt(0) - 55296) * 1024 + r.charCodeAt(1) - 56320 + 65536;
      }
    )
  );
  function pr(r) {
    return "&#x" + (r.length > 1 ? Wa(r) : r.charCodeAt(0)).toString(16).toUpperCase() + ";";
  }
  s(pr, "singleCharReplacer");
  function $a(r, e) {
    return function(t) {
      return t.replace(e, function(o) {
        return r[o];
      }).replace(bn, pr);
    };
  }
  s($a, "getInverse");
  var Tn = new RegExp(mn.source + "|" + bn.source, "g");
  function Ya(r) {
    return r.replace(Tn, pr);
  }
  s(Ya, "escape");
  _.escape = Ya;
  function Ka(r) {
    return r.replace(mn, pr);
  }
  s(Ka, "escapeUTF8");
  _.escapeUTF8 = Ka;
  function En(r) {
    return function(e) {
      return e.replace(Tn, function(t) {
        return r[t] || pr(t);
      });
    };
  }
  s(En, "getASCIIEncoder");
});

// ../node_modules/ansi-to-html/node_modules/entities/lib/index.js
var xn = k((v) => {
  "use strict";
  Object.defineProperty(v, "__esModule", { value: !0 });
  v.decodeXMLStrict = v.decodeHTML5Strict = v.decodeHTML4Strict = v.decodeHTML5 = v.decodeHTML4 = v.decodeHTMLStrict = v.decodeHTML = v.decodeXML =
  v.encodeHTML5 = v.encodeHTML4 = v.escapeUTF8 = v.escape = v.encodeNonAsciiHTML = v.encodeHTML = v.encodeXML = v.encode = v.decodeStrict = v.
  decode = void 0;
  var ur = Et(), Rn = xt();
  function Xa(r, e) {
    return (!e || e <= 0 ? ur.decodeXML : ur.decodeHTML)(r);
  }
  s(Xa, "decode");
  v.decode = Xa;
  function Ja(r, e) {
    return (!e || e <= 0 ? ur.decodeXML : ur.decodeHTMLStrict)(r);
  }
  s(Ja, "decodeStrict");
  v.decodeStrict = Ja;
  function Qa(r, e) {
    return (!e || e <= 0 ? Rn.encodeXML : Rn.encodeHTML)(r);
  }
  s(Qa, "encode");
  v.encode = Qa;
  var ue = xt();
  Object.defineProperty(v, "encodeXML", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.encodeXML;
  }, "get") });
  Object.defineProperty(v, "encodeHTML", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.encodeHTML;
  }, "get") });
  Object.defineProperty(v, "encodeNonAsciiHTML", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.encodeNonAsciiHTML;
  }, "get") });
  Object.defineProperty(v, "escape", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.escape;
  }, "get") });
  Object.defineProperty(v, "escapeUTF8", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.escapeUTF8;
  }, "get") });
  Object.defineProperty(v, "encodeHTML4", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.encodeHTML;
  }, "get") });
  Object.defineProperty(v, "encodeHTML5", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return ue.encodeHTML;
  }, "get") });
  var oe = Et();
  Object.defineProperty(v, "decodeXML", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeXML;
  }, "get") });
  Object.defineProperty(v, "decodeHTML", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTML;
  }, "get") });
  Object.defineProperty(v, "decodeHTMLStrict", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTMLStrict;
  }, "get") });
  Object.defineProperty(v, "decodeHTML4", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTML;
  }, "get") });
  Object.defineProperty(v, "decodeHTML5", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTML;
  }, "get") });
  Object.defineProperty(v, "decodeHTML4Strict", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTMLStrict;
  }, "get") });
  Object.defineProperty(v, "decodeHTML5Strict", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeHTMLStrict;
  }, "get") });
  Object.defineProperty(v, "decodeXMLStrict", { enumerable: !0, get: /* @__PURE__ */ s(function() {
    return oe.decodeXML;
  }, "get") });
});

// ../node_modules/ansi-to-html/lib/ansi_to_html.js
var jn = k((qf, kn) => {
  "use strict";
  function Za(r, e) {
    if (!(r instanceof e))
      throw new TypeError("Cannot call a class as a function");
  }
  s(Za, "_classCallCheck");
  function wn(r, e) {
    for (var t = 0; t < e.length; t++) {
      var o = e[t];
      o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(r, o.key, o);
    }
  }
  s(wn, "_defineProperties");
  function el(r, e, t) {
    return e && wn(r.prototype, e), t && wn(r, t), r;
  }
  s(el, "_createClass");
  function In(r, e) {
    var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
    if (!t) {
      if (Array.isArray(r) || (t = rl(r)) || e && r && typeof r.length == "number") {
        t && (r = t);
        var o = 0, n = /* @__PURE__ */ s(function() {
        }, "F");
        return { s: n, n: /* @__PURE__ */ s(function() {
          return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] };
        }, "n"), e: /* @__PURE__ */ s(function(d) {
          throw d;
        }, "e"), f: n };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    var i = !0, a = !1, l;
    return { s: /* @__PURE__ */ s(function() {
      t = t.call(r);
    }, "s"), n: /* @__PURE__ */ s(function() {
      var d = t.next();
      return i = d.done, d;
    }, "n"), e: /* @__PURE__ */ s(function(d) {
      a = !0, l = d;
    }, "e"), f: /* @__PURE__ */ s(function() {
      try {
        !i && t.return != null && t.return();
      } finally {
        if (a) throw l;
      }
    }, "f") };
  }
  s(In, "_createForOfIteratorHelper");
  function rl(r, e) {
    if (r) {
      if (typeof r == "string") return vn(r, e);
      var t = Object.prototype.toString.call(r).slice(8, -1);
      if (t === "Object" && r.constructor && (t = r.constructor.name), t === "Map" || t === "Set") return Array.from(r);
      if (t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)) return vn(r, e);
    }
  }
  s(rl, "_unsupportedIterableToArray");
  function vn(r, e) {
    (e == null || e > r.length) && (e = r.length);
    for (var t = 0, o = new Array(e); t < e; t++)
      o[t] = r[t];
    return o;
  }
  s(vn, "_arrayLikeToArray");
  var tl = xn(), An = {
    fg: "#FFF",
    bg: "#000",
    newline: !1,
    escapeXML: !1,
    stream: !1,
    colors: ol()
  };
  function ol() {
    var r = {
      0: "#000",
      1: "#A00",
      2: "#0A0",
      3: "#A50",
      4: "#00A",
      5: "#A0A",
      6: "#0AA",
      7: "#AAA",
      8: "#555",
      9: "#F55",
      10: "#5F5",
      11: "#FF5",
      12: "#55F",
      13: "#F5F",
      14: "#5FF",
      15: "#FFF"
    };
    return fr(0, 5).forEach(function(e) {
      fr(0, 5).forEach(function(t) {
        fr(0, 5).forEach(function(o) {
          return nl(e, t, o, r);
        });
      });
    }), fr(0, 23).forEach(function(e) {
      var t = e + 232, o = On(e * 10 + 8);
      r[t] = "#" + o + o + o;
    }), r;
  }
  s(ol, "getDefaultColors");
  function nl(r, e, t, o) {
    var n = 16 + r * 36 + e * 6 + t, i = r > 0 ? r * 40 + 55 : 0, a = e > 0 ? e * 40 + 55 : 0, l = t > 0 ? t * 40 + 55 : 0;
    o[n] = sl([i, a, l]);
  }
  s(nl, "setStyleColor");
  function On(r) {
    for (var e = r.toString(16); e.length < 2; )
      e = "0" + e;
    return e;
  }
  s(On, "toHexString");
  function sl(r) {
    var e = [], t = In(r), o;
    try {
      for (t.s(); !(o = t.n()).done; ) {
        var n = o.value;
        e.push(On(n));
      }
    } catch (i) {
      t.e(i);
    } finally {
      t.f();
    }
    return "#" + e.join("");
  }
  s(sl, "toColorHexString");
  function Cn(r, e, t, o) {
    var n;
    return e === "text" ? n = cl(t, o) : e === "display" ? n = al(r, t, o) : e === "xterm256Foreground" ? n = hr(r, o.colors[t]) : e === "xt\
erm256Background" ? n = mr(r, o.colors[t]) : e === "rgb" && (n = il(r, t)), n;
  }
  s(Cn, "generateOutput");
  function il(r, e) {
    e = e.substring(2).slice(0, -1);
    var t = +e.substr(0, 2), o = e.substring(5).split(";"), n = o.map(function(i) {
      return ("0" + Number(i).toString(16)).substr(-2);
    }).join("");
    return yr(r, (t === 38 ? "color:#" : "background-color:#") + n);
  }
  s(il, "handleRgb");
  function al(r, e, t) {
    e = parseInt(e, 10);
    var o = {
      "-1": /* @__PURE__ */ s(function() {
        return "<br/>";
      }, "_"),
      0: /* @__PURE__ */ s(function() {
        return r.length && Dn(r);
      }, "_"),
      1: /* @__PURE__ */ s(function() {
        return ne(r, "b");
      }, "_"),
      3: /* @__PURE__ */ s(function() {
        return ne(r, "i");
      }, "_"),
      4: /* @__PURE__ */ s(function() {
        return ne(r, "u");
      }, "_"),
      8: /* @__PURE__ */ s(function() {
        return yr(r, "display:none");
      }, "_"),
      9: /* @__PURE__ */ s(function() {
        return ne(r, "strike");
      }, "_"),
      22: /* @__PURE__ */ s(function() {
        return yr(r, "font-weight:normal;text-decoration:none;font-style:normal");
      }, "_"),
      23: /* @__PURE__ */ s(function() {
        return Fn(r, "i");
      }, "_"),
      24: /* @__PURE__ */ s(function() {
        return Fn(r, "u");
      }, "_"),
      39: /* @__PURE__ */ s(function() {
        return hr(r, t.fg);
      }, "_"),
      49: /* @__PURE__ */ s(function() {
        return mr(r, t.bg);
      }, "_"),
      53: /* @__PURE__ */ s(function() {
        return yr(r, "text-decoration:overline");
      }, "_")
    }, n;
    return o[e] ? n = o[e]() : 4 < e && e < 7 ? n = ne(r, "blink") : 29 < e && e < 38 ? n = hr(r, t.colors[e - 30]) : 39 < e && e < 48 ? n =
    mr(r, t.colors[e - 40]) : 89 < e && e < 98 ? n = hr(r, t.colors[8 + (e - 90)]) : 99 < e && e < 108 && (n = mr(r, t.colors[8 + (e - 100)])),
    n;
  }
  s(al, "handleDisplay");
  function Dn(r) {
    var e = r.slice(0);
    return r.length = 0, e.reverse().map(function(t) {
      return "</" + t + ">";
    }).join("");
  }
  s(Dn, "resetStyles");
  function fr(r, e) {
    for (var t = [], o = r; o <= e; o++)
      t.push(o);
    return t;
  }
  s(fr, "range");
  function ll(r) {
    return function(e) {
      return (r === null || e.category !== r) && r !== "all";
    };
  }
  s(ll, "notCategory");
  function Pn(r) {
    r = parseInt(r, 10);
    var e = null;
    return r === 0 ? e = "all" : r === 1 ? e = "bold" : 2 < r && r < 5 ? e = "underline" : 4 < r && r < 7 ? e = "blink" : r === 8 ? e = "hid\
e" : r === 9 ? e = "strike" : 29 < r && r < 38 || r === 39 || 89 < r && r < 98 ? e = "foreground-color" : (39 < r && r < 48 || r === 49 || 99 <
    r && r < 108) && (e = "background-color"), e;
  }
  s(Pn, "categoryForCode");
  function cl(r, e) {
    return e.escapeXML ? tl.encodeXML(r) : r;
  }
  s(cl, "pushText");
  function ne(r, e, t) {
    return t || (t = ""), r.push(e), "<".concat(e).concat(t ? ' style="'.concat(t, '"') : "", ">");
  }
  s(ne, "pushTag");
  function yr(r, e) {
    return ne(r, "span", e);
  }
  s(yr, "pushStyle");
  function hr(r, e) {
    return ne(r, "span", "color:" + e);
  }
  s(hr, "pushForegroundColor");
  function mr(r, e) {
    return ne(r, "span", "background-color:" + e);
  }
  s(mr, "pushBackgroundColor");
  function Fn(r, e) {
    var t;
    if (r.slice(-1)[0] === e && (t = r.pop()), t)
      return "</" + e + ">";
  }
  s(Fn, "closeTag");
  function dl(r, e, t) {
    var o = !1, n = 3;
    function i() {
      return "";
    }
    s(i, "remove");
    function a(x, w) {
      return t("xterm256Foreground", w), "";
    }
    s(a, "removeXterm256Foreground");
    function l(x, w) {
      return t("xterm256Background", w), "";
    }
    s(l, "removeXterm256Background");
    function c(x) {
      return e.newline ? t("display", -1) : t("text", x), "";
    }
    s(c, "newline");
    function d(x, w) {
      o = !0, w.trim().length === 0 && (w = "0"), w = w.trimRight(";").split(";");
      var A = In(w), O;
      try {
        for (A.s(); !(O = A.n()).done; ) {
          var N = O.value;
          t("display", N);
        }
      } catch (U) {
        A.e(U);
      } finally {
        A.f();
      }
      return "";
    }
    s(d, "ansiMess");
    function p(x) {
      return t("text", x), "";
    }
    s(p, "realText");
    function u(x) {
      return t("rgb", x), "";
    }
    s(u, "rgb");
    var y = [{
      pattern: /^\x08+/,
      sub: i
    }, {
      pattern: /^\x1b\[[012]?K/,
      sub: i
    }, {
      pattern: /^\x1b\[\(B/,
      sub: i
    }, {
      pattern: /^\x1b\[[34]8;2;\d+;\d+;\d+m/,
      sub: u
    }, {
      pattern: /^\x1b\[38;5;(\d+)m/,
      sub: a
    }, {
      pattern: /^\x1b\[48;5;(\d+)m/,
      sub: l
    }, {
      pattern: /^\n/,
      sub: c
    }, {
      pattern: /^\r+\n/,
      sub: c
    }, {
      pattern: /^\r/,
      sub: c
    }, {
      pattern: /^\x1b\[((?:\d{1,3};?)+|)m/,
      sub: d
    }, {
      // CSI n J
      // ED - Erase in Display Clears part of the screen.
      // If n is 0 (or missing), clear from cursor to end of screen.
      // If n is 1, clear from cursor to beginning of the screen.
      // If n is 2, clear entire screen (and moves cursor to upper left on DOS ANSI.SYS).
      // If n is 3, clear entire screen and delete all lines saved in the scrollback buffer
      //   (this feature was added for xterm and is supported by other terminal applications).
      pattern: /^\x1b\[\d?J/,
      sub: i
    }, {
      // CSI n ; m f
      // HVP - Horizontal Vertical Position Same as CUP
      pattern: /^\x1b\[\d{0,3};\d{0,3}f/,
      sub: i
    }, {
      // catch-all for CSI sequences?
      pattern: /^\x1b\[?[\d;]{0,3}/,
      sub: i
    }, {
      /**
       * extracts real text - not containing:
       * - `\x1b' - ESC - escape (Ascii 27)
       * - '\x08' - BS - backspace (Ascii 8)
       * - `\n` - Newline - linefeed (LF) (ascii 10)
       * - `\r` - Windows Carriage Return (CR)
       */
      pattern: /^(([^\x1b\x08\r\n])+)/,
      sub: p
    }];
    function m(x, w) {
      w > n && o || (o = !1, r = r.replace(x.pattern, x.sub));
    }
    s(m, "process");
    var g = [], S = r, h = S.length;
    e: for (; h > 0; ) {
      for (var E = 0, R = 0, f = y.length; R < f; E = ++R) {
        var b = y[E];
        if (m(b, E), r.length !== h) {
          h = r.length;
          continue e;
        }
      }
      if (r.length === h)
        break;
      g.push(0), h = r.length;
    }
    return g;
  }
  s(dl, "tokenize");
  function pl(r, e, t) {
    return e !== "text" && (r = r.filter(ll(Pn(t))), r.push({
      token: e,
      data: t,
      category: Pn(t)
    })), r;
  }
  s(pl, "updateStickyStack");
  var ul = /* @__PURE__ */ function() {
    function r(e) {
      Za(this, r), e = e || {}, e.colors && (e.colors = Object.assign({}, An.colors, e.colors)), this.options = Object.assign({}, An, e), this.
      stack = [], this.stickyStack = [];
    }
    return s(r, "Filter"), el(r, [{
      key: "toHtml",
      value: /* @__PURE__ */ s(function(t) {
        var o = this;
        t = typeof t == "string" ? [t] : t;
        var n = this.stack, i = this.options, a = [];
        return this.stickyStack.forEach(function(l) {
          var c = Cn(n, l.token, l.data, i);
          c && a.push(c);
        }), dl(t.join(""), i, function(l, c) {
          var d = Cn(n, l, c, i);
          d && a.push(d), i.stream && (o.stickyStack = pl(o.stickyStack, l, c));
        }), n.length && a.push(Dn(n)), a.join("");
      }, "toHtml")
    }]), r;
  }();
  kn.exports = ul;
});

// ../node_modules/@storybook/global/dist/index.mjs
var I = (() => {
  let r;
  return typeof window < "u" ? r = window : typeof globalThis < "u" ? r = globalThis : typeof global < "u" ? r = global : typeof self < "u" ?
  r = self : r = {}, r;
})();

// src/preview-api/modules/addons/storybook-channel-mock.ts
import { Channel as Kn } from "@storybook/core/channels";
function Tr() {
  let r = {
    setHandler: /* @__PURE__ */ s(() => {
    }, "setHandler"),
    send: /* @__PURE__ */ s(() => {
    }, "send")
  };
  return new Kn({ transport: r });
}
s(Tr, "mockChannel");

// src/preview-api/modules/addons/main.ts
var xr = class xr {
  constructor() {
    this.getChannel = /* @__PURE__ */ s(() => {
      if (!this.channel) {
        let e = Tr();
        return this.setChannel(e), e;
      }
      return this.channel;
    }, "getChannel");
    this.ready = /* @__PURE__ */ s(() => this.promise, "ready");
    this.hasChannel = /* @__PURE__ */ s(() => !!this.channel, "hasChannel");
    this.setChannel = /* @__PURE__ */ s((e) => {
      this.channel = e, this.resolve();
    }, "setChannel");
    this.promise = new Promise((e) => {
      this.resolve = () => e(this.getChannel());
    });
  }
};
s(xr, "AddonStore");
var Rr = xr, Er = "__STORYBOOK_ADDONS_PREVIEW";
function Xn() {
  return I[Er] || (I[Er] = new Rr()), I[Er];
}
s(Xn, "getAddonsStore");
var V = Xn();

// src/preview-api/modules/addons/definePreview.ts
function Jn(r) {
  return r;
}
s(Jn, "definePreview");

// src/preview-api/modules/addons/hooks.ts
import { logger as Ie } from "@storybook/core/client-logger";
import {
  FORCE_RE_RENDER as Qn,
  RESET_STORY_ARGS as Zn,
  STORY_RENDERED as Ft,
  UPDATE_GLOBALS as es,
  UPDATE_STORY_ARGS as rs
} from "@storybook/core/core-events";
var Pr = class Pr {
  constructor() {
    this.hookListsMap = void 0;
    this.mountedDecorators = void 0;
    this.prevMountedDecorators = void 0;
    this.currentHooks = void 0;
    this.nextHookIndex = void 0;
    this.currentPhase = void 0;
    this.currentEffects = void 0;
    this.prevEffects = void 0;
    this.currentDecoratorName = void 0;
    this.hasUpdates = void 0;
    this.currentContext = void 0;
    this.renderListener = /* @__PURE__ */ s((e) => {
      e === this.currentContext?.id && (this.triggerEffects(), this.currentContext = null, this.removeRenderListeners());
    }, "renderListener");
    this.init();
  }
  init() {
    this.hookListsMap = /* @__PURE__ */ new WeakMap(), this.mountedDecorators = /* @__PURE__ */ new Set(), this.prevMountedDecorators = /* @__PURE__ */ new Set(),
    this.currentHooks = [], this.nextHookIndex = 0, this.currentPhase = "NONE", this.currentEffects = [], this.prevEffects = [], this.currentDecoratorName =
    null, this.hasUpdates = !1, this.currentContext = null;
  }
  clean() {
    this.prevEffects.forEach((e) => {
      e.destroy && e.destroy();
    }), this.init(), this.removeRenderListeners();
  }
  getNextHook() {
    let e = this.currentHooks[this.nextHookIndex];
    return this.nextHookIndex += 1, e;
  }
  triggerEffects() {
    this.prevEffects.forEach((e) => {
      !this.currentEffects.includes(e) && e.destroy && e.destroy();
    }), this.currentEffects.forEach((e) => {
      this.prevEffects.includes(e) || (e.destroy = e.create());
    }), this.prevEffects = this.currentEffects, this.currentEffects = [];
  }
  addRenderListeners() {
    this.removeRenderListeners(), V.getChannel().on(Ft, this.renderListener);
  }
  removeRenderListeners() {
    V.getChannel().removeListener(Ft, this.renderListener);
  }
};
s(Pr, "HooksContext");
var se = Pr;
function It(r) {
  let e = /* @__PURE__ */ s((...t) => {
    let { hooks: o } = typeof t[0] == "function" ? t[1] : t[0], n = o.currentPhase, i = o.currentHooks, a = o.nextHookIndex, l = o.currentDecoratorName;
    o.currentDecoratorName = r.name, o.prevMountedDecorators.has(r) ? (o.currentPhase = "UPDATE", o.currentHooks = o.hookListsMap.get(r) || []) :
    (o.currentPhase = "MOUNT", o.currentHooks = [], o.hookListsMap.set(r, o.currentHooks), o.prevMountedDecorators.add(r)), o.nextHookIndex =
    0;
    let c = I.STORYBOOK_HOOKS_CONTEXT;
    I.STORYBOOK_HOOKS_CONTEXT = o;
    let d = r(...t);
    if (I.STORYBOOK_HOOKS_CONTEXT = c, o.currentPhase === "UPDATE" && o.getNextHook() != null)
      throw new Error(
        "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
      );
    return o.currentPhase = n, o.currentHooks = i, o.nextHookIndex = a, o.currentDecoratorName = l, d;
  }, "hookified");
  return e.originalFn = r, e;
}
s(It, "hookify");
var wr = 0, ts = 25, vr = /* @__PURE__ */ s((r) => (e, t) => {
  let o = r(
    It(e),
    t.map((n) => It(n))
  );
  return (n) => {
    let { hooks: i } = n;
    i.prevMountedDecorators ??= /* @__PURE__ */ new Set(), i.mountedDecorators = /* @__PURE__ */ new Set([e, ...t]), i.currentContext = n, i.
    hasUpdates = !1;
    let a = o(n);
    for (wr = 1; i.hasUpdates; )
      if (i.hasUpdates = !1, i.currentEffects = [], a = o(n), wr += 1, wr > ts)
        throw new Error(
          "Too many re-renders. Storybook limits the number of renders to prevent an infinite loop."
        );
    return i.addRenderListeners(), a;
  };
}, "applyHooks"), os = /* @__PURE__ */ s((r, e) => r.length === e.length && r.every((t, o) => t === e[o]), "areDepsEqual"), Ar = /* @__PURE__ */ s(
() => new Error("Storybook preview hooks can only be called inside decorators and story functions."), "invalidHooksError");
function Ot() {
  return I.STORYBOOK_HOOKS_CONTEXT || null;
}
s(Ot, "getHooksContextOrNull");
function Cr() {
  let r = Ot();
  if (r == null)
    throw Ar();
  return r;
}
s(Cr, "getHooksContextOrThrow");
function ns(r, e, t) {
  let o = Cr();
  if (o.currentPhase === "MOUNT") {
    t != null && !Array.isArray(t) && Ie.warn(
      `${r} received a final argument that is not an array (instead, received ${t}). When specified, the final argument must be an array.`
    );
    let n = { name: r, deps: t };
    return o.currentHooks.push(n), e(n), n;
  }
  if (o.currentPhase === "UPDATE") {
    let n = o.getNextHook();
    if (n == null)
      throw new Error("Rendered more hooks than during the previous render.");
    return n.name !== r && Ie.warn(
      `Storybook has detected a change in the order of Hooks${o.currentDecoratorName ? ` called by ${o.currentDecoratorName}` : ""}. This wi\
ll lead to bugs and errors if not fixed.`
    ), t != null && n.deps == null && Ie.warn(
      `${r} received a final argument during this render, but not during the previous render. Even though the final argument is optional, it\
s type cannot change between renders.`
    ), t != null && n.deps != null && t.length !== n.deps.length && Ie.warn(`The final argument passed to ${r} changed size between renders.\
 The order and size of this array must remain constant.
Previous: ${n.deps}
Incoming: ${t}`), (t == null || n.deps == null || !os(t, n.deps)) && (e(n), n.deps = t), n;
  }
  throw Ar();
}
s(ns, "useHook");
function He(r, e, t) {
  let { memoizedState: o } = ns(
    r,
    (n) => {
      n.memoizedState = e();
    },
    t
  );
  return o;
}
s(He, "useMemoLike");
function ss(r, e) {
  return He("useMemo", r, e);
}
s(ss, "useMemo");
function Oe(r, e) {
  return He("useCallback", () => r, e);
}
s(Oe, "useCallback");
function Dt(r, e) {
  return He(r, () => ({ current: e }), []);
}
s(Dt, "useRefLike");
function is(r) {
  return Dt("useRef", r);
}
s(is, "useRef");
function as() {
  let r = Ot();
  if (r != null && r.currentPhase !== "NONE")
    r.hasUpdates = !0;
  else
    try {
      V.getChannel().emit(Qn);
    } catch {
      Ie.warn("State updates of Storybook preview hooks work only in browser");
    }
}
s(as, "triggerUpdate");
function kt(r, e) {
  let t = Dt(
    r,
    // @ts-expect-error S type should never be function, but there's no way to tell that to TypeScript
    typeof e == "function" ? e() : e
  ), o = /* @__PURE__ */ s((n) => {
    t.current = typeof n == "function" ? n(t.current) : n, as();
  }, "setState");
  return [t.current, o];
}
s(kt, "useStateLike");
function ls(r) {
  return kt("useState", r);
}
s(ls, "useState");
function cs(r, e, t) {
  let o = t != null ? () => t(e) : e, [n, i] = kt("useReducer", o);
  return [n, /* @__PURE__ */ s((l) => i((c) => r(c, l)), "dispatch")];
}
s(cs, "useReducer");
function jt(r, e) {
  let t = Cr(), o = He("useEffect", () => ({ create: r }), e);
  t.currentEffects.includes(o) || t.currentEffects.push(o);
}
s(jt, "useEffect");
function ds(r, e = []) {
  let t = V.getChannel();
  return jt(() => (Object.entries(r).forEach(([o, n]) => t.on(o, n)), () => {
    Object.entries(r).forEach(
      ([o, n]) => t.removeListener(o, n)
    );
  }), [...Object.keys(r), ...e]), Oe(t.emit.bind(t), [t]);
}
s(ds, "useChannel");
function We() {
  let { currentContext: r } = Cr();
  if (r == null)
    throw Ar();
  return r;
}
s(We, "useStoryContext");
function ps(r, e) {
  let { parameters: t } = We();
  if (r)
    return t[r] ?? e;
}
s(ps, "useParameter");
function us() {
  let r = V.getChannel(), { id: e, args: t } = We(), o = Oe(
    (i) => r.emit(rs, { storyId: e, updatedArgs: i }),
    [r, e]
  ), n = Oe(
    (i) => r.emit(Zn, { storyId: e, argNames: i }),
    [r, e]
  );
  return [t, o, n];
}
s(us, "useArgs");
function fs() {
  let r = V.getChannel(), { globals: e } = We(), t = Oe(
    (o) => r.emit(es, { globals: o }),
    [r]
  );
  return [e, t];
}
s(fs, "useGlobals");

// src/preview-api/modules/addons/make-decorator.ts
var ys = /* @__PURE__ */ s(({
  name: r,
  parameterName: e,
  wrapper: t,
  skipIfNoParametersOrOptions: o = !1
}) => {
  let n = /* @__PURE__ */ s((i) => (a, l) => {
    let c = l.parameters && l.parameters[e];
    return c && c.disable || o && !i && !c ? a(l) : t(a, l, {
      options: i,
      parameters: c
    });
  }, "decorator");
  return (...i) => typeof i[0] == "function" ? n()(...i) : (...a) => {
    if (a.length > 1)
      return i.length > 1 ? n(i)(...a) : n(...i)(...a);
    throw new Error(
      `Passing stories directly into ${r}() is not allowed,
        instead use addDecorator(${r}) and pass options with the '${e}' parameter`
    );
  };
}, "makeDecorator");

// ../node_modules/ts-dedent/esm/index.js
function P(r) {
  for (var e = [], t = 1; t < arguments.length; t++)
    e[t - 1] = arguments[t];
  var o = Array.from(typeof r == "string" ? [r] : r);
  o[o.length - 1] = o[o.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var n = o.reduce(function(l, c) {
    var d = c.match(/\n([\t ]+|(?!\s).)/g);
    return d ? l.concat(d.map(function(p) {
      var u, y;
      return (y = (u = p.match(/[\t ]/g)) === null || u === void 0 ? void 0 : u.length) !== null && y !== void 0 ? y : 0;
    })) : l;
  }, []);
  if (n.length) {
    var i = new RegExp(`
[	 ]{` + Math.min.apply(Math, n) + "}", "g");
    o = o.map(function(l) {
      return l.replace(i, `
`);
    });
  }
  o[0] = o[0].replace(/^\r?\n/, "");
  var a = o[0];
  return e.forEach(function(l, c) {
    var d = a.match(/(?:^|\n)( *)$/), p = d ? d[1] : "", u = l;
    typeof l == "string" && l.includes(`
`) && (u = String(l).split(`
`).map(function(y, m) {
      return m === 0 ? y : "" + p + y;
    }).join(`
`)), a += u + o[c + 1];
  }), a;
}
s(P, "dedent");
var Lt = P;

// src/shared/universal-store/instances.ts
var Fr = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var hs = "UNIVERSAL_STORE:", q = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, T = class T {
  constructor(e, t) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = /* @__PURE__ */ s(() => (this.debug("getState", { state: this.state }), this.state), "getState");
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = /* @__PURE__ */ s((e, t) => {
      let o = typeof e == "function", n = o ? "*" : e, i = o ? e : t;
      if (this.debug("subscribe", { eventType: n, listener: i }), !i)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(n) || this.listeners.set(n, /* @__PURE__ */ new Set()), this.listeners.get(n).add(i), () => {
        this.debug("unsubscribe", { eventType: n, listener: i }), this.listeners.has(n) && (this.listeners.get(n).delete(i), this.listeners.
        get(n)?.size === 0 && this.listeners.delete(n));
      };
    }, "subscribe");
    /** Sends a custom event to the other stores */
    this.send = /* @__PURE__ */ s((e) => {
      if (this.debug("send", { event: e }), this.status !== T.Status.READY)
        throw new TypeError(
          P`Cannot send event before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
            {
              event: e,
              id: this.id,
              actor: this.actor,
              environment: this.environment
            },
            null,
            2
          )}`
        );
      this.emitToListeners(e, { actor: this.actor }), this.emitToChannel(e, { actor: this.actor });
    }, "send");
    if (this.debugging = e.debug ?? !1, !T.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (T.isInternalConstructing = !1, this.id = e.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.
    actorType = e.leader ? T.ActorType.LEADER : T.ActorType.FOLLOWER, this.state = e.initialState, this.channelEventName = `${hs}${this.id}`,
    this.debug("constructor", {
      options: e,
      environmentOverrides: t,
      channelEventName: this.channelEventName
    }), this.actor.type === T.ActorType.LEADER)
      this.syncing = {
        state: q.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let o, n, i = new Promise((a, l) => {
        o = /* @__PURE__ */ s(() => {
          this.syncing.state === q.PENDING && (this.syncing.state = q.RESOLVED, a());
        }, "syncingResolve"), n = /* @__PURE__ */ s((c) => {
          this.syncing.state === q.PENDING && (this.syncing.state = q.REJECTED, l(c));
        }, "syncingReject");
      });
      this.syncing = {
        state: q.PENDING,
        promise: i,
        resolve: o,
        reject: n
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange =
    this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.
    prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(
    this), this.debug = this.debug.bind(this), this.channel = t?.channel ?? T.preparation.channel, this.environment = t?.environment ?? T.preparation.
    environment, this.channel && this.environment ? this.prepareThis({ channel: this.channel, environment: this.environment }) : T.preparation.
    promise.then(this.prepareThis);
  }
  static setupPreparationPromise() {
    let e, t, o = new Promise(
      (n, i) => {
        e = /* @__PURE__ */ s((a) => {
          n(a);
        }, "resolveRef"), t = /* @__PURE__ */ s((...a) => {
          i(a);
        }, "rejectRef");
      }
    );
    T.preparation = {
      resolve: e,
      reject: t,
      promise: o
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? T.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return T.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case q.PENDING:
      case void 0:
        return T.Status.SYNCING;
      case q.REJECTED:
        return T.Status.ERROR;
      case q.RESOLVED:
      default:
        return T.Status.READY;
    }
  }
  /**
   * A promise that resolves when the store is fully ready. A leader will be ready when the store
   * has been prepared by Storybook, which is almost instantly.
   *
   * A follower will be ready when the state has been synced with the leader's state, within a few
   * hundred milliseconds.
   */
  untilReady() {
    return Promise.all([T.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(e) {
    if (!e || typeof e?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    e.debug && console.debug(
      P`[UniversalStore]
        create`,
      { options: e }
    );
    let t = Fr.get(e.id);
    if (t)
      return console.warn(P`UniversalStore with id "${e.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), t;
    T.isInternalConstructing = !0;
    let o = new T(e);
    return Fr.set(e.id, o), o;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(e, t) {
    T.preparation.channel = e, T.preparation.environment = t, T.preparation.resolve({ channel: e, environment: t });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(e) {
    let t = this.state, o = typeof e == "function" ? e(t) : e;
    if (this.debug("setState", { newState: o, previousState: t, updater: e }), this.status !== T.Status.READY)
      throw new TypeError(
        P`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState: o,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = o;
    let n = {
      type: T.InternalEventType.SET_STATE,
      payload: {
        state: o,
        previousState: t
      }
    };
    this.emitToChannel(n, { actor: this.actor }), this.emitToListeners(n, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(e) {
    return this.debug("onStateChange", { listener: e }), this.subscribe(
      T.InternalEventType.SET_STATE,
      ({ payload: t }, o) => {
        e(t.state, t.previousState, o);
      }
    );
  }
  emitToChannel(e, t) {
    this.debug("emitToChannel", { event: e, eventInfo: t, channel: this.channel }), this.channel?.emit(this.channelEventName, {
      event: e,
      eventInfo: t
    });
  }
  prepareThis({
    channel: e,
    environment: t
  }) {
    this.channel = e, this.environment = t, this.debug("prepared", { channel: e, environment: t }), this.channel.on(this.channelEventName, this.
    handleChannelEvents), this.actor.type === T.ActorType.LEADER ? this.emitToChannel(
      { type: T.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: T.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: T.InternalEventType.EXISTING_STATE_REQUEST },
      { actor: this.actor }
    ), setTimeout(() => {
      this.syncing.reject(
        new TypeError(
          `No existing state found for follower with id: '${this.id}'. Make sure a leader with the same id exists before creating a follower\
.`
        )
      );
    }, 1e3));
  }
  emitToListeners(e, t) {
    let o = this.listeners.get(e.type), n = this.listeners.get("*");
    this.debug("emitToListeners", {
      event: e,
      eventInfo: t,
      eventTypeListeners: o,
      everythingListeners: n
    }), [...o ?? [], ...n ?? []].forEach(
      (i) => i(e, t)
    );
  }
  handleChannelEvents(e) {
    let { event: t, eventInfo: o } = e;
    if ([o.actor.id, o.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent: e });
      return;
    } else if (this.syncing?.state === q.PENDING && t.type !== T.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent: e });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent: e }), this.actor.type === T.ActorType.LEADER) {
      let n = !0;
      switch (t.type) {
        case T.InternalEventType.EXISTING_STATE_REQUEST:
          n = !1;
          let i = {
            type: T.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent: i
          }), this.emitToChannel(i, { actor: this.actor });
          break;
        case T.InternalEventType.LEADER_CREATED:
          n = !1, this.syncing.state = q.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event: t
          }), console.error(
            P`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(o.actor, null, 2)}`
          );
          break;
      }
      n && (this.debug("handleChannelEvents: forwarding event", { channelEvent: e }), this.emitToChannel(t, { actor: o.actor, forwardingActor: this.
      actor }));
    }
    if (this.actor.type === T.ActorType.FOLLOWER)
      switch (t.type) {
        case T.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event: t
          }), this.syncing?.state !== q.PENDING)
            break;
          this.syncing.resolve?.();
          let n = {
            type: T.InternalEventType.SET_STATE,
            payload: {
              state: t.payload,
              previousState: this.state
            }
          };
          this.state = t.payload, this.emitToListeners(n, o);
          break;
      }
    switch (t.type) {
      case T.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event: t }), this.state = t.payload.state;
        break;
    }
    this.emitToListeners(t, { actor: o.actor });
  }
  debug(e, t) {
    this.debugging && console.debug(
      P`[UniversalStore::${this.id}::${this.environment ?? T.Environment.UNKNOWN}]
        ${e}`,
      JSON.stringify(
        {
          data: t,
          actor: this.actor,
          state: this.state,
          status: this.status
        },
        null,
        2
      )
    );
  }
  /**
   * Used to reset the static fields of the UniversalStore class when cleaning up tests
   *
   * @internal
   */
  static __reset() {
    T.preparation.reject(new Error("reset")), T.setupPreparationPromise(), T.isInternalConstructing = !1;
  }
};
s(T, "UniversalStore"), /**
 * Defines the possible actor types in the store system
 *
 * @readonly
 */
T.ActorType = {
  LEADER: "LEADER",
  FOLLOWER: "FOLLOWER"
}, /**
 * Defines the possible environments the store can run in
 *
 * @readonly
 */
T.Environment = {
  SERVER: "SERVER",
  MANAGER: "MANAGER",
  PREVIEW: "PREVIEW",
  UNKNOWN: "UNKNOWN",
  MOCK: "MOCK"
}, /**
 * Internal event types used for store synchronization
 *
 * @readonly
 */
T.InternalEventType = {
  EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
  EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
  SET_STATE: "__SET_STATE",
  LEADER_CREATED: "__LEADER_CREATED",
  FOLLOWER_CREATED: "__FOLLOWER_CREATED"
}, T.Status = {
  UNPREPARED: "UNPREPARED",
  SYNCING: "SYNCING",
  READY: "READY",
  ERROR: "ERROR"
}, // This is used to check if constructor was called from the static factory create()
T.isInternalConstructing = !1, T.setupPreparationPromise();
var J = T;

// src/shared/universal-store/use-universal-store-preview.ts
import { useEffect as ms, useState as gs } from "@storybook/core/preview-api";

// ../node_modules/es-toolkit/dist/object/omitBy.mjs
function Ir(r, e) {
  let t = {}, o = Object.entries(r);
  for (let n = 0; n < o.length; n++) {
    let [i, a] = o[n];
    e(a, i) || (t[i] = a);
  }
  return t;
}
s(Ir, "omitBy");

// ../node_modules/es-toolkit/dist/object/pick.mjs
function Or(r, e) {
  let t = {};
  for (let o = 0; o < e.length; o++) {
    let n = e[o];
    Object.prototype.hasOwnProperty.call(r, n) && (t[n] = r[n]);
  }
  return t;
}
s(Or, "pick");

// ../node_modules/es-toolkit/dist/object/pickBy.mjs
function Dr(r, e) {
  let t = {}, o = Object.entries(r);
  for (let n = 0; n < o.length; n++) {
    let [i, a] = o[n];
    e(a, i) && (t[i] = a);
  }
  return t;
}
s(Dr, "pickBy");

// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function L(r) {
  if (typeof r != "object" || r == null)
    return !1;
  if (Object.getPrototypeOf(r) === null)
    return !0;
  if (r.toString() !== "[object Object]")
    return !1;
  let e = r;
  for (; Object.getPrototypeOf(e) !== null; )
    e = Object.getPrototypeOf(e);
  return Object.getPrototypeOf(r) === e;
}
s(L, "isPlainObject");

// ../node_modules/es-toolkit/dist/object/mapValues.mjs
function G(r, e) {
  let t = {}, o = Object.keys(r);
  for (let n = 0; n < o.length; n++) {
    let i = o[n], a = r[i];
    t[i] = e(a, i, r);
  }
  return t;
}
s(G, "mapValues");

// ../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var Nt = "[object RegExp]", Mt = "[object String]", _t = "[object Number]", qt = "[object Boolean]", kr = "[object Arguments]", Ut = "[objec\
t Symbol]", Gt = "[object Date]", Bt = "[object Map]", zt = "[object Set]", Vt = "[object Array]", Ht = "[object Function]", Wt = "[object A\
rrayBuffer]", $e = "[object Object]", $t = "[object Error]", Yt = "[object DataView]", Kt = "[object Uint8Array]", Xt = "[object Uint8Clampe\
dArray]", Jt = "[object Uint16Array]", Qt = "[object Uint32Array]", Zt = "[object BigUint64Array]", eo = "[object Int8Array]", ro = "[object\
 Int16Array]", to = "[object Int32Array]", oo = "[object BigInt64Array]", no = "[object Float32Array]", so = "[object Float64Array]";

// ../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function jr(r) {
  return Object.getOwnPropertySymbols(r).filter((e) => Object.prototype.propertyIsEnumerable.call(r, e));
}
s(jr, "getSymbols");

// ../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function Lr(r) {
  return r == null ? r === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(r);
}
s(Lr, "getTag");

// ../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function De(r, e) {
  if (typeof r == typeof e)
    switch (typeof r) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return r === e;
      case "number":
        return r === e || Object.is(r, e);
      case "function":
        return r === e;
      case "object":
        return Y(r, e);
    }
  return Y(r, e);
}
s(De, "isEqual");
function Y(r, e, t) {
  if (Object.is(r, e))
    return !0;
  let o = Lr(r), n = Lr(e);
  if (o === kr && (o = $e), n === kr && (n = $e), o !== n)
    return !1;
  switch (o) {
    case Mt:
      return r.toString() === e.toString();
    case _t: {
      let l = r.valueOf(), c = e.valueOf();
      return l === c || Number.isNaN(l) && Number.isNaN(c);
    }
    case qt:
    case Gt:
    case Ut:
      return Object.is(r.valueOf(), e.valueOf());
    case Nt:
      return r.source === e.source && r.flags === e.flags;
    case Ht:
      return r === e;
  }
  t = t ?? /* @__PURE__ */ new Map();
  let i = t.get(r), a = t.get(e);
  if (i != null && a != null)
    return i === e;
  t.set(r, e), t.set(e, r);
  try {
    switch (o) {
      case Bt: {
        if (r.size !== e.size)
          return !1;
        for (let [l, c] of r.entries())
          if (!e.has(l) || !Y(c, e.get(l), t))
            return !1;
        return !0;
      }
      case zt: {
        if (r.size !== e.size)
          return !1;
        let l = Array.from(r.values()), c = Array.from(e.values());
        for (let d = 0; d < l.length; d++) {
          let p = l[d], u = c.findIndex((y) => Y(p, y, t));
          if (u === -1)
            return !1;
          c.splice(u, 1);
        }
        return !0;
      }
      case Vt:
      case Kt:
      case Xt:
      case Jt:
      case Qt:
      case Zt:
      case eo:
      case ro:
      case to:
      case oo:
      case no:
      case so: {
        if (typeof Buffer < "u" && Buffer.isBuffer(r) !== Buffer.isBuffer(e) || r.length !== e.length)
          return !1;
        for (let l = 0; l < r.length; l++)
          if (!Y(r[l], e[l], t))
            return !1;
        return !0;
      }
      case Wt:
        return r.byteLength !== e.byteLength ? !1 : Y(new Uint8Array(r), new Uint8Array(e), t);
      case Yt:
        return r.byteLength !== e.byteLength || r.byteOffset !== e.byteOffset ? !1 : Y(r.buffer, e.buffer, t);
      case $t:
        return r.name === e.name && r.message === e.message;
      case $e: {
        if (!(Y(r.constructor, e.constructor, t) || L(r) && L(e)))
          return !1;
        let c = [...Object.keys(r), ...jr(r)], d = [...Object.keys(e), ...jr(e)];
        if (c.length !== d.length)
          return !1;
        for (let p = 0; p < c.length; p++) {
          let u = c[p], y = r[u];
          if (!Object.prototype.hasOwnProperty.call(e, u))
            return !1;
          let m = e[u];
          if (!Y(y, m, t))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    t.delete(r), t.delete(e);
  }
}
s(Y, "areObjectsEqual");

// src/shared/universal-store/use-universal-store-preview.ts
var Ss = /* @__PURE__ */ s((r, e) => {
  let [t, o] = gs(
    e ? e(r.getState()) : r.getState()
  );
  return ms(() => r.onStateChange((n, i) => {
    if (!e) {
      o(n);
      return;
    }
    let a = e(n), l = e(i);
    !De(a, l) && o(a);
  }), [r, o, e]), [t, r.setState];
}, "useUniversalStore");

// src/shared/universal-store/mock.ts
import { Channel as bs } from "@storybook/core/channels";
var Ye = class Ye extends J {
  constructor(e, t) {
    J.isInternalConstructing = !0, super(
      { ...e, leader: !0 },
      { channel: new bs({}), environment: J.Environment.MOCK }
    ), J.isInternalConstructing = !1, typeof t?.fn == "function" && (this.testUtils = t, this.getState = t.fn(this.getState), this.setState =
    t.fn(this.setState), this.subscribe = t.fn(this.subscribe), this.onStateChange = t.fn(this.onStateChange), this.send = t.fn(this.send));
  }
  /** Create a mock universal store. This is just an alias for the constructor */
  static create(e, t) {
    return new Ye(e, t);
  }
  unsubscribeAll() {
    if (!this.testUtils)
      throw new Error(
        Lt`Cannot call unsubscribeAll on a store that does not have testUtils.
        Please provide testUtils as the second argument when creating the store.`
      );
    let e = /* @__PURE__ */ s((t) => {
      try {
        t.value();
      } catch {
      }
    }, "callReturnedUnsubscribeFn");
    this.subscribe.mock?.results.forEach(e), this.onStateChange.mock?.results.forEach(e);
  }
};
s(Ye, "MockUniversalStore");
var Nr = Ye;

// src/preview-api/modules/store/StoryStore.ts
import { deprecate as xo } from "@storybook/core/client-logger";
import {
  CalledExtractOnStoreError as ti,
  MissingStoryFromCsfFileError as oi
} from "@storybook/core/preview-errors";
var tr = he(_r(), 1);

// src/preview-api/modules/store/args.ts
import { once as qr } from "@storybook/core/client-logger";
var me = Symbol("incompatible"), Ur = /* @__PURE__ */ s((r, e) => {
  let t = e.type;
  if (r == null || !t || e.mapping)
    return r;
  switch (t.name) {
    case "string":
      return String(r);
    case "enum":
      return r;
    case "number":
      return Number(r);
    case "boolean":
      return String(r) === "true";
    case "array":
      return !t.value || !Array.isArray(r) ? me : r.reduce((o, n, i) => {
        let a = Ur(n, { type: t.value });
        return a !== me && (o[i] = a), o;
      }, new Array(r.length));
    case "object":
      return typeof r == "string" || typeof r == "number" ? r : !t.value || typeof r != "object" ? me : Object.entries(r).reduce((o, [n, i]) => {
        let a = Ur(i, { type: t.value[n] });
        return a === me ? o : Object.assign(o, { [n]: a });
      }, {});
    default:
      return me;
  }
}, "map"), ao = /* @__PURE__ */ s((r, e) => Object.entries(r).reduce((t, [o, n]) => {
  if (!e[o])
    return t;
  let i = Ur(n, e[o]);
  return i === me ? t : Object.assign(t, { [o]: i });
}, {}), "mapArgsToTypes"), ke = /* @__PURE__ */ s((r, e) => Array.isArray(r) && Array.isArray(e) ? e.reduce(
  (t, o, n) => (t[n] = ke(r[n], e[n]), t),
  [...r]
).filter((t) => t !== void 0) : !L(r) || !L(e) ? e : Object.keys({ ...r, ...e }).reduce((t, o) => {
  if (o in e) {
    let n = ke(r[o], e[o]);
    n !== void 0 && (t[o] = n);
  } else
    t[o] = r[o];
  return t;
}, {}), "combineArgs"), lo = /* @__PURE__ */ s((r, e) => Object.entries(e).reduce((t, [o, { options: n }]) => {
  function i() {
    return o in r && (t[o] = r[o]), t;
  }
  if (s(i, "allowArg"), !n)
    return i();
  if (!Array.isArray(n))
    return qr.error(P`
        Invalid argType: '${o}.options' should be an array.

        More info: https://storybook.js.org/docs/api/arg-types
      `), i();
  if (n.some((u) => u && ["object", "function"].includes(typeof u)))
    return qr.error(P`
        Invalid argType: '${o}.options' should only contain primitives. Use a 'mapping' for complex values.

        More info: https://storybook.js.org/docs/writing-stories/args#mapping-to-complex-arg-values
      `), i();
  let a = Array.isArray(r[o]), l = a && r[o].findIndex((u) => !n.includes(u)), c = a && l === -1;
  if (r[o] === void 0 || n.includes(r[o]) || c)
    return i();
  let d = a ? `${o}[${l}]` : o, p = n.map((u) => typeof u == "string" ? `'${u}'` : String(u)).join(", ");
  return qr.warn(`Received illegal value for '${d}'. Supported options: ${p}`), t;
}, {}), "validateOptions"), ie = Symbol("Deeply equal"), ge = /* @__PURE__ */ s((r, e) => {
  if (typeof r != typeof e)
    return e;
  if (De(r, e))
    return ie;
  if (Array.isArray(r) && Array.isArray(e)) {
    let t = e.reduce((o, n, i) => {
      let a = ge(r[i], n);
      return a !== ie && (o[i] = a), o;
    }, new Array(e.length));
    return e.length >= r.length ? t : t.concat(new Array(r.length - e.length).fill(void 0));
  }
  return L(r) && L(e) ? Object.keys({ ...r, ...e }).reduce((t, o) => {
    let n = ge(r?.[o], e?.[o]);
    return n === ie ? t : Object.assign(t, { [o]: n });
  }, {}) : e;
}, "deepDiff"), Gr = "UNTARGETED";
function co({
  args: r,
  argTypes: e
}) {
  let t = {};
  return Object.entries(r).forEach(([o, n]) => {
    let { target: i = Gr } = e[o] || {};
    t[i] = t[i] || {}, t[i][o] = n;
  }), t;
}
s(co, "groupArgsByTarget");

// src/preview-api/modules/store/ArgsStore.ts
function Ts(r) {
  return Object.keys(r).forEach((e) => r[e] === void 0 && delete r[e]), r;
}
s(Ts, "deleteUndefined");
var Br = class Br {
  constructor() {
    this.initialArgsByStoryId = {};
    this.argsByStoryId = {};
  }
  get(e) {
    if (!(e in this.argsByStoryId))
      throw new Error(`No args known for ${e} -- has it been rendered yet?`);
    return this.argsByStoryId[e];
  }
  setInitial(e) {
    if (!this.initialArgsByStoryId[e.id])
      this.initialArgsByStoryId[e.id] = e.initialArgs, this.argsByStoryId[e.id] = e.initialArgs;
    else if (this.initialArgsByStoryId[e.id] !== e.initialArgs) {
      let t = ge(this.initialArgsByStoryId[e.id], this.argsByStoryId[e.id]);
      this.initialArgsByStoryId[e.id] = e.initialArgs, this.argsByStoryId[e.id] = e.initialArgs, t !== ie && this.updateFromDelta(e, t);
    }
  }
  updateFromDelta(e, t) {
    let o = lo(t, e.argTypes);
    this.argsByStoryId[e.id] = ke(this.argsByStoryId[e.id], o);
  }
  updateFromPersisted(e, t) {
    let o = ao(t, e.argTypes);
    return this.updateFromDelta(e, o);
  }
  update(e, t) {
    if (!(e in this.argsByStoryId))
      throw new Error(`No args known for ${e} -- has it been rendered yet?`);
    this.argsByStoryId[e] = Ts({
      ...this.argsByStoryId[e],
      ...t
    });
  }
};
s(Br, "ArgsStore");
var Ke = Br;

// src/preview-api/modules/store/GlobalsStore.ts
import { logger as Es } from "@storybook/core/client-logger";

// src/preview-api/modules/store/csf/getValuesFromArgTypes.ts
var Xe = /* @__PURE__ */ s((r = {}) => Object.entries(r).reduce((e, [t, { defaultValue: o }]) => (typeof o < "u" && (e[t] = o), e), {}), "ge\
tValuesFromArgTypes");

// src/preview-api/modules/store/GlobalsStore.ts
var zr = class zr {
  constructor({
    globals: e = {},
    globalTypes: t = {}
  }) {
    this.set({ globals: e, globalTypes: t });
  }
  set({ globals: e = {}, globalTypes: t = {} }) {
    let o = this.initialGlobals && ge(this.initialGlobals, this.globals);
    this.allowedGlobalNames = /* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)]);
    let n = Xe(t);
    this.initialGlobals = { ...n, ...e }, this.globals = this.initialGlobals, o && o !== ie && this.updateFromPersisted(o);
  }
  filterAllowedGlobals(e) {
    return Object.entries(e).reduce((t, [o, n]) => (this.allowedGlobalNames.has(o) ? t[o] = n : Es.warn(
      `Attempted to set a global (${o}) that is not defined in initial globals or globalTypes`
    ), t), {});
  }
  updateFromPersisted(e) {
    let t = this.filterAllowedGlobals(e);
    this.globals = { ...this.globals, ...t };
  }
  get() {
    return this.globals;
  }
  update(e) {
    this.globals = { ...this.globals, ...this.filterAllowedGlobals(e) };
  }
};
s(zr, "GlobalsStore");
var Je = zr;

// src/preview-api/modules/store/StoryIndexStore.ts
var po = he(_r(), 1);
import { MissingStoryAfterHmrError as Rs } from "@storybook/core/preview-errors";
var xs = (0, po.default)(1)(
  (r) => Object.values(r).reduce(
    (e, t) => (e[t.importPath] = e[t.importPath] || t, e),
    {}
  )
), Vr = class Vr {
  constructor({ entries: e } = { v: 5, entries: {} }) {
    this.entries = e;
  }
  entryFromSpecifier(e) {
    let t = Object.values(this.entries);
    if (e === "*")
      return t[0];
    if (typeof e == "string")
      return this.entries[e] ? this.entries[e] : t.find((i) => i.id.startsWith(e));
    let { name: o, title: n } = e;
    return t.find((i) => i.name === o && i.title === n);
  }
  storyIdToEntry(e) {
    let t = this.entries[e];
    if (!t)
      throw new Rs({ storyId: e });
    return t;
  }
  importPathToEntry(e) {
    return xs(this.entries)[e];
  }
};
s(Vr, "StoryIndexStore");
var Qe = Vr;

// src/preview-api/modules/store/csf/normalizeInputTypes.ts
var ws = /* @__PURE__ */ s((r) => typeof r == "string" ? { name: r } : r, "normalizeType"), vs = /* @__PURE__ */ s((r) => typeof r == "strin\
g" ? { type: r } : r, "normalizeControl"), As = /* @__PURE__ */ s((r, e) => {
  let { type: t, control: o, ...n } = r, i = {
    name: e,
    ...n
  };
  return t && (i.type = ws(t)), o ? i.control = vs(o) : o === !1 && (i.control = { disable: !0 }), i;
}, "normalizeInputType"), ae = /* @__PURE__ */ s((r) => G(r, As), "normalizeInputTypes");

// src/preview-api/modules/store/csf/normalizeStory.ts
import { storyNameFromExport as Cs, toId as Ps } from "@storybook/core/csf";
import { deprecate as Fs, logger as Is } from "@storybook/core/client-logger";

// src/preview-api/modules/store/csf/normalizeArrays.ts
var F = /* @__PURE__ */ s((r) => Array.isArray(r) ? r : r ? [r] : [], "normalizeArrays");

// src/preview-api/modules/store/csf/normalizeStory.ts
var Os = P`
CSF .story annotations deprecated; annotate story functions directly:
- StoryFn.story.name => StoryFn.storyName
- StoryFn.story.(parameters|decorators) => StoryFn.(parameters|decorators)
See https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#hoisted-csf-annotations for details and codemod.
`;
function Se(r, e, t) {
  let o = e, n = typeof e == "function" ? e : null, { story: i } = o;
  i && (Is.debug("deprecated story", i), Fs(Os));
  let a = Cs(r), l = typeof o != "function" && o.name || o.storyName || i?.name || a, c = [
    ...F(o.decorators),
    ...F(i?.decorators)
  ], d = { ...i?.parameters, ...o.parameters }, p = { ...i?.args, ...o.args }, u = { ...i?.argTypes, ...o.argTypes }, y = [...F(o.loaders), ...F(
  i?.loaders)], m = [
    ...F(o.beforeEach),
    ...F(i?.beforeEach)
  ], g = [
    ...F(o.experimental_afterEach),
    ...F(i?.experimental_afterEach)
  ], { render: S, play: h, tags: E = [], globals: R = {} } = o, f = d.__id || Ps(t.id, a);
  return {
    moduleExport: e,
    id: f,
    name: l,
    tags: E,
    decorators: c,
    parameters: d,
    args: p,
    argTypes: ae(u),
    loaders: y,
    beforeEach: m,
    experimental_afterEach: g,
    globals: R,
    ...S && { render: S },
    ...n && { userStoryFn: n },
    ...h && { play: h }
  };
}
s(Se, "normalizeStory");

// src/preview-api/modules/store/csf/processCSFFile.ts
import { isExportStory as uo, isStory as ks } from "@storybook/core/csf";
import { logger as fo } from "@storybook/core/client-logger";

// src/preview-api/modules/store/csf/normalizeComponentAnnotations.ts
import { sanitize as Ds } from "@storybook/core/csf";
function je(r, e = r.title, t) {
  let { id: o, argTypes: n } = r;
  return {
    id: Ds(o || e),
    ...r,
    title: e,
    ...n && { argTypes: ae(n) },
    parameters: {
      fileName: t,
      ...r.parameters
    }
  };
}
s(je, "normalizeComponentAnnotations");

// src/preview-api/modules/store/csf/processCSFFile.ts
var js = /* @__PURE__ */ s((r) => {
  let { globals: e, globalTypes: t } = r;
  (e || t) && fo.error(
    "Global args/argTypes can only be set globally",
    JSON.stringify({
      globals: e,
      globalTypes: t
    })
  );
}, "checkGlobals"), Ls = /* @__PURE__ */ s((r) => {
  let { options: e } = r;
  e?.storySort && fo.error("The storySort option parameter can only be set globally");
}, "checkStorySort"), Ze = /* @__PURE__ */ s((r) => {
  r && (js(r), Ls(r));
}, "checkDisallowedParameters");
function yo(r, e, t) {
  let { default: o, __namedExportsOrder: n, ...i } = r, a = Object.values(i)[0];
  if (ks(a)) {
    let d = je(a.meta.input, t, e);
    Ze(d.parameters);
    let p = { meta: d, stories: {}, moduleExports: r };
    return Object.keys(i).forEach((u) => {
      if (uo(u, d)) {
        let y = Se(u, i[u].input, d);
        Ze(y.parameters), p.stories[y.id] = y;
      }
    }), p.projectAnnotations = a.meta.preview.composed, p;
  }
  let l = je(
    o,
    t,
    e
  );
  Ze(l.parameters);
  let c = { meta: l, stories: {}, moduleExports: r };
  return Object.keys(i).forEach((d) => {
    if (uo(d, l)) {
      let p = Se(d, i[d], l);
      Ze(p.parameters), c.stories[p.id] = p;
    }
  }), c;
}
s(yo, "processCSFFile");

// src/preview-api/modules/store/csf/prepareStory.ts
import { combineTags as Ms, includeConditionalArg as _s } from "@storybook/core/csf";
import { NoRenderFunctionError as qs } from "@storybook/core/preview-errors";

// src/preview-api/modules/preview-web/render/mount-utils.ts
function mo(r) {
  return r != null && Ns(r).includes("mount");
}
s(mo, "mountDestructured");
function Ns(r) {
  let e = r.toString().match(/[^(]*\(([^)]*)/);
  if (!e)
    return [];
  let t = ho(e[1]);
  if (!t.length)
    return [];
  let o = t[0];
  return o.startsWith("{") && o.endsWith("}") ? ho(o.slice(1, -1).replace(/\s/g, "")).map((i) => i.replace(/:.*|=.*/g, "")) : [];
}
s(Ns, "getUsedProps");
function ho(r) {
  let e = [], t = [], o = 0;
  for (let i = 0; i < r.length; i++)
    if (r[i] === "{" || r[i] === "[")
      t.push(r[i] === "{" ? "}" : "]");
    else if (r[i] === t[t.length - 1])
      t.pop();
    else if (!t.length && r[i] === ",") {
      let a = r.substring(o, i).trim();
      a && e.push(a), o = i + 1;
    }
  let n = r.substring(o).trim();
  return n && e.push(n), e;
}
s(ho, "splitByComma");

// src/preview-api/modules/store/decorators.ts
function go(r, e, t) {
  let o = t(r);
  return (n) => e(o, n);
}
s(go, "decorateStory");
function So({
  componentId: r,
  title: e,
  kind: t,
  id: o,
  name: n,
  story: i,
  parameters: a,
  initialArgs: l,
  argTypes: c,
  ...d
} = {}) {
  return d;
}
s(So, "sanitizeStoryContextUpdate");
function Hr(r, e) {
  let t = {}, o = /* @__PURE__ */ s((i) => (a) => {
    if (!t.value)
      throw new Error("Decorated function called without init");
    return t.value = {
      ...t.value,
      ...So(a)
    }, i(t.value);
  }, "bindWithContext"), n = e.reduce(
    (i, a) => go(i, a, o),
    r
  );
  return (i) => (t.value = i, n(i));
}
s(Hr, "defaultDecorateStory");

// src/preview-api/modules/store/parameters.ts
var M = /* @__PURE__ */ s((...r) => {
  let e = {}, t = r.filter(Boolean), o = t.reduce((n, i) => (Object.entries(i).forEach(([a, l]) => {
    let c = n[a];
    Array.isArray(l) || typeof c > "u" ? n[a] = l : L(l) && L(c) ? e[a] = !0 : typeof l < "u" && (n[a] = l);
  }), n), {});
  return Object.keys(e).forEach((n) => {
    let i = t.filter(Boolean).map((a) => a[n]).filter((a) => typeof a < "u");
    i.every((a) => L(a)) ? o[n] = M(...i) : o[n] = i[i.length - 1];
  }), o;
}, "combineParameters");

// src/preview-api/modules/store/csf/prepareStory.ts
function Le(r, e, t) {
  let { moduleExport: o, id: n, name: i } = r || {}, a = bo(
    r,
    e,
    t
  ), l = /* @__PURE__ */ s(async (w) => {
    let A = {};
    for (let O of [
      ..."__STORYBOOK_TEST_LOADERS__" in I && Array.isArray(I.__STORYBOOK_TEST_LOADERS__) ? [I.__STORYBOOK_TEST_LOADERS__] : [],
      F(t.loaders),
      F(e.loaders),
      F(r.loaders)
    ]) {
      if (w.abortSignal.aborted)
        return A;
      let N = await Promise.all(O.map((U) => U(w)));
      Object.assign(A, ...N);
    }
    return A;
  }, "applyLoaders"), c = /* @__PURE__ */ s(async (w) => {
    let A = new Array();
    for (let O of [
      ...F(t.beforeEach),
      ...F(e.beforeEach),
      ...F(r.beforeEach)
    ]) {
      if (w.abortSignal.aborted)
        return A;
      let N = await O(w);
      N && A.push(N);
    }
    return A;
  }, "applyBeforeEach"), d = /* @__PURE__ */ s(async (w) => {
    let A = [
      ...F(t.experimental_afterEach),
      ...F(e.experimental_afterEach),
      ...F(r.experimental_afterEach)
    ].reverse();
    for (let O of A) {
      if (w.abortSignal.aborted)
        return;
      await O(w);
    }
  }, "applyAfterEach"), p = /* @__PURE__ */ s((w) => w.originalStoryFn(w.args, w), "undecoratedStoryFn"), { applyDecorators: u = Hr, runStep: y } = t,
  m = [
    ...F(r?.decorators),
    ...F(e?.decorators),
    ...F(t?.decorators)
  ], g = r?.userStoryFn || r?.render || e.render || t.render, S = vr(u)(p, m), h = /* @__PURE__ */ s((w) => S(w), "unboundStoryFn"), E = r?.
  play ?? e?.play, R = mo(E);
  if (!g && !R)
    throw new qs({ id: n });
  let f = /* @__PURE__ */ s((w) => async () => (await w.renderToCanvas(), w.canvas), "defaultMount"), b = r.mount ?? e.mount ?? t.mount ?? f,
  x = t.testingLibraryRender;
  return {
    storyGlobals: {},
    ...a,
    moduleExport: o,
    id: n,
    name: i,
    story: i,
    originalStoryFn: g,
    undecoratedStoryFn: p,
    unboundStoryFn: h,
    applyLoaders: l,
    applyBeforeEach: c,
    applyAfterEach: d,
    playFunction: E,
    runStep: y,
    mount: b,
    testingLibraryRender: x,
    renderToCanvas: t.renderToCanvas,
    usesMount: R
  };
}
s(Le, "prepareStory");
function Wr(r, e, t) {
  return {
    ...bo(void 0, r, e),
    moduleExport: t
  };
}
s(Wr, "prepareMeta");
function bo(r, e, t) {
  let o = ["dev", "test"], n = I.DOCS_OPTIONS?.autodocs === !0 ? ["autodocs"] : [], i = Ms(
    ...o,
    ...n,
    ...t.tags ?? [],
    ...e.tags ?? [],
    ...r?.tags ?? []
  ), a = M(
    t.parameters,
    e.parameters,
    r?.parameters
  ), { argTypesEnhancers: l = [], argsEnhancers: c = [] } = t, d = M(
    t.argTypes,
    e.argTypes,
    r?.argTypes
  );
  if (r) {
    let E = r?.userStoryFn || r?.render || e.render || t.render;
    a.__isArgsStory = E && E.length > 0;
  }
  let p = {
    ...t.args,
    ...e.args,
    ...r?.args
  }, u = {
    ...e.globals,
    ...r?.globals
  }, y = {
    componentId: e.id,
    title: e.title,
    kind: e.title,
    // Back compat
    id: r?.id || e.id,
    // if there's no story name, we create a fake one since enhancers expect a name
    name: r?.name || "__meta",
    story: r?.name || "__meta",
    // Back compat
    component: e.component,
    subcomponents: e.subcomponents,
    tags: i,
    parameters: a,
    initialArgs: p,
    argTypes: d,
    storyGlobals: u
  };
  y.argTypes = l.reduce(
    (E, R) => R({ ...y, argTypes: E }),
    y.argTypes
  );
  let m = { ...p };
  y.initialArgs = c.reduce(
    (E, R) => ({
      ...E,
      ...R({
        ...y,
        initialArgs: E
      })
    }),
    m
  );
  let { name: g, story: S, ...h } = y;
  return h;
}
s(bo, "preparePartialAnnotations");
function er(r) {
  let { args: e } = r, t = {
    ...r,
    allArgs: void 0,
    argsByTarget: void 0
  };
  if (I.FEATURES?.argTypeTargetsV7) {
    let i = co(r);
    t = {
      ...r,
      allArgs: r.args,
      argsByTarget: i,
      args: i[Gr] || {}
    };
  }
  let o = Object.entries(t.args).reduce((i, [a, l]) => {
    if (!t.argTypes[a]?.mapping)
      return i[a] = l, i;
    let c = /* @__PURE__ */ s((d) => {
      let p = t.argTypes[a].mapping;
      return p && d in p ? p[d] : d;
    }, "mappingFn");
    return i[a] = Array.isArray(l) ? l.map(c) : c(l), i;
  }, {}), n = Object.entries(o).reduce((i, [a, l]) => {
    let c = t.argTypes[a] || {};
    return _s(c, o, t.globals) && (i[a] = l), i;
  }, {});
  return { ...t, unmappedArgs: e, args: n };
}
s(er, "prepareContext");

// src/preview-api/modules/store/csf/normalizeProjectAnnotations.ts
import { deprecate as zs } from "@storybook/core/client-logger";

// src/preview-api/modules/store/inferArgTypes.ts
import { logger as Us } from "@storybook/core/client-logger";
var $r = /* @__PURE__ */ s((r, e, t) => {
  let o = typeof r;
  switch (o) {
    case "boolean":
    case "string":
    case "number":
    case "function":
    case "symbol":
      return { name: o };
    default:
      break;
  }
  return r ? t.has(r) ? (Us.warn(P`
        We've detected a cycle in arg '${e}'. Args should be JSON-serializable.

        Consider using the mapping feature or fully custom args:
        - Mapping: https://storybook.js.org/docs/writing-stories/args#mapping-to-complex-arg-values
        - Custom args: https://storybook.js.org/docs/essentials/controls#fully-custom-args
      `), { name: "other", value: "cyclic object" }) : (t.add(r), Array.isArray(r) ? { name: "array", value: r.length > 0 ? $r(r[0], e, new Set(
  t)) : { name: "other", value: "unknown" } } : { name: "object", value: G(r, (i) => $r(i, e, new Set(t))) }) : { name: "object", value: {} };
}, "inferType"), Yr = /* @__PURE__ */ s((r) => {
  let { id: e, argTypes: t = {}, initialArgs: o = {} } = r, n = G(o, (a, l) => ({
    name: l,
    type: $r(a, `${e}.${l}`, /* @__PURE__ */ new Set())
  })), i = G(t, (a, l) => ({
    name: l
  }));
  return M(n, i, t);
}, "inferArgTypes");
Yr.secondPass = !0;

// src/preview-api/modules/store/inferControls.ts
import { logger as Gs } from "@storybook/core/client-logger";

// src/preview-api/modules/store/filterArgTypes.ts
var To = /* @__PURE__ */ s((r, e) => Array.isArray(e) ? e.includes(r) : r.match(e), "matches"), rr = /* @__PURE__ */ s((r, e, t) => !e && !t ?
r : r && Dr(r, (o, n) => {
  let i = o.name || n.toString();
  return !!(!e || To(i, e)) && (!t || !To(i, t));
}), "filterArgTypes");

// src/preview-api/modules/store/inferControls.ts
var Bs = /* @__PURE__ */ s((r, e, t) => {
  let { type: o, options: n } = r;
  if (o) {
    if (t.color && t.color.test(e)) {
      let i = o.name;
      if (i === "string")
        return { control: { type: "color" } };
      i !== "enum" && Gs.warn(
        `Addon controls: Control of type color only supports string, received "${i}" instead`
      );
    }
    if (t.date && t.date.test(e))
      return { control: { type: "date" } };
    switch (o.name) {
      case "array":
        return { control: { type: "object" } };
      case "boolean":
        return { control: { type: "boolean" } };
      case "string":
        return { control: { type: "text" } };
      case "number":
        return { control: { type: "number" } };
      case "enum": {
        let { value: i } = o;
        return { control: { type: i?.length <= 5 ? "radio" : "select" }, options: i };
      }
      case "function":
      case "symbol":
        return null;
      default:
        return { control: { type: n ? "select" : "object" } };
    }
  }
}, "inferControl"), Ne = /* @__PURE__ */ s((r) => {
  let {
    argTypes: e,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    parameters: { __isArgsStory: t, controls: { include: o = null, exclude: n = null, matchers: i = {} } = {} }
  } = r;
  if (!t)
    return e;
  let a = rr(e, o, n), l = G(a, (c, d) => c?.type && Bs(c, d.toString(), i));
  return M(l, a);
}, "inferControls");
Ne.secondPass = !0;

// src/preview-api/modules/store/csf/normalizeProjectAnnotations.ts
function be({
  argTypes: r,
  globalTypes: e,
  argTypesEnhancers: t,
  decorators: o,
  loaders: n,
  beforeEach: i,
  experimental_afterEach: a,
  globals: l,
  initialGlobals: c,
  ...d
}) {
  return l && Object.keys(l).length > 0 && zs(P`
      The preview.js 'globals' field is deprecated and will be removed in Storybook 9.0.
      Please use 'initialGlobals' instead. Learn more:

      https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#previewjs-globals-renamed-to-initialglobals
    `), {
    ...r && { argTypes: ae(r) },
    ...e && { globalTypes: ae(e) },
    decorators: F(o),
    loaders: F(n),
    beforeEach: F(i),
    experimental_afterEach: F(a),
    argTypesEnhancers: [
      ...t || [],
      Yr,
      // inferControls technically should only run if the user is using the controls addon,
      // and so should be added by a preset there. However, as it seems some code relies on controls
      // annotations (in particular the angular implementation's `cleanArgsDecorator`), for backwards
      // compatibility reasons, we will leave this in the store until 7.0
      Ne
    ],
    initialGlobals: M(c, l),
    ...d
  };
}
s(be, "normalizeProjectAnnotations");

// src/preview-api/modules/store/csf/beforeAll.ts
var Eo = /* @__PURE__ */ s((r) => async () => {
  let e = [];
  for (let t of r) {
    let o = await t();
    o && e.unshift(o);
  }
  return async () => {
    for (let t of e)
      await t();
  };
}, "composeBeforeAllHooks");

// src/preview-api/modules/store/csf/stepRunners.ts
function Kr(r) {
  return async (e, t, o) => {
    await r.reduceRight(
      (i, a) => async () => a(e, i, o),
      async () => t(o)
    )();
  };
}
s(Kr, "composeStepRunners");

// src/preview-api/modules/store/csf/composeConfigs.ts
function _e(r, e) {
  return r.map((t) => t.default?.[e] ?? t[e]).filter(Boolean);
}
s(_e, "getField");
function Q(r, e, t = {}) {
  return _e(r, e).reduce((o, n) => {
    let i = F(n);
    return t.reverseFileOrder ? [...i, ...o] : [...o, ...i];
  }, []);
}
s(Q, "getArrayField");
function Me(r, e) {
  return Object.assign({}, ..._e(r, e));
}
s(Me, "getObjectField");
function Te(r, e) {
  return _e(r, e).pop();
}
s(Te, "getSingletonField");
function Ee(r) {
  let e = Q(r, "argTypesEnhancers"), t = _e(r, "runStep"), o = Q(r, "beforeAll");
  return {
    parameters: M(..._e(r, "parameters")),
    decorators: Q(r, "decorators", {
      reverseFileOrder: !(I.FEATURES?.legacyDecoratorFileOrder ?? !1)
    }),
    args: Me(r, "args"),
    argsEnhancers: Q(r, "argsEnhancers"),
    argTypes: Me(r, "argTypes"),
    argTypesEnhancers: [
      ...e.filter((n) => !n.secondPass),
      ...e.filter((n) => n.secondPass)
    ],
    globals: Me(r, "globals"),
    initialGlobals: Me(r, "initialGlobals"),
    globalTypes: Me(r, "globalTypes"),
    loaders: Q(r, "loaders"),
    beforeAll: Eo(o),
    beforeEach: Q(r, "beforeEach"),
    experimental_afterEach: Q(r, "experimental_afterEach"),
    render: Te(r, "render"),
    renderToCanvas: Te(r, "renderToCanvas"),
    renderToDOM: Te(r, "renderToDOM"),
    // deprecated
    applyDecorators: Te(r, "applyDecorators"),
    runStep: Kr(t),
    tags: Q(r, "tags"),
    mount: Te(r, "mount"),
    testingLibraryRender: Te(r, "testingLibraryRender")
  };
}
s(Ee, "composeConfigs");

// src/preview-api/modules/store/csf/portable-stories.ts
import { isExportStory as Hs } from "@storybook/core/csf";
import { MountMustBeDestructuredError as Ws } from "@storybook/core/preview-errors";

// src/preview-api/modules/store/reporter-api.ts
var Xr = class Xr {
  constructor() {
    this.reports = [];
  }
  async addReport(e) {
    this.reports.push(e);
  }
};
s(Xr, "ReporterAPI");
var le = Xr;

// src/preview-api/modules/store/csf/csf-factory-utils.ts
import { isStory as Vs } from "@storybook/core/csf";
function Jr(r, e, t) {
  return Vs(r) ? {
    story: r.input,
    meta: r.meta.input,
    preview: r.meta.preview.composed
  } : { story: r, meta: e, preview: t };
}
s(Jr, "getCsfFactoryAnnotations");

// src/preview-api/modules/store/csf/portable-stories.ts
function $s(r) {
  globalThis.defaultProjectAnnotations = r;
}
s($s, "setDefaultProjectAnnotations");
var Ys = "ComposedStory", Ks = "Unnamed Story";
function Xs(r) {
  return r ? Ee([r]) : {};
}
s(Xs, "extractAnnotation");
function Js(r) {
  let e = Array.isArray(r) ? r : [r];
  return globalThis.globalProjectAnnotations = Ee([
    globalThis.defaultProjectAnnotations ?? {},
    Ee(e.map(Xs))
  ]), globalThis.globalProjectAnnotations ?? {};
}
s(Js, "setProjectAnnotations");
var Z = [];
function Ro(r, e, t, o, n) {
  if (r === void 0)
    throw new Error("Expected a story but received undefined.");
  e.title = e.title ?? Ys;
  let i = je(e), a = n || r.storyName || r.story?.name || r.name || Ks, l = Se(
    a,
    r,
    i
  ), c = be(
    Ee([
      o ?? globalThis.globalProjectAnnotations ?? {},
      t ?? {}
    ])
  ), d = Le(
    l,
    i,
    c
  ), u = {
    // TODO: remove loading from globalTypes in 9.0
    ...Xe(c.globalTypes),
    ...c.initialGlobals,
    ...d.storyGlobals
  }, y = new le(), m = /* @__PURE__ */ s(() => {
    let f = er({
      hooks: new se(),
      globals: u,
      args: { ...d.initialArgs },
      viewMode: "story",
      reporting: y,
      loaded: {},
      abortSignal: new AbortController().signal,
      step: /* @__PURE__ */ s((b, x) => d.runStep(b, x, f), "step"),
      canvasElement: null,
      canvas: {},
      globalTypes: c.globalTypes,
      ...d,
      context: null,
      mount: null
    });
    return f.parameters.__isPortableStory = !0, f.context = f, d.renderToCanvas && (f.renderToCanvas = async () => {
      let b = await d.renderToCanvas?.(
        {
          componentId: d.componentId,
          title: d.title,
          id: d.id,
          name: d.name,
          tags: d.tags,
          showMain: /* @__PURE__ */ s(() => {
          }, "showMain"),
          showError: /* @__PURE__ */ s((x) => {
            throw new Error(`${x.title}
${x.description}`);
          }, "showError"),
          showException: /* @__PURE__ */ s((x) => {
            throw x;
          }, "showException"),
          forceRemount: !0,
          storyContext: f,
          storyFn: /* @__PURE__ */ s(() => d.unboundStoryFn(f), "storyFn"),
          unboundStoryFn: d.unboundStoryFn
        },
        f.canvasElement
      );
      b && Z.push(b);
    }), f.mount = d.mount(f), f;
  }, "initializeContext"), g, S = /* @__PURE__ */ s(async (f) => {
    let b = m();
    return b.canvasElement ??= globalThis?.document?.body, g && (b.loaded = g.loaded), Object.assign(b, f), d.playFunction(b);
  }, "play"), h = /* @__PURE__ */ s((f) => {
    let b = m();
    return Object.assign(b, f), ri(d, b);
  }, "run"), E = d.playFunction ? S : void 0;
  return Object.assign(
    /* @__PURE__ */ s(function(b) {
      let x = m();
      return g && (x.loaded = g.loaded), x.args = {
        ...x.initialArgs,
        ...b
      }, d.unboundStoryFn(x);
    }, "storyFn"),
    {
      id: d.id,
      storyName: a,
      load: /* @__PURE__ */ s(async () => {
        for (let b of [...Z].reverse())
          await b();
        Z.length = 0;
        let f = m();
        f.loaded = await d.applyLoaders(f), Z.push(...(await d.applyBeforeEach(f)).filter(Boolean)), g = f;
      }, "load"),
      globals: u,
      args: d.initialArgs,
      parameters: d.parameters,
      argTypes: d.argTypes,
      play: E,
      run: h,
      reporting: y,
      tags: d.tags
    }
  );
}
s(Ro, "composeStory");
var Qs = /* @__PURE__ */ s((r, e, t, o) => Ro(r, e, t, {}, o), "defaultComposeStory");
function Zs(r, e, t = Qs) {
  let { default: o, __esModule: n, __namedExportsOrder: i, ...a } = r, l = o;
  return Object.entries(a).reduce(
    (d, [p, u]) => {
      let { story: y, meta: m } = Jr(u);
      return !l && m && (l = m), Hs(p, l) ? Object.assign(d, {
        [p]: t(y, l, e, p)
      }) : d;
    },
    {}
  );
}
s(Zs, "composeStories");
function ei(r) {
  return r.extend({
    mount: /* @__PURE__ */ s(async ({ mount: e, page: t }, o) => {
      await o(async (n, ...i) => {
        if (!("__pw_type" in n) || "__pw_type" in n && n.__pw_type !== "jsx")
          throw new Error(P`
              Portable stories in Playwright CT only work when referencing JSX elements.
              Please use JSX format for your components such as:

              instead of:
              await mount(MyComponent, { props: { foo: 'bar' } })

              do:
              await mount(<MyComponent foo="bar"/>)

              More info: https://storybook.js.org/docs/api/portable-stories-playwright
            `);
        await t.evaluate(async (l) => {
          let c = await globalThis.__pwUnwrapObject?.(l);
          return ("__pw_type" in c ? c.type : c)?.load?.();
        }, n);
        let a = await e(n, ...i);
        return await t.evaluate(async (l) => {
          let c = await globalThis.__pwUnwrapObject?.(l), d = "__pw_type" in c ? c.type : c, p = document.querySelector("#root");
          return d?.play?.({ canvasElement: p });
        }, n), a;
      });
    }, "mount")
  });
}
s(ei, "createPlaywrightTest");
async function ri(r, e) {
  for (let n of [...Z].reverse())
    await n();
  if (Z.length = 0, !e.canvasElement) {
    let n = document.createElement("div");
    globalThis?.document?.body?.appendChild(n), e.canvasElement = n, Z.push(() => {
      globalThis?.document?.body?.contains(n) && globalThis?.document?.body?.removeChild(n);
    });
  }
  if (e.loaded = await r.applyLoaders(e), e.abortSignal.aborted)
    return;
  Z.push(...(await r.applyBeforeEach(e)).filter(Boolean));
  let t = r.playFunction, o = r.usesMount;
  o || await e.mount(), !e.abortSignal.aborted && (t && (o || (e.mount = async () => {
    throw new Ws({ playFunction: t.toString() });
  }), await t(e)), await r.applyAfterEach(e));
}
s(ri, "runStory");

// src/preview-api/modules/store/StoryStore.ts
function wo(r, e) {
  return Ir(Or(r, e), (t) => t === void 0);
}
s(wo, "picky");
var vo = 1e3, ni = 1e4, Qr = class Qr {
  constructor(e, t, o) {
    this.importFn = t;
    // TODO: Remove in 9.0
    // NOTE: this is legacy `stories.json` data for the `extract` script.
    // It is used to allow v7 Storybooks to be composed in v6 Storybooks, which expect a
    // `stories.json` file with legacy fields (`kind` etc).
    this.getStoriesJsonData = /* @__PURE__ */ s(() => {
      let e = this.getSetStoriesPayload(), t = ["fileName", "docsOnly", "framework", "__id", "__isArgsStory"];
      return {
        v: 3,
        stories: G(e.stories, (n) => {
          let { importPath: i } = this.storyIndex.entries[n.id];
          return {
            ...wo(n, ["id", "name", "title"]),
            importPath: i,
            // These 3 fields were going to be dropped in v7, but instead we will keep them for the
            // 7.x cycle so that v7 Storybooks can be composed successfully in v6 Storybook.
            // In v8 we will (likely) completely drop support for `extract` and `getStoriesJsonData`
            kind: n.title,
            story: n.name,
            parameters: {
              ...wo(n.parameters, t),
              fileName: i
            }
          };
        })
      };
    }, "getStoriesJsonData");
    this.storyIndex = new Qe(e), this.projectAnnotations = be(o);
    let { initialGlobals: n, globalTypes: i } = this.projectAnnotations;
    this.args = new Ke(), this.userGlobals = new Je({ globals: n, globalTypes: i }), this.hooks = {}, this.cleanupCallbacks = {}, this.processCSFFileWithCache =
    (0, tr.default)(vo)(yo), this.prepareMetaWithCache = (0, tr.default)(vo)(Wr), this.prepareStoryWithCache = (0, tr.default)(ni)(Le);
  }
  setProjectAnnotations(e) {
    this.projectAnnotations = be(e);
    let { initialGlobals: t, globalTypes: o } = e;
    this.userGlobals.set({ globals: t, globalTypes: o });
  }
  // This means that one of the CSF files has changed.
  // If the `importFn` has changed, we will invalidate both caches.
  // If the `storyIndex` data has changed, we may or may not invalidate the caches, depending
  // on whether we've loaded the relevant files yet.
  async onStoriesChanged({
    importFn: e,
    storyIndex: t
  }) {
    e && (this.importFn = e), t && (this.storyIndex.entries = t.entries), this.cachedCSFFiles && await this.cacheAllCSFFiles();
  }
  // Get an entry from the index, waiting on initialization if necessary
  async storyIdToEntry(e) {
    return this.storyIndex.storyIdToEntry(e);
  }
  // To load a single CSF file to service a story we need to look up the importPath in the index
  async loadCSFFileByStoryId(e) {
    let { importPath: t, title: o } = this.storyIndex.storyIdToEntry(e), n = await this.importFn(t);
    return this.processCSFFileWithCache(n, t, o);
  }
  async loadAllCSFFiles() {
    let e = {};
    return Object.entries(this.storyIndex.entries).forEach(([o, { importPath: n }]) => {
      e[n] = o;
    }), (await Promise.all(
      Object.entries(e).map(async ([o, n]) => ({
        importPath: o,
        csfFile: await this.loadCSFFileByStoryId(n)
      }))
    )).reduce(
      (o, { importPath: n, csfFile: i }) => (o[n] = i, o),
      {}
    );
  }
  async cacheAllCSFFiles() {
    this.cachedCSFFiles = await this.loadAllCSFFiles();
  }
  preparedMetaFromCSFFile({ csfFile: e }) {
    let t = e.meta;
    return this.prepareMetaWithCache(
      t,
      this.projectAnnotations,
      e.moduleExports.default
    );
  }
  // Load the CSF file for a story and prepare the story from it and the project annotations.
  async loadStory({ storyId: e }) {
    let t = await this.loadCSFFileByStoryId(e);
    return this.storyFromCSFFile({ storyId: e, csfFile: t });
  }
  // This function is synchronous for convenience -- often times if you have a CSF file already
  // it is easier not to have to await `loadStory`.
  storyFromCSFFile({
    storyId: e,
    csfFile: t
  }) {
    let o = t.stories[e];
    if (!o)
      throw new oi({ storyId: e });
    let n = t.meta, i = this.prepareStoryWithCache(
      o,
      n,
      t.projectAnnotations ?? this.projectAnnotations
    );
    return this.args.setInitial(i), this.hooks[i.id] = this.hooks[i.id] || new se(), i;
  }
  // If we have a CSF file we can get all the stories from it synchronously
  componentStoriesFromCSFFile({
    csfFile: e
  }) {
    return Object.keys(this.storyIndex.entries).filter((t) => !!e.stories[t]).map((t) => this.storyFromCSFFile({ storyId: t, csfFile: e }));
  }
  async loadEntry(e) {
    let t = await this.storyIdToEntry(e), o = t.type === "docs" ? t.storiesImports : [], [n, ...i] = await Promise.all([
      this.importFn(t.importPath),
      ...o.map((a) => {
        let l = this.storyIndex.importPathToEntry(a);
        return this.loadCSFFileByStoryId(l.id);
      })
    ]);
    return { entryExports: n, csfFiles: i };
  }
  // A prepared story does not include args, globals or hooks. These are stored in the story store
  // and updated separtely to the (immutable) story.
  getStoryContext(e, { forceInitialArgs: t = !1 } = {}) {
    let o = this.userGlobals.get(), { initialGlobals: n } = this.userGlobals, i = new le();
    return er({
      ...e,
      args: t ? e.initialArgs : this.args.get(e.id),
      initialGlobals: n,
      globalTypes: this.projectAnnotations.globalTypes,
      userGlobals: o,
      reporting: i,
      globals: {
        ...o,
        ...e.storyGlobals
      },
      hooks: this.hooks[e.id]
    });
  }
  addCleanupCallbacks(e, t) {
    this.cleanupCallbacks[e.id] = t;
  }
  async cleanupStory(e) {
    this.hooks[e.id].clean();
    let t = this.cleanupCallbacks[e.id];
    if (t)
      for (let o of [...t].reverse())
        await o();
    delete this.cleanupCallbacks[e.id];
  }
  extract(e = { includeDocsOnly: !1 }) {
    let { cachedCSFFiles: t } = this;
    if (!t)
      throw new ti();
    return Object.entries(this.storyIndex.entries).reduce(
      (o, [n, { type: i, importPath: a }]) => {
        if (i === "docs")
          return o;
        let l = t[a], c = this.storyFromCSFFile({ storyId: n, csfFile: l });
        return !e.includeDocsOnly && c.parameters.docsOnly || (o[n] = Object.entries(c).reduce(
          (d, [p, u]) => p === "moduleExport" || typeof u == "function" ? d : Array.isArray(u) ? Object.assign(d, { [p]: u.slice().sort() }) :
          Object.assign(d, { [p]: u }),
          {
            //
            args: c.initialArgs,
            globals: {
              ...this.userGlobals.initialGlobals,
              ...this.userGlobals.globals,
              ...c.storyGlobals
            }
          }
        )), o;
      },
      {}
    );
  }
  // TODO: Remove in 9.0
  getSetStoriesPayload() {
    let e = this.extract({ includeDocsOnly: !0 }), t = Object.values(e).reduce(
      (o, { title: n }) => (o[n] = {}, o),
      {}
    );
    return {
      v: 2,
      globals: this.userGlobals.get(),
      globalParameters: {},
      kindParameters: t,
      stories: e
    };
  }
  raw() {
    return xo(
      "StoryStore.raw() is deprecated and will be removed in 9.0, please use extract() instead"
    ), Object.values(this.extract()).map(({ id: e }) => this.fromId(e)).filter(Boolean);
  }
  fromId(e) {
    if (xo(
      "StoryStore.fromId() is deprecated and will be removed in 9.0, please use loadStory() instead"
    ), !this.cachedCSFFiles)
      throw new Error("Cannot call fromId/raw() unless you call cacheAllCSFFiles() first.");
    let t;
    try {
      ({ importPath: t } = this.storyIndex.storyIdToEntry(e));
    } catch {
      return null;
    }
    let o = this.cachedCSFFiles[t], n = this.storyFromCSFFile({ storyId: e, csfFile: o });
    return {
      ...n,
      storyFn: /* @__PURE__ */ s((i) => {
        let a = {
          ...this.getStoryContext(n),
          abortSignal: new AbortController().signal,
          canvasElement: null,
          loaded: {},
          step: /* @__PURE__ */ s((l, c) => n.runStep(l, c, a), "step"),
          context: null,
          mount: null,
          canvas: {},
          viewMode: "story"
        };
        return n.unboundStoryFn({ ...a, ...i });
      }, "storyFn")
    };
  }
};
s(Qr, "StoryStore");
var Re = Qr;

// src/preview-api/modules/store/autoTitle.ts
import { once as si } from "@storybook/core/client-logger";

// ../node_modules/slash/index.js
function Zr(r) {
  return r.startsWith("\\\\?\\") ? r : r.replace(/\\/g, "/");
}
s(Zr, "slash");

// src/preview-api/modules/store/autoTitle.ts
var ii = /* @__PURE__ */ s((r) => {
  if (r.length === 0)
    return r;
  let e = r[r.length - 1], t = e?.replace(/(?:[.](?:story|stories))?([.][^.]+)$/i, "");
  if (r.length === 1)
    return [t];
  let o = r[r.length - 2];
  return t && o && t.toLowerCase() === o.toLowerCase() ? [...r.slice(0, -2), t] : t && (/^(story|stories)([.][^.]+)$/i.test(e) || /^index$/i.
  test(t)) ? r.slice(0, -1) : [...r.slice(0, -1), t];
}, "sanitize");
function Ao(r) {
  return r.flatMap((e) => e.split("/")).filter(Boolean).join("/");
}
s(Ao, "pathJoin");
var Co = /* @__PURE__ */ s((r, e, t) => {
  let { directory: o, importPathMatcher: n, titlePrefix: i = "" } = e || {};
  typeof r == "number" && si.warn(P`
      CSF Auto-title received a numeric fileName. This typically happens when
      webpack is mis-configured in production mode. To force webpack to produce
      filenames, set optimization.moduleIds = "named" in your webpack config.
    `);
  let a = Zr(String(r));
  if (n.exec(a)) {
    if (!t) {
      let l = a.replace(o, ""), c = Ao([i, l]).split("/");
      return c = ii(c), c.join("/");
    }
    return i ? Ao([i, t]) : t;
  }
}, "userOrAutoTitleFromSpecifier"), ai = /* @__PURE__ */ s((r, e, t) => {
  for (let o = 0; o < e.length; o += 1) {
    let n = Co(r, e[o], t);
    if (n)
      return n;
  }
  return t || void 0;
}, "userOrAutoTitle");

// src/preview-api/modules/store/storySort.ts
var Po = /\s*\/\s*/, Fo = /* @__PURE__ */ s((r = {}) => (e, t) => {
  if (e.title === t.title && !r.includeNames)
    return 0;
  let o = r.method || "configure", n = r.order || [], i = e.title.trim().split(Po), a = t.title.trim().split(Po);
  r.includeNames && (i.push(e.name), a.push(t.name));
  let l = 0;
  for (; i[l] || a[l]; ) {
    if (!i[l])
      return -1;
    if (!a[l])
      return 1;
    let c = i[l], d = a[l];
    if (c !== d) {
      let u = n.indexOf(c), y = n.indexOf(d), m = n.indexOf("*");
      return u !== -1 || y !== -1 ? (u === -1 && (m !== -1 ? u = m : u = n.length), y === -1 && (m !== -1 ? y = m : y = n.length), u - y) : o ===
      "configure" ? 0 : c.localeCompare(d, r.locales ? r.locales : void 0, {
        numeric: !0,
        sensitivity: "accent"
      });
    }
    let p = n.indexOf(c);
    p === -1 && (p = n.indexOf("*")), n = p !== -1 && Array.isArray(n[p + 1]) ? n[p + 1] : [], l += 1;
  }
  return 0;
}, "storySort");

// src/preview-api/modules/store/sortStories.ts
var li = /* @__PURE__ */ s((r, e, t) => {
  if (e) {
    let o;
    typeof e == "function" ? o = e : o = Fo(e), r.sort(o);
  } else
    r.sort(
      (o, n) => t.indexOf(o.importPath) - t.indexOf(n.importPath)
    );
  return r;
}, "sortStoriesCommon"), ci = /* @__PURE__ */ s((r, e, t) => {
  try {
    return li(r, e, t);
  } catch (o) {
    throw new Error(P`
    Error sorting stories with sort parameter ${e}:

    > ${o.message}
    
    Are you using a V6-style sort function in V7 mode?

    More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#v7-style-story-sort
  `);
  }
}, "sortStoriesV7");

// src/preview-api/modules/preview-web/Preview.tsx
import { deprecate as hi, logger as jo } from "@storybook/core/client-logger";
import {
  ARGTYPES_INFO_REQUEST as mi,
  ARGTYPES_INFO_RESPONSE as Lo,
  CONFIG_ERROR as gi,
  FORCE_REMOUNT as Si,
  FORCE_RE_RENDER as bi,
  GLOBALS_UPDATED as No,
  RESET_STORY_ARGS as Ti,
  SET_GLOBALS as Ei,
  STORY_ARGS_UPDATED as Ri,
  STORY_INDEX_INVALIDATED as xi,
  UPDATE_GLOBALS as wi,
  UPDATE_STORY_ARGS as vi
} from "@storybook/core/core-events";
import {
  CalledPreviewMethodBeforeInitializationError as K,
  MissingRenderToCanvasError as Ai,
  StoryIndexFetchError as Ci,
  StoryStoreAccessedBeforeInitializationError as Pi
} from "@storybook/core/preview-errors";

// src/preview-api/modules/preview-web/render/StoryRender.ts
import {
  PLAY_FUNCTION_THREW_EXCEPTION as di,
  STORY_FINISHED as Io,
  STORY_RENDERED as pi,
  STORY_RENDER_PHASE_CHANGED as Oo,
  UNHANDLED_ERRORS_WHILE_PLAYING as ui
} from "@storybook/core/core-events";
import { MountMustBeDestructuredError as fi, NoStoryMountedError as yi } from "@storybook/core/preview-errors";

// src/preview-api/modules/preview-web/render/Render.ts
var ee = new Error("prepareAborted");

// src/preview-api/modules/preview-web/render/StoryRender.ts
var { AbortController: Do } = globalThis;
function ko(r) {
  try {
    let { name: e = "Error", message: t = String(r), stack: o } = r;
    return { name: e, message: t, stack: o };
  } catch {
    return { name: "Error", message: String(r) };
  }
}
s(ko, "serializeError");
var et = class et {
  constructor(e, t, o, n, i, a, l = { autoplay: !0, forceInitialArgs: !1 }, c) {
    this.channel = e;
    this.store = t;
    this.renderToScreen = o;
    this.callbacks = n;
    this.id = i;
    this.viewMode = a;
    this.renderOptions = l;
    this.type = "story";
    this.notYetRendered = !0;
    this.rerenderEnqueued = !1;
    this.disableKeyListeners = !1;
    this.teardownRender = /* @__PURE__ */ s(() => {
    }, "teardownRender");
    this.torndown = !1;
    this.abortController = new Do(), c && (this.story = c, this.phase = "preparing");
  }
  async runPhase(e, t, o) {
    this.phase = t, this.channel.emit(Oo, { newPhase: this.phase, storyId: this.id }), o && (await o(), this.checkIfAborted(e));
  }
  checkIfAborted(e) {
    return e.aborted ? (this.phase = "aborted", this.channel.emit(Oo, { newPhase: this.phase, storyId: this.id }), !0) : !1;
  }
  async prepare() {
    if (await this.runPhase(this.abortController.signal, "preparing", async () => {
      this.story = await this.store.loadStory({ storyId: this.id });
    }), this.abortController.signal.aborted)
      throw await this.store.cleanupStory(this.story), ee;
  }
  // The two story "renders" are equal and have both loaded the same story
  isEqual(e) {
    return !!(this.id === e.id && this.story && this.story === e.story);
  }
  isPreparing() {
    return ["preparing"].includes(this.phase);
  }
  isPending() {
    return ["loading", "beforeEach", "rendering", "playing", "afterEach"].includes(
      this.phase
    );
  }
  async renderToElement(e) {
    return this.canvasElement = e, this.render({ initial: !0, forceRemount: !0 });
  }
  storyContext() {
    if (!this.story)
      throw new Error("Cannot call storyContext before preparing");
    let { forceInitialArgs: e } = this.renderOptions;
    return this.store.getStoryContext(this.story, { forceInitialArgs: e });
  }
  async render({
    initial: e = !1,
    forceRemount: t = !1
  } = {}) {
    let { canvasElement: o } = this;
    if (!this.story)
      throw new Error("cannot render when not prepared");
    let n = this.story;
    if (!o)
      throw new Error("cannot render when canvasElement is unset");
    let {
      id: i,
      componentId: a,
      title: l,
      name: c,
      tags: d,
      applyLoaders: p,
      applyBeforeEach: u,
      applyAfterEach: y,
      unboundStoryFn: m,
      playFunction: g,
      runStep: S
    } = n;
    t && !e && (this.cancelRender(), this.abortController = new Do());
    let h = this.abortController.signal, E = !1, R = n.usesMount;
    try {
      let f = {
        ...this.storyContext(),
        viewMode: this.viewMode,
        abortSignal: h,
        canvasElement: o,
        loaded: {},
        step: /* @__PURE__ */ s((C, z) => S(C, z, f), "step"),
        context: null,
        canvas: {},
        renderToCanvas: /* @__PURE__ */ s(async () => {
          let C = await this.renderToScreen(b, o);
          this.teardownRender = C || (() => {
          }), E = !0;
        }, "renderToCanvas"),
        // The story provides (set in a renderer) a mount function that is a higher order function
        // (context) => (...args) => Canvas
        //
        // Before assigning it to the context, we resolve the context dependency,
        // so that a user can just call it as await mount(...args) in their play function.
        mount: /* @__PURE__ */ s(async (...C) => {
          this.callbacks.showStoryDuringRender?.();
          let z = null;
          return await this.runPhase(h, "rendering", async () => {
            z = await n.mount(f)(...C);
          }), R && await this.runPhase(h, "playing"), z;
        }, "mount")
      };
      f.context = f;
      let b = {
        componentId: a,
        title: l,
        kind: l,
        id: i,
        name: c,
        story: c,
        tags: d,
        ...this.callbacks,
        showError: /* @__PURE__ */ s((C) => (this.phase = "errored", this.callbacks.showError(C)), "showError"),
        showException: /* @__PURE__ */ s((C) => (this.phase = "errored", this.callbacks.showException(C)), "showException"),
        forceRemount: t || this.notYetRendered,
        storyContext: f,
        storyFn: /* @__PURE__ */ s(() => m(f), "storyFn"),
        unboundStoryFn: m
      };
      if (await this.runPhase(h, "loading", async () => {
        f.loaded = await p(f);
      }), h.aborted)
        return;
      let x = await u(f);
      if (this.store.addCleanupCallbacks(n, x), this.checkIfAborted(h) || (!E && !R && await f.mount(), this.notYetRendered = !1, h.aborted))
        return;
      let w = this.story.parameters?.test?.dangerouslyIgnoreUnhandledErrors === !0, A = /* @__PURE__ */ new Set(), O = /* @__PURE__ */ s((C) => A.
      add("error" in C ? C.error : C.reason), "onError");
      if (this.renderOptions.autoplay && t && g && this.phase !== "errored") {
        window.addEventListener("error", O), window.addEventListener("unhandledrejection", O), this.disableKeyListeners = !0;
        try {
          if (R ? await g(f) : (f.mount = async () => {
            throw new fi({ playFunction: g.toString() });
          }, await this.runPhase(h, "playing", async () => g(f))), !E)
            throw new yi();
          this.checkIfAborted(h), !w && A.size > 0 ? await this.runPhase(h, "errored") : await this.runPhase(h, "played");
        } catch (C) {
          if (this.callbacks.showStoryDuringRender?.(), await this.runPhase(h, "errored", async () => {
            this.channel.emit(di, ko(C));
          }), this.story.parameters.throwPlayFunctionExceptions !== !1)
            throw C;
          console.error(C);
        }
        if (!w && A.size > 0 && this.channel.emit(
          ui,
          Array.from(A).map(ko)
        ), this.disableKeyListeners = !1, window.removeEventListener("unhandledrejection", O), window.removeEventListener("error", O), h.aborted)
          return;
      }
      await this.runPhase(
        h,
        "completed",
        async () => this.channel.emit(pi, i)
      ), this.phase !== "errored" && await this.runPhase(h, "afterEach", async () => {
        await y(f);
      });
      let N = !w && A.size > 0, U = f.reporting.reports.some(
        (C) => C.status === "failed"
      ), ye = N || U;
      await this.runPhase(
        h,
        "finished",
        async () => this.channel.emit(Io, {
          storyId: i,
          status: ye ? "error" : "success",
          reporters: f.reporting.reports
        })
      );
    } catch (f) {
      this.phase = "errored", this.callbacks.showException(f), await this.runPhase(
        h,
        "finished",
        async () => this.channel.emit(Io, {
          storyId: i,
          status: "error",
          reporters: []
        })
      );
    }
    this.rerenderEnqueued && (this.rerenderEnqueued = !1, this.render());
  }
  /**
   * Rerender the story. If the story is currently pending (loading/rendering), the rerender will be
   * enqueued, and will be executed after the current render is completed. Rerendering while playing
   * will not be enqueued, and will be executed immediately, to support rendering args changes while
   * playing.
   */
  async rerender() {
    if (this.isPending() && this.phase !== "playing")
      this.rerenderEnqueued = !0;
    else
      return this.render();
  }
  async remount() {
    return await this.teardown(), this.render({ forceRemount: !0 });
  }
  // If the story is torn down (either a new story is rendered or the docs page removes it)
  // we need to consider the fact that the initial render may not be finished
  // (possibly the loaders or the play function are still running). We use the controller
  // as a method to abort them, ASAP, but this is not foolproof as we cannot control what
  // happens inside the user's code.
  cancelRender() {
    this.abortController?.abort();
  }
  async teardown() {
    this.torndown = !0, this.cancelRender(), this.story && await this.store.cleanupStory(this.story);
    for (let e = 0; e < 3; e += 1) {
      if (!this.isPending()) {
        await this.teardownRender();
        return;
      }
      await new Promise((t) => setTimeout(t, 0));
    }
    window.location.reload(), await new Promise(() => {
    });
  }
};
s(et, "StoryRender");
var ce = et;

// src/preview-api/modules/preview-web/Preview.tsx
var { fetch: Fi } = I, Ii = "./index.json", rt = class rt {
  constructor(e, t, o = V.getChannel(), n = !0) {
    this.importFn = e;
    this.getProjectAnnotations = t;
    this.channel = o;
    this.storyRenders = [];
    this.storeInitializationPromise = new Promise((i, a) => {
      this.resolveStoreInitializationPromise = i, this.rejectStoreInitializationPromise = a;
    }), n && this.initialize();
  }
  // Create a proxy object for `__STORYBOOK_STORY_STORE__` and `__STORYBOOK_PREVIEW__.storyStore`
  // That proxies through to the store once ready, and errors beforehand. This means we can set
  // `__STORYBOOK_STORY_STORE__ = __STORYBOOK_PREVIEW__.storyStore` without having to wait, and
  // similarly integrators can access the `storyStore` on the preview at any time, although
  // it is considered deprecated and we will no longer allow access in 9.0
  get storyStore() {
    return new Proxy(
      {},
      {
        get: /* @__PURE__ */ s((e, t) => {
          if (this.storyStoreValue)
            return hi("Accessing the Story Store is deprecated and will be removed in 9.0"), this.storyStoreValue[t];
          throw new Pi();
        }, "get")
      }
    );
  }
  // INITIALIZATION
  async initialize() {
    this.setupListeners();
    try {
      let e = await this.getProjectAnnotationsOrRenderError();
      await this.runBeforeAllHook(e), await this.initializeWithProjectAnnotations(e);
    } catch (e) {
      this.rejectStoreInitializationPromise(e);
    }
  }
  ready() {
    return this.storeInitializationPromise;
  }
  setupListeners() {
    this.channel.on(xi, this.onStoryIndexChanged.bind(this)), this.channel.on(wi, this.onUpdateGlobals.bind(this)), this.channel.on(vi, this.
    onUpdateArgs.bind(this)), this.channel.on(mi, this.onRequestArgTypesInfo.bind(this)), this.channel.on(Ti, this.onResetArgs.bind(this)), this.
    channel.on(bi, this.onForceReRender.bind(this)), this.channel.on(Si, this.onForceRemount.bind(this));
  }
  async getProjectAnnotationsOrRenderError() {
    try {
      let e = await this.getProjectAnnotations();
      if (this.renderToCanvas = e.renderToCanvas, !this.renderToCanvas)
        throw new Ai();
      return e;
    } catch (e) {
      throw this.renderPreviewEntryError("Error reading preview.js:", e), e;
    }
  }
  // If initialization gets as far as project annotations, this function runs.
  async initializeWithProjectAnnotations(e) {
    this.projectAnnotationsBeforeInitialization = e;
    try {
      let t = await this.getStoryIndexFromServer();
      return this.initializeWithStoryIndex(t);
    } catch (t) {
      throw this.renderPreviewEntryError("Error loading story index:", t), t;
    }
  }
  async runBeforeAllHook(e) {
    try {
      await this.beforeAllCleanup?.(), this.beforeAllCleanup = await e.beforeAll?.();
    } catch (t) {
      throw this.renderPreviewEntryError("Error in beforeAll hook:", t), t;
    }
  }
  async getStoryIndexFromServer() {
    let e = await Fi(Ii);
    if (e.status === 200)
      return e.json();
    throw new Ci({ text: await e.text() });
  }
  // If initialization gets as far as the story index, this function runs.
  initializeWithStoryIndex(e) {
    if (!this.projectAnnotationsBeforeInitialization)
      throw new Error("Cannot call initializeWithStoryIndex until project annotations resolve");
    this.storyStoreValue = new Re(
      e,
      this.importFn,
      this.projectAnnotationsBeforeInitialization
    ), delete this.projectAnnotationsBeforeInitialization, this.setInitialGlobals(), this.resolveStoreInitializationPromise();
  }
  async setInitialGlobals() {
    this.emitGlobals();
  }
  emitGlobals() {
    if (!this.storyStoreValue)
      throw new K({ methodName: "emitGlobals" });
    let e = {
      globals: this.storyStoreValue.userGlobals.get() || {},
      globalTypes: this.storyStoreValue.projectAnnotations.globalTypes || {}
    };
    this.channel.emit(Ei, e);
  }
  // EVENT HANDLERS
  // This happens when a config file gets reloaded
  async onGetProjectAnnotationsChanged({
    getProjectAnnotations: e
  }) {
    delete this.previewEntryError, this.getProjectAnnotations = e;
    let t = await this.getProjectAnnotationsOrRenderError();
    if (await this.runBeforeAllHook(t), !this.storyStoreValue) {
      await this.initializeWithProjectAnnotations(t);
      return;
    }
    this.storyStoreValue.setProjectAnnotations(t), this.emitGlobals();
  }
  async onStoryIndexChanged() {
    if (delete this.previewEntryError, !(!this.storyStoreValue && !this.projectAnnotationsBeforeInitialization))
      try {
        let e = await this.getStoryIndexFromServer();
        if (this.projectAnnotationsBeforeInitialization) {
          this.initializeWithStoryIndex(e);
          return;
        }
        await this.onStoriesChanged({ storyIndex: e });
      } catch (e) {
        throw this.renderPreviewEntryError("Error loading story index:", e), e;
      }
  }
  // This happens when a glob gets HMR-ed
  async onStoriesChanged({
    importFn: e,
    storyIndex: t
  }) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "onStoriesChanged" });
    await this.storyStoreValue.onStoriesChanged({ importFn: e, storyIndex: t });
  }
  async onUpdateGlobals({
    globals: e,
    currentStory: t
  }) {
    if (this.storyStoreValue || await this.storeInitializationPromise, !this.storyStoreValue)
      throw new K({ methodName: "onUpdateGlobals" });
    if (this.storyStoreValue.userGlobals.update(e), t) {
      let { initialGlobals: o, storyGlobals: n, userGlobals: i, globals: a } = this.storyStoreValue.getStoryContext(t);
      this.channel.emit(No, {
        initialGlobals: o,
        userGlobals: i,
        storyGlobals: n,
        globals: a
      });
    } else {
      let { initialGlobals: o, globals: n } = this.storyStoreValue.userGlobals;
      this.channel.emit(No, {
        initialGlobals: o,
        userGlobals: n,
        storyGlobals: {},
        globals: n
      });
    }
    await Promise.all(this.storyRenders.map((o) => o.rerender()));
  }
  async onUpdateArgs({ storyId: e, updatedArgs: t }) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "onUpdateArgs" });
    this.storyStoreValue.args.update(e, t), await Promise.all(
      this.storyRenders.filter((o) => o.id === e && !o.renderOptions.forceInitialArgs).map(
        (o) => (
          // We only run the play function, with in a force remount.
          // But when mount is destructured, the rendering happens inside of the play function.
          o.story && o.story.usesMount ? o.remount() : o.rerender()
        )
      )
    ), this.channel.emit(Ri, {
      storyId: e,
      args: this.storyStoreValue.args.get(e)
    });
  }
  async onRequestArgTypesInfo({ id: e, payload: t }) {
    try {
      await this.storeInitializationPromise;
      let o = await this.storyStoreValue?.loadStory(t);
      this.channel.emit(Lo, {
        id: e,
        success: !0,
        payload: { argTypes: o?.argTypes || {} },
        error: null
      });
    } catch (o) {
      this.channel.emit(Lo, {
        id: e,
        success: !1,
        error: o?.message
      });
    }
  }
  async onResetArgs({ storyId: e, argNames: t }) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "onResetArgs" });
    let n = this.storyRenders.find((l) => l.id === e)?.story || await this.storyStoreValue.loadStory({ storyId: e }), a = (t || [
      .../* @__PURE__ */ new Set([
        ...Object.keys(n.initialArgs),
        ...Object.keys(this.storyStoreValue.args.get(e))
      ])
    ]).reduce((l, c) => (l[c] = n.initialArgs[c], l), {});
    await this.onUpdateArgs({ storyId: e, updatedArgs: a });
  }
  // ForceReRender does not include a story id, so we simply must
  // re-render all stories in case they are relevant
  async onForceReRender() {
    await Promise.all(this.storyRenders.map((e) => e.rerender()));
  }
  async onForceRemount({ storyId: e }) {
    await Promise.all(this.storyRenders.filter((t) => t.id === e).map((t) => t.remount()));
  }
  // Used by docs to render a story to a given element
  // Note this short-circuits the `prepare()` phase of the StoryRender,
  // main to be consistent with the previous behaviour. In the future,
  // we will change it to go ahead and load the story, which will end up being
  // "instant", although async.
  renderStoryToElement(e, t, o, n) {
    if (!this.renderToCanvas || !this.storyStoreValue)
      throw new K({
        methodName: "renderStoryToElement"
      });
    let i = new ce(
      this.channel,
      this.storyStoreValue,
      this.renderToCanvas,
      o,
      e.id,
      "docs",
      n,
      e
    );
    return i.renderToElement(t), this.storyRenders.push(i), async () => {
      await this.teardownRender(i);
    };
  }
  async teardownRender(e, { viewModeChanged: t } = {}) {
    this.storyRenders = this.storyRenders.filter((o) => o !== e), await e?.teardown?.({ viewModeChanged: t });
  }
  // API
  async loadStory({ storyId: e }) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "loadStory" });
    return this.storyStoreValue.loadStory({ storyId: e });
  }
  getStoryContext(e, { forceInitialArgs: t = !1 } = {}) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "getStoryContext" });
    return this.storyStoreValue.getStoryContext(e, { forceInitialArgs: t });
  }
  async extract(e) {
    if (!this.storyStoreValue)
      throw new K({ methodName: "extract" });
    if (this.previewEntryError)
      throw this.previewEntryError;
    return await this.storyStoreValue.cacheAllCSFFiles(), this.storyStoreValue.extract(e);
  }
  // UTILITIES
  renderPreviewEntryError(e, t) {
    this.previewEntryError = t, jo.error(e), jo.error(t), this.channel.emit(gi, t);
  }
};
s(rt, "Preview");
var xe = rt;

// src/preview-api/modules/preview-web/PreviewWithSelection.tsx
import { logger as nr } from "@storybook/core/client-logger";
import {
  CURRENT_STORY_WAS_SET as Mo,
  DOCS_PREPARED as Li,
  GLOBALS_UPDATED as _o,
  PRELOAD_ENTRIES as Ni,
  PREVIEW_KEYDOWN as Mi,
  SET_CURRENT_STORY as _i,
  STORY_CHANGED as qi,
  STORY_ERRORED as Ui,
  STORY_MISSING as qo,
  STORY_PREPARED as Gi,
  STORY_RENDER_PHASE_CHANGED as Uo,
  STORY_SPECIFIED as Bi,
  STORY_THREW_EXCEPTION as zi,
  STORY_UNCHANGED as Vi,
  UPDATE_QUERY_PARAMS as Hi
} from "@storybook/core/core-events";
import {
  CalledPreviewMethodBeforeInitializationError as it,
  EmptyIndexError as Wi,
  MdxFileWithNoCsfReferencesError as $i,
  NoStoryMatchError as Yi
} from "@storybook/core/preview-errors";

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var Oi = !1, tt = "Invariant failed";
function or(r, e) {
  if (!r) {
    if (Oi)
      throw new Error(tt);
    var t = typeof e == "function" ? e() : e, o = t ? "".concat(tt, ": ").concat(t) : tt;
    throw new Error(o);
  }
}
s(or, "invariant");

// src/preview-api/modules/preview-web/render/CsfDocsRender.ts
import { DOCS_RENDERED as ki } from "@storybook/core/core-events";

// src/preview-api/modules/preview-web/docs-context/DocsContext.ts
import { isStory as Di } from "@storybook/core/csf";
var ot = class ot {
  constructor(e, t, o, n) {
    this.channel = e;
    this.store = t;
    this.renderStoryToElement = o;
    this.storyIdByName = /* @__PURE__ */ s((e) => {
      let t = this.nameToStoryId.get(e);
      if (t)
        return t;
      throw new Error(`No story found with that name: ${e}`);
    }, "storyIdByName");
    this.componentStories = /* @__PURE__ */ s(() => this.componentStoriesValue, "componentStories");
    this.componentStoriesFromCSFFile = /* @__PURE__ */ s((e) => this.store.componentStoriesFromCSFFile({ csfFile: e }), "componentStoriesFro\
mCSFFile");
    this.storyById = /* @__PURE__ */ s((e) => {
      if (!e) {
        if (!this.primaryStory)
          throw new Error(
            "No primary story defined for docs entry. Did you forget to use `<Meta>`?"
          );
        return this.primaryStory;
      }
      let t = this.storyIdToCSFFile.get(e);
      if (!t)
        throw new Error(`Called \`storyById\` for story that was never loaded: ${e}`);
      return this.store.storyFromCSFFile({ storyId: e, csfFile: t });
    }, "storyById");
    this.getStoryContext = /* @__PURE__ */ s((e) => ({
      ...this.store.getStoryContext(e),
      loaded: {},
      viewMode: "docs"
    }), "getStoryContext");
    this.loadStory = /* @__PURE__ */ s((e) => this.store.loadStory({ storyId: e }), "loadStory");
    this.componentStoriesValue = [], this.storyIdToCSFFile = /* @__PURE__ */ new Map(), this.exportToStory = /* @__PURE__ */ new Map(), this.
    exportsToCSFFile = /* @__PURE__ */ new Map(), this.nameToStoryId = /* @__PURE__ */ new Map(), this.attachedCSFFiles = /* @__PURE__ */ new Set(),
    n.forEach((i, a) => {
      this.referenceCSFFile(i);
    });
  }
  // This docs entry references this CSF file and can synchronously load the stories, as well
  // as reference them by module export. If the CSF is part of the "component" stories, they
  // can also be referenced by name and are in the componentStories list.
  referenceCSFFile(e) {
    this.exportsToCSFFile.set(e.moduleExports, e), this.exportsToCSFFile.set(e.moduleExports.default, e), this.store.componentStoriesFromCSFFile(
    { csfFile: e }).forEach((o) => {
      let n = e.stories[o.id];
      this.storyIdToCSFFile.set(n.id, e), this.exportToStory.set(n.moduleExport, o);
    });
  }
  attachCSFFile(e) {
    if (!this.exportsToCSFFile.has(e.moduleExports))
      throw new Error("Cannot attach a CSF file that has not been referenced");
    if (this.attachedCSFFiles.has(e))
      return;
    this.attachedCSFFiles.add(e), this.store.componentStoriesFromCSFFile({ csfFile: e }).forEach((o) => {
      this.nameToStoryId.set(o.name, o.id), this.componentStoriesValue.push(o), this.primaryStory || (this.primaryStory = o);
    });
  }
  referenceMeta(e, t) {
    let o = this.resolveModuleExport(e);
    if (o.type !== "meta")
      throw new Error(
        "<Meta of={} /> must reference a CSF file module export or meta export. Did you mistakenly reference your component instead of your \
CSF file?"
      );
    t && this.attachCSFFile(o.csfFile);
  }
  get projectAnnotations() {
    let { projectAnnotations: e } = this.store;
    if (!e)
      throw new Error("Can't get projectAnnotations from DocsContext before they are initialized");
    return e;
  }
  resolveAttachedModuleExportType(e) {
    if (e === "story") {
      if (!this.primaryStory)
        throw new Error(
          "No primary story attached to this docs file, did you forget to use <Meta of={} />?"
        );
      return { type: "story", story: this.primaryStory };
    }
    if (this.attachedCSFFiles.size === 0)
      throw new Error(
        "No CSF file attached to this docs file, did you forget to use <Meta of={} />?"
      );
    let t = Array.from(this.attachedCSFFiles)[0];
    if (e === "meta")
      return { type: "meta", csfFile: t };
    let { component: o } = t.meta;
    if (!o)
      throw new Error(
        "Attached CSF file does not defined a component, did you forget to export one?"
      );
    return { type: "component", component: o };
  }
  resolveModuleExport(e) {
    let t = this.exportsToCSFFile.get(e);
    if (t)
      return { type: "meta", csfFile: t };
    let o = this.exportToStory.get(
      Di(e) ? e.input : e
    );
    return o ? { type: "story", story: o } : { type: "component", component: e };
  }
  resolveOf(e, t = []) {
    let o;
    if (["component", "meta", "story"].includes(e)) {
      let n = e;
      o = this.resolveAttachedModuleExportType(n);
    } else
      o = this.resolveModuleExport(e);
    if (t.length && !t.includes(o.type)) {
      let n = o.type === "component" ? "component or unknown" : o.type;
      throw new Error(P`Invalid value passed to the 'of' prop. The value was resolved to a '${n}' type but the only types for this block are: ${t.
      join(
        ", "
      )}.
        - Did you pass a component to the 'of' prop when the block only supports a story or a meta?
        - ... or vice versa?
        - Did you pass a story, CSF file or meta to the 'of' prop that is not indexed, ie. is not targeted by the 'stories' globs in the main configuration?`);
    }
    switch (o.type) {
      case "component":
        return {
          ...o,
          projectAnnotations: this.projectAnnotations
        };
      case "meta":
        return {
          ...o,
          preparedMeta: this.store.preparedMetaFromCSFFile({ csfFile: o.csfFile })
        };
      case "story":
      default:
        return o;
    }
  }
};
s(ot, "DocsContext");
var re = ot;

// src/preview-api/modules/preview-web/render/CsfDocsRender.ts
var nt = class nt {
  constructor(e, t, o, n) {
    this.channel = e;
    this.store = t;
    this.entry = o;
    this.callbacks = n;
    this.type = "docs";
    this.subtype = "csf";
    this.torndown = !1;
    this.disableKeyListeners = !1;
    this.preparing = !1;
    this.id = o.id;
  }
  isPreparing() {
    return this.preparing;
  }
  async prepare() {
    this.preparing = !0;
    let { entryExports: e, csfFiles: t = [] } = await this.store.loadEntry(this.id);
    if (this.torndown)
      throw ee;
    let { importPath: o, title: n } = this.entry, i = this.store.processCSFFileWithCache(
      e,
      o,
      n
    ), a = Object.keys(i.stories)[0];
    this.story = this.store.storyFromCSFFile({ storyId: a, csfFile: i }), this.csfFiles = [i, ...t], this.preparing = !1;
  }
  isEqual(e) {
    return !!(this.id === e.id && this.story && this.story === e.story);
  }
  docsContext(e) {
    if (!this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    let t = new re(
      this.channel,
      this.store,
      e,
      this.csfFiles
    );
    return this.csfFiles.forEach((o) => t.attachCSFFile(o)), t;
  }
  async renderToElement(e, t) {
    if (!this.story || !this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    let o = this.docsContext(t), { docs: n } = this.story.parameters || {};
    if (!n)
      throw new Error(
        "Cannot render a story in viewMode=docs if `@storybook/addon-docs` is not installed"
      );
    let i = await n.renderer(), { render: a } = i, l = /* @__PURE__ */ s(async () => {
      try {
        await a(o, n, e), this.channel.emit(ki, this.id);
      } catch (c) {
        this.callbacks.showException(c);
      }
    }, "renderDocs");
    return this.rerender = async () => l(), this.teardownRender = async ({ viewModeChanged: c }) => {
      !c || !e || i.unmount(e);
    }, l();
  }
  async teardown({ viewModeChanged: e } = {}) {
    this.teardownRender?.({ viewModeChanged: e }), this.torndown = !0;
  }
};
s(nt, "CsfDocsRender");
var qe = nt;

// src/preview-api/modules/preview-web/render/MdxDocsRender.ts
import { DOCS_RENDERED as ji } from "@storybook/core/core-events";
var st = class st {
  constructor(e, t, o, n) {
    this.channel = e;
    this.store = t;
    this.entry = o;
    this.callbacks = n;
    this.type = "docs";
    this.subtype = "mdx";
    this.torndown = !1;
    this.disableKeyListeners = !1;
    this.preparing = !1;
    this.id = o.id;
  }
  isPreparing() {
    return this.preparing;
  }
  async prepare() {
    this.preparing = !0;
    let { entryExports: e, csfFiles: t = [] } = await this.store.loadEntry(this.id);
    if (this.torndown)
      throw ee;
    this.csfFiles = t, this.exports = e, this.preparing = !1;
  }
  isEqual(e) {
    return !!(this.id === e.id && this.exports && this.exports === e.exports);
  }
  docsContext(e) {
    if (!this.csfFiles)
      throw new Error("Cannot render docs before preparing");
    return new re(
      this.channel,
      this.store,
      e,
      this.csfFiles
    );
  }
  async renderToElement(e, t) {
    if (!this.exports || !this.csfFiles || !this.store.projectAnnotations)
      throw new Error("Cannot render docs before preparing");
    let o = this.docsContext(t), { docs: n } = this.store.projectAnnotations.parameters || {};
    if (!n)
      throw new Error(
        "Cannot render a story in viewMode=docs if `@storybook/addon-docs` is not installed"
      );
    let i = { ...n, page: this.exports.default }, a = await n.renderer(), { render: l } = a, c = /* @__PURE__ */ s(async () => {
      try {
        await l(o, i, e), this.channel.emit(ji, this.id);
      } catch (d) {
        this.callbacks.showException(d);
      }
    }, "renderDocs");
    return this.rerender = async () => c(), this.teardownRender = async ({ viewModeChanged: d } = {}) => {
      !d || !e || (a.unmount(e), this.torndown = !0);
    }, c();
  }
  async teardown({ viewModeChanged: e } = {}) {
    this.teardownRender?.({ viewModeChanged: e }), this.torndown = !0;
  }
};
s(st, "MdxDocsRender");
var Ue = st;

// src/preview-api/modules/preview-web/PreviewWithSelection.tsx
var Ki = globalThis;
function Xi(r) {
  let e = r.composedPath && r.composedPath()[0] || r.target;
  return /input|textarea/i.test(e.tagName) || e.getAttribute("contenteditable") !== null;
}
s(Xi, "focusInInput");
var Go = "attached-mdx", Ji = "unattached-mdx";
function Qi({ tags: r }) {
  return r?.includes(Ji) || r?.includes(Go);
}
s(Qi, "isMdxEntry");
function at(r) {
  return r.type === "story";
}
s(at, "isStoryRender");
function Zi(r) {
  return r.type === "docs";
}
s(Zi, "isDocsRender");
function ea(r) {
  return Zi(r) && r.subtype === "csf";
}
s(ea, "isCsfDocsRender");
var lt = class lt extends xe {
  constructor(t, o, n, i) {
    super(t, o, void 0, !1);
    this.importFn = t;
    this.getProjectAnnotations = o;
    this.selectionStore = n;
    this.view = i;
    this.initialize();
  }
  setupListeners() {
    super.setupListeners(), Ki.onkeydown = this.onKeydown.bind(this), this.channel.on(_i, this.onSetCurrentStory.bind(this)), this.channel.on(
    Hi, this.onUpdateQueryParams.bind(this)), this.channel.on(Ni, this.onPreloadStories.bind(this));
  }
  async setInitialGlobals() {
    if (!this.storyStoreValue)
      throw new it({ methodName: "setInitialGlobals" });
    let { globals: t } = this.selectionStore.selectionSpecifier || {};
    t && this.storyStoreValue.userGlobals.updateFromPersisted(t), this.emitGlobals();
  }
  // If initialization gets as far as the story index, this function runs.
  async initializeWithStoryIndex(t) {
    return await super.initializeWithStoryIndex(t), this.selectSpecifiedStory();
  }
  // Use the selection specifier to choose a story, then render it
  async selectSpecifiedStory() {
    if (!this.storyStoreValue)
      throw new it({
        methodName: "selectSpecifiedStory"
      });
    if (this.selectionStore.selection) {
      await this.renderSelection();
      return;
    }
    if (!this.selectionStore.selectionSpecifier) {
      this.renderMissingStory();
      return;
    }
    let { storySpecifier: t, args: o } = this.selectionStore.selectionSpecifier, n = this.storyStoreValue.storyIndex.entryFromSpecifier(t);
    if (!n) {
      t === "*" ? this.renderStoryLoadingException(t, new Wi()) : this.renderStoryLoadingException(
        t,
        new Yi({ storySpecifier: t.toString() })
      );
      return;
    }
    let { id: i, type: a } = n;
    this.selectionStore.setSelection({ storyId: i, viewMode: a }), this.channel.emit(Bi, this.selectionStore.selection), this.channel.emit(Mo,
    this.selectionStore.selection), await this.renderSelection({ persistedArgs: o });
  }
  // EVENT HANDLERS
  // This happens when a config file gets reloaded
  async onGetProjectAnnotationsChanged({
    getProjectAnnotations: t
  }) {
    await super.onGetProjectAnnotationsChanged({ getProjectAnnotations: t }), this.selectionStore.selection && this.renderSelection();
  }
  // This happens when a glob gets HMR-ed
  async onStoriesChanged({
    importFn: t,
    storyIndex: o
  }) {
    await super.onStoriesChanged({ importFn: t, storyIndex: o }), this.selectionStore.selection ? await this.renderSelection() : await this.
    selectSpecifiedStory();
  }
  onKeydown(t) {
    if (!this.storyRenders.find((o) => o.disableKeyListeners) && !Xi(t)) {
      let { altKey: o, ctrlKey: n, metaKey: i, shiftKey: a, key: l, code: c, keyCode: d } = t;
      this.channel.emit(Mi, {
        event: { altKey: o, ctrlKey: n, metaKey: i, shiftKey: a, key: l, code: c, keyCode: d }
      });
    }
  }
  async onSetCurrentStory(t) {
    this.selectionStore.setSelection({ viewMode: "story", ...t }), await this.storeInitializationPromise, this.channel.emit(Mo, this.selectionStore.
    selection), this.renderSelection();
  }
  onUpdateQueryParams(t) {
    this.selectionStore.setQueryParams(t);
  }
  async onUpdateGlobals({ globals: t }) {
    let o = this.currentRender instanceof ce && this.currentRender.story || void 0;
    super.onUpdateGlobals({ globals: t, currentStory: o }), (this.currentRender instanceof Ue || this.currentRender instanceof qe) && await this.
    currentRender.rerender?.();
  }
  async onUpdateArgs({ storyId: t, updatedArgs: o }) {
    super.onUpdateArgs({ storyId: t, updatedArgs: o });
  }
  async onPreloadStories({ ids: t }) {
    await this.storeInitializationPromise, this.storyStoreValue && await Promise.allSettled(t.map((o) => this.storyStoreValue?.loadEntry(o)));
  }
  // RENDERING
  // We can either have:
  // - a story selected in "story" viewMode,
  //     in which case we render it to the root element, OR
  // - a story selected in "docs" viewMode,
  //     in which case we render the docsPage for that story
  async renderSelection({ persistedArgs: t } = {}) {
    let { renderToCanvas: o } = this;
    if (!this.storyStoreValue || !o)
      throw new it({ methodName: "renderSelection" });
    let { selection: n } = this.selectionStore;
    if (!n)
      throw new Error("Cannot call renderSelection as no selection was made");
    let { storyId: i } = n, a;
    try {
      a = await this.storyStoreValue.storyIdToEntry(i);
    } catch (m) {
      this.currentRender && await this.teardownRender(this.currentRender), this.renderStoryLoadingException(i, m);
      return;
    }
    let l = this.currentSelection?.storyId !== i, c = this.currentRender?.type !== a.type;
    a.type === "story" ? this.view.showPreparingStory({ immediate: c }) : this.view.showPreparingDocs({ immediate: c }), this.currentRender?.
    isPreparing() && await this.teardownRender(this.currentRender);
    let d;
    a.type === "story" ? d = new ce(
      this.channel,
      this.storyStoreValue,
      o,
      this.mainStoryCallbacks(i),
      i,
      "story"
    ) : Qi(a) ? d = new Ue(
      this.channel,
      this.storyStoreValue,
      a,
      this.mainStoryCallbacks(i)
    ) : d = new qe(
      this.channel,
      this.storyStoreValue,
      a,
      this.mainStoryCallbacks(i)
    );
    let p = this.currentSelection;
    this.currentSelection = n;
    let u = this.currentRender;
    this.currentRender = d;
    try {
      await d.prepare();
    } catch (m) {
      u && await this.teardownRender(u), m !== ee && this.renderStoryLoadingException(i, m);
      return;
    }
    let y = !l && u && !d.isEqual(u);
    if (t && at(d) && (or(!!d.story), this.storyStoreValue.args.updateFromPersisted(d.story, t)), u && !u.torndown && !l && !y && !c) {
      this.currentRender = u, this.channel.emit(Vi, i), this.view.showMain();
      return;
    }
    if (u && await this.teardownRender(u, { viewModeChanged: c }), p && (l || c) && this.channel.emit(qi, i), at(d)) {
      or(!!d.story);
      let {
        parameters: m,
        initialArgs: g,
        argTypes: S,
        unmappedArgs: h,
        initialGlobals: E,
        userGlobals: R,
        storyGlobals: f,
        globals: b
      } = this.storyStoreValue.getStoryContext(d.story);
      this.channel.emit(Gi, {
        id: i,
        parameters: m,
        initialArgs: g,
        argTypes: S,
        args: h
      }), this.channel.emit(_o, { userGlobals: R, storyGlobals: f, globals: b, initialGlobals: E });
    } else {
      let { parameters: m } = this.storyStoreValue.projectAnnotations, { initialGlobals: g, globals: S } = this.storyStoreValue.userGlobals;
      if (this.channel.emit(_o, {
        globals: S,
        initialGlobals: g,
        storyGlobals: {},
        userGlobals: S
      }), ea(d) || d.entry.tags?.includes(Go)) {
        if (!d.csfFiles)
          throw new $i({ storyId: i });
        ({ parameters: m } = this.storyStoreValue.preparedMetaFromCSFFile({
          csfFile: d.csfFiles[0]
        }));
      }
      this.channel.emit(Li, {
        id: i,
        parameters: m
      });
    }
    at(d) ? (or(!!d.story), this.storyRenders.push(d), this.currentRender.renderToElement(
      this.view.prepareForStory(d.story)
    )) : this.currentRender.renderToElement(
      this.view.prepareForDocs(),
      // This argument is used for docs, which is currently only compatible with HTMLElements
      this.renderStoryToElement.bind(this)
    );
  }
  async teardownRender(t, { viewModeChanged: o = !1 } = {}) {
    this.storyRenders = this.storyRenders.filter((n) => n !== t), await t?.teardown?.({ viewModeChanged: o });
  }
  // UTILITIES
  mainStoryCallbacks(t) {
    return {
      showStoryDuringRender: /* @__PURE__ */ s(() => this.view.showStoryDuringRender(), "showStoryDuringRender"),
      showMain: /* @__PURE__ */ s(() => this.view.showMain(), "showMain"),
      showError: /* @__PURE__ */ s((o) => this.renderError(t, o), "showError"),
      showException: /* @__PURE__ */ s((o) => this.renderException(t, o), "showException")
    };
  }
  renderPreviewEntryError(t, o) {
    super.renderPreviewEntryError(t, o), this.view.showErrorDisplay(o);
  }
  renderMissingStory() {
    this.view.showNoPreview(), this.channel.emit(qo);
  }
  renderStoryLoadingException(t, o) {
    nr.error(o), this.view.showErrorDisplay(o), this.channel.emit(qo, t);
  }
  // renderException is used if we fail to render the story and it is uncaught by the app layer
  renderException(t, o) {
    let { name: n = "Error", message: i = String(o), stack: a } = o;
    this.channel.emit(zi, { name: n, message: i, stack: a }), this.channel.emit(Uo, { newPhase: "errored", storyId: t }), this.view.showErrorDisplay(
    o), nr.error(`Error rendering story '${t}':`), nr.error(o);
  }
  // renderError is used by the various app layers to inform the user they have done something
  // wrong -- for instance returned the wrong thing from a story
  renderError(t, { title: o, description: n }) {
    nr.error(`Error rendering story ${o}: ${n}`), this.channel.emit(Ui, { title: o, description: n }), this.channel.emit(Uo, { newPhase: "er\
rored", storyId: t }), this.view.showErrorDisplay({
      message: o,
      stack: n
    });
  }
};
s(lt, "PreviewWithSelection");
var we = lt;

// src/preview-api/modules/preview-web/UrlStore.ts
var Be = he(cr(), 1);

// src/preview-api/modules/preview-web/parseArgsParam.ts
import { once as Aa } from "@storybook/core/client-logger";
var en = he(cr(), 1);
var Zo = /^[a-zA-Z0-9 _-]*$/, rn = /^-?[0-9]+(\.[0-9]+)?$/, Ca = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i, tn = /^(rgba?|hsla?)\(([0-9]{1,3}),\s?([0-9]{1,3})%?,\s?([0-9]{1,3})%?,?\s?([0-9](\.[0-9]{1,2})?)?\)$/i,
ht = /* @__PURE__ */ s((r = "", e) => r === null || r === "" || !Zo.test(r) ? !1 : e == null || e instanceof Date || typeof e == "number" ||
typeof e == "boolean" ? !0 : typeof e == "string" ? Zo.test(e) || rn.test(e) || Ca.test(e) || tn.test(e) : Array.isArray(e) ? e.every((t) => ht(
r, t)) : L(e) ? Object.entries(e).every(([t, o]) => ht(t, o)) : !1, "validateArgs"), Pa = {
  delimiter: ";",
  // we're parsing a single query param
  nesting: !0,
  arrayRepeat: !0,
  arrayRepeatSyntax: "bracket",
  nestingSyntax: "js",
  // objects are encoded using dot notation
  valueDeserializer(r) {
    if (r.startsWith("!")) {
      if (r === "!undefined")
        return;
      if (r === "!null")
        return null;
      if (r === "!true")
        return !0;
      if (r === "!false")
        return !1;
      if (r.startsWith("!date(") && r.endsWith(")"))
        return new Date(r.replaceAll(" ", "+").slice(6, -1));
      if (r.startsWith("!hex(") && r.endsWith(")"))
        return `#${r.slice(5, -1)}`;
      let e = r.slice(1).match(tn);
      if (e)
        return r.startsWith("!rgba") || r.startsWith("!RGBA") ? `${e[1]}(${e[2]}, ${e[3]}, ${e[4]}, ${e[5]})` : r.startsWith("!hsla") || r.startsWith(
        "!HSLA") ? `${e[1]}(${e[2]}, ${e[3]}%, ${e[4]}%, ${e[5]})` : r.startsWith("!rgb") || r.startsWith("!RGB") ? `${e[1]}(${e[2]}, ${e[3]}\
, ${e[4]})` : `${e[1]}(${e[2]}, ${e[3]}%, ${e[4]}%)`;
    }
    return rn.test(r) ? Number(r) : r;
  }
}, mt = /* @__PURE__ */ s((r) => {
  let e = r.split(";").map((t) => t.replace("=", "~").replace(":", "="));
  return Object.entries((0, en.parse)(e.join(";"), Pa)).reduce((t, [o, n]) => ht(o, n) ? Object.assign(t, { [o]: n }) : (Aa.warn(P`
      Omitted potentially unsafe URL args.

      More info: https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url
    `), t), {});
}, "parseArgsParam");

// src/preview-api/modules/preview-web/UrlStore.ts
var { history: on, document: te } = I;
function Fa(r) {
  let e = (r || "").match(/^\/story\/(.+)/);
  if (!e)
    throw new Error(`Invalid path '${r}',  must start with '/story/'`);
  return e[1];
}
s(Fa, "pathToId");
var nn = /* @__PURE__ */ s(({
  selection: r,
  extraParams: e
}) => {
  let t = te?.location.search.slice(1), { path: o, selectedKind: n, selectedStory: i, ...a } = (0, Be.parse)(t);
  return `?${(0, Be.stringify)({
    ...a,
    ...e,
    ...r && { id: r.storyId, viewMode: r.viewMode }
  })}`;
}, "getQueryString"), Ia = /* @__PURE__ */ s((r) => {
  if (!r)
    return;
  let e = nn({ selection: r }), { hash: t = "" } = te.location;
  te.title = r.storyId, on.replaceState({}, "", `${te.location.pathname}${e}${t}`);
}, "setPath"), Oa = /* @__PURE__ */ s((r) => r != null && typeof r == "object" && Array.isArray(r) === !1, "isObject"), Ge = /* @__PURE__ */ s(
(r) => {
  if (r !== void 0) {
    if (typeof r == "string")
      return r;
    if (Array.isArray(r))
      return Ge(r[0]);
    if (Oa(r))
      return Ge(
        Object.values(r).filter(Boolean)
      );
  }
}, "getFirstString"), Da = /* @__PURE__ */ s(() => {
  if (typeof te < "u") {
    let r = te.location.search.slice(1), e = (0, Be.parse)(r), t = typeof e.args == "string" ? mt(e.args) : void 0, o = typeof e.globals == "\
string" ? mt(e.globals) : void 0, n = Ge(e.viewMode);
    (typeof n != "string" || !n.match(/docs|story/)) && (n = "story");
    let i = Ge(e.path), a = i ? Fa(i) : Ge(e.id);
    if (a)
      return { storySpecifier: a, args: t, globals: o, viewMode: n };
  }
  return null;
}, "getSelectionSpecifierFromPath"), gt = class gt {
  constructor() {
    this.selectionSpecifier = Da();
  }
  setSelection(e) {
    this.selection = e, Ia(this.selection);
  }
  setQueryParams(e) {
    let t = nn({ extraParams: e }), { hash: o = "" } = te.location;
    on.replaceState({}, "", `${te.location.pathname}${t}${o}`);
  }
};
s(gt, "UrlStore");
var ve = gt;

// src/preview-api/modules/preview-web/WebView.ts
var Mn = he(jn(), 1), _n = he(cr(), 1);
import { logger as fl } from "@storybook/core/client-logger";
var { document: j } = I, Ln = 100, qn = /* @__PURE__ */ ((i) => (i.MAIN = "MAIN", i.NOPREVIEW = "NOPREVIEW", i.PREPARING_STORY = "PREPARING_\
STORY", i.PREPARING_DOCS = "PREPARING_DOCS", i.ERROR = "ERROR", i))(qn || {}), wt = {
  PREPARING_STORY: "sb-show-preparing-story",
  PREPARING_DOCS: "sb-show-preparing-docs",
  MAIN: "sb-show-main",
  NOPREVIEW: "sb-show-nopreview",
  ERROR: "sb-show-errordisplay"
}, vt = {
  centered: "sb-main-centered",
  fullscreen: "sb-main-fullscreen",
  padded: "sb-main-padded"
}, Nn = new Mn.default({
  escapeXML: !0
}), At = class At {
  constructor() {
    this.testing = !1;
    if (typeof j < "u") {
      let { __SPECIAL_TEST_PARAMETER__: e } = (0, _n.parse)(j.location.search.slice(1));
      switch (e) {
        case "preparing-story": {
          this.showPreparingStory(), this.testing = !0;
          break;
        }
        case "preparing-docs": {
          this.showPreparingDocs(), this.testing = !0;
          break;
        }
        default:
      }
    }
  }
  // Get ready to render a story, returning the element to render to
  prepareForStory(e) {
    return this.showStory(), this.applyLayout(e.parameters.layout), j.documentElement.scrollTop = 0, j.documentElement.scrollLeft = 0, this.
    storyRoot();
  }
  storyRoot() {
    return j.getElementById("storybook-root");
  }
  prepareForDocs() {
    return this.showMain(), this.showDocs(), this.applyLayout("fullscreen"), j.documentElement.scrollTop = 0, j.documentElement.scrollLeft =
    0, this.docsRoot();
  }
  docsRoot() {
    return j.getElementById("storybook-docs");
  }
  applyLayout(e = "padded") {
    if (e === "none") {
      j.body.classList.remove(this.currentLayoutClass), this.currentLayoutClass = null;
      return;
    }
    this.checkIfLayoutExists(e);
    let t = vt[e];
    j.body.classList.remove(this.currentLayoutClass), j.body.classList.add(t), this.currentLayoutClass = t;
  }
  checkIfLayoutExists(e) {
    vt[e] || fl.warn(
      P`
          The desired layout: ${e} is not a valid option.
          The possible options are: ${Object.keys(vt).join(", ")}, none.
        `
    );
  }
  showMode(e) {
    clearTimeout(this.preparingTimeout), Object.keys(qn).forEach((t) => {
      t === e ? j.body.classList.add(wt[t]) : j.body.classList.remove(wt[t]);
    });
  }
  showErrorDisplay({ message: e = "", stack: t = "" }) {
    let o = e, n = t, i = e.split(`
`);
    i.length > 1 && ([o] = i, n = i.slice(1).join(`
`).replace(/^\n/, "")), j.getElementById("error-message").innerHTML = Nn.toHtml(o), j.getElementById("error-stack").innerHTML = Nn.toHtml(n),
    this.showMode("ERROR");
  }
  showNoPreview() {
    this.testing || (this.showMode("NOPREVIEW"), this.storyRoot()?.setAttribute("hidden", "true"), this.docsRoot()?.setAttribute("hidden", "\
true"));
  }
  showPreparingStory({ immediate: e = !1 } = {}) {
    clearTimeout(this.preparingTimeout), e ? this.showMode("PREPARING_STORY") : this.preparingTimeout = setTimeout(
      () => this.showMode("PREPARING_STORY"),
      Ln
    );
  }
  showPreparingDocs({ immediate: e = !1 } = {}) {
    clearTimeout(this.preparingTimeout), e ? this.showMode("PREPARING_DOCS") : this.preparingTimeout = setTimeout(() => this.showMode("PREPA\
RING_DOCS"), Ln);
  }
  showMain() {
    this.showMode("MAIN");
  }
  showDocs() {
    this.storyRoot().setAttribute("hidden", "true"), this.docsRoot().removeAttribute("hidden");
  }
  showStory() {
    this.docsRoot().setAttribute("hidden", "true"), this.storyRoot().removeAttribute("hidden");
  }
  showStoryDuringRender() {
    j.body.classList.add(wt.MAIN);
  }
};
s(At, "WebView");
var Ae = At;

// src/preview-api/modules/preview-web/PreviewWeb.tsx
var Ct = class Ct extends we {
  constructor(t, o) {
    super(t, o, new ve(), new Ae());
    this.importFn = t;
    this.getProjectAnnotations = o;
    I.__STORYBOOK_PREVIEW__ = this;
  }
};
s(Ct, "PreviewWeb");
var gr = Ct;

// src/preview-api/modules/preview-web/simulate-pageload.ts
var { document: fe } = I, yl = [
  "application/javascript",
  "application/ecmascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
  // Support modern javascript
  "module"
], hl = "script", Un = "scripts-root";
function Sr() {
  let r = fe.createEvent("Event");
  r.initEvent("DOMContentLoaded", !0, !0), fe.dispatchEvent(r);
}
s(Sr, "simulateDOMContentLoaded");
function ml(r, e, t) {
  let o = fe.createElement("script");
  o.type = r.type === "module" ? "module" : "text/javascript", r.src ? (o.onload = e, o.onerror = e, o.src = r.src) : o.textContent = r.innerText,
  t ? t.appendChild(o) : fe.head.appendChild(o), r.parentNode.removeChild(r), r.src || e();
}
s(ml, "insertScript");
function Gn(r, e, t = 0) {
  r[t](() => {
    t++, t === r.length ? e() : Gn(r, e, t);
  });
}
s(Gn, "insertScriptsSequentially");
function Bn(r) {
  let e = fe.getElementById(Un);
  e ? e.innerHTML = "" : (e = fe.createElement("div"), e.id = Un, fe.body.appendChild(e));
  let t = Array.from(r.querySelectorAll(hl));
  if (t.length) {
    let o = [];
    t.forEach((n) => {
      let i = n.getAttribute("type");
      (!i || yl.includes(i)) && o.push((a) => ml(n, a, e));
    }), o.length && Gn(o, Sr, void 0);
  } else
    Sr();
}
s(Bn, "simulatePageLoad");
export {
  re as DocsContext,
  se as HooksContext,
  xe as Preview,
  gr as PreviewWeb,
  we as PreviewWithSelection,
  le as ReporterAPI,
  Re as StoryStore,
  ve as UrlStore,
  Ae as WebView,
  V as addons,
  vr as applyHooks,
  ke as combineArgs,
  M as combineParameters,
  Ee as composeConfigs,
  Kr as composeStepRunners,
  Zs as composeStories,
  Ro as composeStory,
  ei as createPlaywrightTest,
  go as decorateStory,
  Hr as defaultDecorateStory,
  Jn as definePreview,
  Nr as experimental_MockUniversalStore,
  J as experimental_UniversalStore,
  Ss as experimental_useUniversalStore,
  rr as filterArgTypes,
  Jr as getCsfFactoryAnnotations,
  Ne as inferControls,
  ys as makeDecorator,
  Tr as mockChannel,
  be as normalizeProjectAnnotations,
  Se as normalizeStory,
  Wr as prepareMeta,
  Le as prepareStory,
  So as sanitizeStoryContextUpdate,
  $s as setDefaultProjectAnnotations,
  Js as setProjectAnnotations,
  Sr as simulateDOMContentLoaded,
  Bn as simulatePageLoad,
  ci as sortStoriesV7,
  us as useArgs,
  Oe as useCallback,
  ds as useChannel,
  jt as useEffect,
  fs as useGlobals,
  ss as useMemo,
  ps as useParameter,
  cs as useReducer,
  is as useRef,
  ls as useState,
  We as useStoryContext,
  ai as userOrAutoTitle,
  Co as userOrAutoTitleFromSpecifier
};
