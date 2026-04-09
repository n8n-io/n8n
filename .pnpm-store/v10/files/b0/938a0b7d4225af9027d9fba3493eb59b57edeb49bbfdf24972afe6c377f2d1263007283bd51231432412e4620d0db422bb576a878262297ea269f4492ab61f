var b = Object.create;
var f = Object.defineProperty;
var v = Object.getOwnPropertyDescriptor;
var P = Object.getOwnPropertyNames;
var O = Object.getPrototypeOf, _ = Object.prototype.hasOwnProperty;
var s = (e, r) => f(e, "name", { value: r, configurable: !0 });
var $ = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports);
var j = (e, r, t, n) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let a of P(r))
      !_.call(e, a) && a !== t && f(e, a, { get: () => r[a], enumerable: !(n = v(r, a)) || n.enumerable });
  return e;
};
var C = (e, r, t) => (t = e != null ? b(O(e)) : {}, j(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  r || !e || !e.__esModule ? f(t, "default", { value: e, enumerable: !0 }) : t,
  e
));

// ../node_modules/@ngard/tiny-isequal/index.js
var T = $((g) => {
  Object.defineProperty(g, "__esModule", { value: !0 }), g.isEqual = /* @__PURE__ */ function() {
    var e = Object.prototype.toString, r = Object.getPrototypeOf, t = Object.getOwnPropertySymbols ? function(n) {
      return Object.keys(n).concat(Object.getOwnPropertySymbols(n));
    } : Object.keys;
    return function(n, a) {
      return (/* @__PURE__ */ s(function d(o, i, p) {
        var c, u, l, m = e.call(o), h = e.call(i);
        if (o === i) return !0;
        if (o == null || i == null) return !1;
        if (p.indexOf(o) > -1 && p.indexOf(i) > -1) return !0;
        if (p.push(o, i), m != h || (c = t(o), u = t(i), c.length != u.length || c.some(function(A) {
          return !d(o[A], i[A], p);
        }))) return !1;
        switch (m.slice(8, -1)) {
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
            c = o.entries(), u = i.entries();
            do
              if (!d((l = c.next()).value, u.next().value, p)) return !1;
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

// src/csf/toStartCaseStr.ts
function R(e) {
  return e.replace(/_/g, " ").replace(/-/g, " ").replace(/\./g, " ").replace(/([^\n])([A-Z])([a-z])/g, (r, t, n, a) => `${t} ${n}${a}`).replace(
  /([a-z])([A-Z])/g, (r, t, n) => `${t} ${n}`).replace(/([a-z])([0-9])/gi, (r, t, n) => `${t} ${n}`).replace(/([0-9])([a-z])/gi, (r, t, n) => `${t}\
 ${n}`).replace(/(\s|^)(\w)/g, (r, t, n) => `${t}${n.toUpperCase()}`).replace(/ +/g, " ").trim();
}
s(R, "toStartCaseStr");

// src/csf/includeConditionalArg.ts
var y = C(T(), 1);
var x = /* @__PURE__ */ s((e) => e.map((r) => typeof r < "u").filter(Boolean).length, "count"), E = /* @__PURE__ */ s((e, r) => {
  let { exists: t, eq: n, neq: a, truthy: d } = e;
  if (x([t, n, a, d]) > 1)
    throw new Error(`Invalid conditional test ${JSON.stringify({ exists: t, eq: n, neq: a })}`);
  if (typeof n < "u")
    return (0, y.isEqual)(r, n);
  if (typeof a < "u")
    return !(0, y.isEqual)(r, a);
  if (typeof t < "u") {
    let i = typeof r < "u";
    return t ? i : !i;
  }
  return (typeof d > "u" ? !0 : d) ? !!r : !r;
}, "testValue"), z = /* @__PURE__ */ s((e, r, t) => {
  if (!e.if)
    return !0;
  let { arg: n, global: a } = e.if;
  if (x([n, a]) !== 1)
    throw new Error(`Invalid conditional value ${JSON.stringify({ arg: n, global: a })}`);
  let d = n ? r[n] : t[a];
  return E(e.if, d);
}, "includeConditionalArg");

// src/csf/csf-factories.ts
import { composeConfigs as M, normalizeProjectAnnotations as N } from "@storybook/core/preview-api";
function L(e) {
  let r, t = {
    _tag: "Preview",
    input: e,
    get composed() {
      if (r)
        return r;
      let { addons: n, ...a } = e;
      return r = N(M([...n ?? [], a])), r;
    },
    meta(n) {
      return I(n, this);
    }
  };
  return globalThis.globalProjectAnnotations = t.composed, t;
}
s(L, "__definePreview");
function W(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Preview";
}
s(W, "isPreview");
function H(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Meta";
}
s(H, "isMeta");
function I(e, r) {
  return {
    _tag: "Meta",
    input: e,
    preview: r,
    get composed() {
      throw new Error("Not implemented");
    },
    story(t) {
      return U(t, this);
    }
  };
}
s(I, "defineMeta");
function U(e, r) {
  return {
    _tag: "Story",
    input: e,
    meta: r,
    get composed() {
      throw new Error("Not implemented");
    }
  };
}
s(U, "defineStory");
function K(e) {
  return e != null && typeof e == "object" && "_tag" in e && e?._tag === "Story";
}
s(K, "isStory");

// src/csf/index.ts
var D = /* @__PURE__ */ s((e) => e.toLowerCase().replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "-").replace(/-+/g,
"-").replace(/^-+/, "").replace(/-+$/, ""), "sanitize"), w = /* @__PURE__ */ s((e, r) => {
  let t = D(e);
  if (t === "")
    throw new Error(`Invalid ${r} '${e}', must include alphanumeric characters`);
  return t;
}, "sanitizeSafe"), ee = /* @__PURE__ */ s((e, r) => `${w(e, "kind")}${r ? `--${w(r, "name")}` : ""}`, "toId"), re = /* @__PURE__ */ s((e) => R(
e), "storyNameFromExport");
function S(e, r) {
  return Array.isArray(r) ? r.includes(e) : e.match(r);
}
s(S, "matches");
function te(e, { includeStories: r, excludeStories: t }) {
  return (
    // https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs
    e !== "__esModule" && (!r || S(e, r)) && (!t || !S(e, t))
  );
}
s(te, "isExportStory");
var ne = /* @__PURE__ */ s((e, { rootSeparator: r, groupSeparator: t }) => {
  let [n, a] = e.split(r, 2), d = (a || e).split(t).filter((o) => !!o);
  return {
    root: a ? n : null,
    groups: d
  };
}, "parseKind"), oe = /* @__PURE__ */ s((...e) => {
  let r = e.reduce((t, n) => (n.startsWith("!") ? t.delete(n.slice(1)) : t.add(n), t), /* @__PURE__ */ new Set());
  return Array.from(r);
}, "combineTags");
export {
  L as __definePreview,
  oe as combineTags,
  z as includeConditionalArg,
  te as isExportStory,
  H as isMeta,
  W as isPreview,
  K as isStory,
  ne as parseKind,
  D as sanitize,
  re as storyNameFromExport,
  ee as toId
};
