"use strict";
var Le = Object.create;
var z = Object.defineProperty;
var Me = Object.getOwnPropertyDescriptor;
var Fe = Object.getOwnPropertyNames;
var Ue = Object.getPrototypeOf, $e = Object.prototype.hasOwnProperty;
var o = (t, e) => z(t, "name", { value: e, configurable: !0 });
var F = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), ke = (t, e) => {
  for (var r in e)
    z(t, r, { get: e[r], enumerable: !0 });
}, he = (t, e, r, n) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let a of Fe(e))
      !$e.call(t, a) && a !== r && z(t, a, { get: () => e[a], enumerable: !(n = Me(e, a)) || n.enumerable });
  return t;
};
var I = (t, e, r) => (r = t != null ? Le(Ue(t)) : {}, he(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !t || !t.__esModule ? z(r, "default", { value: t, enumerable: !0 }) : r,
  t
)), Ge = (t) => he(z({}, "__esModule", { value: !0 }), t);

// ../node_modules/@storybook/global/dist/index.js
var te = F((pt, de) => {
  "use strict";
  var ne = Object.defineProperty, He = Object.getOwnPropertyDescriptor, We = Object.getOwnPropertyNames, qe = Object.prototype.hasOwnProperty,
  Je = /* @__PURE__ */ o((t, e) => {
    for (var r in e)
      ne(t, r, { get: e[r], enumerable: !0 });
  }, "__export"), ze = /* @__PURE__ */ o((t, e, r, n) => {
    if (e && typeof e == "object" || typeof e == "function")
      for (let a of We(e))
        !qe.call(t, a) && a !== r && ne(t, a, { get: /* @__PURE__ */ o(() => e[a], "get"), enumerable: !(n = He(e, a)) || n.enumerable });
    return t;
  }, "__copyProps"), Be = /* @__PURE__ */ o((t) => ze(ne({}, "__esModule", { value: !0 }), t), "__toCommonJS"), ye = {};
  Je(ye, {
    global: /* @__PURE__ */ o(() => Ve, "global")
  });
  de.exports = Be(ye);
  var Ve = (() => {
    let t;
    return typeof window < "u" ? t = window : typeof globalThis < "u" ? t = globalThis : typeof global < "u" ? t = global : typeof self < "u" ?
    t = self : t = {}, t;
  })();
});

// ../node_modules/ts-dedent/dist/index.js
var me = F((B) => {
  "use strict";
  Object.defineProperty(B, "__esModule", { value: !0 });
  B.dedent = void 0;
  function ge(t) {
    for (var e = [], r = 1; r < arguments.length; r++)
      e[r - 1] = arguments[r];
    var n = Array.from(typeof t == "string" ? [t] : t);
    n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var a = n.reduce(function(c, i) {
      var h = i.match(/\n([\t ]+|(?!\s).)/g);
      return h ? c.concat(h.map(function(u) {
        var p, y;
        return (y = (p = u.match(/[\t ]/g)) === null || p === void 0 ? void 0 : p.length) !== null && y !== void 0 ? y : 0;
      })) : c;
    }, []);
    if (a.length) {
      var s = new RegExp(`
[	 ]{` + Math.min.apply(Math, a) + "}", "g");
      n = n.map(function(c) {
        return c.replace(s, `
`);
      });
    }
    n[0] = n[0].replace(/^\r?\n/, "");
    var l = n[0];
    return e.forEach(function(c, i) {
      var h = l.match(/(?:^|\n)( *)$/), u = h ? h[1] : "", p = c;
      typeof c == "string" && c.includes(`
`) && (p = String(c).split(`
`).map(function(y, d) {
        return d === 0 ? y : "" + u + y;
      }).join(`
`)), l += p + n[i + 1];
    }), l;
  }
  o(ge, "dedent");
  B.dedent = ge;
  B.default = ge;
});

// ../node_modules/map-or-similar/src/similar.js
var _e = F((bt, ve) => {
  function x() {
    return this.list = [], this.lastItem = void 0, this.size = 0, this;
  }
  o(x, "Similar");
  x.prototype.get = function(t) {
    var e;
    if (this.lastItem && this.isEqual(this.lastItem.key, t))
      return this.lastItem.val;
    if (e = this.indexOf(t), e >= 0)
      return this.lastItem = this.list[e], this.list[e].val;
  };
  x.prototype.set = function(t, e) {
    var r;
    return this.lastItem && this.isEqual(this.lastItem.key, t) ? (this.lastItem.val = e, this) : (r = this.indexOf(t), r >= 0 ? (this.lastItem =
    this.list[r], this.list[r].val = e, this) : (this.lastItem = { key: t, val: e }, this.list.push(this.lastItem), this.size++, this));
  };
  x.prototype.delete = function(t) {
    var e;
    if (this.lastItem && this.isEqual(this.lastItem.key, t) && (this.lastItem = void 0), e = this.indexOf(t), e >= 0)
      return this.size--, this.list.splice(e, 1)[0];
  };
  x.prototype.has = function(t) {
    var e;
    return this.lastItem && this.isEqual(this.lastItem.key, t) ? !0 : (e = this.indexOf(t), e >= 0 ? (this.lastItem = this.list[e], !0) : !1);
  };
  x.prototype.forEach = function(t, e) {
    var r;
    for (r = 0; r < this.size; r++)
      t.call(e || this, this.list[r].val, this.list[r].key, this);
  };
  x.prototype.indexOf = function(t) {
    var e;
    for (e = 0; e < this.size; e++)
      if (this.isEqual(this.list[e].key, t))
        return e;
    return -1;
  };
  x.prototype.isEqual = function(t, e) {
    return t === e || t !== t && e !== e;
  };
  ve.exports = x;
});

// ../node_modules/map-or-similar/src/map-or-similar.js
var Ee = F((St, be) => {
  be.exports = function(t) {
    if (typeof Map != "function" || t) {
      var e = _e();
      return new e();
    } else
      return /* @__PURE__ */ new Map();
  };
});

// ../node_modules/memoizerific/src/memoizerific.js
var Ce = F((Tt, Te) => {
  var Se = Ee();
  Te.exports = function(t) {
    var e = new Se(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), r = [];
    return function(n) {
      var a = /* @__PURE__ */ o(function() {
        var s = e, l, c, i = arguments.length - 1, h = Array(i + 1), u = !0, p;
        if ((a.numArgs || a.numArgs === 0) && a.numArgs !== i + 1)
          throw new Error("Memoizerific functions should always be called with the same number of arguments");
        for (p = 0; p < i; p++) {
          if (h[p] = {
            cacheItem: s,
            arg: arguments[p]
          }, s.has(arguments[p])) {
            s = s.get(arguments[p]);
            continue;
          }
          u = !1, l = new Se(process.env.FORCE_SIMILAR_INSTEAD_OF_MAP === "true"), s.set(arguments[p], l), s = l;
        }
        return u && (s.has(arguments[i]) ? c = s.get(arguments[i]) : u = !1), u || (c = n.apply(null, arguments), s.set(arguments[i], c)), t >
        0 && (h[i] = {
          cacheItem: s,
          arg: arguments[i]
        }, u ? Ze(r, h) : r.push(h), r.length > t && Qe(r.shift())), a.wasMemoized = u, a.numArgs = i + 1, c;
      }, "memoizerific");
      return a.limit = t, a.wasMemoized = !1, a.cache = e, a.lru = r, a;
    };
  };
  function Ze(t, e) {
    var r = t.length, n = e.length, a, s, l;
    for (s = 0; s < r; s++) {
      for (a = !0, l = 0; l < n; l++)
        if (!et(t[s][l].arg, e[l].arg)) {
          a = !1;
          break;
        }
      if (a)
        break;
    }
    t.push(t.splice(s, 1)[0]);
  }
  o(Ze, "moveToMostRecentLru");
  function Qe(t) {
    var e = t.length, r = t[e - 1], n, a;
    for (r.cacheItem.delete(r.arg), a = e - 2; a >= 0 && (r = t[a], n = r.cacheItem.get(r.arg), !n || !n.size); a--)
      r.cacheItem.delete(r.arg);
  }
  o(Qe, "removeCachedResult");
  function et(t, e) {
    return t === e || t !== t && e !== e;
  }
  o(et, "isEqual");
});

// ../node_modules/telejson/dist/index.js
var oe = F((exports, module) => {
  "use strict";
  var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.
  getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS = /* @__PURE__ */ o(
  (t, e) => /* @__PURE__ */ o(function() {
    return e || (0, t[__getOwnPropNames(t)[0]])((e = { exports: {} }).exports, e), e.exports;
  }, "__require"), "__commonJS"), __export = /* @__PURE__ */ o((t, e) => {
    for (var r in e)
      __defProp(t, r, { get: e[r], enumerable: !0 });
  }, "__export"), __copyProps = /* @__PURE__ */ o((t, e, r, n) => {
    if (e && typeof e == "object" || typeof e == "function")
      for (let a of __getOwnPropNames(e))
        !__hasOwnProp.call(t, a) && a !== r && __defProp(t, a, { get: /* @__PURE__ */ o(() => e[a], "get"), enumerable: !(n = __getOwnPropDesc(
        e, a)) || n.enumerable });
    return t;
  }, "__copyProps"), __toESM = /* @__PURE__ */ o((t, e, r) => (r = t != null ? __create(__getProtoOf(t)) : {}, __copyProps(
    e || !t || !t.__esModule ? __defProp(r, "default", { value: t, enumerable: !0 }) : r,
    t
  )), "__toESM"), __toCommonJS = /* @__PURE__ */ o((t) => __copyProps(__defProp({}, "__esModule", { value: !0 }), t), "__toCommonJS"), require_shams = __commonJS(
  {
    "node_modules/has-symbols/shams.js"(t, e) {
      "use strict";
      e.exports = /* @__PURE__ */ o(function() {
        if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
          return !1;
        if (typeof Symbol.iterator == "symbol")
          return !0;
        var n = {}, a = Symbol("test"), s = Object(a);
        if (typeof a == "string" || Object.prototype.toString.call(a) !== "[object Symbol]" || Object.prototype.toString.call(s) !== "[objec\
t Symbol]")
          return !1;
        var l = 42;
        n[a] = l;
        for (a in n)
          return !1;
        if (typeof Object.keys == "function" && Object.keys(n).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(
        n).length !== 0)
          return !1;
        var c = Object.getOwnPropertySymbols(n);
        if (c.length !== 1 || c[0] !== a || !Object.prototype.propertyIsEnumerable.call(n, a))
          return !1;
        if (typeof Object.getOwnPropertyDescriptor == "function") {
          var i = Object.getOwnPropertyDescriptor(n, a);
          if (i.value !== l || i.enumerable !== !0)
            return !1;
        }
        return !0;
      }, "hasSymbols");
    }
  }), require_has_symbols = __commonJS({
    "node_modules/has-symbols/index.js"(t, e) {
      "use strict";
      var r = typeof Symbol < "u" && Symbol, n = require_shams();
      e.exports = /* @__PURE__ */ o(function() {
        return typeof r != "function" || typeof Symbol != "function" || typeof r("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 :
        n();
      }, "hasNativeSymbols");
    }
  }), require_implementation = __commonJS({
    "node_modules/function-bind/implementation.js"(t, e) {
      "use strict";
      var r = "Function.prototype.bind called on incompatible ", n = Array.prototype.slice, a = Object.prototype.toString, s = "[object Func\
tion]";
      e.exports = /* @__PURE__ */ o(function(c) {
        var i = this;
        if (typeof i != "function" || a.call(i) !== s)
          throw new TypeError(r + i);
        for (var h = n.call(arguments, 1), u, p = /* @__PURE__ */ o(function() {
          if (this instanceof u) {
            var T = i.apply(
              this,
              h.concat(n.call(arguments))
            );
            return Object(T) === T ? T : this;
          } else
            return i.apply(
              c,
              h.concat(n.call(arguments))
            );
        }, "binder"), y = Math.max(0, i.length - h.length), d = [], v = 0; v < y; v++)
          d.push("$" + v);
        if (u = Function("binder", "return function (" + d.join(",") + "){ return binder.apply(this,arguments); }")(p), i.prototype) {
          var w = /* @__PURE__ */ o(function() {
          }, "Empty2");
          w.prototype = i.prototype, u.prototype = new w(), w.prototype = null;
        }
        return u;
      }, "bind");
    }
  }), require_function_bind = __commonJS({
    "node_modules/function-bind/index.js"(t, e) {
      "use strict";
      var r = require_implementation();
      e.exports = Function.prototype.bind || r;
    }
  }), require_src = __commonJS({
    "node_modules/has/src/index.js"(t, e) {
      "use strict";
      var r = require_function_bind();
      e.exports = r.call(Function.call, Object.prototype.hasOwnProperty);
    }
  }), require_get_intrinsic = __commonJS({
    "node_modules/get-intrinsic/index.js"(t, e) {
      "use strict";
      var r, n = SyntaxError, a = Function, s = TypeError, l = /* @__PURE__ */ o(function(A) {
        try {
          return a('"use strict"; return (' + A + ").constructor;")();
        } catch {
        }
      }, "getEvalledConstructor"), c = Object.getOwnPropertyDescriptor;
      if (c)
        try {
          c({}, "");
        } catch {
          c = null;
        }
      var i = /* @__PURE__ */ o(function() {
        throw new s();
      }, "throwTypeError"), h = c ? function() {
        try {
          return arguments.callee, i;
        } catch {
          try {
            return c(arguments, "callee").get;
          } catch {
            return i;
          }
        }
      }() : i, u = require_has_symbols()(), p = Object.getPrototypeOf || function(A) {
        return A.__proto__;
      }, y = {}, d = typeof Uint8Array > "u" ? r : p(Uint8Array), v = {
        "%AggregateError%": typeof AggregateError > "u" ? r : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": typeof ArrayBuffer > "u" ? r : ArrayBuffer,
        "%ArrayIteratorPrototype%": u ? p([][Symbol.iterator]()) : r,
        "%AsyncFromSyncIteratorPrototype%": r,
        "%AsyncFunction%": y,
        "%AsyncGenerator%": y,
        "%AsyncGeneratorFunction%": y,
        "%AsyncIteratorPrototype%": y,
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
        "%Function%": a,
        "%GeneratorFunction%": y,
        "%Int8Array%": typeof Int8Array > "u" ? r : Int8Array,
        "%Int16Array%": typeof Int16Array > "u" ? r : Int16Array,
        "%Int32Array%": typeof Int32Array > "u" ? r : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": u ? p(p([][Symbol.iterator]())) : r,
        "%JSON%": typeof JSON == "object" ? JSON : r,
        "%Map%": typeof Map > "u" ? r : Map,
        "%MapIteratorPrototype%": typeof Map > "u" || !u ? r : p((/* @__PURE__ */ new Map())[Symbol.iterator]()),
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
        "%SetIteratorPrototype%": typeof Set > "u" || !u ? r : p((/* @__PURE__ */ new Set())[Symbol.iterator]()),
        "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? r : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": u ? p(""[Symbol.iterator]()) : r,
        "%Symbol%": u ? Symbol : r,
        "%SyntaxError%": n,
        "%ThrowTypeError%": h,
        "%TypedArray%": d,
        "%TypeError%": s,
        "%Uint8Array%": typeof Uint8Array > "u" ? r : Uint8Array,
        "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? r : Uint8ClampedArray,
        "%Uint16Array%": typeof Uint16Array > "u" ? r : Uint16Array,
        "%Uint32Array%": typeof Uint32Array > "u" ? r : Uint32Array,
        "%URIError%": URIError,
        "%WeakMap%": typeof WeakMap > "u" ? r : WeakMap,
        "%WeakRef%": typeof WeakRef > "u" ? r : WeakRef,
        "%WeakSet%": typeof WeakSet > "u" ? r : WeakSet
      }, w = /* @__PURE__ */ o(function A(g) {
        var b;
        if (g === "%AsyncFunction%")
          b = l("async function () {}");
        else if (g === "%GeneratorFunction%")
          b = l("function* () {}");
        else if (g === "%AsyncGeneratorFunction%")
          b = l("async function* () {}");
        else if (g === "%AsyncGenerator%") {
          var m = A("%AsyncGeneratorFunction%");
          m && (b = m.prototype);
        } else if (g === "%AsyncIteratorPrototype%") {
          var E = A("%AsyncGenerator%");
          E && (b = p(E.prototype));
        }
        return v[g] = b, b;
      }, "doEval2"), T = {
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
      }, N = require_function_bind(), j = require_src(), D = N.call(Function.call, Array.prototype.concat), L = N.call(Function.apply, Array.
      prototype.splice), fe = N.call(Function.call, String.prototype.replace), K = N.call(Function.call, String.prototype.slice), xe = N.call(
      Function.call, RegExp.prototype.exec), Ne = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g,
      Re = /\\(\\)?/g, je = /* @__PURE__ */ o(function(g) {
        var b = K(g, 0, 1), m = K(g, -1);
        if (b === "%" && m !== "%")
          throw new n("invalid intrinsic syntax, expected closing `%`");
        if (m === "%" && b !== "%")
          throw new n("invalid intrinsic syntax, expected opening `%`");
        var E = [];
        return fe(g, Ne, function(O, M, S, Y) {
          E[E.length] = S ? fe(Y, Re, "$1") : M || O;
        }), E;
      }, "stringToPath3"), De = /* @__PURE__ */ o(function(g, b) {
        var m = g, E;
        if (j(T, m) && (E = T[m], m = "%" + E[0] + "%"), j(v, m)) {
          var O = v[m];
          if (O === y && (O = w(m)), typeof O > "u" && !b)
            throw new s("intrinsic " + g + " exists, but is not available. Please file an issue!");
          return {
            alias: E,
            name: m,
            value: O
          };
        }
        throw new n("intrinsic " + g + " does not exist!");
      }, "getBaseIntrinsic2");
      e.exports = /* @__PURE__ */ o(function(g, b) {
        if (typeof g != "string" || g.length === 0)
          throw new s("intrinsic name must be a non-empty string");
        if (arguments.length > 1 && typeof b != "boolean")
          throw new s('"allowMissing" argument must be a boolean');
        if (xe(/^%?[^%]*%?$/, g) === null)
          throw new n("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
        var m = je(g), E = m.length > 0 ? m[0] : "", O = De("%" + E + "%", b), M = O.name, S = O.value, Y = !1, re = O.alias;
        re && (E = re[0], L(m, D([0, 1], re)));
        for (var X = 1, J = !0; X < m.length; X += 1) {
          var P = m[X], Z = K(P, 0, 1), Q = K(P, -1);
          if ((Z === '"' || Z === "'" || Z === "`" || Q === '"' || Q === "'" || Q === "`") && Z !== Q)
            throw new n("property names with quotes must have matching quotes");
          if ((P === "constructor" || !J) && (Y = !0), E += "." + P, M = "%" + E + "%", j(v, M))
            S = v[M];
          else if (S != null) {
            if (!(P in S)) {
              if (!b)
                throw new s("base intrinsic for " + g + " exists, but the property is not available.");
              return;
            }
            if (c && X + 1 >= m.length) {
              var ee = c(S, P);
              J = !!ee, J && "get" in ee && !("originalValue" in ee.get) ? S = ee.get : S = S[P];
            } else
              J = j(S, P), S = S[P];
            J && !Y && (v[M] = S);
          }
        }
        return S;
      }, "GetIntrinsic");
    }
  }), require_call_bind = __commonJS({
    "node_modules/call-bind/index.js"(t, e) {
      "use strict";
      var r = require_function_bind(), n = require_get_intrinsic(), a = n("%Function.prototype.apply%"), s = n("%Function.prototype.call%"),
      l = n("%Reflect.apply%", !0) || r.call(s, a), c = n("%Object.getOwnPropertyDescriptor%", !0), i = n("%Object.defineProperty%", !0), h = n(
      "%Math.max%");
      if (i)
        try {
          i({}, "a", { value: 1 });
        } catch {
          i = null;
        }
      e.exports = /* @__PURE__ */ o(function(y) {
        var d = l(r, s, arguments);
        if (c && i) {
          var v = c(d, "length");
          v.configurable && i(
            d,
            "length",
            { value: 1 + h(0, y.length - (arguments.length - 1)) }
          );
        }
        return d;
      }, "callBind");
      var u = /* @__PURE__ */ o(function() {
        return l(r, a, arguments);
      }, "applyBind2");
      i ? i(e.exports, "apply", { value: u }) : e.exports.apply = u;
    }
  }), require_callBound = __commonJS({
    "node_modules/call-bind/callBound.js"(t, e) {
      "use strict";
      var r = require_get_intrinsic(), n = require_call_bind(), a = n(r("String.prototype.indexOf"));
      e.exports = /* @__PURE__ */ o(function(l, c) {
        var i = r(l, !!c);
        return typeof i == "function" && a(l, ".prototype.") > -1 ? n(i) : i;
      }, "callBoundIntrinsic");
    }
  }), require_shams2 = __commonJS({
    "node_modules/has-tostringtag/shams.js"(t, e) {
      "use strict";
      var r = require_shams();
      e.exports = /* @__PURE__ */ o(function() {
        return r() && !!Symbol.toStringTag;
      }, "hasToStringTagShams");
    }
  }), require_is_regex = __commonJS({
    "node_modules/is-regex/index.js"(t, e) {
      "use strict";
      var r = require_callBound(), n = require_shams2()(), a, s, l, c;
      n && (a = r("Object.prototype.hasOwnProperty"), s = r("RegExp.prototype.exec"), l = {}, i = /* @__PURE__ */ o(function() {
        throw l;
      }, "throwRegexMarker"), c = {
        toString: i,
        valueOf: i
      }, typeof Symbol.toPrimitive == "symbol" && (c[Symbol.toPrimitive] = i));
      var i, h = r("Object.prototype.toString"), u = Object.getOwnPropertyDescriptor, p = "[object RegExp]";
      e.exports = /* @__PURE__ */ o(n ? function(d) {
        if (!d || typeof d != "object")
          return !1;
        var v = u(d, "lastIndex"), w = v && a(v, "value");
        if (!w)
          return !1;
        try {
          s(d, c);
        } catch (T) {
          return T === l;
        }
      } : function(d) {
        return !d || typeof d != "object" && typeof d != "function" ? !1 : h(d) === p;
      }, "isRegex");
    }
  }), require_is_function = __commonJS({
    "node_modules/is-function/index.js"(t, e) {
      e.exports = n;
      var r = Object.prototype.toString;
      function n(a) {
        if (!a)
          return !1;
        var s = r.call(a);
        return s === "[object Function]" || typeof a == "function" && s !== "[object RegExp]" || typeof window < "u" && (a === window.setTimeout ||
        a === window.alert || a === window.confirm || a === window.prompt);
      }
      o(n, "isFunction3");
    }
  }), require_is_symbol = __commonJS({
    "node_modules/is-symbol/index.js"(t, e) {
      "use strict";
      var r = Object.prototype.toString, n = require_has_symbols()();
      n ? (a = Symbol.prototype.toString, s = /^Symbol\(.*\)$/, l = /* @__PURE__ */ o(function(i) {
        return typeof i.valueOf() != "symbol" ? !1 : s.test(a.call(i));
      }, "isRealSymbolObject"), e.exports = /* @__PURE__ */ o(function(i) {
        if (typeof i == "symbol")
          return !0;
        if (r.call(i) !== "[object Symbol]")
          return !1;
        try {
          return l(i);
        } catch {
          return !1;
        }
      }, "isSymbol3")) : e.exports = /* @__PURE__ */ o(function(i) {
        return !1;
      }, "isSymbol3");
      var a, s, l;
    }
  }), src_exports = {};
  __export(src_exports, {
    isJSON: /* @__PURE__ */ o(() => isJSON, "isJSON"),
    parse: /* @__PURE__ */ o(() => parse, "parse"),
    replacer: /* @__PURE__ */ o(() => replacer, "replacer"),
    reviver: /* @__PURE__ */ o(() => reviver2, "reviver"),
    stringify: /* @__PURE__ */ o(() => stringify, "stringify")
  });
  module.exports = __toCommonJS(src_exports);
  var import_is_regex = __toESM(require_is_regex()), import_is_function = __toESM(require_is_function()), import_is_symbol = __toESM(require_is_symbol());
  function isObject(t) {
    return t != null && typeof t == "object" && Array.isArray(t) === !1;
  }
  o(isObject, "isObject");
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global, freeGlobal_default = freeGlobal, freeSelf = typeof self ==
  "object" && self && self.Object === Object && self, root2 = freeGlobal_default || freeSelf || Function("return this")(), root_default = root2,
  Symbol2 = root_default.Symbol, Symbol_default = Symbol2, objectProto = Object.prototype, hasOwnProperty = objectProto.hasOwnProperty, nativeObjectToString = objectProto.
  toString, symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
  function getRawTag(t) {
    var e = hasOwnProperty.call(t, symToStringTag), r = t[symToStringTag];
    try {
      t[symToStringTag] = void 0;
      var n = !0;
    } catch {
    }
    var a = nativeObjectToString.call(t);
    return n && (e ? t[symToStringTag] = r : delete t[symToStringTag]), a;
  }
  o(getRawTag, "getRawTag");
  var getRawTag_default = getRawTag, objectProto2 = Object.prototype, nativeObjectToString2 = objectProto2.toString;
  function objectToString(t) {
    return nativeObjectToString2.call(t);
  }
  o(objectToString, "objectToString");
  var objectToString_default = objectToString, nullTag = "[object Null]", undefinedTag = "[object Undefined]", symToStringTag2 = Symbol_default ?
  Symbol_default.toStringTag : void 0;
  function baseGetTag(t) {
    return t == null ? t === void 0 ? undefinedTag : nullTag : symToStringTag2 && symToStringTag2 in Object(t) ? getRawTag_default(t) : objectToString_default(
    t);
  }
  o(baseGetTag, "baseGetTag");
  var baseGetTag_default = baseGetTag;
  function isObjectLike(t) {
    return t != null && typeof t == "object";
  }
  o(isObjectLike, "isObjectLike");
  var isObjectLike_default = isObjectLike, symbolTag = "[object Symbol]";
  function isSymbol(t) {
    return typeof t == "symbol" || isObjectLike_default(t) && baseGetTag_default(t) == symbolTag;
  }
  o(isSymbol, "isSymbol");
  var isSymbol_default = isSymbol;
  function arrayMap(t, e) {
    for (var r = -1, n = t == null ? 0 : t.length, a = Array(n); ++r < n; )
      a[r] = e(t[r], r, t);
    return a;
  }
  o(arrayMap, "arrayMap");
  var arrayMap_default = arrayMap, isArray = Array.isArray, isArray_default = isArray, INFINITY = 1 / 0, symbolProto = Symbol_default ? Symbol_default.
  prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
  function baseToString(t) {
    if (typeof t == "string")
      return t;
    if (isArray_default(t))
      return arrayMap_default(t, baseToString) + "";
    if (isSymbol_default(t))
      return symbolToString ? symbolToString.call(t) : "";
    var e = t + "";
    return e == "0" && 1 / t == -INFINITY ? "-0" : e;
  }
  o(baseToString, "baseToString");
  var baseToString_default = baseToString;
  function isObject2(t) {
    var e = typeof t;
    return t != null && (e == "object" || e == "function");
  }
  o(isObject2, "isObject2");
  var isObject_default = isObject2, asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]",
  proxyTag = "[object Proxy]";
  function isFunction(t) {
    if (!isObject_default(t))
      return !1;
    var e = baseGetTag_default(t);
    return e == funcTag || e == genTag || e == asyncTag || e == proxyTag;
  }
  o(isFunction, "isFunction");
  var isFunction_default = isFunction, coreJsData = root_default["__core-js_shared__"], coreJsData_default = coreJsData, maskSrcKey = function() {
    var t = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
    return t ? "Symbol(src)_1." + t : "";
  }();
  function isMasked(t) {
    return !!maskSrcKey && maskSrcKey in t;
  }
  o(isMasked, "isMasked");
  var isMasked_default = isMasked, funcProto = Function.prototype, funcToString = funcProto.toString;
  function toSource(t) {
    if (t != null) {
      try {
        return funcToString.call(t);
      } catch {
      }
      try {
        return t + "";
      } catch {
      }
    }
    return "";
  }
  o(toSource, "toSource");
  var toSource_default = toSource, reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reIsHostCtor = /^\[object .+?Constructor\]$/, funcProto2 = Function.
  prototype, objectProto3 = Object.prototype, funcToString2 = funcProto2.toString, hasOwnProperty2 = objectProto3.hasOwnProperty, reIsNative = RegExp(
    "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
    "$1.*?") + "$"
  );
  function baseIsNative(t) {
    if (!isObject_default(t) || isMasked_default(t))
      return !1;
    var e = isFunction_default(t) ? reIsNative : reIsHostCtor;
    return e.test(toSource_default(t));
  }
  o(baseIsNative, "baseIsNative");
  var baseIsNative_default = baseIsNative;
  function getValue(t, e) {
    return t?.[e];
  }
  o(getValue, "getValue");
  var getValue_default = getValue;
  function getNative(t, e) {
    var r = getValue_default(t, e);
    return baseIsNative_default(r) ? r : void 0;
  }
  o(getNative, "getNative");
  var getNative_default = getNative;
  function eq(t, e) {
    return t === e || t !== t && e !== e;
  }
  o(eq, "eq");
  var eq_default = eq, reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
  function isKey(t, e) {
    if (isArray_default(t))
      return !1;
    var r = typeof t;
    return r == "number" || r == "symbol" || r == "boolean" || t == null || isSymbol_default(t) ? !0 : reIsPlainProp.test(t) || !reIsDeepProp.
    test(t) || e != null && t in Object(e);
  }
  o(isKey, "isKey");
  var isKey_default = isKey, nativeCreate = getNative_default(Object, "create"), nativeCreate_default = nativeCreate;
  function hashClear() {
    this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {}, this.size = 0;
  }
  o(hashClear, "hashClear");
  var hashClear_default = hashClear;
  function hashDelete(t) {
    var e = this.has(t) && delete this.__data__[t];
    return this.size -= e ? 1 : 0, e;
  }
  o(hashDelete, "hashDelete");
  var hashDelete_default = hashDelete, HASH_UNDEFINED = "__lodash_hash_undefined__", objectProto4 = Object.prototype, hasOwnProperty3 = objectProto4.
  hasOwnProperty;
  function hashGet(t) {
    var e = this.__data__;
    if (nativeCreate_default) {
      var r = e[t];
      return r === HASH_UNDEFINED ? void 0 : r;
    }
    return hasOwnProperty3.call(e, t) ? e[t] : void 0;
  }
  o(hashGet, "hashGet");
  var hashGet_default = hashGet, objectProto5 = Object.prototype, hasOwnProperty4 = objectProto5.hasOwnProperty;
  function hashHas(t) {
    var e = this.__data__;
    return nativeCreate_default ? e[t] !== void 0 : hasOwnProperty4.call(e, t);
  }
  o(hashHas, "hashHas");
  var hashHas_default = hashHas, HASH_UNDEFINED2 = "__lodash_hash_undefined__";
  function hashSet(t, e) {
    var r = this.__data__;
    return this.size += this.has(t) ? 0 : 1, r[t] = nativeCreate_default && e === void 0 ? HASH_UNDEFINED2 : e, this;
  }
  o(hashSet, "hashSet");
  var hashSet_default = hashSet;
  function Hash(t) {
    var e = -1, r = t == null ? 0 : t.length;
    for (this.clear(); ++e < r; ) {
      var n = t[e];
      this.set(n[0], n[1]);
    }
  }
  o(Hash, "Hash");
  Hash.prototype.clear = hashClear_default;
  Hash.prototype.delete = hashDelete_default;
  Hash.prototype.get = hashGet_default;
  Hash.prototype.has = hashHas_default;
  Hash.prototype.set = hashSet_default;
  var Hash_default = Hash;
  function listCacheClear() {
    this.__data__ = [], this.size = 0;
  }
  o(listCacheClear, "listCacheClear");
  var listCacheClear_default = listCacheClear;
  function assocIndexOf(t, e) {
    for (var r = t.length; r--; )
      if (eq_default(t[r][0], e))
        return r;
    return -1;
  }
  o(assocIndexOf, "assocIndexOf");
  var assocIndexOf_default = assocIndexOf, arrayProto = Array.prototype, splice = arrayProto.splice;
  function listCacheDelete(t) {
    var e = this.__data__, r = assocIndexOf_default(e, t);
    if (r < 0)
      return !1;
    var n = e.length - 1;
    return r == n ? e.pop() : splice.call(e, r, 1), --this.size, !0;
  }
  o(listCacheDelete, "listCacheDelete");
  var listCacheDelete_default = listCacheDelete;
  function listCacheGet(t) {
    var e = this.__data__, r = assocIndexOf_default(e, t);
    return r < 0 ? void 0 : e[r][1];
  }
  o(listCacheGet, "listCacheGet");
  var listCacheGet_default = listCacheGet;
  function listCacheHas(t) {
    return assocIndexOf_default(this.__data__, t) > -1;
  }
  o(listCacheHas, "listCacheHas");
  var listCacheHas_default = listCacheHas;
  function listCacheSet(t, e) {
    var r = this.__data__, n = assocIndexOf_default(r, t);
    return n < 0 ? (++this.size, r.push([t, e])) : r[n][1] = e, this;
  }
  o(listCacheSet, "listCacheSet");
  var listCacheSet_default = listCacheSet;
  function ListCache(t) {
    var e = -1, r = t == null ? 0 : t.length;
    for (this.clear(); ++e < r; ) {
      var n = t[e];
      this.set(n[0], n[1]);
    }
  }
  o(ListCache, "ListCache");
  ListCache.prototype.clear = listCacheClear_default;
  ListCache.prototype.delete = listCacheDelete_default;
  ListCache.prototype.get = listCacheGet_default;
  ListCache.prototype.has = listCacheHas_default;
  ListCache.prototype.set = listCacheSet_default;
  var ListCache_default = ListCache, Map2 = getNative_default(root_default, "Map"), Map_default = Map2;
  function mapCacheClear() {
    this.size = 0, this.__data__ = {
      hash: new Hash_default(),
      map: new (Map_default || ListCache_default)(),
      string: new Hash_default()
    };
  }
  o(mapCacheClear, "mapCacheClear");
  var mapCacheClear_default = mapCacheClear;
  function isKeyable(t) {
    var e = typeof t;
    return e == "string" || e == "number" || e == "symbol" || e == "boolean" ? t !== "__proto__" : t === null;
  }
  o(isKeyable, "isKeyable");
  var isKeyable_default = isKeyable;
  function getMapData(t, e) {
    var r = t.__data__;
    return isKeyable_default(e) ? r[typeof e == "string" ? "string" : "hash"] : r.map;
  }
  o(getMapData, "getMapData");
  var getMapData_default = getMapData;
  function mapCacheDelete(t) {
    var e = getMapData_default(this, t).delete(t);
    return this.size -= e ? 1 : 0, e;
  }
  o(mapCacheDelete, "mapCacheDelete");
  var mapCacheDelete_default = mapCacheDelete;
  function mapCacheGet(t) {
    return getMapData_default(this, t).get(t);
  }
  o(mapCacheGet, "mapCacheGet");
  var mapCacheGet_default = mapCacheGet;
  function mapCacheHas(t) {
    return getMapData_default(this, t).has(t);
  }
  o(mapCacheHas, "mapCacheHas");
  var mapCacheHas_default = mapCacheHas;
  function mapCacheSet(t, e) {
    var r = getMapData_default(this, t), n = r.size;
    return r.set(t, e), this.size += r.size == n ? 0 : 1, this;
  }
  o(mapCacheSet, "mapCacheSet");
  var mapCacheSet_default = mapCacheSet;
  function MapCache(t) {
    var e = -1, r = t == null ? 0 : t.length;
    for (this.clear(); ++e < r; ) {
      var n = t[e];
      this.set(n[0], n[1]);
    }
  }
  o(MapCache, "MapCache");
  MapCache.prototype.clear = mapCacheClear_default;
  MapCache.prototype.delete = mapCacheDelete_default;
  MapCache.prototype.get = mapCacheGet_default;
  MapCache.prototype.has = mapCacheHas_default;
  MapCache.prototype.set = mapCacheSet_default;
  var MapCache_default = MapCache, FUNC_ERROR_TEXT = "Expected a function";
  function memoize(t, e) {
    if (typeof t != "function" || e != null && typeof e != "function")
      throw new TypeError(FUNC_ERROR_TEXT);
    var r = /* @__PURE__ */ o(function() {
      var n = arguments, a = e ? e.apply(this, n) : n[0], s = r.cache;
      if (s.has(a))
        return s.get(a);
      var l = t.apply(this, n);
      return r.cache = s.set(a, l) || s, l;
    }, "memoized");
    return r.cache = new (memoize.Cache || MapCache_default)(), r;
  }
  o(memoize, "memoize");
  memoize.Cache = MapCache_default;
  var memoize_default = memoize, MAX_MEMOIZE_SIZE = 500;
  function memoizeCapped(t) {
    var e = memoize_default(t, function(n) {
      return r.size === MAX_MEMOIZE_SIZE && r.clear(), n;
    }), r = e.cache;
    return e;
  }
  o(memoizeCapped, "memoizeCapped");
  var memoizeCapped_default = memoizeCapped, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
  reEscapeChar = /\\(\\)?/g, stringToPath = memoizeCapped_default(function(t) {
    var e = [];
    return t.charCodeAt(0) === 46 && e.push(""), t.replace(rePropName, function(r, n, a, s) {
      e.push(a ? s.replace(reEscapeChar, "$1") : n || r);
    }), e;
  }), stringToPath_default = stringToPath;
  function toString(t) {
    return t == null ? "" : baseToString_default(t);
  }
  o(toString, "toString");
  var toString_default = toString;
  function castPath(t, e) {
    return isArray_default(t) ? t : isKey_default(t, e) ? [t] : stringToPath_default(toString_default(t));
  }
  o(castPath, "castPath");
  var castPath_default = castPath, INFINITY2 = 1 / 0;
  function toKey(t) {
    if (typeof t == "string" || isSymbol_default(t))
      return t;
    var e = t + "";
    return e == "0" && 1 / t == -INFINITY2 ? "-0" : e;
  }
  o(toKey, "toKey");
  var toKey_default = toKey;
  function baseGet(t, e) {
    e = castPath_default(e, t);
    for (var r = 0, n = e.length; t != null && r < n; )
      t = t[toKey_default(e[r++])];
    return r && r == n ? t : void 0;
  }
  o(baseGet, "baseGet");
  var baseGet_default = baseGet;
  function get(t, e, r) {
    var n = t == null ? void 0 : baseGet_default(t, e);
    return n === void 0 ? r : n;
  }
  o(get, "get");
  var get_default = get, import_memoizerific = __toESM(Ce()), eventProperties = [
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
  ], customEventSpecificProperties = ["detail"];
  function extractEventHiddenProperties(t) {
    let e = eventProperties.filter((r) => t[r] !== void 0).reduce((r, n) => ({ ...r, [n]: t[n] }), {});
    return t instanceof CustomEvent && customEventSpecificProperties.filter((r) => t[r] !== void 0).forEach((r) => {
      e[r] = t[r];
    }), e;
  }
  o(extractEventHiddenProperties, "extractEventHiddenProperties");
  var isObject3 = isObject, removeCodeComments = /* @__PURE__ */ o((t) => {
    let e = null, r = !1, n = !1, a = !1, s = "";
    if (t.indexOf("//") >= 0 || t.indexOf("/*") >= 0)
      for (let l = 0; l < t.length; l += 1)
        !e && !r && !n && !a ? t[l] === '"' || t[l] === "'" || t[l] === "`" ? e = t[l] : t[l] === "/" && t[l + 1] === "*" ? r = !0 : t[l] ===
        "/" && t[l + 1] === "/" ? n = !0 : t[l] === "/" && t[l + 1] !== "/" && (a = !0) : (e && (t[l] === e && t[l - 1] !== "\\" || t[l] ===
        `
` && e !== "`") && (e = null), a && (t[l] === "/" && t[l - 1] !== "\\" || t[l] === `
`) && (a = !1), r && t[l - 1] === "/" && t[l - 2] === "*" && (r = !1), n && t[l] === `
` && (n = !1)), !r && !n && (s += t[l]);
    else
      s = t;
    return s;
  }, "removeCodeComments"), cleanCode = (0, import_memoizerific.default)(1e4)(
    (t) => removeCodeComments(t).replace(/\n\s*/g, "").trim()
  ), convertShorthandMethods = /* @__PURE__ */ o(function(e, r) {
    let n = r.slice(0, r.indexOf("{")), a = r.slice(r.indexOf("{"));
    if (n.includes("=>") || n.includes("function"))
      return r;
    let s = n;
    return s = s.replace(e, "function"), s + a;
  }, "convertShorthandMethods2"), dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, isJSON = /* @__PURE__ */ o((t) => t.match(
  /^[\[\{\"\}].*[\]\}\"]$/), "isJSON");
  function convertUnconventionalData(t) {
    if (!isObject3(t))
      return t;
    let e = t, r = !1;
    return typeof Event < "u" && t instanceof Event && (e = extractEventHiddenProperties(e), r = !0), e = Object.keys(e).reduce((n, a) => {
      try {
        e[a] && e[a].toJSON, n[a] = e[a];
      } catch {
        r = !0;
      }
      return n;
    }, {}), r ? e : t;
  }
  o(convertUnconventionalData, "convertUnconventionalData");
  var replacer = /* @__PURE__ */ o(function(e) {
    let r, n, a, s;
    return /* @__PURE__ */ o(function(c, i) {
      try {
        if (c === "")
          return s = [], r = /* @__PURE__ */ new Map([[i, "[]"]]), n = /* @__PURE__ */ new Map(), a = [], i;
        let h = n.get(this) || this;
        for (; a.length && h !== a[0]; )
          a.shift(), s.pop();
        if (typeof i == "boolean")
          return i;
        if (i === void 0)
          return e.allowUndefined ? "_undefined_" : void 0;
        if (i === null)
          return null;
        if (typeof i == "number")
          return i === -1 / 0 ? "_-Infinity_" : i === 1 / 0 ? "_Infinity_" : Number.isNaN(i) ? "_NaN_" : i;
        if (typeof i == "bigint")
          return `_bigint_${i.toString()}`;
        if (typeof i == "string")
          return dateFormat.test(i) ? e.allowDate ? `_date_${i}` : void 0 : i;
        if ((0, import_is_regex.default)(i))
          return e.allowRegExp ? `_regexp_${i.flags}|${i.source}` : void 0;
        if ((0, import_is_function.default)(i)) {
          if (!e.allowFunction)
            return;
          let { name: p } = i, y = i.toString();
          return y.match(
            /(\[native code\]|WEBPACK_IMPORTED_MODULE|__webpack_exports__|__webpack_require__)/
          ) ? `_function_${p}|${(() => {
          }).toString()}` : `_function_${p}|${cleanCode(convertShorthandMethods(c, y))}`;
        }
        if ((0, import_is_symbol.default)(i)) {
          if (!e.allowSymbol)
            return;
          let p = Symbol.keyFor(i);
          return p !== void 0 ? `_gsymbol_${p}` : `_symbol_${i.toString().slice(7, -1)}`;
        }
        if (a.length >= e.maxDepth)
          return Array.isArray(i) ? `[Array(${i.length})]` : "[Object]";
        if (i === this)
          return `_duplicate_${JSON.stringify(s)}`;
        if (i instanceof Error && e.allowError)
          return {
            __isConvertedError__: !0,
            errorProperties: {
              ...i.cause ? { cause: i.cause } : {},
              ...i,
              name: i.name,
              message: i.message,
              stack: i.stack,
              "_constructor-name_": i.constructor.name
            }
          };
        if (i.constructor && i.constructor.name && i.constructor.name !== "Object" && !Array.isArray(i) && !e.allowClass)
          return;
        let u = r.get(i);
        if (!u) {
          let p = Array.isArray(i) ? i : convertUnconventionalData(i);
          if (i.constructor && i.constructor.name && i.constructor.name !== "Object" && !Array.isArray(i) && e.allowClass)
            try {
              Object.assign(p, { "_constructor-name_": i.constructor.name });
            } catch {
            }
          return s.push(c), a.unshift(p), r.set(i, JSON.stringify(s)), i !== p && n.set(i, p), p;
        }
        return `_duplicate_${u}`;
      } catch {
        return;
      }
    }, "replace");
  }, "replacer2"), reviver2 = /* @__PURE__ */ o(function reviver(options) {
    let refs = [], root;
    return /* @__PURE__ */ o(function revive(key, value) {
      if (key === "" && (root = value, refs.forEach(({ target: t, container: e, replacement: r }) => {
        let n = isJSON(r) ? JSON.parse(r) : r.split(".");
        n.length === 0 ? e[t] = root : e[t] = get_default(root, n);
      })), key === "_constructor-name_")
        return value;
      if (isObject3(value) && value.__isConvertedError__) {
        let { message: t, ...e } = value.errorProperties, r = new Error(t);
        return Object.assign(r, e), r;
      }
      if (isObject3(value) && value["_constructor-name_"] && options.allowFunction) {
        let t = value["_constructor-name_"];
        if (t !== "Object") {
          let e = new Function(`return function ${t.replace(/[^a-zA-Z0-9$_]+/g, "")}(){}`)();
          Object.setPrototypeOf(value, new e());
        }
        return delete value["_constructor-name_"], value;
      }
      if (typeof value == "string" && value.startsWith("_function_") && options.allowFunction) {
        let [, name, source] = value.match(/_function_([^|]*)\|(.*)/) || [], sourceSanitized = source.replace(/[(\(\))|\\| |\]|`]*$/, "");
        if (!options.lazyEval)
          return eval(`(${sourceSanitized})`);
        let result = /* @__PURE__ */ o((...args) => {
          let f = eval(`(${sourceSanitized})`);
          return f(...args);
        }, "result");
        return Object.defineProperty(result, "toString", {
          value: /* @__PURE__ */ o(() => sourceSanitized, "value")
        }), Object.defineProperty(result, "name", {
          value: name
        }), result;
      }
      if (typeof value == "string" && value.startsWith("_regexp_") && options.allowRegExp) {
        let [, t, e] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
        return new RegExp(e, t);
      }
      return typeof value == "string" && value.startsWith("_date_") && options.allowDate ? new Date(value.replace("_date_", "")) : typeof value ==
      "string" && value.startsWith("_duplicate_") ? (refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, "") }),
      null) : typeof value == "string" && value.startsWith("_symbol_") && options.allowSymbol ? Symbol(value.replace("_symbol_", "")) : typeof value ==
      "string" && value.startsWith("_gsymbol_") && options.allowSymbol ? Symbol.for(value.replace("_gsymbol_", "")) : typeof value == "strin\
g" && value === "_-Infinity_" ? -1 / 0 : typeof value == "string" && value === "_Infinity_" ? 1 / 0 : typeof value == "string" && value === "\
_NaN_" ? NaN : typeof value == "string" && value.startsWith("_bigint_") && typeof BigInt == "function" ? BigInt(value.replace("_bigint_", "")) :
      value;
    }, "revive");
  }, "reviver"), defaultOptions = {
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
  }, stringify = /* @__PURE__ */ o((t, e = {}) => {
    let r = { ...defaultOptions, ...e };
    return JSON.stringify(convertUnconventionalData(t), replacer(r), e.space);
  }, "stringify"), mutator = /* @__PURE__ */ o(() => {
    let t = /* @__PURE__ */ new Map();
    return /* @__PURE__ */ o(function e(r) {
      isObject3(r) && Object.entries(r).forEach(([n, a]) => {
        a === "_undefined_" ? r[n] = void 0 : t.get(a) || (t.set(a, !0), e(a));
      }), Array.isArray(r) && r.forEach((n, a) => {
        n === "_undefined_" ? (t.set(n, !0), r[a] = void 0) : t.get(n) || (t.set(n, !0), e(n));
      });
    }, "mutateUndefined");
  }, "mutator"), parse = /* @__PURE__ */ o((t, e = {}) => {
    let r = { ...defaultOptions, ...e }, n = JSON.parse(t, reviver2(r));
    return mutator()(n), n;
  }, "parse");
});

// src/channels/index.ts
var lt = {};
ke(lt, {
  Channel: () => $,
  HEARTBEAT_INTERVAL: () => pe,
  HEARTBEAT_MAX_LATENCY: () => ue,
  PostMessageTransport: () => G,
  WebsocketTransport: () => W,
  createBrowserChannel: () => st,
  default: () => it
});
module.exports = Ge(lt);
var Ie = I(te(), 1);

// src/shared/universal-store/index.ts
var R = I(me(), 1);

// src/shared/universal-store/instances.ts
var ae = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var Ke = "UNIVERSAL_STORE:", C = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, U = class t {
  constructor(e, r) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = /* @__PURE__ */ o(() => (this.debug("getState", { state: this.state }), this.state), "getState");
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = /* @__PURE__ */ o((e, r) => {
      let n = typeof e == "function", a = n ? "*" : e, s = n ? e : r;
      if (this.debug("subscribe", { eventType: a, listener: s }), !s)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(a) || this.listeners.set(a, /* @__PURE__ */ new Set()), this.listeners.get(a).add(s), () => {
        this.debug("unsubscribe", { eventType: a, listener: s }), this.listeners.has(a) && (this.listeners.get(a).delete(s), this.listeners.
        get(a)?.size === 0 && this.listeners.delete(a));
      };
    }, "subscribe");
    /** Sends a custom event to the other stores */
    this.send = /* @__PURE__ */ o((e) => {
      if (this.debug("send", { event: e }), this.status !== t.Status.READY)
        throw new TypeError(
          R.dedent`Cannot send event before store is ready. You can get the current status with store.status,
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
    if (this.debugging = e.debug ?? !1, !t.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (t.isInternalConstructing = !1, this.id = e.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.
    actorType = e.leader ? t.ActorType.LEADER : t.ActorType.FOLLOWER, this.state = e.initialState, this.channelEventName = `${Ke}${this.id}`,
    this.debug("constructor", {
      options: e,
      environmentOverrides: r,
      channelEventName: this.channelEventName
    }), this.actor.type === t.ActorType.LEADER)
      this.syncing = {
        state: C.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let n, a, s = new Promise((l, c) => {
        n = /* @__PURE__ */ o(() => {
          this.syncing.state === C.PENDING && (this.syncing.state = C.RESOLVED, l());
        }, "syncingResolve"), a = /* @__PURE__ */ o((i) => {
          this.syncing.state === C.PENDING && (this.syncing.state = C.REJECTED, c(i));
        }, "syncingReject");
      });
      this.syncing = {
        state: C.PENDING,
        promise: s,
        resolve: n,
        reject: a
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange =
    this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.
    prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(
    this), this.debug = this.debug.bind(this), this.channel = r?.channel ?? t.preparation.channel, this.environment = r?.environment ?? t.preparation.
    environment, this.channel && this.environment ? this.prepareThis({ channel: this.channel, environment: this.environment }) : t.preparation.
    promise.then(this.prepareThis);
  }
  static {
    o(this, "UniversalStore");
  }
  static {
    /**
     * Defines the possible actor types in the store system
     *
     * @readonly
     */
    this.ActorType = {
      LEADER: "LEADER",
      FOLLOWER: "FOLLOWER"
    };
  }
  static {
    /**
     * Defines the possible environments the store can run in
     *
     * @readonly
     */
    this.Environment = {
      SERVER: "SERVER",
      MANAGER: "MANAGER",
      PREVIEW: "PREVIEW",
      UNKNOWN: "UNKNOWN",
      MOCK: "MOCK"
    };
  }
  static {
    /**
     * Internal event types used for store synchronization
     *
     * @readonly
     */
    this.InternalEventType = {
      EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
      EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
      SET_STATE: "__SET_STATE",
      LEADER_CREATED: "__LEADER_CREATED",
      FOLLOWER_CREATED: "__FOLLOWER_CREATED"
    };
  }
  static {
    this.Status = {
      UNPREPARED: "UNPREPARED",
      SYNCING: "SYNCING",
      READY: "READY",
      ERROR: "ERROR"
    };
  }
  static {
    // This is used to check if constructor was called from the static factory create()
    this.isInternalConstructing = !1;
  }
  static {
    t.setupPreparationPromise();
  }
  static setupPreparationPromise() {
    let e, r, n = new Promise(
      (a, s) => {
        e = /* @__PURE__ */ o((l) => {
          a(l);
        }, "resolveRef"), r = /* @__PURE__ */ o((...l) => {
          s(l);
        }, "rejectRef");
      }
    );
    t.preparation = {
      resolve: e,
      reject: r,
      promise: n
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? t.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return t.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case C.PENDING:
      case void 0:
        return t.Status.SYNCING;
      case C.REJECTED:
        return t.Status.ERROR;
      case C.RESOLVED:
      default:
        return t.Status.READY;
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
    return Promise.all([t.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(e) {
    if (!e || typeof e?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    e.debug && console.debug(
      R.dedent`[UniversalStore]
        create`,
      { options: e }
    );
    let r = ae.get(e.id);
    if (r)
      return console.warn(R.dedent`UniversalStore with id "${e.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), r;
    t.isInternalConstructing = !0;
    let n = new t(e);
    return ae.set(e.id, n), n;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(e, r) {
    t.preparation.channel = e, t.preparation.environment = r, t.preparation.resolve({ channel: e, environment: r });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(e) {
    let r = this.state, n = typeof e == "function" ? e(r) : e;
    if (this.debug("setState", { newState: n, previousState: r, updater: e }), this.status !== t.Status.READY)
      throw new TypeError(
        R.dedent`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState: n,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = n;
    let a = {
      type: t.InternalEventType.SET_STATE,
      payload: {
        state: n,
        previousState: r
      }
    };
    this.emitToChannel(a, { actor: this.actor }), this.emitToListeners(a, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(e) {
    return this.debug("onStateChange", { listener: e }), this.subscribe(
      t.InternalEventType.SET_STATE,
      ({ payload: r }, n) => {
        e(r.state, r.previousState, n);
      }
    );
  }
  emitToChannel(e, r) {
    this.debug("emitToChannel", { event: e, eventInfo: r, channel: this.channel }), this.channel?.emit(this.channelEventName, {
      event: e,
      eventInfo: r
    });
  }
  prepareThis({
    channel: e,
    environment: r
  }) {
    this.channel = e, this.environment = r, this.debug("prepared", { channel: e, environment: r }), this.channel.on(this.channelEventName, this.
    handleChannelEvents), this.actor.type === t.ActorType.LEADER ? this.emitToChannel(
      { type: t.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: t.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: t.InternalEventType.EXISTING_STATE_REQUEST },
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
  emitToListeners(e, r) {
    let n = this.listeners.get(e.type), a = this.listeners.get("*");
    this.debug("emitToListeners", {
      event: e,
      eventInfo: r,
      eventTypeListeners: n,
      everythingListeners: a
    }), [...n ?? [], ...a ?? []].forEach(
      (s) => s(e, r)
    );
  }
  handleChannelEvents(e) {
    let { event: r, eventInfo: n } = e;
    if ([n.actor.id, n.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent: e });
      return;
    } else if (this.syncing?.state === C.PENDING && r.type !== t.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent: e });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent: e }), this.actor.type === t.ActorType.LEADER) {
      let a = !0;
      switch (r.type) {
        case t.InternalEventType.EXISTING_STATE_REQUEST:
          a = !1;
          let s = {
            type: t.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent: s
          }), this.emitToChannel(s, { actor: this.actor });
          break;
        case t.InternalEventType.LEADER_CREATED:
          a = !1, this.syncing.state = C.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event: r
          }), console.error(
            R.dedent`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(n.actor, null, 2)}`
          );
          break;
      }
      a && (this.debug("handleChannelEvents: forwarding event", { channelEvent: e }), this.emitToChannel(r, { actor: n.actor, forwardingActor: this.
      actor }));
    }
    if (this.actor.type === t.ActorType.FOLLOWER)
      switch (r.type) {
        case t.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event: r
          }), this.syncing?.state !== C.PENDING)
            break;
          this.syncing.resolve?.();
          let a = {
            type: t.InternalEventType.SET_STATE,
            payload: {
              state: r.payload,
              previousState: this.state
            }
          };
          this.state = r.payload, this.emitToListeners(a, n);
          break;
      }
    switch (r.type) {
      case t.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event: r }), this.state = r.payload.state;
        break;
    }
    this.emitToListeners(r, { actor: n.actor });
  }
  debug(e, r) {
    this.debugging && console.debug(
      R.dedent`[UniversalStore::${this.id}::${this.environment ?? t.Environment.UNKNOWN}]
        ${e}`,
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
    t.preparation.reject(new Error("reset")), t.setupPreparationPromise(), t.isInternalConstructing = !1;
  }
};

// src/channels/main.ts
var Ye = /* @__PURE__ */ o((t) => t.transports !== void 0, "isMulti"), Xe = /* @__PURE__ */ o(() => Math.random().toString(16).slice(2), "ge\
nerateRandomId"), $ = class {
  constructor(e = {}) {
    this.sender = Xe();
    this.events = {};
    this.data = {};
    this.transports = [];
    this.isAsync = e.async || !1, Ye(e) ? (this.transports = e.transports || [], this.transports.forEach((r) => {
      r.setHandler((n) => this.handleEvent(n));
    })) : this.transports = e.transport ? [e.transport] : [], this.transports.forEach((r) => {
      r.setHandler((n) => this.handleEvent(n));
    });
  }
  static {
    o(this, "Channel");
  }
  get hasTransport() {
    return this.transports.length > 0;
  }
  addListener(e, r) {
    this.events[e] = this.events[e] || [], this.events[e].push(r);
  }
  emit(e, ...r) {
    let n = { type: e, args: r, from: this.sender }, a = {};
    r.length >= 1 && r[0] && r[0].options && (a = r[0].options);
    let s = /* @__PURE__ */ o(() => {
      this.transports.forEach((l) => {
        l.send(n, a);
      }), this.handleEvent(n);
    }, "handler");
    this.isAsync ? setImmediate(s) : s();
  }
  last(e) {
    return this.data[e];
  }
  eventNames() {
    return Object.keys(this.events);
  }
  listenerCount(e) {
    let r = this.listeners(e);
    return r ? r.length : 0;
  }
  listeners(e) {
    return this.events[e] || void 0;
  }
  once(e, r) {
    let n = this.onceListener(e, r);
    this.addListener(e, n);
  }
  removeAllListeners(e) {
    e ? this.events[e] && delete this.events[e] : this.events = {};
  }
  removeListener(e, r) {
    let n = this.listeners(e);
    n && (this.events[e] = n.filter((a) => a !== r));
  }
  on(e, r) {
    this.addListener(e, r);
  }
  off(e, r) {
    this.removeListener(e, r);
  }
  handleEvent(e) {
    let r = this.listeners(e.type);
    r && r.length && r.forEach((n) => {
      n.apply(e, e.args);
    }), this.data[e.type] = e.args;
  }
  onceListener(e, r) {
    let n = /* @__PURE__ */ o((...a) => (this.removeListener(e, n), r(...a)), "onceListener");
    return n;
  }
};

// src/channels/postmessage/index.ts
var _ = I(te(), 1), k = require("@storybook/core/client-logger"), rt = I(require("@storybook/core/core-events"), 1), H = I(oe(), 1);

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var tt = process.env.NODE_ENV === "production", ie = "Invariant failed";
function V(t, e) {
  if (!t) {
    if (tt)
      throw new Error(ie);
    var r = typeof e == "function" ? e() : e, n = r ? "".concat(ie, ": ").concat(r) : ie;
    throw new Error(n);
  }
}
o(V, "invariant");

// src/channels/postmessage/getEventSourceUrl.ts
var Ae = require("@storybook/core/client-logger");
var Oe = /* @__PURE__ */ o((t) => {
  let e = Array.from(
    document.querySelectorAll("iframe[data-is-storybook]")
  ), [r, ...n] = e.filter((s) => {
    try {
      return s.contentWindow?.location.origin === t.source.location.origin && s.contentWindow?.location.pathname === t.source.location.pathname;
    } catch {
    }
    try {
      return s.contentWindow === t.source;
    } catch {
    }
    let l = s.getAttribute("src"), c;
    try {
      if (!l)
        return !1;
      ({ origin: c } = new URL(l, document.location.toString()));
    } catch {
      return !1;
    }
    return c === t.origin;
  }), a = r?.getAttribute("src");
  if (a && n.length === 0) {
    let { protocol: s, host: l, pathname: c } = new URL(a, document.location.toString());
    return `${s}//${l}${c}`;
  }
  return n.length > 0 && Ae.logger.error("found multiple candidates for event source"), null;
}, "getEventSourceUrl");

// src/channels/postmessage/index.ts
var { document: se, location: le } = _.global, we = "storybook-channel", nt = { allowFunction: !1, maxDepth: 25 }, G = class {
  constructor(e) {
    this.config = e;
    this.connected = !1;
    if (this.buffer = [], typeof _.global?.addEventListener == "function" && _.global.addEventListener("message", this.handleEvent.bind(this),
    !1), e.page !== "manager" && e.page !== "preview")
      throw new Error(`postmsg-channel: "config.page" cannot be "${e.page}"`);
  }
  static {
    o(this, "PostMessageTransport");
  }
  setHandler(e) {
    this.handler = (...r) => {
      e.apply(this, r), !this.connected && this.getLocalFrame().length && (this.flush(), this.connected = !0);
    };
  }
  /**
   * Sends `event` to the associated window. If the window does not yet exist the event will be
   * stored in a buffer and sent when the window exists.
   *
   * @param event
   */
  send(e, r) {
    let {
      target: n,
      // telejson options
      allowRegExp: a,
      allowFunction: s,
      allowSymbol: l,
      allowDate: c,
      allowError: i,
      allowUndefined: h,
      allowClass: u,
      maxDepth: p,
      space: y,
      lazyEval: d
    } = r || {}, v = Object.fromEntries(
      Object.entries({
        allowRegExp: a,
        allowFunction: s,
        allowSymbol: l,
        allowDate: c,
        allowError: i,
        allowUndefined: h,
        allowClass: u,
        maxDepth: p,
        space: y,
        lazyEval: d
      }).filter(([D, L]) => typeof L < "u")
    ), w = {
      ...nt,
      ..._.global.CHANNEL_OPTIONS || {},
      ...v
    }, T = this.getFrames(n), N = new URLSearchParams(le?.search || ""), j = (0, H.stringify)(
      {
        key: we,
        event: e,
        refId: N.get("refId")
      },
      w
    );
    return T.length ? (this.buffer.length && this.flush(), T.forEach((D) => {
      try {
        D.postMessage(j, "*");
      } catch {
        k.logger.error("sending over postmessage fail");
      }
    }), Promise.resolve(null)) : new Promise((D, L) => {
      this.buffer.push({ event: e, resolve: D, reject: L });
    });
  }
  flush() {
    let { buffer: e } = this;
    this.buffer = [], e.forEach((r) => {
      this.send(r.event).then(r.resolve).catch(r.reject);
    });
  }
  getFrames(e) {
    if (this.config.page === "manager") {
      let n = Array.from(
        se.querySelectorAll("iframe[data-is-storybook][data-is-loaded]")
      ).flatMap((a) => {
        try {
          return a.contentWindow && a.dataset.isStorybook !== void 0 && a.id === e ? [a.contentWindow] : [];
        } catch {
          return [];
        }
      });
      return n?.length ? n : this.getCurrentFrames();
    }
    return _.global && _.global.parent && _.global.parent !== _.global.self ? [_.global.parent] : [];
  }
  getCurrentFrames() {
    return this.config.page === "manager" ? Array.from(
      se.querySelectorAll('[data-is-storybook="true"]')
    ).flatMap((r) => r.contentWindow ? [r.contentWindow] : []) : _.global && _.global.parent ? [_.global.parent] : [];
  }
  getLocalFrame() {
    return this.config.page === "manager" ? Array.from(
      se.querySelectorAll("#storybook-preview-iframe")
    ).flatMap((r) => r.contentWindow ? [r.contentWindow] : []) : _.global && _.global.parent ? [_.global.parent] : [];
  }
  handleEvent(e) {
    try {
      let { data: r } = e, { key: n, event: a, refId: s } = typeof r == "string" && (0, H.isJSON)(r) ? (0, H.parse)(r, _.global.CHANNEL_OPTIONS ||
      {}) : r;
      if (n === we) {
        let l = this.config.page === "manager" ? '<span style="color: #37D5D3; background: black"> manager </span>' : '<span style="color: #\
1EA7FD; background: black"> preview </span>', c = Object.values(rt).includes(a.type) ? `<span style="color: #FF4785">${a.type}</span>` : `<s\
pan style="color: #FFAE00">${a.type}</span>`;
        if (s && (a.refId = s), a.source = this.config.page === "preview" ? e.origin : Oe(e), !a.source) {
          k.pretty.error(
            `${l} received ${c} but was unable to determine the source of the event`
          );
          return;
        }
        let i = `${l} received ${c} (${r.length})`;
        k.pretty.debug(
          le.origin !== a.source ? i : `${i} <span style="color: gray">(on ${le.origin} from ${a.source})</span>`,
          ...a.args
        ), V(this.handler, "ChannelHandler should be set"), this.handler(a);
      }
    } catch (r) {
      k.logger.error(r);
    }
  }
};

// src/channels/websocket/index.ts
var ce = I(te(), 1), Pe = I(require("@storybook/core/core-events"), 1), q = I(oe(), 1);
var { WebSocket: at } = ce.global, pe = 15e3, ue = 5e3, W = class {
  constructor({ url: e, onError: r, page: n }) {
    this.buffer = [];
    this.isReady = !1;
    this.isClosed = !1;
    this.pingTimeout = 0;
    this.socket = new at(e), this.socket.onopen = () => {
      this.isReady = !0, this.heartbeat(), this.flush();
    }, this.socket.onmessage = ({ data: a }) => {
      let s = typeof a == "string" && (0, q.isJSON)(a) ? (0, q.parse)(a) : a;
      V(this.handler, "WebsocketTransport handler should be set"), this.handler(s), s.type === "ping" && (this.heartbeat(), this.send({ type: "\
pong" }));
    }, this.socket.onerror = (a) => {
      r && r(a);
    }, this.socket.onclose = (a) => {
      V(this.handler, "WebsocketTransport handler should be set"), this.handler({
        type: Pe.CHANNEL_WS_DISCONNECT,
        args: [{ reason: a.reason, code: a.code }],
        from: n || "preview"
      }), this.isClosed = !0, clearTimeout(this.pingTimeout);
    };
  }
  static {
    o(this, "WebsocketTransport");
  }
  heartbeat() {
    clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => {
      this.socket.close(3008, "timeout");
    }, pe + ue);
  }
  setHandler(e) {
    this.handler = e;
  }
  send(e) {
    this.isClosed || (this.isReady ? this.sendNow(e) : this.sendLater(e));
  }
  sendLater(e) {
    this.buffer.push(e);
  }
  sendNow(e) {
    let r = (0, q.stringify)(e, {
      maxDepth: 15,
      allowFunction: !1,
      ...ce.global.CHANNEL_OPTIONS
    });
    this.socket.send(r);
  }
  flush() {
    let { buffer: e } = this;
    this.buffer = [], e.forEach((r) => this.send(r));
  }
};

// src/channels/index.ts
var { CONFIG_TYPE: ot } = Ie.global, it = $;
function st({ page: t, extraTransports: e = [] }) {
  let r = [new G({ page: t }), ...e];
  if (ot === "DEVELOPMENT") {
    let a = window.location.protocol === "http:" ? "ws" : "wss", { hostname: s, port: l } = window.location, c = `${a}://${s}:${l}/storybook\
-server-channel`;
    r.push(new W({ url: c, onError: /* @__PURE__ */ o(() => {
    }, "onError"), page: t }));
  }
  let n = new $({ transports: r });
  return U.__prepare(
    n,
    t === "manager" ? U.Environment.MANAGER : U.Environment.PREVIEW
  ), n;
}
o(st, "createBrowserChannel");
