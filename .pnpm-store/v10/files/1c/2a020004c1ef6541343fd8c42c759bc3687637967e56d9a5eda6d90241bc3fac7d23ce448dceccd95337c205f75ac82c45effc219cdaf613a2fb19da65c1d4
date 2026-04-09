var Dr = Object.create;
var Ce = Object.defineProperty;
var Nr = Object.getOwnPropertyDescriptor;
var kr = Object.getOwnPropertyNames;
var Ur = Object.getPrototypeOf, jr = Object.prototype.hasOwnProperty;
var n = (e, t) => Ce(e, "name", { value: t, configurable: !0 }), ve = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(e, {
  get: (t, r) => (typeof require < "u" ? require : t)[r]
}) : e)(function(e) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + e + '" is not supported');
});
var e0 = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), L = (e, t) => {
  for (var r in t)
    Ce(e, r, { get: t[r], enumerable: !0 });
}, Fr = (e, t, r, a) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of kr(t))
      !jr.call(e, o) && o !== r && Ce(e, o, { get: () => t[o], enumerable: !(a = Nr(t, o)) || a.enumerable });
  return e;
};
var ze = (e, t, r) => (r = e != null ? Dr(Ur(e)) : {}, Fr(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !e || !e.__esModule ? Ce(r, "default", { value: e, enumerable: !0 }) : r,
  e
));

// ../node_modules/memoizerific/memoizerific.js
var Be = e0((D0, pt) => {
  (function(e) {
    if (typeof D0 == "object" && typeof pt < "u")
      pt.exports = e();
    else if (typeof define == "function" && define.amd)
      define([], e);
    else {
      var t;
      typeof window < "u" ? t = window : typeof global < "u" ? t = global : typeof self < "u" ? t = self : t = this, t.memoizerific = e();
    }
  })(function() {
    var e, t, r;
    return (/* @__PURE__ */ n(function a(o, l, c) {
      function i(h, u) {
        if (!l[h]) {
          if (!o[h]) {
            var p = typeof ve == "function" && ve;
            if (!u && p) return p(h, !0);
            if (s) return s(h, !0);
            var v = new Error("Cannot find module '" + h + "'");
            throw v.code = "MODULE_NOT_FOUND", v;
          }
          var m = l[h] = { exports: {} };
          o[h][0].call(m.exports, function(g) {
            var w = o[h][1][g];
            return i(w || g);
          }, m, m.exports, a, o, l, c);
        }
        return l[h].exports;
      }
      n(i, "s");
      for (var s = typeof ve == "function" && ve, d = 0; d < c.length; d++) i(c[d]);
      return i;
    }, "e"))({ 1: [function(a, o, l) {
      o.exports = function(c) {
        if (typeof Map != "function" || c) {
          var i = a("./similar");
          return new i();
        } else
          return /* @__PURE__ */ new Map();
      };
    }, { "./similar": 2 }], 2: [function(a, o, l) {
      function c() {
        return this.list = [], this.lastItem = void 0, this.size = 0, this;
      }
      n(c, "Similar"), c.prototype.get = function(i) {
        var s;
        if (this.lastItem && this.isEqual(this.lastItem.key, i))
          return this.lastItem.val;
        if (s = this.indexOf(i), s >= 0)
          return this.lastItem = this.list[s], this.list[s].val;
      }, c.prototype.set = function(i, s) {
        var d;
        return this.lastItem && this.isEqual(this.lastItem.key, i) ? (this.lastItem.val = s, this) : (d = this.indexOf(i), d >= 0 ? (this.lastItem =
        this.list[d], this.list[d].val = s, this) : (this.lastItem = { key: i, val: s }, this.list.push(this.lastItem), this.size++, this));
      }, c.prototype.delete = function(i) {
        var s;
        if (this.lastItem && this.isEqual(this.lastItem.key, i) && (this.lastItem = void 0), s = this.indexOf(i), s >= 0)
          return this.size--, this.list.splice(s, 1)[0];
      }, c.prototype.has = function(i) {
        var s;
        return this.lastItem && this.isEqual(this.lastItem.key, i) ? !0 : (s = this.indexOf(i), s >= 0 ? (this.lastItem = this.list[s], !0) :
        !1);
      }, c.prototype.forEach = function(i, s) {
        var d;
        for (d = 0; d < this.size; d++)
          i.call(s || this, this.list[d].val, this.list[d].key, this);
      }, c.prototype.indexOf = function(i) {
        var s;
        for (s = 0; s < this.size; s++)
          if (this.isEqual(this.list[s].key, i))
            return s;
        return -1;
      }, c.prototype.isEqual = function(i, s) {
        return i === s || i !== i && s !== s;
      }, o.exports = c;
    }, {}], 3: [function(a, o, l) {
      var c = a("map-or-similar");
      o.exports = function(h) {
        var u = new c(!1), p = [];
        return function(v) {
          var m = /* @__PURE__ */ n(function() {
            var g = u, w, y, S = arguments.length - 1, E = Array(S + 1), A = !0, x;
            if ((m.numArgs || m.numArgs === 0) && m.numArgs !== S + 1)
              throw new Error("Memoizerific functions should always be called with the same number of arguments");
            for (x = 0; x < S; x++) {
              if (E[x] = {
                cacheItem: g,
                arg: arguments[x]
              }, g.has(arguments[x])) {
                g = g.get(arguments[x]);
                continue;
              }
              A = !1, w = new c(!1), g.set(arguments[x], w), g = w;
            }
            return A && (g.has(arguments[S]) ? y = g.get(arguments[S]) : A = !1), A || (y = v.apply(null, arguments), g.set(arguments[S], y)),
            h > 0 && (E[S] = {
              cacheItem: g,
              arg: arguments[S]
            }, A ? i(p, E) : p.push(E), p.length > h && s(p.shift())), m.wasMemoized = A, m.numArgs = S + 1, y;
          }, "memoizerific");
          return m.limit = h, m.wasMemoized = !1, m.cache = u, m.lru = p, m;
        };
      };
      function i(h, u) {
        var p = h.length, v = u.length, m, g, w;
        for (g = 0; g < p; g++) {
          for (m = !0, w = 0; w < v; w++)
            if (!d(h[g][w].arg, u[w].arg)) {
              m = !1;
              break;
            }
          if (m)
            break;
        }
        h.push(h.splice(g, 1)[0]);
      }
      n(i, "moveToMostRecentLru");
      function s(h) {
        var u = h.length, p = h[u - 1], v, m;
        for (p.cacheItem.delete(p.arg), m = u - 2; m >= 0 && (p = h[m], v = p.cacheItem.get(p.arg), !v || !v.size); m--)
          p.cacheItem.delete(p.arg);
      }
      n(s, "removeCachedResult");
      function d(h, u) {
        return h === u || h !== h && u !== u;
      }
      n(d, "isEqual");
    }, { "map-or-similar": 1 }] }, {}, [3])(3);
  });
});

// ../node_modules/store2/dist/store2.js
var ir = e0((ke, Ue) => {
  (function(e, t) {
    var r = {
      version: "2.14.2",
      areas: {},
      apis: {},
      nsdelim: ".",
      // utilities
      inherit: /* @__PURE__ */ n(function(o, l) {
        for (var c in o)
          l.hasOwnProperty(c) || Object.defineProperty(l, c, Object.getOwnPropertyDescriptor(o, c));
        return l;
      }, "inherit"),
      stringify: /* @__PURE__ */ n(function(o, l) {
        return o === void 0 || typeof o == "function" ? o + "" : JSON.stringify(o, l || r.replace);
      }, "stringify"),
      parse: /* @__PURE__ */ n(function(o, l) {
        try {
          return JSON.parse(o, l || r.revive);
        } catch {
          return o;
        }
      }, "parse"),
      // extension hooks
      fn: /* @__PURE__ */ n(function(o, l) {
        r.storeAPI[o] = l;
        for (var c in r.apis)
          r.apis[c][o] = l;
      }, "fn"),
      get: /* @__PURE__ */ n(function(o, l) {
        return o.getItem(l);
      }, "get"),
      set: /* @__PURE__ */ n(function(o, l, c) {
        o.setItem(l, c);
      }, "set"),
      remove: /* @__PURE__ */ n(function(o, l) {
        o.removeItem(l);
      }, "remove"),
      key: /* @__PURE__ */ n(function(o, l) {
        return o.key(l);
      }, "key"),
      length: /* @__PURE__ */ n(function(o) {
        return o.length;
      }, "length"),
      clear: /* @__PURE__ */ n(function(o) {
        o.clear();
      }, "clear"),
      // core functions
      Store: /* @__PURE__ */ n(function(o, l, c) {
        var i = r.inherit(r.storeAPI, function(d, h, u) {
          return arguments.length === 0 ? i.getAll() : typeof h == "function" ? i.transact(d, h, u) : h !== void 0 ? i.set(d, h, u) : typeof d ==
          "string" || typeof d == "number" ? i.get(d) : typeof d == "function" ? i.each(d) : d ? i.setAll(d, h) : i.clear();
        });
        i._id = o;
        try {
          var s = "__store2_test";
          l.setItem(s, "ok"), i._area = l, l.removeItem(s);
        } catch {
          i._area = r.storage("fake");
        }
        return i._ns = c || "", r.areas[o] || (r.areas[o] = i._area), r.apis[i._ns + i._id] || (r.apis[i._ns + i._id] = i), i;
      }, "Store"),
      storeAPI: {
        // admin functions
        area: /* @__PURE__ */ n(function(o, l) {
          var c = this[o];
          return (!c || !c.area) && (c = r.Store(o, l, this._ns), this[o] || (this[o] = c)), c;
        }, "area"),
        namespace: /* @__PURE__ */ n(function(o, l, c) {
          if (c = c || this._delim || r.nsdelim, !o)
            return this._ns ? this._ns.substring(0, this._ns.length - c.length) : "";
          var i = o, s = this[i];
          if ((!s || !s.namespace) && (s = r.Store(this._id, this._area, this._ns + i + c), s._delim = c, this[i] || (this[i] = s), !l))
            for (var d in r.areas)
              s.area(d, r.areas[d]);
          return s;
        }, "namespace"),
        isFake: /* @__PURE__ */ n(function(o) {
          return o ? (this._real = this._area, this._area = r.storage("fake")) : o === !1 && (this._area = this._real || this._area), this._area.
          name === "fake";
        }, "isFake"),
        toString: /* @__PURE__ */ n(function() {
          return "store" + (this._ns ? "." + this.namespace() : "") + "[" + this._id + "]";
        }, "toString"),
        // storage functions
        has: /* @__PURE__ */ n(function(o) {
          return this._area.has ? this._area.has(this._in(o)) : this._in(o) in this._area;
        }, "has"),
        size: /* @__PURE__ */ n(function() {
          return this.keys().length;
        }, "size"),
        each: /* @__PURE__ */ n(function(o, l) {
          for (var c = 0, i = r.length(this._area); c < i; c++) {
            var s = this._out(r.key(this._area, c));
            if (s !== void 0 && o.call(this, s, this.get(s), l) === !1)
              break;
            i > r.length(this._area) && (i--, c--);
          }
          return l || this;
        }, "each"),
        keys: /* @__PURE__ */ n(function(o) {
          return this.each(function(l, c, i) {
            i.push(l);
          }, o || []);
        }, "keys"),
        get: /* @__PURE__ */ n(function(o, l) {
          var c = r.get(this._area, this._in(o)), i;
          return typeof l == "function" && (i = l, l = null), c !== null ? r.parse(c, i) : l ?? c;
        }, "get"),
        getAll: /* @__PURE__ */ n(function(o) {
          return this.each(function(l, c, i) {
            i[l] = c;
          }, o || {});
        }, "getAll"),
        transact: /* @__PURE__ */ n(function(o, l, c) {
          var i = this.get(o, c), s = l(i);
          return this.set(o, s === void 0 ? i : s), this;
        }, "transact"),
        set: /* @__PURE__ */ n(function(o, l, c) {
          var i = this.get(o), s;
          return i != null && c === !1 ? l : (typeof c == "function" && (s = c, c = void 0), r.set(this._area, this._in(o), r.stringify(l, s),
          c) || i);
        }, "set"),
        setAll: /* @__PURE__ */ n(function(o, l) {
          var c, i;
          for (var s in o)
            i = o[s], this.set(s, i, l) !== i && (c = !0);
          return c;
        }, "setAll"),
        add: /* @__PURE__ */ n(function(o, l, c) {
          var i = this.get(o);
          if (i instanceof Array)
            l = i.concat(l);
          else if (i !== null) {
            var s = typeof i;
            if (s === typeof l && s === "object") {
              for (var d in l)
                i[d] = l[d];
              l = i;
            } else
              l = i + l;
          }
          return r.set(this._area, this._in(o), r.stringify(l, c)), l;
        }, "add"),
        remove: /* @__PURE__ */ n(function(o, l) {
          var c = this.get(o, l);
          return r.remove(this._area, this._in(o)), c;
        }, "remove"),
        clear: /* @__PURE__ */ n(function() {
          return this._ns ? this.each(function(o) {
            r.remove(this._area, this._in(o));
          }, 1) : r.clear(this._area), this;
        }, "clear"),
        clearAll: /* @__PURE__ */ n(function() {
          var o = this._area;
          for (var l in r.areas)
            r.areas.hasOwnProperty(l) && (this._area = r.areas[l], this.clear());
          return this._area = o, this;
        }, "clearAll"),
        // internal use functions
        _in: /* @__PURE__ */ n(function(o) {
          return typeof o != "string" && (o = r.stringify(o)), this._ns ? this._ns + o : o;
        }, "_in"),
        _out: /* @__PURE__ */ n(function(o) {
          return this._ns ? o && o.indexOf(this._ns) === 0 ? o.substring(this._ns.length) : void 0 : (
            // so each() knows to skip it
            o
          );
        }, "_out")
      },
      // end _.storeAPI
      storage: /* @__PURE__ */ n(function(o) {
        return r.inherit(r.storageAPI, { items: {}, name: o });
      }, "storage"),
      storageAPI: {
        length: 0,
        has: /* @__PURE__ */ n(function(o) {
          return this.items.hasOwnProperty(o);
        }, "has"),
        key: /* @__PURE__ */ n(function(o) {
          var l = 0;
          for (var c in this.items)
            if (this.has(c) && o === l++)
              return c;
        }, "key"),
        setItem: /* @__PURE__ */ n(function(o, l) {
          this.has(o) || this.length++, this.items[o] = l;
        }, "setItem"),
        removeItem: /* @__PURE__ */ n(function(o) {
          this.has(o) && (delete this.items[o], this.length--);
        }, "removeItem"),
        getItem: /* @__PURE__ */ n(function(o) {
          return this.has(o) ? this.items[o] : null;
        }, "getItem"),
        clear: /* @__PURE__ */ n(function() {
          for (var o in this.items)
            this.removeItem(o);
        }, "clear")
      }
      // end _.storageAPI
    }, a = (
      // safely set this up (throws error in IE10/32bit mode for local files)
      r.Store("local", function() {
        try {
          return localStorage;
        } catch {
        }
      }())
    );
    a.local = a, a._ = r, a.area("session", function() {
      try {
        return sessionStorage;
      } catch {
      }
    }()), a.area("page", r.storage("page")), typeof t == "function" && t.amd !== void 0 ? t("store2", [], function() {
      return a;
    }) : typeof Ue < "u" && Ue.exports ? Ue.exports = a : (e.store && (r.conflict = e.store), e.store = a);
  })(ke, ke && ke.define);
});

// src/manager-api/root.tsx
import de, {
  Component as po,
  Fragment as vo,
  useCallback as qe,
  useContext as Zt,
  useEffect as Or,
  useMemo as Xt,
  useRef as Tr
} from "react";
import { deprecate as Qt } from "@storybook/core/client-logger";
import {
  SET_STORIES as mo,
  SHARED_STATE_CHANGED as Hr,
  SHARED_STATE_SET as xe,
  STORY_CHANGED as go
} from "@storybook/core/core-events";

// ../node_modules/es-toolkit/dist/array/countBy.mjs
function Xe(e, t) {
  let r = {};
  for (let a = 0; a < e.length; a++) {
    let o = e[a], l = t(o);
    r[l] = (r[l] ?? 0) + 1;
  }
  return r;
}
n(Xe, "countBy");

// ../node_modules/es-toolkit/dist/array/partition.mjs
function Te(e, t) {
  let r = [], a = [];
  for (let o = 0; o < e.length; o++) {
    let l = e[o];
    t(l) ? r.push(l) : a.push(l);
  }
  return [r, a];
}
n(Te, "partition");

// ../node_modules/es-toolkit/dist/object/pick.mjs
function X(e, t) {
  let r = {};
  for (let a = 0; a < t.length; a++) {
    let o = t[a];
    Object.prototype.hasOwnProperty.call(e, o) && (r[o] = e[o]);
  }
  return r;
}
n(X, "pick");

// ../node_modules/es-toolkit/dist/predicate/isTypedArray.mjs
function t0(e) {
  return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
n(t0, "isTypedArray");

// ../node_modules/es-toolkit/dist/predicate/isPrimitive.mjs
function r0(e) {
  return e == null || typeof e != "object" && typeof e != "function";
}
n(r0, "isPrimitive");

// ../node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
function Ze(e) {
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
n(Ze, "isPlainObject");

// ../node_modules/es-toolkit/dist/object/mapValues.mjs
function et(e, t) {
  let r = {}, a = Object.keys(e);
  for (let o = 0; o < a.length; o++) {
    let l = a[o], c = e[l];
    r[l] = t(c, l, e);
  }
  return r;
}
n(et, "mapValues");

// ../node_modules/es-toolkit/dist/object/cloneDeep.mjs
function a0(e) {
  return te(e);
}
n(a0, "cloneDeep");
function te(e, t = /* @__PURE__ */ new Map()) {
  if (r0(e))
    return e;
  if (t.has(e))
    return t.get(e);
  if (Array.isArray(e)) {
    let r = new Array(e.length);
    t.set(e, r);
    for (let a = 0; a < e.length; a++)
      r[a] = te(e[a], t);
    return Object.prototype.hasOwnProperty.call(e, "index") && (r.index = e.index), Object.prototype.hasOwnProperty.call(e, "input") && (r.input =
    e.input), r;
  }
  if (e instanceof Date)
    return new Date(e.getTime());
  if (e instanceof RegExp) {
    let r = new RegExp(e.source, e.flags);
    return r.lastIndex = e.lastIndex, r;
  }
  if (e instanceof Map) {
    let r = /* @__PURE__ */ new Map();
    t.set(e, r);
    for (let [a, o] of e.entries())
      r.set(a, te(o, t));
    return r;
  }
  if (e instanceof Set) {
    let r = /* @__PURE__ */ new Set();
    t.set(e, r);
    for (let a of e.values())
      r.add(te(a, t));
    return r;
  }
  if (typeof Buffer < "u" && Buffer.isBuffer(e))
    return e.subarray();
  if (t0(e)) {
    let r = new (Object.getPrototypeOf(e)).constructor(e.length);
    t.set(e, r);
    for (let a = 0; a < e.length; a++)
      r[a] = te(e[a], t);
    return r;
  }
  if (e instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && e instanceof SharedArrayBuffer)
    return e.slice(0);
  if (e instanceof DataView) {
    let r = new DataView(e.buffer.slice(0), e.byteOffset, e.byteLength);
    return t.set(e, r), me(r, e, t), r;
  }
  if (typeof File < "u" && e instanceof File) {
    let r = new File([e], e.name, { type: e.type });
    return t.set(e, r), me(r, e, t), r;
  }
  if (e instanceof Blob) {
    let r = new Blob([e], { type: e.type });
    return t.set(e, r), me(r, e, t), r;
  }
  if (e instanceof Error) {
    let r = new e.constructor();
    return t.set(e, r), r.message = e.message, r.name = e.name, r.stack = e.stack, r.cause = e.cause, me(r, e, t), r;
  }
  if (typeof e == "object" && e !== null) {
    let r = {};
    return t.set(e, r), me(r, e, t), r;
  }
  return e;
}
n(te, "cloneDeepImpl");
function me(e, t, r) {
  let a = Object.keys(t);
  for (let o = 0; o < a.length; o++) {
    let l = a[o], c = Object.getOwnPropertyDescriptor(t, l);
    (c?.writable || c?.set) && (e[l] = te(t[l], r));
  }
}
n(me, "copyProperties");

// ../node_modules/es-toolkit/dist/compat/predicate/isObjectLike.mjs
function re(e) {
  return typeof e == "object" && e !== null;
}
n(re, "isObjectLike");

// ../node_modules/es-toolkit/dist/object/merge.mjs
function He(e, t) {
  let r = Object.keys(t);
  for (let a = 0; a < r.length; a++) {
    let o = r[a], l = t[o], c = e[o];
    Array.isArray(l) ? e[o] = He(c ?? [], l) : re(c) && re(l) ? e[o] = He(c ?? {}, l) : (c === void 0 || l !== void 0) && (e[o] = l);
  }
  return e;
}
n(He, "merge");

// ../node_modules/es-toolkit/dist/object/toMerged.mjs
function ge(e, t) {
  return He(a0(e), t);
}
n(ge, "toMerged");

// ../node_modules/es-toolkit/dist/object/mergeWith.mjs
function Y(e, t, r) {
  let a = Object.keys(t);
  for (let o = 0; o < a.length; o++) {
    let l = a[o], c = t[l], i = e[l], s = r(i, c, l, e, t);
    s != null ? e[l] = s : Array.isArray(c) ? e[l] = Y(i ?? [], c, r) : re(i) && re(c) ? e[l] = Y(i ?? {}, c, r) : (i === void 0 || c !== void 0) &&
    (e[l] = c);
  }
  return e;
}
n(Y, "mergeWith");

// ../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var n0 = "[object RegExp]", o0 = "[object String]", l0 = "[object Number]", i0 = "[object Boolean]", tt = "[object Arguments]", s0 = "[objec\
t Symbol]", c0 = "[object Date]", f0 = "[object Map]", d0 = "[object Set]", h0 = "[object Array]", u0 = "[object Function]", p0 = "[object A\
rrayBuffer]", Le = "[object Object]", v0 = "[object Error]", m0 = "[object DataView]", g0 = "[object Uint8Array]", w0 = "[object Uint8Clampe\
dArray]", y0 = "[object Uint16Array]", R0 = "[object Uint32Array]", S0 = "[object BigUint64Array]", E0 = "[object Int8Array]", I0 = "[object\
 Int16Array]", x0 = "[object Int32Array]", A0 = "[object BigInt64Array]", P0 = "[object Float32Array]", b0 = "[object Float64Array]";

// ../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function rt(e) {
  return Object.getOwnPropertySymbols(e).filter((t) => Object.prototype.propertyIsEnumerable.call(e, t));
}
n(rt, "getSymbols");

// ../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function at(e) {
  return e == null ? e === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(e);
}
n(at, "getTag");

// ../node_modules/es-toolkit/dist/predicate/isEqual.mjs
function O(e, t) {
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
        return q(e, t);
    }
  return q(e, t);
}
n(O, "isEqual");
function q(e, t, r) {
  if (Object.is(e, t))
    return !0;
  let a = at(e), o = at(t);
  if (a === tt && (a = Le), o === tt && (o = Le), a !== o)
    return !1;
  switch (a) {
    case o0:
      return e.toString() === t.toString();
    case l0: {
      let i = e.valueOf(), s = t.valueOf();
      return i === s || Number.isNaN(i) && Number.isNaN(s);
    }
    case i0:
    case c0:
    case s0:
      return Object.is(e.valueOf(), t.valueOf());
    case n0:
      return e.source === t.source && e.flags === t.flags;
    case u0:
      return e === t;
  }
  r = r ?? /* @__PURE__ */ new Map();
  let l = r.get(e), c = r.get(t);
  if (l != null && c != null)
    return l === t;
  r.set(e, t), r.set(t, e);
  try {
    switch (a) {
      case f0: {
        if (e.size !== t.size)
          return !1;
        for (let [i, s] of e.entries())
          if (!t.has(i) || !q(s, t.get(i), r))
            return !1;
        return !0;
      }
      case d0: {
        if (e.size !== t.size)
          return !1;
        let i = Array.from(e.values()), s = Array.from(t.values());
        for (let d = 0; d < i.length; d++) {
          let h = i[d], u = s.findIndex((p) => q(h, p, r));
          if (u === -1)
            return !1;
          s.splice(u, 1);
        }
        return !0;
      }
      case h0:
      case g0:
      case w0:
      case y0:
      case R0:
      case S0:
      case E0:
      case I0:
      case x0:
      case A0:
      case P0:
      case b0: {
        if (typeof Buffer < "u" && Buffer.isBuffer(e) !== Buffer.isBuffer(t) || e.length !== t.length)
          return !1;
        for (let i = 0; i < e.length; i++)
          if (!q(e[i], t[i], r))
            return !1;
        return !0;
      }
      case p0:
        return e.byteLength !== t.byteLength ? !1 : q(new Uint8Array(e), new Uint8Array(t), r);
      case m0:
        return e.byteLength !== t.byteLength || e.byteOffset !== t.byteOffset ? !1 : q(e.buffer, t.buffer, r);
      case v0:
        return e.name === t.name && e.message === t.message;
      case Le: {
        if (!(q(e.constructor, t.constructor, r) || Ze(e) && Ze(t)))
          return !1;
        let s = [...Object.keys(e), ...rt(e)], d = [...Object.keys(t), ...rt(t)];
        if (s.length !== d.length)
          return !1;
        for (let h = 0; h < s.length; h++) {
          let u = s[h], p = e[u];
          if (!Object.prototype.hasOwnProperty.call(t, u))
            return !1;
          let v = t[u];
          if (!q(p, v, r))
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
n(q, "areObjectsEqual");

// src/manager-api/context.ts
import { createContext as Gr } from "react";
var _0 = /* @__PURE__ */ n(({ api: e, state: t }) => Gr({ api: e, state: t }), "createContext");

// src/manager-api/lib/merge.ts
import { logger as M0 } from "@storybook/core/client-logger";
var $ = /* @__PURE__ */ n((e, ...t) => {
  let r = {};
  r = Y({}, e, (a, o) => {
    if (Array.isArray(o) && Array.isArray(a))
      return o.forEach((l) => {
        a.find((i) => i === l || O(i, l)) || a.push(l);
      }), a;
    if (Array.isArray(a))
      return M0.log(["the types mismatch, picking", a]), a;
  });
  for (let a of t)
    r = Y(r, a, (o, l) => {
      if (Array.isArray(l) && Array.isArray(o))
        return l.forEach((c) => {
          o.find((s) => s === c || O(s, c)) || o.push(c);
        }), o;
      if (Array.isArray(o))
        return M0.log(["the types mismatch, picking", o]), o;
    });
  return r;
}, "default"), C0 = /* @__PURE__ */ n((e, ...t) => {
  let r = {};
  r = Y({}, e, (a, o) => {
    if (Array.isArray(o))
      return o;
  });
  for (let a of t)
    r = Y(r, a, (o, l) => {
      if (Array.isArray(l))
        return l;
    });
  return r;
}, "noArrayMerge");

// src/manager-api/initial-state.ts
var $r = /* @__PURE__ */ n((...e) => e.reduce((t, r) => $(t, r), {}), "main"), Oe = $r;

// src/manager-api/lib/addons.ts
import { Addon_TypesEnum as T0 } from "@storybook/core/types";

// ../node_modules/@storybook/global/dist/index.mjs
var P = (() => {
  let e;
  return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
  e = self : e = {}, e;
})();

// src/manager-api/lib/addons.ts
import { logger as Kr } from "@storybook/core/client-logger";
import { SET_CONFIG as z0 } from "@storybook/core/core-events";

// src/manager-api/lib/storybook-channel-mock.ts
import { Channel as Wr } from "@storybook/core/channels";
function nt() {
  let e = {
    setHandler: /* @__PURE__ */ n(() => {
    }, "setHandler"),
    send: /* @__PURE__ */ n(() => {
    }, "send")
  };
  return new Wr({ transport: e });
}
n(nt, "mockChannel");

// src/manager-api/lib/addons.ts
var it = class it {
  constructor() {
    this.loaders = {};
    this.elements = {};
    this.config = {};
    this.getChannel = /* @__PURE__ */ n(() => (this.channel || this.setChannel(nt()), this.channel), "getChannel");
    this.ready = /* @__PURE__ */ n(() => this.promise, "ready");
    this.hasChannel = /* @__PURE__ */ n(() => !!this.channel, "hasChannel");
    this.setChannel = /* @__PURE__ */ n((t) => {
      this.channel = t, this.resolve();
    }, "setChannel");
    this.setConfig = /* @__PURE__ */ n((t) => {
      Object.assign(this.config, t), this.hasChannel() ? this.getChannel().emit(z0, this.config) : this.ready().then((r) => {
        r.emit(z0, this.config);
      });
    }, "setConfig");
    this.getConfig = /* @__PURE__ */ n(() => this.config, "getConfig");
    /**
     * Registers an addon loader function.
     *
     * @param {string} id - The id of the addon loader.
     * @param {(api: API) => void} callback - The function that will be called to register the addon.
     * @returns {void}
     */
    this.register = /* @__PURE__ */ n((t, r) => {
      this.loaders[t] && Kr.warn(`${t} was loaded twice, this could have bad side-effects`), this.loaders[t] = r;
    }, "register");
    this.loadAddons = /* @__PURE__ */ n((t) => {
      Object.values(this.loaders).forEach((r) => r(t));
    }, "loadAddons");
    this.promise = new Promise((t) => {
      this.resolve = () => t(this.getChannel());
    });
  }
  getElements(t) {
    return this.elements[t] || (this.elements[t] = {}), this.elements[t];
  }
  /**
   * Adds an addon to the addon store.
   *
   * @param {string} id - The id of the addon.
   * @param {Addon_Type} addon - The addon to add.
   * @returns {void}
   */
  add(t, r) {
    let { type: a } = r, o = this.getElements(a);
    o[t] = { ...r, id: t };
  }
  experimental_getRegisteredAddons() {
    return Object.keys(this.loaders);
  }
};
n(it, "AddonStore");
var lt = it, ot = "__STORYBOOK_ADDONS_MANAGER";
function qr() {
  return P[ot] || (P[ot] = new lt()), P[ot];
}
n(qr, "getAddonsStore");
var Yr = qr();

// src/manager-api/modules/addons.ts
var ct = {};
L(ct, {
  ensurePanel: () => st,
  init: () => Jr
});
import { Addon_TypesEnum as H0 } from "@storybook/core/types";
function st(e, t, r) {
  let a = Object.keys(e);
  return a.indexOf(t) >= 0 ? t : a.length ? a[0] : r;
}
n(st, "ensurePanel");
var Jr = /* @__PURE__ */ n(({ provider: e, store: t, fullAPI: r }) => {
  let a = {
    getElements: /* @__PURE__ */ n((o) => e.getElements(o), "getElements"),
    getSelectedPanel: /* @__PURE__ */ n(() => {
      let { selectedPanel: o } = t.getState();
      return st(a.getElements(H0.PANEL), o, o);
    }, "getSelectedPanel"),
    setSelectedPanel: /* @__PURE__ */ n((o) => {
      t.setState({ selectedPanel: o }, { persistence: "session" });
    }, "setSelectedPanel"),
    setAddonState(o, l, c) {
      let i = typeof l == "function" ? l : () => l;
      return t.setState(
        (s) => ({ ...s, addons: { ...s.addons, [o]: i(s.addons[o]) } }),
        c
      ).then(() => a.getAddonState(o));
    },
    getAddonState: /* @__PURE__ */ n((o) => t.getState().addons[o] || globalThis?.STORYBOOK_ADDON_STATE[o], "getAddonState")
  };
  return {
    api: a,
    state: {
      selectedPanel: st(
        a.getElements(H0.PANEL),
        t.getState().selectedPanel
      ),
      addons: {}
    }
  };
}, "init");

// src/manager-api/modules/channel.ts
var ft = {};
L(ft, {
  init: () => Qr
});
var Qr = /* @__PURE__ */ n(({ provider: e }) => ({ api: {
  getChannel: /* @__PURE__ */ n(() => e.channel, "getChannel"),
  on: /* @__PURE__ */ n((r, a) => (e.channel?.on(r, a), () => e.channel?.off(r, a)), "on"),
  off: /* @__PURE__ */ n((r, a) => e.channel?.off(r, a), "off"),
  once: /* @__PURE__ */ n((r, a) => e.channel?.once(r, a), "once"),
  emit: /* @__PURE__ */ n((r, a, ...o) => {
    a?.options?.target && a.options.target !== "storybook-preview-iframe" && !a.options.target.startsWith("storybook-ref-") && (a.options.target =
    a.options.target !== "storybook_internal" ? `storybook-ref-${a.options.target}` : "storybook-preview-iframe"), e.channel?.emit(r, a, ...o);
  }, "emit")
}, state: {} }), "init");

// src/manager-api/modules/experimental_testmodule.ts
var ut = {};
L(ut, {
  init: () => aa
});
import { Addon_TypesEnum as Zr } from "@storybook/core/types";
import {
  TESTING_MODULE_CANCEL_TEST_RUN_REQUEST as ea,
  TESTING_MODULE_RUN_ALL_REQUEST as ta,
  TESTING_MODULE_RUN_REQUEST as L0
} from "@storybook/core/core-events";

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var Xr = !1, dt = "Invariant failed";
function ht(e, t) {
  if (!e) {
    if (Xr)
      throw new Error(dt);
    var r = typeof t == "function" ? t() : t, a = r ? "".concat(dt, ": ").concat(r) : dt;
    throw new Error(a);
  }
}
n(ht, "invariant");

// src/manager-api/modules/experimental_testmodule.ts
var ra = {
  details: {},
  cancellable: !1,
  cancelling: !1,
  running: !1,
  failed: !1,
  crashed: !1
}, aa = /* @__PURE__ */ n(({ store: e, fullAPI: t }) => {
  let r = {
    testProviders: e.getState().testProviders || {}
  }, a = {
    getTestProviderState(l) {
      let { testProviders: c } = e.getState();
      return c?.[l];
    },
    updateTestProviderState(l, c) {
      return e.setState(
        ({ testProviders: i }) => {
          let s = i[l], d = s.stateUpdater?.(s, c) ?? {
            ...s,
            ...c,
            details: { ...s.details, ...c.details }
          };
          return { testProviders: { ...i, [l]: d } };
        },
        { persistence: "session" }
      );
    },
    clearTestProviderState(l) {
      let c = {
        cancelling: !1,
        running: !1,
        failed: !1,
        crashed: !1,
        progress: void 0
      };
      return e.setState(
        ({ testProviders: i }) => ({ testProviders: { ...i, [l]: { ...i[l], ...c } } }),
        { persistence: "session" }
      );
    },
    runTestProvider(l, c) {
      let i = e.getState().index;
      ht(i, "The index is currently unavailable"), a.updateTestProviderState(l, {
        running: !0,
        failed: !1,
        crashed: !1,
        progress: void 0
      });
      let s = new URL("index.json", window.location.href).toString();
      if (!c?.entryId) {
        let p = {
          providerId: l,
          indexUrl: s
        };
        return t.emit(L0, p), t.emit(ta, { providerId: l }), () => a.cancelTestProvider(l);
      }
      let d = i[c.entryId];
      ht(d, `No entry found in the index for id '${c.entryId}'`);
      let h = /* @__PURE__ */ n((p, v = []) => {
        let m = i[p];
        return m.type === "story" ? v.push(m.id) : "children" in m && m.children.forEach((g) => h(g, v)), v;
      }, "findStories"), u = {
        providerId: l,
        indexUrl: s,
        storyIds: h(c.entryId)
      };
      return t.emit(L0, u), () => a.cancelTestProvider(l);
    },
    cancelTestProvider(l) {
      a.updateTestProviderState(l, { cancelling: !0 }), t.emit(ea, { providerId: l });
    }
  };
  return { init: /* @__PURE__ */ n(async () => {
    let l = Object.fromEntries(
      Object.entries(t.getElements(Zr.experimental_TEST_PROVIDER)).map(
        ([c, i]) => [
          c,
          {
            ...i,
            ...ra,
            ...r?.testProviders?.[c] || {},
            running: !1
          }
        ]
      )
    );
    e.setState({ testProviders: l }, { persistence: "session" });
  }, "initModule"), state: r, api: a };
}, "init");

// src/manager-api/modules/globals.ts
var yt = {};
L(yt, {
  init: () => ga
});
import { logger as Y0 } from "@storybook/core/client-logger";
import { GLOBALS_UPDATED as pa, SET_GLOBALS as va, UPDATE_GLOBALS as ma } from "@storybook/core/core-events";

// ../node_modules/dequal/dist/index.mjs
var O0 = Object.prototype.hasOwnProperty;
function B0(e, t, r) {
  for (r of e.keys())
    if (N(r, t)) return r;
}
n(B0, "find");
function N(e, t) {
  var r, a, o;
  if (e === t) return !0;
  if (e && t && (r = e.constructor) === t.constructor) {
    if (r === Date) return e.getTime() === t.getTime();
    if (r === RegExp) return e.toString() === t.toString();
    if (r === Array) {
      if ((a = e.length) === t.length)
        for (; a-- && N(e[a], t[a]); ) ;
      return a === -1;
    }
    if (r === Set) {
      if (e.size !== t.size)
        return !1;
      for (a of e)
        if (o = a, o && typeof o == "object" && (o = B0(t, o), !o) || !t.has(o)) return !1;
      return !0;
    }
    if (r === Map) {
      if (e.size !== t.size)
        return !1;
      for (a of e)
        if (o = a[0], o && typeof o == "object" && (o = B0(t, o), !o) || !N(a[1], t.get(o)))
          return !1;
      return !0;
    }
    if (r === ArrayBuffer)
      e = new Uint8Array(e), t = new Uint8Array(t);
    else if (r === DataView) {
      if ((a = e.byteLength) === t.byteLength)
        for (; a-- && e.getInt8(a) === t.getInt8(a); ) ;
      return a === -1;
    }
    if (ArrayBuffer.isView(e)) {
      if ((a = e.byteLength) === t.byteLength)
        for (; a-- && e[a] === t[a]; ) ;
      return a === -1;
    }
    if (!r || typeof e == "object") {
      a = 0;
      for (r in e)
        if (O0.call(e, r) && ++a && !O0.call(t, r) || !(r in t) || !N(e[r], t[r])) return !1;
      return Object.keys(t).length === a;
    }
  }
  return e !== e && t !== t;
}
n(N, "dequal");

// src/manager-api/lib/events.ts
import { logger as ua } from "@storybook/core/client-logger";

// src/manager-api/modules/refs.ts
var wt = {};
L(wt, {
  defaultStoryMapper: () => q0,
  getSourceType: () => gt,
  init: () => ha
});

// ../node_modules/ts-dedent/esm/index.js
function B(e) {
  for (var t = [], r = 1; r < arguments.length; r++)
    t[r - 1] = arguments[r];
  var a = Array.from(typeof e == "string" ? [e] : e);
  a[a.length - 1] = a[a.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var o = a.reduce(function(i, s) {
    var d = s.match(/\n([\t ]+|(?!\s).)/g);
    return d ? i.concat(d.map(function(h) {
      var u, p;
      return (p = (u = h.match(/[\t ]/g)) === null || u === void 0 ? void 0 : u.length) !== null && p !== void 0 ? p : 0;
    })) : i;
  }, []);
  if (o.length) {
    var l = new RegExp(`
[	 ]{` + Math.min.apply(Math, o) + "}", "g");
    a = a.map(function(i) {
      return i.replace(l, `
`);
    });
  }
  a[0] = a[0].replace(/^\r?\n/, "");
  var c = a[0];
  return t.forEach(function(i, s) {
    var d = c.match(/(?:^|\n)( *)$/), h = d ? d[1] : "", u = i;
    typeof i == "string" && i.includes(`
`) && (u = String(i).split(`
`).map(function(p, v) {
      return v === 0 ? p : "" + h + p;
    }).join(`
`)), c += u + a[s + 1];
  }), c;
}
n(B, "dedent");
var V0 = B;

// src/manager-api/lib/stories.ts
import { sanitize as na } from "@storybook/core/csf";
var vt = ze(Be(), 1);

// src/manager-api/lib/intersect.ts
var N0 = /* @__PURE__ */ n((e, t) => !Array.isArray(e) || !Array.isArray(t) || !e.length || !t.length ? [] : e.reduce((r, a) => (t.includes(
a) && r.push(a), r), []), "default");

// src/manager-api/lib/stories.ts
var oa = /\s*\/\s*/, k0 = /* @__PURE__ */ n(({
  globalParameters: e,
  kindParameters: t,
  stories: r
}) => et(r, (a) => ({
  ...a,
  parameters: G0(
    e,
    t[a.kind],
    a.parameters
  )
})), "denormalizeStoryParameters");
var U0 = /* @__PURE__ */ n((e) => ({ v: 5, entries: Object.entries(e).reduce(
  (r, [a, o]) => {
    if (!o)
      return r;
    let { docsOnly: l, fileName: c, ...i } = o.parameters, s = {
      title: o.kind,
      id: a,
      name: o.name,
      importPath: c
    };
    if (l)
      r[a] = {
        type: "docs",
        tags: ["stories-mdx"],
        storiesImports: [],
        ...s
      };
    else {
      let { argTypes: d, args: h, initialArgs: u } = o;
      r[a] = {
        type: "story",
        ...s,
        parameters: i,
        argTypes: d,
        args: h,
        initialArgs: u
      };
    }
    return r;
  },
  {}
) }), "transformSetStoriesStoryDataToPreparedStoryIndex"), la = /* @__PURE__ */ n((e) => ({
  v: 3,
  stories: Object.values(e.stories).reduce(
    (t, r) => (t[r.id] = {
      ...r,
      title: r.kind,
      name: r.name || r.story,
      importPath: r.parameters.fileName || ""
    }, t),
    {}
  )
}), "transformStoryIndexV2toV3"), ia = /* @__PURE__ */ n((e) => {
  let t = Xe(Object.values(e.stories), (r) => r.title);
  return {
    v: 4,
    entries: Object.values(e.stories).reduce(
      (r, a) => {
        let o = "story";
        return (a.parameters?.docsOnly || a.name === "Page" && t[a.title] === 1) && (o = "docs"), r[a.id] = {
          type: o,
          ...o === "docs" && { tags: ["stories-mdx"], storiesImports: [] },
          ...a
        }, delete r[a.id].story, delete r[a.id].kind, r;
      },
      {}
    )
  };
}, "transformStoryIndexV3toV4"), sa = /* @__PURE__ */ n((e) => ({
  v: 5,
  entries: Object.values(e.entries).reduce(
    (t, r) => (t[r.id] = {
      ...r,
      tags: r.tags ? ["dev", "test", ...r.tags] : ["dev"]
    }, t),
    {}
  )
}), "transformStoryIndexV4toV5"), ae = /* @__PURE__ */ n((e, { provider: t, docsOptions: r, filters: a, status: o }) => {
  if (!e.v)
    throw new Error("Composition: Missing stories.json version");
  let l = e;
  l = l.v === 2 ? la(l) : l, l = l.v === 3 ? ia(l) : l, l = l.v === 4 ? sa(l) : l, l = l;
  let c = Object.values(l.entries).filter((g) => {
    let w = !0, y = o[g.id];
    return Object.values(y ?? {}).some(({ status: S }) => S === "error") || Object.values(a).forEach((S) => {
      w !== !1 && (w = S({ ...g, status: y }));
    }), w;
  }), { sidebar: i = {} } = t.getConfig(), { showRoots: s, collapsedRoots: d = [], renderLabel: h } = i, u = typeof s < "u", p = c.reduce((g, w) => {
    if (r.docsMode && w.type !== "docs")
      return g;
    let { title: y } = w, S = y.trim().split(oa), E = (!u || s) && S.length > 1 ? [S.shift()] : [], A = [...E, ...S], x = A.reduce((I, M, F) => {
      let he = F > 0 && I[F - 1], ue = na(he ? `${he}-${M}` : M);
      if (M.trim() === "")
        throw new Error(B`Invalid title ${y} ending in slash.`);
      if (he === ue)
        throw new Error(
          B`
          Invalid part '${M}', leading to id === parentId ('${ue}'), inside title '${y}'
          
          Did you create a path that uses the separator char accidentally, such as 'Vue <docs/>' where '/' is a separator char? See https://github.com/storybookjs/storybook/issues/6128
          `
        );
      return I.push(ue), I;
    }, []);
    return x.forEach((I, M) => {
      let F = x[M + 1] || w.id;
      E.length && M === 0 ? g[I] = $(g[I] || {}, {
        type: "root",
        id: I,
        name: A[M],
        tags: [],
        depth: M,
        renderLabel: h,
        startCollapsed: d.includes(I),
        // Note that this will later get appended to the previous list of children (see below)
        children: [F]
      }) : (!g[I] || g[I].type === "component") && M === x.length - 1 ? g[I] = $(g[I] || {}, {
        type: "component",
        id: I,
        name: A[M],
        tags: [],
        parent: x[M - 1],
        depth: M,
        renderLabel: h,
        ...F && {
          children: [F]
        }
      }) : g[I] = $(g[I] || {}, {
        type: "group",
        id: I,
        name: A[M],
        tags: [],
        parent: x[M - 1],
        depth: M,
        renderLabel: h,
        ...F && {
          children: [F]
        }
      });
    }), g[w.id] = {
      type: "story",
      tags: [],
      ...w,
      depth: x.length,
      parent: x[x.length - 1],
      renderLabel: h,
      prepared: !!w.parameters
    }, g;
  }, {});
  function v(g, w) {
    return g[w.id] || (g[w.id] = w, (w.type === "root" || w.type === "group" || w.type === "component") && (w.children.forEach((y) => v(g, p[y])),
    w.tags = w.children.reduce((y, S) => {
      let E = g[S];
      return y === null ? E.tags : N0(y, E.tags);
    }, null))), g;
  }
  n(v, "addItem");
  let m = Object.values(p).filter((g) => g.type !== "root" && !g.parent).reduce(v, {});
  return Object.values(p).filter((g) => g.type === "root").reduce(v, m);
}, "transformStoryIndexToStoriesHash"), mt = /* @__PURE__ */ n((e, t) => t ? Object.fromEntries(
  Object.entries(e).map(([r, a]) => {
    let o = t[r];
    return a.type === "story" && o?.type === "story" && o.prepared ? [r, { ...o, ...a, prepared: !0 }] : [r, a];
  })
) : e, "addPreparedStories"), j0 = (0, vt.default)(1)((e) => Object.entries(e).reduce((t, r) => {
  let a = r[1];
  return a.type === "component" && t.push([...a.children]), t;
}, [])), F0 = (0, vt.default)(1)((e) => Object.keys(e).filter((t) => ["story", "docs"].includes(e[t].type)));

// src/manager-api/modules/refs.ts
var { location: ca, fetch: $0 } = P, gt = /* @__PURE__ */ n((e, t) => {
  let { origin: r, pathname: a } = ca, { origin: o, pathname: l } = new URL(e), c = `${r + a}`.replace("/iframe.html", "").replace(/\/$/, ""),
  i = `${o + l}`.replace("/iframe.html", "").replace(/\/$/, "");
  return c === i ? ["local", i] : t || e ? ["external", i] : [null, null];
}, "getSourceType"), q0 = /* @__PURE__ */ n((e, t) => ({ ...t, kind: t.kind.replace("|", "/") }), "defaultStoryMapper"), W0 = /* @__PURE__ */ n(
(e, t) => Object.entries(e).reduce((r, [a, o]) => ({ ...r, [a]: { ...o, refId: t.id } }), {}), "addRefIds");
async function K0(e) {
  if (!e)
    return {};
  try {
    let t = await e;
    if (t === !1 || t === !0)
      throw new Error("Unexpected boolean response");
    if (!t.ok)
      throw new Error(`Unexpected response not OK: ${t.statusText}`);
    let r = await t.json();
    return r.entries || r.stories ? { storyIndex: r } : r;
  } catch (t) {
    return { indexError: t };
  }
}
n(K0, "handleRequest");
var fa = /* @__PURE__ */ n((e) => {
  let t = /https?:\/\/(.+:.+)@/, r = e, a, [, o] = e.match(t) || [];
  return o && (r = e.replace(`${o}@`, ""), a = btoa(`${o}`)), {
    url: r,
    authorization: a
  };
}, "parseUrl"), da = /* @__PURE__ */ n((e, t, r) => {
  let { storyMapper: a } = r;
  return a ? Object.entries(e).reduce((o, [l, c]) => ({ ...o, [l]: a(t, c) }), {}) : e;
}, "map"), ha = /* @__PURE__ */ n(({ store: e, provider: t, singleStory: r, docsOptions: a = {} }, { runCheck: o = !0 } = {}) => {
  let l = {
    findRef: /* @__PURE__ */ n((s) => {
      let d = l.getRefs();
      return Object.values(d).find(({ url: h }) => h.match(s));
    }, "findRef"),
    changeRefVersion: /* @__PURE__ */ n(async (s, d) => {
      let { versions: h, title: u } = l.getRefs()[s], p = {
        id: s,
        url: d,
        versions: h,
        title: u,
        index: {},
        filteredIndex: {},
        expanded: !0
      };
      await l.setRef(s, { ...p, type: "unknown" }, !1), await l.checkRef(p);
    }, "changeRefVersion"),
    changeRefState: /* @__PURE__ */ n((s, d) => {
      let { [s]: h, ...u } = l.getRefs();
      u[s] = { ...h, previewInitialized: d }, e.setState({
        refs: u
      });
    }, "changeRefState"),
    checkRef: /* @__PURE__ */ n(async (s) => {
      let { id: d, url: h, version: u, type: p } = s, v = p === "server-checked", m = {}, g = u ? `?version=${u}` : "", w = v ? "omit" : "in\
clude", y = fa(h), S = {
        Accept: "application/json"
      };
      y.authorization && Object.assign(S, {
        Authorization: `Basic ${y.authorization}`
      });
      let [E, A] = await Promise.all(
        ["index.json", "stories.json"].map(
          async (I) => K0(
            $0(`${y.url}/${I}${g}`, {
              headers: S,
              credentials: w
            })
          )
        )
      );
      if (!E.indexError || !A.indexError) {
        let I = await K0(
          $0(`${y.url}/metadata.json${g}`, {
            headers: S,
            credentials: w,
            cache: "no-cache"
          }).catch(() => !1)
        );
        Object.assign(m, {
          ...E.indexError ? A : E,
          ...!I.indexError && I
        });
      } else v || (m.indexError = {
        message: B`
            Error: Loading of ref failed
              at fetch (lib/api/src/modules/refs.ts)

            URL: ${y.url}

            We weren't able to load the above URL,
            it's possible a CORS error happened.

            Please check your dev-tools network tab.
          `
      });
      let x = s.versions && Object.keys(s.versions).length ? s.versions : m.versions;
      await l.setRef(d, {
        id: d,
        url: y.url,
        ...m,
        ...x ? { versions: x } : {},
        type: m.storyIndex ? "lazy" : "auto-inject"
      });
    }, "checkRef"),
    getRefs: /* @__PURE__ */ n(() => {
      let { refs: s = {} } = e.getState();
      return s;
    }, "getRefs"),
    setRef: /* @__PURE__ */ n(async (s, { storyIndex: d, setStoriesData: h, ...u }, p = !1) => {
      if (r)
        return;
      let v, m, g, { filters: w } = e.getState(), { storyMapper: y = q0 } = t.getConfig(), S = l.getRefs()[s];
      (d || h) && (v = h ? U0(
        da(h, S, { storyMapper: y })
      ) : d, g = ae(d, {
        provider: t,
        docsOptions: a,
        filters: w,
        status: {}
      }), m = ae(d, {
        provider: t,
        docsOptions: a,
        filters: {},
        status: {}
      })), m && (m = W0(m, S)), g && (g = W0(g, S)), await l.updateRef(s, { ...S, ...u, index: m, filteredIndex: g, internal_index: v });
    }, "setRef"),
    updateRef: /* @__PURE__ */ n(async (s, d) => {
      let { [s]: h, ...u } = l.getRefs();
      u[s] = { ...h, ...d };
      let p = Object.keys(i).reduce((v, m) => (v[m] = u[m], v), {});
      await e.setState({
        refs: p
      });
    }, "updateRef")
  }, c = !r && P.REFS || {}, i = c;
  return o && new Promise(async (s) => {
    for (let d of Object.values(c))
      await l.checkRef({ ...d, stories: {} });
    s(void 0);
  }), {
    api: l,
    state: {
      refs: i
    }
  };
}, "init");

// src/manager-api/lib/events.ts
var T = /* @__PURE__ */ n((e, t) => {
  let { source: r, refId: a, type: o } = e, [l, c] = gt(r, a), i;
  (a || l === "external") && (i = a && t.getRefs()[a] ? t.getRefs()[a] : t.findRef(c));
  let s = {
    source: r,
    sourceType: l,
    sourceLocation: c,
    refId: a,
    ref: i,
    type: o
  };
  switch (!0) {
    case typeof a == "string":
    case l === "local":
    case l === "external":
      return s;
    // if we couldn't find the source, something risky happened, we ignore the input, and log a warning
    default:
      return ua.warn(`Received a ${o} frame that was not configured as a ref`), null;
  }
}, "getEventMetadata");

// src/manager-api/modules/globals.ts
var ga = /* @__PURE__ */ n(({ store: e, fullAPI: t, provider: r }) => {
  let a = {
    getGlobals() {
      return e.getState().globals;
    },
    getUserGlobals() {
      return e.getState().userGlobals;
    },
    getStoryGlobals() {
      return e.getState().storyGlobals;
    },
    getGlobalTypes() {
      return e.getState().globalTypes;
    },
    updateGlobals(c) {
      r.channel?.emit(ma, {
        globals: c,
        options: {
          target: "storybook-preview-iframe"
        }
      });
    }
  }, o = {
    globals: {},
    userGlobals: {},
    storyGlobals: {},
    globalTypes: {}
  }, l = /* @__PURE__ */ n(({
    globals: c,
    storyGlobals: i,
    userGlobals: s
  }) => {
    let {
      globals: d,
      userGlobals: h,
      storyGlobals: u
    } = e.getState();
    N(c, d) || e.setState({ globals: c }), N(s, h) || e.setState({ userGlobals: s }), N(i, u) || e.setState({ storyGlobals: i });
  }, "updateGlobals");
  return r.channel?.on(
    pa,
    /* @__PURE__ */ n(function({ globals: i, storyGlobals: s, userGlobals: d }) {
      let { ref: h } = T(this, t);
      h ? Y0.warn(
        "received a GLOBALS_UPDATED from a non-local ref. This is not currently supported."
      ) : l({ globals: i, storyGlobals: s, userGlobals: d });
    }, "handleGlobalsUpdated")
  ), r.channel?.on(
    va,
    /* @__PURE__ */ n(function({ globals: i, globalTypes: s }) {
      let { ref: d } = T(this, t), h = e.getState()?.globals;
      d ? Object.keys(i).length > 0 && Y0.warn("received globals from a non-local ref. This is not currently supported.") : e.setState({ globals: i,
      userGlobals: i, globalTypes: s }), h && Object.keys(h).length !== 0 && !N(i, h) && a.updateGlobals(h);
    }, "handleSetGlobals")
  ), {
    api: a,
    state: o
  };
}, "init");

// src/manager-api/modules/layout.ts
var De = {};
L(De, {
  ActiveTabs: () => Q0,
  defaultLayoutState: () => V,
  focusableUIElements: () => we,
  init: () => Sa
});
import { create as wa } from "@storybook/core/theming/create";
import { SET_CONFIG as ya } from "@storybook/core/core-events";
var { document: Ra } = P, Q0 = {
  SIDEBAR: "sidebar",
  CANVAS: "canvas",
  ADDONS: "addons"
}, V = {
  ui: {
    enableShortcuts: !0
  },
  layout: {
    initialActive: Q0.CANVAS,
    showToolbar: !0,
    navSize: 300,
    bottomPanelHeight: 300,
    rightPanelWidth: 400,
    recentVisibleSizes: {
      navSize: 300,
      bottomPanelHeight: 300,
      rightPanelWidth: 400
    },
    panelPosition: "bottom",
    showTabs: !0
  },
  selectedPanel: void 0,
  theme: wa()
}, we = {
  storySearchField: "storybook-explorer-searchfield",
  storyListMenu: "storybook-explorer-menu",
  storyPanelRoot: "storybook-panel-root"
}, Rt = /* @__PURE__ */ n((e) => e.layout.navSize > 0, "getIsNavShown"), St = /* @__PURE__ */ n((e) => {
  let { bottomPanelHeight: t, rightPanelWidth: r, panelPosition: a } = e.layout;
  return a === "bottom" && t > 0 || a === "right" && r > 0;
}, "getIsPanelShown"), J0 = /* @__PURE__ */ n((e) => !Rt(e) && !St(e), "getIsFullscreen"), Ve = /* @__PURE__ */ n((e) => ({
  navSize: e.navSize > 0 ? e.navSize : e.recentVisibleSizes.navSize,
  bottomPanelHeight: e.bottomPanelHeight > 0 ? e.bottomPanelHeight : e.recentVisibleSizes.bottomPanelHeight,
  rightPanelWidth: e.rightPanelWidth > 0 ? e.rightPanelWidth : e.recentVisibleSizes.rightPanelWidth
}), "getRecentVisibleSizes"), Sa = /* @__PURE__ */ n(({ store: e, provider: t, singleStory: r }) => {
  let a = {
    toggleFullscreen(l) {
      return e.setState(
        (c) => {
          let i = J0(c), s = typeof l == "boolean" ? l : !i;
          return s === i ? { layout: c.layout } : s ? {
            layout: {
              ...c.layout,
              navSize: 0,
              bottomPanelHeight: 0,
              rightPanelWidth: 0,
              recentVisibleSizes: Ve(c.layout)
            }
          } : {
            layout: {
              ...c.layout,
              navSize: c.singleStory ? 0 : c.layout.recentVisibleSizes.navSize,
              bottomPanelHeight: c.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: c.layout.recentVisibleSizes.rightPanelWidth
            }
          };
        },
        { persistence: "session" }
      );
    },
    togglePanel(l) {
      return e.setState(
        (c) => {
          let i = St(c), s = typeof l == "boolean" ? l : !i;
          return s === i ? { layout: c.layout } : s ? {
            layout: {
              ...c.layout,
              bottomPanelHeight: c.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: c.layout.recentVisibleSizes.rightPanelWidth
            }
          } : {
            layout: {
              ...c.layout,
              bottomPanelHeight: 0,
              rightPanelWidth: 0,
              recentVisibleSizes: Ve(c.layout)
            }
          };
        },
        { persistence: "session" }
      );
    },
    togglePanelPosition(l) {
      return e.setState(
        (c) => {
          let i = l || (c.layout.panelPosition === "right" ? "bottom" : "right");
          return {
            layout: {
              ...c.layout,
              panelPosition: i,
              bottomPanelHeight: c.layout.recentVisibleSizes.bottomPanelHeight,
              rightPanelWidth: c.layout.recentVisibleSizes.rightPanelWidth
            }
          };
        },
        { persistence: "permanent" }
      );
    },
    toggleNav(l) {
      return e.setState(
        (c) => {
          if (c.singleStory)
            return { layout: c.layout };
          let i = Rt(c), s = typeof l == "boolean" ? l : !i;
          return s === i ? { layout: c.layout } : s ? {
            layout: {
              ...c.layout,
              navSize: c.layout.recentVisibleSizes.navSize
            }
          } : {
            layout: {
              ...c.layout,
              navSize: 0,
              recentVisibleSizes: Ve(c.layout)
            }
          };
        },
        { persistence: "session" }
      );
    },
    toggleToolbar(l) {
      return e.setState(
        (c) => {
          let i = typeof l < "u" ? l : !c.layout.showToolbar;
          return {
            layout: {
              ...c.layout,
              showToolbar: i
            }
          };
        },
        { persistence: "session" }
      );
    },
    setSizes({
      navSize: l,
      bottomPanelHeight: c,
      rightPanelWidth: i
    }) {
      return e.setState(
        (s) => {
          let d = {
            ...s.layout,
            navSize: l ?? s.layout.navSize,
            bottomPanelHeight: c ?? s.layout.bottomPanelHeight,
            rightPanelWidth: i ?? s.layout.rightPanelWidth
          };
          return {
            layout: {
              ...d,
              recentVisibleSizes: Ve(d)
            }
          };
        },
        { persistence: "session" }
      );
    },
    focusOnUIElement(l, c) {
      if (!l)
        return;
      let i = Ra.getElementById(l);
      i && (i.focus(), c && i.select());
    },
    getInitialOptions() {
      let { theme: l, selectedPanel: c, ...i } = t.getConfig();
      return {
        ...V,
        layout: {
          ...ge(
            V.layout,
            X(i, Object.keys(V.layout))
          ),
          ...r && { navSize: 0 }
        },
        ui: ge(V.ui, X(i, Object.keys(V.ui))),
        selectedPanel: c || V.selectedPanel,
        theme: l || V.theme
      };
    },
    getIsFullscreen() {
      return J0(e.getState());
    },
    getIsPanelShown() {
      return St(e.getState());
    },
    getIsNavShown() {
      return Rt(e.getState());
    },
    setOptions: /* @__PURE__ */ n((l) => {
      let { layout: c, ui: i, selectedPanel: s, theme: d } = e.getState();
      if (!l)
        return;
      let h = {
        ...c,
        ...l.layout || {},
        ...X(l, Object.keys(c)),
        ...r && { navSize: 0 }
      }, u = {
        ...i,
        ...l.ui,
        ...ge(l.ui || {}, X(l, Object.keys(i)))
      }, p = {
        ...d,
        ...l.theme
      }, v = {};
      O(i, u) || (v.ui = u), O(c, h) || (v.layout = h), l.selectedPanel && !O(s, l.selectedPanel) && (v.selectedPanel = l.selectedPanel), Object.
      keys(v).length && e.setState(v, { persistence: "permanent" }), O(d, p) || e.setState({ theme: p });
    }, "setOptions")
  }, o = X(e.getState(), ["layout", "selectedPanel"]);
  return t.channel?.on(ya, () => {
    a.setOptions($(a.getInitialOptions(), o));
  }), {
    api: a,
    state: $(a.getInitialOptions(), o)
  };
}, "init");

// src/manager-api/modules/notifications.ts
var Et = {};
L(Et, {
  init: () => Ea
});
var Ea = /* @__PURE__ */ n(({ store: e }) => ({ api: {
  addNotification: /* @__PURE__ */ n((a) => {
    e.setState(({ notifications: o }) => {
      let [l, c] = Te(o, (i) => i.id === a.id);
      return l.forEach((i) => {
        i.onClear && i.onClear({ dismissed: !1, timeout: !1 });
      }), { notifications: [...c, a] };
    });
  }, "addNotification"),
  clearNotification: /* @__PURE__ */ n((a) => {
    e.setState(({ notifications: o }) => {
      let [l, c] = Te(o, (i) => i.id === a);
      return l.forEach((i) => {
        i.onClear && i.onClear({ dismissed: !1, timeout: !1 });
      }), { notifications: c };
    });
  }, "clearNotification")
}, state: { notifications: [] } }), "init");

// src/manager-api/modules/provider.ts
var It = {};
L(It, {
  init: () => Ia
});
var Ia = /* @__PURE__ */ n(({ provider: e, fullAPI: t }) => ({
  api: e.renderPreview ? { renderPreview: e.renderPreview } : {},
  state: {},
  init: /* @__PURE__ */ n(() => {
    e.handleAPI(t);
  }, "init")
}), "init");

// src/manager-api/modules/settings.ts
var xt = {};
L(xt, {
  init: () => xa
});
var xa = /* @__PURE__ */ n(({ store: e, navigate: t, fullAPI: r }) => ({
  state: { settings: { lastTrackedStoryId: null } },
  api: {
    closeSettings: /* @__PURE__ */ n(() => {
      let {
        settings: { lastTrackedStoryId: l }
      } = e.getState();
      l ? r.selectStory(l) : r.selectFirstStory();
    }, "closeSettings"),
    changeSettingsTab: /* @__PURE__ */ n((l) => {
      t(`/settings/${l}`);
    }, "changeSettingsTab"),
    isSettingsScreenActive: /* @__PURE__ */ n(() => {
      let { path: l } = r.getUrlState();
      return !!(l || "").match(/^\/settings/);
    }, "isSettingsScreenActive"),
    retrieveSelection() {
      let { settings: l } = e.getState();
      return l.lastTrackedStoryId;
    },
    storeSelection: /* @__PURE__ */ n(async () => {
      let { storyId: l, settings: c } = e.getState();
      await e.setState({
        settings: { ...c, lastTrackedStoryId: l }
      });
    }, "storeSelection")
  }
}), "init");

// src/manager-api/modules/shortcuts.ts
var Tt = {};
L(Tt, {
  controlOrMetaKey: () => ne,
  defaultShortcuts: () => oe,
  init: () => Ta,
  isMacLike: () => Z0,
  keys: () => zt
});
import {
  FORCE_REMOUNT as ba,
  PREVIEW_KEYDOWN as _a,
  STORIES_COLLAPSE_ALL as Ma,
  STORIES_EXPAND_ALL as Ca
} from "@storybook/core/core-events";

// src/manager-api/lib/shortcut.ts
var { navigator: At } = P, Pt = /* @__PURE__ */ n(() => At && At.platform ? !!At.platform.match(/(Mac|iPhone|iPod|iPad)/i) : !1, "isMacLike"),
Vi = /* @__PURE__ */ n(() => Pt() ? "\u2318" : "ctrl", "controlOrMetaSymbol"), Di = /* @__PURE__ */ n(() => Pt() ? "meta" : "control", "cont\
rolOrMetaKey"), Aa = /* @__PURE__ */ n(() => Pt() ? "\u2325" : "alt", "optionOrAltSymbol"), Ni = /* @__PURE__ */ n((e, t) => JSON.stringify(
e) === JSON.stringify(t), "isShortcutTaken"), bt = /* @__PURE__ */ n((e) => {
  if (["Meta", "Alt", "Control", "Shift"].includes(e.key))
    return null;
  let t = [];
  if (e.altKey && t.push("alt"), e.ctrlKey && t.push("control"), e.metaKey && t.push("meta"), e.shiftKey && t.push("shift"), e.key && e.key.
  length === 1 && e.key !== " ") {
    let r = e.key.toUpperCase(), a = e.code?.toUpperCase().replace("KEY", "").replace("DIGIT", "");
    a && a.length === 1 && a !== r ? t.push([r, a]) : t.push(r);
  }
  return e.key === " " && t.push("space"), e.key === "Escape" && t.push("escape"), e.key === "ArrowRight" && t.push("ArrowRight"), e.key ===
  "ArrowDown" && t.push("ArrowDown"), e.key === "ArrowUp" && t.push("ArrowUp"), e.key === "ArrowLeft" && t.push("ArrowLeft"), t.length > 0 ?
  t : null;
}, "eventToShortcut"), _t = /* @__PURE__ */ n((e, t) => !e || !t || (e.join("").startsWith("shift/") && e.shift(), e.length !== t.length) ? !1 :
!e.find(
  (r, a) => Array.isArray(r) ? !r.includes(t[a]) : r !== t[a]
), "shortcutMatchesShortcut"), ki = /* @__PURE__ */ n((e, t) => _t(bt(e), t), "eventMatchesShortcut"), Pa = /* @__PURE__ */ n((e) => e === "\
alt" ? Aa() : e === "control" ? "\u2303" : e === "meta" ? "\u2318" : e === "shift" ? "\u21E7\u200B" : e === "Enter" || e === "Backspace" || e ===
"Esc" || e === "escape" ? "" : e === " " ? "SPACE" : e === "ArrowUp" ? "\u2191" : e === "ArrowDown" ? "\u2193" : e === "ArrowLeft" ? "\u2190" :
e === "ArrowRight" ? "\u2192" : e.toUpperCase(), "keyToSymbol"), Ui = /* @__PURE__ */ n((e) => e.map(Pa).join(" "), "shortcutToHumanString");

// src/manager-api/modules/shortcuts.ts
var { navigator: Mt, document: X0 } = P, Z0 = /* @__PURE__ */ n(() => Mt && Mt.platform ? !!Mt.platform.match(/(Mac|iPhone|iPod|iPad)/i) : !1,
"isMacLike"), ne = /* @__PURE__ */ n(() => Z0() ? "meta" : "control", "controlOrMetaKey");
function zt(e) {
  return Object.keys(e);
}
n(zt, "keys");
var oe = Object.freeze({
  fullScreen: ["alt", "F"],
  togglePanel: ["alt", "A"],
  panelPosition: ["alt", "D"],
  toggleNav: ["alt", "S"],
  toolbar: ["alt", "T"],
  search: [ne(), "K"],
  focusNav: ["1"],
  focusIframe: ["2"],
  focusPanel: ["3"],
  prevComponent: ["alt", "ArrowUp"],
  nextComponent: ["alt", "ArrowDown"],
  prevStory: ["alt", "ArrowLeft"],
  nextStory: ["alt", "ArrowRight"],
  shortcutsPage: [ne(), "shift", ","],
  aboutPage: [ne(), ","],
  escape: ["escape"],
  // This one is not customizable
  collapseAll: [ne(), "shift", "ArrowUp"],
  expandAll: [ne(), "shift", "ArrowDown"],
  remount: ["alt", "R"]
}), Ct = {};
function za(e) {
  let t = e.target;
  return /input|textarea/i.test(t.tagName) || t.getAttribute("contenteditable") !== null;
}
n(za, "focusInInput");
var Ta = /* @__PURE__ */ n(({ store: e, fullAPI: t, provider: r }) => {
  let a = {
    // Getting and setting shortcuts
    getShortcutKeys() {
      return e.getState().shortcuts;
    },
    getDefaultShortcuts() {
      return {
        ...oe,
        ...a.getAddonsShortcutDefaults()
      };
    },
    getAddonsShortcuts() {
      return Ct;
    },
    getAddonsShortcutLabels() {
      let i = {};
      return Object.entries(a.getAddonsShortcuts()).forEach(([s, { label: d }]) => {
        i[s] = d;
      }), i;
    },
    getAddonsShortcutDefaults() {
      let i = {};
      return Object.entries(a.getAddonsShortcuts()).forEach(([s, { defaultShortcut: d }]) => {
        i[s] = d;
      }), i;
    },
    async setShortcuts(i) {
      return await e.setState({ shortcuts: i }, { persistence: "permanent" }), i;
    },
    async restoreAllDefaultShortcuts() {
      return a.setShortcuts(a.getDefaultShortcuts());
    },
    async setShortcut(i, s) {
      let d = a.getShortcutKeys();
      return await a.setShortcuts({ ...d, [i]: s }), s;
    },
    async setAddonShortcut(i, s) {
      let d = a.getShortcutKeys();
      return await a.setShortcuts({
        ...d,
        [`${i}-${s.actionName}`]: s.defaultShortcut
      }), Ct[`${i}-${s.actionName}`] = s, s;
    },
    async restoreDefaultShortcut(i) {
      let s = a.getDefaultShortcuts()[i];
      return a.setShortcut(i, s);
    },
    // Listening to shortcut events
    handleKeydownEvent(i) {
      let s = bt(i), d = a.getShortcutKeys(), u = zt(d).find(
        (p) => _t(s, d[p])
      );
      u && a.handleShortcutFeature(u, i);
    },
    // warning: event might not have a full prototype chain because it may originate from the channel
    handleShortcutFeature(i, s) {
      let {
        ui: { enableShortcuts: d },
        storyId: h
      } = e.getState();
      if (d)
        switch (s?.preventDefault && s.preventDefault(), i) {
          case "escape": {
            t.getIsFullscreen() ? t.toggleFullscreen(!1) : t.getIsNavShown() && t.toggleNav(!0);
            break;
          }
          case "focusNav": {
            t.getIsFullscreen() && t.toggleFullscreen(!1), t.getIsNavShown() || t.toggleNav(!0), t.focusOnUIElement(we.storyListMenu);
            break;
          }
          case "search": {
            t.getIsFullscreen() && t.toggleFullscreen(!1), t.getIsNavShown() || t.toggleNav(!0), setTimeout(() => {
              t.focusOnUIElement(we.storySearchField, !0);
            }, 0);
            break;
          }
          case "focusIframe": {
            let u = X0.getElementById("storybook-preview-iframe");
            if (u)
              try {
                u.contentWindow.focus();
              } catch {
              }
            break;
          }
          case "focusPanel": {
            t.getIsFullscreen() && t.toggleFullscreen(!1), t.getIsPanelShown() || t.togglePanel(!0), t.focusOnUIElement(we.storyPanelRoot);
            break;
          }
          case "nextStory": {
            t.jumpToStory(1);
            break;
          }
          case "prevStory": {
            t.jumpToStory(-1);
            break;
          }
          case "nextComponent": {
            t.jumpToComponent(1);
            break;
          }
          case "prevComponent": {
            t.jumpToComponent(-1);
            break;
          }
          case "fullScreen": {
            t.toggleFullscreen();
            break;
          }
          case "togglePanel": {
            t.togglePanel();
            break;
          }
          case "toggleNav": {
            t.toggleNav();
            break;
          }
          case "toolbar": {
            t.toggleToolbar();
            break;
          }
          case "panelPosition": {
            t.getIsFullscreen() && t.toggleFullscreen(!1), t.getIsPanelShown() || t.togglePanel(!0), t.togglePanelPosition();
            break;
          }
          case "aboutPage": {
            t.navigate("/settings/about");
            break;
          }
          case "shortcutsPage": {
            t.navigate("/settings/shortcuts");
            break;
          }
          case "collapseAll": {
            t.emit(Ma);
            break;
          }
          case "expandAll": {
            t.emit(Ca);
            break;
          }
          case "remount": {
            t.emit(ba, { storyId: h });
            break;
          }
          default:
            Ct[i].action();
            break;
        }
    }
  }, { shortcuts: o = oe } = e.getState(), l = {
    // Any saved shortcuts that are still in our set of defaults
    shortcuts: zt(oe).reduce(
      (i, s) => ({ ...i, [s]: o[s] || oe[s] }),
      oe
    )
  };
  return { api: a, state: l, init: /* @__PURE__ */ n(() => {
    X0.addEventListener("keydown", (i) => {
      za(i) || a.handleKeydownEvent(i);
    }), r.channel?.on(_a, (i) => {
      a.handleKeydownEvent(i.event);
    });
  }, "initModule") };
}, "init");

// src/manager-api/modules/stories.ts
var Lt = {};
L(Lt, {
  init: () => tn
});
import { sanitize as er, toId as Ne } from "@storybook/core/csf";
import { logger as Ha } from "@storybook/core/client-logger";
import {
  CONFIG_ERROR as La,
  CURRENT_STORY_WAS_SET as Oa,
  DOCS_PREPARED as Ba,
  PRELOAD_ENTRIES as Va,
  RESET_STORY_ARGS as Da,
  SELECT_STORY as Na,
  SET_CONFIG as ka,
  SET_CURRENT_STORY as Ua,
  SET_FILTER as ja,
  SET_INDEX as Fa,
  SET_STORIES as Ga,
  STORY_ARGS_UPDATED as $a,
  STORY_CHANGED as Wa,
  STORY_INDEX_INVALIDATED as Ka,
  STORY_MISSING as qa,
  STORY_PREPARED as Ya,
  STORY_SPECIFIED as Ja,
  UPDATE_STORY_ARGS as Qa
} from "@storybook/core/core-events";
var { fetch: Xa } = P, Za = "./index.json", en = ["enableShortcuts", "theme", "showRoots"];
function Ht(e) {
  if (!e || typeof e == "string")
    return e;
  let t = { ...e };
  return en.forEach((r) => {
    r in t && delete t[r];
  }), t;
}
n(Ht, "removeRemovedOptions");
var tn = /* @__PURE__ */ n(({
  fullAPI: e,
  store: t,
  navigate: r,
  provider: a,
  storyId: o,
  viewMode: l,
  docsOptions: c = {}
}) => {
  let i = {
    storyId: Ne,
    getData: /* @__PURE__ */ n((d, h) => {
      let u = i.resolveStory(d, h);
      if (u?.type === "story" || u?.type === "docs")
        return u;
    }, "getData"),
    isPrepared: /* @__PURE__ */ n((d, h) => {
      let u = i.getData(d, h);
      return u ? u.type === "story" ? u.prepared : !0 : !1;
    }, "isPrepared"),
    resolveStory: /* @__PURE__ */ n((d, h) => {
      let { refs: u, index: p } = t.getState();
      if (!(h && !u[h]))
        return h ? u?.[h]?.index?.[d] ?? void 0 : p ? p[d] : void 0;
    }, "resolveStory"),
    getCurrentStoryData: /* @__PURE__ */ n(() => {
      let { storyId: d, refId: h } = t.getState();
      return i.getData(d, h);
    }, "getCurrentStoryData"),
    getParameters: /* @__PURE__ */ n((d, h) => {
      let { storyId: u, refId: p } = typeof d == "string" ? { storyId: d, refId: void 0 } : d, v = i.getData(u, p);
      if (["story", "docs"].includes(v?.type)) {
        let { parameters: m } = v;
        if (m)
          return h ? m[h] : m;
      }
      return null;
    }, "getParameters"),
    getCurrentParameter: /* @__PURE__ */ n((d) => {
      let { storyId: h, refId: u } = t.getState();
      return i.getParameters({ storyId: h, refId: u }, d) || void 0;
    }, "getCurrentParameter"),
    jumpToComponent: /* @__PURE__ */ n((d) => {
      let { index: h, storyId: u, refs: p, refId: v } = t.getState();
      if (!i.getData(u, v))
        return;
      let g = v ? p[v].index || {} : h;
      if (!g)
        return;
      let w = i.findSiblingStoryId(u, g, d, !0);
      w && i.selectStory(w, void 0, { ref: v });
    }, "jumpToComponent"),
    jumpToStory: /* @__PURE__ */ n((d) => {
      let { index: h, storyId: u, refs: p, refId: v } = t.getState(), m = i.getData(u, v);
      if (!m)
        return;
      let g = m.refId ? p[m.refId].index : h;
      if (!g)
        return;
      let w = i.findSiblingStoryId(u, g, d, !1);
      w && i.selectStory(w, void 0, { ref: v });
    }, "jumpToStory"),
    selectFirstStory: /* @__PURE__ */ n(() => {
      let { index: d } = t.getState();
      if (!d)
        return;
      let h = Object.keys(d).find((u) => d[u].type === "story");
      if (h) {
        i.selectStory(h);
        return;
      }
      r("/");
    }, "selectFirstStory"),
    selectStory: /* @__PURE__ */ n((d = void 0, h = void 0, u = {}) => {
      let { ref: p } = u, { storyId: v, index: m, refs: g } = t.getState(), w = p ? g[p].index : m, y = v?.split("--", 2)[0];
      if (w)
        if (h)
          if (d) {
            let S = p ? `${p}_${Ne(d, h)}` : Ne(d, h);
            if (w[S])
              i.selectStory(S, void 0, u);
            else {
              let E = w[er(d)];
              if (E?.type === "component") {
                let A = E.children.find((x) => w[x].name === h);
                A && i.selectStory(A, void 0, u);
              }
            }
          } else {
            let S = Ne(y, h);
            i.selectStory(S, void 0, u);
          }
        else {
          let S = d ? w[d] || w[er(d)] : w[y];
          if (!S)
            throw new Error(`Unknown id or title: '${d}'`);
          t.setState({
            settings: { ...t.getState().settings, lastTrackedStoryId: S.id }
          });
          let E = i.findLeafEntry(w, S.id), A = E.refId ? `${E.refId}_${E.id}` : E.id;
          r(`/${E.type}/${A}`);
        }
    }, "selectStory"),
    findLeafEntry(d, h) {
      let u = d[h];
      if (u.type === "docs" || u.type === "story")
        return u;
      let p = u.children[0];
      return i.findLeafEntry(d, p);
    },
    findLeafStoryId(d, h) {
      return i.findLeafEntry(d, h)?.id;
    },
    findSiblingStoryId(d, h, u, p) {
      if (p) {
        let g = j0(h), w = g.findIndex((y) => y.includes(d));
        return w === g.length - 1 && u > 0 || w === 0 && u < 0 ? void 0 : g[w + u] ? g[w + u][0] : void 0;
      }
      let v = F0(h), m = v.indexOf(d);
      if (!(m === v.length - 1 && u > 0) && !(m === 0 && u < 0))
        return v[m + u];
    },
    updateStoryArgs: /* @__PURE__ */ n((d, h) => {
      let { id: u, refId: p } = d;
      a.channel?.emit(Qa, {
        storyId: u,
        updatedArgs: h,
        options: { target: p }
      });
    }, "updateStoryArgs"),
    resetStoryArgs: /* @__PURE__ */ n((d, h) => {
      let { id: u, refId: p } = d;
      a.channel?.emit(Da, {
        storyId: u,
        argNames: h,
        options: { target: p }
      });
    }, "resetStoryArgs"),
    fetchIndex: /* @__PURE__ */ n(async () => {
      try {
        let d = await Xa(Za);
        if (d.status !== 200)
          throw new Error(await d.text());
        let h = await d.json();
        if (h.v < 3) {
          Ha.warn(`Skipping story index with version v${h.v}, awaiting SET_STORIES.`);
          return;
        }
        await i.setIndex(h);
      } catch (d) {
        await t.setState({ indexError: d });
      }
    }, "fetchIndex"),
    // The story index we receive on SET_INDEX is "prepared" in that it has parameters
    // The story index we receive on fetchStoryIndex is not, but all the prepared fields are optional
    // so we can cast one to the other easily enough
    setIndex: /* @__PURE__ */ n(async (d) => {
      let { filteredIndex: h, index: u, status: p, filters: v } = t.getState(), m = ae(d, {
        provider: a,
        docsOptions: c,
        status: p,
        filters: v
      }), g = ae(d, {
        provider: a,
        docsOptions: c,
        status: p,
        filters: {}
      });
      await t.setState({
        internal_index: d,
        filteredIndex: mt(m, h),
        index: mt(g, u),
        indexError: void 0
      });
    }, "setIndex"),
    // FIXME: is there a bug where filtered stories get added back in on updateStory???
    updateStory: /* @__PURE__ */ n(async (d, h, u) => {
      if (u) {
        let { id: p, index: v, filteredIndex: m } = u;
        v[d] = {
          ...v[d],
          ...h
        }, m[d] = {
          ...m[d],
          ...h
        }, await e.updateRef(p, { index: v, filteredIndex: m });
      } else {
        let { index: p, filteredIndex: v } = t.getState();
        p && (p[d] = {
          ...p[d],
          ...h
        }), v && (v[d] = {
          ...v[d],
          ...h
        }), (p || v) && await t.setState({ index: p, filteredIndex: v });
      }
    }, "updateStory"),
    updateDocs: /* @__PURE__ */ n(async (d, h, u) => {
      if (u) {
        let { id: p, index: v, filteredIndex: m } = u;
        v[d] = {
          ...v[d],
          ...h
        }, m[d] = {
          ...m[d],
          ...h
        }, await e.updateRef(p, { index: v, filteredIndex: m });
      } else {
        let { index: p, filteredIndex: v } = t.getState();
        p && (p[d] = {
          ...p[d],
          ...h
        }), v && (v[d] = {
          ...v[d],
          ...h
        }), (p || v) && await t.setState({ index: p, filteredIndex: v });
      }
    }, "updateDocs"),
    setPreviewInitialized: /* @__PURE__ */ n(async (d) => {
      d ? e.updateRef(d.id, { previewInitialized: !0 }) : t.setState({ previewInitialized: !0 });
    }, "setPreviewInitialized"),
    getCurrentStoryStatus: /* @__PURE__ */ n(() => {
      let { status: d, storyId: h } = t.getState();
      return d[h];
    }, "getCurrentStoryStatus"),
    /* EXPERIMENTAL APIs */
    experimental_updateStatus: /* @__PURE__ */ n(async (d, h) => {
      let { status: u, internal_index: p } = t.getState(), v = { ...u }, m = typeof h == "function" ? h(u) : h;
      if (!(!d || Object.keys(m).length === 0) && (Object.entries(m).forEach(([g, w]) => {
        !g || typeof w != "object" || (v[g] = { ...v[g] || {} }, w === null ? delete v[g][d] : v[g][d] = w, Object.keys(v[g]).length === 0 &&
        delete v[g]);
      }), await t.setState({ status: v }, { persistence: "session" }), p)) {
        await i.setIndex(p);
        let g = await e.getRefs();
        Object.entries(g).forEach(([w, { internal_index: y, ...S }]) => {
          e.setRef(w, { ...S, storyIndex: y }, !0);
        });
      }
    }, "experimental_updateStatus"),
    experimental_setFilter: /* @__PURE__ */ n(async (d, h) => {
      await t.setState({ filters: { ...t.getState().filters, [d]: h } });
      let { internal_index: u } = t.getState();
      if (!u)
        return;
      await i.setIndex(u);
      let p = await e.getRefs();
      Object.entries(p).forEach(([v, { internal_index: m, ...g }]) => {
        e.setRef(v, { ...g, storyIndex: m }, !0);
      }), a.channel?.emit(ja, { id: d });
    }, "experimental_setFilter")
  };
  a.channel?.on(
    Ja,
    /* @__PURE__ */ n(function({
      storyId: h,
      viewMode: u
    }) {
      let { sourceType: p } = T(this, e);
      if (p === "local") {
        let v = t.getState(), m = v.path === "/" || v.viewMode === "story" || v.viewMode === "docs", g = v.viewMode && v.storyId, w = v.viewMode !==
        u || v.storyId !== h, { type: y } = v.index?.[v.storyId] || {};
        m && (g && w && !(y === "root" || y === "component" || y === "group") ? a.channel?.emit(Ua, {
          storyId: v.storyId,
          viewMode: v.viewMode
        }) : w && r(`/${u}/${h}`));
      }
    }, "handler")
  ), a.channel?.on(Oa, /* @__PURE__ */ n(function() {
    let { ref: h } = T(this, e);
    i.setPreviewInitialized(h);
  }, "handler")), a.channel?.on(Wa, /* @__PURE__ */ n(function() {
    let { sourceType: h } = T(this, e);
    if (h === "local") {
      let u = i.getCurrentParameter("options");
      u && e.setOptions(Ht(u));
    }
  }, "handler")), a.channel?.on(
    Ya,
    /* @__PURE__ */ n(function({ id: h, ...u }) {
      let { ref: p, sourceType: v } = T(this, e);
      if (i.updateStory(h, { ...u, prepared: !0 }, p), !p && !t.getState().hasCalledSetOptions) {
        let { options: m } = u.parameters;
        e.setOptions(Ht(m)), t.setState({ hasCalledSetOptions: !0 });
      }
      if (v === "local") {
        let { storyId: m, index: g, refId: w } = t.getState();
        if (!g)
          return;
        let y = Array.from(
          /* @__PURE__ */ new Set([
            i.findSiblingStoryId(m, g, 1, !0),
            i.findSiblingStoryId(m, g, -1, !0)
          ])
        ).filter(Boolean);
        a.channel?.emit(Va, {
          ids: y,
          options: { target: w }
        });
      }
    }, "handler")
  ), a.channel?.on(
    Ba,
    /* @__PURE__ */ n(function({ id: h, ...u }) {
      let { ref: p } = T(this, e);
      i.updateStory(h, { ...u, prepared: !0 }, p);
    }, "handler")
  ), a.channel?.on(Fa, /* @__PURE__ */ n(function(h) {
    let { ref: u } = T(this, e);
    if (u)
      e.setRef(u.id, { ...u, storyIndex: h }, !0);
    else {
      i.setIndex(h);
      let p = i.getCurrentParameter("options");
      e.setOptions(Ht(p));
    }
  }, "handler")), a.channel?.on(Ga, /* @__PURE__ */ n(function(h) {
    let { ref: u } = T(this, e), p = h.v ? k0(h) : h.stories;
    if (u)
      e.setRef(u.id, { ...u, setStoriesData: p }, !0);
    else
      throw new Error("Cannot call SET_STORIES for local frame");
  }, "handler")), a.channel?.on(
    Na,
    /* @__PURE__ */ n(function({
      kind: h,
      title: u = h,
      story: p,
      name: v = p,
      storyId: m,
      ...g
    }) {
      let { ref: w } = T(this, e);
      w ? e.selectStory(m || u, v, { ...g, ref: w.id }) : e.selectStory(m || u, v, g);
    }, "handler")
  ), a.channel?.on(
    $a,
    /* @__PURE__ */ n(function({ storyId: h, args: u }) {
      let { ref: p } = T(this, e);
      i.updateStory(h, { args: u }, p);
    }, "handleStoryArgsUpdated")
  ), a.channel?.on(La, /* @__PURE__ */ n(function(h) {
    let { ref: u } = T(this, e);
    i.setPreviewInitialized(u);
  }, "handleConfigError")), a.channel?.on(qa, /* @__PURE__ */ n(function(h) {
    let { ref: u } = T(this, e);
    i.setPreviewInitialized(u);
  }, "handleConfigError")), a.channel?.on(ka, () => {
    let d = a.getConfig();
    d?.sidebar?.filters && t.setState({
      filters: {
        ...t.getState().filters,
        ...d?.sidebar?.filters
      }
    });
  });
  let s = a.getConfig();
  return {
    api: i,
    state: {
      storyId: o,
      viewMode: l,
      hasCalledSetOptions: !1,
      previewInitialized: !1,
      status: {},
      filters: s?.sidebar?.filters || {}
    },
    init: /* @__PURE__ */ n(async () => {
      a.channel?.on(Ka, () => i.fetchIndex()), await i.fetchIndex();
    }, "init")
  };
}, "init");

// src/manager-api/modules/url.ts
var Vt = {};
L(Vt, {
  init: () => fn
});
import { buildArgsParam as tr, queryFromLocation as rn } from "@storybook/core/router";
import {
  GLOBALS_UPDATED as an,
  NAVIGATE_URL as nn,
  SET_CURRENT_STORY as on,
  STORY_ARGS_UPDATED as ln,
  UPDATE_QUERY_PARAMS as sn
} from "@storybook/core/core-events";
var { window: Ot } = P, Z = /* @__PURE__ */ n((e) => {
  if (e === "true" || e === "1")
    return !0;
  if (e === "false" || e === "0")
    return !1;
}, "parseBoolean"), Bt, cn = /* @__PURE__ */ n(({
  state: { location: e, path: t, viewMode: r, storyId: a },
  singleStory: o
}) => {
  let {
    full: l,
    panel: c,
    nav: i,
    shortcuts: s,
    addonPanel: d,
    tabs: h,
    path: u,
    ...p
    // the rest gets passed to the iframe
  } = rn(e), v, m, g;
  Z(l) === !0 ? (v = 0, m = 0, g = 0) : Z(l) === !1 && (v = V.layout.navSize, m = V.layout.bottomPanelHeight, g = V.layout.rightPanelWidth),
  o || (Z(i) === !0 && (v = V.layout.navSize), Z(i) === !1 && (v = 0)), Z(c) === !1 && (m = 0, g = 0);
  let w = {
    navSize: v,
    bottomPanelHeight: m,
    rightPanelWidth: g,
    panelPosition: ["right", "bottom"].includes(c) ? c : void 0,
    showTabs: Z(h)
  }, y = {
    enableShortcuts: Z(s)
  }, S = d || void 0, E = a, A = N(Bt, p) ? Bt : p;
  return Bt = A, { viewMode: r, layout: w, ui: y, selectedPanel: S, location: e, path: t, customQueryParams: A, storyId: E };
}, "initialUrlSupport"), fn = /* @__PURE__ */ n((e) => {
  let { store: t, navigate: r, provider: a, fullAPI: o } = e, l = /* @__PURE__ */ n((d, h = {}, u = {}) => {
    let p = Object.entries(h).filter(([, m]) => m).sort(([m], [g]) => m < g ? -1 : 1).map(([m, g]) => `${m}=${g}`), v = [d, ...p].join("&");
    return r(v, u);
  }, "navigateTo"), c = {
    getQueryParam(d) {
      let { customQueryParams: h } = t.getState();
      return h ? h[d] : void 0;
    },
    getUrlState() {
      let { location: d, path: h, customQueryParams: u, storyId: p, url: v, viewMode: m } = t.getState();
      return {
        path: h,
        hash: d.hash ?? "",
        queryParams: u,
        storyId: p,
        url: v,
        viewMode: m
      };
    },
    setQueryParams(d) {
      let { customQueryParams: h } = t.getState(), u = {}, p = {
        ...h,
        ...Object.entries(d).reduce((v, [m, g]) => (g !== null && (v[m] = g), v), u)
      };
      N(h, p) || (t.setState({ customQueryParams: p }), a.channel?.emit(sn, p));
    },
    applyQueryParams(d, h) {
      let { path: u, hash: p = "", queryParams: v } = c.getUrlState();
      l(`${u}${p}`, { ...v, ...d }, h), c.setQueryParams(d);
    },
    navigateUrl(d, h) {
      r(d, { plain: !0, ...h });
    }
  }, i = /* @__PURE__ */ n(() => {
    let { path: d, hash: h = "", queryParams: u, viewMode: p } = c.getUrlState();
    if (p !== "story")
      return;
    let v = o.getCurrentStoryData();
    if (v?.type !== "story")
      return;
    let { args: m, initialArgs: g } = v, w = tr(g, m);
    l(`${d}${h}`, { ...u, args: w }, { replace: !0 }), c.setQueryParams({ args: w });
  }, "updateArgsParam");
  a.channel?.on(on, () => i());
  let s;
  return a.channel?.on(ln, () => {
    "requestIdleCallback" in Ot ? (s && Ot.cancelIdleCallback(s), s = Ot.requestIdleCallback(i, { timeout: 1e3 })) : (s && clearTimeout(s), setTimeout(
    i, 100));
  }), a.channel?.on(an, ({ userGlobals: d, initialGlobals: h }) => {
    let { path: u, hash: p = "", queryParams: v } = c.getUrlState(), m = tr(h, d);
    l(`${u}${p}`, { ...v, globals: m }, { replace: !0 }), c.setQueryParams({ globals: m });
  }), a.channel?.on(nn, (d, h) => {
    c.navigateUrl(d, h);
  }), {
    api: c,
    state: cn(e)
  };
}, "init");

// src/manager-api/modules/versions.ts
var Dt = {};
L(Dt, {
  init: () => un
});
var nr = ze(Be(), 1);
import j from "semver";

// src/manager-api/version.ts
var rr = "8.6.14";

// src/manager-api/modules/versions.ts
var { VERSIONCHECK: dn } = P, ar = (0, nr.default)(1)(() => {
  try {
    return { ...JSON.parse(dn).data || {} };
  } catch {
    return {};
  }
}), hn = /* @__PURE__ */ n((e) => e.includes("vue") ? "vue" : e, "normalizeRendererName"), un = /* @__PURE__ */ n(({ store: e }) => {
  let { dismissedVersionNotification: t } = e.getState(), r = {
    versions: {
      current: {
        version: rr
      },
      ...ar()
    },
    dismissedVersionNotification: t
  }, a = {
    getCurrentVersion: /* @__PURE__ */ n(() => {
      let {
        versions: { current: l }
      } = e.getState();
      return l;
    }, "getCurrentVersion"),
    getLatestVersion: /* @__PURE__ */ n(() => {
      let {
        versions: { latest: l, next: c, current: i }
      } = e.getState();
      return i && j.prerelease(i.version) && c ? l && j.gt(l.version, c.version) ? l : c : l;
    }, "getLatestVersion"),
    // TODO: Move this to it's own "info" module later
    getDocsUrl: /* @__PURE__ */ n(({ subpath: l, versioned: c, renderer: i }) => {
      let {
        versions: { latest: s, current: d }
      } = e.getState(), h = "https://storybook.js.org/docs/";
      if (c && d?.version && s?.version) {
        let v = j.diff(s.version, d.version);
        v === "patch" || v === null || (h += `${j.major(d.version)}.${j.minor(d.version)}/`);
      }
      let [u, p] = l?.split("#") || [];
      if (u && (h += `${u}/`), i && typeof P.STORYBOOK_RENDERER < "u") {
        let v = P.STORYBOOK_RENDERER;
        v && (h += `?renderer=${hn(v)}`);
      }
      return p && (h += `#${p}`), h;
    }, "getDocsUrl"),
    versionUpdateAvailable: /* @__PURE__ */ n(() => {
      let l = a.getLatestVersion(), c = a.getCurrentVersion();
      if (l) {
        if (!l.version || !c.version)
          return !0;
        let s = !!j.prerelease(c.version) ? `${j.major(c.version)}.${j.minor(c.version)}.${j.patch(
          c.version
        )}` : c.version, d = j.diff(s, l.version);
        return j.gt(l.version, s) && d !== "patch" && !d.includes("pre");
      }
      return !1;
    }, "versionUpdateAvailable")
  };
  return { init: /* @__PURE__ */ n(async () => {
    let { versions: l = {} } = e.getState(), { latest: c, next: i } = ar();
    await e.setState({
      versions: { ...l, latest: c, next: i }
    });
  }, "initModule"), state: r, api: a };
}, "init");

// src/manager-api/modules/whatsnew.tsx
var Nt = {};
L(Nt, {
  init: () => yn
});
import pn from "react";

// ../node_modules/@storybook/icons/dist/index.mjs
import * as ye from "react";
var or = /* @__PURE__ */ ye.forwardRef(({ color: e = "currentColor", size: t = 14, ...r }, a) => /* @__PURE__ */ ye.createElement(
  "svg",
  {
    width: t,
    height: t,
    viewBox: "0 0 14 14",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    ref: a,
    ...r
  },
  /* @__PURE__ */ ye.createElement(
    "path",
    {
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M2.042.616a.704.704 0 00-.66.729L1.816 12.9c.014.367.306.66.672.677l9.395.422h.032a.704.704 0 00.704-.703V.704c0-.015 0-.03-.002-.\
044a.704.704 0 00-.746-.659l-.773.049.057 1.615a.105.105 0 01-.17.086l-.52-.41-.617.468a.105.105 0 01-.168-.088L9.746.134 2.042.616zm8.003 4\
.747c-.247.192-2.092.324-2.092.05.04-1.045-.429-1.091-.689-1.091-.247 0-.662.075-.662.634 0 .57.607.893 1.32 1.27 1.014.538 2.24 1.188 2.24 \
2.823 0 1.568-1.273 2.433-2.898 2.433-1.676 0-3.141-.678-2.976-3.03.065-.275 2.197-.21 2.197 0-.026.971.195 1.256.753 1.256.43 0 .624-.236.6\
24-.634 0-.602-.633-.958-1.361-1.367-.987-.554-2.148-1.205-2.148-2.7 0-1.494 1.027-2.489 2.86-2.489 1.832 0 2.832.98 2.832 2.845z",
      fill: e
    }
  )
));

// src/manager-api/modules/whatsnew.tsx
import {
  REQUEST_WHATS_NEW_DATA as vn,
  RESULT_WHATS_NEW_DATA as mn,
  SET_WHATS_NEW_CACHE as gn,
  TOGGLE_WHATS_NEW_NOTIFICATIONS as wn
} from "@storybook/core/core-events";
var lr = "whats-new", yn = /* @__PURE__ */ n(({ fullAPI: e, store: t, provider: r }) => {
  let a = {
    whatsNewData: void 0
  };
  function o(d) {
    t.setState({ whatsNewData: d }), a.whatsNewData = d;
  }
  n(o, "setWhatsNewState");
  let l = {
    isWhatsNewUnread() {
      return a.whatsNewData?.status === "SUCCESS" && !a.whatsNewData.postIsRead;
    },
    whatsNewHasBeenRead() {
      a.whatsNewData?.status === "SUCCESS" && (i({ lastReadPost: a.whatsNewData.url }), o({ ...a.whatsNewData, postIsRead: !0 }), e.clearNotification(
      lr));
    },
    toggleWhatsNewNotifications() {
      a.whatsNewData?.status === "SUCCESS" && (o({
        ...a.whatsNewData,
        disableWhatsNewNotifications: !a.whatsNewData.disableWhatsNewNotifications
      }), r.channel?.emit(wn, {
        disableWhatsNewNotifications: a.whatsNewData.disableWhatsNewNotifications
      }));
    }
  };
  function c() {
    return r.channel?.emit(vn), new Promise(
      (d) => r.channel?.once(
        mn,
        ({ data: h }) => d(h)
      )
    );
  }
  n(c, "getLatestWhatsNewPost");
  function i(d) {
    r.channel?.emit(gn, d);
  }
  return n(i, "setWhatsNewCache"), { init: /* @__PURE__ */ n(async () => {
    if (P.CONFIG_TYPE !== "DEVELOPMENT")
      return;
    let d = await c();
    o(d);
    let h = e.getUrlState();
    !(h?.path === "/onboarding" || h.queryParams?.onboarding === "true") && d.status === "SUCCESS" && !d.disableWhatsNewNotifications && d.showNotification &&
    e.addNotification({
      id: lr,
      link: "/settings/whats-new",
      content: {
        headline: d.title,
        subHeadline: "Learn what's new in Storybook"
      },
      icon: /* @__PURE__ */ pn.createElement(or, null),
      onClear({ dismissed: p }) {
        p && i({ lastDismissedPost: d.url });
      }
    });
  }, "initModule"), state: a, api: l };
}, "init");

// src/manager-api/store.ts
var fe = ze(ir(), 1);

// ../node_modules/telejson/dist/chunk-465TF3XA.mjs
var Rn = Object.create, sr = Object.defineProperty, Sn = Object.getOwnPropertyDescriptor, cr = Object.getOwnPropertyNames, En = Object.getPrototypeOf,
In = Object.prototype.hasOwnProperty, D = /* @__PURE__ */ n((e, t) => /* @__PURE__ */ n(function() {
  return t || (0, e[cr(e)[0]])((t = { exports: {} }).exports, t), t.exports;
}, "__require"), "__commonJS"), xn = /* @__PURE__ */ n((e, t, r, a) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of cr(t))
      !In.call(e, o) && o !== r && sr(e, o, { get: /* @__PURE__ */ n(() => t[o], "get"), enumerable: !(a = Sn(t, o)) || a.enumerable });
  return e;
}, "__copyProps"), je = /* @__PURE__ */ n((e, t, r) => (r = e != null ? Rn(En(e)) : {}, xn(
  t || !e || !e.__esModule ? sr(r, "default", { value: e, enumerable: !0 }) : r,
  e
)), "__toESM"), An = [
  "bubbles",
  "cancelBubble",
  "cancelable",
  "composed",
  "currentTarget",
  "defaultPrevented",
  "eventPhase",
  "isTrusted",
  "returnValue",
  "srcElement",
  "target",
  "timeStamp",
  "type"
], Pn = ["detail"];
function fr(e) {
  let t = An.filter((r) => e[r] !== void 0).reduce((r, a) => ({ ...r, [a]: e[a] }), {});
  return e instanceof CustomEvent && Pn.filter((r) => e[r] !== void 0).forEach((r) => {
    t[r] = e[r];
  }), t;
}
n(fr, "extractEventHiddenProperties");

// ../node_modules/telejson/dist/index.mjs
var Ar = ze(Be(), 1);
var mr = D({
  "node_modules/has-symbols/shams.js"(e, t) {
    "use strict";
    t.exports = /* @__PURE__ */ n(function() {
      if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
        return !1;
      if (typeof Symbol.iterator == "symbol")
        return !0;
      var a = {}, o = Symbol("test"), l = Object(o);
      if (typeof o == "string" || Object.prototype.toString.call(o) !== "[object Symbol]" || Object.prototype.toString.call(l) !== "[object \
Symbol]")
        return !1;
      var c = 42;
      a[o] = c;
      for (o in a)
        return !1;
      if (typeof Object.keys == "function" && Object.keys(a).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(
      a).length !== 0)
        return !1;
      var i = Object.getOwnPropertySymbols(a);
      if (i.length !== 1 || i[0] !== o || !Object.prototype.propertyIsEnumerable.call(a, o))
        return !1;
      if (typeof Object.getOwnPropertyDescriptor == "function") {
        var s = Object.getOwnPropertyDescriptor(a, o);
        if (s.value !== c || s.enumerable !== !0)
          return !1;
      }
      return !0;
    }, "hasSymbols");
  }
}), gr = D({
  "node_modules/has-symbols/index.js"(e, t) {
    "use strict";
    var r = typeof Symbol < "u" && Symbol, a = mr();
    t.exports = /* @__PURE__ */ n(function() {
      return typeof r != "function" || typeof Symbol != "function" || typeof r("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 :
      a();
    }, "hasNativeSymbols");
  }
}), bn = D({
  "node_modules/function-bind/implementation.js"(e, t) {
    "use strict";
    var r = "Function.prototype.bind called on incompatible ", a = Array.prototype.slice, o = Object.prototype.toString, l = "[object Functi\
on]";
    t.exports = /* @__PURE__ */ n(function(i) {
      var s = this;
      if (typeof s != "function" || o.call(s) !== l)
        throw new TypeError(r + s);
      for (var d = a.call(arguments, 1), h, u = /* @__PURE__ */ n(function() {
        if (this instanceof h) {
          var w = s.apply(
            this,
            d.concat(a.call(arguments))
          );
          return Object(w) === w ? w : this;
        } else
          return s.apply(
            i,
            d.concat(a.call(arguments))
          );
      }, "binder"), p = Math.max(0, s.length - d.length), v = [], m = 0; m < p; m++)
        v.push("$" + m);
      if (h = Function("binder", "return function (" + v.join(",") + "){ return binder.apply(this,arguments); }")(u), s.prototype) {
        var g = /* @__PURE__ */ n(function() {
        }, "Empty2");
        g.prototype = s.prototype, h.prototype = new g(), g.prototype = null;
      }
      return h;
    }, "bind");
  }
}), Ut = D({
  "node_modules/function-bind/index.js"(e, t) {
    "use strict";
    var r = bn();
    t.exports = Function.prototype.bind || r;
  }
}), _n = D({
  "node_modules/has/src/index.js"(e, t) {
    "use strict";
    var r = Ut();
    t.exports = r.call(Function.call, Object.prototype.hasOwnProperty);
  }
}), wr = D({
  "node_modules/get-intrinsic/index.js"(e, t) {
    "use strict";
    var r, a = SyntaxError, o = Function, l = TypeError, c = /* @__PURE__ */ n(function(U) {
      try {
        return o('"use strict"; return (' + U + ").constructor;")();
      } catch {
      }
    }, "getEvalledConstructor"), i = Object.getOwnPropertyDescriptor;
    if (i)
      try {
        i({}, "");
      } catch {
        i = null;
      }
    var s = /* @__PURE__ */ n(function() {
      throw new l();
    }, "throwTypeError"), d = i ? function() {
      try {
        return arguments.callee, s;
      } catch {
        try {
          return i(arguments, "callee").get;
        } catch {
          return s;
        }
      }
    }() : s, h = gr()(), u = Object.getPrototypeOf || function(U) {
      return U.__proto__;
    }, p = {}, v = typeof Uint8Array > "u" ? r : u(Uint8Array), m = {
      "%AggregateError%": typeof AggregateError > "u" ? r : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer > "u" ? r : ArrayBuffer,
      "%ArrayIteratorPrototype%": h ? u([][Symbol.iterator]()) : r,
      "%AsyncFromSyncIteratorPrototype%": r,
      "%AsyncFunction%": p,
      "%AsyncGenerator%": p,
      "%AsyncGeneratorFunction%": p,
      "%AsyncIteratorPrototype%": p,
      "%Atomics%": typeof Atomics > "u" ? r : Atomics,
      "%BigInt%": typeof BigInt > "u" ? r : BigInt,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView > "u" ? r : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": Error,
      "%eval%": eval,
      "%EvalError%": EvalError,
      "%Float32Array%": typeof Float32Array > "u" ? r : Float32Array,
      "%Float64Array%": typeof Float64Array > "u" ? r : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? r : FinalizationRegistry,
      "%Function%": o,
      "%GeneratorFunction%": p,
      "%Int8Array%": typeof Int8Array > "u" ? r : Int8Array,
      "%Int16Array%": typeof Int16Array > "u" ? r : Int16Array,
      "%Int32Array%": typeof Int32Array > "u" ? r : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": h ? u(u([][Symbol.iterator]())) : r,
      "%JSON%": typeof JSON == "object" ? JSON : r,
      "%Map%": typeof Map > "u" ? r : Map,
      "%MapIteratorPrototype%": typeof Map > "u" || !h ? r : u((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": Object,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise > "u" ? r : Promise,
      "%Proxy%": typeof Proxy > "u" ? r : Proxy,
      "%RangeError%": RangeError,
      "%ReferenceError%": ReferenceError,
      "%Reflect%": typeof Reflect > "u" ? r : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set > "u" ? r : Set,
      "%SetIteratorPrototype%": typeof Set > "u" || !h ? r : u((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? r : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": h ? u(""[Symbol.iterator]()) : r,
      "%Symbol%": h ? Symbol : r,
      "%SyntaxError%": a,
      "%ThrowTypeError%": d,
      "%TypedArray%": v,
      "%TypeError%": l,
      "%Uint8Array%": typeof Uint8Array > "u" ? r : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? r : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array > "u" ? r : Uint16Array,
      "%Uint32Array%": typeof Uint32Array > "u" ? r : Uint32Array,
      "%URIError%": URIError,
      "%WeakMap%": typeof WeakMap > "u" ? r : WeakMap,
      "%WeakRef%": typeof WeakRef > "u" ? r : WeakRef,
      "%WeakSet%": typeof WeakSet > "u" ? r : WeakSet
    }, g = /* @__PURE__ */ n(function U(b) {
      var C;
      if (b === "%AsyncFunction%")
        C = c("async function () {}");
      else if (b === "%GeneratorFunction%")
        C = c("function* () {}");
      else if (b === "%AsyncGeneratorFunction%")
        C = c("async function* () {}");
      else if (b === "%AsyncGenerator%") {
        var _ = U("%AsyncGeneratorFunction%");
        _ && (C = _.prototype);
      } else if (b === "%AsyncIteratorPrototype%") {
        var z = U("%AsyncGenerator%");
        z && (C = u(z.prototype));
      }
      return m[b] = C, C;
    }, "doEval2"), w = {
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    }, y = Ut(), S = _n(), E = y.call(Function.call, Array.prototype.concat), A = y.call(Function.apply, Array.prototype.splice), x = y.call(
    Function.call, String.prototype.replace), I = y.call(Function.call, String.prototype.slice), M = y.call(Function.call, RegExp.prototype.
    exec), F = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, he = /\\(\\)?/g, ue = /* @__PURE__ */ n(
    function(b) {
      var C = I(b, 0, 1), _ = I(b, -1);
      if (C === "%" && _ !== "%")
        throw new a("invalid intrinsic syntax, expected closing `%`");
      if (_ === "%" && C !== "%")
        throw new a("invalid intrinsic syntax, expected opening `%`");
      var z = [];
      return x(b, F, function(G, ee, H, Ae) {
        z[z.length] = H ? x(Ae, he, "$1") : ee || G;
      }), z;
    }, "stringToPath3"), Vr = /* @__PURE__ */ n(function(b, C) {
      var _ = b, z;
      if (S(w, _) && (z = w[_], _ = "%" + z[0] + "%"), S(m, _)) {
        var G = m[_];
        if (G === p && (G = g(_)), typeof G > "u" && !C)
          throw new l("intrinsic " + b + " exists, but is not available. Please file an issue!");
        return {
          alias: z,
          name: _,
          value: G
        };
      }
      throw new a("intrinsic " + b + " does not exist!");
    }, "getBaseIntrinsic2");
    t.exports = /* @__PURE__ */ n(function(b, C) {
      if (typeof b != "string" || b.length === 0)
        throw new l("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && typeof C != "boolean")
        throw new l('"allowMissing" argument must be a boolean');
      if (M(/^%?[^%]*%?$/, b) === null)
        throw new a("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      var _ = ue(b), z = _.length > 0 ? _[0] : "", G = Vr("%" + z + "%", C), ee = G.name, H = G.value, Ae = !1, Qe = G.alias;
      Qe && (z = Qe[0], A(_, E([0, 1], Qe)));
      for (var Pe = 1, pe = !0; Pe < _.length; Pe += 1) {
        var K = _[Pe], be = I(K, 0, 1), _e = I(K, -1);
        if ((be === '"' || be === "'" || be === "`" || _e === '"' || _e === "'" || _e === "`") && be !== _e)
          throw new a("property names with quotes must have matching quotes");
        if ((K === "constructor" || !pe) && (Ae = !0), z += "." + K, ee = "%" + z + "%", S(m, ee))
          H = m[ee];
        else if (H != null) {
          if (!(K in H)) {
            if (!C)
              throw new l("base intrinsic for " + b + " exists, but the property is not available.");
            return;
          }
          if (i && Pe + 1 >= _.length) {
            var Me = i(H, K);
            pe = !!Me, pe && "get" in Me && !("originalValue" in Me.get) ? H = Me.get : H = H[K];
          } else
            pe = S(H, K), H = H[K];
          pe && !Ae && (m[ee] = H);
        }
      }
      return H;
    }, "GetIntrinsic");
  }
}), Mn = D({
  "node_modules/call-bind/index.js"(e, t) {
    "use strict";
    var r = Ut(), a = wr(), o = a("%Function.prototype.apply%"), l = a("%Function.prototype.call%"), c = a("%Reflect.apply%", !0) || r.call(
    l, o), i = a("%Object.getOwnPropertyDescriptor%", !0), s = a("%Object.defineProperty%", !0), d = a("%Math.max%");
    if (s)
      try {
        s({}, "a", { value: 1 });
      } catch {
        s = null;
      }
    t.exports = /* @__PURE__ */ n(function(p) {
      var v = c(r, l, arguments);
      if (i && s) {
        var m = i(v, "length");
        m.configurable && s(
          v,
          "length",
          { value: 1 + d(0, p.length - (arguments.length - 1)) }
        );
      }
      return v;
    }, "callBind");
    var h = /* @__PURE__ */ n(function() {
      return c(r, o, arguments);
    }, "applyBind2");
    s ? s(t.exports, "apply", { value: h }) : t.exports.apply = h;
  }
}), Cn = D({
  "node_modules/call-bind/callBound.js"(e, t) {
    "use strict";
    var r = wr(), a = Mn(), o = a(r("String.prototype.indexOf"));
    t.exports = /* @__PURE__ */ n(function(c, i) {
      var s = r(c, !!i);
      return typeof s == "function" && o(c, ".prototype.") > -1 ? a(s) : s;
    }, "callBoundIntrinsic");
  }
}), zn = D({
  "node_modules/has-tostringtag/shams.js"(e, t) {
    "use strict";
    var r = mr();
    t.exports = /* @__PURE__ */ n(function() {
      return r() && !!Symbol.toStringTag;
    }, "hasToStringTagShams");
  }
}), Tn = D({
  "node_modules/is-regex/index.js"(e, t) {
    "use strict";
    var r = Cn(), a = zn()(), o, l, c, i;
    a && (o = r("Object.prototype.hasOwnProperty"), l = r("RegExp.prototype.exec"), c = {}, s = /* @__PURE__ */ n(function() {
      throw c;
    }, "throwRegexMarker"), i = {
      toString: s,
      valueOf: s
    }, typeof Symbol.toPrimitive == "symbol" && (i[Symbol.toPrimitive] = s));
    var s, d = r("Object.prototype.toString"), h = Object.getOwnPropertyDescriptor, u = "[object RegExp]";
    t.exports = /* @__PURE__ */ n(a ? function(v) {
      if (!v || typeof v != "object")
        return !1;
      var m = h(v, "lastIndex"), g = m && o(m, "value");
      if (!g)
        return !1;
      try {
        l(v, i);
      } catch (w) {
        return w === c;
      }
    } : function(v) {
      return !v || typeof v != "object" && typeof v != "function" ? !1 : d(v) === u;
    }, "isRegex");
  }
}), Hn = D({
  "node_modules/is-function/index.js"(e, t) {
    t.exports = a;
    var r = Object.prototype.toString;
    function a(o) {
      if (!o)
        return !1;
      var l = r.call(o);
      return l === "[object Function]" || typeof o == "function" && l !== "[object RegExp]" || typeof window < "u" && (o === window.setTimeout ||
      o === window.alert || o === window.confirm || o === window.prompt);
    }
    n(a, "isFunction3");
  }
}), Ln = D({
  "node_modules/is-symbol/index.js"(e, t) {
    "use strict";
    var r = Object.prototype.toString, a = gr()();
    a ? (o = Symbol.prototype.toString, l = /^Symbol\(.*\)$/, c = /* @__PURE__ */ n(function(s) {
      return typeof s.valueOf() != "symbol" ? !1 : l.test(o.call(s));
    }, "isRealSymbolObject"), t.exports = /* @__PURE__ */ n(function(s) {
      if (typeof s == "symbol")
        return !0;
      if (r.call(s) !== "[object Symbol]")
        return !1;
      try {
        return c(s);
      } catch {
        return !1;
      }
    }, "isSymbol3")) : t.exports = /* @__PURE__ */ n(function(s) {
      return !1;
    }, "isSymbol3");
    var o, l, c;
  }
}), On = je(Tn()), Bn = je(Hn()), Vn = je(Ln());
function Dn(e) {
  return e != null && typeof e == "object" && Array.isArray(e) === !1;
}
n(Dn, "isObject");
var Nn = typeof global == "object" && global && global.Object === Object && global, kn = Nn, Un = typeof self == "object" && self && self.Object ===
Object && self, jn = kn || Un || Function("return this")(), jt = jn, Fn = jt.Symbol, le = Fn, yr = Object.prototype, Gn = yr.hasOwnProperty,
$n = yr.toString, Re = le ? le.toStringTag : void 0;
function Wn(e) {
  var t = Gn.call(e, Re), r = e[Re];
  try {
    e[Re] = void 0;
    var a = !0;
  } catch {
  }
  var o = $n.call(e);
  return a && (t ? e[Re] = r : delete e[Re]), o;
}
n(Wn, "getRawTag");
var Kn = Wn, qn = Object.prototype, Yn = qn.toString;
function Jn(e) {
  return Yn.call(e);
}
n(Jn, "objectToString");
var Qn = Jn, Xn = "[object Null]", Zn = "[object Undefined]", dr = le ? le.toStringTag : void 0;
function e1(e) {
  return e == null ? e === void 0 ? Zn : Xn : dr && dr in Object(e) ? Kn(e) : Qn(e);
}
n(e1, "baseGetTag");
var Rr = e1;
function t1(e) {
  return e != null && typeof e == "object";
}
n(t1, "isObjectLike");
var r1 = t1, a1 = "[object Symbol]";
function n1(e) {
  return typeof e == "symbol" || r1(e) && Rr(e) == a1;
}
n(n1, "isSymbol");
var Ft = n1;
function o1(e, t) {
  for (var r = -1, a = e == null ? 0 : e.length, o = Array(a); ++r < a; )
    o[r] = t(e[r], r, e);
  return o;
}
n(o1, "arrayMap");
var l1 = o1, i1 = Array.isArray, Gt = i1, s1 = 1 / 0, hr = le ? le.prototype : void 0, ur = hr ? hr.toString : void 0;
function Sr(e) {
  if (typeof e == "string")
    return e;
  if (Gt(e))
    return l1(e, Sr) + "";
  if (Ft(e))
    return ur ? ur.call(e) : "";
  var t = e + "";
  return t == "0" && 1 / e == -s1 ? "-0" : t;
}
n(Sr, "baseToString");
var c1 = Sr;
function f1(e) {
  var t = typeof e;
  return e != null && (t == "object" || t == "function");
}
n(f1, "isObject2");
var Er = f1, d1 = "[object AsyncFunction]", h1 = "[object Function]", u1 = "[object GeneratorFunction]", p1 = "[object Proxy]";
function v1(e) {
  if (!Er(e))
    return !1;
  var t = Rr(e);
  return t == h1 || t == u1 || t == d1 || t == p1;
}
n(v1, "isFunction");
var m1 = v1, g1 = jt["__core-js_shared__"], kt = g1, pr = function() {
  var e = /[^.]+$/.exec(kt && kt.keys && kt.keys.IE_PROTO || "");
  return e ? "Symbol(src)_1." + e : "";
}();
function w1(e) {
  return !!pr && pr in e;
}
n(w1, "isMasked");
var y1 = w1, R1 = Function.prototype, S1 = R1.toString;
function E1(e) {
  if (e != null) {
    try {
      return S1.call(e);
    } catch {
    }
    try {
      return e + "";
    } catch {
    }
  }
  return "";
}
n(E1, "toSource");
var I1 = E1, x1 = /[\\^$.*+?()[\]{}|]/g, A1 = /^\[object .+?Constructor\]$/, P1 = Function.prototype, b1 = Object.prototype, _1 = P1.toString,
M1 = b1.hasOwnProperty, C1 = RegExp(
  "^" + _1.call(M1).replace(x1, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function z1(e) {
  if (!Er(e) || y1(e))
    return !1;
  var t = m1(e) ? C1 : A1;
  return t.test(I1(e));
}
n(z1, "baseIsNative");
var T1 = z1;
function H1(e, t) {
  return e?.[t];
}
n(H1, "getValue");
var L1 = H1;
function O1(e, t) {
  var r = L1(e, t);
  return T1(r) ? r : void 0;
}
n(O1, "getNative");
var Ir = O1;
function B1(e, t) {
  return e === t || e !== e && t !== t;
}
n(B1, "eq");
var V1 = B1, D1 = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, N1 = /^\w*$/;
function k1(e, t) {
  if (Gt(e))
    return !1;
  var r = typeof e;
  return r == "number" || r == "symbol" || r == "boolean" || e == null || Ft(e) ? !0 : N1.test(e) || !D1.test(e) || t != null && e in Object(
  t);
}
n(k1, "isKey");
var U1 = k1, j1 = Ir(Object, "create"), Se = j1;
function F1() {
  this.__data__ = Se ? Se(null) : {}, this.size = 0;
}
n(F1, "hashClear");
var G1 = F1;
function $1(e) {
  var t = this.has(e) && delete this.__data__[e];
  return this.size -= t ? 1 : 0, t;
}
n($1, "hashDelete");
var W1 = $1, K1 = "__lodash_hash_undefined__", q1 = Object.prototype, Y1 = q1.hasOwnProperty;
function J1(e) {
  var t = this.__data__;
  if (Se) {
    var r = t[e];
    return r === K1 ? void 0 : r;
  }
  return Y1.call(t, e) ? t[e] : void 0;
}
n(J1, "hashGet");
var Q1 = J1, X1 = Object.prototype, Z1 = X1.hasOwnProperty;
function e5(e) {
  var t = this.__data__;
  return Se ? t[e] !== void 0 : Z1.call(t, e);
}
n(e5, "hashHas");
var t5 = e5, r5 = "__lodash_hash_undefined__";
function a5(e, t) {
  var r = this.__data__;
  return this.size += this.has(e) ? 0 : 1, r[e] = Se && t === void 0 ? r5 : t, this;
}
n(a5, "hashSet");
var n5 = a5;
function ie(e) {
  var t = -1, r = e == null ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var a = e[t];
    this.set(a[0], a[1]);
  }
}
n(ie, "Hash");
ie.prototype.clear = G1;
ie.prototype.delete = W1;
ie.prototype.get = Q1;
ie.prototype.has = t5;
ie.prototype.set = n5;
var vr = ie;
function o5() {
  this.__data__ = [], this.size = 0;
}
n(o5, "listCacheClear");
var l5 = o5;
function i5(e, t) {
  for (var r = e.length; r--; )
    if (V1(e[r][0], t))
      return r;
  return -1;
}
n(i5, "assocIndexOf");
var Ge = i5, s5 = Array.prototype, c5 = s5.splice;
function f5(e) {
  var t = this.__data__, r = Ge(t, e);
  if (r < 0)
    return !1;
  var a = t.length - 1;
  return r == a ? t.pop() : c5.call(t, r, 1), --this.size, !0;
}
n(f5, "listCacheDelete");
var d5 = f5;
function h5(e) {
  var t = this.__data__, r = Ge(t, e);
  return r < 0 ? void 0 : t[r][1];
}
n(h5, "listCacheGet");
var u5 = h5;
function p5(e) {
  return Ge(this.__data__, e) > -1;
}
n(p5, "listCacheHas");
var v5 = p5;
function m5(e, t) {
  var r = this.__data__, a = Ge(r, e);
  return a < 0 ? (++this.size, r.push([e, t])) : r[a][1] = t, this;
}
n(m5, "listCacheSet");
var g5 = m5;
function se(e) {
  var t = -1, r = e == null ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var a = e[t];
    this.set(a[0], a[1]);
  }
}
n(se, "ListCache");
se.prototype.clear = l5;
se.prototype.delete = d5;
se.prototype.get = u5;
se.prototype.has = v5;
se.prototype.set = g5;
var w5 = se, y5 = Ir(jt, "Map"), R5 = y5;
function S5() {
  this.size = 0, this.__data__ = {
    hash: new vr(),
    map: new (R5 || w5)(),
    string: new vr()
  };
}
n(S5, "mapCacheClear");
var E5 = S5;
function I5(e) {
  var t = typeof e;
  return t == "string" || t == "number" || t == "symbol" || t == "boolean" ? e !== "__proto__" : e === null;
}
n(I5, "isKeyable");
var x5 = I5;
function A5(e, t) {
  var r = e.__data__;
  return x5(t) ? r[typeof t == "string" ? "string" : "hash"] : r.map;
}
n(A5, "getMapData");
var $e = A5;
function P5(e) {
  var t = $e(this, e).delete(e);
  return this.size -= t ? 1 : 0, t;
}
n(P5, "mapCacheDelete");
var b5 = P5;
function _5(e) {
  return $e(this, e).get(e);
}
n(_5, "mapCacheGet");
var M5 = _5;
function C5(e) {
  return $e(this, e).has(e);
}
n(C5, "mapCacheHas");
var z5 = C5;
function T5(e, t) {
  var r = $e(this, e), a = r.size;
  return r.set(e, t), this.size += r.size == a ? 0 : 1, this;
}
n(T5, "mapCacheSet");
var H5 = T5;
function ce(e) {
  var t = -1, r = e == null ? 0 : e.length;
  for (this.clear(); ++t < r; ) {
    var a = e[t];
    this.set(a[0], a[1]);
  }
}
n(ce, "MapCache");
ce.prototype.clear = E5;
ce.prototype.delete = b5;
ce.prototype.get = M5;
ce.prototype.has = z5;
ce.prototype.set = H5;
var xr = ce, L5 = "Expected a function";
function $t(e, t) {
  if (typeof e != "function" || t != null && typeof t != "function")
    throw new TypeError(L5);
  var r = /* @__PURE__ */ n(function() {
    var a = arguments, o = t ? t.apply(this, a) : a[0], l = r.cache;
    if (l.has(o))
      return l.get(o);
    var c = e.apply(this, a);
    return r.cache = l.set(o, c) || l, c;
  }, "memoized");
  return r.cache = new ($t.Cache || xr)(), r;
}
n($t, "memoize");
$t.Cache = xr;
var O5 = $t, B5 = 500;
function V5(e) {
  var t = O5(e, function(a) {
    return r.size === B5 && r.clear(), a;
  }), r = t.cache;
  return t;
}
n(V5, "memoizeCapped");
var D5 = V5, N5 = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, k5 = /\\(\\)?/g, U5 = D5(
function(e) {
  var t = [];
  return e.charCodeAt(0) === 46 && t.push(""), e.replace(N5, function(r, a, o, l) {
    t.push(o ? l.replace(k5, "$1") : a || r);
  }), t;
}), j5 = U5;
function F5(e) {
  return e == null ? "" : c1(e);
}
n(F5, "toString");
var G5 = F5;
function $5(e, t) {
  return Gt(e) ? e : U1(e, t) ? [e] : j5(G5(e));
}
n($5, "castPath");
var W5 = $5, K5 = 1 / 0;
function q5(e) {
  if (typeof e == "string" || Ft(e))
    return e;
  var t = e + "";
  return t == "0" && 1 / e == -K5 ? "-0" : t;
}
n(q5, "toKey");
var Y5 = q5;
function J5(e, t) {
  t = W5(t, e);
  for (var r = 0, a = t.length; e != null && r < a; )
    e = e[Y5(t[r++])];
  return r && r == a ? e : void 0;
}
n(J5, "baseGet");
var Q5 = J5;
function X5(e, t, r) {
  var a = e == null ? void 0 : Q5(e, t);
  return a === void 0 ? r : a;
}
n(X5, "get");
var Z5 = X5, Fe = Dn, eo = /* @__PURE__ */ n((e) => {
  let t = null, r = !1, a = !1, o = !1, l = "";
  if (e.indexOf("//") >= 0 || e.indexOf("/*") >= 0)
    for (let c = 0; c < e.length; c += 1)
      !t && !r && !a && !o ? e[c] === '"' || e[c] === "'" || e[c] === "`" ? t = e[c] : e[c] === "/" && e[c + 1] === "*" ? r = !0 : e[c] === "\
/" && e[c + 1] === "/" ? a = !0 : e[c] === "/" && e[c + 1] !== "/" && (o = !0) : (t && (e[c] === t && e[c - 1] !== "\\" || e[c] === `
` && t !== "`") && (t = null), o && (e[c] === "/" && e[c - 1] !== "\\" || e[c] === `
`) && (o = !1), r && e[c - 1] === "/" && e[c - 2] === "*" && (r = !1), a && e[c] === `
` && (a = !1)), !r && !a && (l += e[c]);
  else
    l = e;
  return l;
}, "removeCodeComments"), to = (0, Ar.default)(1e4)(
  (e) => eo(e).replace(/\n\s*/g, "").trim()
), ro = /* @__PURE__ */ n(function(t, r) {
  let a = r.slice(0, r.indexOf("{")), o = r.slice(r.indexOf("{"));
  if (a.includes("=>") || a.includes("function"))
    return r;
  let l = a;
  return l = l.replace(t, "function"), l + o;
}, "convertShorthandMethods2"), ao = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, no = /* @__PURE__ */ n((e) => e.match(/^[\[\{\"\}].*[\]\}\"]$/),
"isJSON");
function Pr(e) {
  if (!Fe(e))
    return e;
  let t = e, r = !1;
  return typeof Event < "u" && e instanceof Event && (t = fr(t), r = !0), t = Object.keys(t).reduce((a, o) => {
    try {
      t[o] && t[o].toJSON, a[o] = t[o];
    } catch {
      r = !0;
    }
    return a;
  }, {}), r ? t : e;
}
n(Pr, "convertUnconventionalData");
var oo = /* @__PURE__ */ n(function(t) {
  let r, a, o, l;
  return /* @__PURE__ */ n(function(i, s) {
    try {
      if (i === "")
        return l = [], r = /* @__PURE__ */ new Map([[s, "[]"]]), a = /* @__PURE__ */ new Map(), o = [], s;
      let d = a.get(this) || this;
      for (; o.length && d !== o[0]; )
        o.shift(), l.pop();
      if (typeof s == "boolean")
        return s;
      if (s === void 0)
        return t.allowUndefined ? "_undefined_" : void 0;
      if (s === null)
        return null;
      if (typeof s == "number")
        return s === -1 / 0 ? "_-Infinity_" : s === 1 / 0 ? "_Infinity_" : Number.isNaN(s) ? "_NaN_" : s;
      if (typeof s == "bigint")
        return `_bigint_${s.toString()}`;
      if (typeof s == "string")
        return ao.test(s) ? t.allowDate ? `_date_${s}` : void 0 : s;
      if ((0, On.default)(s))
        return t.allowRegExp ? `_regexp_${s.flags}|${s.source}` : void 0;
      if ((0, Bn.default)(s)) {
        if (!t.allowFunction)
          return;
        let { name: u } = s, p = s.toString();
        return p.match(
          /(\[native code\]|WEBPACK_IMPORTED_MODULE|__webpack_exports__|__webpack_require__)/
        ) ? `_function_${u}|${(() => {
        }).toString()}` : `_function_${u}|${to(ro(i, p))}`;
      }
      if ((0, Vn.default)(s)) {
        if (!t.allowSymbol)
          return;
        let u = Symbol.keyFor(s);
        return u !== void 0 ? `_gsymbol_${u}` : `_symbol_${s.toString().slice(7, -1)}`;
      }
      if (o.length >= t.maxDepth)
        return Array.isArray(s) ? `[Array(${s.length})]` : "[Object]";
      if (s === this)
        return `_duplicate_${JSON.stringify(l)}`;
      if (s instanceof Error && t.allowError)
        return {
          __isConvertedError__: !0,
          errorProperties: {
            ...s.cause ? { cause: s.cause } : {},
            ...s,
            name: s.name,
            message: s.message,
            stack: s.stack,
            "_constructor-name_": s.constructor.name
          }
        };
      if (s.constructor && s.constructor.name && s.constructor.name !== "Object" && !Array.isArray(s) && !t.allowClass)
        return;
      let h = r.get(s);
      if (!h) {
        let u = Array.isArray(s) ? s : Pr(s);
        if (s.constructor && s.constructor.name && s.constructor.name !== "Object" && !Array.isArray(s) && t.allowClass)
          try {
            Object.assign(u, { "_constructor-name_": s.constructor.name });
          } catch {
          }
        return l.push(i), o.unshift(u), r.set(s, JSON.stringify(l)), s !== u && a.set(s, u), u;
      }
      return `_duplicate_${h}`;
    } catch {
      return;
    }
  }, "replace");
}, "replacer2"), lo = /* @__PURE__ */ n(function reviver(options) {
  let refs = [], root;
  return /* @__PURE__ */ n(function revive(key, value) {
    if (key === "" && (root = value, refs.forEach(({ target: e, container: t, replacement: r }) => {
      let a = no(r) ? JSON.parse(r) : r.split(".");
      a.length === 0 ? t[e] = root : t[e] = Z5(root, a);
    })), key === "_constructor-name_")
      return value;
    if (Fe(value) && value.__isConvertedError__) {
      let { message: e, ...t } = value.errorProperties, r = new Error(e);
      return Object.assign(r, t), r;
    }
    if (Fe(value) && value["_constructor-name_"] && options.allowFunction) {
      let e = value["_constructor-name_"];
      if (e !== "Object") {
        let t = new Function(`return function ${e.replace(/[^a-zA-Z0-9$_]+/g, "")}(){}`)();
        Object.setPrototypeOf(value, new t());
      }
      return delete value["_constructor-name_"], value;
    }
    if (typeof value == "string" && value.startsWith("_function_") && options.allowFunction) {
      let [, name, source] = value.match(/_function_([^|]*)\|(.*)/) || [], sourceSanitized = source.replace(/[(\(\))|\\| |\]|`]*$/, "");
      if (!options.lazyEval)
        return eval(`(${sourceSanitized})`);
      let result = /* @__PURE__ */ n((...args) => {
        let f = eval(`(${sourceSanitized})`);
        return f(...args);
      }, "result");
      return Object.defineProperty(result, "toString", {
        value: /* @__PURE__ */ n(() => sourceSanitized, "value")
      }), Object.defineProperty(result, "name", {
        value: name
      }), result;
    }
    if (typeof value == "string" && value.startsWith("_regexp_") && options.allowRegExp) {
      let [, e, t] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
      return new RegExp(t, e);
    }
    return typeof value == "string" && value.startsWith("_date_") && options.allowDate ? new Date(value.replace("_date_", "")) : typeof value ==
    "string" && value.startsWith("_duplicate_") ? (refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, "") }),
    null) : typeof value == "string" && value.startsWith("_symbol_") && options.allowSymbol ? Symbol(value.replace("_symbol_", "")) : typeof value ==
    "string" && value.startsWith("_gsymbol_") && options.allowSymbol ? Symbol.for(value.replace("_gsymbol_", "")) : typeof value == "string" &&
    value === "_-Infinity_" ? -1 / 0 : typeof value == "string" && value === "_Infinity_" ? 1 / 0 : typeof value == "string" && value === "_\
NaN_" ? NaN : typeof value == "string" && value.startsWith("_bigint_") && typeof BigInt == "function" ? BigInt(value.replace("_bigint_", "")) :
    value;
  }, "revive");
}, "reviver"), br = {
  maxDepth: 10,
  space: void 0,
  allowFunction: !0,
  allowRegExp: !0,
  allowDate: !0,
  allowClass: !0,
  allowError: !0,
  allowUndefined: !0,
  allowSymbol: !0,
  lazyEval: !0
}, _r = /* @__PURE__ */ n((e, t = {}) => {
  let r = { ...br, ...t };
  return JSON.stringify(Pr(e), oo(r), t.space);
}, "stringify"), io = /* @__PURE__ */ n(() => {
  let e = /* @__PURE__ */ new Map();
  return /* @__PURE__ */ n(function t(r) {
    Fe(r) && Object.entries(r).forEach(([a, o]) => {
      o === "_undefined_" ? r[a] = void 0 : e.get(o) || (e.set(o, !0), t(o));
    }), Array.isArray(r) && r.forEach((a, o) => {
      a === "_undefined_" ? (e.set(a, !0), r[o] = void 0) : e.get(a) || (e.set(a, !0), t(a));
    });
  }, "mutateUndefined");
}, "mutator"), Mr = /* @__PURE__ */ n((e, t = {}) => {
  let r = { ...br, ...t }, a = JSON.parse(e, lo(r));
  return io()(a), a;
}, "parse");

// src/manager-api/lib/store-setup.ts
var Cr = /* @__PURE__ */ n((e) => {
  e.fn("set", function(t, r) {
    return e.set(
      // @ts-expect-error('this' implicitly has type 'any')
      this._area,
      // @ts-expect-error('this' implicitly has type 'any')
      this._in(t),
      _r(r, { maxDepth: 50, allowFunction: !1 })
    );
  }), e.fn("get", function(t, r) {
    let a = e.get(this._area, this._in(t));
    return a !== null ? Mr(a) : r || a;
  });
}, "default");

// src/manager-api/store.ts
Cr(fe.default._);
var zr = "@storybook/manager/store";
function Wt(e) {
  return e.get(zr) || {};
}
n(Wt, "get");
function so(e, t) {
  return e.set(zr, t);
}
n(so, "set");
function co(e, t) {
  let r = Wt(e);
  return so(e, { ...r, ...t });
}
n(co, "update");
var Kt = class Kt {
  constructor({ setState: t, getState: r }) {
    this.upstreamSetState = t, this.upstreamGetState = r;
  }
  // The assumption is that this will be called once, to initialize the React state
  // when the module is instantiated
  getInitialState(t) {
    return { ...t, ...Wt(fe.default.local), ...Wt(fe.default.session) };
  }
  getState() {
    return this.upstreamGetState();
  }
  async setState(t, r, a) {
    let o, l;
    typeof r == "function" ? (o = r, l = a) : l = r;
    let { persistence: c = "none" } = l || {}, i = {}, s = {};
    typeof t == "function" ? i = /* @__PURE__ */ n((h) => (s = t(h), s), "patch") : (i = t, s = i);
    let d = await new Promise((h) => {
      this.upstreamSetState(i, () => {
        h(this.getState());
      });
    });
    if (c !== "none") {
      let h = c === "session" ? fe.default.session : fe.default.local;
      await co(h, s);
    }
    return o && o(d), d;
  }
};
n(Kt, "Store");
var Ee = Kt;

// src/manager-api/lib/request-response.ts
var qt = class qt extends Error {
  constructor(r, a) {
    super(r);
    this.payload = void 0;
    this.payload = a;
  }
};
n(qt, "RequestResponseError");
var We = qt, zs = /* @__PURE__ */ n((e, t, r, a, o = 5e3) => {
  let l;
  return new Promise((c, i) => {
    let s = {
      id: Math.random().toString(16).slice(2),
      payload: a
    }, d = /* @__PURE__ */ n((h) => {
      h.id === s.id && (clearTimeout(l), e.off(r, d), h.success ? c(h.payload) : i(new We(h.error, h.payload)));
    }, "responseHandler");
    e.emit(t, s), e.on(r, d), l = setTimeout(() => {
      e.off(r, d), i(new We("Timed out waiting for response"));
    }, o);
  });
}, "experimental_requestResponse");

// src/shared/universal-store/instances.ts
var Yt = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var fo = "UNIVERSAL_STORE:", k = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, R = class R {
  constructor(t, r) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = /* @__PURE__ */ n(() => (this.debug("getState", { state: this.state }), this.state), "getState");
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = /* @__PURE__ */ n((t, r) => {
      let a = typeof t == "function", o = a ? "*" : t, l = a ? t : r;
      if (this.debug("subscribe", { eventType: o, listener: l }), !l)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(o) || this.listeners.set(o, /* @__PURE__ */ new Set()), this.listeners.get(o).add(l), () => {
        this.debug("unsubscribe", { eventType: o, listener: l }), this.listeners.has(o) && (this.listeners.get(o).delete(l), this.listeners.
        get(o)?.size === 0 && this.listeners.delete(o));
      };
    }, "subscribe");
    /** Sends a custom event to the other stores */
    this.send = /* @__PURE__ */ n((t) => {
      if (this.debug("send", { event: t }), this.status !== R.Status.READY)
        throw new TypeError(
          B`Cannot send event before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
            {
              event: t,
              id: this.id,
              actor: this.actor,
              environment: this.environment
            },
            null,
            2
          )}`
        );
      this.emitToListeners(t, { actor: this.actor }), this.emitToChannel(t, { actor: this.actor });
    }, "send");
    if (this.debugging = t.debug ?? !1, !R.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (R.isInternalConstructing = !1, this.id = t.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.
    actorType = t.leader ? R.ActorType.LEADER : R.ActorType.FOLLOWER, this.state = t.initialState, this.channelEventName = `${fo}${this.id}`,
    this.debug("constructor", {
      options: t,
      environmentOverrides: r,
      channelEventName: this.channelEventName
    }), this.actor.type === R.ActorType.LEADER)
      this.syncing = {
        state: k.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let a, o, l = new Promise((c, i) => {
        a = /* @__PURE__ */ n(() => {
          this.syncing.state === k.PENDING && (this.syncing.state = k.RESOLVED, c());
        }, "syncingResolve"), o = /* @__PURE__ */ n((s) => {
          this.syncing.state === k.PENDING && (this.syncing.state = k.REJECTED, i(s));
        }, "syncingReject");
      });
      this.syncing = {
        state: k.PENDING,
        promise: l,
        resolve: a,
        reject: o
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange =
    this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.
    prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(
    this), this.debug = this.debug.bind(this), this.channel = r?.channel ?? R.preparation.channel, this.environment = r?.environment ?? R.preparation.
    environment, this.channel && this.environment ? this.prepareThis({ channel: this.channel, environment: this.environment }) : R.preparation.
    promise.then(this.prepareThis);
  }
  static setupPreparationPromise() {
    let t, r, a = new Promise(
      (o, l) => {
        t = /* @__PURE__ */ n((c) => {
          o(c);
        }, "resolveRef"), r = /* @__PURE__ */ n((...c) => {
          l(c);
        }, "rejectRef");
      }
    );
    R.preparation = {
      resolve: t,
      reject: r,
      promise: a
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? R.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return R.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case k.PENDING:
      case void 0:
        return R.Status.SYNCING;
      case k.REJECTED:
        return R.Status.ERROR;
      case k.RESOLVED:
      default:
        return R.Status.READY;
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
    return Promise.all([R.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(t) {
    if (!t || typeof t?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    t.debug && console.debug(
      B`[UniversalStore]
        create`,
      { options: t }
    );
    let r = Yt.get(t.id);
    if (r)
      return console.warn(B`UniversalStore with id "${t.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), r;
    R.isInternalConstructing = !0;
    let a = new R(t);
    return Yt.set(t.id, a), a;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(t, r) {
    R.preparation.channel = t, R.preparation.environment = r, R.preparation.resolve({ channel: t, environment: r });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(t) {
    let r = this.state, a = typeof t == "function" ? t(r) : t;
    if (this.debug("setState", { newState: a, previousState: r, updater: t }), this.status !== R.Status.READY)
      throw new TypeError(
        B`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState: a,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = a;
    let o = {
      type: R.InternalEventType.SET_STATE,
      payload: {
        state: a,
        previousState: r
      }
    };
    this.emitToChannel(o, { actor: this.actor }), this.emitToListeners(o, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(t) {
    return this.debug("onStateChange", { listener: t }), this.subscribe(
      R.InternalEventType.SET_STATE,
      ({ payload: r }, a) => {
        t(r.state, r.previousState, a);
      }
    );
  }
  emitToChannel(t, r) {
    this.debug("emitToChannel", { event: t, eventInfo: r, channel: this.channel }), this.channel?.emit(this.channelEventName, {
      event: t,
      eventInfo: r
    });
  }
  prepareThis({
    channel: t,
    environment: r
  }) {
    this.channel = t, this.environment = r, this.debug("prepared", { channel: t, environment: r }), this.channel.on(this.channelEventName, this.
    handleChannelEvents), this.actor.type === R.ActorType.LEADER ? this.emitToChannel(
      { type: R.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: R.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: R.InternalEventType.EXISTING_STATE_REQUEST },
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
  emitToListeners(t, r) {
    let a = this.listeners.get(t.type), o = this.listeners.get("*");
    this.debug("emitToListeners", {
      event: t,
      eventInfo: r,
      eventTypeListeners: a,
      everythingListeners: o
    }), [...a ?? [], ...o ?? []].forEach(
      (l) => l(t, r)
    );
  }
  handleChannelEvents(t) {
    let { event: r, eventInfo: a } = t;
    if ([a.actor.id, a.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent: t });
      return;
    } else if (this.syncing?.state === k.PENDING && r.type !== R.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent: t });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent: t }), this.actor.type === R.ActorType.LEADER) {
      let o = !0;
      switch (r.type) {
        case R.InternalEventType.EXISTING_STATE_REQUEST:
          o = !1;
          let l = {
            type: R.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent: l
          }), this.emitToChannel(l, { actor: this.actor });
          break;
        case R.InternalEventType.LEADER_CREATED:
          o = !1, this.syncing.state = k.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event: r
          }), console.error(
            B`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(a.actor, null, 2)}`
          );
          break;
      }
      o && (this.debug("handleChannelEvents: forwarding event", { channelEvent: t }), this.emitToChannel(r, { actor: a.actor, forwardingActor: this.
      actor }));
    }
    if (this.actor.type === R.ActorType.FOLLOWER)
      switch (r.type) {
        case R.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event: r
          }), this.syncing?.state !== k.PENDING)
            break;
          this.syncing.resolve?.();
          let o = {
            type: R.InternalEventType.SET_STATE,
            payload: {
              state: r.payload,
              previousState: this.state
            }
          };
          this.state = r.payload, this.emitToListeners(o, a);
          break;
      }
    switch (r.type) {
      case R.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event: r }), this.state = r.payload.state;
        break;
    }
    this.emitToListeners(r, { actor: a.actor });
  }
  debug(t, r) {
    this.debugging && console.debug(
      B`[UniversalStore::${this.id}::${this.environment ?? R.Environment.UNKNOWN}]
        ${t}`,
      JSON.stringify(
        {
          data: r,
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
    R.preparation.reject(new Error("reset")), R.setupPreparationPromise(), R.isInternalConstructing = !1;
  }
};
n(R, "UniversalStore"), /**
 * Defines the possible actor types in the store system
 *
 * @readonly
 */
R.ActorType = {
  LEADER: "LEADER",
  FOLLOWER: "FOLLOWER"
}, /**
 * Defines the possible environments the store can run in
 *
 * @readonly
 */
R.Environment = {
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
R.InternalEventType = {
  EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
  EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
  SET_STATE: "__SET_STATE",
  LEADER_CREATED: "__LEADER_CREATED",
  FOLLOWER_CREATED: "__FOLLOWER_CREATED"
}, R.Status = {
  UNPREPARED: "UNPREPARED",
  SYNCING: "SYNCING",
  READY: "READY",
  ERROR: "ERROR"
}, // This is used to check if constructor was called from the static factory create()
R.isInternalConstructing = !1, R.setupPreparationPromise();
var J = R;

// src/shared/universal-store/use-universal-store-manager.ts
import * as Ie from "react";
var ho = /* @__PURE__ */ n((e, t) => {
  let r = Ie.useCallback(
    (l) => e.onStateChange((c, i) => {
      if (!t) {
        l();
        return;
      }
      let s = t(c), d = t(i);
      !O(s, d) && l();
    }),
    [e, t]
  ), a = Ie.useCallback(
    () => t ? t(e.getState()) : e.getState(),
    [e, t]
  );
  return [Ie.useSyncExternalStore(r, a), e.setState];
}, "useUniversalStore");

// src/shared/universal-store/mock.ts
import { Channel as uo } from "@storybook/core/channels";
var Ke = class Ke extends J {
  constructor(t, r) {
    J.isInternalConstructing = !0, super(
      { ...t, leader: !0 },
      { channel: new uo({}), environment: J.Environment.MOCK }
    ), J.isInternalConstructing = !1, typeof r?.fn == "function" && (this.testUtils = r, this.getState = r.fn(this.getState), this.setState =
    r.fn(this.setState), this.subscribe = r.fn(this.subscribe), this.onStateChange = r.fn(this.onStateChange), this.send = r.fn(this.send));
  }
  /** Create a mock universal store. This is just an alias for the constructor */
  static create(t, r) {
    return new Ke(t, r);
  }
  unsubscribeAll() {
    if (!this.testUtils)
      throw new Error(
        V0`Cannot call unsubscribeAll on a store that does not have testUtils.
        Please provide testUtils as the second argument when creating the store.`
      );
    let t = /* @__PURE__ */ n((r) => {
      try {
        r.value();
      } catch {
      }
    }, "callReturnedUnsubscribeFn");
    this.subscribe.mock?.results.forEach(t), this.onStateChange.mock?.results.forEach(t);
  }
};
n(Ke, "MockUniversalStore");
var Jt = Ke;

// src/manager-api/root.tsx
var { ActiveTabs: rc } = De;
var Je = _0({ api: void 0, state: Oe({}) }), G0 = /* @__PURE__ */ n((...e) => C0({}, ...e), "combineParameters"), Ye = class Ye extends po {
  constructor(r) {
    super(r);
    this.api = {};
    this.initModules = /* @__PURE__ */ n(() => {
      this.modules.forEach((r) => {
        "init" in r && r.init();
      });
    }, "initModules");
    let {
      location: a,
      path: o,
      refId: l,
      viewMode: c = r.docsOptions.docsMode ? "docs" : r.viewMode,
      singleStory: i,
      storyId: s,
      docsOptions: d,
      navigate: h
    } = r, u = new Ee({
      getState: /* @__PURE__ */ n(() => this.state, "getState"),
      setState: /* @__PURE__ */ n((y, S) => (this.setState(y, () => S(this.state)), this.state), "setState")
    }), p = { location: a, path: o, viewMode: c, singleStory: i, storyId: s, refId: l }, v = { docsOptions: d };
    this.state = u.getInitialState(Oe({ ...p, ...v }));
    let m = {
      navigate: h,
      store: u,
      provider: r.provider
    };
    this.modules = [
      It,
      ft,
      ct,
      De,
      Et,
      ut,
      xt,
      Tt,
      Lt,
      wt,
      yt,
      Vt,
      Dt,
      Nt
    ].map(
      (y) => y.init({ ...p, ...v, ...m, state: this.state, fullAPI: this.api })
    );
    let g = Oe(this.state, ...this.modules.map((y) => y.state)), w = Object.assign(this.api, { navigate: h }, ...this.modules.map((y) => y.api));
    this.state = g, this.api = w;
  }
  static getDerivedStateFromProps(r, a) {
    return a.path !== r.path ? {
      ...a,
      location: r.location,
      path: r.path,
      refId: r.refId,
      viewMode: r.viewMode,
      storyId: r.storyId
    } : null;
  }
  shouldComponentUpdate(r, a) {
    let o = this.props, l = this.state;
    return o.path !== r.path || !O(l, a);
  }
  render() {
    let { children: r } = this.props, a = {
      state: this.state,
      api: this.api
    };
    return /* @__PURE__ */ de.createElement(wo, { effect: this.initModules }, /* @__PURE__ */ de.createElement(Je.Provider, { value: a }, /* @__PURE__ */ de.
    createElement(Ro, null, r)));
  }
};
n(Ye, "ManagerProvider"), Ye.displayName = "Manager";
var Lr = Ye, wo = /* @__PURE__ */ n(({ children: e, effect: t }) => (de.useEffect(t, []), e), "EffectOnMount"), yo = /* @__PURE__ */ n((e) => e,
"defaultFilter");
function Ro({
  // @ts-expect-error (Converted from ts-ignore)
  filter: e = yo,
  children: t
}) {
  let r = Zt(Je), a = Tr(t), o = Tr(e);
  if (typeof a.current != "function")
    return /* @__PURE__ */ de.createElement(vo, null, a.current);
  let l = o.current(r), c = Xt(() => [...Object.entries(l).reduce((i, s) => i.concat(s), [])], [r.state]);
  return Xt(() => {
    let i = a.current;
    return /* @__PURE__ */ de.createElement(i, { ...l });
  }, c);
}
n(Ro, "ManagerConsumer");
function ac() {
  let { state: e } = Zt(Je);
  return {
    ...e,
    // deprecated fields for back-compat
    get storiesHash() {
      return Qt("state.storiesHash is deprecated, please use state.index"), this.index || {};
    },
    get storiesConfigured() {
      return Qt("state.storiesConfigured is deprecated, please use state.previewInitialized"), this.previewInitialized;
    },
    get storiesFailed() {
      return Qt("state.storiesFailed is deprecated, please use state.indexError"), this.indexError;
    }
  };
}
n(ac, "useStorybookState");
function Q() {
  let { api: e } = Zt(Je);
  return e;
}
n(Q, "useStorybookApi");
function Br(e, t) {
  return typeof e > "u" ? t : e;
}
n(Br, "orDefault");
var So = /* @__PURE__ */ n((e, t = []) => {
  let r = Q();
  return Or(() => (Object.entries(e).forEach(([a, o]) => r.on(a, o)), () => {
    Object.entries(e).forEach(([a, o]) => r.off(a, o));
  }), t), r.emit;
}, "useChannel");
function nc(e) {
  return Q().isPrepared(e);
}
n(nc, "useStoryPrepared");
function oc(e, t) {
  let a = Q().getCurrentParameter(e);
  return Br(a, t);
}
n(oc, "useParameter");
globalThis.STORYBOOK_ADDON_STATE = {};
var { STORYBOOK_ADDON_STATE: W } = globalThis;
function Eo(e, t) {
  let r = Q(), a = r.getAddonState(e) || W[e], o = Br(
    a,
    W[e] ? W[e] : t
  ), l = !1;
  o === t && t !== void 0 && (W[e] = t, l = !0), Or(() => {
    l && r.setAddonState(e, t);
  }, [l]);
  let c = qe(
    async (h, u) => {
      await r.setAddonState(e, h, u);
      let p = r.getAddonState(e);
      return W[e] = p, p;
    },
    [r, e]
  ), i = Xt(() => {
    let h = {
      [`${Hr}-client-${e}`]: c,
      [`${xe}-client-${e}`]: c
    }, u = {
      [mo]: async () => {
        let p = r.getAddonState(e);
        p ? (W[e] = p, r.emit(`${xe}-manager-${e}`, p)) : W[e] ? (await c(W[e]), r.emit(`${xe}-manager-${e}`, W[e])) : t !== void 0 && (await c(
        t), W[e] = t, r.emit(`${xe}-manager-${e}`, t));
      },
      [go]: () => {
        let p = r.getAddonState(e);
        p !== void 0 && r.emit(`${xe}-manager-${e}`, p);
      }
    };
    return {
      ...h,
      ...u
    };
  }, [e]), s = So(i), d = qe(
    async (h, u) => {
      await c(h, u);
      let p = r.getAddonState(e);
      s(`${Hr}-manager-${e}`, p);
    },
    [r, s, c, e]
  );
  return [o, d];
}
n(Eo, "useSharedState");
function lc(e, t) {
  return Eo(e, t);
}
n(lc, "useAddonState");
function ic() {
  let { getCurrentStoryData: e, updateStoryArgs: t, resetStoryArgs: r } = Q(), a = e(), o = a?.type === "story" ? a.args : {}, l = a?.type ===
  "story" ? a.initialArgs : {}, c = qe(
    (s) => t(a, s),
    [a, t]
  ), i = qe(
    (s) => r(a, s),
    [a, r]
  );
  return [o, c, i, l];
}
n(ic, "useArgs");
function sc() {
  let e = Q();
  return [e.getGlobals(), e.updateGlobals, e.getStoryGlobals(), e.getUserGlobals()];
}
n(sc, "useGlobals");
function cc() {
  return Q().getGlobalTypes();
}
n(cc, "useGlobalTypes");
function Io() {
  let { getCurrentStoryData: e } = Q();
  return e();
}
n(Io, "useCurrentStory");
function fc() {
  let e = Io();
  return e?.type === "story" && e.argTypes || {};
}
n(fc, "useArgTypes");
var dc = T0;
export {
  rc as ActiveTabs,
  Ro as Consumer,
  Je as ManagerContext,
  Lr as Provider,
  We as RequestResponseError,
  Yr as addons,
  G0 as combineParameters,
  Di as controlOrMetaKey,
  Vi as controlOrMetaSymbol,
  ki as eventMatchesShortcut,
  bt as eventToShortcut,
  Jt as experimental_MockUniversalStore,
  J as experimental_UniversalStore,
  zs as experimental_requestResponse,
  ho as experimental_useUniversalStore,
  Pt as isMacLike,
  Ni as isShortcutTaken,
  Pa as keyToSymbol,
  $ as merge,
  nt as mockChannel,
  Aa as optionOrAltSymbol,
  _t as shortcutMatchesShortcut,
  Ui as shortcutToHumanString,
  dc as types,
  lc as useAddonState,
  fc as useArgTypes,
  ic as useArgs,
  So as useChannel,
  cc as useGlobalTypes,
  sc as useGlobals,
  oc as useParameter,
  Eo as useSharedState,
  nc as useStoryPrepared,
  Q as useStorybookApi,
  ac as useStorybookState
};
