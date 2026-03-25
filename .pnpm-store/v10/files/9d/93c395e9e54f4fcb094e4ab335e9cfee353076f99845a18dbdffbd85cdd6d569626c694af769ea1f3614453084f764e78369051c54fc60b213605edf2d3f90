// src/utils.ts
function d(e, t) {
  if (!e)
    throw new Error(t);
}
function y(e, t) {
  return typeof t === e;
}
function w(e) {
  return e instanceof Promise;
}
function f(e, t, n) {
  Object.defineProperty(e, t, n);
}
function l(e, t, n) {
  Object.defineProperty(e, t, { value: n });
}

// src/constants.ts
var u = Symbol.for("tinyspy:spy");

// src/internal.ts
var x = /* @__PURE__ */ new Set(), P = (e) => {
  e.called = !1, e.callCount = 0, e.calls = [], e.results = [], e.resolves = [], e.next = [];
}, K = (e) => (f(e, u, { value: { reset: () => P(e[u]) } }), e[u]), T = (e) => e[u] || K(e);
function m(e) {
  d(
    y("function", e) || y("undefined", e),
    "cannot spy on a non-function value"
  );
  let t = function(...s) {
    let r = T(t);
    r.called = !0, r.callCount++, r.calls.push(s);
    let S = r.next.shift();
    if (S) {
      r.results.push(S);
      let [o, g] = S;
      if (o === "ok")
        return g;
      throw g;
    }
    let p, c = "ok", a = r.results.length;
    if (r.impl)
      try {
        new.target ? p = Reflect.construct(r.impl, s, new.target) : p = r.impl.apply(this, s), c = "ok";
      } catch (o) {
        throw p = o, c = "error", r.results.push([c, o]), o;
      }
    let R = [c, p];
    return w(p) && p.then(
      (o) => r.resolves[a] = ["ok", o],
      (o) => r.resolves[a] = ["error", o]
    ), r.results.push(R), p;
  };
  l(t, "_isMockFunction", !0), l(t, "length", e ? e.length : 0), l(t, "name", e && e.name || "spy");
  let n = T(t);
  return n.reset(), n.impl = e, t;
}
function A(e) {
  let t = T(e);
  "returns" in e || (f(e, "returns", {
    get: () => t.results.map(([, n]) => n)
  }), [
    "called",
    "callCount",
    "results",
    "resolves",
    "calls",
    "reset",
    "impl"
  ].forEach(
    (n) => f(e, n, { get: () => t[n], set: (s) => t[n] = s })
  ), l(e, "nextError", (n) => (t.next.push(["error", n]), t)), l(e, "nextResult", (n) => (t.next.push(["ok", n]), t)));
}

// src/spy.ts
function L(e) {
  let t = m(e);
  return A(t), t;
}

// src/spyOn.ts
var k = (e, t) => Object.getOwnPropertyDescriptor(e, t), O = (e, t) => {
  t != null && typeof t == "function" && t.prototype != null && Object.setPrototypeOf(e.prototype, t.prototype);
};
function C(e, t, n) {
  d(
    !y("undefined", e),
    "spyOn could not find an object to spy upon"
  ), d(
    y("object", e) || y("function", e),
    "cannot spyOn on a primitive value"
  );
  let [s, r] = (() => {
    if (!y("object", t))
      return [t, "value"];
    if ("getter" in t && "setter" in t)
      throw new Error("cannot spy on both getter and setter");
    if ("getter" in t)
      return [t.getter, "get"];
    if ("setter" in t)
      return [t.setter, "set"];
    throw new Error("specify getter or setter to spy on");
  })(), S = k(e, s), p = Object.getPrototypeOf(e), c = p && k(p, s), a = S || c;
  d(
    a || s in e,
    `${String(s)} does not exist`
  );
  let R = !1;
  r === "value" && a && !a.value && a.get && (r = "get", R = !0, n = a.get());
  let o;
  a ? o = a[r] : r !== "value" ? o = () => e[s] : o = e[s];
  let g = (v) => {
    let { value: M, ...h } = a || {
      configurable: !0,
      writable: !0
    };
    r !== "value" && delete h.writable, h[r] = v, f(e, s, h);
  }, b = () => a ? f(e, s, a) : g(o);
  n || (n = o);
  let i = m(n);
  r === "value" && O(i, o);
  let I = i[u];
  return l(I, "restore", b), l(I, "getOriginal", () => R ? o() : o), l(I, "willCall", (v) => (I.impl = v, i)), g(
    R ? () => (O(i, n), i) : i
  ), x.add(i), i;
}
function U(e, t, n) {
  let s = C(e, t, n);
  return A(s), ["restore", "getOriginal", "willCall"].forEach((r) => {
    l(s, r, s[u][r]);
  }), s;
}

// src/restoreAll.ts
function Y() {
  for (let e of x)
    e.restore();
  x.clear();
}
export {
  m as createInternalSpy,
  T as getInternalState,
  C as internalSpyOn,
  Y as restoreAll,
  x as spies,
  L as spy,
  U as spyOn
};
