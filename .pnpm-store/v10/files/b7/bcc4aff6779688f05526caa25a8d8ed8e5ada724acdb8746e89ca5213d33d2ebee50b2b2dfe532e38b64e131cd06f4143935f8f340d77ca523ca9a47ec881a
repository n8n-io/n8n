"use strict";
var w = Object.defineProperty;
var C = Object.getOwnPropertyDescriptor;
var M = Object.getOwnPropertyNames;
var E = Object.prototype.hasOwnProperty;
var G = (e, t) => {
  for (var r in t)
    w(e, r, { get: t[r], enumerable: !0 });
}, F = (e, t, r, s) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let n of M(t))
      !E.call(e, n) && n !== r && w(e, n, { get: () => t[n], enumerable: !(s = C(t, n)) || s.enumerable });
  return e;
};
var j = (e) => F(w({}, "__esModule", { value: !0 }), e);

// src/index.ts
var $ = {};
G($, {
  createInternalSpy: () => S,
  getInternalState: () => I,
  internalSpyOn: () => P,
  restoreAll: () => _,
  spies: () => c,
  spy: () => V,
  spyOn: () => L
});
module.exports = j($);

// src/utils.ts
function x(e, t) {
  if (!e)
    throw new Error(t);
}
function y(e, t) {
  return typeof t === e;
}
function k(e) {
  return e instanceof Promise;
}
function f(e, t, r) {
  Object.defineProperty(e, t, r);
}
function l(e, t, r) {
  Object.defineProperty(e, t, { value: r });
}

// src/constants.ts
var u = Symbol.for("tinyspy:spy");

// src/internal.ts
var c = /* @__PURE__ */ new Set(), D = (e) => {
  e.called = !1, e.callCount = 0, e.calls = [], e.results = [], e.resolves = [], e.next = [];
}, q = (e) => (f(e, u, { value: { reset: () => D(e[u]) } }), e[u]), I = (e) => e[u] || q(e);
function S(e) {
  x(
    y("function", e) || y("undefined", e),
    "cannot spy on a non-function value"
  );
  let t = function(...s) {
    let n = I(t);
    n.called = !0, n.callCount++, n.calls.push(s);
    let R = n.next.shift();
    if (R) {
      n.results.push(R);
      let [o, m] = R;
      if (o === "ok")
        return m;
      throw m;
    }
    let p, d = "ok", a = n.results.length;
    if (n.impl)
      try {
        new.target ? p = Reflect.construct(n.impl, s, new.target) : p = n.impl.apply(this, s), d = "ok";
      } catch (o) {
        throw p = o, d = "error", n.results.push([d, o]), o;
      }
    let g = [d, p];
    return k(p) && p.then(
      (o) => n.resolves[a] = ["ok", o],
      (o) => n.resolves[a] = ["error", o]
    ), n.results.push(g), p;
  };
  l(t, "_isMockFunction", !0), l(t, "length", e ? e.length : 0), l(t, "name", e && e.name || "spy");
  let r = I(t);
  return r.reset(), r.impl = e, t;
}
function A(e) {
  let t = I(e);
  "returns" in e || (f(e, "returns", {
    get: () => t.results.map(([, r]) => r)
  }), [
    "called",
    "callCount",
    "results",
    "resolves",
    "calls",
    "reset",
    "impl"
  ].forEach(
    (r) => f(e, r, { get: () => t[r], set: (s) => t[r] = s })
  ), l(e, "nextError", (r) => (t.next.push(["error", r]), t)), l(e, "nextResult", (r) => (t.next.push(["ok", r]), t)));
}

// src/spy.ts
function V(e) {
  let t = S(e);
  return A(t), t;
}

// src/spyOn.ts
var O = (e, t) => Object.getOwnPropertyDescriptor(e, t), b = (e, t) => {
  t != null && typeof t == "function" && t.prototype != null && Object.setPrototypeOf(e.prototype, t.prototype);
};
function P(e, t, r) {
  x(
    !y("undefined", e),
    "spyOn could not find an object to spy upon"
  ), x(
    y("object", e) || y("function", e),
    "cannot spyOn on a primitive value"
  );
  let [s, n] = (() => {
    if (!y("object", t))
      return [t, "value"];
    if ("getter" in t && "setter" in t)
      throw new Error("cannot spy on both getter and setter");
    if ("getter" in t)
      return [t.getter, "get"];
    if ("setter" in t)
      return [t.setter, "set"];
    throw new Error("specify getter or setter to spy on");
  })(), R = O(e, s), p = Object.getPrototypeOf(e), d = p && O(p, s), a = R || d;
  x(
    a || s in e,
    `${String(s)} does not exist`
  );
  let g = !1;
  n === "value" && a && !a.value && a.get && (n = "get", g = !0, r = a.get());
  let o;
  a ? o = a[n] : n !== "value" ? o = () => e[s] : o = e[s];
  let m = (v) => {
    let { value: z, ...h } = a || {
      configurable: !0,
      writable: !0
    };
    n !== "value" && delete h.writable, h[n] = v, f(e, s, h);
  }, K = () => a ? f(e, s, a) : m(o);
  r || (r = o);
  let i = S(r);
  n === "value" && b(i, o);
  let T = i[u];
  return l(T, "restore", K), l(T, "getOriginal", () => g ? o() : o), l(T, "willCall", (v) => (T.impl = v, i)), m(
    g ? () => (b(i, r), i) : i
  ), c.add(i), i;
}
function L(e, t, r) {
  let s = P(e, t, r);
  return A(s), ["restore", "getOriginal", "willCall"].forEach((n) => {
    l(s, n, s[u][n]);
  }), s;
}

// src/restoreAll.ts
function _() {
  for (let e of c)
    e.restore();
  c.clear();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createInternalSpy,
  getInternalState,
  internalSpyOn,
  restoreAll,
  spies,
  spy,
  spyOn
});
