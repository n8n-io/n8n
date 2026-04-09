"use strict";
var _ = Object.create;
var u = Object.defineProperty;
var $ = Object.getOwnPropertyDescriptor;
var j = Object.getOwnPropertyNames;
var C = Object.getPrototypeOf, E = Object.prototype.hasOwnProperty;
var s = (e, r) => u(e, "name", { value: r, configurable: !0 });
var z = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports), M = (e, r) => {
  for (var t in r)
    u(e, t, { get: r[t], enumerable: !0 });
}, T = (e, r, t, n) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let a of j(r))
      !E.call(e, a) && a !== t && u(e, a, { get: () => r[a], enumerable: !(n = $(r, a)) || n.enumerable });
  return e;
};
var N = (e, r, t) => (t = e != null ? _(C(e)) : {}, T(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  r || !e || !e.__esModule ? u(t, "default", { value: e, enumerable: !0 }) : t,
  e
)), I = (e) => T(u({}, "__esModule", { value: !0 }), e);

// ../node_modules/@ngard/tiny-isequal/index.js
var w = z((y) => {
  Object.defineProperty(y, "__esModule", { value: !0 }), y.isEqual = /* @__PURE__ */ function() {
    var e = Object.prototype.toString, r = Object.getPrototypeOf, t = Object.getOwnPropertySymbols ? function(n) {
      return Object.keys(n).concat(Object.getOwnPropertySymbols(n));
    } : Object.keys;
    return function(n, a) {
      return (/* @__PURE__ */ s(function d(o, i, p) {
        var c, f, l, A = e.call(o), O = e.call(i);
        if (o === i) return !0;
        if (o == null || i == null) return !1;
        if (p.indexOf(o) > -1 && p.indexOf(i) > -1) return !0;
        if (p.push(o, i), A != O || (c = t(o), f = t(i), c.length != f.length || c.some(function(R) {
          return !d(o[R], i[R], p);
        }))) return !1;
        switch (A.slice(8, -1)) {
          case "Symbol":
            return o.valueOf() == i.valueOf();
          case "Date":
          case "Number":
            return +o == +i || +o != +o && +i != +i;
          case "RegExp":
          case "Function":
          case "String":
          case "Boolean":
            return "" + o == "" + i;
          case "Set":
          case "Map":
            c = o.entries(), f = i.entries();
            do
              if (!d((l = c.next()).value, f.next().value, p)) return !1;
            while (!l.done);
            return !0;
          case "ArrayBuffer":
            o = new Uint8Array(o), i = new Uint8Array(i);
          case "DataView":
            o = new Uint8Array(o.buffer), i = new Uint8Array(i.buffer);
          case "Float32Array":
          case "Float64Array":
          case "Int8Array":
          case "Int16Array":
          case "Int32Array":
          case "Uint8Array":
          case "Uint16Array":
          case "Uint32Array":
          case "Uint8ClampedArray":
          case "Arguments":
          case "Array":
            if (o.length != i.length) return !1;
            for (l = 0; l < o.length; l++) if ((l in o || l in i) && (l in o != l in i || !d(o[l], i[l], p))) return !1;
            return !0;
          case "Object":
            return d(r(o), r(i), p);
          default:
            return !1;
        }
      }, "n"))(n, a, []);
    };
  }();
});

// src/csf/index.ts
var H = {};
M(H, {
  __definePreview: () => D,
  combineTags: () => W,
  includeConditionalArg: () => h,
  isExportStory: () => Z,
  isMeta: () => k,
  isPreview: () => B,
  isStory: () => G,
  parseKind: () => L,
  sanitize: () => P,
  storyNameFromExport: () => V,
  toId: () => J
});
module.exports = I(H);

// src/csf/toStartCaseStr.ts
function x(e) {
  return e.replace(/_/g, " ").replace(/-/g, " ").replace(/\./g, " ").replace(/([^\n])([A-Z])([a-z])/g, (r, t, n, a) => `${t} ${n}${a}`).replace(
  /([a-z])([A-Z])/g, (r, t, n) => `${t} ${n}`).replace(/([a-z])([0-9])/gi, (r, t, n) => `${t} ${n}`).replace(/([0-9])([a-z])/gi, (r, t, n) => `${t}\
 ${n}`).replace(/(\s|^)(\w)/g, (r, t, n) => `${t}${n.toUpperCase()}`).replace(/ +/g, " ").trim();
}
s(x, "toStartCaseStr");

// src/csf/includeConditionalArg.ts
var m = N(w(), 1);
var S = /* @__PURE__ */ s((e) => e.map((r) => typeof r < "u").filter(Boolean).length, "count"), U = /* @__PURE__ */ s((e, r) => {
  let { exists: t, eq: n, neq: a, truthy: d } = e;
  if (S([t, n, a, d]) > 1)
    throw new Error(`Invalid conditional test ${JSON.stringify({ exists: t, eq: n, neq: a })}`);
  if (typeof n < "u")
    return (0, m.isEqual)(r, n);
  if (typeof a < "u")
    return !(0, m.isEqual)(r, a);
  if (typeof t < "u") {
    let i = typeof r < "u";
    return t ? i : !i;
  }
  return (typeof d > "u" ? !0 : d) ? !!r : !r;
}, "testValue"), h = /* @__PURE__ */ s((e, r, t) => {
  if (!e.if)
    return !0;
  let { arg: n, global: a } = e.if;
  if (S([n, a]) !== 1)
    throw new Error(`Invalid conditional value ${JSON.stringify({ arg: n, global: a })}`);
  let d = n ? r[n] : t[a];
  return U(e.if, d);
}, "includeConditionalArg");

// src/csf/csf-factories.ts
var g = require("@storybook/core/preview-api");
function D(e) {
  let r, t = {
    _tag: "Preview",
    input: e,
    get composed() {
      if (r)
        return r;
      let { addons: n, ...a } = e;
      return r = (0, g.normalizeProjectAnnotations)((0, g.composeConfigs)([...n ?? [], a])), r;
    },
    meta(n) {
      return q(n, this);
    }
  };
  return globalThis.globalProjectAnnotations = t.composed, t;
}
s(D, "__definePreview");
function B(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Preview";
}
s(B, "isPreview");
function k(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Meta";
}
s(k, "isMeta");
function q(e, r) {
  return {
    _tag: "Meta",
    input: e,
    preview: r,
    get composed() {
      throw new Error("Not implemented");
    },
    story(t) {
      return F(t, this);
    }
  };
}
s(q, "defineMeta");
function F(e, r) {
  return {
    _tag: "Story",
    input: e,
    meta: r,
    get composed() {
      throw new Error("Not implemented");
    }
  };
}
s(F, "defineStory");
function G(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Story";
}
s(G, "isStory");

// src/csf/index.ts
var P = /* @__PURE__ */ s((e) => e.toLowerCase().replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "-").replace(/-+/g,
"-").replace(/^-+/, "").replace(/-+$/, ""), "sanitize"), b = /* @__PURE__ */ s((e, r) => {
  let t = P(e);
  if (t === "")
    throw new Error(`Invalid ${r} '${e}', must include alphanumeric characters`);
  return t;
}, "sanitizeSafe"), J = /* @__PURE__ */ s((e, r) => `${b(e, "kind")}${r ? `--${b(r, "name")}` : ""}`, "toId"), V = /* @__PURE__ */ s((e) => x(
e), "storyNameFromExport");
function v(e, r) {
  return Array.isArray(r) ? r.includes(e) : e.match(r);
}
s(v, "matches");
function Z(e, { includeStories: r, excludeStories: t }) {
  return (
    // https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs
    e !== "__esModule" && (!r || v(e, r)) && (!t || !v(e, t))
  );
}
s(Z, "isExportStory");
var L = /* @__PURE__ */ s((e, { rootSeparator: r, groupSeparator: t }) => {
  let [n, a] = e.split(r, 2), d = (a || e).split(t).filter((o) => !!o);
  return {
    root: a ? n : null,
    groups: d
  };
}, "parseKind"), W = /* @__PURE__ */ s((...e) => {
  let r = e.reduce((t, n) => (n.startsWith("!") ? t.delete(n.slice(1)) : t.add(n), t), /* @__PURE__ */ new Set());
  return Array.from(r);
}, "combineTags");
