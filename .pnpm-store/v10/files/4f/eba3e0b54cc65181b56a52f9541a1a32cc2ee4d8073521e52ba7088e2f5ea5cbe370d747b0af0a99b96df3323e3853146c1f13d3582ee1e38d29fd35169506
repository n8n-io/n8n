var $t = Object.create;
var ye = Object.defineProperty;
var Ht = Object.getOwnPropertyDescriptor;
var Kt = Object.getOwnPropertyNames;
var Jt = Object.getPrototypeOf, Qt = Object.prototype.hasOwnProperty;
var a = (e, t) => ye(e, "name", { value: t, configurable: !0 }), K = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(e, {
  get: (t, r) => (typeof require < "u" ? require : t)[r]
}) : e)(function(e) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + e + '" is not supported');
});
var V = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
var Yt = (e, t, r, n) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of Kt(t))
      !Qt.call(e, o) && o !== r && ye(e, o, { get: () => t[o], enumerable: !(n = Ht(t, o)) || n.enumerable });
  return e;
};
var Ie = (e, t, r) => (r = e != null ? $t(Jt(e)) : {}, Yt(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !e || !e.__esModule ? ye(r, "default", { value: e, enumerable: !0 }) : r,
  e
));

// ../node_modules/memoizerific/memoizerific.js
var ct = V((lt, Ee) => {
  (function(e) {
    if (typeof lt == "object" && typeof Ee < "u")
      Ee.exports = e();
    else if (typeof define == "function" && define.amd)
      define([], e);
    else {
      var t;
      typeof window < "u" ? t = window : typeof global < "u" ? t = global : typeof self < "u" ? t = self : t = this, t.memoizerific = e();
    }
  })(function() {
    var e, t, r;
    return (/* @__PURE__ */ a(function n(o, i, c) {
      function s(u, p) {
        if (!i[u]) {
          if (!o[u]) {
            var h = typeof K == "function" && K;
            if (!p && h) return h(u, !0);
            if (l) return l(u, !0);
            var m = new Error("Cannot find module '" + u + "'");
            throw m.code = "MODULE_NOT_FOUND", m;
          }
          var g = i[u] = { exports: {} };
          o[u][0].call(g.exports, function(d) {
            var v = o[u][1][d];
            return s(v || d);
          }, g, g.exports, n, o, i, c);
        }
        return i[u].exports;
      }
      a(s, "s");
      for (var l = typeof K == "function" && K, f = 0; f < c.length; f++) s(c[f]);
      return s;
    }, "e"))({ 1: [function(n, o, i) {
      o.exports = function(c) {
        if (typeof Map != "function" || c) {
          var s = n("./similar");
          return new s();
        } else
          return /* @__PURE__ */ new Map();
      };
    }, { "./similar": 2 }], 2: [function(n, o, i) {
      function c() {
        return this.list = [], this.lastItem = void 0, this.size = 0, this;
      }
      a(c, "Similar"), c.prototype.get = function(s) {
        var l;
        if (this.lastItem && this.isEqual(this.lastItem.key, s))
          return this.lastItem.val;
        if (l = this.indexOf(s), l >= 0)
          return this.lastItem = this.list[l], this.list[l].val;
      }, c.prototype.set = function(s, l) {
        var f;
        return this.lastItem && this.isEqual(this.lastItem.key, s) ? (this.lastItem.val = l, this) : (f = this.indexOf(s), f >= 0 ? (this.lastItem =
        this.list[f], this.list[f].val = l, this) : (this.lastItem = { key: s, val: l }, this.list.push(this.lastItem), this.size++, this));
      }, c.prototype.delete = function(s) {
        var l;
        if (this.lastItem && this.isEqual(this.lastItem.key, s) && (this.lastItem = void 0), l = this.indexOf(s), l >= 0)
          return this.size--, this.list.splice(l, 1)[0];
      }, c.prototype.has = function(s) {
        var l;
        return this.lastItem && this.isEqual(this.lastItem.key, s) ? !0 : (l = this.indexOf(s), l >= 0 ? (this.lastItem = this.list[l], !0) :
        !1);
      }, c.prototype.forEach = function(s, l) {
        var f;
        for (f = 0; f < this.size; f++)
          s.call(l || this, this.list[f].val, this.list[f].key, this);
      }, c.prototype.indexOf = function(s) {
        var l;
        for (l = 0; l < this.size; l++)
          if (this.isEqual(this.list[l].key, s))
            return l;
        return -1;
      }, c.prototype.isEqual = function(s, l) {
        return s === l || s !== s && l !== l;
      }, o.exports = c;
    }, {}], 3: [function(n, o, i) {
      var c = n("map-or-similar");
      o.exports = function(u) {
        var p = new c(!1), h = [];
        return function(m) {
          var g = /* @__PURE__ */ a(function() {
            var d = p, v, R, b = arguments.length - 1, x = Array(b + 1), O = !0, P;
            if ((g.numArgs || g.numArgs === 0) && g.numArgs !== b + 1)
              throw new Error("Memoizerific functions should always be called with the same number of arguments");
            for (P = 0; P < b; P++) {
              if (x[P] = {
                cacheItem: d,
                arg: arguments[P]
              }, d.has(arguments[P])) {
                d = d.get(arguments[P]);
                continue;
              }
              O = !1, v = new c(!1), d.set(arguments[P], v), d = v;
            }
            return O && (d.has(arguments[b]) ? R = d.get(arguments[b]) : O = !1), O || (R = m.apply(null, arguments), d.set(arguments[b], R)),
            u > 0 && (x[b] = {
              cacheItem: d,
              arg: arguments[b]
            }, O ? s(h, x) : h.push(x), h.length > u && l(h.shift())), g.wasMemoized = O, g.numArgs = b + 1, R;
          }, "memoizerific");
          return g.limit = u, g.wasMemoized = !1, g.cache = p, g.lru = h, g;
        };
      };
      function s(u, p) {
        var h = u.length, m = p.length, g, d, v;
        for (d = 0; d < h; d++) {
          for (g = !0, v = 0; v < m; v++)
            if (!f(u[d][v].arg, p[v].arg)) {
              g = !1;
              break;
            }
          if (g)
            break;
        }
        u.push(u.splice(d, 1)[0]);
      }
      a(s, "moveToMostRecentLru");
      function l(u) {
        var p = u.length, h = u[p - 1], m, g;
        for (h.cacheItem.delete(h.arg), g = p - 2; g >= 0 && (h = u[g], m = h.cacheItem.get(h.arg), !m || !m.size); g--)
          h.cacheItem.delete(h.arg);
      }
      a(l, "removeCachedResult");
      function f(u, p) {
        return u === p || u !== u && p !== p;
      }
      a(f, "isEqual");
    }, { "map-or-similar": 1 }] }, {}, [3])(3);
  });
});

// ../node_modules/picoquery/lib/string-util.js
var Pe = V((Re) => {
  "use strict";
  Object.defineProperty(Re, "__esModule", { value: !0 });
  Re.encodeString = Gt;
  var T = Array.from({ length: 256 }, (e, t) => "%" + ((t < 16 ? "0" : "") + t.toString(16)).toUpperCase()), Xt = new Int8Array([
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
  function Gt(e) {
    let t = e.length;
    if (t === 0)
      return "";
    let r = "", n = 0, o = 0;
    e: for (; o < t; o++) {
      let i = e.charCodeAt(o);
      for (; i < 128; ) {
        if (Xt[i] !== 1 && (n < o && (r += e.slice(n, o)), n = o + 1, r += T[i]), ++o === t)
          break e;
        i = e.charCodeAt(o);
      }
      if (n < o && (r += e.slice(n, o)), i < 2048) {
        n = o + 1, r += T[192 | i >> 6] + T[128 | i & 63];
        continue;
      }
      if (i < 55296 || i >= 57344) {
        n = o + 1, r += T[224 | i >> 12] + T[128 | i >> 6 & 63] + T[128 | i & 63];
        continue;
      }
      if (++o, o >= t)
        throw new Error("URI malformed");
      let c = e.charCodeAt(o) & 1023;
      n = o + 1, i = 65536 + ((i & 1023) << 10 | c), r += T[240 | i >> 18] + T[128 | i >> 12 & 63] + T[128 | i >> 6 & 63] + T[128 | i & 63];
    }
    return n === 0 ? e : n < t ? r + e.slice(n) : r;
  }
  a(Gt, "encodeString");
});

// ../node_modules/picoquery/lib/shared.js
var ae = V((L) => {
  "use strict";
  Object.defineProperty(L, "__esModule", { value: !0 });
  L.defaultOptions = L.defaultShouldSerializeObject = L.defaultValueSerializer = void 0;
  var we = Pe(), Zt = /* @__PURE__ */ a((e) => {
    switch (typeof e) {
      case "string":
        return (0, we.encodeString)(e);
      case "bigint":
      case "boolean":
        return "" + e;
      case "number":
        if (Number.isFinite(e))
          return e < 1e21 ? "" + e : (0, we.encodeString)("" + e);
        break;
    }
    return e instanceof Date ? (0, we.encodeString)(e.toISOString()) : "";
  }, "defaultValueSerializer");
  L.defaultValueSerializer = Zt;
  var er = /* @__PURE__ */ a((e) => e instanceof Date, "defaultShouldSerializeObject");
  L.defaultShouldSerializeObject = er;
  var ut = /* @__PURE__ */ a((e) => e, "identityFunc");
  L.defaultOptions = {
    nesting: !0,
    nestingSyntax: "dot",
    arrayRepeat: !1,
    arrayRepeatSyntax: "repeat",
    delimiter: 38,
    valueDeserializer: ut,
    valueSerializer: L.defaultValueSerializer,
    keyDeserializer: ut,
    shouldSerializeObject: L.defaultShouldSerializeObject
  };
});

// ../node_modules/picoquery/lib/object-util.js
var Ne = V((ie) => {
  "use strict";
  Object.defineProperty(ie, "__esModule", { value: !0 });
  ie.getDeepObject = nr;
  ie.stringifyObject = ft;
  var W = ae(), tr = Pe();
  function rr(e) {
    return e === "__proto__" || e === "constructor" || e === "prototype";
  }
  a(rr, "isPrototypeKey");
  function nr(e, t, r, n, o) {
    if (rr(t))
      return e;
    let i = e[t];
    return typeof i == "object" && i !== null ? i : !n && (o || typeof r == "number" || typeof r == "string" && r * 0 === 0 && r.indexOf(".") ===
    -1) ? e[t] = [] : e[t] = {};
  }
  a(nr, "getDeepObject");
  var or = 20, ar = "[]", ir = "[", sr = "]", lr = ".";
  function ft(e, t, r = 0, n, o) {
    let { nestingSyntax: i = W.defaultOptions.nestingSyntax, arrayRepeat: c = W.defaultOptions.arrayRepeat, arrayRepeatSyntax: s = W.defaultOptions.
    arrayRepeatSyntax, nesting: l = W.defaultOptions.nesting, delimiter: f = W.defaultOptions.delimiter, valueSerializer: u = W.defaultOptions.
    valueSerializer, shouldSerializeObject: p = W.defaultOptions.shouldSerializeObject } = t, h = typeof f == "number" ? String.fromCharCode(
    f) : f, m = o === !0 && c, g = i === "dot" || i === "js" && !o;
    if (r > or)
      return "";
    let d = "", v = !0, R = !1;
    for (let b in e) {
      let x = e[b], O;
      n ? (O = n, m ? s === "bracket" && (O += ar) : g ? (O += lr, O += b) : (O += ir, O += b, O += sr)) : O = b, v || (d += h), typeof x ==
      "object" && x !== null && !p(x) ? (R = x.pop !== void 0, (l || c && R) && (d += ft(x, t, r + 1, O, R))) : (d += (0, tr.encodeString)(O),
      d += "=", d += u(x, b)), v && (v = !1);
    }
    return d;
  }
  a(ft, "stringifyObject");
});

// ../node_modules/fast-decode-uri-component/index.js
var mt = V((wn, dt) => {
  "use strict";
  var pt = 12, cr = 0, Se = [
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
  function ur(e) {
    var t = e.indexOf("%");
    if (t === -1) return e;
    for (var r = e.length, n = "", o = 0, i = 0, c = t, s = pt; t > -1 && t < r; ) {
      var l = ht(e[t + 1], 4), f = ht(e[t + 2], 0), u = l | f, p = Se[u];
      if (s = Se[256 + s + p], i = i << 6 | u & Se[364 + p], s === pt)
        n += e.slice(o, c), n += i <= 65535 ? String.fromCharCode(i) : String.fromCharCode(
          55232 + (i >> 10),
          56320 + (i & 1023)
        ), i = 0, o = t + 3, t = c = e.indexOf("%", o);
      else {
        if (s === cr)
          return null;
        if (t += 3, t < r && e.charCodeAt(t) === 37) continue;
        return null;
      }
    }
    return n + e.slice(o);
  }
  a(ur, "decodeURIComponent");
  var fr = {
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
  function ht(e, t) {
    var r = fr[e];
    return r === void 0 ? 255 : r << t;
  }
  a(ht, "hexCodeToInt");
  dt.exports = ur;
});

// ../node_modules/picoquery/lib/parse.js
var xt = V((I) => {
  "use strict";
  var pr = I && I.__importDefault || function(e) {
    return e && e.__esModule ? e : { default: e };
  };
  Object.defineProperty(I, "__esModule", { value: !0 });
  I.numberValueDeserializer = I.numberKeyDeserializer = void 0;
  I.parse = mr;
  var se = Ne(), F = ae(), gt = pr(mt()), hr = /* @__PURE__ */ a((e) => {
    let t = Number(e);
    return Number.isNaN(t) ? e : t;
  }, "numberKeyDeserializer");
  I.numberKeyDeserializer = hr;
  var dr = /* @__PURE__ */ a((e) => {
    let t = Number(e);
    return Number.isNaN(t) ? e : t;
  }, "numberValueDeserializer");
  I.numberValueDeserializer = dr;
  var yt = /\+/g, vt = /* @__PURE__ */ a(function() {
  }, "Empty");
  vt.prototype = /* @__PURE__ */ Object.create(null);
  function le(e, t, r, n, o) {
    let i = e.substring(t, r);
    return n && (i = i.replace(yt, " ")), o && (i = (0, gt.default)(i) || i), i;
  }
  a(le, "computeKeySlice");
  function mr(e, t) {
    let { valueDeserializer: r = F.defaultOptions.valueDeserializer, keyDeserializer: n = F.defaultOptions.keyDeserializer, arrayRepeatSyntax: o = F.
    defaultOptions.arrayRepeatSyntax, nesting: i = F.defaultOptions.nesting, arrayRepeat: c = F.defaultOptions.arrayRepeat, nestingSyntax: s = F.
    defaultOptions.nestingSyntax, delimiter: l = F.defaultOptions.delimiter } = t ?? {}, f = typeof l == "string" ? l.charCodeAt(0) : l, u = s ===
    "js", p = new vt();
    if (typeof e != "string")
      return p;
    let h = e.length, m = "", g = -1, d = -1, v = -1, R = p, b, x = "", O = "", P = !1, q = !1, y = !1, E = !1, w = !1, j = !1, S = !1, _ = 0,
    C = -1, D = -1, ge = -1;
    for (let N = 0; N < h + 1; N++) {
      if (_ = N !== h ? e.charCodeAt(N) : f, _ === f) {
        if (S = d > g, S || (d = N), v !== d - 1 && (O = le(e, v + 1, C > -1 ? C : d, y, P), x = n(O), b !== void 0 && (R = (0, se.getDeepObject)(
        R, b, x, u && w, u && j))), S || x !== "") {
          S && (m = e.slice(d + 1, N), E && (m = m.replace(yt, " ")), q && (m = (0, gt.default)(m) || m));
          let H = r(m, x);
          if (c) {
            let ne = R[x];
            ne === void 0 ? C > -1 ? R[x] = [H] : R[x] = H : ne.pop ? ne.push(H) : R[x] = [ne, H];
          } else
            R[x] = H;
        }
        m = "", g = N, d = N, P = !1, q = !1, y = !1, E = !1, w = !1, j = !1, C = -1, v = N, R = p, b = void 0, x = "";
      } else _ === 93 ? (c && o === "bracket" && ge === 91 && (C = D), i && (s === "index" || u) && d <= g && (v !== D && (O = le(e, v + 1, N,
      y, P), x = n(O), b !== void 0 && (R = (0, se.getDeepObject)(R, b, x, void 0, u)), b = x, y = !1, P = !1), v = N, j = !0, w = !1)) : _ ===
      46 ? i && (s === "dot" || u) && d <= g && (v !== D && (O = le(e, v + 1, N, y, P), x = n(O), b !== void 0 && (R = (0, se.getDeepObject)(
      R, b, x, u)), b = x, y = !1, P = !1), w = !0, j = !1, v = N) : _ === 91 ? i && (s === "index" || u) && d <= g && (v !== D && (O = le(e,
      v + 1, N, y, P), x = n(O), u && b !== void 0 && (R = (0, se.getDeepObject)(R, b, x, u)), b = x, y = !1, P = !1, w = !1, j = !0), v = N) :
      _ === 61 ? d <= g ? d = N : q = !0 : _ === 43 ? d > g ? E = !0 : y = !0 : _ === 37 && (d > g ? q = !0 : P = !0);
      D = N, ge = _;
    }
    return p;
  }
  a(mr, "parse");
});

// ../node_modules/picoquery/lib/stringify.js
var bt = V((_e) => {
  "use strict";
  Object.defineProperty(_e, "__esModule", { value: !0 });
  _e.stringify = yr;
  var gr = Ne();
  function yr(e, t) {
    if (e === null || typeof e != "object")
      return "";
    let r = t ?? {};
    return (0, gr.stringifyObject)(e, r);
  }
  a(yr, "stringify");
});

// ../node_modules/picoquery/lib/main.js
var Ot = V((A) => {
  "use strict";
  var vr = A && A.__createBinding || (Object.create ? function(e, t, r, n) {
    n === void 0 && (n = r);
    var o = Object.getOwnPropertyDescriptor(t, r);
    (!o || ("get" in o ? !t.__esModule : o.writable || o.configurable)) && (o = { enumerable: !0, get: /* @__PURE__ */ a(function() {
      return t[r];
    }, "get") }), Object.defineProperty(e, n, o);
  } : function(e, t, r, n) {
    n === void 0 && (n = r), e[n] = t[r];
  }), xr = A && A.__exportStar || function(e, t) {
    for (var r in e) r !== "default" && !Object.prototype.hasOwnProperty.call(t, r) && vr(t, e, r);
  };
  Object.defineProperty(A, "__esModule", { value: !0 });
  A.stringify = A.parse = void 0;
  var br = xt();
  Object.defineProperty(A, "parse", { enumerable: !0, get: /* @__PURE__ */ a(function() {
    return br.parse;
  }, "get") });
  var Or = bt();
  Object.defineProperty(A, "stringify", { enumerable: !0, get: /* @__PURE__ */ a(function() {
    return Or.stringify;
  }, "get") });
  xr(ae(), A);
});

// src/router/utils.ts
import { once as Er } from "@storybook/core/client-logger";

// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function k(e) {
  if (typeof e != "object" || e == null)
    return !1;
  if (Object.getPrototypeOf(e) === null)
    return !0;
  if (e.toString() !== "[object Object]")
    return !1;
  let t = e;
  for (; Object.getPrototypeOf(t) !== null; )
    t = Object.getPrototypeOf(t);
  return Object.getPrototypeOf(e) === t;
}
a(k, "isPlainObject");

// ../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var Ve = "[object RegExp]", Be = "[object String]", ze = "[object Number]", We = "[object Boolean]", ve = "[object Arguments]", Fe = "[objec\
t Symbol]", qe = "[object Date]", Ue = "[object Map]", $e = "[object Set]", He = "[object Array]", Ke = "[object Function]", Je = "[object A\
rrayBuffer]", oe = "[object Object]", Qe = "[object Error]", Ye = "[object DataView]", Xe = "[object Uint8Array]", Ge = "[object Uint8Clampe\
dArray]", Ze = "[object Uint16Array]", et = "[object Uint32Array]", tt = "[object BigUint64Array]", rt = "[object Int8Array]", nt = "[object\
 Int16Array]", ot = "[object Int32Array]", at = "[object BigInt64Array]", it = "[object Float32Array]", st = "[object Float64Array]";

// ../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function xe(e) {
  return Object.getOwnPropertySymbols(e).filter((t) => Object.prototype.propertyIsEnumerable.call(e, t));
}
a(xe, "getSymbols");

// ../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function be(e) {
  return e == null ? e === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(e);
}
a(be, "getTag");

// ../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function Oe(e, t) {
  if (typeof e == typeof t)
    switch (typeof e) {
      case "bigint":
      case "string":
      case "boolean":
      case "symbol":
      case "undefined":
        return e === t;
      case "number":
        return e === t || Object.is(e, t);
      case "function":
        return e === t;
      case "object":
        return M(e, t);
    }
  return M(e, t);
}
a(Oe, "isEqual");
function M(e, t, r) {
  if (Object.is(e, t))
    return !0;
  let n = be(e), o = be(t);
  if (n === ve && (n = oe), o === ve && (o = oe), n !== o)
    return !1;
  switch (n) {
    case Be:
      return e.toString() === t.toString();
    case ze: {
      let s = e.valueOf(), l = t.valueOf();
      return s === l || Number.isNaN(s) && Number.isNaN(l);
    }
    case We:
    case qe:
    case Fe:
      return Object.is(e.valueOf(), t.valueOf());
    case Ve:
      return e.source === t.source && e.flags === t.flags;
    case Ke:
      return e === t;
  }
  r = r ?? /* @__PURE__ */ new Map();
  let i = r.get(e), c = r.get(t);
  if (i != null && c != null)
    return i === t;
  r.set(e, t), r.set(t, e);
  try {
    switch (n) {
      case Ue: {
        if (e.size !== t.size)
          return !1;
        for (let [s, l] of e.entries())
          if (!t.has(s) || !M(l, t.get(s), r))
            return !1;
        return !0;
      }
      case $e: {
        if (e.size !== t.size)
          return !1;
        let s = Array.from(e.values()), l = Array.from(t.values());
        for (let f = 0; f < s.length; f++) {
          let u = s[f], p = l.findIndex((h) => M(u, h, r));
          if (p === -1)
            return !1;
          l.splice(p, 1);
        }
        return !0;
      }
      case He:
      case Xe:
      case Ge:
      case Ze:
      case et:
      case tt:
      case rt:
      case nt:
      case ot:
      case at:
      case it:
      case st: {
        if (typeof Buffer < "u" && Buffer.isBuffer(e) !== Buffer.isBuffer(t) || e.length !== t.length)
          return !1;
        for (let s = 0; s < e.length; s++)
          if (!M(e[s], t[s], r))
            return !1;
        return !0;
      }
      case Je:
        return e.byteLength !== t.byteLength ? !1 : M(new Uint8Array(e), new Uint8Array(t), r);
      case Ye:
        return e.byteLength !== t.byteLength || e.byteOffset !== t.byteOffset ? !1 : M(e.buffer, t.buffer, r);
      case Qe:
        return e.name === t.name && e.message === t.message;
      case oe: {
        if (!(M(e.constructor, t.constructor, r) || k(e) && k(t)))
          return !1;
        let l = [...Object.keys(e), ...xe(e)], f = [...Object.keys(t), ...xe(t)];
        if (l.length !== f.length)
          return !1;
        for (let u = 0; u < l.length; u++) {
          let p = l[u], h = e[p];
          if (!Object.prototype.hasOwnProperty.call(t, p))
            return !1;
          let m = t[p];
          if (!M(h, m, r))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    r.delete(e), r.delete(t);
  }
}
a(M, "areObjectsEqual");

// src/router/utils.ts
var ue = Ie(ct(), 1), J = Ie(Ot(), 1);

// ../node_modules/ts-dedent/esm/index.js
function Et(e) {
  for (var t = [], r = 1; r < arguments.length; r++)
    t[r - 1] = arguments[r];
  var n = Array.from(typeof e == "string" ? [e] : e);
  n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var o = n.reduce(function(s, l) {
    var f = l.match(/\n([\t ]+|(?!\s).)/g);
    return f ? s.concat(f.map(function(u) {
      var p, h;
      return (h = (p = u.match(/[\t ]/g)) === null || p === void 0 ? void 0 : p.length) !== null && h !== void 0 ? h : 0;
    })) : s;
  }, []);
  if (o.length) {
    var i = new RegExp(`
[	 ]{` + Math.min.apply(Math, o) + "}", "g");
    n = n.map(function(s) {
      return s.replace(i, `
`);
    });
  }
  n[0] = n[0].replace(/^\r?\n/, "");
  var c = n[0];
  return t.forEach(function(s, l) {
    var f = c.match(/(?:^|\n)( *)$/), u = f ? f[1] : "", p = s;
    typeof s == "string" && s.includes(`
`) && (p = String(s).split(`
`).map(function(h, m) {
      return m === 0 ? h : "" + u + h;
    }).join(`
`)), c += p + n[l + 1];
  }), c;
}
a(Et, "dedent");

// src/router/utils.ts
var Rr = /\/([^/]+)\/(?:(.*)_)?([^/]+)?/, Pt = (0, ue.default)(1e3)((e) => {
  let t = {
    viewMode: void 0,
    storyId: void 0,
    refId: void 0
  };
  if (e) {
    let [, r, n, o] = e.toLowerCase().match(Rr) || [];
    r && Object.assign(t, {
      viewMode: r,
      storyId: o,
      refId: n
    });
  }
  return t;
}), ce = Symbol("Deeply equal"), je = /* @__PURE__ */ a((e, t) => {
  if (typeof e != typeof t)
    return t;
  if (Oe(e, t))
    return ce;
  if (Array.isArray(e) && Array.isArray(t)) {
    let r = t.reduce((n, o, i) => {
      let c = je(e[i], o);
      return c !== ce && (n[i] = c), n;
    }, new Array(t.length));
    return t.length >= e.length ? r : r.concat(new Array(e.length - t.length).fill(void 0));
  }
  return k(e) && k(t) ? Object.keys({ ...e, ...t }).reduce((r, n) => {
    let o = je(e?.[n], t?.[n]);
    return o === ce ? r : Object.assign(r, { [n]: o });
  }, {}) : t;
}, "deepDiff"), Rt = /^[a-zA-Z0-9 _-]*$/, Pr = /^-?[0-9]+(\.[0-9]+)?$/, wt = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i, Nt = /^(rgba?|hsla?)\(([0-9]{1,3}),\s?([0-9]{1,3})%?,\s?([0-9]{1,3})%?,?\s?([0-9](\.[0-9]{1,2})?)?\)$/i,
Ae = /* @__PURE__ */ a((e = "", t) => e === null || e === "" || !Rt.test(e) ? !1 : t == null || t instanceof Date || typeof t == "number" ||
typeof t == "boolean" ? !0 : typeof t == "string" ? Rt.test(t) || Pr.test(t) || wt.test(t) || Nt.test(t) : Array.isArray(t) ? t.every((r) => Ae(
e, r)) : k(t) ? Object.entries(t).every(([r, n]) => Ae(r, n)) : !1, "validateArgs"), De = /* @__PURE__ */ a((e) => e === void 0 ? "!undefine\
d" : e === null ? "!null" : typeof e == "string" ? wt.test(e) ? `!hex(${e.slice(1)})` : Nt.test(e) ? `!${e.replace(/[\s%]/g, "")}` : e : typeof e ==
"boolean" ? `!${e}` : e instanceof Date ? `!date(${e.toISOString()})` : Array.isArray(e) ? e.map(De) : k(e) ? Object.entries(e).reduce(
  (t, [r, n]) => Object.assign(t, { [r]: De(n) }),
  {}
) : e, "encodeSpecialValues"), wr = /* @__PURE__ */ a((e) => {
  switch (e) {
    case "%20":
      return "+";
    case "%5B":
      return "[";
    case "%5D":
      return "]";
    case "%2C":
      return ",";
    case "%3A":
      return ":";
  }
  return e;
}, "decodeKnownQueryChar"), Nr = /%[0-9A-F]{2}/g, Vn = /* @__PURE__ */ a((e, t) => {
  let r = je(e, t);
  if (!r || r === ce)
    return "";
  let n = Object.entries(r).reduce((o, [i, c]) => Ae(i, c) ? Object.assign(o, { [i]: c }) : (Er.warn(Et`
      Omitted potentially unsafe URL args.

      More info: https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url
    `), o), {});
  return (0, J.stringify)(De(n), {
    delimiter: ";",
    // we don't actually create multiple query params
    nesting: !0,
    nestingSyntax: "js"
    // encode objects using dot notation: obj.key=val
  }).replace(Nr, wr).split(";").map((o) => o.replace("=", ":")).join(";");
}, "buildArgsParam"), Sr = (0, ue.default)(1e3)((e) => e !== void 0 ? (0, J.parse)(e) : {}), St = /* @__PURE__ */ a((e) => Sr(e.search ? e.search.
slice(1) : ""), "queryFromLocation"), Bn = /* @__PURE__ */ a((e) => {
  let t = (0, J.stringify)(e);
  return t ? "?" + t : "";
}, "stringifyQuery"), _t = (0, ue.default)(1e3)((e, t, r = !0) => {
  if (r) {
    if (typeof t != "string")
      throw new Error("startsWith only works with string targets");
    return e && e.startsWith(t) ? { path: e } : null;
  }
  let n = typeof t == "string" && e === t, o = e && t && e.match(t);
  return n || o ? { path: e } : null;
});

// src/router/router.tsx
import re, { useCallback as Yr } from "react";

// ../node_modules/@storybook/global/dist/index.mjs
var jt = (() => {
  let e;
  return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
  e = self : e = {}, e;
})();

// ../node_modules/react-router-dom/index.js
import { useRef as zr, useState as Wr, useLayoutEffect as Fr, createElement as ke, forwardRef as zt, useCallback as qr, useMemo as Eo } from "react";

// ../node_modules/@babel/runtime/helpers/esm/extends.js
function Q() {
  return Q = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) ({}).hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, Q.apply(null, arguments);
}
a(Q, "_extends");

// ../node_modules/history/index.js
var B;
(function(e) {
  e.Pop = "POP", e.Push = "PUSH", e.Replace = "REPLACE";
})(B || (B = {}));
var At = function(e) {
  return Object.freeze(e);
};
function _r(e, t) {
  if (!e) {
    typeof console < "u" && console.warn(t);
    try {
      throw new Error(t);
    } catch {
    }
  }
}
a(_r, "warning");
var Dt = "beforeunload";
var jr = "popstate";
function Ct(e) {
  e === void 0 && (e = {});
  var t = e, r = t.window, n = r === void 0 ? document.defaultView : r, o = n.history;
  function i() {
    var y = n.location, E = y.pathname, w = y.search, j = y.hash, S = o.state || {};
    return [S.idx, At({
      pathname: E,
      search: w,
      hash: j,
      state: S.usr || null,
      key: S.key || "default"
    })];
  }
  a(i, "getIndexAndLocation");
  var c = null;
  function s() {
    if (c)
      m.call(c), c = null;
    else {
      var y = B.Pop, E = i(), w = E[0], j = E[1];
      if (m.length)
        if (w != null) {
          var S = u - w;
          S && (c = {
            action: y,
            location: j,
            retry: /* @__PURE__ */ a(function() {
              P(S * -1);
            }, "retry")
          }, P(S));
        } else
          _r(
            !1,
            // TODO: Write up a doc that explains our blocking strategy in
            // detail and link to it here so people can understand better what
            // is going on and how to avoid it.
            "You are trying to block a POP navigation to a location that was not created by the history library. The block will fail silentl\
y in production, but in general you should do all navigation with the history library (instead of using window.history.pushState directly) t\
o avoid this situation."
          );
      else
        b(y);
    }
  }
  a(s, "handlePop"), n.addEventListener(jr, s);
  var l = B.Pop, f = i(), u = f[0], p = f[1], h = Lt(), m = Lt();
  u == null && (u = 0, o.replaceState(Q({}, o.state, {
    idx: u
  }), ""));
  function g(y) {
    return typeof y == "string" ? y : fe(y);
  }
  a(g, "createHref");
  function d(y, E) {
    return E === void 0 && (E = null), At(Q({
      pathname: p.pathname,
      hash: "",
      search: ""
    }, typeof y == "string" ? U(y) : y, {
      state: E,
      key: Ar()
    }));
  }
  a(d, "getNextLocation");
  function v(y, E) {
    return [{
      usr: y.state,
      key: y.key,
      idx: E
    }, g(y)];
  }
  a(v, "getHistoryStateAndUrl");
  function R(y, E, w) {
    return !m.length || (m.call({
      action: y,
      location: E,
      retry: w
    }), !1);
  }
  a(R, "allowTx");
  function b(y) {
    l = y;
    var E = i();
    u = E[0], p = E[1], h.call({
      action: l,
      location: p
    });
  }
  a(b, "applyTx");
  function x(y, E) {
    var w = B.Push, j = d(y, E);
    function S() {
      x(y, E);
    }
    if (a(S, "retry"), R(w, j, S)) {
      var _ = v(j, u + 1), C = _[0], D = _[1];
      try {
        o.pushState(C, "", D);
      } catch {
        n.location.assign(D);
      }
      b(w);
    }
  }
  a(x, "push");
  function O(y, E) {
    var w = B.Replace, j = d(y, E);
    function S() {
      O(y, E);
    }
    if (a(S, "retry"), R(w, j, S)) {
      var _ = v(j, u), C = _[0], D = _[1];
      o.replaceState(C, "", D), b(w);
    }
  }
  a(O, "replace");
  function P(y) {
    o.go(y);
  }
  a(P, "go");
  var q = {
    get action() {
      return l;
    },
    get location() {
      return p;
    },
    createHref: g,
    push: x,
    replace: O,
    go: P,
    back: /* @__PURE__ */ a(function() {
      P(-1);
    }, "back"),
    forward: /* @__PURE__ */ a(function() {
      P(1);
    }, "forward"),
    listen: /* @__PURE__ */ a(function(E) {
      return h.push(E);
    }, "listen"),
    block: /* @__PURE__ */ a(function(E) {
      var w = m.push(E);
      return m.length === 1 && n.addEventListener(Dt, Tt), function() {
        w(), m.length || n.removeEventListener(Dt, Tt);
      };
    }, "block")
  };
  return q;
}
a(Ct, "createBrowserHistory");
function Tt(e) {
  e.preventDefault(), e.returnValue = "";
}
a(Tt, "promptBeforeUnload");
function Lt() {
  var e = [];
  return {
    get length() {
      return e.length;
    },
    push: /* @__PURE__ */ a(function(r) {
      return e.push(r), function() {
        e = e.filter(function(n) {
          return n !== r;
        });
      };
    }, "push"),
    call: /* @__PURE__ */ a(function(r) {
      e.forEach(function(n) {
        return n && n(r);
      });
    }, "call")
  };
}
a(Lt, "createEvents");
function Ar() {
  return Math.random().toString(36).substr(2, 8);
}
a(Ar, "createKey");
function fe(e) {
  var t = e.pathname, r = t === void 0 ? "/" : t, n = e.search, o = n === void 0 ? "" : n, i = e.hash, c = i === void 0 ? "" : i;
  return o && o !== "?" && (r += o.charAt(0) === "?" ? o : "?" + o), c && c !== "#" && (r += c.charAt(0) === "#" ? c : "#" + c), r;
}
a(fe, "createPath");
function U(e) {
  var t = {};
  if (e) {
    var r = e.indexOf("#");
    r >= 0 && (t.hash = e.substr(r), e = e.substr(0, r));
    var n = e.indexOf("?");
    n >= 0 && (t.search = e.substr(n), e = e.substr(0, n)), e && (t.pathname = e);
  }
  return t;
}
a(U, "parsePath");

// ../node_modules/react-router/index.js
import { createContext as Le, useRef as Dr, useState as Yn, useLayoutEffect as Xn, createElement as kt, useContext as $, useEffect as Tr, useMemo as Te,
useCallback as Lr, Children as Gn, isValidElement as Zn, Fragment as eo } from "react";
function pe(e, t) {
  if (!e) throw new Error(t);
}
a(pe, "invariant");
function Mt(e, t) {
  if (!e) {
    typeof console < "u" && console.warn(t);
    try {
      throw new Error(t);
    } catch {
    }
  }
}
a(Mt, "warning");
var Y = /* @__PURE__ */ Le(null);
Y.displayName = "Navigation";
var X = /* @__PURE__ */ Le(null);
X.displayName = "Location";
var he = /* @__PURE__ */ Le({
  outlet: null,
  matches: []
});
he.displayName = "Route";
function G(e) {
  let {
    basename: t = "/",
    children: r = null,
    location: n,
    navigationType: o = B.Pop,
    navigator: i,
    static: c = !1
  } = e;
  Z() && pe(!1, "You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");
  let s = Ir(t), l = Te(() => ({
    basename: s,
    navigator: i,
    static: c
  }), [s, i, c]);
  typeof n == "string" && (n = U(n));
  let {
    pathname: f = "/",
    search: u = "",
    hash: p = "",
    state: h = null,
    key: m = "default"
  } = n, g = Te(() => {
    let d = Mr(f, s);
    return d == null ? null : {
      pathname: d,
      search: u,
      hash: p,
      state: h,
      key: m
    };
  }, [s, f, u, p, h, m]);
  return Mt(g != null, '<Router basename="' + s + '"> is not able to match the URL ' + ('"' + f + u + p + '" because it does not start with \
the ') + "basename, so the <Router> won't render anything."), g == null ? null : /* @__PURE__ */ kt(Y.Provider, {
    value: l
  }, /* @__PURE__ */ kt(X.Provider, {
    children: r,
    value: {
      location: g,
      navigationType: o
    }
  }));
}
a(G, "Router");
function Ce(e) {
  Z() || pe(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useHref() may be used only in the context of a <Router> component."
  );
  let {
    basename: t,
    navigator: r
  } = $(Y), {
    hash: n,
    pathname: o,
    search: i
  } = te(e), c = o;
  if (t !== "/") {
    let s = kr(e), l = s != null && s.endsWith("/");
    c = o === "/" ? t + (l ? "/" : "") : Bt([t, o]);
  }
  return r.createHref({
    pathname: c,
    search: i,
    hash: n
  });
}
a(Ce, "useHref");
function Z() {
  return $(X) != null;
}
a(Z, "useInRouterContext");
function z() {
  return Z() || pe(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useLocation() may be used only in the context of a <Router> component."
  ), $(X).location;
}
a(z, "useLocation");
function ee() {
  Z() || pe(
    !1,
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useNavigate() may be used only in the context of a <Router> component."
  );
  let {
    basename: e,
    navigator: t
  } = $(Y), {
    matches: r
  } = $(he), {
    pathname: n
  } = z(), o = JSON.stringify(r.map((s) => s.pathnameBase)), i = Dr(!1);
  return Tr(() => {
    i.current = !0;
  }), Lr(function(s, l) {
    if (l === void 0 && (l = {}), Mt(i.current, "You should call navigate() in a React.useEffect(), not when your component is first rendere\
d."), !i.current) return;
    if (typeof s == "number") {
      t.go(s);
      return;
    }
    let f = Vt(s, JSON.parse(o), n);
    e !== "/" && (f.pathname = Bt([e, f.pathname])), (l.replace ? t.replace : t.push)(f, l.state);
  }, [e, t, o, n]);
}
a(ee, "useNavigate");
function te(e) {
  let {
    matches: t
  } = $(he), {
    pathname: r
  } = z(), n = JSON.stringify(t.map((o) => o.pathnameBase));
  return Te(() => Vt(e, JSON.parse(n), r), [e, n, r]);
}
a(te, "useResolvedPath");
function It(e, t) {
  t === void 0 && (t = "/");
  let {
    pathname: r,
    search: n = "",
    hash: o = ""
  } = typeof e == "string" ? U(e) : e;
  return {
    pathname: r ? r.startsWith("/") ? r : Cr(r, t) : t,
    search: Vr(n),
    hash: Br(o)
  };
}
a(It, "resolvePath");
function Cr(e, t) {
  let r = t.replace(/\/+$/, "").split("/");
  return e.split("/").forEach((o) => {
    o === ".." ? r.length > 1 && r.pop() : o !== "." && r.push(o);
  }), r.length > 1 ? r.join("/") : "/";
}
a(Cr, "resolvePathname");
function Vt(e, t, r) {
  let n = typeof e == "string" ? U(e) : e, o = e === "" || n.pathname === "" ? "/" : n.pathname, i;
  if (o == null)
    i = r;
  else {
    let s = t.length - 1;
    if (o.startsWith("..")) {
      let l = o.split("/");
      for (; l[0] === ".."; )
        l.shift(), s -= 1;
      n.pathname = l.join("/");
    }
    i = s >= 0 ? t[s] : "/";
  }
  let c = It(n, i);
  return o && o !== "/" && o.endsWith("/") && !c.pathname.endsWith("/") && (c.pathname += "/"), c;
}
a(Vt, "resolveTo");
function kr(e) {
  return e === "" || e.pathname === "" ? "/" : typeof e == "string" ? U(e).pathname : e.pathname;
}
a(kr, "getToPathname");
function Mr(e, t) {
  if (t === "/") return e;
  if (!e.toLowerCase().startsWith(t.toLowerCase()))
    return null;
  let r = e.charAt(t.length);
  return r && r !== "/" ? null : e.slice(t.length) || "/";
}
a(Mr, "stripBasename");
var Bt = /* @__PURE__ */ a((e) => e.join("/").replace(/\/\/+/g, "/"), "joinPaths"), Ir = /* @__PURE__ */ a((e) => e.replace(/\/+$/, "").replace(
/^\/*/, "/"), "normalizePathname"), Vr = /* @__PURE__ */ a((e) => !e || e === "?" ? "" : e.startsWith("?") ? e : "?" + e, "normalizeSearch"),
Br = /* @__PURE__ */ a((e) => !e || e === "#" ? "" : e.startsWith("#") ? e : "#" + e, "normalizeHash");

// ../node_modules/react-router-dom/index.js
function de() {
  return de = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r)
        Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
    }
    return e;
  }, de.apply(this, arguments);
}
a(de, "_extends");
function Wt(e, t) {
  if (e == null) return {};
  var r = {}, n = Object.keys(e), o, i;
  for (i = 0; i < n.length; i++)
    o = n[i], !(t.indexOf(o) >= 0) && (r[o] = e[o]);
  return r;
}
a(Wt, "_objectWithoutPropertiesLoose");
var Ur = ["onClick", "reloadDocument", "replace", "state", "target", "to"], $r = ["aria-current", "caseSensitive", "className", "end", "styl\
e", "to"];
function Ft(e) {
  let {
    basename: t,
    children: r,
    window: n
  } = e, o = zr();
  o.current == null && (o.current = Ct({
    window: n
  }));
  let i = o.current, [c, s] = Wr({
    action: i.action,
    location: i.location
  });
  return Fr(() => i.listen(s), [i]), /* @__PURE__ */ ke(G, {
    basename: t,
    children: r,
    location: c.location,
    navigationType: c.action,
    navigator: i
  });
}
a(Ft, "BrowserRouter");
function Hr(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
a(Hr, "isModifiedEvent");
var me = /* @__PURE__ */ zt(/* @__PURE__ */ a(function(t, r) {
  let {
    onClick: n,
    reloadDocument: o,
    replace: i = !1,
    state: c,
    target: s,
    to: l
  } = t, f = Wt(t, Ur), u = Ce(l), p = Jr(l, {
    replace: i,
    state: c,
    target: s
  });
  function h(m) {
    n && n(m), !m.defaultPrevented && !o && p(m);
  }
  return a(h, "handleClick"), // eslint-disable-next-line jsx-a11y/anchor-has-content
  /* @__PURE__ */ ke("a", de({}, f, {
    href: u,
    onClick: h,
    ref: r,
    target: s
  }));
}, "LinkWithRef"));
me.displayName = "Link";
var Kr = /* @__PURE__ */ zt(/* @__PURE__ */ a(function(t, r) {
  let {
    "aria-current": n = "page",
    caseSensitive: o = !1,
    className: i = "",
    end: c = !1,
    style: s,
    to: l
  } = t, f = Wt(t, $r), u = z(), p = te(l), h = u.pathname, m = p.pathname;
  o || (h = h.toLowerCase(), m = m.toLowerCase());
  let g = h === m || !c && h.startsWith(m) && h.charAt(m.length) === "/", d = g ? n : void 0, v;
  typeof i == "function" ? v = i({
    isActive: g
  }) : v = [i, g ? "active" : null].filter(Boolean).join(" ");
  let R = typeof s == "function" ? s({
    isActive: g
  }) : s;
  return /* @__PURE__ */ ke(me, de({}, f, {
    "aria-current": d,
    className: v,
    ref: r,
    style: R,
    to: l
  }));
}, "NavLinkWithRef"));
Kr.displayName = "NavLink";
function Jr(e, t) {
  let {
    target: r,
    replace: n,
    state: o
  } = t === void 0 ? {} : t, i = ee(), c = z(), s = te(e);
  return qr((l) => {
    if (l.button === 0 && // Ignore everything but left clicks
    (!r || r === "_self") && // Let browser handle "target=_blank" etc.
    !Hr(l)) {
      l.preventDefault();
      let f = !!n || fe(c) === fe(s);
      i(e, {
        replace: f,
        state: o
      });
    }
  }, [c, i, s, n, o, r, e]);
}
a(Jr, "useLinkClickHandler");

// src/router/router.tsx
var { document: Me } = jt, Xr = /* @__PURE__ */ a(() => `${Me.location.pathname}?`, "getBase"), Ao = /* @__PURE__ */ a(() => {
  let e = ee();
  return Yr((t, { plain: r, ...n } = {}) => {
    if (typeof t == "string" && t.startsWith("#")) {
      t === "#" ? e(Me.location.search) : Me.location.hash = t;
      return;
    }
    if (typeof t == "string") {
      let o = r ? t : `?path=${t}`;
      return e(o, n);
    }
    if (typeof t == "number")
      return e(t);
  }, []);
}, "useNavigate"), Gr = /* @__PURE__ */ a(({ to: e, children: t, ...r }) => /* @__PURE__ */ re.createElement(me, { to: `${Xr()}path=${e}`, ...r },
t), "Link");
Gr.displayName = "QueryLink";
var qt = /* @__PURE__ */ a(({ children: e }) => {
  let t = z(), { path: r, singleStory: n } = St(t), { viewMode: o, storyId: i, refId: c } = Pt(r);
  return /* @__PURE__ */ re.createElement(re.Fragment, null, e({
    path: r || "/",
    location: t,
    viewMode: o,
    storyId: i,
    refId: c,
    singleStory: n === "true"
  }));
}, "Location");
qt.displayName = "QueryLocation";
function Ut({
  children: e,
  path: t,
  startsWith: r = !1
}) {
  return /* @__PURE__ */ re.createElement(qt, null, ({ path: n, ...o }) => e({
    match: _t(n, t, r),
    ...o
  }));
}
a(Ut, "Match");
Ut.displayName = "QueryMatch";
function Zr(e) {
  let { children: t, ...r } = e;
  return r.startsWith === void 0 && (r.startsWith = !1), /* @__PURE__ */ re.createElement(Ut, { ...r }, ({ match: o }) => o ? t : null);
}
a(Zr, "Route");
Zr.displayName = "Route";
var Do = /* @__PURE__ */ a((...e) => Ft(...e), "LocationProvider"), To = /* @__PURE__ */ a((...e) => G(...e), "BaseLocationProvider");
export {
  To as BaseLocationProvider,
  ce as DEEPLY_EQUAL,
  Gr as Link,
  qt as Location,
  Do as LocationProvider,
  Ut as Match,
  Zr as Route,
  Vn as buildArgsParam,
  je as deepDiff,
  _t as getMatch,
  Pt as parsePath,
  St as queryFromLocation,
  Bn as stringifyQuery,
  Ao as useNavigate
};
