import ESM_COMPAT_Module from "node:module";
import { fileURLToPath as ESM_COMPAT_fileURLToPath } from 'node:url';
import { dirname as ESM_COMPAT_dirname } from 'node:path';
const __filename = ESM_COMPAT_fileURLToPath(import.meta.url);
const __dirname = ESM_COMPAT_dirname(__filename);
const require = ESM_COMPAT_Module.createRequire(import.meta.url);
var kt = Object.create;
var A = Object.defineProperty;
var Tt = Object.getOwnPropertyDescriptor;
var Rt = Object.getOwnPropertyNames;
var Ft = Object.getPrototypeOf, Lt = Object.prototype.hasOwnProperty;
var o = (e, i) => A(e, "name", { value: i, configurable: !0 }), O = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "\
u" ? new Proxy(e, {
  get: (i, t) => (typeof require < "u" ? require : i)[t]
}) : e)(function(e) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + e + '" is not supported');
});
var q = (e, i) => () => (e && (i = e(e = 0)), i);
var R = (e, i) => () => (i || e((i = { exports: {} }).exports, i), i.exports), z = (e, i) => {
  for (var t in i)
    A(e, t, { get: i[t], enumerable: !0 });
}, ue = (e, i, t, a) => {
  if (i && typeof i == "object" || typeof i == "function")
    for (let r of Rt(i))
      !Lt.call(e, r) && r !== t && A(e, r, { get: () => i[r], enumerable: !(a = Tt(i, r)) || a.enumerable });
  return e;
};
var $ = (e, i, t) => (t = e != null ? kt(Ft(e)) : {}, ue(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  i || !e || !e.__esModule ? A(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), W = (e) => ue(A({}, "__esModule", { value: !0 }), e);

// ../node_modules/tslib/tslib.es6.mjs
var Ie = {};
z(Ie, {
  __addDisposableResource: () => Ne,
  __assign: () => H,
  __asyncDelegator: () => Se,
  __asyncGenerator: () => Pe,
  __asyncValues: () => ke,
  __await: () => F,
  __awaiter: () => we,
  __classPrivateFieldGet: () => Le,
  __classPrivateFieldIn: () => Ae,
  __classPrivateFieldSet: () => Ce,
  __createBinding: () => J,
  __decorate: () => he,
  __disposeResources: () => De,
  __esDecorate: () => Nt,
  __exportStar: () => _e,
  __extends: () => ge,
  __generator: () => be,
  __importDefault: () => Fe,
  __importStar: () => Re,
  __makeTemplateObject: () => Te,
  __metadata: () => ve,
  __param: () => ye,
  __propKey: () => It,
  __read: () => Q,
  __rest: () => xe,
  __runInitializers: () => Dt,
  __setFunctionName: () => Mt,
  __spread: () => je,
  __spreadArray: () => Ee,
  __spreadArrays: () => Oe,
  __values: () => B,
  default: () => $t
});
function ge(e, i) {
  if (typeof i != "function" && i !== null)
    throw new TypeError("Class extends value " + String(i) + " is not a constructor or null");
  Y(e, i);
  function t() {
    this.constructor = e;
  }
  o(t, "__"), e.prototype = i === null ? Object.create(i) : (t.prototype = i.prototype, new t());
}
function xe(e, i) {
  var t = {};
  for (var a in e) Object.prototype.hasOwnProperty.call(e, a) && i.indexOf(a) < 0 && (t[a] = e[a]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var r = 0, a = Object.getOwnPropertySymbols(e); r < a.length; r++)
      i.indexOf(a[r]) < 0 && Object.prototype.propertyIsEnumerable.call(e, a[r]) && (t[a[r]] = e[a[r]]);
  return t;
}
function he(e, i, t, a) {
  var r = arguments.length, n = r < 3 ? i : a === null ? a = Object.getOwnPropertyDescriptor(i, t) : a, s;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") n = Reflect.decorate(e, i, t, a);
  else for (var c = e.length - 1; c >= 0; c--) (s = e[c]) && (n = (r < 3 ? s(n) : r > 3 ? s(i, t, n) : s(i, t)) || n);
  return r > 3 && n && Object.defineProperty(i, t, n), n;
}
function ye(e, i) {
  return function(t, a) {
    i(t, a, e);
  };
}
function Nt(e, i, t, a, r, n) {
  function s(y) {
    if (y !== void 0 && typeof y != "function") throw new TypeError("Function expected");
    return y;
  }
  o(s, "accept");
  for (var c = a.kind, p = c === "getter" ? "get" : c === "setter" ? "set" : "value", l = !i && e ? a.static ? e : e.prototype : null, u = i ||
  (l ? Object.getOwnPropertyDescriptor(l, a.name) : {}), d, f = !1, v = t.length - 1; v >= 0; v--) {
    var m = {};
    for (var g in a) m[g] = g === "access" ? {} : a[g];
    for (var g in a.access) m.access[g] = a.access[g];
    m.addInitializer = function(y) {
      if (f) throw new TypeError("Cannot add initializers after decoration has completed");
      n.push(s(y || null));
    };
    var h = (0, t[v])(c === "accessor" ? { get: u.get, set: u.set } : u[p], m);
    if (c === "accessor") {
      if (h === void 0) continue;
      if (h === null || typeof h != "object") throw new TypeError("Object expected");
      (d = s(h.get)) && (u.get = d), (d = s(h.set)) && (u.set = d), (d = s(h.init)) && r.unshift(d);
    } else (d = s(h)) && (c === "field" ? r.unshift(d) : u[p] = d);
  }
  l && Object.defineProperty(l, a.name, u), f = !0;
}
function Dt(e, i, t) {
  for (var a = arguments.length > 2, r = 0; r < i.length; r++)
    t = a ? i[r].call(e, t) : i[r].call(e);
  return a ? t : void 0;
}
function It(e) {
  return typeof e == "symbol" ? e : "".concat(e);
}
function Mt(e, i, t) {
  return typeof i == "symbol" && (i = i.description ? "[".concat(i.description, "]") : ""), Object.defineProperty(e, "name", { configurable: !0,
  value: t ? "".concat(t, " ", i) : i });
}
function ve(e, i) {
  if (typeof Reflect == "object" && typeof Reflect.metadata == "function") return Reflect.metadata(e, i);
}
function we(e, i, t, a) {
  function r(n) {
    return n instanceof t ? n : new t(function(s) {
      s(n);
    });
  }
  return o(r, "adopt"), new (t || (t = Promise))(function(n, s) {
    function c(u) {
      try {
        l(a.next(u));
      } catch (d) {
        s(d);
      }
    }
    o(c, "fulfilled");
    function p(u) {
      try {
        l(a.throw(u));
      } catch (d) {
        s(d);
      }
    }
    o(p, "rejected");
    function l(u) {
      u.done ? n(u.value) : r(u.value).then(c, p);
    }
    o(l, "step"), l((a = a.apply(e, i || [])).next());
  });
}
function be(e, i) {
  var t = { label: 0, sent: /* @__PURE__ */ o(function() {
    if (n[0] & 1) throw n[1];
    return n[1];
  }, "sent"), trys: [], ops: [] }, a, r, n, s;
  return s = { next: c(0), throw: c(1), return: c(2) }, typeof Symbol == "function" && (s[Symbol.iterator] = function() {
    return this;
  }), s;
  function c(l) {
    return function(u) {
      return p([l, u]);
    };
  }
  function p(l) {
    if (a) throw new TypeError("Generator is already executing.");
    for (; s && (s = 0, l[0] && (t = 0)), t; ) try {
      if (a = 1, r && (n = l[0] & 2 ? r.return : l[0] ? r.throw || ((n = r.return) && n.call(r), 0) : r.next) && !(n = n.call(r, l[1])).done)
       return n;
      switch (r = 0, n && (l = [l[0] & 2, n.value]), l[0]) {
        case 0:
        case 1:
          n = l;
          break;
        case 4:
          return t.label++, { value: l[1], done: !1 };
        case 5:
          t.label++, r = l[1], l = [0];
          continue;
        case 7:
          l = t.ops.pop(), t.trys.pop();
          continue;
        default:
          if (n = t.trys, !(n = n.length > 0 && n[n.length - 1]) && (l[0] === 6 || l[0] === 2)) {
            t = 0;
            continue;
          }
          if (l[0] === 3 && (!n || l[1] > n[0] && l[1] < n[3])) {
            t.label = l[1];
            break;
          }
          if (l[0] === 6 && t.label < n[1]) {
            t.label = n[1], n = l;
            break;
          }
          if (n && t.label < n[2]) {
            t.label = n[2], t.ops.push(l);
            break;
          }
          n[2] && t.ops.pop(), t.trys.pop();
          continue;
      }
      l = i.call(e, t);
    } catch (u) {
      l = [6, u], r = 0;
    } finally {
      a = n = 0;
    }
    if (l[0] & 5) throw l[1];
    return { value: l[0] ? l[1] : void 0, done: !0 };
  }
}
function _e(e, i) {
  for (var t in e) t !== "default" && !Object.prototype.hasOwnProperty.call(i, t) && J(i, e, t);
}
function B(e) {
  var i = typeof Symbol == "function" && Symbol.iterator, t = i && e[i], a = 0;
  if (t) return t.call(e);
  if (e && typeof e.length == "number") return {
    next: /* @__PURE__ */ o(function() {
      return e && a >= e.length && (e = void 0), { value: e && e[a++], done: !e };
    }, "next")
  };
  throw new TypeError(i ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function Q(e, i) {
  var t = typeof Symbol == "function" && e[Symbol.iterator];
  if (!t) return e;
  var a = t.call(e), r, n = [], s;
  try {
    for (; (i === void 0 || i-- > 0) && !(r = a.next()).done; ) n.push(r.value);
  } catch (c) {
    s = { error: c };
  } finally {
    try {
      r && !r.done && (t = a.return) && t.call(a);
    } finally {
      if (s) throw s.error;
    }
  }
  return n;
}
function je() {
  for (var e = [], i = 0; i < arguments.length; i++)
    e = e.concat(Q(arguments[i]));
  return e;
}
function Oe() {
  for (var e = 0, i = 0, t = arguments.length; i < t; i++) e += arguments[i].length;
  for (var a = Array(e), r = 0, i = 0; i < t; i++)
    for (var n = arguments[i], s = 0, c = n.length; s < c; s++, r++)
      a[r] = n[s];
  return a;
}
function Ee(e, i, t) {
  if (t || arguments.length === 2) for (var a = 0, r = i.length, n; a < r; a++)
    (n || !(a in i)) && (n || (n = Array.prototype.slice.call(i, 0, a)), n[a] = i[a]);
  return e.concat(n || Array.prototype.slice.call(i));
}
function F(e) {
  return this instanceof F ? (this.v = e, this) : new F(e);
}
function Pe(e, i, t) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var a = t.apply(e, i || []), r, n = [];
  return r = {}, s("next"), s("throw"), s("return"), r[Symbol.asyncIterator] = function() {
    return this;
  }, r;
  function s(f) {
    a[f] && (r[f] = function(v) {
      return new Promise(function(m, g) {
        n.push([f, v, m, g]) > 1 || c(f, v);
      });
    });
  }
  function c(f, v) {
    try {
      p(a[f](v));
    } catch (m) {
      d(n[0][3], m);
    }
  }
  function p(f) {
    f.value instanceof F ? Promise.resolve(f.value.v).then(l, u) : d(n[0][2], f);
  }
  function l(f) {
    c("next", f);
  }
  function u(f) {
    c("throw", f);
  }
  function d(f, v) {
    f(v), n.shift(), n.length && c(n[0][0], n[0][1]);
  }
}
function Se(e) {
  var i, t;
  return i = {}, a("next"), a("throw", function(r) {
    throw r;
  }), a("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function a(r, n) {
    i[r] = e[r] ? function(s) {
      return (t = !t) ? { value: F(e[r](s)), done: !1 } : n ? n(s) : s;
    } : n;
  }
}
function ke(e) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var i = e[Symbol.asyncIterator], t;
  return i ? i.call(e) : (e = typeof B == "function" ? B(e) : e[Symbol.iterator](), t = {}, a("next"), a("throw"), a("return"), t[Symbol.asyncIterator] =
  function() {
    return this;
  }, t);
  function a(n) {
    t[n] = e[n] && function(s) {
      return new Promise(function(c, p) {
        s = e[n](s), r(c, p, s.done, s.value);
      });
    };
  }
  function r(n, s, c, p) {
    Promise.resolve(p).then(function(l) {
      n({ value: l, done: c });
    }, s);
  }
}
function Te(e, i) {
  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: i }) : e.raw = i, e;
}
function Re(e) {
  if (e && e.__esModule) return e;
  var i = {};
  if (e != null) for (var t in e) t !== "default" && Object.prototype.hasOwnProperty.call(e, t) && J(i, e, t);
  return qt(i, e), i;
}
function Fe(e) {
  return e && e.__esModule ? e : { default: e };
}
function Le(e, i, t, a) {
  if (t === "a" && !a) throw new TypeError("Private accessor was defined without a getter");
  if (typeof i == "function" ? e !== i || !a : !i.has(e)) throw new TypeError("Cannot read private member from an object whose class did not\
 declare it");
  return t === "m" ? a : t === "a" ? a.call(e) : a ? a.value : i.get(e);
}
function Ce(e, i, t, a, r) {
  if (a === "m") throw new TypeError("Private method is not writable");
  if (a === "a" && !r) throw new TypeError("Private accessor was defined without a setter");
  if (typeof i == "function" ? e !== i || !r : !i.has(e)) throw new TypeError("Cannot write private member to an object whose class did not \
declare it");
  return a === "a" ? r.call(e, t) : r ? r.value = t : i.set(e, t), t;
}
function Ae(e, i) {
  if (i === null || typeof i != "object" && typeof i != "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof e == "function" ? i === e : e.has(i);
}
function Ne(e, i, t) {
  if (i != null) {
    if (typeof i != "object" && typeof i != "function") throw new TypeError("Object expected.");
    var a;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      a = i[Symbol.asyncDispose];
    }
    if (a === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      a = i[Symbol.dispose];
    }
    if (typeof a != "function") throw new TypeError("Object not disposable.");
    e.stack.push({ value: i, dispose: a, async: t });
  } else t && e.stack.push({ async: !0 });
  return i;
}
function De(e) {
  function i(a) {
    e.error = e.hasError ? new zt(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
  }
  o(i, "fail");
  function t() {
    for (; e.stack.length; ) {
      var a = e.stack.pop();
      try {
        var r = a.dispose && a.dispose.call(a.value);
        if (a.async) return Promise.resolve(r).then(t, function(n) {
          return i(n), t();
        });
      } catch (n) {
        i(n);
      }
    }
    if (e.hasError) throw e.error;
  }
  return o(t, "next"), t();
}
var Y, H, J, qt, zt, $t, Me = q(() => {
  Y = /* @__PURE__ */ o(function(e, i) {
    return Y = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t, a) {
      t.__proto__ = a;
    } || function(t, a) {
      for (var r in a) Object.prototype.hasOwnProperty.call(a, r) && (t[r] = a[r]);
    }, Y(e, i);
  }, "extendStatics");
  o(ge, "__extends");
  H = /* @__PURE__ */ o(function() {
    return H = Object.assign || /* @__PURE__ */ o(function(i) {
      for (var t, a = 1, r = arguments.length; a < r; a++) {
        t = arguments[a];
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (i[n] = t[n]);
      }
      return i;
    }, "__assign"), H.apply(this, arguments);
  }, "__assign");
  o(xe, "__rest");
  o(he, "__decorate");
  o(ye, "__param");
  o(Nt, "__esDecorate");
  o(Dt, "__runInitializers");
  o(It, "__propKey");
  o(Mt, "__setFunctionName");
  o(ve, "__metadata");
  o(we, "__awaiter");
  o(be, "__generator");
  J = Object.create ? function(e, i, t, a) {
    a === void 0 && (a = t);
    var r = Object.getOwnPropertyDescriptor(i, t);
    (!r || ("get" in r ? !i.__esModule : r.writable || r.configurable)) && (r = { enumerable: !0, get: /* @__PURE__ */ o(function() {
      return i[t];
    }, "get") }), Object.defineProperty(e, a, r);
  } : function(e, i, t, a) {
    a === void 0 && (a = t), e[a] = i[t];
  };
  o(_e, "__exportStar");
  o(B, "__values");
  o(Q, "__read");
  o(je, "__spread");
  o(Oe, "__spreadArrays");
  o(Ee, "__spreadArray");
  o(F, "__await");
  o(Pe, "__asyncGenerator");
  o(Se, "__asyncDelegator");
  o(ke, "__asyncValues");
  o(Te, "__makeTemplateObject");
  qt = Object.create ? function(e, i) {
    Object.defineProperty(e, "default", { enumerable: !0, value: i });
  } : function(e, i) {
    e.default = i;
  };
  o(Re, "__importStar");
  o(Fe, "__importDefault");
  o(Le, "__classPrivateFieldGet");
  o(Ce, "__classPrivateFieldSet");
  o(Ae, "__classPrivateFieldIn");
  o(Ne, "__addDisposableResource");
  zt = typeof SuppressedError == "function" ? SuppressedError : function(e, i, t) {
    var a = new Error(t);
    return a.name = "SuppressedError", a.error = e, a.suppressed = i, a;
  };
  o(De, "__disposeResources");
  $t = {
    __extends: ge,
    __assign: H,
    __rest: xe,
    __decorate: he,
    __param: ye,
    __metadata: ve,
    __awaiter: we,
    __generator: be,
    __createBinding: J,
    __exportStar: _e,
    __values: B,
    __read: Q,
    __spread: je,
    __spreadArrays: Oe,
    __spreadArray: Ee,
    __await: F,
    __asyncGenerator: Pe,
    __asyncDelegator: Se,
    __asyncValues: ke,
    __makeTemplateObject: Te,
    __importStar: Re,
    __importDefault: Fe,
    __classPrivateFieldGet: Le,
    __classPrivateFieldSet: Ce,
    __classPrivateFieldIn: Ae,
    __addDisposableResource: Ne,
    __disposeResources: De
  };
});

// ../node_modules/@yarnpkg/esbuild-plugin-pnp/lib/index.js
var ze = R((U) => {
  "use strict";
  Object.defineProperty(U, "__esModule", { value: !0 });
  U.pnpPlugin = void 0;
  var qe = (Me(), W(Ie)), Wt = qe.__importStar(O("fs")), Ht = qe.__importDefault(O("path")), Bt = /()/, Jt = [".tsx", ".ts", ".jsx", ".mjs",
  ".cjs", ".js", ".css", ".json"];
  function Ut(e) {
    return e.map((i) => {
      let t = i.indexOf("*");
      return t !== -1 ? { prefix: i.slice(0, t), suffix: i.slice(t + 1) } : i;
    });
  }
  o(Ut, "parseExternals");
  function Gt(e, i) {
    for (let t of i)
      if (typeof t == "object") {
        if (e.length >= t.prefix.length + t.suffix.length && e.startsWith(t.prefix) && e.endsWith(t.suffix))
          return !0;
      } else if (e === t || !t.startsWith("/") && !t.startsWith("./") && !t.startsWith("../") && t !== "." && t !== ".." && e.startsWith(`${t}\
/`))
        return !0;
    return !1;
  }
  o(Gt, "isExternal");
  async function Vt(e) {
    return {
      contents: await Wt.promises.readFile(e.path),
      loader: "default",
      // For regular imports in the `file` namespace, resolveDir is the directory the
      // file being resolved lives in. For all other virtual modules, this defaults to
      // empty string: ""
      // A sensible value for pnp imports is the same as the `file` namespace, as pnp
      // still resolves to files on disk (in the cache).
      resolveDir: Ht.default.dirname(e.path)
    };
  }
  o(Vt, "defaultOnLoad");
  async function Xt(e, { resolvedPath: i, error: t, watchFiles: a }) {
    let r = t ? [{ text: t.message }] : [], n;
    switch (e.kind) {
      case "require-call":
      case "require-resolve":
      case "dynamic-import":
        n = { warnings: r };
        break;
      default:
        n = { errors: r };
        break;
    }
    return i !== null ? { namespace: "pnp", path: i, watchFiles: a } : { external: !0, ...n, watchFiles: a };
  }
  o(Xt, "defaultOnResolve");
  function Kt({ baseDir: e = process.cwd(), extensions: i = Jt, filter: t = Bt, onResolve: a = Xt, onLoad: r = Vt } = {}) {
    return {
      name: "@yarnpkg/esbuild-plugin-pnp",
      setup(n) {
        var s, c;
        let { findPnpApi: p } = O("module");
        if (typeof p > "u")
          return;
        let l = Ut((s = n.initialOptions.external) !== null && s !== void 0 ? s : []), u = (c = n.initialOptions.platform) !== null && c !==
        void 0 ? c : "browser", d = u === "node", f = new Set(n.initialOptions.conditions);
        f.add("default"), (u === "browser" || u === "node") && f.add(u);
        let v = new Set(f);
        v.add("import");
        let m = new Set(f);
        m.add("require"), n.onResolve({ filter: t }, (g) => {
          var h, y;
          if (Gt(g.path, l))
            return { external: !0 };
          let _ = f;
          g.kind === "dynamic-import" || g.kind === "import-statement" ? _ = v : (g.kind === "require-call" || g.kind === "require-resolve") &&
          (_ = m);
          let E = g.resolveDir ? `${g.resolveDir}/` : g.importer ? g.importer : `${e}/`, w = p(E);
          if (!w)
            return;
          let P = null, S;
          try {
            P = w.resolveRequest(g.path, E, {
              conditions: _,
              considerBuiltins: d,
              extensions: i
            });
          } catch (M) {
            S = M;
          }
          let T = [w.resolveRequest("pnpapi", null)];
          if (P) {
            let M = w.findPackageLocator(P);
            if (M) {
              let V = w.getPackageInformation(M);
              V?.linkType === "SOFT" && T.push((y = (h = w.resolveVirtual) === null || h === void 0 ? void 0 : h.call(w, P)) !== null && y !==
              void 0 ? y : P);
            }
          }
          return a(g, { resolvedPath: P, error: S, watchFiles: T });
        }), n.onLoad !== null && n.onLoad({ filter: t }, r);
      }
    };
  }
  o(Kt, "pnpPlugin");
  U.pnpPlugin = Kt;
});

// ../node_modules/esbuild-plugin-alias/index.js
var We = R((La, $e) => {
  $e.exports = (e) => {
    let i = Object.keys(e), t = new RegExp(`^(${i.map((a) => Zt(a)).join("|")})$`);
    return {
      name: "alias",
      setup(a) {
        a.onResolve({ filter: t }, (r) => ({
          path: e[r.path]
        }));
      }
    };
  };
  function Zt(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  o(Zt, "escapeRegExp");
});

// ../node_modules/totalist/sync/index.mjs
var Be = {};
z(Be, {
  totalist: () => He
});
import { join as ee, resolve as Yt } from "path";
import { readdirSync as Qt, statSync as ei } from "fs";
function He(e, i, t = "") {
  e = Yt(".", e);
  let a = Qt(e), r = 0, n, s;
  for (; r < a.length; r++)
    n = ee(e, a[r]), s = ei(n), s.isDirectory() ? He(n, i, ee(t, a[r])) : i(ee(t, a[r]), n, s);
}
var Je = q(() => {
  o(He, "totalist");
});

// ../node_modules/@polka/url/build.mjs
var Ge = {};
z(Ge, {
  parse: () => ti
});
import * as Ue from "node:querystring";
function ti(e) {
  let i = e.url;
  if (i == null) return;
  let t = e._parsedUrl;
  if (t && t.raw === i) return t;
  let a = i, r = "", n;
  if (i.length > 1) {
    let s = i.indexOf("?", 1);
    s !== -1 && (r = i.substring(s), a = i.substring(0, s), r.length > 1 && (n = Ue.parse(r.substring(1))));
  }
  return e._parsedUrl = { pathname: a, search: r, query: n, raw: i };
}
var Ve = q(() => {
  o(ti, "parse");
});

// ../node_modules/mrmime/index.mjs
var Ke = {};
z(Ke, {
  lookup: () => ii,
  mimes: () => Xe
});
function ii(e) {
  let i = ("" + e).trim().toLowerCase(), t = i.lastIndexOf(".");
  return Xe[~t ? i.substring(++t) : i];
}
var Xe, Ze = q(() => {
  Xe = {
    "3g2": "video/3gpp2",
    "3gp": "video/3gpp",
    "3gpp": "video/3gpp",
    "3mf": "model/3mf",
    aac: "audio/aac",
    ac: "application/pkix-attr-cert",
    adp: "audio/adpcm",
    adts: "audio/aac",
    ai: "application/postscript",
    aml: "application/automationml-aml+xml",
    amlx: "application/automationml-amlx+zip",
    amr: "audio/amr",
    apng: "image/apng",
    appcache: "text/cache-manifest",
    appinstaller: "application/appinstaller",
    appx: "application/appx",
    appxbundle: "application/appxbundle",
    asc: "application/pgp-keys",
    atom: "application/atom+xml",
    atomcat: "application/atomcat+xml",
    atomdeleted: "application/atomdeleted+xml",
    atomsvc: "application/atomsvc+xml",
    au: "audio/basic",
    avci: "image/avci",
    avcs: "image/avcs",
    avif: "image/avif",
    aw: "application/applixware",
    bdoc: "application/bdoc",
    bin: "application/octet-stream",
    bmp: "image/bmp",
    bpk: "application/octet-stream",
    btf: "image/prs.btif",
    btif: "image/prs.btif",
    buffer: "application/octet-stream",
    ccxml: "application/ccxml+xml",
    cdfx: "application/cdfx+xml",
    cdmia: "application/cdmi-capability",
    cdmic: "application/cdmi-container",
    cdmid: "application/cdmi-domain",
    cdmio: "application/cdmi-object",
    cdmiq: "application/cdmi-queue",
    cer: "application/pkix-cert",
    cgm: "image/cgm",
    cjs: "application/node",
    class: "application/java-vm",
    coffee: "text/coffeescript",
    conf: "text/plain",
    cpl: "application/cpl+xml",
    cpt: "application/mac-compactpro",
    crl: "application/pkix-crl",
    css: "text/css",
    csv: "text/csv",
    cu: "application/cu-seeme",
    cwl: "application/cwl",
    cww: "application/prs.cww",
    davmount: "application/davmount+xml",
    dbk: "application/docbook+xml",
    deb: "application/octet-stream",
    def: "text/plain",
    deploy: "application/octet-stream",
    dib: "image/bmp",
    "disposition-notification": "message/disposition-notification",
    dist: "application/octet-stream",
    distz: "application/octet-stream",
    dll: "application/octet-stream",
    dmg: "application/octet-stream",
    dms: "application/octet-stream",
    doc: "application/msword",
    dot: "application/msword",
    dpx: "image/dpx",
    drle: "image/dicom-rle",
    dsc: "text/prs.lines.tag",
    dssc: "application/dssc+der",
    dtd: "application/xml-dtd",
    dump: "application/octet-stream",
    dwd: "application/atsc-dwd+xml",
    ear: "application/java-archive",
    ecma: "application/ecmascript",
    elc: "application/octet-stream",
    emf: "image/emf",
    eml: "message/rfc822",
    emma: "application/emma+xml",
    emotionml: "application/emotionml+xml",
    eps: "application/postscript",
    epub: "application/epub+zip",
    exe: "application/octet-stream",
    exi: "application/exi",
    exp: "application/express",
    exr: "image/aces",
    ez: "application/andrew-inset",
    fdf: "application/fdf",
    fdt: "application/fdt+xml",
    fits: "image/fits",
    g3: "image/g3fax",
    gbr: "application/rpki-ghostbusters",
    geojson: "application/geo+json",
    gif: "image/gif",
    glb: "model/gltf-binary",
    gltf: "model/gltf+json",
    gml: "application/gml+xml",
    gpx: "application/gpx+xml",
    gram: "application/srgs",
    grxml: "application/srgs+xml",
    gxf: "application/gxf",
    gz: "application/gzip",
    h261: "video/h261",
    h263: "video/h263",
    h264: "video/h264",
    heic: "image/heic",
    heics: "image/heic-sequence",
    heif: "image/heif",
    heifs: "image/heif-sequence",
    hej2: "image/hej2k",
    held: "application/atsc-held+xml",
    hjson: "application/hjson",
    hlp: "application/winhlp",
    hqx: "application/mac-binhex40",
    hsj2: "image/hsj2",
    htm: "text/html",
    html: "text/html",
    ics: "text/calendar",
    ief: "image/ief",
    ifb: "text/calendar",
    iges: "model/iges",
    igs: "model/iges",
    img: "application/octet-stream",
    in: "text/plain",
    ini: "text/plain",
    ink: "application/inkml+xml",
    inkml: "application/inkml+xml",
    ipfix: "application/ipfix",
    iso: "application/octet-stream",
    its: "application/its+xml",
    jade: "text/jade",
    jar: "application/java-archive",
    jhc: "image/jphc",
    jls: "image/jls",
    jp2: "image/jp2",
    jpe: "image/jpeg",
    jpeg: "image/jpeg",
    jpf: "image/jpx",
    jpg: "image/jpeg",
    jpg2: "image/jp2",
    jpgm: "image/jpm",
    jpgv: "video/jpeg",
    jph: "image/jph",
    jpm: "image/jpm",
    jpx: "image/jpx",
    js: "text/javascript",
    json: "application/json",
    json5: "application/json5",
    jsonld: "application/ld+json",
    jsonml: "application/jsonml+json",
    jsx: "text/jsx",
    jt: "model/jt",
    jxl: "image/jxl",
    jxr: "image/jxr",
    jxra: "image/jxra",
    jxrs: "image/jxrs",
    jxs: "image/jxs",
    jxsc: "image/jxsc",
    jxsi: "image/jxsi",
    jxss: "image/jxss",
    kar: "audio/midi",
    ktx: "image/ktx",
    ktx2: "image/ktx2",
    less: "text/less",
    lgr: "application/lgr+xml",
    list: "text/plain",
    litcoffee: "text/coffeescript",
    log: "text/plain",
    lostxml: "application/lost+xml",
    lrf: "application/octet-stream",
    m1v: "video/mpeg",
    m21: "application/mp21",
    m2a: "audio/mpeg",
    m2t: "video/mp2t",
    m2ts: "video/mp2t",
    m2v: "video/mpeg",
    m3a: "audio/mpeg",
    m4a: "audio/mp4",
    m4p: "application/mp4",
    m4s: "video/iso.segment",
    ma: "application/mathematica",
    mads: "application/mads+xml",
    maei: "application/mmt-aei+xml",
    man: "text/troff",
    manifest: "text/cache-manifest",
    map: "application/json",
    mar: "application/octet-stream",
    markdown: "text/markdown",
    mathml: "application/mathml+xml",
    mb: "application/mathematica",
    mbox: "application/mbox",
    md: "text/markdown",
    mdx: "text/mdx",
    me: "text/troff",
    mesh: "model/mesh",
    meta4: "application/metalink4+xml",
    metalink: "application/metalink+xml",
    mets: "application/mets+xml",
    mft: "application/rpki-manifest",
    mid: "audio/midi",
    midi: "audio/midi",
    mime: "message/rfc822",
    mj2: "video/mj2",
    mjp2: "video/mj2",
    mjs: "text/javascript",
    mml: "text/mathml",
    mods: "application/mods+xml",
    mov: "video/quicktime",
    mp2: "audio/mpeg",
    mp21: "application/mp21",
    mp2a: "audio/mpeg",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mp4a: "audio/mp4",
    mp4s: "application/mp4",
    mp4v: "video/mp4",
    mpd: "application/dash+xml",
    mpe: "video/mpeg",
    mpeg: "video/mpeg",
    mpf: "application/media-policy-dataset+xml",
    mpg: "video/mpeg",
    mpg4: "video/mp4",
    mpga: "audio/mpeg",
    mpp: "application/dash-patch+xml",
    mrc: "application/marc",
    mrcx: "application/marcxml+xml",
    ms: "text/troff",
    mscml: "application/mediaservercontrol+xml",
    msh: "model/mesh",
    msi: "application/octet-stream",
    msix: "application/msix",
    msixbundle: "application/msixbundle",
    msm: "application/octet-stream",
    msp: "application/octet-stream",
    mtl: "model/mtl",
    mts: "video/mp2t",
    musd: "application/mmt-usd+xml",
    mxf: "application/mxf",
    mxmf: "audio/mobile-xmf",
    mxml: "application/xv+xml",
    n3: "text/n3",
    nb: "application/mathematica",
    nq: "application/n-quads",
    nt: "application/n-triples",
    obj: "model/obj",
    oda: "application/oda",
    oga: "audio/ogg",
    ogg: "audio/ogg",
    ogv: "video/ogg",
    ogx: "application/ogg",
    omdoc: "application/omdoc+xml",
    onepkg: "application/onenote",
    onetmp: "application/onenote",
    onetoc: "application/onenote",
    onetoc2: "application/onenote",
    opf: "application/oebps-package+xml",
    opus: "audio/ogg",
    otf: "font/otf",
    owl: "application/rdf+xml",
    oxps: "application/oxps",
    p10: "application/pkcs10",
    p7c: "application/pkcs7-mime",
    p7m: "application/pkcs7-mime",
    p7s: "application/pkcs7-signature",
    p8: "application/pkcs8",
    pdf: "application/pdf",
    pfr: "application/font-tdpfr",
    pgp: "application/pgp-encrypted",
    pkg: "application/octet-stream",
    pki: "application/pkixcmp",
    pkipath: "application/pkix-pkipath",
    pls: "application/pls+xml",
    png: "image/png",
    prc: "model/prc",
    prf: "application/pics-rules",
    provx: "application/provenance+xml",
    ps: "application/postscript",
    pskcxml: "application/pskc+xml",
    pti: "image/prs.pti",
    qt: "video/quicktime",
    raml: "application/raml+yaml",
    rapd: "application/route-apd+xml",
    rdf: "application/rdf+xml",
    relo: "application/p2p-overlay+xml",
    rif: "application/reginfo+xml",
    rl: "application/resource-lists+xml",
    rld: "application/resource-lists-diff+xml",
    rmi: "audio/midi",
    rnc: "application/relax-ng-compact-syntax",
    rng: "application/xml",
    roa: "application/rpki-roa",
    roff: "text/troff",
    rq: "application/sparql-query",
    rs: "application/rls-services+xml",
    rsat: "application/atsc-rsat+xml",
    rsd: "application/rsd+xml",
    rsheet: "application/urc-ressheet+xml",
    rss: "application/rss+xml",
    rtf: "text/rtf",
    rtx: "text/richtext",
    rusd: "application/route-usd+xml",
    s3m: "audio/s3m",
    sbml: "application/sbml+xml",
    scq: "application/scvp-cv-request",
    scs: "application/scvp-cv-response",
    sdp: "application/sdp",
    senmlx: "application/senml+xml",
    sensmlx: "application/sensml+xml",
    ser: "application/java-serialized-object",
    setpay: "application/set-payment-initiation",
    setreg: "application/set-registration-initiation",
    sgi: "image/sgi",
    sgm: "text/sgml",
    sgml: "text/sgml",
    shex: "text/shex",
    shf: "application/shf+xml",
    shtml: "text/html",
    sieve: "application/sieve",
    sig: "application/pgp-signature",
    sil: "audio/silk",
    silo: "model/mesh",
    siv: "application/sieve",
    slim: "text/slim",
    slm: "text/slim",
    sls: "application/route-s-tsid+xml",
    smi: "application/smil+xml",
    smil: "application/smil+xml",
    snd: "audio/basic",
    so: "application/octet-stream",
    spdx: "text/spdx",
    spp: "application/scvp-vp-response",
    spq: "application/scvp-vp-request",
    spx: "audio/ogg",
    sql: "application/sql",
    sru: "application/sru+xml",
    srx: "application/sparql-results+xml",
    ssdl: "application/ssdl+xml",
    ssml: "application/ssml+xml",
    stk: "application/hyperstudio",
    stl: "model/stl",
    stpx: "model/step+xml",
    stpxz: "model/step-xml+zip",
    stpz: "model/step+zip",
    styl: "text/stylus",
    stylus: "text/stylus",
    svg: "image/svg+xml",
    svgz: "image/svg+xml",
    swidtag: "application/swid+xml",
    t: "text/troff",
    t38: "image/t38",
    td: "application/urc-targetdesc+xml",
    tei: "application/tei+xml",
    teicorpus: "application/tei+xml",
    text: "text/plain",
    tfi: "application/thraud+xml",
    tfx: "image/tiff-fx",
    tif: "image/tiff",
    tiff: "image/tiff",
    toml: "application/toml",
    tr: "text/troff",
    trig: "application/trig",
    ts: "video/mp2t",
    tsd: "application/timestamped-data",
    tsv: "text/tab-separated-values",
    ttc: "font/collection",
    ttf: "font/ttf",
    ttl: "text/turtle",
    ttml: "application/ttml+xml",
    txt: "text/plain",
    u3d: "model/u3d",
    u8dsn: "message/global-delivery-status",
    u8hdr: "message/global-headers",
    u8mdn: "message/global-disposition-notification",
    u8msg: "message/global",
    ubj: "application/ubjson",
    uri: "text/uri-list",
    uris: "text/uri-list",
    urls: "text/uri-list",
    vcard: "text/vcard",
    vrml: "model/vrml",
    vtt: "text/vtt",
    vxml: "application/voicexml+xml",
    war: "application/java-archive",
    wasm: "application/wasm",
    wav: "audio/wav",
    weba: "audio/webm",
    webm: "video/webm",
    webmanifest: "application/manifest+json",
    webp: "image/webp",
    wgsl: "text/wgsl",
    wgt: "application/widget",
    wif: "application/watcherinfo+xml",
    wmf: "image/wmf",
    woff: "font/woff",
    woff2: "font/woff2",
    wrl: "model/vrml",
    wsdl: "application/wsdl+xml",
    wspolicy: "application/wspolicy+xml",
    x3d: "model/x3d+xml",
    x3db: "model/x3d+fastinfoset",
    x3dbz: "model/x3d+binary",
    x3dv: "model/x3d-vrml",
    x3dvz: "model/x3d+vrml",
    x3dz: "model/x3d+xml",
    xaml: "application/xaml+xml",
    xav: "application/xcap-att+xml",
    xca: "application/xcap-caps+xml",
    xcs: "application/calendar+xml",
    xdf: "application/xcap-diff+xml",
    xdssc: "application/dssc+xml",
    xel: "application/xcap-el+xml",
    xenc: "application/xenc+xml",
    xer: "application/patch-ops-error+xml",
    xfdf: "application/xfdf",
    xht: "application/xhtml+xml",
    xhtml: "application/xhtml+xml",
    xhvml: "application/xv+xml",
    xlf: "application/xliff+xml",
    xm: "audio/xm",
    xml: "text/xml",
    xns: "application/xcap-ns+xml",
    xop: "application/xop+xml",
    xpl: "application/xproc+xml",
    xsd: "application/xml",
    xsf: "application/prs.xsf+xml",
    xsl: "application/xml",
    xslt: "application/xml",
    xspf: "application/xspf+xml",
    xvm: "application/xv+xml",
    xvml: "application/xv+xml",
    yaml: "text/yaml",
    yang: "application/yang",
    yin: "application/yin+xml",
    yml: "text/yaml",
    zip: "application/zip"
  };
  o(ii, "lookup");
});

// ../node_modules/sirv/build.js
var tt = R((qa, et) => {
  var te = O("fs"), { join: ai, normalize: ri, resolve: ni } = O("path"), { totalist: oi } = (Je(), W(Be)), { parse: si } = (Ve(), W(Ge)), {
  lookup: li } = (Ze(), W(Ke)), ci = /* @__PURE__ */ o(() => {
  }, "noop");
  function pi(e, i) {
    for (let t = 0; t < i.length; t++)
      if (i[t].test(e)) return !0;
  }
  o(pi, "isMatch");
  function Ye(e, i) {
    let t = 0, a, r = e.length - 1;
    e.charCodeAt(r) === 47 && (e = e.substring(0, r));
    let n = [], s = `${e}/index`;
    for (; t < i.length; t++)
      a = i[t] ? `.${i[t]}` : "", e && n.push(e + a), n.push(s + a);
    return n;
  }
  o(Ye, "toAssume");
  function mi(e, i, t) {
    let a = 0, r, n = Ye(i, t);
    for (; a < n.length; a++)
      if (r = e[n[a]]) return r;
  }
  o(mi, "viaCache");
  function ui(e, i, t, a) {
    let r = 0, n = Ye(t, a), s, c, p, l;
    for (; r < n.length; r++)
      if (s = ri(ai(e, p = n[r])), s.startsWith(e) && te.existsSync(s)) {
        if (c = te.statSync(s), c.isDirectory()) continue;
        return l = Qe(p, c, i), l["Cache-Control"] = i ? "no-cache" : "no-store", { abs: s, stats: c, headers: l };
      }
  }
  o(ui, "viaLocal");
  function fi(e, i) {
    return i.statusCode = 404, i.end();
  }
  o(fi, "is404");
  function di(e, i, t, a, r) {
    let n = 200, s, c = {};
    r = { ...r };
    for (let p in r)
      s = i.getHeader(p), s && (r[p] = s);
    if ((s = i.getHeader("content-type")) && (r["Content-Type"] = s), e.headers.range) {
      n = 206;
      let [p, l] = e.headers.range.replace("bytes=", "").split("-"), u = c.end = parseInt(l, 10) || a.size - 1, d = c.start = parseInt(p, 10) ||
      0;
      if (u >= a.size && (u = a.size - 1), d >= a.size)
        return i.setHeader("Content-Range", `bytes */${a.size}`), i.statusCode = 416, i.end();
      r["Content-Range"] = `bytes ${d}-${u}/${a.size}`, r["Content-Length"] = u - d + 1, r["Accept-Ranges"] = "bytes";
    }
    i.writeHead(n, r), te.createReadStream(t, c).pipe(i);
  }
  o(di, "send");
  var gi = {
    ".br": "br",
    ".gz": "gzip"
  };
  function Qe(e, i, t) {
    let a = gi[e.slice(-3)], r = li(e.slice(0, a && -3)) || "";
    r === "text/html" && (r += ";charset=utf-8");
    let n = {
      "Content-Length": i.size,
      "Content-Type": r,
      "Last-Modified": i.mtime.toUTCString()
    };
    return a && (n["Content-Encoding"] = a), t && (n.ETag = `W/"${i.size}-${i.mtime.getTime()}"`), n;
  }
  o(Qe, "toHeaders");
  et.exports = function(e, i = {}) {
    e = ni(e || ".");
    let t = i.onNoMatch || fi, a = i.setHeaders || ci, r = i.extensions || ["html", "htm"], n = i.gzip && r.map((m) => `${m}.gz`).concat("gz"),
    s = i.brotli && r.map((m) => `${m}.br`).concat("br"), c = {}, p = "/", l = !!i.etag, u = !!i.single;
    if (typeof i.single == "string") {
      let m = i.single.lastIndexOf(".");
      p += ~m ? i.single.substring(0, m) : i.single;
    }
    let d = [];
    i.ignores !== !1 && (d.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/), i.dotfiles ? d.push(/\/\.\w/) : d.push(/\/\.well-known/), [].concat(i.
    ignores || []).forEach((m) => {
      d.push(new RegExp(m, "i"));
    }));
    let f = i.maxAge != null && `public,max-age=${i.maxAge}`;
    f && i.immutable ? f += ",immutable" : f && i.maxAge === 0 && (f += ",must-revalidate"), i.dev || oi(e, (m, g, h) => {
      if (!/\.well-known[\\+\/]/.test(m)) {
        if (!i.dotfiles && /(^\.|[\\+|\/+]\.)/.test(m)) return;
      }
      let y = Qe(m, h, l);
      f && (y["Cache-Control"] = f), c["/" + m.normalize().replace(/\\+/g, "/")] = { abs: g, stats: h, headers: y };
    });
    let v = i.dev ? ui.bind(0, e, l) : mi.bind(0, c);
    return function(m, g, h) {
      let y = [""], _ = si(m).pathname, E = m.headers["accept-encoding"] || "";
      if (n && E.includes("gzip") && y.unshift(...n), s && /(br|brotli)/i.test(E) && y.unshift(...s), y.push(...r), _.indexOf("%") !== -1)
        try {
          _ = decodeURI(_);
        } catch {
        }
      let w = v(_, y) || u && !pi(_, d) && v(p, y);
      if (!w) return h ? h() : t(m, g);
      if (l && m.headers["if-none-match"] === w.headers.ETag)
        return g.writeHead(304), g.end();
      (n || s) && g.setHeader("Vary", "Accept-Encoding"), a(g, _, w.stats), di(m, g, w.abs, w.stats, w.headers);
    };
  };
});

// ../node_modules/ejs/lib/utils.js
var at = R((k) => {
  "use strict";
  var xi = /[|\\{}()[\]^$+*?.]/g, hi = Object.prototype.hasOwnProperty, ie = /* @__PURE__ */ o(function(e, i) {
    return hi.apply(e, [i]);
  }, "hasOwn");
  k.escapeRegExpChars = function(e) {
    return e ? String(e).replace(xi, "\\$&") : "";
  };
  var yi = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&#34;",
    "'": "&#39;"
  }, vi = /[&<>'"]/g;
  function wi(e) {
    return yi[e] || e;
  }
  o(wi, "encode_char");
  var bi = `var _ENCODE_HTML_RULES = {
      "&": "&amp;"
    , "<": "&lt;"
    , ">": "&gt;"
    , '"': "&#34;"
    , "'": "&#39;"
    }
  , _MATCH_HTML = /[&<>'"]/g;
function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};
`;
  k.escapeXML = function(e) {
    return e == null ? "" : String(e).replace(vi, wi);
  };
  function it() {
    return Function.prototype.toString.call(this) + `;
` + bi;
  }
  o(it, "escapeXMLToString");
  try {
    typeof Object.defineProperty == "function" ? Object.defineProperty(k.escapeXML, "toString", { value: it }) : k.escapeXML.toString = it;
  } catch {
    console.warn("Unable to set escapeXML.toString (is the Function prototype frozen?)");
  }
  k.shallowCopy = function(e, i) {
    if (i = i || {}, e != null)
      for (var t in i)
        ie(i, t) && (t === "__proto__" || t === "constructor" || (e[t] = i[t]));
    return e;
  };
  k.shallowCopyFromList = function(e, i, t) {
    if (t = t || [], i = i || {}, e != null)
      for (var a = 0; a < t.length; a++) {
        var r = t[a];
        if (typeof i[r] < "u") {
          if (!ie(i, r) || r === "__proto__" || r === "constructor")
            continue;
          e[r] = i[r];
        }
      }
    return e;
  };
  k.cache = {
    _data: {},
    set: /* @__PURE__ */ o(function(e, i) {
      this._data[e] = i;
    }, "set"),
    get: /* @__PURE__ */ o(function(e) {
      return this._data[e];
    }, "get"),
    remove: /* @__PURE__ */ o(function(e) {
      delete this._data[e];
    }, "remove"),
    reset: /* @__PURE__ */ o(function() {
      this._data = {};
    }, "reset")
  };
  k.hyphenToCamel = function(e) {
    return e.replace(/-[a-z]/g, function(i) {
      return i[1].toUpperCase();
    });
  };
  k.createNullProtoObjWherePossible = function() {
    return typeof Object.create == "function" ? function() {
      return /* @__PURE__ */ Object.create(null);
    } : { __proto__: null } instanceof Object ? function() {
      return {};
    } : function() {
      return { __proto__: null };
    };
  }();
  k.hasOwnOnlyObject = function(e) {
    var i = k.createNullProtoObjWherePossible();
    for (var t in e)
      ie(e, t) && (i[t] = e[t]);
    return i;
  };
});

// ../node_modules/ejs/package.json
var rt = R((Ha, _i) => {
  _i.exports = {
    name: "ejs",
    description: "Embedded JavaScript templates",
    keywords: [
      "template",
      "engine",
      "ejs"
    ],
    version: "3.1.10",
    author: "Matthew Eernisse <mde@fleegix.org> (http://fleegix.org)",
    license: "Apache-2.0",
    bin: {
      ejs: "./bin/cli.js"
    },
    main: "./lib/ejs.js",
    jsdelivr: "ejs.min.js",
    unpkg: "ejs.min.js",
    repository: {
      type: "git",
      url: "git://github.com/mde/ejs.git"
    },
    bugs: "https://github.com/mde/ejs/issues",
    homepage: "https://github.com/mde/ejs",
    dependencies: {
      jake: "^10.8.5"
    },
    devDependencies: {
      browserify: "^16.5.1",
      eslint: "^6.8.0",
      "git-directory-deploy": "^1.5.1",
      jsdoc: "^4.0.2",
      "lru-cache": "^4.0.1",
      mocha: "^10.2.0",
      "uglify-js": "^3.3.16"
    },
    engines: {
      node: ">=0.10.0"
    },
    scripts: {
      test: "npx jake test"
    }
  };
});

// ../node_modules/ejs/lib/ejs.js
var ft = R((x) => {
  "use strict";
  var re = O("fs"), N = O("path"), b = at(), nt = !1, ji = rt().version, Oi = "<", Ei = ">", Pi = "%", mt = "locals", Si = "ejs", ki = "(<%%\
|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)", ut = [
    "delimiter",
    "scope",
    "context",
    "debug",
    "compileDebug",
    "client",
    "_with",
    "rmWhitespace",
    "strict",
    "filename",
    "async"
  ], Ti = ut.concat("cache"), ot = /^\uFEFF/, ae = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  x.cache = b.cache;
  x.fileLoader = re.readFileSync;
  x.localsName = mt;
  x.promiseImpl = new Function("return this;")().Promise;
  x.resolveInclude = function(e, i, t) {
    var a = N.dirname, r = N.extname, n = N.resolve, s = n(t ? i : a(i), e), c = r(e);
    return c || (s += ".ejs"), s;
  };
  function st(e, i) {
    var t;
    if (i.some(function(a) {
      return t = x.resolveInclude(e, a, !0), re.existsSync(t);
    }))
      return t;
  }
  o(st, "resolvePaths");
  function Ri(e, i) {
    var t, a, r = i.views, n = /^[A-Za-z]+:\\|^\//.exec(e);
    if (n && n.length)
      e = e.replace(/^\/*/, ""), Array.isArray(i.root) ? t = st(e, i.root) : t = x.resolveInclude(e, i.root || "/", !0);
    else if (i.filename && (a = x.resolveInclude(e, i.filename), re.existsSync(a) && (t = a)), !t && Array.isArray(r) && (t = st(e, r)), !t &&
    typeof i.includer != "function")
      throw new Error('Could not find the include file "' + i.escapeFunction(e) + '"');
    return t;
  }
  o(Ri, "getIncludePath");
  function D(e, i) {
    var t, a = e.filename, r = arguments.length > 1;
    if (e.cache) {
      if (!a)
        throw new Error("cache option requires a filename");
      if (t = x.cache.get(a), t)
        return t;
      r || (i = lt(a).toString().replace(ot, ""));
    } else if (!r) {
      if (!a)
        throw new Error("Internal EJS error: no file name or template provided");
      i = lt(a).toString().replace(ot, "");
    }
    return t = x.compile(i, e), e.cache && x.cache.set(a, t), t;
  }
  o(D, "handleCache");
  function Fi(e, i, t) {
    var a;
    if (t) {
      try {
        a = D(e)(i);
      } catch (r) {
        return t(r);
      }
      t(null, a);
    } else {
      if (typeof x.promiseImpl == "function")
        return new x.promiseImpl(function(r, n) {
          try {
            a = D(e)(i), r(a);
          } catch (s) {
            n(s);
          }
        });
      throw new Error("Please provide a callback function");
    }
  }
  o(Fi, "tryHandleCache");
  function lt(e) {
    return x.fileLoader(e);
  }
  o(lt, "fileLoader");
  function Li(e, i) {
    var t = b.shallowCopy(b.createNullProtoObjWherePossible(), i);
    if (t.filename = Ri(e, t), typeof i.includer == "function") {
      var a = i.includer(e, t.filename);
      if (a && (a.filename && (t.filename = a.filename), a.template))
        return D(t, a.template);
    }
    return D(t);
  }
  o(Li, "includeFile");
  function ct(e, i, t, a, r) {
    var n = i.split(`
`), s = Math.max(a - 3, 0), c = Math.min(n.length, a + 3), p = r(t), l = n.slice(s, c).map(function(u, d) {
      var f = d + s + 1;
      return (f == a ? " >> " : "    ") + f + "| " + u;
    }).join(`
`);
    throw e.path = p, e.message = (p || "ejs") + ":" + a + `
` + l + `

` + e.message, e;
  }
  o(ct, "rethrow");
  function pt(e) {
    return e.replace(/;(\s*$)/, "$1");
  }
  o(pt, "stripSemi");
  x.compile = /* @__PURE__ */ o(function(i, t) {
    var a;
    return t && t.scope && (nt || (console.warn("`scope` option is deprecated and will be removed in EJS 3"), nt = !0), t.context || (t.context =
    t.scope), delete t.scope), a = new j(i, t), a.compile();
  }, "compile");
  x.render = function(e, i, t) {
    var a = i || b.createNullProtoObjWherePossible(), r = t || b.createNullProtoObjWherePossible();
    return arguments.length == 2 && b.shallowCopyFromList(r, a, ut), D(r, e)(a);
  };
  x.renderFile = function() {
    var e = Array.prototype.slice.call(arguments), i = e.shift(), t, a = { filename: i }, r, n;
    return typeof arguments[arguments.length - 1] == "function" && (t = e.pop()), e.length ? (r = e.shift(), e.length ? b.shallowCopy(a, e.pop()) :
    (r.settings && (r.settings.views && (a.views = r.settings.views), r.settings["view cache"] && (a.cache = !0), n = r.settings["view optio\
ns"], n && b.shallowCopy(a, n)), b.shallowCopyFromList(a, r, Ti)), a.filename = i) : r = b.createNullProtoObjWherePossible(), Fi(a, r, t);
  };
  x.Template = j;
  x.clearCache = function() {
    x.cache.reset();
  };
  function j(e, i) {
    var t = b.hasOwnOnlyObject(i), a = b.createNullProtoObjWherePossible();
    this.templateText = e, this.mode = null, this.truncate = !1, this.currentLine = 1, this.source = "", a.client = t.client || !1, a.escapeFunction =
    t.escape || t.escapeFunction || b.escapeXML, a.compileDebug = t.compileDebug !== !1, a.debug = !!t.debug, a.filename = t.filename, a.openDelimiter =
    t.openDelimiter || x.openDelimiter || Oi, a.closeDelimiter = t.closeDelimiter || x.closeDelimiter || Ei, a.delimiter = t.delimiter || x.
    delimiter || Pi, a.strict = t.strict || !1, a.context = t.context, a.cache = t.cache || !1, a.rmWhitespace = t.rmWhitespace, a.root = t.
    root, a.includer = t.includer, a.outputFunctionName = t.outputFunctionName, a.localsName = t.localsName || x.localsName || mt, a.views =
    t.views, a.async = t.async, a.destructuredLocals = t.destructuredLocals, a.legacyInclude = typeof t.legacyInclude < "u" ? !!t.legacyInclude :
    !0, a.strict ? a._with = !1 : a._with = typeof t._with < "u" ? t._with : !0, this.opts = a, this.regex = this.createRegex();
  }
  o(j, "Template");
  j.modes = {
    EVAL: "eval",
    ESCAPED: "escaped",
    RAW: "raw",
    COMMENT: "comment",
    LITERAL: "literal"
  };
  j.prototype = {
    createRegex: /* @__PURE__ */ o(function() {
      var e = ki, i = b.escapeRegExpChars(this.opts.delimiter), t = b.escapeRegExpChars(this.opts.openDelimiter), a = b.escapeRegExpChars(this.
      opts.closeDelimiter);
      return e = e.replace(/%/g, i).replace(/</g, t).replace(/>/g, a), new RegExp(e);
    }, "createRegex"),
    compile: /* @__PURE__ */ o(function() {
      var e, i, t = this.opts, a = "", r = "", n = t.escapeFunction, s, c = t.filename ? JSON.stringify(t.filename) : "undefined";
      if (!this.source) {
        if (this.generateSource(), a += `  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
`, t.outputFunctionName) {
          if (!ae.test(t.outputFunctionName))
            throw new Error("outputFunctionName is not a valid JS identifier.");
          a += "  var " + t.outputFunctionName + ` = __append;
`;
        }
        if (t.localsName && !ae.test(t.localsName))
          throw new Error("localsName is not a valid JS identifier.");
        if (t.destructuredLocals && t.destructuredLocals.length) {
          for (var p = "  var __locals = (" + t.localsName + ` || {}),
`, l = 0; l < t.destructuredLocals.length; l++) {
            var u = t.destructuredLocals[l];
            if (!ae.test(u))
              throw new Error("destructuredLocals[" + l + "] is not a valid JS identifier.");
            l > 0 && (p += `,
  `), p += u + " = __locals." + u;
          }
          a += p + `;
`;
        }
        t._with !== !1 && (a += "  with (" + t.localsName + ` || {}) {
`, r += `  }
`), r += `  return __output;
`, this.source = a + this.source + r;
      }
      t.compileDebug ? e = `var __line = 1
  , __lines = ` + JSON.stringify(this.templateText) + `
  , __filename = ` + c + `;
try {
` + this.source + `} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}
` : e = this.source, t.client && (e = "escapeFn = escapeFn || " + n.toString() + `;
` + e, t.compileDebug && (e = "rethrow = rethrow || " + ct.toString() + `;
` + e)), t.strict && (e = `"use strict";
` + e), t.debug && console.log(e), t.compileDebug && t.filename && (e = e + `
//# sourceURL=` + c + `
`);
      try {
        if (t.async)
          try {
            s = new Function("return (async function(){}).constructor;")();
          } catch (m) {
            throw m instanceof SyntaxError ? new Error("This environment does not support async/await") : m;
          }
        else
          s = Function;
        i = new s(t.localsName + ", escapeFn, include, rethrow", e);
      } catch (m) {
        throw m instanceof SyntaxError && (t.filename && (m.message += " in " + t.filename), m.message += ` while compiling ejs

`, m.message += `If the above error is not helpful, you may want to try EJS-Lint:
`, m.message += "https://github.com/RyanZim/EJS-Lint", t.async || (m.message += `
`, m.message += "Or, if you meant to create an async function, pass `async: true` as an option.")), m;
      }
      var d = t.client ? i : /* @__PURE__ */ o(function(g) {
        var h = /* @__PURE__ */ o(function(y, _) {
          var E = b.shallowCopy(b.createNullProtoObjWherePossible(), g);
          return _ && (E = b.shallowCopy(E, _)), Li(y, t)(E);
        }, "include");
        return i.apply(
          t.context,
          [g || b.createNullProtoObjWherePossible(), n, h, ct]
        );
      }, "anonymous");
      if (t.filename && typeof Object.defineProperty == "function") {
        var f = t.filename, v = N.basename(f, N.extname(f));
        try {
          Object.defineProperty(d, "name", {
            value: v,
            writable: !1,
            enumerable: !1,
            configurable: !0
          });
        } catch {
        }
      }
      return d;
    }, "compile"),
    generateSource: /* @__PURE__ */ o(function() {
      var e = this.opts;
      e.rmWhitespace && (this.templateText = this.templateText.replace(/[\r\n]+/g, `
`).replace(/^\s+|\s+$/gm, "")), this.templateText = this.templateText.replace(/[ \t]*<%_/gm, "<%_").replace(/_%>[ \t]*/gm, "_%>");
      var i = this, t = this.parseTemplateText(), a = this.opts.delimiter, r = this.opts.openDelimiter, n = this.opts.closeDelimiter;
      t && t.length && t.forEach(function(s, c) {
        var p;
        if (s.indexOf(r + a) === 0 && s.indexOf(r + a + a) !== 0 && (p = t[c + 2], !(p == a + n || p == "-" + a + n || p == "_" + a + n)))
          throw new Error('Could not find matching close tag for "' + s + '".');
        i.scanLine(s);
      });
    }, "generateSource"),
    parseTemplateText: /* @__PURE__ */ o(function() {
      for (var e = this.templateText, i = this.regex, t = i.exec(e), a = [], r; t; )
        r = t.index, r !== 0 && (a.push(e.substring(0, r)), e = e.slice(r)), a.push(t[0]), e = e.slice(t[0].length), t = i.exec(e);
      return e && a.push(e), a;
    }, "parseTemplateText"),
    _addOutput: /* @__PURE__ */ o(function(e) {
      if (this.truncate && (e = e.replace(/^(?:\r\n|\r|\n)/, ""), this.truncate = !1), !e)
        return e;
      e = e.replace(/\\/g, "\\\\"), e = e.replace(/\n/g, "\\n"), e = e.replace(/\r/g, "\\r"), e = e.replace(/"/g, '\\"'), this.source += '  \
  ; __append("' + e + `")
`;
    }, "_addOutput"),
    scanLine: /* @__PURE__ */ o(function(e) {
      var i = this, t = this.opts.delimiter, a = this.opts.openDelimiter, r = this.opts.closeDelimiter, n = 0;
      switch (n = e.split(`
`).length - 1, e) {
        case a + t:
        case a + t + "_":
          this.mode = j.modes.EVAL;
          break;
        case a + t + "=":
          this.mode = j.modes.ESCAPED;
          break;
        case a + t + "-":
          this.mode = j.modes.RAW;
          break;
        case a + t + "#":
          this.mode = j.modes.COMMENT;
          break;
        case a + t + t:
          this.mode = j.modes.LITERAL, this.source += '    ; __append("' + e.replace(a + t + t, a + t) + `")
`;
          break;
        case t + t + r:
          this.mode = j.modes.LITERAL, this.source += '    ; __append("' + e.replace(t + t + r, t + r) + `")
`;
          break;
        case t + r:
        case "-" + t + r:
        case "_" + t + r:
          this.mode == j.modes.LITERAL && this._addOutput(e), this.mode = null, this.truncate = e.indexOf("-") === 0 || e.indexOf("_") === 0;
          break;
        default:
          if (this.mode) {
            switch (this.mode) {
              case j.modes.EVAL:
              case j.modes.ESCAPED:
              case j.modes.RAW:
                e.lastIndexOf("//") > e.lastIndexOf(`
`) && (e += `
`);
            }
            switch (this.mode) {
              // Just executing code
              case j.modes.EVAL:
                this.source += "    ; " + e + `
`;
                break;
              // Exec, esc, and output
              case j.modes.ESCAPED:
                this.source += "    ; __append(escapeFn(" + pt(e) + `))
`;
                break;
              // Exec and output
              case j.modes.RAW:
                this.source += "    ; __append(" + pt(e) + `)
`;
                break;
              case j.modes.COMMENT:
                break;
              // Literal <%% mode, append as raw output
              case j.modes.LITERAL:
                this._addOutput(e);
                break;
            }
          } else
            this._addOutput(e);
      }
      i.opts.compileDebug && n && (this.currentLine += n, this.source += "    ; __line = " + this.currentLine + `
`);
    }, "scanLine")
  };
  x.escapeXML = b.escapeXML;
  x.__express = x.renderFile;
  x.VERSION = ji;
  x.name = Si;
  typeof window < "u" && (window.ejs = x);
});

// src/builder-manager/index.ts
import { cp as ra, rm as na, writeFile as oa } from "node:fs/promises";
import { dirname as Et, join as L, parse as sa } from "node:path";
import { stringifyProcessEnvs as la } from "@storybook/core/common";
import { globalsModuleInfoMap as ca } from "@storybook/core/manager/globals-module-info";
import { logger as pe } from "@storybook/core/node-logger";

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/module-info.js
var fe = /* @__PURE__ */ o((e) => {
  let {
    type: i = "esm",
    varName: t,
    namedExports: a = null,
    defaultExport: r = !0
  } = typeof e == "string" ? { varName: e } : e;
  return { type: i, varName: t, namedExports: a, defaultExport: r };
}, "normalizeModuleInfo");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/on-load.js
var Ct = /* @__PURE__ */ o((e) => `module.exports = ${e};`, "createCjsContents");
var At = /* @__PURE__ */ o((e, i, t) => {
  let a = t ? [`export default ${e};`] : [];
  if (i && i.length) {
    let r = [...new Set(i)].join(", ");
    a.push(`const { ${r} } = ${e};`), a.push(`export { ${r} };`);
  }
  return a.join(`
`);
}, "createEsmContents"), de = /* @__PURE__ */ o((e) => {
  let { type: i, varName: t, namedExports: a, defaultExport: r } = e;
  switch (i) {
    case "esm":
      return At(t, a, r);
    case "cjs":
      return Ct(t);
  }
}, "createContents");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-reg-exp.js
var X = "global-externals", K = /* @__PURE__ */ o((e) => {
  let { modulePathFilter: i, getModuleInfo: t } = e;
  return {
    name: X,
    setup(a) {
      a.onResolve({ filter: i }, (r) => ({
        path: r.path,
        namespace: X
      })), a.onLoad({ filter: /.*/, namespace: X }, (r) => {
        let n = r.path, s = fe(t(n));
        return { contents: de(s) };
      });
    }
  };
}, "globalExternalsWithRegExp");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-object.js
var Z = /* @__PURE__ */ o((e) => {
  let i = {
    modulePathFilter: new RegExp(`^(?:${Object.keys(e).join("|")})$`),
    getModuleInfo: /* @__PURE__ */ o((t) => e[t], "getModuleInfo")
  };
  return K(i);
}, "globalExternals");

// src/builder-manager/index.ts
var Pt = $(ze(), 1), St = $(We(), 1), me = $(tt(), 1);

// src/builder-manager/utils/data.ts
import { basename as Di } from "node:path";
import { getRefs as Ii } from "@storybook/core/common";

// src/builder-manager/utils/template.ts
var dt = $(ft(), 1);
import { readFile as Ci } from "node:fs/promises";
import { dirname as Ai, join as Ni } from "node:path";
var ne = /* @__PURE__ */ o(async (e) => Ni(Ai(O.resolve("@storybook/core/package.json")), "assets/server", e), "getTemplatePath"), gt = /* @__PURE__ */ o(
async (e) => {
  let i = await ne(e);
  return Ci(i, { encoding: "utf8" });
}, "readTemplate");
var oe = /* @__PURE__ */ o(async (e, i, t, a, r, n, s, c, p, l, u, { versionCheck: d, previewUrl: f, configType: v, ignorePreview: m }, g) => {
  let h = await i, y = await e, _ = Object.entries(g).reduce(
    (E, [w, P]) => ({ ...E, [w]: JSON.stringify(P) }),
    {}
  );
  return (0, dt.render)(y, {
    title: h ? `${h} - Storybook` : "Storybook",
    files: { js: n, css: r },
    favicon: await t,
    globals: {
      FEATURES: JSON.stringify(await s, null, 2),
      REFS: JSON.stringify(await c, null, 2),
      LOGLEVEL: JSON.stringify(await p, null, 2),
      DOCS_OPTIONS: JSON.stringify(await l, null, 2),
      CONFIG_TYPE: JSON.stringify(await v, null, 2),
      // These two need to be double stringified because the UI expects a string
      VERSIONCHECK: JSON.stringify(JSON.stringify(d), null, 2),
      PREVIEW_URL: JSON.stringify(f, null, 2),
      // global preview URL
      TAGS_OPTIONS: JSON.stringify(await u, null, 2),
      ..._
    },
    head: await a || "",
    ignorePreview: m
  });
}, "renderHTML");

// src/builder-manager/utils/data.ts
var se = /* @__PURE__ */ o(async (e) => {
  let i = Ii(e), t = e.presets.apply("favicon").then((f) => Di(f)), a = e.presets.apply("features"), r = e.presets.apply("logLevel"), n = e.
  presets.apply("title"), s = e.presets.apply("docs", {}), c = e.presets.apply("tags", {}), p = gt("template.ejs"), l = e.presets.apply("man\
agerHead"), [u, d] = await Promise.all([
    //
    ht.get(),
    xt(e)
  ]);
  return {
    refs: i,
    features: a,
    title: n,
    docsOptions: s,
    template: p,
    customHead: l,
    instance: u,
    config: d,
    logLevel: r,
    favicon: t,
    tagsOptions: c
  };
}, "getData");

// src/builder-manager/utils/files.ts
import { existsSync as Mi } from "node:fs";
import { mkdir as qi, writeFile as zi } from "node:fs/promises";
import { dirname as $i, join as Wi, normalize as Hi } from "node:path";

// ../node_modules/slash/index.js
function I(e) {
  return e.startsWith("\\\\?\\") ? e : e.replace(/\\/g, "/");
}
o(I, "slash");

// src/builder-manager/utils/files.ts
async function le(e, i) {
  let t = await Promise.all(
    i?.map(async (n) => {
      let { location: s, url: c } = Bi(n, e);
      if (!Mi(s)) {
        let p = $i(s);
        await qi(p, { recursive: !0 });
      }
      return await zi(s, n.contents), c;
    }) || []
  ), a = t.filter((n) => n.endsWith(".js"));
  return { cssFiles: t.filter((n) => n.endsWith(".css")), jsFiles: a };
}
o(le, "readOrderedFiles");
function Bi(e, i) {
  let t = e.path.replace(i, ""), a = Hi(Wi(i, t)), r = `./sb-addons${I(t).split("/").map(encodeURIComponent).join("/")}`;
  return { location: a, url: r };
}
o(Bi, "sanitizePath");

// src/builder-manager/utils/framework.ts
import { sep as Ji } from "node:path";
import { extractProperRendererNameFromFramework as yt, getFrameworkName as Ui } from "@storybook/core/common";
var vt = /* @__PURE__ */ o((e) => {
  if (e)
    return typeof e == "string" ? e : e.name;
}, "pluckNameFromConfigProperty"), wt = /* @__PURE__ */ o((e) => e.replaceAll(Ji, "/"), "normalizePath"), Gi = /* @__PURE__ */ o((e) => wt(e).
match(/(@storybook\/.*)$/)?.[1], "pluckStorybookPackageFromPath"), Vi = /* @__PURE__ */ o((e) => wt(e).split("node_modules/")[1] ?? e, "pluc\
kThirdPartyPackageFromPath"), ce = /* @__PURE__ */ o(async (e) => {
  let i = {}, { builder: t } = await e.presets.apply("core"), a = await Ui(e);
  await yt(a) && (i.STORYBOOK_RENDERER = await yt(a) ?? void 0);
  let n = vt(t);
  n && (i.STORYBOOK_BUILDER = Gi(n) ?? Vi(n));
  let s = vt(await e.presets.apply("framework"));
  return s && (i.STORYBOOK_FRAMEWORK = s), i;
}, "buildFrameworkGlobalsFromOptions");

// src/builder-manager/utils/managerEntries.ts
import { existsSync as Xi } from "node:fs";
import { mkdir as Ki, writeFile as Zi } from "node:fs/promises";
import { dirname as Yi, join as bt, parse as Qi, relative as ea, sep as ta } from "node:path";
import { resolvePathInStorybookCache as ia } from "@storybook/core/common";
var _t = /* @__PURE__ */ o((e) => e.replaceAll(".", "").replaceAll("@", "").replaceAll(ta, "-").replaceAll("/", "-").replaceAll(new RegExp(/^(-)+/g),
""), "sanitizeBase"), aa = /* @__PURE__ */ o((e) => {
  let i = e.split(/-?node_modules-?/);
  return i[i.length - 1].replaceAll("storybook-addon-", "").replaceAll("dist-", "");
}, "sanitizeFinal");
async function jt(e, i) {
  return Promise.all(
    e.map(async (t, a) => {
      let { name: r, dir: n } = Qi(t), s = ia("sb-manager", i);
      if (!s)
        throw new Error("Could not create/find cache directory");
      let c = ea(process.cwd(), n), p = bt(
        s,
        aa(bt(`${_t(c)}-${a}`, `${_t(r)}-bundle.js`))
      );
      if (!Xi(p)) {
        let l = Yi(p);
        await Ki(l, { recursive: !0 });
      }
      return await Zi(p, `import '${I(t).replaceAll(/'/g, "\\'")}';`), p;
    })
  );
}
o(jt, "wrapManagerEntries");

// src/builder-manager/utils/safeResolve.ts
var Ot = /* @__PURE__ */ o((e) => {
  try {
    return Promise.resolve(O.resolve(e));
  } catch {
    return Promise.resolve(!1);
  }
}, "safeResolve");

// src/builder-manager/index.ts
var pa = /^\/($|\?)/, G, C, xt = /* @__PURE__ */ o(async (e) => {
  let [i, t, a, r] = await Promise.all([
    e.presets.apply("managerEntries", []),
    Ot(L(e.configDir, "manager")),
    ne("addon.tsconfig.json"),
    e.presets.apply("env")
  ]), n = t ? [...i, t] : i;
  return {
    entryPoints: await jt(n, e.cacheKey),
    outdir: L(e.outputDir || "./", "sb-addons"),
    format: "iife",
    write: !1,
    ignoreAnnotations: !0,
    resolveExtensions: [".ts", ".tsx", ".mjs", ".js", ".jsx"],
    outExtension: { ".js": ".js" },
    loader: {
      ".js": "jsx",
      // media
      ".png": "dataurl",
      ".gif": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".svg": "dataurl",
      ".webp": "dataurl",
      ".webm": "dataurl",
      ".mp3": "dataurl",
      // modern fonts
      ".woff2": "dataurl",
      // legacy font formats
      ".woff": "dataurl",
      ".eot": "dataurl",
      ".ttf": "dataurl"
    },
    target: ["chrome100", "safari15", "firefox91"],
    platform: "browser",
    bundle: !0,
    minify: !0,
    sourcemap: !1,
    conditions: ["browser", "module", "default"],
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    jsx: "transform",
    jsxImportSource: "react",
    tsconfig: a,
    legalComments: "external",
    plugins: [
      (0, St.default)({
        process: O.resolve("process/browser.js"),
        util: O.resolve("util/util.js"),
        assert: O.resolve("browser-assert")
      }),
      Z(ca),
      (0, Pt.pnpPlugin)()
    ],
    banner: {
      js: "try{"
    },
    footer: {
      js: '}catch(e){ console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e); }'
    },
    define: {
      "process.env": JSON.stringify(r),
      ...la(r),
      global: "window",
      module: "{}"
    }
  };
}, "getConfig"), ht = {
  get: /* @__PURE__ */ o(async () => {
    let { build: e } = await import("esbuild");
    return e;
  }, "get")
}, ma = /* @__PURE__ */ o(async function* ({
  startTime: i,
  options: t,
  router: a
}) {
  t.quiet || pe.info("=> Starting manager..");
  let {
    config: r,
    favicon: n,
    customHead: s,
    features: c,
    instance: p,
    refs: l,
    template: u,
    title: d,
    logLevel: f,
    docsOptions: v,
    tagsOptions: m
  } = await se(t);
  yield;
  let g = r.outdir;
  await na(g, { recursive: !0, force: !0 }), yield, G = await p({
    ...r
  }), yield;
  let h = L(
    Et(O.resolve("@storybook/core/package.json")),
    "dist",
    "manager"
  );
  a.use(
    "/sb-addons",
    (0, me.default)(g, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  ), a.use(
    "/sb-manager",
    (0, me.default)(h, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  );
  let { cssFiles: y, jsFiles: _ } = await le(g, G?.outputFiles), E = await ce(t);
  yield;
  let w = await oe(
    u,
    d,
    n,
    s,
    y,
    _,
    c,
    l,
    f,
    v,
    m,
    t,
    E
  );
  return yield, a.use("/", ({ url: P }, S, T) => {
    P && pa.test(P) ? (S.statusCode = 200, S.setHeader("Content-Type", "text/html"), S.write(w), S.end()) : T();
  }), a.use("/index.html", (P, S) => {
    S.statusCode = 200, S.setHeader("Content-Type", "text/html"), S.write(w), S.end();
  }), {
    bail: fa,
    stats: {
      toJson: /* @__PURE__ */ o(() => ({}), "toJson")
    },
    totalTime: process.hrtime(i)
  };
}, "starterGeneratorFn"), ua = /* @__PURE__ */ o(async function* ({ startTime: i, options: t }) {
  if (!t.outputDir)
    throw new Error("outputDir is required");
  pe.info("=> Building manager..");
  let {
    config: a,
    customHead: r,
    favicon: n,
    features: s,
    instance: c,
    refs: p,
    template: l,
    title: u,
    logLevel: d,
    docsOptions: f,
    tagsOptions: v
  } = await se(t);
  yield;
  let m = a.outdir, g = L(
    Et(O.resolve("@storybook/core/package.json")),
    "dist",
    "manager"
  ), h = L(t.outputDir, "sb-manager");
  G = await c({
    ...a,
    minify: !0
  }), yield;
  let y = ra(g, h, {
    filter: /* @__PURE__ */ o((S) => {
      let { ext: T } = sa(S);
      return T ? T === ".js" : !0;
    }, "filter"),
    recursive: !0
  }), { cssFiles: _, jsFiles: E } = await le(m, G?.outputFiles), w = await ce(t);
  yield;
  let P = await oe(
    l,
    u,
    n,
    r,
    _,
    E,
    s,
    p,
    d,
    f,
    v,
    t,
    w
  );
  return await Promise.all([oa(L(t.outputDir, "index.html"), P), y]), pe.trace({ message: "=> Manager built", time: process.hrtime(i) }), {
    toJson: /* @__PURE__ */ o(() => ({}), "toJson")
  };
}, "builderGeneratorFn"), fa = /* @__PURE__ */ o(async () => {
  if (C)
    try {
      await C.throw(new Error());
    } catch {
    }
}, "bail"), Nr = /* @__PURE__ */ o(async (e) => {
  C = ma(e);
  let i;
  do
    i = await C.next();
  while (!i.done);
  return i.value;
}, "start"), Dr = /* @__PURE__ */ o(async (e) => {
  C = ua(e);
  let i;
  do
    i = await C.next();
  while (!i.done);
  return i.value;
}, "build"), Ir = [], Mr = [];
export {
  fa as bail,
  Dr as build,
  Ir as corePresets,
  ht as executor,
  xt as getConfig,
  Mr as overridePresets,
  Nr as start
};
