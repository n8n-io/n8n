"use strict";
var Mr = Object.create;
var je = Object.defineProperty;
var kr = Object.getOwnPropertyDescriptor;
var Ir = Object.getOwnPropertyNames;
var Dr = Object.getPrototypeOf, Br = Object.prototype.hasOwnProperty;
var r = (e, t) => je(e, "name", { value: t, configurable: !0 });
var ne = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), Wr = (e, t) => {
  for (var a in t)
    je(e, a, { get: t[a], enumerable: !0 });
}, ht = (e, t, a, n) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let s of Ir(t))
      !Br.call(e, s) && s !== a && je(e, s, { get: () => t[s], enumerable: !(n = kr(t, s)) || n.enumerable });
  return e;
};
var we = (e, t, a) => (a = e != null ? Mr(Dr(e)) : {}, ht(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !e || !e.__esModule ? je(a, "default", { value: e, enumerable: !0 }) : a,
  e
)), Hr = (e) => ht(je({}, "__esModule", { value: !0 }), e);

// ../node_modules/map-or-similar/src/similar.js
var Bt = ne((Gn, Dt) => {
  function be() {
    return this.list = [], this.lastItem = void 0, this.size = 0, this;
  }
  r(be, "Similar");
  be.prototype.get = function(e) {
    var t;
    if (this.lastItem && this.isEqual(this.lastItem.key, e))
      return this.lastItem.val;
    if (t = this.indexOf(e), t >= 0)
      return this.lastItem = this.list[t], this.list[t].val;
  };
  be.prototype.set = function(e, t) {
    var a;
    return this.lastItem && this.isEqual(this.lastItem.key, e) ? (this.lastItem.val = t, this) : (a = this.indexOf(e), a >= 0 ? (this.lastItem =
    this.list[a], this.list[a].val = t, this) : (this.lastItem = { key: e, val: t }, this.list.push(this.lastItem), this.size++, this));
  };
  be.prototype.delete = function(e) {
    var t;
    if (this.lastItem && this.isEqual(this.lastItem.key, e) && (this.lastItem = void 0), t = this.indexOf(e), t >= 0)
      return this.size--, this.list.splice(t, 1)[0];
  };
  be.prototype.has = function(e) {
    var t;
    return this.lastItem && this.isEqual(this.lastItem.key, e) ? !0 : (t = this.indexOf(e), t >= 0 ? (this.lastItem = this.list[t], !0) : !1);
  };
  be.prototype.forEach = function(e, t) {
    var a;
    for (a = 0; a < this.size; a++)
      e.call(t || this, this.list[a].val, this.list[a].key, this);
  };
  be.prototype.indexOf = function(e) {
    var t;
    for (t = 0; t < this.size; t++)
      if (this.isEqual(this.list[t].key, e))
        return t;
    return -1;
  };
  be.prototype.isEqual = function(e, t) {
    return e === t || e !== e && t !== t;
  };
  Dt.exports = be;
});

// ../node_modules/map-or-similar/src/map-or-similar.js
var Ht = ne((ea, Wt) => {
  Wt.exports = function(e) {
    if (typeof Map != "function" || e) {
      var t = Bt();
      return new t();
    } else
      return /* @__PURE__ */ new Map();
  };
});

// ../node_modules/memoizerific/src/memoizerific.js
var zt = ne((ta, $t) => {
  var Ft = Ht();
  $t.exports = function(e) {
    var t = new Ft(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), a = [];
    return function(n) {
      var s = /* @__PURE__ */ r(function() {
        var v = t, z, D, U = arguments.length - 1, J = Array(U + 1), F = !0, x;
        if ((s.numArgs || s.numArgs === 0) && s.numArgs !== U + 1)
          throw new Error("Memoizerific functions should always be called with the same number of arguments");
        for (x = 0; x < U; x++) {
          if (J[x] = {
            cacheItem: v,
            arg: arguments[x]
          }, v.has(arguments[x])) {
            v = v.get(arguments[x]);
            continue;
          }
          F = !1, z = new Ft(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), v.set(arguments[x], z), v = z;
        }
        return F && (v.has(arguments[U]) ? D = v.get(arguments[U]) : F = !1), F || (D = n.apply(null, arguments), v.set(arguments[U], D)), e >
        0 && (J[U] = {
          cacheItem: v,
          arg: arguments[U]
        }, F ? Fr(a, J) : a.push(J), a.length > e && $r(a.shift())), s.wasMemoized = F, s.numArgs = U + 1, D;
      }, "memoizerific");
      return s.limit = e, s.wasMemoized = !1, s.cache = t, s.lru = a, s;
    };
  };
  function Fr(e, t) {
    var a = e.length, n = t.length, s, v, z;
    for (v = 0; v < a; v++) {
      for (s = !0, z = 0; z < n; z++)
        if (!zr(e[v][z].arg, t[z].arg)) {
          s = !1;
          break;
        }
      if (s)
        break;
    }
    e.push(e.splice(v, 1)[0]);
  }
  r(Fr, "moveToMostRecentLru");
  function $r(e) {
    var t = e.length, a = e[t - 1], n, s;
    for (a.cacheItem.delete(a.arg), s = t - 2; s >= 0 && (a = e[s], n = a.cacheItem.get(a.arg), !n || !n.size); s--)
      a.cacheItem.delete(a.arg);
  }
  r($r, "removeCachedResult");
  function zr(e, t) {
    return e === t || e !== e && t !== t;
  }
  r(zr, "isEqual");
});

// ../node_modules/picoquery/lib/string-util.js
var Je = ne((Ke) => {
  "use strict";
  Object.defineProperty(Ke, "__esModule", { value: !0 });
  Ke.encodeString = Ur;
  var he = Array.from({ length: 256 }, (e, t) => "%" + ((t < 16 ? "0" : "") + t.toString(16)).toUpperCase()), qr = new Int8Array([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
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
  function Ur(e) {
    let t = e.length;
    if (t === 0)
      return "";
    let a = "", n = 0, s = 0;
    e: for (; s < t; s++) {
      let v = e.charCodeAt(s);
      for (; v < 128; ) {
        if (qr[v] !== 1 && (n < s && (a += e.slice(n, s)), n = s + 1, a += he[v]), ++s === t)
          break e;
        v = e.charCodeAt(s);
      }
      if (n < s && (a += e.slice(n, s)), v < 2048) {
        n = s + 1, a += he[192 | v >> 6] + he[128 | v & 63];
        continue;
      }
      if (v < 55296 || v >= 57344) {
        n = s + 1, a += he[224 | v >> 12] + he[128 | v >> 6 & 63] + he[128 | v & 63];
        continue;
      }
      if (++s, s >= t)
        throw new Error("URI malformed");
      let z = e.charCodeAt(s) & 1023;
      n = s + 1, v = 65536 + ((v & 1023) << 10 | z), a += he[240 | v >> 18] + he[128 | v >> 12 & 63] + he[128 | v >> 6 & 63] + he[128 | v & 63];
    }
    return n === 0 ? e : n < t ? a + e.slice(n) : a;
  }
  r(Ur, "encodeString");
});

// ../node_modules/picoquery/lib/shared.js
var _e = ne((pe) => {
  "use strict";
  Object.defineProperty(pe, "__esModule", { value: !0 });
  pe.defaultOptions = pe.defaultShouldSerializeObject = pe.defaultValueSerializer = void 0;
  var Qe = Je(), Vr = /* @__PURE__ */ r((e) => {
    switch (typeof e) {
      case "string":
        return (0, Qe.encodeString)(e);
      case "bigint":
      case "boolean":
        return "" + e;
      case "number":
        if (Number.isFinite(e))
          return e < 1e21 ? "" + e : (0, Qe.encodeString)("" + e);
        break;
    }
    return e instanceof Date ? (0, Qe.encodeString)(e.toISOString()) : "";
  }, "defaultValueSerializer");
  pe.defaultValueSerializer = Vr;
  var Kr = /* @__PURE__ */ r((e) => e instanceof Date, "defaultShouldSerializeObject");
  pe.defaultShouldSerializeObject = Kr;
  var qt = /* @__PURE__ */ r((e) => e, "identityFunc");
  pe.defaultOptions = {
    nesting: !0,
    nestingSyntax: "dot",
    arrayRepeat: !1,
    arrayRepeatSyntax: "repeat",
    delimiter: 38,
    valueDeserializer: qt,
    valueSerializer: pe.defaultValueSerializer,
    keyDeserializer: qt,
    shouldSerializeObject: pe.defaultShouldSerializeObject
  };
});

// ../node_modules/picoquery/lib/object-util.js
var Ye = ne((Ne) => {
  "use strict";
  Object.defineProperty(Ne, "__esModule", { value: !0 });
  Ne.getDeepObject = Yr;
  Ne.stringifyObject = Ut;
  var Pe = _e(), Jr = Je();
  function Qr(e) {
    return e === "__proto__" || e === "constructor" || e === "prototype";
  }
  r(Qr, "isPrototypeKey");
  function Yr(e, t, a, n, s) {
    if (Qr(t))
      return e;
    let v = e[t];
    return typeof v == "object" && v !== null ? v : !n && (s || typeof a == "number" || typeof a == "string" && a * 0 === 0 && a.indexOf(".") ===
    -1) ? e[t] = [] : e[t] = {};
  }
  r(Yr, "getDeepObject");
  var Xr = 20, Gr = "[]", Zr = "[", en = "]", tn = ".";
  function Ut(e, t, a = 0, n, s) {
    let { nestingSyntax: v = Pe.defaultOptions.nestingSyntax, arrayRepeat: z = Pe.defaultOptions.arrayRepeat, arrayRepeatSyntax: D = Pe.defaultOptions.
    arrayRepeatSyntax, nesting: U = Pe.defaultOptions.nesting, delimiter: J = Pe.defaultOptions.delimiter, valueSerializer: F = Pe.defaultOptions.
    valueSerializer, shouldSerializeObject: x = Pe.defaultOptions.shouldSerializeObject } = t, O = typeof J == "number" ? String.fromCharCode(
    J) : J, w = s === !0 && z, E = v === "dot" || v === "js" && !s;
    if (a > Xr)
      return "";
    let N = "", u = !0, i = !1;
    for (let h in e) {
      let c = e[h], y;
      n ? (y = n, w ? D === "bracket" && (y += Gr) : E ? (y += tn, y += h) : (y += Zr, y += h, y += en)) : y = h, u || (N += O), typeof c ==
      "object" && c !== null && !x(c) ? (i = c.pop !== void 0, (U || z && i) && (N += Ut(c, t, a + 1, y, i))) : (N += (0, Jr.encodeString)(y),
      N += "=", N += F(c, h)), u && (u = !1);
    }
    return N;
  }
  r(Ut, "stringifyObject");
});

// ../node_modules/fast-decode-uri-component/index.js
var Qt = ne((la, Jt) => {
  "use strict";
  var Vt = 12, rn = 0, Xe = [
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
  function nn(e) {
    var t = e.indexOf("%");
    if (t === -1) return e;
    for (var a = e.length, n = "", s = 0, v = 0, z = t, D = Vt; t > -1 && t < a; ) {
      var U = Kt(e[t + 1], 4), J = Kt(e[t + 2], 0), F = U | J, x = Xe[F];
      if (D = Xe[256 + D + x], v = v << 6 | F & Xe[364 + x], D === Vt)
        n += e.slice(s, z), n += v <= 65535 ? String.fromCharCode(v) : String.fromCharCode(
          55232 + (v >> 10),
          56320 + (v & 1023)
        ), v = 0, s = t + 3, t = z = e.indexOf("%", s);
      else {
        if (D === rn)
          return null;
        if (t += 3, t < a && e.charCodeAt(t) === 37) continue;
        return null;
      }
    }
    return n + e.slice(s);
  }
  r(nn, "decodeURIComponent");
  var an = {
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
  function Kt(e, t) {
    var a = an[e];
    return a === void 0 ? 255 : a << t;
  }
  r(Kt, "hexCodeToInt");
  Jt.exports = nn;
});

// ../node_modules/picoquery/lib/parse.js
var Zt = ne((ye) => {
  "use strict";
  var on = ye && ye.__importDefault || function(e) {
    return e && e.__esModule ? e : { default: e };
  };
  Object.defineProperty(ye, "__esModule", { value: !0 });
  ye.numberValueDeserializer = ye.numberKeyDeserializer = void 0;
  ye.parse = ln;
  var Le = Ye(), Oe = _e(), Yt = on(Qt()), sn = /* @__PURE__ */ r((e) => {
    let t = Number(e);
    return Number.isNaN(t) ? e : t;
  }, "numberKeyDeserializer");
  ye.numberKeyDeserializer = sn;
  var un = /* @__PURE__ */ r((e) => {
    let t = Number(e);
    return Number.isNaN(t) ? e : t;
  }, "numberValueDeserializer");
  ye.numberValueDeserializer = un;
  var Xt = /\+/g, Gt = /* @__PURE__ */ r(function() {
  }, "Empty");
  Gt.prototype = /* @__PURE__ */ Object.create(null);
  function Te(e, t, a, n, s) {
    let v = e.substring(t, a);
    return n && (v = v.replace(Xt, " ")), s && (v = (0, Yt.default)(v) || v), v;
  }
  r(Te, "computeKeySlice");
  function ln(e, t) {
    let { valueDeserializer: a = Oe.defaultOptions.valueDeserializer, keyDeserializer: n = Oe.defaultOptions.keyDeserializer, arrayRepeatSyntax: s = Oe.
    defaultOptions.arrayRepeatSyntax, nesting: v = Oe.defaultOptions.nesting, arrayRepeat: z = Oe.defaultOptions.arrayRepeat, nestingSyntax: D = Oe.
    defaultOptions.nestingSyntax, delimiter: U = Oe.defaultOptions.delimiter } = t ?? {}, J = typeof U == "string" ? U.charCodeAt(0) : U, F = D ===
    "js", x = new Gt();
    if (typeof e != "string")
      return x;
    let O = e.length, w = "", E = -1, N = -1, u = -1, i = x, h, c = "", y = "", S = !1, _ = !1, I = !1, W = !1, Y = !1, L = !1, V = !1, $ = 0,
    j = -1, P = -1, H = -1;
    for (let o = 0; o < O + 1; o++) {
      if ($ = o !== O ? e.charCodeAt(o) : J, $ === J) {
        if (V = N > E, V || (N = o), u !== N - 1 && (y = Te(e, u + 1, j > -1 ? j : N, I, S), c = n(y), h !== void 0 && (i = (0, Le.getDeepObject)(
        i, h, c, F && Y, F && L))), V || c !== "") {
          V && (w = e.slice(N + 1, o), W && (w = w.replace(Xt, " ")), _ && (w = (0, Yt.default)(w) || w));
          let l = a(w, c);
          if (z) {
            let g = i[c];
            g === void 0 ? j > -1 ? i[c] = [l] : i[c] = l : g.pop ? g.push(l) : i[c] = [g, l];
          } else
            i[c] = l;
        }
        w = "", E = o, N = o, S = !1, _ = !1, I = !1, W = !1, Y = !1, L = !1, j = -1, u = o, i = x, h = void 0, c = "";
      } else $ === 93 ? (z && s === "bracket" && H === 91 && (j = P), v && (D === "index" || F) && N <= E && (u !== P && (y = Te(e, u + 1, o,
      I, S), c = n(y), h !== void 0 && (i = (0, Le.getDeepObject)(i, h, c, void 0, F)), h = c, I = !1, S = !1), u = o, L = !0, Y = !1)) : $ ===
      46 ? v && (D === "dot" || F) && N <= E && (u !== P && (y = Te(e, u + 1, o, I, S), c = n(y), h !== void 0 && (i = (0, Le.getDeepObject)(
      i, h, c, F)), h = c, I = !1, S = !1), Y = !0, L = !1, u = o) : $ === 91 ? v && (D === "index" || F) && N <= E && (u !== P && (y = Te(e,
      u + 1, o, I, S), c = n(y), F && h !== void 0 && (i = (0, Le.getDeepObject)(i, h, c, F)), h = c, I = !1, S = !1, Y = !1, L = !0), u = o) :
      $ === 61 ? N <= E ? N = o : _ = !0 : $ === 43 ? N > E ? W = !0 : I = !0 : $ === 37 && (N > E ? _ = !0 : S = !0);
      P = o, H = $;
    }
    return x;
  }
  r(ln, "parse");
});

// ../node_modules/picoquery/lib/stringify.js
var er = ne((Ge) => {
  "use strict";
  Object.defineProperty(Ge, "__esModule", { value: !0 });
  Ge.stringify = fn;
  var cn = Ye();
  function fn(e, t) {
    if (e === null || typeof e != "object")
      return "";
    let a = t ?? {};
    return (0, cn.stringifyObject)(e, a);
  }
  r(fn, "stringify");
});

// ../node_modules/picoquery/lib/main.js
var tr = ne((fe) => {
  "use strict";
  var hn = fe && fe.__createBinding || (Object.create ? function(e, t, a, n) {
    n === void 0 && (n = a);
    var s = Object.getOwnPropertyDescriptor(t, a);
    (!s || ("get" in s ? !t.__esModule : s.writable || s.configurable)) && (s = { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return t[a];
    }, "get") }), Object.defineProperty(e, n, s);
  } : function(e, t, a, n) {
    n === void 0 && (n = a), e[n] = t[a];
  }), pn = fe && fe.__exportStar || function(e, t) {
    for (var a in e) a !== "default" && !Object.prototype.hasOwnProperty.call(t, a) && hn(t, e, a);
  };
  Object.defineProperty(fe, "__esModule", { value: !0 });
  fe.stringify = fe.parse = void 0;
  var dn = Zt();
  Object.defineProperty(fe, "parse", { enumerable: !0, get: /* @__PURE__ */ r(function() {
    return dn.parse;
  }, "get") });
  var mn = er();
  Object.defineProperty(fe, "stringify", { enumerable: !0, get: /* @__PURE__ */ r(function() {
    return mn.stringify;
  }, "get") });
  pn(_e(), fe);
});

// ../node_modules/ts-dedent/dist/index.js
var nr = ne((Se) => {
  "use strict";
  Object.defineProperty(Se, "__esModule", { value: !0 });
  Se.dedent = void 0;
  function rr(e) {
    for (var t = [], a = 1; a < arguments.length; a++)
      t[a - 1] = arguments[a];
    var n = Array.from(typeof e == "string" ? [e] : e);
    n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var s = n.reduce(function(D, U) {
      var J = U.match(/\n([\t ]+|(?!\s).)/g);
      return J ? D.concat(J.map(function(F) {
        var x, O;
        return (O = (x = F.match(/[\t ]/g)) === null || x === void 0 ? void 0 : x.length) !== null && O !== void 0 ? O : 0;
      })) : D;
    }, []);
    if (s.length) {
      var v = new RegExp(`
[	 ]{` + Math.min.apply(Math, s) + "}", "g");
      n = n.map(function(D) {
        return D.replace(v, `
`);
      });
    }
    n[0] = n[0].replace(/^\r?\n/, "");
    var z = n[0];
    return t.forEach(function(D, U) {
      var J = z.match(/(?:^|\n)( *)$/), F = J ? J[1] : "", x = D;
      typeof D == "string" && D.includes(`
`) && (x = String(D).split(`
`).map(function(O, w) {
        return w === 0 ? O : "" + F + O;
      }).join(`
`)), z += x + n[U + 1];
    }), z;
  }
  r(rr, "dedent");
  Se.dedent = rr;
  Se.default = rr;
});

// ../node_modules/@storybook/global/dist/index.js
var fr = ne((Oa, cr) => {
  "use strict";
  var at = Object.defineProperty, wn = Object.getOwnPropertyDescriptor, jn = Object.getOwnPropertyNames, Sn = Object.prototype.hasOwnProperty,
  Rn = /* @__PURE__ */ r((e, t) => {
    for (var a in t)
      at(e, a, { get: t[a], enumerable: !0 });
  }, "__export"), An = /* @__PURE__ */ r((e, t, a, n) => {
    if (t && typeof t == "object" || typeof t == "function")
      for (let s of jn(t))
        !Sn.call(e, s) && s !== a && at(e, s, { get: /* @__PURE__ */ r(() => t[s], "get"), enumerable: !(n = wn(t, s)) || n.enumerable });
    return e;
  }, "__copyProps"), En = /* @__PURE__ */ r((e) => An(at({}, "__esModule", { value: !0 }), e), "__toCommonJS"), lr = {};
  Rn(lr, {
    global: /* @__PURE__ */ r(() => Cn, "global")
  });
  cr.exports = En(lr);
  var Cn = (() => {
    let e;
    return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
    e = self : e = {}, e;
  })();
});

// ../node_modules/history/umd/history.production.min.js
var pr = ne((Ie, hr) => {
  (function(e, t) {
    typeof Ie == "object" && typeof hr < "u" ? t(Ie) : typeof define == "function" && define.amd ? define(["exports"], t) : t((e = typeof globalThis <
    "u" ? globalThis : e || self).HistoryLibrary = {});
  })(Ie, function(e) {
    "use strict";
    function t() {
      return (t = Object.assign || function(x) {
        for (var O = 1; O < arguments.length; O++) {
          var w = arguments[O];
          for (var E in w) Object.prototype.hasOwnProperty.call(w, E) && (x[E] = w[E]);
        }
        return x;
      }).apply(this, arguments);
    }
    r(t, "n");
    var a;
    e.Action = void 0, (a = e.Action || (e.Action = {})).Pop = "POP", a.Push = "PUSH", a.Replace = "REPLACE";
    var n = "beforeunload", s = "popstate";
    function v(x, O, w) {
      return Math.min(Math.max(x, O), w);
    }
    r(v, "a");
    function z(x) {
      x.preventDefault(), x.returnValue = "";
    }
    r(z, "i");
    function D() {
      var x = [];
      return { get length() {
        return x.length;
      }, push: /* @__PURE__ */ r(function(O) {
        return x.push(O), function() {
          x = x.filter(function(w) {
            return w !== O;
          });
        };
      }, "push"), call: /* @__PURE__ */ r(function(O) {
        x.forEach(function(w) {
          return w && w(O);
        });
      }, "call") };
    }
    r(D, "c");
    function U() {
      return Math.random().toString(36).substr(2, 8);
    }
    r(U, "u");
    function J(x) {
      var O = x.pathname, w = O === void 0 ? "/" : O, E = x.search, N = E === void 0 ? "" : E, u = x.hash, i = u === void 0 ? "" : u;
      return N && N !== "?" && (w += N.charAt(0) === "?" ? N : "?" + N), i && i !== "#" && (w += i.charAt(0) === "#" ? i : "#" + i), w;
    }
    r(J, "l");
    function F(x) {
      var O = {};
      if (x) {
        var w = x.indexOf("#");
        w >= 0 && (O.hash = x.substr(w), x = x.substr(0, w));
        var E = x.indexOf("?");
        E >= 0 && (O.search = x.substr(E), x = x.substr(0, E)), x && (O.pathname = x);
      }
      return O;
    }
    r(F, "f"), e.createBrowserHistory = function(x) {
      x === void 0 && (x = {});
      var O = x.window, w = O === void 0 ? document.defaultView : O, E = w.history;
      function N() {
        var j = w.location, P = j.pathname, H = j.search, o = j.hash, l = E.state || {};
        return [l.idx, { pathname: P, search: H, hash: o, state: l.usr || null, key: l.key || "default" }];
      }
      r(N, "p");
      var u = null;
      w.addEventListener(s, function() {
        if (u) _.call(u), u = null;
        else {
          var j = e.Action.Pop, P = N(), H = P[0], o = P[1];
          if (_.length) {
            if (H != null) {
              var l = c - H;
              l && (u = { action: j, location: o, retry: /* @__PURE__ */ r(function() {
                $(-1 * l);
              }, "retry") }, $(l));
            }
          } else V(j);
        }
      });
      var i = e.Action.Pop, h = N(), c = h[0], y = h[1], S = D(), _ = D();
      function I(j) {
        return typeof j == "string" ? j : J(j);
      }
      r(I, "P");
      function W(j, P) {
        return P === void 0 && (P = null), t({ pathname: y.pathname, hash: "", search: "" }, typeof j == "string" ? F(j) : j, { state: P, key: U() });
      }
      r(W, "k");
      function Y(j, P) {
        return [{ usr: j.state, key: j.key, idx: P }, I(j)];
      }
      r(Y, "x");
      function L(j, P, H) {
        return !_.length || (_.call({ action: j, location: P, retry: H }), !1);
      }
      r(L, "w");
      function V(j) {
        i = j;
        var P = N();
        c = P[0], y = P[1], S.call({ action: i, location: y });
      }
      r(V, "E");
      function $(j) {
        E.go(j);
      }
      return r($, "H"), c == null && (c = 0, E.replaceState(t({}, E.state, { idx: c }), "")), { get action() {
        return i;
      }, get location() {
        return y;
      }, createHref: I, push: /* @__PURE__ */ r(function j(P, H) {
        var o = e.Action.Push, l = W(P, H);
        if (L(o, l, function() {
          j(P, H);
        })) {
          var g = Y(l, c + 1), d = g[0], m = g[1];
          try {
            E.pushState(d, "", m);
          } catch {
            w.location.assign(m);
          }
          V(o);
        }
      }, "n"), replace: /* @__PURE__ */ r(function j(P, H) {
        var o = e.Action.Replace, l = W(P, H);
        if (L(o, l, function() {
          j(P, H);
        })) {
          var g = Y(l, c), d = g[0], m = g[1];
          E.replaceState(d, "", m), V(o);
        }
      }, "n"), go: $, back: /* @__PURE__ */ r(function() {
        $(-1);
      }, "back"), forward: /* @__PURE__ */ r(function() {
        $(1);
      }, "forward"), listen: /* @__PURE__ */ r(function(j) {
        return S.push(j);
      }, "listen"), block: /* @__PURE__ */ r(function(j) {
        var P = _.push(j);
        return _.length === 1 && w.addEventListener(n, z), function() {
          P(), _.length || w.removeEventListener(n, z);
        };
      }, "block") };
    }, e.createHashHistory = function(x) {
      x === void 0 && (x = {});
      var O = x.window, w = O === void 0 ? document.defaultView : O, E = w.history;
      function N() {
        var P = F(w.location.hash.substr(1)), H = P.pathname, o = H === void 0 ? "/" : H, l = P.search, g = l === void 0 ? "" : l, d = P.hash,
        m = d === void 0 ? "" : d, M = E.state || {};
        return [M.idx, { pathname: o, search: g, hash: m, state: M.usr || null, key: M.key || "default" }];
      }
      r(N, "p");
      var u = null;
      function i() {
        if (u) I.call(u), u = null;
        else {
          var P = e.Action.Pop, H = N(), o = H[0], l = H[1];
          if (I.length) {
            if (o != null) {
              var g = y - o;
              g && (u = { action: P, location: l, retry: /* @__PURE__ */ r(function() {
                j(-1 * g);
              }, "retry") }, j(g));
            }
          } else $(P);
        }
      }
      r(i, "d"), w.addEventListener(s, i), w.addEventListener("hashchange", function() {
        J(N()[1]) !== J(S) && i();
      });
      var h = e.Action.Pop, c = N(), y = c[0], S = c[1], _ = D(), I = D();
      function W(P) {
        return function() {
          var H = document.querySelector("base"), o = "";
          if (H && H.getAttribute("href")) {
            var l = w.location.href, g = l.indexOf("#");
            o = g === -1 ? l : l.slice(0, g);
          }
          return o;
        }() + "#" + (typeof P == "string" ? P : J(P));
      }
      r(W, "k");
      function Y(P, H) {
        return H === void 0 && (H = null), t({ pathname: S.pathname, hash: "", search: "" }, typeof P == "string" ? F(P) : P, { state: H, key: U() });
      }
      r(Y, "x");
      function L(P, H) {
        return [{ usr: P.state, key: P.key, idx: H }, W(P)];
      }
      r(L, "w");
      function V(P, H, o) {
        return !I.length || (I.call({ action: P, location: H, retry: o }), !1);
      }
      r(V, "E");
      function $(P) {
        h = P;
        var H = N();
        y = H[0], S = H[1], _.call({ action: h, location: S });
      }
      r($, "H");
      function j(P) {
        E.go(P);
      }
      return r(j, "L"), y == null && (y = 0, E.replaceState(t({}, E.state, { idx: y }), "")), { get action() {
        return h;
      }, get location() {
        return S;
      }, createHref: W, push: /* @__PURE__ */ r(function P(H, o) {
        var l = e.Action.Push, g = Y(H, o);
        if (V(l, g, function() {
          P(H, o);
        })) {
          var d = L(g, y + 1), m = d[0], M = d[1];
          try {
            E.pushState(m, "", M);
          } catch {
            w.location.assign(M);
          }
          $(l);
        }
      }, "n"), replace: /* @__PURE__ */ r(function P(H, o) {
        var l = e.Action.Replace, g = Y(H, o);
        if (V(l, g, function() {
          P(H, o);
        })) {
          var d = L(g, y), m = d[0], M = d[1];
          E.replaceState(m, "", M), $(l);
        }
      }, "n"), go: j, back: /* @__PURE__ */ r(function() {
        j(-1);
      }, "back"), forward: /* @__PURE__ */ r(function() {
        j(1);
      }, "forward"), listen: /* @__PURE__ */ r(function(P) {
        return _.push(P);
      }, "listen"), block: /* @__PURE__ */ r(function(P) {
        var H = I.push(P);
        return I.length === 1 && w.addEventListener(n, z), function() {
          H(), I.length || w.removeEventListener(n, z);
        };
      }, "block") };
    }, e.createMemoryHistory = function(x) {
      x === void 0 && (x = {});
      var O = x, w = O.initialEntries, E = w === void 0 ? ["/"] : w, N = O.initialIndex, u = E.map(function(L) {
        return t({ pathname: "/", search: "", hash: "", state: null, key: U() }, typeof L == "string" ? F(L) : L);
      }), i = v(N ?? u.length - 1, 0, u.length - 1), h = e.Action.Pop, c = u[i], y = D(), S = D();
      function _(L, V) {
        return V === void 0 && (V = null), t({ pathname: c.pathname, search: "", hash: "" }, typeof L == "string" ? F(L) : L, { state: V, key: U() });
      }
      r(_, "m");
      function I(L, V, $) {
        return !S.length || (S.call({ action: L, location: V, retry: $ }), !1);
      }
      r(I, "b");
      function W(L, V) {
        h = L, c = V, y.call({ action: h, location: c });
      }
      r(W, "A");
      function Y(L) {
        var V = v(i + L, 0, u.length - 1), $ = e.Action.Pop, j = u[V];
        I($, j, function() {
          Y(L);
        }) && (i = V, W($, j));
      }
      return r(Y, "P"), { get index() {
        return i;
      }, get action() {
        return h;
      }, get location() {
        return c;
      }, createHref: /* @__PURE__ */ r(function(L) {
        return typeof L == "string" ? L : J(L);
      }, "createHref"), push: /* @__PURE__ */ r(function L(V, $) {
        var j = e.Action.Push, P = _(V, $);
        I(j, P, function() {
          L(V, $);
        }) && (i += 1, u.splice(i, u.length, P), W(j, P));
      }, "n"), replace: /* @__PURE__ */ r(function L(V, $) {
        var j = e.Action.Replace, P = _(V, $);
        I(j, P, function() {
          L(V, $);
        }) && (u[i] = P, W(j, P));
      }, "n"), go: Y, back: /* @__PURE__ */ r(function() {
        Y(-1);
      }, "back"), forward: /* @__PURE__ */ r(function() {
        Y(1);
      }, "forward"), listen: /* @__PURE__ */ r(function(L) {
        return y.push(L);
      }, "listen"), block: /* @__PURE__ */ r(function(L) {
        return S.push(L);
      }, "block") };
    }, e.createPath = J, e.parsePath = F, Object.defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/history/umd/history.development.js
var mr = ne((De, dr) => {
  (function(e, t) {
    typeof De == "object" && typeof dr < "u" ? t(De) : typeof define == "function" && define.amd ? define(["exports"], t) : (e = typeof globalThis <
    "u" ? globalThis : e || self, t(e.HistoryLibrary = {}));
  })(De, function(e) {
    "use strict";
    function t() {
      return t = Object.assign || function(u) {
        for (var i = 1; i < arguments.length; i++) {
          var h = arguments[i];
          for (var c in h)
            Object.prototype.hasOwnProperty.call(h, c) && (u[c] = h[c]);
        }
        return u;
      }, t.apply(this, arguments);
    }
    r(t, "_extends"), e.Action = void 0, function(u) {
      u.Pop = "POP", u.Push = "PUSH", u.Replace = "REPLACE";
    }(e.Action || (e.Action = {}));
    var a = /* @__PURE__ */ r(function(u) {
      return Object.freeze(u);
    }, "readOnly");
    function n(u, i) {
      if (!u) {
        typeof console < "u" && console.warn(i);
        try {
          throw new Error(i);
        } catch {
        }
      }
    }
    r(n, "warning");
    var s = "beforeunload", v = "hashchange", z = "popstate";
    function D(u) {
      u === void 0 && (u = {});
      var i = u, h = i.window, c = h === void 0 ? document.defaultView : h, y = c.history;
      function S() {
        var C = c.location, p = C.pathname, R = C.search, K = C.hash, q = y.state || {};
        return [q.idx, a({
          pathname: p,
          search: R,
          hash: K,
          state: q.usr || null,
          key: q.key || "default"
        })];
      }
      r(S, "getIndexAndLocation");
      var _ = null;
      function I() {
        if (_)
          j.call(_), _ = null;
        else {
          var C = e.Action.Pop, p = S(), R = p[0], K = p[1];
          if (j.length)
            if (R != null) {
              var q = L - R;
              q && (_ = {
                action: C,
                location: K,
                retry: /* @__PURE__ */ r(function() {
                  M(q * -1);
                }, "retry")
              }, M(q));
            } else
              n(
                !1,
                // TODO: Write up a doc that explains our blocking strategy in
                // detail and link to it here so people can understand better what
                // is going on and how to avoid it.
                "You are trying to block a POP navigation to a location that was not created by the history library. The block will fail sil\
ently in production, but in general you should do all navigation with the history library (instead of using window.history.pushState directl\
y) to avoid this situation."
              );
          else
            g(C);
        }
      }
      r(I, "handlePop"), c.addEventListener(z, I);
      var W = e.Action.Pop, Y = S(), L = Y[0], V = Y[1], $ = O(), j = O();
      L == null && (L = 0, y.replaceState(t({}, y.state, {
        idx: L
      }), ""));
      function P(C) {
        return typeof C == "string" ? C : E(C);
      }
      r(P, "createHref");
      function H(C, p) {
        return p === void 0 && (p = null), a(t({
          pathname: V.pathname,
          hash: "",
          search: ""
        }, typeof C == "string" ? N(C) : C, {
          state: p,
          key: w()
        }));
      }
      r(H, "getNextLocation");
      function o(C, p) {
        return [{
          usr: C.state,
          key: C.key,
          idx: p
        }, P(C)];
      }
      r(o, "getHistoryStateAndUrl");
      function l(C, p, R) {
        return !j.length || (j.call({
          action: C,
          location: p,
          retry: R
        }), !1);
      }
      r(l, "allowTx");
      function g(C) {
        W = C;
        var p = S();
        L = p[0], V = p[1], $.call({
          action: W,
          location: V
        });
      }
      r(g, "applyTx");
      function d(C, p) {
        var R = e.Action.Push, K = H(C, p);
        function q() {
          d(C, p);
        }
        if (r(q, "retry"), l(R, K, q)) {
          var Z = o(K, L + 1), re = Z[0], ae = Z[1];
          try {
            y.pushState(re, "", ae);
          } catch {
            c.location.assign(ae);
          }
          g(R);
        }
      }
      r(d, "push");
      function m(C, p) {
        var R = e.Action.Replace, K = H(C, p);
        function q() {
          m(C, p);
        }
        if (r(q, "retry"), l(R, K, q)) {
          var Z = o(K, L), re = Z[0], ae = Z[1];
          y.replaceState(re, "", ae), g(R);
        }
      }
      r(m, "replace");
      function M(C) {
        y.go(C);
      }
      r(M, "go");
      var T = {
        get action() {
          return W;
        },
        get location() {
          return V;
        },
        createHref: P,
        push: d,
        replace: m,
        go: M,
        back: /* @__PURE__ */ r(function() {
          M(-1);
        }, "back"),
        forward: /* @__PURE__ */ r(function() {
          M(1);
        }, "forward"),
        listen: /* @__PURE__ */ r(function(p) {
          return $.push(p);
        }, "listen"),
        block: /* @__PURE__ */ r(function(p) {
          var R = j.push(p);
          return j.length === 1 && c.addEventListener(s, x), function() {
            R(), j.length || c.removeEventListener(s, x);
          };
        }, "block")
      };
      return T;
    }
    r(D, "createBrowserHistory");
    function U(u) {
      u === void 0 && (u = {});
      var i = u, h = i.window, c = h === void 0 ? document.defaultView : h, y = c.history;
      function S() {
        var p = N(c.location.hash.substr(1)), R = p.pathname, K = R === void 0 ? "/" : R, q = p.search, Z = q === void 0 ? "" : q, re = p.hash,
        ae = re === void 0 ? "" : re, ie = y.state || {};
        return [ie.idx, a({
          pathname: K,
          search: Z,
          hash: ae,
          state: ie.usr || null,
          key: ie.key || "default"
        })];
      }
      r(S, "getIndexAndLocation");
      var _ = null;
      function I() {
        if (_)
          j.call(_), _ = null;
        else {
          var p = e.Action.Pop, R = S(), K = R[0], q = R[1];
          if (j.length)
            if (K != null) {
              var Z = L - K;
              Z && (_ = {
                action: p,
                location: q,
                retry: /* @__PURE__ */ r(function() {
                  T(Z * -1);
                }, "retry")
              }, T(Z));
            } else
              n(
                !1,
                // TODO: Write up a doc that explains our blocking strategy in
                // detail and link to it here so people can understand better
                // what is going on and how to avoid it.
                "You are trying to block a POP navigation to a location that was not created by the history library. The block will fail sil\
ently in production, but in general you should do all navigation with the history library (instead of using window.history.pushState directl\
y) to avoid this situation."
              );
          else
            d(p);
        }
      }
      r(I, "handlePop"), c.addEventListener(z, I), c.addEventListener(v, function() {
        var p = S(), R = p[1];
        E(R) !== E(V) && I();
      });
      var W = e.Action.Pop, Y = S(), L = Y[0], V = Y[1], $ = O(), j = O();
      L == null && (L = 0, y.replaceState(t({}, y.state, {
        idx: L
      }), ""));
      function P() {
        var p = document.querySelector("base"), R = "";
        if (p && p.getAttribute("href")) {
          var K = c.location.href, q = K.indexOf("#");
          R = q === -1 ? K : K.slice(0, q);
        }
        return R;
      }
      r(P, "getBaseHref");
      function H(p) {
        return P() + "#" + (typeof p == "string" ? p : E(p));
      }
      r(H, "createHref");
      function o(p, R) {
        return R === void 0 && (R = null), a(t({
          pathname: V.pathname,
          hash: "",
          search: ""
        }, typeof p == "string" ? N(p) : p, {
          state: R,
          key: w()
        }));
      }
      r(o, "getNextLocation");
      function l(p, R) {
        return [{
          usr: p.state,
          key: p.key,
          idx: R
        }, H(p)];
      }
      r(l, "getHistoryStateAndUrl");
      function g(p, R, K) {
        return !j.length || (j.call({
          action: p,
          location: R,
          retry: K
        }), !1);
      }
      r(g, "allowTx");
      function d(p) {
        W = p;
        var R = S();
        L = R[0], V = R[1], $.call({
          action: W,
          location: V
        });
      }
      r(d, "applyTx");
      function m(p, R) {
        var K = e.Action.Push, q = o(p, R);
        function Z() {
          m(p, R);
        }
        if (r(Z, "retry"), n(q.pathname.charAt(0) === "/", "Relative pathnames are not supported in hash history.push(" + JSON.stringify(p) +
        ")"), g(K, q, Z)) {
          var re = l(q, L + 1), ae = re[0], ie = re[1];
          try {
            y.pushState(ae, "", ie);
          } catch {
            c.location.assign(ie);
          }
          d(K);
        }
      }
      r(m, "push");
      function M(p, R) {
        var K = e.Action.Replace, q = o(p, R);
        function Z() {
          M(p, R);
        }
        if (r(Z, "retry"), n(q.pathname.charAt(0) === "/", "Relative pathnames are not supported in hash history.replace(" + JSON.stringify(
        p) + ")"), g(K, q, Z)) {
          var re = l(q, L), ae = re[0], ie = re[1];
          y.replaceState(ae, "", ie), d(K);
        }
      }
      r(M, "replace");
      function T(p) {
        y.go(p);
      }
      r(T, "go");
      var C = {
        get action() {
          return W;
        },
        get location() {
          return V;
        },
        createHref: H,
        push: m,
        replace: M,
        go: T,
        back: /* @__PURE__ */ r(function() {
          T(-1);
        }, "back"),
        forward: /* @__PURE__ */ r(function() {
          T(1);
        }, "forward"),
        listen: /* @__PURE__ */ r(function(R) {
          return $.push(R);
        }, "listen"),
        block: /* @__PURE__ */ r(function(R) {
          var K = j.push(R);
          return j.length === 1 && c.addEventListener(s, x), function() {
            K(), j.length || c.removeEventListener(s, x);
          };
        }, "block")
      };
      return C;
    }
    r(U, "createHashHistory");
    function J(u) {
      u === void 0 && (u = {});
      var i = u, h = i.initialEntries, c = h === void 0 ? ["/"] : h, y = i.initialIndex, S = c.map(function(d) {
        var m = a(t({
          pathname: "/",
          search: "",
          hash: "",
          state: null,
          key: w()
        }, typeof d == "string" ? N(d) : d));
        return n(m.pathname.charAt(0) === "/", "Relative pathnames are not supported in createMemoryHistory({ initialEntries }) (invalid ent\
ry: " + JSON.stringify(d) + ")"), m;
      }), _ = F(y ?? S.length - 1, 0, S.length - 1), I = e.Action.Pop, W = S[_], Y = O(), L = O();
      function V(d) {
        return typeof d == "string" ? d : E(d);
      }
      r(V, "createHref");
      function $(d, m) {
        return m === void 0 && (m = null), a(t({
          pathname: W.pathname,
          search: "",
          hash: ""
        }, typeof d == "string" ? N(d) : d, {
          state: m,
          key: w()
        }));
      }
      r($, "getNextLocation");
      function j(d, m, M) {
        return !L.length || (L.call({
          action: d,
          location: m,
          retry: M
        }), !1);
      }
      r(j, "allowTx");
      function P(d, m) {
        I = d, W = m, Y.call({
          action: I,
          location: W
        });
      }
      r(P, "applyTx");
      function H(d, m) {
        var M = e.Action.Push, T = $(d, m);
        function C() {
          H(d, m);
        }
        r(C, "retry"), n(W.pathname.charAt(0) === "/", "Relative pathnames are not supported in memory history.push(" + JSON.stringify(d) + "\
)"), j(M, T, C) && (_ += 1, S.splice(_, S.length, T), P(M, T));
      }
      r(H, "push");
      function o(d, m) {
        var M = e.Action.Replace, T = $(d, m);
        function C() {
          o(d, m);
        }
        r(C, "retry"), n(W.pathname.charAt(0) === "/", "Relative pathnames are not supported in memory history.replace(" + JSON.stringify(d) +
        ")"), j(M, T, C) && (S[_] = T, P(M, T));
      }
      r(o, "replace");
      function l(d) {
        var m = F(_ + d, 0, S.length - 1), M = e.Action.Pop, T = S[m];
        function C() {
          l(d);
        }
        r(C, "retry"), j(M, T, C) && (_ = m, P(M, T));
      }
      r(l, "go");
      var g = {
        get index() {
          return _;
        },
        get action() {
          return I;
        },
        get location() {
          return W;
        },
        createHref: V,
        push: H,
        replace: o,
        go: l,
        back: /* @__PURE__ */ r(function() {
          l(-1);
        }, "back"),
        forward: /* @__PURE__ */ r(function() {
          l(1);
        }, "forward"),
        listen: /* @__PURE__ */ r(function(m) {
          return Y.push(m);
        }, "listen"),
        block: /* @__PURE__ */ r(function(m) {
          return L.push(m);
        }, "block")
      };
      return g;
    }
    r(J, "createMemoryHistory");
    function F(u, i, h) {
      return Math.min(Math.max(u, i), h);
    }
    r(F, "clamp");
    function x(u) {
      u.preventDefault(), u.returnValue = "";
    }
    r(x, "promptBeforeUnload");
    function O() {
      var u = [];
      return {
        get length() {
          return u.length;
        },
        push: /* @__PURE__ */ r(function(h) {
          return u.push(h), function() {
            u = u.filter(function(c) {
              return c !== h;
            });
          };
        }, "push"),
        call: /* @__PURE__ */ r(function(h) {
          u.forEach(function(c) {
            return c && c(h);
          });
        }, "call")
      };
    }
    r(O, "createEvents");
    function w() {
      return Math.random().toString(36).substr(2, 8);
    }
    r(w, "createKey");
    function E(u) {
      var i = u.pathname, h = i === void 0 ? "/" : i, c = u.search, y = c === void 0 ? "" : c, S = u.hash, _ = S === void 0 ? "" : S;
      return y && y !== "?" && (h += y.charAt(0) === "?" ? y : "?" + y), _ && _ !== "#" && (h += _.charAt(0) === "#" ? _ : "#" + _), h;
    }
    r(E, "createPath");
    function N(u) {
      var i = {};
      if (u) {
        var h = u.indexOf("#");
        h >= 0 && (i.hash = u.substr(h), u = u.substr(0, h));
        var c = u.indexOf("?");
        c >= 0 && (i.search = u.substr(c), u = u.substr(0, c)), u && (i.pathname = u);
      }
      return i;
    }
    r(N, "parsePath"), e.createBrowserHistory = D, e.createHashHistory = U, e.createMemoryHistory = J, e.createPath = E, e.parsePath = N, Object.
    defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/history/main.js
var Ee = ne((Ra, ot) => {
  "use strict";
  process.env.NODE_ENV === "production" ? ot.exports = pr() : ot.exports = mr();
});

// ../node_modules/react-router/umd/react-router.production.min.js
var yr = ne((Be, gr) => {
  (function(e, t) {
    typeof Be == "object" && typeof gr < "u" ? t(Be, require("react"), Ee()) : typeof define == "function" && define.amd ? define(["exports",
    "react", "history"], t) : t((e = e || self).ReactRouter = {}, e.React, e.HistoryLibrary);
  })(Be, function(e, t, a) {
    "use strict";
    function n(o, l) {
      if (!o) throw new Error(l);
    }
    r(n, "a");
    let s = t.createContext(null), v = t.createContext(null), z = t.createContext({ outlet: null, matches: [] });
    function D(o) {
      return w();
    }
    r(D, "s");
    function U(o) {
      n(!1);
    }
    r(U, "o");
    function J(o) {
      let { basename: l = "/", children: g = null, location: d, navigationType: m = a.Action.Pop, navigator: M, static: T = !1 } = o;
      F() && n(!1);
      let C = j(l), p = t.useMemo(() => ({ basename: C, navigator: M, static: T }), [C, M, T]);
      typeof d == "string" && (d = a.parsePath(d));
      let { pathname: R = "/", search: K = "", hash: q = "", state: Z = null, key: re = "default" } = d, ae = t.useMemo(() => {
        let ie = V(R, C);
        return ie == null ? null : { pathname: ie, search: K, hash: q, state: Z, key: re };
      }, [C, R, K, q, Z, re]);
      return ae == null ? null : t.createElement(s.Provider, { value: p }, t.createElement(v.Provider, { children: g, value: { location: ae,
      navigationType: m } }));
    }
    r(J, "u");
    function F() {
      return t.useContext(v) != null;
    }
    r(F, "c");
    function x() {
      return F() || n(!1), t.useContext(v).location;
    }
    r(x, "h");
    function O() {
      F() || n(!1);
      let { basename: o, navigator: l } = t.useContext(s), { matches: g } = t.useContext(z), { pathname: d } = x(), m = JSON.stringify(g.map(
      (T) => T.pathnameBase)), M = t.useRef(!1);
      return t.useEffect(() => {
        M.current = !0;
      }), t.useCallback(function(T, C) {
        if (C === void 0 && (C = {}), !M.current) return;
        if (typeof T == "number") return void l.go(T);
        let p = L(T, JSON.parse(m), d);
        o !== "/" && (p.pathname = $([o, p.pathname])), (C.replace ? l.replace : l.push)(p, C.state);
      }, [o, l, m, d]);
    }
    r(O, "p");
    function w() {
      return t.useContext(z).outlet;
    }
    r(w, "f");
    function E(o) {
      let { matches: l } = t.useContext(z), { pathname: g } = x(), d = JSON.stringify(l.map((m) => m.pathnameBase));
      return t.useMemo(() => L(o, JSON.parse(d), g), [o, d, g]);
    }
    r(E, "m");
    function N(o, l) {
      F() || n(!1);
      let g, { matches: d } = t.useContext(z), m = d[d.length - 1], M = m ? m.params : {}, T = (m && m.pathname, m ? m.pathnameBase : "/"), C = (m &&
      m.route, x());
      if (l) {
        var p;
        let q = typeof l == "string" ? a.parsePath(l) : l;
        T === "/" || (p = q.pathname) != null && p.startsWith(T) || n(!1), g = q;
      } else g = C;
      let R = g.pathname || "/", K = i(o, { pathname: T === "/" ? R : R.slice(T.length) || "/" });
      return I(K && K.map((q) => Object.assign({}, q, { params: Object.assign({}, M, q.params), pathname: $([T, q.pathname]), pathnameBase: q.
      pathnameBase === "/" ? T : $([T, q.pathnameBase]) })), d);
    }
    r(N, "d");
    function u(o) {
      let l = [];
      return t.Children.forEach(o, (g) => {
        if (!t.isValidElement(g)) return;
        if (g.type === t.Fragment) return void l.push.apply(l, u(g.props.children));
        g.type !== U && n(!1);
        let d = { caseSensitive: g.props.caseSensitive, element: g.props.element, index: g.props.index, path: g.props.path };
        g.props.children && (d.children = u(g.props.children)), l.push(d);
      }), l;
    }
    r(u, "g");
    function i(o, l, g) {
      g === void 0 && (g = "/");
      let d = V((typeof l == "string" ? a.parsePath(l) : l).pathname || "/", g);
      if (d == null) return null;
      let m = h(o);
      (function(T) {
        T.sort((C, p) => C.score !== p.score ? p.score - C.score : function(R, K) {
          return R.length === K.length && R.slice(0, -1).every((q, Z) => q === K[Z]) ? R[R.length - 1] - K[K.length - 1] : 0;
        }(C.routesMeta.map((R) => R.childrenIndex), p.routesMeta.map((R) => R.childrenIndex)));
      })(m);
      let M = null;
      for (let T = 0; M == null && T < m.length; ++T) M = _(m[T], o, d);
      return M;
    }
    r(i, "v");
    function h(o, l, g, d) {
      return l === void 0 && (l = []), g === void 0 && (g = []), d === void 0 && (d = ""), o.forEach((m, M) => {
        let T = { relativePath: m.path || "", caseSensitive: m.caseSensitive === !0, childrenIndex: M };
        T.relativePath.startsWith("/") && (T.relativePath.startsWith(d) || n(!1), T.relativePath = T.relativePath.slice(d.length));
        let C = $([d, T.relativePath]), p = g.concat(T);
        m.children && m.children.length > 0 && (m.index === !0 && n(!1), h(m.children, l, p, C)), (m.path != null || m.index) && l.push({ path: C,
        score: S(C, m.index), routesMeta: p });
      }), l;
    }
    r(h, "y");
    let c = /^:\w+$/, y = /* @__PURE__ */ r((o) => o === "*", "C");
    function S(o, l) {
      let g = o.split("/"), d = g.length;
      return g.some(y) && (d += -2), l && (d += 2), g.filter((m) => !y(m)).reduce((m, M) => m + (c.test(M) ? 3 : M === "" ? 1 : 10), d);
    }
    r(S, "P");
    function _(o, l, g) {
      let d = l, { routesMeta: m } = o, M = {}, T = "/", C = [];
      for (let p = 0; p < m.length; ++p) {
        let R = m[p], K = p === m.length - 1, q = T === "/" ? g : g.slice(T.length) || "/", Z = W({ path: R.relativePath, caseSensitive: R.caseSensitive,
        end: K }, q);
        if (!Z) return null;
        Object.assign(M, Z.params);
        let re = d[R.childrenIndex];
        C.push({ params: M, pathname: $([T, Z.pathname]), pathnameBase: $([T, Z.pathnameBase]), route: re }), Z.pathnameBase !== "/" && (T =
        $([T, Z.pathnameBase])), d = re.children;
      }
      return C;
    }
    r(_, "E");
    function I(o, l) {
      return l === void 0 && (l = []), o == null ? null : o.reduceRight((g, d, m) => t.createElement(z.Provider, { children: d.route.element !==
      void 0 ? d.route.element : t.createElement(D, null), value: { outlet: g, matches: l.concat(o.slice(0, m + 1)) } }), null);
    }
    r(I, "R");
    function W(o, l) {
      typeof o == "string" && (o = { path: o, caseSensitive: !1, end: !0 });
      let [g, d] = function(p, R, K) {
        R === void 0 && (R = !1), K === void 0 && (K = !0);
        let q = [], Z = "^" + p.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^$?{}|()[\]]/g, "\\$&").replace(/:(\w+)/g, (re, ae) => (q.
        push(ae), "([^\\/]+)"));
        return p.endsWith("*") ? (q.push("*"), Z += p === "*" || p === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$") : Z += K ? "\\/*$" : "(?:\\b|$)",
        [new RegExp(Z, R ? void 0 : "i"), q];
      }(o.path, o.caseSensitive, o.end), m = l.match(g);
      if (!m) return null;
      let M = m[0], T = M.replace(/(.)\/+$/, "$1"), C = m.slice(1);
      return { params: d.reduce((p, R, K) => {
        if (R === "*") {
          let q = C[K] || "";
          T = M.slice(0, M.length - q.length).replace(/(.)\/+$/, "$1");
        }
        return p[R] = function(q, Z) {
          try {
            return decodeURIComponent(q);
          } catch {
            return q;
          }
        }(C[K] || ""), p;
      }, {}), pathname: M, pathnameBase: T, pattern: o };
    }
    r(W, "S");
    function Y(o, l) {
      l === void 0 && (l = "/");
      let { pathname: g, search: d = "", hash: m = "" } = typeof o == "string" ? a.parsePath(o) : o;
      return { pathname: g ? g.startsWith("/") ? g : function(T, C) {
        let p = C.replace(/\/+$/, "").split("/");
        return T.split("/").forEach((R) => {
          R === ".." ? p.length > 1 && p.pop() : R !== "." && p.push(R);
        }), p.length > 1 ? p.join("/") : "/";
      }(g, l) : l, search: P(d), hash: H(m) };
    }
    r(Y, "b");
    function L(o, l, g) {
      let d, m = typeof o == "string" ? a.parsePath(o) : o, M = o === "" || m.pathname === "" ? "/" : m.pathname;
      if (M == null) d = g;
      else {
        let C = l.length - 1;
        if (M.startsWith("..")) {
          let p = M.split("/");
          for (; p[0] === ".."; ) p.shift(), C -= 1;
          m.pathname = p.join("/");
        }
        d = C >= 0 ? l[C] : "/";
      }
      let T = Y(m, d);
      return M && M !== "/" && M.endsWith("/") && !T.pathname.endsWith("/") && (T.pathname += "/"), T;
    }
    r(L, "$");
    function V(o, l) {
      if (l === "/") return o;
      if (!o.toLowerCase().startsWith(l.toLowerCase())) return null;
      let g = o.charAt(l.length);
      return g && g !== "/" ? null : o.slice(l.length) || "/";
    }
    r(V, "M");
    let $ = /* @__PURE__ */ r((o) => o.join("/").replace(/\/\/+/g, "/"), "W"), j = /* @__PURE__ */ r((o) => o.replace(/\/+$/, "").replace(/^\/*/,
    "/"), "B"), P = /* @__PURE__ */ r((o) => o && o !== "?" ? o.startsWith("?") ? o : "?" + o : "", "N"), H = /* @__PURE__ */ r((o) => o && o !==
    "#" ? o.startsWith("#") ? o : "#" + o : "", "O");
    e.MemoryRouter = function(o) {
      let { basename: l, children: g, initialEntries: d, initialIndex: m } = o, M = t.useRef();
      M.current == null && (M.current = a.createMemoryHistory({ initialEntries: d, initialIndex: m }));
      let T = M.current, [C, p] = t.useState({ action: T.action, location: T.location });
      return t.useLayoutEffect(() => T.listen(p), [T]), t.createElement(J, { basename: l, children: g, location: C.location, navigationType: C.
      action, navigator: T });
    }, e.Navigate = function(o) {
      let { to: l, replace: g, state: d } = o;
      F() || n(!1);
      let m = O();
      return t.useEffect(() => {
        m(l, { replace: g, state: d });
      }), null;
    }, e.Outlet = D, e.Route = U, e.Router = J, e.Routes = function(o) {
      let { children: l, location: g } = o;
      return N(u(l), g);
    }, e.UNSAFE_LocationContext = v, e.UNSAFE_NavigationContext = s, e.UNSAFE_RouteContext = z, e.createRoutesFromChildren = u, e.generatePath =
    function(o, l) {
      return l === void 0 && (l = {}), o.replace(/:(\w+)/g, (g, d) => (l[d] == null && n(!1), l[d])).replace(/\/*\*$/, (g) => l["*"] == null ?
      "" : l["*"].replace(/^\/*/, "/"));
    }, e.matchPath = W, e.matchRoutes = i, e.renderMatches = function(o) {
      return I(o);
    }, e.resolvePath = Y, e.useHref = function(o) {
      F() || n(!1);
      let { basename: l, navigator: g } = t.useContext(s), { hash: d, pathname: m, search: M } = E(o), T = m;
      if (l !== "/") {
        let C = function(R) {
          return R === "" || R.pathname === "" ? "/" : typeof R == "string" ? a.parsePath(R).pathname : R.pathname;
        }(o), p = C != null && C.endsWith("/");
        T = m === "/" ? l + (p ? "/" : "") : $([l, m]);
      }
      return g.createHref({ pathname: T, search: M, hash: d });
    }, e.useInRouterContext = F, e.useLocation = x, e.useMatch = function(o) {
      return F() || n(!1), W(o, x().pathname);
    }, e.useNavigate = O, e.useNavigationType = function() {
      return t.useContext(v).navigationType;
    }, e.useOutlet = w, e.useParams = function() {
      let { matches: o } = t.useContext(z), l = o[o.length - 1];
      return l ? l.params : {};
    }, e.useResolvedPath = E, e.useRoutes = N, Object.defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/react-router/umd/react-router.development.js
var br = ne((We, vr) => {
  (function(e, t) {
    typeof We == "object" && typeof vr < "u" ? t(We, require("react"), Ee()) : typeof define == "function" && define.amd ? define(["exports",
    "react", "history"], t) : (e = e || self, t(e.ReactRouter = {}, e.React, e.HistoryLibrary));
  })(We, function(e, t, a) {
    "use strict";
    function n(f, b) {
      if (!f) throw new Error(b);
    }
    r(n, "invariant");
    function s(f, b) {
      if (!f) {
        typeof console < "u" && console.warn(b);
        try {
          throw new Error(b);
        } catch {
        }
      }
    }
    r(s, "warning");
    let v = {};
    function z(f, b, A) {
      !b && !v[f] && (v[f] = !0, s(!1, A));
    }
    r(z, "warningOnce");
    let D = /* @__PURE__ */ t.createContext(null);
    D.displayName = "Navigation";
    let U = /* @__PURE__ */ t.createContext(null);
    U.displayName = "Location";
    let J = /* @__PURE__ */ t.createContext({
      outlet: null,
      matches: []
    });
    J.displayName = "Route";
    function F(f) {
      let {
        basename: b,
        children: A,
        initialEntries: k,
        initialIndex: B
      } = f, G = t.useRef();
      G.current == null && (G.current = a.createMemoryHistory({
        initialEntries: k,
        initialIndex: B
      }));
      let Q = G.current, [X, ee] = t.useState({
        action: Q.action,
        location: Q.location
      });
      return t.useLayoutEffect(() => Q.listen(ee), [Q]), /* @__PURE__ */ t.createElement(E, {
        basename: b,
        children: A,
        location: X.location,
        navigationType: X.action,
        navigator: Q
      });
    }
    r(F, "MemoryRouter");
    function x(f) {
      let {
        to: b,
        replace: A,
        state: k
      } = f;
      i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of
        // the router loaded. We can help them understand how to avoid that.
        "<Navigate> may be used only in the context of a <Router> component."
      ), s(!t.useContext(D).static, "<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should \
modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");
      let B = S();
      return t.useEffect(() => {
        B(b, {
          replace: A,
          state: k
        });
      }), null;
    }
    r(x, "Navigate");
    function O(f) {
      return _();
    }
    r(O, "Outlet");
    function w(f) {
      n(!1, "A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Rou\
tes>.");
    }
    r(w, "Route");
    function E(f) {
      let {
        basename: b = "/",
        children: A = null,
        location: k,
        navigationType: B = a.Action.Pop,
        navigator: G,
        static: Q = !1
      } = f;
      i() && n(!1, "You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");
      let X = Nr(b), ee = t.useMemo(() => ({
        basename: X,
        navigator: G,
        static: Q
      }), [X, G, Q]);
      typeof k == "string" && (k = a.parsePath(k));
      let {
        pathname: te = "/",
        search: ue = "",
        hash: ce = "",
        state: se = null,
        key: le = "default"
      } = k, oe = t.useMemo(() => {
        let ft = ct(te, X);
        return ft == null ? null : {
          pathname: ft,
          search: ue,
          hash: ce,
          state: se,
          key: le
        };
      }, [X, te, ue, ce, se, le]);
      return s(oe != null, '<Router basename="' + X + '"> is not able to match the URL ' + ('"' + te + ue + ce + '" because it does not star\
t with the ') + "basename, so the <Router> won't render anything."), oe == null ? null : /* @__PURE__ */ t.createElement(D.Provider, {
        value: ee
      }, /* @__PURE__ */ t.createElement(U.Provider, {
        children: A,
        value: {
          location: oe,
          navigationType: B
        }
      }));
    }
    r(E, "Router");
    function N(f) {
      let {
        children: b,
        location: A
      } = f;
      return Y(L(b), A);
    }
    r(N, "Routes");
    function u(f) {
      i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of the
        // router loaded. We can help them understand how to avoid that.
        "useHref() may be used only in the context of a <Router> component."
      );
      let {
        basename: b,
        navigator: A
      } = t.useContext(D), {
        hash: k,
        pathname: B,
        search: G
      } = W(f), Q = B;
      if (b !== "/") {
        let X = _r(f), ee = X != null && X.endsWith("/");
        Q = B === "/" ? b + (ee ? "/" : "") : ve([b, B]);
      }
      return A.createHref({
        pathname: Q,
        search: G,
        hash: k
      });
    }
    r(u, "useHref");
    function i() {
      return t.useContext(U) != null;
    }
    r(i, "useInRouterContext");
    function h() {
      return i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of the
        // router loaded. We can help them understand how to avoid that.
        "useLocation() may be used only in the context of a <Router> component."
      ), t.useContext(U).location;
    }
    r(h, "useLocation");
    function c() {
      return t.useContext(U).navigationType;
    }
    r(c, "useNavigationType");
    function y(f) {
      return i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of the
        // router loaded. We can help them understand how to avoid that.
        "useMatch() may be used only in the context of a <Router> component."
      ), q(f, h().pathname);
    }
    r(y, "useMatch");
    function S() {
      i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of the
        // router loaded. We can help them understand how to avoid that.
        "useNavigate() may be used only in the context of a <Router> component."
      );
      let {
        basename: f,
        navigator: b
      } = t.useContext(D), {
        matches: A
      } = t.useContext(J), {
        pathname: k
      } = h(), B = JSON.stringify(A.map((X) => X.pathnameBase)), G = t.useRef(!1);
      return t.useEffect(() => {
        G.current = !0;
      }), t.useCallback(function(X, ee) {
        if (ee === void 0 && (ee = {}), s(G.current, "You should call navigate() in a React.useEffect(), not when your component is first re\
ndered."), !G.current) return;
        if (typeof X == "number") {
          b.go(X);
          return;
        }
        let te = $e(X, JSON.parse(B), k);
        f !== "/" && (te.pathname = ve([f, te.pathname])), (ee.replace ? b.replace : b.push)(te, ee.state);
      }, [f, b, B, k]);
    }
    r(S, "useNavigate");
    function _() {
      return t.useContext(J).outlet;
    }
    r(_, "useOutlet");
    function I() {
      let {
        matches: f
      } = t.useContext(J), b = f[f.length - 1];
      return b ? b.params : {};
    }
    r(I, "useParams");
    function W(f) {
      let {
        matches: b
      } = t.useContext(J), {
        pathname: A
      } = h(), k = JSON.stringify(b.map((B) => B.pathnameBase));
      return t.useMemo(() => $e(f, JSON.parse(k), A), [f, k, A]);
    }
    r(W, "useResolvedPath");
    function Y(f, b) {
      i() || n(
        !1,
        // TODO: This error is probably because they somehow have 2 versions of the
        // router loaded. We can help them understand how to avoid that.
        "useRoutes() may be used only in the context of a <Router> component."
      );
      let {
        matches: A
      } = t.useContext(J), k = A[A.length - 1], B = k ? k.params : {}, G = k ? k.pathname : "/", Q = k ? k.pathnameBase : "/", X = k && k.route;
      {
        let oe = X && X.path || "";
        z(G, !X || oe.endsWith("*"), "You rendered descendant <Routes> (or called `useRoutes()`) at " + ('"' + G + '" (under <Route path="' +
        oe + '">) but the ') + `parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and\
 therefore the child routes will never render.

` + ('Please change the parent <Route path="' + oe + '"> to <Route ') + ('path="' + oe + '/*">.'));
      }
      let ee = h(), te;
      if (b) {
        var ue;
        let oe = typeof b == "string" ? a.parsePath(b) : b;
        Q === "/" || (ue = oe.pathname) != null && ue.startsWith(Q) || n(!1, "When overriding the location using `<Routes location>` or `use\
Routes(routes, location)`, the location pathname must begin with the portion of the URL pathname that was " + ('matched by all parent routes\
. The current pathname base is "' + Q + '" ') + ('but pathname "' + oe.pathname + '" was given in the `location` prop.')), te = oe;
      } else
        te = ee;
      let ce = te.pathname || "/", se = Q === "/" ? ce : ce.slice(Q.length) || "/", le = $(f, {
        pathname: se
      });
      return s(X || le != null, 'No routes matched location "' + te.pathname + te.search + te.hash + '" '), s(le == null || le[le.length - 1].
      route.element !== void 0, 'Matched leaf route at location "' + te.pathname + te.search + te.hash + '" does not have an element. This m\
eans it will render an <Outlet /> with a null value by default resulting in an "empty" page.'), K(le && le.map((oe) => Object.assign({}, oe,
      {
        params: Object.assign({}, B, oe.params),
        pathname: ve([Q, oe.pathname]),
        pathnameBase: oe.pathnameBase === "/" ? Q : ve([Q, oe.pathnameBase])
      })), A);
    }
    r(Y, "useRoutes");
    function L(f) {
      let b = [];
      return t.Children.forEach(f, (A) => {
        if (!/* @__PURE__ */ t.isValidElement(A))
          return;
        if (A.type === t.Fragment) {
          b.push.apply(b, L(A.props.children));
          return;
        }
        A.type !== w && n(!1, "[" + (typeof A.type == "string" ? A.type : A.type.name) + "] is not a <Route> component. All component childr\
en of <Routes> must be a <Route> or <React.Fragment>");
        let k = {
          caseSensitive: A.props.caseSensitive,
          element: A.props.element,
          index: A.props.index,
          path: A.props.path
        };
        A.props.children && (k.children = L(A.props.children)), b.push(k);
      }), b;
    }
    r(L, "createRoutesFromChildren");
    function V(f, b) {
      return b === void 0 && (b = {}), f.replace(/:(\w+)/g, (A, k) => (b[k] == null && n(!1, 'Missing ":' + k + '" param'), b[k])).replace(/\/*\*$/,
      (A) => b["*"] == null ? "" : b["*"].replace(/^\/*/, "/"));
    }
    r(V, "generatePath");
    function $(f, b, A) {
      A === void 0 && (A = "/");
      let k = typeof b == "string" ? a.parsePath(b) : b, B = ct(k.pathname || "/", A);
      if (B == null)
        return null;
      let G = j(f);
      P(G);
      let Q = null;
      for (let X = 0; Q == null && X < G.length; ++X)
        Q = p(G[X], f, B);
      return Q;
    }
    r($, "matchRoutes");
    function j(f, b, A, k) {
      return b === void 0 && (b = []), A === void 0 && (A = []), k === void 0 && (k = ""), f.forEach((B, G) => {
        let Q = {
          relativePath: B.path || "",
          caseSensitive: B.caseSensitive === !0,
          childrenIndex: G
        };
        Q.relativePath.startsWith("/") && (Q.relativePath.startsWith(k) || n(!1, 'Absolute route path "' + Q.relativePath + '" nested under \
path ' + ('"' + k + '" is not valid. An absolute child route path ') + "must start with the combined path of all its parent routes."), Q.relativePath =
        Q.relativePath.slice(k.length));
        let X = ve([k, Q.relativePath]), ee = A.concat(Q);
        B.children && B.children.length > 0 && (B.index === !0 && n(!1, "Index routes must not have child routes. Please remove " + ('all ch\
ild routes from route path "' + X + '".')), j(B.children, b, ee, X)), !(B.path == null && !B.index) && b.push({
          path: X,
          score: T(X, B.index),
          routesMeta: ee
        });
      }), b;
    }
    r(j, "flattenRoutes");
    function P(f) {
      f.sort((b, A) => b.score !== A.score ? A.score - b.score : C(b.routesMeta.map((k) => k.childrenIndex), A.routesMeta.map((k) => k.childrenIndex)));
    }
    r(P, "rankRouteBranches");
    let H = /^:\w+$/, o = 3, l = 2, g = 1, d = 10, m = -2, M = /* @__PURE__ */ r((f) => f === "*", "isSplat");
    function T(f, b) {
      let A = f.split("/"), k = A.length;
      return A.some(M) && (k += m), b && (k += l), A.filter((B) => !M(B)).reduce((B, G) => B + (H.test(G) ? o : G === "" ? g : d), k);
    }
    r(T, "computeScore");
    function C(f, b) {
      return f.length === b.length && f.slice(0, -1).every((k, B) => k === b[B]) ? (
        // If two routes are siblings, we should try to match the earlier sibling
        // first. This allows people to have fine-grained control over the matching
        // behavior by simply putting routes with identical paths in the order they
        // want them tried.
        f[f.length - 1] - b[b.length - 1]
      ) : (
        // Otherwise, it doesn't really make sense to rank non-siblings by index,
        // so they sort equally.
        0
      );
    }
    r(C, "compareIndexes");
    function p(f, b, A) {
      let k = b, {
        routesMeta: B
      } = f, G = {}, Q = "/", X = [];
      for (let ee = 0; ee < B.length; ++ee) {
        let te = B[ee], ue = ee === B.length - 1, ce = Q === "/" ? A : A.slice(Q.length) || "/", se = q({
          path: te.relativePath,
          caseSensitive: te.caseSensitive,
          end: ue
        }, ce);
        if (!se) return null;
        Object.assign(G, se.params);
        let le = k[te.childrenIndex];
        X.push({
          params: G,
          pathname: ve([Q, se.pathname]),
          pathnameBase: ve([Q, se.pathnameBase]),
          route: le
        }), se.pathnameBase !== "/" && (Q = ve([Q, se.pathnameBase])), k = le.children;
      }
      return X;
    }
    r(p, "matchRouteBranch");
    function R(f) {
      return K(f);
    }
    r(R, "renderMatches");
    function K(f, b) {
      return b === void 0 && (b = []), f == null ? null : f.reduceRight((A, k, B) => /* @__PURE__ */ t.createElement(J.Provider, {
        children: k.route.element !== void 0 ? k.route.element : /* @__PURE__ */ t.createElement(O, null),
        value: {
          outlet: A,
          matches: b.concat(f.slice(0, B + 1))
        }
      }), null);
    }
    r(K, "_renderMatches");
    function q(f, b) {
      typeof f == "string" && (f = {
        path: f,
        caseSensitive: !1,
        end: !0
      });
      let [A, k] = Z(f.path, f.caseSensitive, f.end), B = b.match(A);
      if (!B) return null;
      let G = B[0], Q = G.replace(/(.)\/+$/, "$1"), X = B.slice(1);
      return {
        params: k.reduce((te, ue, ce) => {
          if (ue === "*") {
            let se = X[ce] || "";
            Q = G.slice(0, G.length - se.length).replace(/(.)\/+$/, "$1");
          }
          return te[ue] = re(X[ce] || "", ue), te;
        }, {}),
        pathname: G,
        pathnameBase: Q,
        pattern: f
      };
    }
    r(q, "matchPath");
    function Z(f, b, A) {
      b === void 0 && (b = !1), A === void 0 && (A = !0), s(f === "*" || !f.endsWith("*") || f.endsWith("/*"), 'Route path "' + f + '" will \
be treated as if it were ' + ('"' + f.replace(/\*$/, "/*") + '" because the `*` character must ') + "always follow a `/` in the pattern. To \
get rid of this warning, " + ('please change the route path to "' + f.replace(/\*$/, "/*") + '".'));
      let k = [], B = "^" + f.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^$?{}|()[\]]/g, "\\$&").replace(/:(\w+)/g, (Q, X) => (k.
      push(X), "([^\\/]+)"));
      return f.endsWith("*") ? (k.push("*"), B += f === "*" || f === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$") : B += A ? "\\/*$" : (
        // Otherwise, at least match a word boundary. This restricts parent
        // routes to matching only their own words and nothing more, e.g. parent
        // route "/home" should not match "/home2".
        "(?:\\b|$)"
      ), [new RegExp(B, b ? void 0 : "i"), k];
    }
    r(Z, "compilePath");
    function re(f, b) {
      try {
        return decodeURIComponent(f);
      } catch (A) {
        return s(!1, 'The value for the URL param "' + b + '" will not be decoded because' + (' the string "' + f + '" is a malformed URL se\
gment. This is probably') + (" due to a bad percent encoding (" + A + ").")), f;
      }
    }
    r(re, "safelyDecodeURIComponent");
    function ae(f, b) {
      b === void 0 && (b = "/");
      let {
        pathname: A,
        search: k = "",
        hash: B = ""
      } = typeof f == "string" ? a.parsePath(f) : f;
      return {
        pathname: A ? A.startsWith("/") ? A : ie(A, b) : b,
        search: Lr(k),
        hash: Tr(B)
      };
    }
    r(ae, "resolvePath");
    function ie(f, b) {
      let A = b.replace(/\/+$/, "").split("/");
      return f.split("/").forEach((B) => {
        B === ".." ? A.length > 1 && A.pop() : B !== "." && A.push(B);
      }), A.length > 1 ? A.join("/") : "/";
    }
    r(ie, "resolvePathname");
    function $e(f, b, A) {
      let k = typeof f == "string" ? a.parsePath(f) : f, B = f === "" || k.pathname === "" ? "/" : k.pathname, G;
      if (B == null)
        G = A;
      else {
        let X = b.length - 1;
        if (B.startsWith("..")) {
          let ee = B.split("/");
          for (; ee[0] === ".."; )
            ee.shift(), X -= 1;
          k.pathname = ee.join("/");
        }
        G = X >= 0 ? b[X] : "/";
      }
      let Q = ae(k, G);
      return B && B !== "/" && B.endsWith("/") && !Q.pathname.endsWith("/") && (Q.pathname += "/"), Q;
    }
    r($e, "resolveTo");
    function _r(f) {
      return f === "" || f.pathname === "" ? "/" : typeof f == "string" ? a.parsePath(f).pathname : f.pathname;
    }
    r(_r, "getToPathname");
    function ct(f, b) {
      if (b === "/") return f;
      if (!f.toLowerCase().startsWith(b.toLowerCase()))
        return null;
      let A = f.charAt(b.length);
      return A && A !== "/" ? null : f.slice(b.length) || "/";
    }
    r(ct, "stripBasename");
    let ve = /* @__PURE__ */ r((f) => f.join("/").replace(/\/\/+/g, "/"), "joinPaths"), Nr = /* @__PURE__ */ r((f) => f.replace(/\/+$/, "").
    replace(/^\/*/, "/"), "normalizePathname"), Lr = /* @__PURE__ */ r((f) => !f || f === "?" ? "" : f.startsWith("?") ? f : "?" + f, "norma\
lizeSearch"), Tr = /* @__PURE__ */ r((f) => !f || f === "#" ? "" : f.startsWith("#") ? f : "#" + f, "normalizeHash");
    e.MemoryRouter = F, e.Navigate = x, e.Outlet = O, e.Route = w, e.Router = E, e.Routes = N, e.UNSAFE_LocationContext = U, e.UNSAFE_NavigationContext =
    D, e.UNSAFE_RouteContext = J, e.createRoutesFromChildren = L, e.generatePath = V, e.matchPath = q, e.matchRoutes = $, e.renderMatches = R,
    e.resolvePath = ae, e.useHref = u, e.useInRouterContext = i, e.useLocation = h, e.useMatch = y, e.useNavigate = S, e.useNavigationType =
    c, e.useOutlet = _, e.useParams = I, e.useResolvedPath = W, e.useRoutes = Y, Object.defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/react-router/main.js
var it = ne((Ca, xr) => {
  "use strict";
  xr.exports = process.env.NODE_ENV === "production" ? yr() : br();
});

// ../node_modules/react-router-dom/umd/react-router-dom.production.min.js
var Or = ne((He, Pr) => {
  (function(e, t) {
    typeof He == "object" && typeof Pr < "u" ? t(He, require("react"), Ee(), it()) : typeof define == "function" && define.amd ? define(["ex\
ports", "react", "history", "react-router"], t) : t((e = e || self).ReactRouterDOM = {}, e.React, e.HistoryLibrary, e.ReactRouter);
  })(He, function(e, t, a, n) {
    "use strict";
    function s() {
      return s = Object.assign || function(O) {
        for (var w = 1; w < arguments.length; w++) {
          var E = arguments[w];
          for (var N in E) Object.prototype.hasOwnProperty.call(E, N) && (O[N] = E[N]);
        }
        return O;
      }, s.apply(this, arguments);
    }
    r(s, "a");
    function v(O, w) {
      if (O == null) return {};
      var E, N, u = {}, i = Object.keys(O);
      for (N = 0; N < i.length; N++) E = i[N], w.indexOf(E) >= 0 || (u[E] = O[E]);
      return u;
    }
    r(v, "o");
    let z = ["onClick", "reloadDocument", "replace", "state", "target", "to"], D = ["aria-current", "caseSensitive", "className", "end", "st\
yle", "to"], U = t.forwardRef(function(O, w) {
      let { onClick: E, reloadDocument: N, replace: u = !1, state: i, target: h, to: c } = O, y = v(O, z), S = n.useHref(c), _ = F(c, { replace: u,
      state: i, target: h });
      return t.createElement("a", s({}, y, { href: S, onClick: /* @__PURE__ */ r(function(I) {
        E && E(I), I.defaultPrevented || N || _(I);
      }, "onClick"), ref: w, target: h }));
    }), J = t.forwardRef(function(O, w) {
      let { "aria-current": E = "page", caseSensitive: N = !1, className: u = "", end: i = !1, style: h, to: c } = O, y = v(O, D), S = n.useLocation(),
      _ = n.useResolvedPath(c), I = S.pathname, W = _.pathname;
      N || (I = I.toLowerCase(), W = W.toLowerCase());
      let Y, L = I === W || !i && I.startsWith(W) && I.charAt(W.length) === "/", V = L ? E : void 0;
      Y = typeof u == "function" ? u({ isActive: L }) : [u, L ? "active" : null].filter(Boolean).join(" ");
      let $ = typeof h == "function" ? h({ isActive: L }) : h;
      return t.createElement(U, s({}, y, { "aria-current": V, className: Y, ref: w, style: $, to: c }));
    });
    function F(O, w) {
      let { target: E, replace: N, state: u } = w === void 0 ? {} : w, i = n.useNavigate(), h = n.useLocation(), c = n.useResolvedPath(O);
      return t.useCallback((y) => {
        if (!(y.button !== 0 || E && E !== "_self" || function(S) {
          return !!(S.metaKey || S.altKey || S.ctrlKey || S.shiftKey);
        }(y))) {
          y.preventDefault();
          let S = !!N || a.createPath(h) === a.createPath(c);
          i(O, { replace: S, state: u });
        }
      }, [h, i, c, N, u, E, O]);
    }
    r(F, "l");
    function x(O) {
      return O === void 0 && (O = ""), new URLSearchParams(typeof O == "string" || Array.isArray(O) || O instanceof URLSearchParams ? O : Object.
      keys(O).reduce((w, E) => {
        let N = O[E];
        return w.concat(Array.isArray(N) ? N.map((u) => [E, u]) : [[E, N]]);
      }, []));
    }
    r(x, "f"), Object.defineProperty(e, "MemoryRouter", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.MemoryRouter;
    }, "get") }), Object.defineProperty(e, "Navigate", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.Navigate;
    }, "get") }), Object.defineProperty(e, "Outlet", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.Outlet;
    }, "get") }), Object.defineProperty(e, "Route", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.Route;
    }, "get") }), Object.defineProperty(e, "Router", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.Router;
    }, "get") }), Object.defineProperty(e, "Routes", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.Routes;
    }, "get") }), Object.defineProperty(e, "UNSAFE_LocationContext", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.UNSAFE_LocationContext;
    }, "get") }), Object.defineProperty(e, "UNSAFE_NavigationContext", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.UNSAFE_NavigationContext;
    }, "get") }), Object.defineProperty(e, "UNSAFE_RouteContext", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.UNSAFE_RouteContext;
    }, "get") }), Object.defineProperty(e, "createRoutesFromChildren", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.createRoutesFromChildren;
    }, "get") }), Object.defineProperty(e, "generatePath", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.generatePath;
    }, "get") }), Object.defineProperty(e, "matchPath", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.matchPath;
    }, "get") }), Object.defineProperty(e, "matchRoutes", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.matchRoutes;
    }, "get") }), Object.defineProperty(e, "renderMatches", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.renderMatches;
    }, "get") }), Object.defineProperty(e, "resolvePath", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.resolvePath;
    }, "get") }), Object.defineProperty(e, "useHref", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useHref;
    }, "get") }), Object.defineProperty(e, "useInRouterContext", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useInRouterContext;
    }, "get") }), Object.defineProperty(e, "useLocation", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useLocation;
    }, "get") }), Object.defineProperty(e, "useMatch", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useMatch;
    }, "get") }), Object.defineProperty(e, "useNavigate", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useNavigate;
    }, "get") }), Object.defineProperty(e, "useNavigationType", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useNavigationType;
    }, "get") }), Object.defineProperty(e, "useOutlet", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useOutlet;
    }, "get") }), Object.defineProperty(e, "useParams", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useParams;
    }, "get") }), Object.defineProperty(e, "useResolvedPath", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useResolvedPath;
    }, "get") }), Object.defineProperty(e, "useRoutes", { enumerable: !0, get: /* @__PURE__ */ r(function() {
      return n.useRoutes;
    }, "get") }), e.BrowserRouter = function(O) {
      let { basename: w, children: E, window: N } = O, u = t.useRef();
      u.current == null && (u.current = a.createBrowserHistory({ window: N }));
      let i = u.current, [h, c] = t.useState({ action: i.action, location: i.location });
      return t.useLayoutEffect(() => i.listen(c), [i]), t.createElement(n.Router, { basename: w, children: E, location: h.location, navigationType: h.
      action, navigator: i });
    }, e.HashRouter = function(O) {
      let { basename: w, children: E, window: N } = O, u = t.useRef();
      u.current == null && (u.current = a.createHashHistory({ window: N }));
      let i = u.current, [h, c] = t.useState({ action: i.action, location: i.location });
      return t.useLayoutEffect(() => i.listen(c), [i]), t.createElement(n.Router, { basename: w, children: E, location: h.location, navigationType: h.
      action, navigator: i });
    }, e.Link = U, e.NavLink = J, e.createSearchParams = x, e.useLinkClickHandler = F, e.useSearchParams = function(O) {
      let w = t.useRef(x(O)), E = n.useLocation(), N = t.useMemo(() => {
        let i = x(E.search);
        for (let h of w.current.keys()) i.has(h) || w.current.getAll(h).forEach((c) => {
          i.append(h, c);
        });
        return i;
      }, [E.search]), u = n.useNavigate();
      return [N, t.useCallback((i, h) => {
        u("?" + x(i), h);
      }, [u])];
    }, Object.defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/react-router-dom/umd/react-router-dom.development.js
var jr = ne((Fe, wr) => {
  (function(e, t) {
    typeof Fe == "object" && typeof wr < "u" ? t(Fe, require("react"), Ee(), it()) : typeof define == "function" && define.amd ? define(["ex\
ports", "react", "history", "react-router"], t) : (e = e || self, t(e.ReactRouterDOM = {}, e.React, e.HistoryLibrary, e.ReactRouter));
  })(Fe, function(e, t, a, n) {
    "use strict";
    function s() {
      return s = Object.assign || function(i) {
        for (var h = 1; h < arguments.length; h++) {
          var c = arguments[h];
          for (var y in c)
            Object.prototype.hasOwnProperty.call(c, y) && (i[y] = c[y]);
        }
        return i;
      }, s.apply(this, arguments);
    }
    r(s, "_extends");
    function v(i, h) {
      if (i == null) return {};
      var c = {}, y = Object.keys(i), S, _;
      for (_ = 0; _ < y.length; _++)
        S = y[_], !(h.indexOf(S) >= 0) && (c[S] = i[S]);
      return c;
    }
    r(v, "_objectWithoutPropertiesLoose");
    let z = ["onClick", "reloadDocument", "replace", "state", "target", "to"], D = ["aria-current", "caseSensitive", "className", "end", "st\
yle", "to"];
    function U(i, h) {
      if (!i) {
        typeof console < "u" && console.warn(h);
        try {
          throw new Error(h);
        } catch {
        }
      }
    }
    r(U, "warning");
    function J(i) {
      let {
        basename: h,
        children: c,
        window: y
      } = i, S = t.useRef();
      S.current == null && (S.current = a.createBrowserHistory({
        window: y
      }));
      let _ = S.current, [I, W] = t.useState({
        action: _.action,
        location: _.location
      });
      return t.useLayoutEffect(() => _.listen(W), [_]), /* @__PURE__ */ t.createElement(n.Router, {
        basename: h,
        children: c,
        location: I.location,
        navigationType: I.action,
        navigator: _
      });
    }
    r(J, "BrowserRouter");
    function F(i) {
      let {
        basename: h,
        children: c,
        window: y
      } = i, S = t.useRef();
      S.current == null && (S.current = a.createHashHistory({
        window: y
      }));
      let _ = S.current, [I, W] = t.useState({
        action: _.action,
        location: _.location
      });
      return t.useLayoutEffect(() => _.listen(W), [_]), /* @__PURE__ */ t.createElement(n.Router, {
        basename: h,
        children: c,
        location: I.location,
        navigationType: I.action,
        navigator: _
      });
    }
    r(F, "HashRouter");
    function x(i) {
      return !!(i.metaKey || i.altKey || i.ctrlKey || i.shiftKey);
    }
    r(x, "isModifiedEvent");
    let O = /* @__PURE__ */ t.forwardRef(/* @__PURE__ */ r(function(h, c) {
      let {
        onClick: y,
        reloadDocument: S,
        replace: _ = !1,
        state: I,
        target: W,
        to: Y
      } = h, L = v(h, z), V = n.useHref(Y), $ = E(Y, {
        replace: _,
        state: I,
        target: W
      });
      function j(P) {
        y && y(P), !P.defaultPrevented && !S && $(P);
      }
      return r(j, "handleClick"), // eslint-disable-next-line jsx-a11y/anchor-has-content
      /* @__PURE__ */ t.createElement("a", s({}, L, {
        href: V,
        onClick: j,
        ref: c,
        target: W
      }));
    }, "LinkWithRef"));
    O.displayName = "Link";
    let w = /* @__PURE__ */ t.forwardRef(/* @__PURE__ */ r(function(h, c) {
      let {
        "aria-current": y = "page",
        caseSensitive: S = !1,
        className: _ = "",
        end: I = !1,
        style: W,
        to: Y
      } = h, L = v(h, D), V = n.useLocation(), $ = n.useResolvedPath(Y), j = V.pathname, P = $.pathname;
      S || (j = j.toLowerCase(), P = P.toLowerCase());
      let H = j === P || !I && j.startsWith(P) && j.charAt(P.length) === "/", o = H ? y : void 0, l;
      typeof _ == "function" ? l = _({
        isActive: H
      }) : l = [_, H ? "active" : null].filter(Boolean).join(" ");
      let g = typeof W == "function" ? W({
        isActive: H
      }) : W;
      return /* @__PURE__ */ t.createElement(O, s({}, L, {
        "aria-current": o,
        className: l,
        ref: c,
        style: g,
        to: Y
      }));
    }, "NavLinkWithRef"));
    w.displayName = "NavLink";
    function E(i, h) {
      let {
        target: c,
        replace: y,
        state: S
      } = h === void 0 ? {} : h, _ = n.useNavigate(), I = n.useLocation(), W = n.useResolvedPath(i);
      return t.useCallback((Y) => {
        if (Y.button === 0 && // Ignore everything but left clicks
        (!c || c === "_self") && // Let browser handle "target=_blank" etc.
        !x(Y)) {
          Y.preventDefault();
          let L = !!y || a.createPath(I) === a.createPath(W);
          _(i, {
            replace: L,
            state: S
          });
        }
      }, [I, _, W, y, S, c, i]);
    }
    r(E, "useLinkClickHandler");
    function N(i) {
      U(typeof URLSearchParams < "u", "You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API.\
 If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params\n\nIf you're\
 unsure how to load polyfills, we recommend you check out https://polyfill.io/v3/ which provides some recommendations about how to load poly\
fills only for users that need them, instead of for every user.");
      let h = t.useRef(u(i)), c = n.useLocation(), y = t.useMemo(() => {
        let I = u(c.search);
        for (let W of h.current.keys())
          I.has(W) || h.current.getAll(W).forEach((Y) => {
            I.append(W, Y);
          });
        return I;
      }, [c.search]), S = n.useNavigate(), _ = t.useCallback((I, W) => {
        S("?" + u(I), W);
      }, [S]);
      return [y, _];
    }
    r(N, "useSearchParams");
    function u(i) {
      return i === void 0 && (i = ""), new URLSearchParams(typeof i == "string" || Array.isArray(i) || i instanceof URLSearchParams ? i : Object.
      keys(i).reduce((h, c) => {
        let y = i[c];
        return h.concat(Array.isArray(y) ? y.map((S) => [c, S]) : [[c, y]]);
      }, []));
    }
    r(u, "createSearchParams"), Object.defineProperty(e, "MemoryRouter", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.MemoryRouter;
      }, "get")
    }), Object.defineProperty(e, "Navigate", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.Navigate;
      }, "get")
    }), Object.defineProperty(e, "Outlet", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.Outlet;
      }, "get")
    }), Object.defineProperty(e, "Route", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.Route;
      }, "get")
    }), Object.defineProperty(e, "Router", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.Router;
      }, "get")
    }), Object.defineProperty(e, "Routes", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.Routes;
      }, "get")
    }), Object.defineProperty(e, "UNSAFE_LocationContext", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.UNSAFE_LocationContext;
      }, "get")
    }), Object.defineProperty(e, "UNSAFE_NavigationContext", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.UNSAFE_NavigationContext;
      }, "get")
    }), Object.defineProperty(e, "UNSAFE_RouteContext", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.UNSAFE_RouteContext;
      }, "get")
    }), Object.defineProperty(e, "createRoutesFromChildren", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.createRoutesFromChildren;
      }, "get")
    }), Object.defineProperty(e, "generatePath", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.generatePath;
      }, "get")
    }), Object.defineProperty(e, "matchPath", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.matchPath;
      }, "get")
    }), Object.defineProperty(e, "matchRoutes", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.matchRoutes;
      }, "get")
    }), Object.defineProperty(e, "renderMatches", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.renderMatches;
      }, "get")
    }), Object.defineProperty(e, "resolvePath", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.resolvePath;
      }, "get")
    }), Object.defineProperty(e, "useHref", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useHref;
      }, "get")
    }), Object.defineProperty(e, "useInRouterContext", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useInRouterContext;
      }, "get")
    }), Object.defineProperty(e, "useLocation", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useLocation;
      }, "get")
    }), Object.defineProperty(e, "useMatch", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useMatch;
      }, "get")
    }), Object.defineProperty(e, "useNavigate", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useNavigate;
      }, "get")
    }), Object.defineProperty(e, "useNavigationType", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useNavigationType;
      }, "get")
    }), Object.defineProperty(e, "useOutlet", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useOutlet;
      }, "get")
    }), Object.defineProperty(e, "useParams", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useParams;
      }, "get")
    }), Object.defineProperty(e, "useResolvedPath", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useResolvedPath;
      }, "get")
    }), Object.defineProperty(e, "useRoutes", {
      enumerable: !0,
      get: /* @__PURE__ */ r(function() {
        return n.useRoutes;
      }, "get")
    }), e.BrowserRouter = J, e.HashRouter = F, e.Link = O, e.NavLink = w, e.createSearchParams = u, e.useLinkClickHandler = E, e.useSearchParams =
    N, Object.defineProperty(e, "__esModule", { value: !0 });
  });
});

// ../node_modules/react-router-dom/main.js
var Rr = ne((La, Sr) => {
  "use strict";
  Sr.exports = process.env.NODE_ENV === "production" ? Or() : jr();
});

// src/router/index.ts
var Mn = {};
Wr(Mn, {
  BaseLocationProvider: () => Tn,
  DEEPLY_EQUAL: () => Re,
  Link: () => Er,
  Location: () => ut,
  LocationProvider: () => Ln,
  Match: () => lt,
  Route: () => Cr,
  buildArgsParam: () => xn,
  deepDiff: () => Me,
  getMatch: () => nt,
  parsePath: () => tt,
  queryFromLocation: () => rt,
  stringifyQuery: () => On,
  useNavigate: () => Nn
});
module.exports = Hr(Mn);

// src/router/utils.ts
var or = require("@storybook/core/client-logger");

// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function me(e) {
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
r(me, "isPlainObject");

// ../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var pt = "[object RegExp]", dt = "[object String]", mt = "[object Number]", gt = "[object Boolean]", ze = "[object Arguments]", yt = "[objec\
t Symbol]", vt = "[object Date]", bt = "[object Map]", xt = "[object Set]", Pt = "[object Array]", Ot = "[object Function]", wt = "[object A\
rrayBuffer]", Ce = "[object Object]", jt = "[object Error]", St = "[object DataView]", Rt = "[object Uint8Array]", At = "[object Uint8Clampe\
dArray]", Et = "[object Uint16Array]", Ct = "[object Uint32Array]", _t = "[object BigUint64Array]", Nt = "[object Int8Array]", Lt = "[object\
 Int16Array]", Tt = "[object Int32Array]", Mt = "[object BigInt64Array]", kt = "[object Float32Array]", It = "[object Float64Array]";

// ../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function qe(e) {
  return Object.getOwnPropertySymbols(e).filter((t) => Object.prototype.propertyIsEnumerable.call(e, t));
}
r(qe, "getSymbols");

// ../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function Ue(e) {
  return e == null ? e === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(e);
}
r(Ue, "getTag");

// ../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function Ve(e, t) {
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
        return ge(e, t);
    }
  return ge(e, t);
}
r(Ve, "isEqual");
function ge(e, t, a) {
  if (Object.is(e, t))
    return !0;
  let n = Ue(e), s = Ue(t);
  if (n === ze && (n = Ce), s === ze && (s = Ce), n !== s)
    return !1;
  switch (n) {
    case dt:
      return e.toString() === t.toString();
    case mt: {
      let D = e.valueOf(), U = t.valueOf();
      return D === U || Number.isNaN(D) && Number.isNaN(U);
    }
    case gt:
    case vt:
    case yt:
      return Object.is(e.valueOf(), t.valueOf());
    case pt:
      return e.source === t.source && e.flags === t.flags;
    case Ot:
      return e === t;
  }
  a = a ?? /* @__PURE__ */ new Map();
  let v = a.get(e), z = a.get(t);
  if (v != null && z != null)
    return v === t;
  a.set(e, t), a.set(t, e);
  try {
    switch (n) {
      case bt: {
        if (e.size !== t.size)
          return !1;
        for (let [D, U] of e.entries())
          if (!t.has(D) || !ge(U, t.get(D), a))
            return !1;
        return !0;
      }
      case xt: {
        if (e.size !== t.size)
          return !1;
        let D = Array.from(e.values()), U = Array.from(t.values());
        for (let J = 0; J < D.length; J++) {
          let F = D[J], x = U.findIndex((O) => ge(F, O, a));
          if (x === -1)
            return !1;
          U.splice(x, 1);
        }
        return !0;
      }
      case Pt:
      case Rt:
      case At:
      case Et:
      case Ct:
      case _t:
      case Nt:
      case Lt:
      case Tt:
      case Mt:
      case kt:
      case It: {
        if (typeof Buffer < "u" && Buffer.isBuffer(e) !== Buffer.isBuffer(t) || e.length !== t.length)
          return !1;
        for (let D = 0; D < e.length; D++)
          if (!ge(e[D], t[D], a))
            return !1;
        return !0;
      }
      case wt:
        return e.byteLength !== t.byteLength ? !1 : ge(new Uint8Array(e), new Uint8Array(t), a);
      case St:
        return e.byteLength !== t.byteLength || e.byteOffset !== t.byteOffset ? !1 : ge(e.buffer, t.buffer, a);
      case jt:
        return e.name === t.name && e.message === t.message;
      case Ce: {
        if (!(ge(e.constructor, t.constructor, a) || me(e) && me(t)))
          return !1;
        let U = [...Object.keys(e), ...qe(e)], J = [...Object.keys(t), ...qe(t)];
        if (U.length !== J.length)
          return !1;
        for (let F = 0; F < U.length; F++) {
          let x = U[F], O = e[x];
          if (!Object.prototype.hasOwnProperty.call(t, x))
            return !1;
          let w = t[x];
          if (!ge(O, w, a))
            return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    a.delete(e), a.delete(t);
  }
}
r(ge, "areObjectsEqual");

// src/router/utils.ts
var ke = we(zt(), 1), Ae = we(tr(), 1), ir = we(nr(), 1);
var gn = /\/([^/]+)\/(?:(.*)_)?([^/]+)?/, tt = (0, ke.default)(1e3)((e) => {
  let t = {
    viewMode: void 0,
    storyId: void 0,
    refId: void 0
  };
  if (e) {
    let [, a, n, s] = e.toLowerCase().match(gn) || [];
    a && Object.assign(t, {
      viewMode: a,
      storyId: s,
      refId: n
    });
  }
  return t;
}), Re = Symbol("Deeply equal"), Me = /* @__PURE__ */ r((e, t) => {
  if (typeof e != typeof t)
    return t;
  if (Ve(e, t))
    return Re;
  if (Array.isArray(e) && Array.isArray(t)) {
    let a = t.reduce((n, s, v) => {
      let z = Me(e[v], s);
      return z !== Re && (n[v] = z), n;
    }, new Array(t.length));
    return t.length >= e.length ? a : a.concat(new Array(e.length - t.length).fill(void 0));
  }
  return me(e) && me(t) ? Object.keys({ ...e, ...t }).reduce((a, n) => {
    let s = Me(e?.[n], t?.[n]);
    return s === Re ? a : Object.assign(a, { [n]: s });
  }, {}) : t;
}, "deepDiff"), ar = /^[a-zA-Z0-9 _-]*$/, yn = /^-?[0-9]+(\.[0-9]+)?$/, sr = /^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i, ur = /^(rgba?|hsla?)\(([0-9]{1,3}),\s?([0-9]{1,3})%?,\s?([0-9]{1,3})%?,?\s?([0-9](\.[0-9]{1,2})?)?\)$/i,
Ze = /* @__PURE__ */ r((e = "", t) => e === null || e === "" || !ar.test(e) ? !1 : t == null || t instanceof Date || typeof t == "number" ||
typeof t == "boolean" ? !0 : typeof t == "string" ? ar.test(t) || yn.test(t) || sr.test(t) || ur.test(t) : Array.isArray(t) ? t.every((a) => Ze(
e, a)) : me(t) ? Object.entries(t).every(([a, n]) => Ze(a, n)) : !1, "validateArgs"), et = /* @__PURE__ */ r((e) => e === void 0 ? "!undefin\
ed" : e === null ? "!null" : typeof e == "string" ? sr.test(e) ? `!hex(${e.slice(1)})` : ur.test(e) ? `!${e.replace(/[\s%]/g, "")}` : e : typeof e ==
"boolean" ? `!${e}` : e instanceof Date ? `!date(${e.toISOString()})` : Array.isArray(e) ? e.map(et) : me(e) ? Object.entries(e).reduce(
  (t, [a, n]) => Object.assign(t, { [a]: et(n) }),
  {}
) : e, "encodeSpecialValues"), vn = /* @__PURE__ */ r((e) => {
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
}, "decodeKnownQueryChar"), bn = /%[0-9A-F]{2}/g, xn = /* @__PURE__ */ r((e, t) => {
  let a = Me(e, t);
  if (!a || a === Re)
    return "";
  let n = Object.entries(a).reduce((s, [v, z]) => Ze(v, z) ? Object.assign(s, { [v]: z }) : (or.once.warn(ir.dedent`
      Omitted potentially unsafe URL args.

      More info: https://storybook.js.org/docs/writing-stories/args#setting-args-through-the-url
    `), s), {});
  return (0, Ae.stringify)(et(n), {
    delimiter: ";",
    // we don't actually create multiple query params
    nesting: !0,
    nestingSyntax: "js"
    // encode objects using dot notation: obj.key=val
  }).replace(bn, vn).split(";").map((s) => s.replace("=", ":")).join(";");
}, "buildArgsParam"), Pn = (0, ke.default)(1e3)((e) => e !== void 0 ? (0, Ae.parse)(e) : {}), rt = /* @__PURE__ */ r((e) => Pn(e.search ? e.
search.slice(1) : ""), "queryFromLocation"), On = /* @__PURE__ */ r((e) => {
  let t = (0, Ae.stringify)(e);
  return t ? "?" + t : "";
}, "stringifyQuery"), nt = (0, ke.default)(1e3)((e, t, a = !0) => {
  if (a) {
    if (typeof t != "string")
      throw new Error("startsWith only works with string targets");
    return e && e.startsWith(t) ? { path: e } : null;
  }
  let n = typeof t == "string" && e === t, s = e && t && e.match(t);
  return n || s ? { path: e } : null;
});

// src/router/router.tsx
var xe = we(require("react"), 1), Ar = we(fr(), 1), de = we(Rr(), 1);
var { document: st } = Ar.global, _n = /* @__PURE__ */ r(() => `${st.location.pathname}?`, "getBase"), Nn = /* @__PURE__ */ r(() => {
  let e = de.useNavigate();
  return (0, xe.useCallback)((t, { plain: a, ...n } = {}) => {
    if (typeof t == "string" && t.startsWith("#")) {
      t === "#" ? e(st.location.search) : st.location.hash = t;
      return;
    }
    if (typeof t == "string") {
      let s = a ? t : `?path=${t}`;
      return e(s, n);
    }
    if (typeof t == "number")
      return e(t);
  }, []);
}, "useNavigate"), Er = /* @__PURE__ */ r(({ to: e, children: t, ...a }) => /* @__PURE__ */ xe.default.createElement(de.Link, { to: `${_n()}\
path=${e}`, ...a }, t), "Link");
Er.displayName = "QueryLink";
var ut = /* @__PURE__ */ r(({ children: e }) => {
  let t = de.useLocation(), { path: a, singleStory: n } = rt(t), { viewMode: s, storyId: v, refId: z } = tt(a);
  return /* @__PURE__ */ xe.default.createElement(xe.default.Fragment, null, e({
    path: a || "/",
    location: t,
    viewMode: s,
    storyId: v,
    refId: z,
    singleStory: n === "true"
  }));
}, "Location");
ut.displayName = "QueryLocation";
function lt({
  children: e,
  path: t,
  startsWith: a = !1
}) {
  return /* @__PURE__ */ xe.default.createElement(ut, null, ({ path: n, ...s }) => e({
    match: nt(n, t, a),
    ...s
  }));
}
r(lt, "Match");
lt.displayName = "QueryMatch";
function Cr(e) {
  let { children: t, ...a } = e;
  return a.startsWith === void 0 && (a.startsWith = !1), /* @__PURE__ */ xe.default.createElement(lt, { ...a }, ({ match: s }) => s ? t : null);
}
r(Cr, "Route");
Cr.displayName = "Route";
var Ln = /* @__PURE__ */ r((...e) => de.BrowserRouter(...e), "LocationProvider"), Tn = /* @__PURE__ */ r((...e) => de.Router(...e), "BaseLoc\
ationProvider");
