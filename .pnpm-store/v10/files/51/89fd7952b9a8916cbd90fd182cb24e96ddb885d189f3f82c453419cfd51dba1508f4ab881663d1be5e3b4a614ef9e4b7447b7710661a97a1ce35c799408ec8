"use strict";
var Wt = Object.create;
var M = Object.defineProperty;
var Ht = Object.getOwnPropertyDescriptor;
var Bt = Object.getOwnPropertyNames;
var Jt = Object.getPrototypeOf, Ut = Object.prototype.hasOwnProperty;
var o = (e, i) => M(e, "name", { value: i, configurable: !0 });
var U = (e, i) => () => (e && (i = e(e = 0)), i);
var L = (e, i) => () => (i || e((i = { exports: {} }).exports, i), i.exports), q = (e, i) => {
  for (var t in i)
    M(e, t, { get: i[t], enumerable: !0 });
}, be = (e, i, t, a) => {
  if (i && typeof i == "object" || typeof i == "function")
    for (let r of Bt(i))
      !Ut.call(e, r) && r !== t && M(e, r, { get: () => i[r], enumerable: !(a = Ht(i, r)) || a.enumerable });
  return e;
};
var S = (e, i, t) => (t = e != null ? Wt(Jt(e)) : {}, be(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  i || !e || !e.__esModule ? M(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), z = (e) => be(M({}, "__esModule", { value: !0 }), e);

// ../node_modules/tslib/tslib.es6.mjs
var Ue = {};
q(Ue, {
  __addDisposableResource: () => Be,
  __assign: () => G,
  __asyncDelegator: () => De,
  __asyncGenerator: () => Ne,
  __asyncValues: () => Ie,
  __await: () => C,
  __awaiter: () => Re,
  __classPrivateFieldGet: () => $e,
  __classPrivateFieldIn: () => He,
  __classPrivateFieldSet: () => We,
  __createBinding: () => X,
  __decorate: () => Pe,
  __disposeResources: () => Je,
  __esDecorate: () => Xt,
  __exportStar: () => Fe,
  __extends: () => Oe,
  __generator: () => ke,
  __importDefault: () => ze,
  __importStar: () => qe,
  __makeTemplateObject: () => Me,
  __metadata: () => Te,
  __param: () => Se,
  __propKey: () => Zt,
  __read: () => le,
  __rest: () => Ee,
  __runInitializers: () => Kt,
  __setFunctionName: () => Yt,
  __spread: () => Le,
  __spreadArray: () => Ae,
  __spreadArrays: () => Ce,
  __values: () => V,
  default: () => ti
});
function Oe(e, i) {
  if (typeof i != "function" && i !== null)
    throw new TypeError("Class extends value " + String(i) + " is not a constructor or null");
  se(e, i);
  function t() {
    this.constructor = e;
  }
  o(t, "__"), e.prototype = i === null ? Object.create(i) : (t.prototype = i.prototype, new t());
}
function Ee(e, i) {
  var t = {};
  for (var a in e) Object.prototype.hasOwnProperty.call(e, a) && i.indexOf(a) < 0 && (t[a] = e[a]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var r = 0, a = Object.getOwnPropertySymbols(e); r < a.length; r++)
      i.indexOf(a[r]) < 0 && Object.prototype.propertyIsEnumerable.call(e, a[r]) && (t[a[r]] = e[a[r]]);
  return t;
}
function Pe(e, i, t, a) {
  var r = arguments.length, n = r < 3 ? i : a === null ? a = Object.getOwnPropertyDescriptor(i, t) : a, s;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") n = Reflect.decorate(e, i, t, a);
  else for (var c = e.length - 1; c >= 0; c--) (s = e[c]) && (n = (r < 3 ? s(n) : r > 3 ? s(i, t, n) : s(i, t)) || n);
  return r > 3 && n && Object.defineProperty(i, t, n), n;
}
function Se(e, i) {
  return function(t, a) {
    i(t, a, e);
  };
}
function Xt(e, i, t, a, r, n) {
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
function Kt(e, i, t) {
  for (var a = arguments.length > 2, r = 0; r < i.length; r++)
    t = a ? i[r].call(e, t) : i[r].call(e);
  return a ? t : void 0;
}
function Zt(e) {
  return typeof e == "symbol" ? e : "".concat(e);
}
function Yt(e, i, t) {
  return typeof i == "symbol" && (i = i.description ? "[".concat(i.description, "]") : ""), Object.defineProperty(e, "name", { configurable: !0,
  value: t ? "".concat(t, " ", i) : i });
}
function Te(e, i) {
  if (typeof Reflect == "object" && typeof Reflect.metadata == "function") return Reflect.metadata(e, i);
}
function Re(e, i, t, a) {
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
function ke(e, i) {
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
function Fe(e, i) {
  for (var t in e) t !== "default" && !Object.prototype.hasOwnProperty.call(i, t) && X(i, e, t);
}
function V(e) {
  var i = typeof Symbol == "function" && Symbol.iterator, t = i && e[i], a = 0;
  if (t) return t.call(e);
  if (e && typeof e.length == "number") return {
    next: /* @__PURE__ */ o(function() {
      return e && a >= e.length && (e = void 0), { value: e && e[a++], done: !e };
    }, "next")
  };
  throw new TypeError(i ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function le(e, i) {
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
function Le() {
  for (var e = [], i = 0; i < arguments.length; i++)
    e = e.concat(le(arguments[i]));
  return e;
}
function Ce() {
  for (var e = 0, i = 0, t = arguments.length; i < t; i++) e += arguments[i].length;
  for (var a = Array(e), r = 0, i = 0; i < t; i++)
    for (var n = arguments[i], s = 0, c = n.length; s < c; s++, r++)
      a[r] = n[s];
  return a;
}
function Ae(e, i, t) {
  if (t || arguments.length === 2) for (var a = 0, r = i.length, n; a < r; a++)
    (n || !(a in i)) && (n || (n = Array.prototype.slice.call(i, 0, a)), n[a] = i[a]);
  return e.concat(n || Array.prototype.slice.call(i));
}
function C(e) {
  return this instanceof C ? (this.v = e, this) : new C(e);
}
function Ne(e, i, t) {
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
    f.value instanceof C ? Promise.resolve(f.value.v).then(l, u) : d(n[0][2], f);
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
function De(e) {
  var i, t;
  return i = {}, a("next"), a("throw", function(r) {
    throw r;
  }), a("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function a(r, n) {
    i[r] = e[r] ? function(s) {
      return (t = !t) ? { value: C(e[r](s)), done: !1 } : n ? n(s) : s;
    } : n;
  }
}
function Ie(e) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var i = e[Symbol.asyncIterator], t;
  return i ? i.call(e) : (e = typeof V == "function" ? V(e) : e[Symbol.iterator](), t = {}, a("next"), a("throw"), a("return"), t[Symbol.asyncIterator] =
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
function Me(e, i) {
  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: i }) : e.raw = i, e;
}
function qe(e) {
  if (e && e.__esModule) return e;
  var i = {};
  if (e != null) for (var t in e) t !== "default" && Object.prototype.hasOwnProperty.call(e, t) && X(i, e, t);
  return Qt(i, e), i;
}
function ze(e) {
  return e && e.__esModule ? e : { default: e };
}
function $e(e, i, t, a) {
  if (t === "a" && !a) throw new TypeError("Private accessor was defined without a getter");
  if (typeof i == "function" ? e !== i || !a : !i.has(e)) throw new TypeError("Cannot read private member from an object whose class did not\
 declare it");
  return t === "m" ? a : t === "a" ? a.call(e) : a ? a.value : i.get(e);
}
function We(e, i, t, a, r) {
  if (a === "m") throw new TypeError("Private method is not writable");
  if (a === "a" && !r) throw new TypeError("Private accessor was defined without a setter");
  if (typeof i == "function" ? e !== i || !r : !i.has(e)) throw new TypeError("Cannot write private member to an object whose class did not \
declare it");
  return a === "a" ? r.call(e, t) : r ? r.value = t : i.set(e, t), t;
}
function He(e, i) {
  if (i === null || typeof i != "object" && typeof i != "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof e == "function" ? i === e : e.has(i);
}
function Be(e, i, t) {
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
function Je(e) {
  function i(a) {
    e.error = e.hasError ? new ei(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
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
var se, G, X, Qt, ei, ti, Ge = U(() => {
  se = /* @__PURE__ */ o(function(e, i) {
    return se = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t, a) {
      t.__proto__ = a;
    } || function(t, a) {
      for (var r in a) Object.prototype.hasOwnProperty.call(a, r) && (t[r] = a[r]);
    }, se(e, i);
  }, "extendStatics");
  o(Oe, "__extends");
  G = /* @__PURE__ */ o(function() {
    return G = Object.assign || /* @__PURE__ */ o(function(i) {
      for (var t, a = 1, r = arguments.length; a < r; a++) {
        t = arguments[a];
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (i[n] = t[n]);
      }
      return i;
    }, "__assign"), G.apply(this, arguments);
  }, "__assign");
  o(Ee, "__rest");
  o(Pe, "__decorate");
  o(Se, "__param");
  o(Xt, "__esDecorate");
  o(Kt, "__runInitializers");
  o(Zt, "__propKey");
  o(Yt, "__setFunctionName");
  o(Te, "__metadata");
  o(Re, "__awaiter");
  o(ke, "__generator");
  X = Object.create ? function(e, i, t, a) {
    a === void 0 && (a = t);
    var r = Object.getOwnPropertyDescriptor(i, t);
    (!r || ("get" in r ? !i.__esModule : r.writable || r.configurable)) && (r = { enumerable: !0, get: /* @__PURE__ */ o(function() {
      return i[t];
    }, "get") }), Object.defineProperty(e, a, r);
  } : function(e, i, t, a) {
    a === void 0 && (a = t), e[a] = i[t];
  };
  o(Fe, "__exportStar");
  o(V, "__values");
  o(le, "__read");
  o(Le, "__spread");
  o(Ce, "__spreadArrays");
  o(Ae, "__spreadArray");
  o(C, "__await");
  o(Ne, "__asyncGenerator");
  o(De, "__asyncDelegator");
  o(Ie, "__asyncValues");
  o(Me, "__makeTemplateObject");
  Qt = Object.create ? function(e, i) {
    Object.defineProperty(e, "default", { enumerable: !0, value: i });
  } : function(e, i) {
    e.default = i;
  };
  o(qe, "__importStar");
  o(ze, "__importDefault");
  o($e, "__classPrivateFieldGet");
  o(We, "__classPrivateFieldSet");
  o(He, "__classPrivateFieldIn");
  o(Be, "__addDisposableResource");
  ei = typeof SuppressedError == "function" ? SuppressedError : function(e, i, t) {
    var a = new Error(t);
    return a.name = "SuppressedError", a.error = e, a.suppressed = i, a;
  };
  o(Je, "__disposeResources");
  ti = {
    __extends: Oe,
    __assign: G,
    __rest: Ee,
    __decorate: Pe,
    __param: Se,
    __metadata: Te,
    __awaiter: Re,
    __generator: ke,
    __createBinding: X,
    __exportStar: Fe,
    __values: V,
    __read: le,
    __spread: Le,
    __spreadArrays: Ce,
    __spreadArray: Ae,
    __await: C,
    __asyncGenerator: Ne,
    __asyncDelegator: De,
    __asyncValues: Ie,
    __makeTemplateObject: Me,
    __importStar: qe,
    __importDefault: ze,
    __classPrivateFieldGet: $e,
    __classPrivateFieldSet: We,
    __classPrivateFieldIn: He,
    __addDisposableResource: Be,
    __disposeResources: Je
  };
});

// ../node_modules/@yarnpkg/esbuild-plugin-pnp/lib/index.js
var Xe = L((K) => {
  "use strict";
  Object.defineProperty(K, "__esModule", { value: !0 });
  K.pnpPlugin = void 0;
  var Ve = (Ge(), z(Ue)), ii = Ve.__importStar(require("fs")), ai = Ve.__importDefault(require("path")), ri = /()/, ni = [".tsx", ".ts", ".j\
sx", ".mjs", ".cjs", ".js", ".css", ".json"];
  function oi(e) {
    return e.map((i) => {
      let t = i.indexOf("*");
      return t !== -1 ? { prefix: i.slice(0, t), suffix: i.slice(t + 1) } : i;
    });
  }
  o(oi, "parseExternals");
  function si(e, i) {
    for (let t of i)
      if (typeof t == "object") {
        if (e.length >= t.prefix.length + t.suffix.length && e.startsWith(t.prefix) && e.endsWith(t.suffix))
          return !0;
      } else if (e === t || !t.startsWith("/") && !t.startsWith("./") && !t.startsWith("../") && t !== "." && t !== ".." && e.startsWith(`${t}\
/`))
        return !0;
    return !1;
  }
  o(si, "isExternal");
  async function li(e) {
    return {
      contents: await ii.promises.readFile(e.path),
      loader: "default",
      // For regular imports in the `file` namespace, resolveDir is the directory the
      // file being resolved lives in. For all other virtual modules, this defaults to
      // empty string: ""
      // A sensible value for pnp imports is the same as the `file` namespace, as pnp
      // still resolves to files on disk (in the cache).
      resolveDir: ai.default.dirname(e.path)
    };
  }
  o(li, "defaultOnLoad");
  async function ci(e, { resolvedPath: i, error: t, watchFiles: a }) {
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
  o(ci, "defaultOnResolve");
  function pi({ baseDir: e = process.cwd(), extensions: i = ni, filter: t = ri, onResolve: a = ci, onLoad: r = li } = {}) {
    return {
      name: "@yarnpkg/esbuild-plugin-pnp",
      setup(n) {
        var s, c;
        let { findPnpApi: p } = require("module");
        if (typeof p > "u")
          return;
        let l = oi((s = n.initialOptions.external) !== null && s !== void 0 ? s : []), u = (c = n.initialOptions.platform) !== null && c !==
        void 0 ? c : "browser", d = u === "node", f = new Set(n.initialOptions.conditions);
        f.add("default"), (u === "browser" || u === "node") && f.add(u);
        let v = new Set(f);
        v.add("import");
        let m = new Set(f);
        m.add("require"), n.onResolve({ filter: t }, (g) => {
          var h, y;
          if (si(g.path, l))
            return { external: !0 };
          let _ = f;
          g.kind === "dynamic-import" || g.kind === "import-statement" ? _ = v : (g.kind === "require-call" || g.kind === "require-resolve") &&
          (_ = m);
          let O = g.resolveDir ? `${g.resolveDir}/` : g.importer ? g.importer : `${e}/`, w = p(O);
          if (!w)
            return;
          let E = null, P;
          try {
            E = w.resolveRequest(g.path, O, {
              conditions: _,
              considerBuiltins: d,
              extensions: i
            });
          } catch (J) {
            P = J;
          }
          let F = [w.resolveRequest("pnpapi", null)];
          if (E) {
            let J = w.findPackageLocator(E);
            if (J) {
              let ae = w.getPackageInformation(J);
              ae?.linkType === "SOFT" && F.push((y = (h = w.resolveVirtual) === null || h === void 0 ? void 0 : h.call(w, E)) !== null && y !==
              void 0 ? y : E);
            }
          }
          return a(g, { resolvedPath: E, error: P, watchFiles: F });
        }), n.onLoad !== null && n.onLoad({ filter: t }, r);
      }
    };
  }
  o(pi, "pnpPlugin");
  K.pnpPlugin = pi;
});

// ../node_modules/esbuild-plugin-alias/index.js
var Ze = L((wa, Ke) => {
  Ke.exports = (e) => {
    let i = Object.keys(e), t = new RegExp(`^(${i.map((a) => mi(a)).join("|")})$`);
    return {
      name: "alias",
      setup(a) {
        a.onResolve({ filter: t }, (r) => ({
          path: e[r.path]
        }));
      }
    };
  };
  function mi(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  o(mi, "escapeRegExp");
});

// ../node_modules/totalist/sync/index.mjs
var Qe = {};
q(Qe, {
  totalist: () => Ye
});
function Ye(e, i, t = "") {
  e = (0, A.resolve)(".", e);
  let a = (0, Z.readdirSync)(e), r = 0, n, s;
  for (; r < a.length; r++)
    n = (0, A.join)(e, a[r]), s = (0, Z.statSync)(n), s.isDirectory() ? Ye(n, i, (0, A.join)(t, a[r])) : i((0, A.join)(t, a[r]), n, s);
}
var A, Z, et = U(() => {
  A = require("path"), Z = require("fs");
  o(Ye, "totalist");
});

// ../node_modules/@polka/url/build.mjs
var it = {};
q(it, {
  parse: () => ui
});
function ui(e) {
  let i = e.url;
  if (i == null) return;
  let t = e._parsedUrl;
  if (t && t.raw === i) return t;
  let a = i, r = "", n;
  if (i.length > 1) {
    let s = i.indexOf("?", 1);
    s !== -1 && (r = i.substring(s), a = i.substring(0, s), r.length > 1 && (n = tt.parse(r.substring(1))));
  }
  return e._parsedUrl = { pathname: a, search: r, query: n, raw: i };
}
var tt, at = U(() => {
  tt = S(require("node:querystring"), 1);
  o(ui, "parse");
});

// ../node_modules/mrmime/index.mjs
var nt = {};
q(nt, {
  lookup: () => fi,
  mimes: () => rt
});
function fi(e) {
  let i = ("" + e).trim().toLowerCase(), t = i.lastIndexOf(".");
  return rt[~t ? i.substring(++t) : i];
}
var rt, ot = U(() => {
  rt = {
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
  o(fi, "lookup");
});

// ../node_modules/sirv/build.js
var pt = L((Ea, ct) => {
  var ce = require("fs"), { join: di, normalize: gi, resolve: xi } = require("path"), { totalist: hi } = (et(), z(Qe)), { parse: yi } = (at(), z(it)),
  { lookup: vi } = (ot(), z(nt)), wi = /* @__PURE__ */ o(() => {
  }, "noop");
  function bi(e, i) {
    for (let t = 0; t < i.length; t++)
      if (i[t].test(e)) return !0;
  }
  o(bi, "isMatch");
  function st(e, i) {
    let t = 0, a, r = e.length - 1;
    e.charCodeAt(r) === 47 && (e = e.substring(0, r));
    let n = [], s = `${e}/index`;
    for (; t < i.length; t++)
      a = i[t] ? `.${i[t]}` : "", e && n.push(e + a), n.push(s + a);
    return n;
  }
  o(st, "toAssume");
  function _i(e, i, t) {
    let a = 0, r, n = st(i, t);
    for (; a < n.length; a++)
      if (r = e[n[a]]) return r;
  }
  o(_i, "viaCache");
  function ji(e, i, t, a) {
    let r = 0, n = st(t, a), s, c, p, l;
    for (; r < n.length; r++)
      if (s = gi(di(e, p = n[r])), s.startsWith(e) && ce.existsSync(s)) {
        if (c = ce.statSync(s), c.isDirectory()) continue;
        return l = lt(p, c, i), l["Cache-Control"] = i ? "no-cache" : "no-store", { abs: s, stats: c, headers: l };
      }
  }
  o(ji, "viaLocal");
  function Oi(e, i) {
    return i.statusCode = 404, i.end();
  }
  o(Oi, "is404");
  function Ei(e, i, t, a, r) {
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
    i.writeHead(n, r), ce.createReadStream(t, c).pipe(i);
  }
  o(Ei, "send");
  var Pi = {
    ".br": "br",
    ".gz": "gzip"
  };
  function lt(e, i, t) {
    let a = Pi[e.slice(-3)], r = vi(e.slice(0, a && -3)) || "";
    r === "text/html" && (r += ";charset=utf-8");
    let n = {
      "Content-Length": i.size,
      "Content-Type": r,
      "Last-Modified": i.mtime.toUTCString()
    };
    return a && (n["Content-Encoding"] = a), t && (n.ETag = `W/"${i.size}-${i.mtime.getTime()}"`), n;
  }
  o(lt, "toHeaders");
  ct.exports = function(e, i = {}) {
    e = xi(e || ".");
    let t = i.onNoMatch || Oi, a = i.setHeaders || wi, r = i.extensions || ["html", "htm"], n = i.gzip && r.map((m) => `${m}.gz`).concat("gz"),
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
    f && i.immutable ? f += ",immutable" : f && i.maxAge === 0 && (f += ",must-revalidate"), i.dev || hi(e, (m, g, h) => {
      if (!/\.well-known[\\+\/]/.test(m)) {
        if (!i.dotfiles && /(^\.|[\\+|\/+]\.)/.test(m)) return;
      }
      let y = lt(m, h, l);
      f && (y["Cache-Control"] = f), c["/" + m.normalize().replace(/\\+/g, "/")] = { abs: g, stats: h, headers: y };
    });
    let v = i.dev ? ji.bind(0, e, l) : _i.bind(0, c);
    return function(m, g, h) {
      let y = [""], _ = yi(m).pathname, O = m.headers["accept-encoding"] || "";
      if (n && O.includes("gzip") && y.unshift(...n), s && /(br|brotli)/i.test(O) && y.unshift(...s), y.push(...r), _.indexOf("%") !== -1)
        try {
          _ = decodeURI(_);
        } catch {
        }
      let w = v(_, y) || u && !bi(_, d) && v(p, y);
      if (!w) return h ? h() : t(m, g);
      if (l && m.headers["if-none-match"] === w.headers.ETag)
        return g.writeHead(304), g.end();
      (n || s) && g.setHeader("Vary", "Accept-Encoding"), a(g, _, w.stats), Ei(m, g, w.abs, w.stats, w.headers);
    };
  };
});

// ../node_modules/ejs/lib/utils.js
var ut = L((T) => {
  "use strict";
  var Si = /[|\\{}()[\]^$+*?.]/g, Ti = Object.prototype.hasOwnProperty, pe = /* @__PURE__ */ o(function(e, i) {
    return Ti.apply(e, [i]);
  }, "hasOwn");
  T.escapeRegExpChars = function(e) {
    return e ? String(e).replace(Si, "\\$&") : "";
  };
  var Ri = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&#34;",
    "'": "&#39;"
  }, ki = /[&<>'"]/g;
  function Fi(e) {
    return Ri[e] || e;
  }
  o(Fi, "encode_char");
  var Li = `var _ENCODE_HTML_RULES = {
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
  T.escapeXML = function(e) {
    return e == null ? "" : String(e).replace(ki, Fi);
  };
  function mt() {
    return Function.prototype.toString.call(this) + `;
` + Li;
  }
  o(mt, "escapeXMLToString");
  try {
    typeof Object.defineProperty == "function" ? Object.defineProperty(T.escapeXML, "toString", { value: mt }) : T.escapeXML.toString = mt;
  } catch {
    console.warn("Unable to set escapeXML.toString (is the Function prototype frozen?)");
  }
  T.shallowCopy = function(e, i) {
    if (i = i || {}, e != null)
      for (var t in i)
        pe(i, t) && (t === "__proto__" || t === "constructor" || (e[t] = i[t]));
    return e;
  };
  T.shallowCopyFromList = function(e, i, t) {
    if (t = t || [], i = i || {}, e != null)
      for (var a = 0; a < t.length; a++) {
        var r = t[a];
        if (typeof i[r] < "u") {
          if (!pe(i, r) || r === "__proto__" || r === "constructor")
            continue;
          e[r] = i[r];
        }
      }
    return e;
  };
  T.cache = {
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
  T.hyphenToCamel = function(e) {
    return e.replace(/-[a-z]/g, function(i) {
      return i[1].toUpperCase();
    });
  };
  T.createNullProtoObjWherePossible = function() {
    return typeof Object.create == "function" ? function() {
      return /* @__PURE__ */ Object.create(null);
    } : { __proto__: null } instanceof Object ? function() {
      return {};
    } : function() {
      return { __proto__: null };
    };
  }();
  T.hasOwnOnlyObject = function(e) {
    var i = T.createNullProtoObjWherePossible();
    for (var t in e)
      pe(e, t) && (i[t] = e[t]);
    return i;
  };
});

// ../node_modules/ejs/package.json
var ft = L((Ra, Ci) => {
  Ci.exports = {
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
var _t = L((x) => {
  "use strict";
  var ue = require("fs"), $ = require("path"), b = ut(), dt = !1, Ai = ft().version, Ni = "<", Di = ">", Ii = "%", wt = "locals", Mi = "ejs",
  qi = "(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)", bt = [
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
  ], zi = bt.concat("cache"), gt = /^\uFEFF/, me = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  x.cache = b.cache;
  x.fileLoader = ue.readFileSync;
  x.localsName = wt;
  x.promiseImpl = new Function("return this;")().Promise;
  x.resolveInclude = function(e, i, t) {
    var a = $.dirname, r = $.extname, n = $.resolve, s = n(t ? i : a(i), e), c = r(e);
    return c || (s += ".ejs"), s;
  };
  function xt(e, i) {
    var t;
    if (i.some(function(a) {
      return t = x.resolveInclude(e, a, !0), ue.existsSync(t);
    }))
      return t;
  }
  o(xt, "resolvePaths");
  function $i(e, i) {
    var t, a, r = i.views, n = /^[A-Za-z]+:\\|^\//.exec(e);
    if (n && n.length)
      e = e.replace(/^\/*/, ""), Array.isArray(i.root) ? t = xt(e, i.root) : t = x.resolveInclude(e, i.root || "/", !0);
    else if (i.filename && (a = x.resolveInclude(e, i.filename), ue.existsSync(a) && (t = a)), !t && Array.isArray(r) && (t = xt(e, r)), !t &&
    typeof i.includer != "function")
      throw new Error('Could not find the include file "' + i.escapeFunction(e) + '"');
    return t;
  }
  o($i, "getIncludePath");
  function W(e, i) {
    var t, a = e.filename, r = arguments.length > 1;
    if (e.cache) {
      if (!a)
        throw new Error("cache option requires a filename");
      if (t = x.cache.get(a), t)
        return t;
      r || (i = ht(a).toString().replace(gt, ""));
    } else if (!r) {
      if (!a)
        throw new Error("Internal EJS error: no file name or template provided");
      i = ht(a).toString().replace(gt, "");
    }
    return t = x.compile(i, e), e.cache && x.cache.set(a, t), t;
  }
  o(W, "handleCache");
  function Wi(e, i, t) {
    var a;
    if (t) {
      try {
        a = W(e)(i);
      } catch (r) {
        return t(r);
      }
      t(null, a);
    } else {
      if (typeof x.promiseImpl == "function")
        return new x.promiseImpl(function(r, n) {
          try {
            a = W(e)(i), r(a);
          } catch (s) {
            n(s);
          }
        });
      throw new Error("Please provide a callback function");
    }
  }
  o(Wi, "tryHandleCache");
  function ht(e) {
    return x.fileLoader(e);
  }
  o(ht, "fileLoader");
  function Hi(e, i) {
    var t = b.shallowCopy(b.createNullProtoObjWherePossible(), i);
    if (t.filename = $i(e, t), typeof i.includer == "function") {
      var a = i.includer(e, t.filename);
      if (a && (a.filename && (t.filename = a.filename), a.template))
        return W(t, a.template);
    }
    return W(t);
  }
  o(Hi, "includeFile");
  function yt(e, i, t, a, r) {
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
  o(yt, "rethrow");
  function vt(e) {
    return e.replace(/;(\s*$)/, "$1");
  }
  o(vt, "stripSemi");
  x.compile = /* @__PURE__ */ o(function(i, t) {
    var a;
    return t && t.scope && (dt || (console.warn("`scope` option is deprecated and will be removed in EJS 3"), dt = !0), t.context || (t.context =
    t.scope), delete t.scope), a = new j(i, t), a.compile();
  }, "compile");
  x.render = function(e, i, t) {
    var a = i || b.createNullProtoObjWherePossible(), r = t || b.createNullProtoObjWherePossible();
    return arguments.length == 2 && b.shallowCopyFromList(r, a, bt), W(r, e)(a);
  };
  x.renderFile = function() {
    var e = Array.prototype.slice.call(arguments), i = e.shift(), t, a = { filename: i }, r, n;
    return typeof arguments[arguments.length - 1] == "function" && (t = e.pop()), e.length ? (r = e.shift(), e.length ? b.shallowCopy(a, e.pop()) :
    (r.settings && (r.settings.views && (a.views = r.settings.views), r.settings["view cache"] && (a.cache = !0), n = r.settings["view optio\
ns"], n && b.shallowCopy(a, n)), b.shallowCopyFromList(a, r, zi)), a.filename = i) : r = b.createNullProtoObjWherePossible(), Wi(a, r, t);
  };
  x.Template = j;
  x.clearCache = function() {
    x.cache.reset();
  };
  function j(e, i) {
    var t = b.hasOwnOnlyObject(i), a = b.createNullProtoObjWherePossible();
    this.templateText = e, this.mode = null, this.truncate = !1, this.currentLine = 1, this.source = "", a.client = t.client || !1, a.escapeFunction =
    t.escape || t.escapeFunction || b.escapeXML, a.compileDebug = t.compileDebug !== !1, a.debug = !!t.debug, a.filename = t.filename, a.openDelimiter =
    t.openDelimiter || x.openDelimiter || Ni, a.closeDelimiter = t.closeDelimiter || x.closeDelimiter || Di, a.delimiter = t.delimiter || x.
    delimiter || Ii, a.strict = t.strict || !1, a.context = t.context, a.cache = t.cache || !1, a.rmWhitespace = t.rmWhitespace, a.root = t.
    root, a.includer = t.includer, a.outputFunctionName = t.outputFunctionName, a.localsName = t.localsName || x.localsName || wt, a.views =
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
      var e = qi, i = b.escapeRegExpChars(this.opts.delimiter), t = b.escapeRegExpChars(this.opts.openDelimiter), a = b.escapeRegExpChars(this.
      opts.closeDelimiter);
      return e = e.replace(/%/g, i).replace(/</g, t).replace(/>/g, a), new RegExp(e);
    }, "createRegex"),
    compile: /* @__PURE__ */ o(function() {
      var e, i, t = this.opts, a = "", r = "", n = t.escapeFunction, s, c = t.filename ? JSON.stringify(t.filename) : "undefined";
      if (!this.source) {
        if (this.generateSource(), a += `  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
`, t.outputFunctionName) {
          if (!me.test(t.outputFunctionName))
            throw new Error("outputFunctionName is not a valid JS identifier.");
          a += "  var " + t.outputFunctionName + ` = __append;
`;
        }
        if (t.localsName && !me.test(t.localsName))
          throw new Error("localsName is not a valid JS identifier.");
        if (t.destructuredLocals && t.destructuredLocals.length) {
          for (var p = "  var __locals = (" + t.localsName + ` || {}),
`, l = 0; l < t.destructuredLocals.length; l++) {
            var u = t.destructuredLocals[l];
            if (!me.test(u))
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
` + e, t.compileDebug && (e = "rethrow = rethrow || " + yt.toString() + `;
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
          var O = b.shallowCopy(b.createNullProtoObjWherePossible(), g);
          return _ && (O = b.shallowCopy(O, _)), Hi(y, t)(O);
        }, "include");
        return i.apply(
          t.context,
          [g || b.createNullProtoObjWherePossible(), n, h, yt]
        );
      }, "anonymous");
      if (t.filename && typeof Object.defineProperty == "function") {
        var f = t.filename, v = $.basename(f, $.extname(f));
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
                this.source += "    ; __append(escapeFn(" + vt(e) + `))
`;
                break;
              // Exec and output
              case j.modes.RAW:
                this.source += "    ; __append(" + vt(e) + `)
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
  x.VERSION = Ai;
  x.name = Mi;
  typeof window < "u" && (window.ejs = x);
});

// src/builder-manager/index.ts
var ta = {};
q(ta, {
  bail: () => $t,
  build: () => Yi,
  corePresets: () => Qi,
  executor: () => he,
  getConfig: () => xe,
  overridePresets: () => ea,
  start: () => Zi
});
module.exports = z(ta);
var I = require("node:fs/promises"), R = require("node:path"), It = require("@storybook/core/common"), Mt = require("@storybook/core/manager/globals-module-info"),
te = require("@storybook/core/node-logger");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/module-info.js
var _e = /* @__PURE__ */ o((e) => {
  let {
    type: i = "esm",
    varName: t,
    namedExports: a = null,
    defaultExport: r = !0
  } = typeof e == "string" ? { varName: e } : e;
  return { type: i, varName: t, namedExports: a, defaultExport: r };
}, "normalizeModuleInfo");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/on-load.js
var Gt = /* @__PURE__ */ o((e) => `module.exports = ${e};`, "createCjsContents");
var Vt = /* @__PURE__ */ o((e, i, t) => {
  let a = t ? [`export default ${e};`] : [];
  if (i && i.length) {
    let r = [...new Set(i)].join(", ");
    a.push(`const { ${r} } = ${e};`), a.push(`export { ${r} };`);
  }
  return a.join(`
`);
}, "createEsmContents"), je = /* @__PURE__ */ o((e) => {
  let { type: i, varName: t, namedExports: a, defaultExport: r } = e;
  switch (i) {
    case "esm":
      return Vt(t, a, r);
    case "cjs":
      return Gt(t);
  }
}, "createContents");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-reg-exp.js
var re = "global-externals", ne = /* @__PURE__ */ o((e) => {
  let { modulePathFilter: i, getModuleInfo: t } = e;
  return {
    name: re,
    setup(a) {
      a.onResolve({ filter: i }, (r) => ({
        path: r.path,
        namespace: re
      })), a.onLoad({ filter: /.*/, namespace: re }, (r) => {
        let n = r.path, s = _e(t(n));
        return { contents: je(s) };
      });
    }
  };
}, "globalExternalsWithRegExp");

// ../node_modules/@fal-works/esbuild-plugin-global-externals/lib/with-object.js
var oe = /* @__PURE__ */ o((e) => {
  let i = {
    modulePathFilter: new RegExp(`^(?:${Object.keys(e).join("|")})$`),
    getModuleInfo: /* @__PURE__ */ o((t) => e[t], "getModuleInfo")
  };
  return ne(i);
}, "globalExternals");

// src/builder-manager/index.ts
var qt = S(Xe(), 1), zt = S(Ze(), 1), we = S(pt(), 1);

// src/builder-manager/utils/data.ts
var Pt = require("node:path"), St = require("@storybook/core/common");

// src/builder-manager/utils/template.ts
var jt = require("node:fs/promises"), Y = require("node:path"), Ot = S(_t(), 1);
var fe = /* @__PURE__ */ o(async (e) => (0, Y.join)((0, Y.dirname)(require.resolve("@storybook/core/package.json")), "assets/server", e), "g\
etTemplatePath"), Et = /* @__PURE__ */ o(async (e) => {
  let i = await fe(e);
  return (0, jt.readFile)(i, { encoding: "utf8" });
}, "readTemplate");
var de = /* @__PURE__ */ o(async (e, i, t, a, r, n, s, c, p, l, u, { versionCheck: d, previewUrl: f, configType: v, ignorePreview: m }, g) => {
  let h = await i, y = await e, _ = Object.entries(g).reduce(
    (O, [w, E]) => ({ ...O, [w]: JSON.stringify(E) }),
    {}
  );
  return (0, Ot.render)(y, {
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
var ge = /* @__PURE__ */ o(async (e) => {
  let i = (0, St.getRefs)(e), t = e.presets.apply("favicon").then((f) => (0, Pt.basename)(f)), a = e.presets.apply("features"), r = e.presets.
  apply("logLevel"), n = e.presets.apply("title"), s = e.presets.apply("docs", {}), c = e.presets.apply("tags", {}), p = Et("template.ejs"),
  l = e.presets.apply("managerHead"), [u, d] = await Promise.all([
    //
    he.get(),
    xe(e)
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
var Tt = require("node:fs"), Q = require("node:fs/promises"), N = require("node:path");

// ../node_modules/slash/index.js
function H(e) {
  return e.startsWith("\\\\?\\") ? e : e.replace(/\\/g, "/");
}
o(H, "slash");

// src/builder-manager/utils/files.ts
async function ye(e, i) {
  let t = await Promise.all(
    i?.map(async (n) => {
      let { location: s, url: c } = Bi(n, e);
      if (!(0, Tt.existsSync)(s)) {
        let p = (0, N.dirname)(s);
        await (0, Q.mkdir)(p, { recursive: !0 });
      }
      return await (0, Q.writeFile)(s, n.contents), c;
    }) || []
  ), a = t.filter((n) => n.endsWith(".js"));
  return { cssFiles: t.filter((n) => n.endsWith(".css")), jsFiles: a };
}
o(ye, "readOrderedFiles");
function Bi(e, i) {
  let t = e.path.replace(i, ""), a = (0, N.normalize)((0, N.join)(i, t)), r = `./sb-addons${H(t).split("/").map(encodeURIComponent).join("/")}`;
  return { location: a, url: r };
}
o(Bi, "sanitizePath");

// src/builder-manager/utils/framework.ts
var kt = require("node:path"), B = require("@storybook/core/common");
var Rt = /* @__PURE__ */ o((e) => {
  if (e)
    return typeof e == "string" ? e : e.name;
}, "pluckNameFromConfigProperty"), Ft = /* @__PURE__ */ o((e) => e.replaceAll(kt.sep, "/"), "normalizePath"), Ji = /* @__PURE__ */ o((e) => Ft(
e).match(/(@storybook\/.*)$/)?.[1], "pluckStorybookPackageFromPath"), Ui = /* @__PURE__ */ o((e) => Ft(e).split("node_modules/")[1] ?? e, "p\
luckThirdPartyPackageFromPath"), ve = /* @__PURE__ */ o(async (e) => {
  let i = {}, { builder: t } = await e.presets.apply("core"), a = await (0, B.getFrameworkName)(e);
  await (0, B.extractProperRendererNameFromFramework)(a) && (i.STORYBOOK_RENDERER = await (0, B.extractProperRendererNameFromFramework)(a) ??
  void 0);
  let n = Rt(t);
  n && (i.STORYBOOK_BUILDER = Ji(n) ?? Ui(n));
  let s = Rt(await e.presets.apply("framework"));
  return s && (i.STORYBOOK_FRAMEWORK = s), i;
}, "buildFrameworkGlobalsFromOptions");

// src/builder-manager/utils/managerEntries.ts
var Ct = require("node:fs"), ee = require("node:fs/promises"), k = require("node:path"), At = require("@storybook/core/common");
var Lt = /* @__PURE__ */ o((e) => e.replaceAll(".", "").replaceAll("@", "").replaceAll(k.sep, "-").replaceAll("/", "-").replaceAll(new RegExp(
/^(-)+/g), ""), "sanitizeBase"), Gi = /* @__PURE__ */ o((e) => {
  let i = e.split(/-?node_modules-?/);
  return i[i.length - 1].replaceAll("storybook-addon-", "").replaceAll("dist-", "");
}, "sanitizeFinal");
async function Nt(e, i) {
  return Promise.all(
    e.map(async (t, a) => {
      let { name: r, dir: n } = (0, k.parse)(t), s = (0, At.resolvePathInStorybookCache)("sb-manager", i);
      if (!s)
        throw new Error("Could not create/find cache directory");
      let c = (0, k.relative)(process.cwd(), n), p = (0, k.join)(
        s,
        Gi((0, k.join)(`${Lt(c)}-${a}`, `${Lt(r)}-bundle.js`))
      );
      if (!(0, Ct.existsSync)(p)) {
        let l = (0, k.dirname)(p);
        await (0, ee.mkdir)(l, { recursive: !0 });
      }
      return await (0, ee.writeFile)(p, `import '${H(t).replaceAll(/'/g, "\\'")}';`), p;
    })
  );
}
o(Nt, "wrapManagerEntries");

// src/builder-manager/utils/safeResolve.ts
var Dt = /* @__PURE__ */ o((e) => {
  try {
    return Promise.resolve(require.resolve(e));
  } catch {
    return Promise.resolve(!1);
  }
}, "safeResolve");

// src/builder-manager/index.ts
var Vi = /^\/($|\?)/, ie, D, xe = /* @__PURE__ */ o(async (e) => {
  let [i, t, a, r] = await Promise.all([
    e.presets.apply("managerEntries", []),
    Dt((0, R.join)(e.configDir, "manager")),
    fe("addon.tsconfig.json"),
    e.presets.apply("env")
  ]), n = t ? [...i, t] : i;
  return {
    entryPoints: await Nt(n, e.cacheKey),
    outdir: (0, R.join)(e.outputDir || "./", "sb-addons"),
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
      (0, zt.default)({
        process: require.resolve("process/browser.js"),
        util: require.resolve("util/util.js"),
        assert: require.resolve("browser-assert")
      }),
      oe(Mt.globalsModuleInfoMap),
      (0, qt.pnpPlugin)()
    ],
    banner: {
      js: "try{"
    },
    footer: {
      js: '}catch(e){ console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e); }'
    },
    define: {
      "process.env": JSON.stringify(r),
      ...(0, It.stringifyProcessEnvs)(r),
      global: "window",
      module: "{}"
    }
  };
}, "getConfig"), he = {
  get: /* @__PURE__ */ o(async () => {
    let { build: e } = await import("esbuild");
    return e;
  }, "get")
}, Xi = /* @__PURE__ */ o(async function* ({
  startTime: i,
  options: t,
  router: a
}) {
  t.quiet || te.logger.info("=> Starting manager..");
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
  } = await ge(t);
  yield;
  let g = r.outdir;
  await (0, I.rm)(g, { recursive: !0, force: !0 }), yield, ie = await p({
    ...r
  }), yield;
  let h = (0, R.join)(
    (0, R.dirname)(require.resolve("@storybook/core/package.json")),
    "dist",
    "manager"
  );
  a.use(
    "/sb-addons",
    (0, we.default)(g, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  ), a.use(
    "/sb-manager",
    (0, we.default)(h, {
      maxAge: 3e5,
      dev: !0,
      immutable: !0
    })
  );
  let { cssFiles: y, jsFiles: _ } = await ye(g, ie?.outputFiles), O = await ve(t);
  yield;
  let w = await de(
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
    O
  );
  return yield, a.use("/", ({ url: E }, P, F) => {
    E && Vi.test(E) ? (P.statusCode = 200, P.setHeader("Content-Type", "text/html"), P.write(w), P.end()) : F();
  }), a.use("/index.html", (E, P) => {
    P.statusCode = 200, P.setHeader("Content-Type", "text/html"), P.write(w), P.end();
  }), {
    bail: $t,
    stats: {
      toJson: /* @__PURE__ */ o(() => ({}), "toJson")
    },
    totalTime: process.hrtime(i)
  };
}, "starterGeneratorFn"), Ki = /* @__PURE__ */ o(async function* ({ startTime: i, options: t }) {
  if (!t.outputDir)
    throw new Error("outputDir is required");
  te.logger.info("=> Building manager..");
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
  } = await ge(t);
  yield;
  let m = a.outdir, g = (0, R.join)(
    (0, R.dirname)(require.resolve("@storybook/core/package.json")),
    "dist",
    "manager"
  ), h = (0, R.join)(t.outputDir, "sb-manager");
  ie = await c({
    ...a,
    minify: !0
  }), yield;
  let y = (0, I.cp)(g, h, {
    filter: /* @__PURE__ */ o((P) => {
      let { ext: F } = (0, R.parse)(P);
      return F ? F === ".js" : !0;
    }, "filter"),
    recursive: !0
  }), { cssFiles: _, jsFiles: O } = await ye(m, ie?.outputFiles), w = await ve(t);
  yield;
  let E = await de(
    l,
    u,
    n,
    r,
    _,
    O,
    s,
    p,
    d,
    f,
    v,
    t,
    w
  );
  return await Promise.all([(0, I.writeFile)((0, R.join)(t.outputDir, "index.html"), E), y]), te.logger.trace({ message: "=> Manager built",
  time: process.hrtime(i) }), {
    toJson: /* @__PURE__ */ o(() => ({}), "toJson")
  };
}, "builderGeneratorFn"), $t = /* @__PURE__ */ o(async () => {
  if (D)
    try {
      await D.throw(new Error());
    } catch {
    }
}, "bail"), Zi = /* @__PURE__ */ o(async (e) => {
  D = Xi(e);
  let i;
  do
    i = await D.next();
  while (!i.done);
  return i.value;
}, "start"), Yi = /* @__PURE__ */ o(async (e) => {
  D = Ki(e);
  let i;
  do
    i = await D.next();
  while (!i.done);
  return i.value;
}, "build"), Qi = [], ea = [];
