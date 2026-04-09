"use strict";
var P = Object.defineProperty;
var Ee = Object.getOwnPropertyDescriptor;
var je = Object.getOwnPropertyNames;
var ke = Object.prototype.hasOwnProperty;
var o = (e, t) => P(e, "name", { value: t, configurable: !0 });
var Fe = (e, t) => {
  for (var r in t)
    P(e, r, { get: t[r], enumerable: !0 });
}, Je = (e, t, r, n) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let s of je(t))
      !ke.call(e, s) && s !== r && P(e, s, { get: () => t[s], enumerable: !(n = Ee(t, s)) || n.enumerable });
  return e;
};
var Ne = (e) => Je(P({}, "__esModule", { value: !0 }), e);

// src/docs-tools/index.ts
var Jt = {};
Fe(Jt, {
  ADDON_ID: () => K,
  MAX_DEFAULT_VALUE_SUMMARY_LENGTH: () => at,
  MAX_TYPE_SUMMARY_LENGTH: () => pt,
  PANEL_ID: () => wt,
  PARAM_KEY: () => Et,
  SNIPPET_RENDERED: () => jt,
  SourceType: () => Se,
  TypeSystem: () => te,
  convert: () => b,
  createSummaryValue: () => l,
  enhanceArgTypes: () => vt,
  extractComponentDescription: () => Ot,
  extractComponentProps: () => St,
  extractComponentSectionArray: () => Te,
  extractComponentSectionObject: () => he,
  getDocgenDescription: () => C,
  getDocgenSection: () => V,
  hasDocgen: () => R,
  hasDocsOrControls: () => Ft,
  isDefaultValueBlacklisted: () => d,
  isTooLongForDefaultValueSummary: () => q,
  isTooLongForTypeSummary: () => j,
  isValidDocgenSection: () => A,
  normalizeNewlines: () => ct,
  parseJsDoc: () => Y,
  str: () => N
});
module.exports = Ne(Jt);

// src/docs-tools/argTypes/convert/flow/convert.ts
var Q = require("@storybook/core/preview-errors");
var Re = /* @__PURE__ */ o((e) => e.name === "literal", "isLiteral"), Ae = /* @__PURE__ */ o((e) => e.value.replace(/['|"]/g, ""), "toEnumOp\
tion"), Ve = /* @__PURE__ */ o((e) => {
  switch (e.type) {
    case "function":
      return { name: "function" };
    case "object":
      let t = {};
      return e.signature.properties.forEach((r) => {
        t[r.key] = x(r.value);
      }), {
        name: "object",
        value: t
      };
    default:
      throw new Q.UnknownArgTypesError({ type: e, language: "Flow" });
  }
}, "convertSig"), x = /* @__PURE__ */ o((e) => {
  let { name: t, raw: r } = e, n = {};
  switch (typeof r < "u" && (n.raw = r), e.name) {
    case "literal":
      return { ...n, name: "other", value: e.value };
    case "string":
    case "number":
    case "symbol":
    case "boolean":
      return { ...n, name: t };
    case "Array":
      return { ...n, name: "array", value: e.elements.map(x) };
    case "signature":
      return { ...n, ...Ve(e) };
    case "union":
      return e.elements?.every(Re) ? { ...n, name: "enum", value: e.elements?.map(Ae) } : { ...n, name: t, value: e.elements?.map(x) };
    case "intersection":
      return { ...n, name: t, value: e.elements?.map(x) };
    default:
      return { ...n, name: "other", value: t };
  }
}, "convert");

// ../node_modules/es-toolkit/dist/object/mapValues.mjs
function J(e, t) {
  let r = {}, n = Object.keys(e);
  for (let s = 0; s < n.length; s++) {
    let i = n[s], p = e[i];
    r[i] = t(p, i, e);
  }
  return r;
}
o(J, "mapValues");

// src/docs-tools/argTypes/convert/utils.ts
var Z = /^['"]|['"]$/g, Ce = /* @__PURE__ */ o((e) => e.replace(Z, ""), "trimQuotes"), _e = /* @__PURE__ */ o((e) => Z.test(e), "includesQuo\
tes"), S = /* @__PURE__ */ o((e) => {
  let t = Ce(e);
  return _e(e) || Number.isNaN(Number(t)) ? t : Number(t);
}, "parseLiteral");

// src/docs-tools/argTypes/convert/proptypes/convert.ts
var Be = /^\(.*\) => /, D = /* @__PURE__ */ o((e) => {
  let { name: t, raw: r, computed: n, value: s } = e, i = {};
  switch (typeof r < "u" && (i.raw = r), t) {
    case "enum": {
      let a = n ? s : s.map((c) => S(c.value));
      return { ...i, name: t, value: a };
    }
    case "string":
    case "number":
    case "symbol":
      return { ...i, name: t };
    case "func":
      return { ...i, name: "function" };
    case "bool":
    case "boolean":
      return { ...i, name: "boolean" };
    case "arrayOf":
    case "array":
      return { ...i, name: "array", value: s && D(s) };
    case "object":
      return { ...i, name: t };
    case "objectOf":
      return { ...i, name: t, value: D(s) };
    case "shape":
    case "exact":
      let p = J(s, (a) => D(a));
      return { ...i, name: "object", value: p };
    case "union":
      return { ...i, name: "union", value: s.map((a) => D(a)) };
    case "instanceOf":
    case "element":
    case "elementType":
    default: {
      if (t?.indexOf("|") > 0)
        try {
          let u = t.split("|").map((m) => JSON.parse(m));
          return { ...i, name: "enum", value: u };
        } catch {
        }
      let a = s ? `${t}(${s})` : t, c = Be.test(t) ? "function" : "other";
      return { ...i, name: c, value: a };
    }
  }
}, "convert");

// src/docs-tools/argTypes/convert/typescript/convert.ts
var ee = require("@storybook/core/preview-errors");
var Ie = /* @__PURE__ */ o((e) => {
  switch (e.type) {
    case "function":
      return { name: "function" };
    case "object":
      let t = {};
      return e.signature.properties.forEach((r) => {
        t[r.key] = T(r.value);
      }), {
        name: "object",
        value: t
      };
    default:
      throw new ee.UnknownArgTypesError({ type: e, language: "Typescript" });
  }
}, "convertSig"), T = /* @__PURE__ */ o((e) => {
  let { name: t, raw: r } = e, n = {};
  switch (typeof r < "u" && (n.raw = r), e.name) {
    case "string":
    case "number":
    case "symbol":
    case "boolean":
      return { ...n, name: t };
    case "Array":
      return { ...n, name: "array", value: e.elements.map(T) };
    case "signature":
      return { ...n, ...Ie(e) };
    case "union":
      let s;
      return e.elements?.every((i) => i.name === "literal") ? s = {
        ...n,
        name: "enum",
        // @ts-expect-error fix types
        value: e.elements?.map((i) => S(i.value))
      } : s = { ...n, name: t, value: e.elements?.map(T) }, s;
    case "intersection":
      return { ...n, name: t, value: e.elements?.map(T) };
    default:
      return { ...n, name: "other", value: t };
  }
}, "convert");

// src/docs-tools/argTypes/convert/index.ts
var b = /* @__PURE__ */ o((e) => {
  let { type: t, tsType: r, flowType: n } = e;
  try {
    if (t != null)
      return D(t);
    if (r != null)
      return T(r);
    if (n != null)
      return x(n);
  } catch (s) {
    console.error(s);
  }
  return null;
}, "convert");

// src/docs-tools/argTypes/docgen/types.ts
var te = /* @__PURE__ */ ((s) => (s.JAVASCRIPT = "JavaScript", s.FLOW = "Flow", s.TYPESCRIPT = "TypeScript", s.UNKNOWN = "Unknown", s))(te ||
{});

// src/docs-tools/argTypes/docgen/utils/defaultValue.ts
var Le = ["null", "undefined"];
function d(e) {
  return Le.some((t) => t === e);
}
o(d, "isDefaultValueBlacklisted");

// src/docs-tools/argTypes/docgen/utils/string.ts
var N = /* @__PURE__ */ o((e) => {
  if (!e)
    return "";
  if (typeof e == "string")
    return e;
  throw new Error(`Description: expected string, got: ${JSON.stringify(e)}`);
}, "str");

// src/docs-tools/argTypes/docgen/utils/docgenInfo.ts
function R(e) {
  return !!e.__docgenInfo;
}
o(R, "hasDocgen");
function A(e) {
  return e != null && Object.keys(e).length > 0;
}
o(A, "isValidDocgenSection");
function V(e, t) {
  return R(e) ? e.__docgenInfo[t] : null;
}
o(V, "getDocgenSection");
function C(e) {
  return R(e) ? N(e.__docgenInfo.description) : "";
}
o(C, "getDocgenDescription");

// ../node_modules/comment-parser/es6/primitives.js
var f;
(function(e) {
  e.start = "/**", e.nostart = "/***", e.delim = "*", e.end = "*/";
})(f = f || (f = {}));

// ../node_modules/comment-parser/es6/util.js
function _(e) {
  return /^\s+$/.test(e);
}
o(_, "isSpace");
function re(e) {
  let t = e.match(/\r+$/);
  return t == null ? ["", e] : [e.slice(-t[0].length), e.slice(0, -t[0].length)];
}
o(re, "splitCR");
function y(e) {
  let t = e.match(/^\s+/);
  return t == null ? ["", e] : [e.slice(0, t[0].length), e.slice(t[0].length)];
}
o(y, "splitSpace");
function oe(e) {
  return e.split(/\n/);
}
o(oe, "splitLines");
function ne(e = {}) {
  return Object.assign({ tag: "", name: "", type: "", optional: !1, description: "", problems: [], source: [] }, e);
}
o(ne, "seedSpec");
function B(e = {}) {
  return Object.assign({ start: "", delimiter: "", postDelimiter: "", tag: "", postTag: "", name: "", postName: "", type: "", postType: "", description: "",
  end: "", lineEnd: "" }, e);
}
o(B, "seedTokens");

// ../node_modules/comment-parser/es6/parser/block-parser.js
var Ue = /^@\S+/;
function I({ fence: e = "```" } = {}) {
  let t = We(e), r = /* @__PURE__ */ o((n, s) => t(n) ? !s : s, "toggleFence");
  return /* @__PURE__ */ o(function(s) {
    let i = [[]], p = !1;
    for (let a of s)
      Ue.test(a.tokens.description) && !p ? i.push([a]) : i[i.length - 1].push(a), p = r(a.tokens.description, p);
    return i;
  }, "parseBlock");
}
o(I, "getParser");
function We(e) {
  return typeof e == "string" ? (t) => t.split(e).length % 2 === 0 : e;
}
o(We, "getFencer");

// ../node_modules/comment-parser/es6/parser/source-parser.js
function L({ startLine: e = 0, markers: t = f } = {}) {
  let r = null, n = e;
  return /* @__PURE__ */ o(function(i) {
    let p = i, a = B();
    if ([a.lineEnd, p] = re(p), [a.start, p] = y(p), r === null && p.startsWith(t.start) && !p.startsWith(t.nostart) && (r = [], a.delimiter =
    p.slice(0, t.start.length), p = p.slice(t.start.length), [a.postDelimiter, p] = y(p)), r === null)
      return n++, null;
    let c = p.trimRight().endsWith(t.end);
    if (a.delimiter === "" && p.startsWith(t.delim) && !p.startsWith(t.end) && (a.delimiter = t.delim, p = p.slice(t.delim.length), [a.postDelimiter,
    p] = y(p)), c) {
      let u = p.trimRight();
      a.end = p.slice(u.length - t.end.length), p = u.slice(0, -t.end.length);
    }
    if (a.description = p, r.push({ number: n, source: i, tokens: a }), n++, c) {
      let u = r.slice();
      return r = null, u;
    }
    return null;
  }, "parseSource");
}
o(L, "getParser");

// ../node_modules/comment-parser/es6/parser/spec-parser.js
function U({ tokenizers: e }) {
  return /* @__PURE__ */ o(function(r) {
    var n;
    let s = ne({ source: r });
    for (let i of e)
      if (s = i(s), !((n = s.problems[s.problems.length - 1]) === null || n === void 0) && n.critical)
        break;
    return s;
  }, "parseSpec");
}
o(U, "getParser");

// ../node_modules/comment-parser/es6/parser/tokenizers/tag.js
function O() {
  return (e) => {
    let { tokens: t } = e.source[0], r = t.description.match(/\s*(@(\S+))(\s*)/);
    return r === null ? (e.problems.push({
      code: "spec:tag:prefix",
      message: 'tag should start with "@" symbol',
      line: e.source[0].number,
      critical: !0
    }), e) : (t.tag = r[1], t.postTag = r[3], t.description = t.description.slice(r[0].length), e.tag = r[2], e);
  };
}
o(O, "tagTokenizer");

// ../node_modules/comment-parser/es6/parser/tokenizers/type.js
function v(e = "compact") {
  let t = ze(e);
  return (r) => {
    let n = 0, s = [];
    for (let [a, { tokens: c }] of r.source.entries()) {
      let u = "";
      if (a === 0 && c.description[0] !== "{")
        return r;
      for (let m of c.description)
        if (m === "{" && n++, m === "}" && n--, u += m, n === 0)
          break;
      if (s.push([c, u]), n === 0)
        break;
    }
    if (n !== 0)
      return r.problems.push({
        code: "spec:type:unpaired-curlies",
        message: "unpaired curlies",
        line: r.source[0].number,
        critical: !0
      }), r;
    let i = [], p = s[0][0].postDelimiter.length;
    for (let [a, [c, u]] of s.entries())
      c.type = u, a > 0 && (c.type = c.postDelimiter.slice(p) + u, c.postDelimiter = c.postDelimiter.slice(0, p)), [c.postType, c.description] =
      y(c.description.slice(u.length)), i.push(c.type);
    return i[0] = i[0].slice(1), i[i.length - 1] = i[i.length - 1].slice(0, -1), r.type = t(i), r;
  };
}
o(v, "typeTokenizer");
var Me = /* @__PURE__ */ o((e) => e.trim(), "trim");
function ze(e) {
  return e === "compact" ? (t) => t.map(Me).join("") : e === "preserve" ? (t) => t.join(`
`) : e;
}
o(ze, "getJoiner");

// ../node_modules/comment-parser/es6/parser/tokenizers/name.js
var $e = /* @__PURE__ */ o((e) => e && e.startsWith('"') && e.endsWith('"'), "isQuoted");
function w() {
  let e = /* @__PURE__ */ o((t, { tokens: r }, n) => r.type === "" ? t : n, "typeEnd");
  return (t) => {
    let { tokens: r } = t.source[t.source.reduce(e, 0)], n = r.description.trimLeft(), s = n.split('"');
    if (s.length > 1 && s[0] === "" && s.length % 2 === 1)
      return t.name = s[1], r.name = `"${s[1]}"`, [r.postName, r.description] = y(n.slice(r.name.length)), t;
    let i = 0, p = "", a = !1, c;
    for (let m of n) {
      if (i === 0 && _(m))
        break;
      m === "[" && i++, m === "]" && i--, p += m;
    }
    if (i !== 0)
      return t.problems.push({
        code: "spec:name:unpaired-brackets",
        message: "unpaired brackets",
        line: t.source[0].number,
        critical: !0
      }), t;
    let u = p;
    if (p[0] === "[" && p[p.length - 1] === "]") {
      a = !0, p = p.slice(1, -1);
      let m = p.split("=");
      if (p = m[0].trim(), m[1] !== void 0 && (c = m.slice(1).join("=").trim()), p === "")
        return t.problems.push({
          code: "spec:name:empty-name",
          message: "empty name",
          line: t.source[0].number,
          critical: !0
        }), t;
      if (c === "")
        return t.problems.push({
          code: "spec:name:empty-default",
          message: "empty default value",
          line: t.source[0].number,
          critical: !0
        }), t;
      if (!$e(c) && /=(?!>)/.test(c))
        return t.problems.push({
          code: "spec:name:invalid-default",
          message: "invalid default value syntax",
          line: t.source[0].number,
          critical: !0
        }), t;
    }
    return t.optional = a, t.name = p, r.name = u, c !== void 0 && (t.default = c), [r.postName, r.description] = y(n.slice(r.name.length)),
    t;
  };
}
o(w, "nameTokenizer");

// ../node_modules/comment-parser/es6/parser/tokenizers/description.js
function E(e = "compact", t = f) {
  let r = W(e);
  return (n) => (n.description = r(n.source, t), n);
}
o(E, "descriptionTokenizer");
function W(e) {
  return e === "compact" ? Ye : e === "preserve" ? Ke : e;
}
o(W, "getJoiner");
function Ye(e, t = f) {
  return e.map(({ tokens: { description: r } }) => r.trim()).filter((r) => r !== "").join(" ");
}
o(Ye, "compactJoiner");
var qe = /* @__PURE__ */ o((e, { tokens: t }, r) => t.type === "" ? e : r, "lineNo"), Ge = /* @__PURE__ */ o(({ tokens: e }) => (e.delimiter ===
"" ? e.start : e.postDelimiter.slice(1)) + e.description, "getDescription");
function Ke(e, t = f) {
  if (e.length === 0)
    return "";
  e[0].tokens.description === "" && e[0].tokens.delimiter === t.start && (e = e.slice(1));
  let r = e[e.length - 1];
  return r !== void 0 && r.tokens.description === "" && r.tokens.end.endsWith(t.end) && (e = e.slice(0, -1)), e = e.slice(e.reduce(qe, 0)), e.
  map(Ge).join(`
`);
}
o(Ke, "preserveJoiner");

// ../node_modules/comment-parser/es6/parser/index.js
function M({ startLine: e = 0, fence: t = "```", spacing: r = "compact", markers: n = f, tokenizers: s = [
  O(),
  v(r),
  w(),
  E(r)
] } = {}) {
  if (e < 0 || e % 1 > 0)
    throw new Error("Invalid startLine");
  let i = L({ startLine: e, markers: n }), p = I({ fence: t }), a = U({ tokenizers: s }), c = W(r);
  return function(u) {
    let m = [];
    for (let Oe of oe(u)) {
      let F = i(Oe);
      if (F === null)
        continue;
      let X = p(F), H = X.slice(1).map(a);
      m.push({
        description: c(X[0], n),
        tags: H,
        source: F,
        problems: H.reduce((ve, we) => ve.concat(we.problems), [])
      });
    }
    return m;
  };
}
o(M, "getParser");

// ../node_modules/comment-parser/es6/stringifier/index.js
function Xe(e) {
  return e.start + e.delimiter + e.postDelimiter + e.tag + e.postTag + e.type + e.postType + e.name + e.postName + e.description + e.end + e.
  lineEnd;
}
o(Xe, "join");
function z() {
  return (e) => e.source.map(({ tokens: t }) => Xe(t)).join(`
`);
}
o(z, "getStringifier");

// ../node_modules/comment-parser/es6/stringifier/inspect.js
var He = {
  line: 0,
  start: 0,
  delimiter: 0,
  postDelimiter: 0,
  tag: 0,
  postTag: 0,
  name: 0,
  postName: 0,
  type: 0,
  postType: 0,
  description: 0,
  end: 0,
  lineEnd: 0
};
var ro = Object.keys(He);

// ../node_modules/comment-parser/es6/index.js
function se(e, t = {}) {
  return M(t)(e);
}
o(se, "parse");
var Oo = z();

// src/docs-tools/argTypes/jsdocParser.ts
var h = require("jsdoc-type-pratt-parser");
function Qe(e) {
  return e != null && e.includes("@");
}
o(Qe, "containsJsDoc");
function Ze(e) {
  let n = `/**
` + (e ?? "").split(`
`).map((i) => ` * ${i}`).join(`
`) + `
*/`, s = se(n, {
    spacing: "preserve"
  });
  if (!s || s.length === 0)
    throw new Error("Cannot parse JSDoc tags.");
  return s[0];
}
o(Ze, "parse");
var et = {
  tags: ["param", "arg", "argument", "returns", "ignore", "deprecated"]
}, Y = /* @__PURE__ */ o((e, t = et) => {
  if (!Qe(e))
    return {
      includesJsDoc: !1,
      ignore: !1
    };
  let r = Ze(e), n = tt(r, t.tags);
  return n.ignore ? {
    includesJsDoc: !0,
    ignore: !0
  } : {
    includesJsDoc: !0,
    ignore: !1,
    // Always use the parsed description to ensure JSDoc is removed from the description.
    description: r.description.trim(),
    extractedTags: n
  };
}, "parseJsDoc");
function tt(e, t) {
  let r = {
    params: null,
    deprecated: null,
    returns: null,
    ignore: !1
  };
  for (let n of e.tags)
    if (!(t !== void 0 && !t.includes(n.tag)))
      if (n.tag === "ignore") {
        r.ignore = !0;
        break;
      } else
        switch (n.tag) {
          // arg & argument are aliases for param.
          case "param":
          case "arg":
          case "argument": {
            let s = ot(n);
            s != null && (r.params == null && (r.params = []), r.params.push(s));
            break;
          }
          case "deprecated": {
            let s = nt(n);
            s != null && (r.deprecated = s);
            break;
          }
          case "returns": {
            let s = st(n);
            s != null && (r.returns = s);
            break;
          }
          default:
            break;
        }
  return r;
}
o(tt, "extractJsDocTags");
function rt(e) {
  return e.replace(/[\.-]$/, "");
}
o(rt, "normaliseParamName");
function ot(e) {
  if (!e.name || e.name === "-")
    return null;
  let t = ae(e.type);
  return {
    name: e.name,
    type: t,
    description: pe(e.description),
    getPrettyName: /* @__PURE__ */ o(() => rt(e.name), "getPrettyName"),
    getTypeName: /* @__PURE__ */ o(() => t ? ce(t) : null, "getTypeName")
  };
}
o(ot, "extractParam");
function nt(e) {
  return e.name ? ie(e.name, e.description) : null;
}
o(nt, "extractDeprecated");
function ie(e, t) {
  let r = e === "" ? t : `${e} ${t}`;
  return pe(r);
}
o(ie, "joinNameAndDescription");
function pe(e) {
  let t = e.replace(/^- /g, "").trim();
  return t === "" ? null : t;
}
o(pe, "normaliseDescription");
function st(e) {
  let t = ae(e.type);
  return t ? {
    type: t,
    description: ie(e.name, e.description),
    getTypeName: /* @__PURE__ */ o(() => ce(t), "getTypeName")
  } : null;
}
o(st, "extractReturns");
var g = (0, h.stringifyRules)(), it = g.JsdocTypeObject;
g.JsdocTypeAny = () => "any";
g.JsdocTypeObject = (e, t) => `(${it(e, t)})`;
g.JsdocTypeOptional = (e, t) => t(e.element);
g.JsdocTypeNullable = (e, t) => t(e.element);
g.JsdocTypeNotNullable = (e, t) => t(e.element);
g.JsdocTypeUnion = (e, t) => e.elements.map(t).join("|");
function ae(e) {
  try {
    return (0, h.parse)(e, "typescript");
  } catch {
    return null;
  }
}
o(ae, "extractType");
function ce(e) {
  return (0, h.transform)(g, e);
}
o(ce, "extractTypeName");

// src/docs-tools/argTypes/utils.ts
var pt = 90, at = 50;
function j(e) {
  return e.length > 90;
}
o(j, "isTooLongForTypeSummary");
function q(e) {
  return e.length > 50;
}
o(q, "isTooLongForDefaultValueSummary");
function l(e, t) {
  return e === t ? { summary: e } : { summary: e, detail: t };
}
o(l, "createSummaryValue");
var ct = /* @__PURE__ */ o((e) => e.replace(/\\r\\n/g, "\\n"), "normalizeNewlines");

// src/docs-tools/argTypes/docgen/flow/createDefaultValue.ts
function le(e, t) {
  if (e != null) {
    let { value: r } = e;
    if (!d(r))
      return q(r) ? l(t?.name, r) : l(r);
  }
  return null;
}
o(le, "createDefaultValue");

// src/docs-tools/argTypes/docgen/flow/createType.ts
function ue({ name: e, value: t, elements: r, raw: n }) {
  return t ?? (r != null ? r.map(ue).join(" | ") : n ?? e);
}
o(ue, "generateUnionElement");
function lt({ name: e, raw: t, elements: r }) {
  return r != null ? l(r.map(ue).join(" | ")) : t != null ? l(t.replace(/^\|\s*/, "")) : l(e);
}
o(lt, "generateUnion");
function ut({ type: e, raw: t }) {
  return t != null ? l(t) : l(e);
}
o(ut, "generateFuncSignature");
function mt({ type: e, raw: t }) {
  return t != null ? j(t) ? l(e, t) : l(t) : l(e);
}
o(mt, "generateObjectSignature");
function ft(e) {
  let { type: t } = e;
  return t === "object" ? mt(e) : ut(e);
}
o(ft, "generateSignature");
function yt({ name: e, raw: t }) {
  return t != null ? j(t) ? l(e, t) : l(t) : l(e);
}
o(yt, "generateDefault");
function me(e) {
  if (e == null)
    return null;
  switch (e.name) {
    case "union":
      return lt(e);
    case "signature":
      return ft(e);
    default:
      return yt(e);
  }
}
o(me, "createType");

// src/docs-tools/argTypes/docgen/flow/createPropDef.ts
var fe = /* @__PURE__ */ o((e, t) => {
  let { flowType: r, description: n, required: s, defaultValue: i } = t;
  return {
    name: e,
    type: me(r),
    required: s,
    description: n,
    defaultValue: le(i ?? null, r ?? null)
  };
}, "createFlowPropDef");

// src/docs-tools/argTypes/docgen/typeScript/createDefaultValue.ts
function ye({ defaultValue: e }) {
  if (e != null) {
    let { value: t } = e;
    if (!d(t))
      return l(t);
  }
  return null;
}
o(ye, "createDefaultValue");

// src/docs-tools/argTypes/docgen/typeScript/createType.ts
function ge({ tsType: e, required: t }) {
  if (e == null)
    return null;
  let r = e.name;
  return t || (r = r.replace(" | undefined", "")), l(
    ["Array", "Record", "signature"].includes(e.name) ? e.raw : r
  );
}
o(ge, "createType");

// src/docs-tools/argTypes/docgen/typeScript/createPropDef.ts
var de = /* @__PURE__ */ o((e, t) => {
  let { description: r, required: n } = t;
  return {
    name: e,
    type: ge(t),
    required: n,
    description: r,
    defaultValue: ye(t)
  };
}, "createTsPropDef");

// src/docs-tools/argTypes/docgen/createPropDef.ts
function gt(e) {
  return e != null ? l(e.name) : null;
}
o(gt, "createType");
function dt(e) {
  let { computed: t, func: r } = e;
  return typeof t > "u" && typeof r > "u";
}
o(dt, "isReactDocgenTypescript");
function xt(e) {
  return e ? e.name === "string" ? !0 : e.name === "enum" ? Array.isArray(e.value) && e.value.every(
    ({ value: t }) => typeof t == "string" && t[0] === '"' && t[t.length - 1] === '"'
  ) : !1 : !1;
}
o(xt, "isStringValued");
function Dt(e, t) {
  if (e != null) {
    let { value: r } = e;
    if (!d(r))
      return dt(e) && xt(t) ? l(JSON.stringify(r)) : l(r);
  }
  return null;
}
o(Dt, "createDefaultValue");
function xe(e, t, r) {
  let { description: n, required: s, defaultValue: i } = r;
  return {
    name: e,
    type: gt(t),
    required: s,
    description: n,
    defaultValue: Dt(i, t)
  };
}
o(xe, "createBasicPropDef");
function k(e, t) {
  if (t?.includesJsDoc) {
    let { description: r, extractedTags: n } = t;
    r != null && (e.description = t.description);
    let s = {
      ...n,
      params: n?.params?.map(
        (i) => ({
          name: i.getPrettyName(),
          description: i.description
        })
      )
    };
    Object.values(s).filter(Boolean).length > 0 && (e.jsDocTags = s);
  }
  return e;
}
o(k, "applyJsDocResult");
var Tt = /* @__PURE__ */ o((e, t, r) => {
  let n = xe(e, t.type, t);
  return n.sbType = b(t), k(n, r);
}, "javaScriptFactory"), ht = /* @__PURE__ */ o((e, t, r) => {
  let n = de(e, t);
  return n.sbType = b(t), k(n, r);
}, "tsFactory"), bt = /* @__PURE__ */ o((e, t, r) => {
  let n = fe(e, t);
  return n.sbType = b(t), k(n, r);
}, "flowFactory"), Pt = /* @__PURE__ */ o((e, t, r) => {
  let n = xe(e, { name: "unknown" }, t);
  return k(n, r);
}, "unknownFactory"), G = /* @__PURE__ */ o((e) => {
  switch (e) {
    case "JavaScript":
      return Tt;
    case "TypeScript":
      return ht;
    case "Flow":
      return bt;
    default:
      return Pt;
  }
}, "getPropDefFactory");

// src/docs-tools/argTypes/docgen/extractDocgenProps.ts
var De = /* @__PURE__ */ o((e) => e.type != null ? "JavaScript" : e.flowType != null ? "Flow" : e.tsType != null ? "TypeScript" : "Unknown",
"getTypeSystem"), Te = /* @__PURE__ */ o((e) => {
  let t = De(e[0]), r = G(t);
  return e.map((n) => {
    let s = n;
    return n.type?.elements && (s = {
      ...n,
      type: {
        ...n.type,
        value: n.type.elements
      }
    }), be(s.name, s, t, r);
  });
}, "extractComponentSectionArray"), he = /* @__PURE__ */ o((e) => {
  let t = Object.keys(e), r = De(e[t[0]]), n = G(r);
  return t.map((s) => {
    let i = e[s];
    return i != null ? be(s, i, r, n) : null;
  }).filter(Boolean);
}, "extractComponentSectionObject"), St = /* @__PURE__ */ o((e, t) => {
  let r = V(e, t);
  return A(r) ? Array.isArray(r) ? Te(r) : he(r) : [];
}, "extractComponentProps");
function be(e, t, r, n) {
  let s = Y(t.description);
  return s.includesJsDoc && s.ignore ? null : {
    propDef: n(e, t, s),
    jsDocTags: s.extractedTags,
    docgenInfo: t,
    typeSystem: r
  };
}
o(be, "extractProp");
function Ot(e) {
  return e != null ? C(e) : "";
}
o(Ot, "extractComponentDescription");

// src/docs-tools/argTypes/enhanceArgTypes.ts
var Pe = require("@storybook/core/preview-api");
var vt = /* @__PURE__ */ o((e) => {
  let {
    component: t,
    argTypes: r,
    parameters: { docs: n = {} }
  } = e, { extractArgTypes: s } = n, i = s && t ? s(t) : {};
  return i ? (0, Pe.combineParameters)(i, r) : r;
}, "enhanceArgTypes");

// src/docs-tools/shared.ts
var K = "storybook/docs", wt = `${K}/panel`, Et = "docs", jt = `${K}/snippet-rendered`, Se = /* @__PURE__ */ ((n) => (n.AUTO = "auto", n.CODE =
"code", n.DYNAMIC = "dynamic", n))(Se || {});

// src/docs-tools/hasDocsOrControls.ts
var kt = /(addons\/|addon-|addon-essentials\/)(docs|controls)/, Ft = /* @__PURE__ */ o((e) => e.presetsList?.some((t) => kt.test(t.name)), "\
hasDocsOrControls");
