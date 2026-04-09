var De = Object.defineProperty;
var o = (e, t) => De(e, "name", { value: t, configurable: !0 });

// src/docs-tools/argTypes/convert/flow/convert.ts
import { UnknownArgTypesError as Te } from "@storybook/core/preview-errors";
var he = /* @__PURE__ */ o((e) => e.name === "literal", "isLiteral"), be = /* @__PURE__ */ o((e) => e.value.replace(/['|"]/g, ""), "toEnumOp\
tion"), Pe = /* @__PURE__ */ o((e) => {
  switch (e.type) {
    case "function":
      return { name: "function" };
    case "object":
      let t = {};
      return e.signature.properties.forEach((r) => {
        t[r.key] = d(r.value);
      }), {
        name: "object",
        value: t
      };
    default:
      throw new Te({ type: e, language: "Flow" });
  }
}, "convertSig"), d = /* @__PURE__ */ o((e) => {
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
      return { ...n, name: "array", value: e.elements.map(d) };
    case "signature":
      return { ...n, ...Pe(e) };
    case "union":
      return e.elements?.every(he) ? { ...n, name: "enum", value: e.elements?.map(be) } : { ...n, name: t, value: e.elements?.map(d) };
    case "intersection":
      return { ...n, name: t, value: e.elements?.map(d) };
    default:
      return { ...n, name: "other", value: t };
  }
}, "convert");

// ../node_modules/es-toolkit/dist/object/mapValues.mjs
function j(e, t) {
  let r = {}, n = Object.keys(e);
  for (let s = 0; s < n.length; s++) {
    let i = n[s], p = e[i];
    r[i] = t(p, i, e);
  }
  return r;
}
o(j, "mapValues");

// src/docs-tools/argTypes/convert/utils.ts
var W = /^['"]|['"]$/g, Se = /* @__PURE__ */ o((e) => e.replace(W, ""), "trimQuotes"), Oe = /* @__PURE__ */ o((e) => W.test(e), "includesQuo\
tes"), h = /* @__PURE__ */ o((e) => {
  let t = Se(e);
  return Oe(e) || Number.isNaN(Number(t)) ? t : Number(t);
}, "parseLiteral");

// src/docs-tools/argTypes/convert/proptypes/convert.ts
var ve = /^\(.*\) => /, x = /* @__PURE__ */ o((e) => {
  let { name: t, raw: r, computed: n, value: s } = e, i = {};
  switch (typeof r < "u" && (i.raw = r), t) {
    case "enum": {
      let a = n ? s : s.map((c) => h(c.value));
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
      return { ...i, name: "array", value: s && x(s) };
    case "object":
      return { ...i, name: t };
    case "objectOf":
      return { ...i, name: t, value: x(s) };
    case "shape":
    case "exact":
      let p = j(s, (a) => x(a));
      return { ...i, name: "object", value: p };
    case "union":
      return { ...i, name: "union", value: s.map((a) => x(a)) };
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
      let a = s ? `${t}(${s})` : t, c = ve.test(t) ? "function" : "other";
      return { ...i, name: c, value: a };
    }
  }
}, "convert");

// src/docs-tools/argTypes/convert/typescript/convert.ts
import { UnknownArgTypesError as we } from "@storybook/core/preview-errors";
var Ee = /* @__PURE__ */ o((e) => {
  switch (e.type) {
    case "function":
      return { name: "function" };
    case "object":
      let t = {};
      return e.signature.properties.forEach((r) => {
        t[r.key] = D(r.value);
      }), {
        name: "object",
        value: t
      };
    default:
      throw new we({ type: e, language: "Typescript" });
  }
}, "convertSig"), D = /* @__PURE__ */ o((e) => {
  let { name: t, raw: r } = e, n = {};
  switch (typeof r < "u" && (n.raw = r), e.name) {
    case "string":
    case "number":
    case "symbol":
    case "boolean":
      return { ...n, name: t };
    case "Array":
      return { ...n, name: "array", value: e.elements.map(D) };
    case "signature":
      return { ...n, ...Ee(e) };
    case "union":
      let s;
      return e.elements?.every((i) => i.name === "literal") ? s = {
        ...n,
        name: "enum",
        // @ts-expect-error fix types
        value: e.elements?.map((i) => h(i.value))
      } : s = { ...n, name: t, value: e.elements?.map(D) }, s;
    case "intersection":
      return { ...n, name: t, value: e.elements?.map(D) };
    default:
      return { ...n, name: "other", value: t };
  }
}, "convert");

// src/docs-tools/argTypes/convert/index.ts
var b = /* @__PURE__ */ o((e) => {
  let { type: t, tsType: r, flowType: n } = e;
  try {
    if (t != null)
      return x(t);
    if (r != null)
      return D(r);
    if (n != null)
      return d(n);
  } catch (s) {
    console.error(s);
  }
  return null;
}, "convert");

// src/docs-tools/argTypes/docgen/types.ts
var je = /* @__PURE__ */ ((s) => (s.JAVASCRIPT = "JavaScript", s.FLOW = "Flow", s.TYPESCRIPT = "TypeScript", s.UNKNOWN = "Unknown", s))(je ||
{});

// src/docs-tools/argTypes/docgen/utils/defaultValue.ts
var ke = ["null", "undefined"];
function T(e) {
  return ke.some((t) => t === e);
}
o(T, "isDefaultValueBlacklisted");

// src/docs-tools/argTypes/docgen/utils/string.ts
var M = /* @__PURE__ */ o((e) => {
  if (!e)
    return "";
  if (typeof e == "string")
    return e;
  throw new Error(`Description: expected string, got: ${JSON.stringify(e)}`);
}, "str");

// src/docs-tools/argTypes/docgen/utils/docgenInfo.ts
function z(e) {
  return !!e.__docgenInfo;
}
o(z, "hasDocgen");
function $(e) {
  return e != null && Object.keys(e).length > 0;
}
o($, "isValidDocgenSection");
function Y(e, t) {
  return z(e) ? e.__docgenInfo[t] : null;
}
o(Y, "getDocgenSection");
function q(e) {
  return z(e) ? M(e.__docgenInfo.description) : "";
}
o(q, "getDocgenDescription");

// ../node_modules/comment-parser/es6/primitives.js
var f;
(function(e) {
  e.start = "/**", e.nostart = "/***", e.delim = "*", e.end = "*/";
})(f = f || (f = {}));

// ../node_modules/comment-parser/es6/util.js
function k(e) {
  return /^\s+$/.test(e);
}
o(k, "isSpace");
function G(e) {
  let t = e.match(/\r+$/);
  return t == null ? ["", e] : [e.slice(-t[0].length), e.slice(0, -t[0].length)];
}
o(G, "splitCR");
function y(e) {
  let t = e.match(/^\s+/);
  return t == null ? ["", e] : [e.slice(0, t[0].length), e.slice(t[0].length)];
}
o(y, "splitSpace");
function K(e) {
  return e.split(/\n/);
}
o(K, "splitLines");
function X(e = {}) {
  return Object.assign({ tag: "", name: "", type: "", optional: !1, description: "", problems: [], source: [] }, e);
}
o(X, "seedSpec");
function F(e = {}) {
  return Object.assign({ start: "", delimiter: "", postDelimiter: "", tag: "", postTag: "", name: "", postName: "", type: "", postType: "", description: "",
  end: "", lineEnd: "" }, e);
}
o(F, "seedTokens");

// ../node_modules/comment-parser/es6/parser/block-parser.js
var Fe = /^@\S+/;
function J({ fence: e = "```" } = {}) {
  let t = Je(e), r = /* @__PURE__ */ o((n, s) => t(n) ? !s : s, "toggleFence");
  return /* @__PURE__ */ o(function(s) {
    let i = [[]], p = !1;
    for (let a of s)
      Fe.test(a.tokens.description) && !p ? i.push([a]) : i[i.length - 1].push(a), p = r(a.tokens.description, p);
    return i;
  }, "parseBlock");
}
o(J, "getParser");
function Je(e) {
  return typeof e == "string" ? (t) => t.split(e).length % 2 === 0 : e;
}
o(Je, "getFencer");

// ../node_modules/comment-parser/es6/parser/source-parser.js
function N({ startLine: e = 0, markers: t = f } = {}) {
  let r = null, n = e;
  return /* @__PURE__ */ o(function(i) {
    let p = i, a = F();
    if ([a.lineEnd, p] = G(p), [a.start, p] = y(p), r === null && p.startsWith(t.start) && !p.startsWith(t.nostart) && (r = [], a.delimiter =
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
o(N, "getParser");

// ../node_modules/comment-parser/es6/parser/spec-parser.js
function R({ tokenizers: e }) {
  return /* @__PURE__ */ o(function(r) {
    var n;
    let s = X({ source: r });
    for (let i of e)
      if (s = i(s), !((n = s.problems[s.problems.length - 1]) === null || n === void 0) && n.critical)
        break;
    return s;
  }, "parseSpec");
}
o(R, "getParser");

// ../node_modules/comment-parser/es6/parser/tokenizers/tag.js
function P() {
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
o(P, "tagTokenizer");

// ../node_modules/comment-parser/es6/parser/tokenizers/type.js
function S(e = "compact") {
  let t = Re(e);
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
o(S, "typeTokenizer");
var Ne = /* @__PURE__ */ o((e) => e.trim(), "trim");
function Re(e) {
  return e === "compact" ? (t) => t.map(Ne).join("") : e === "preserve" ? (t) => t.join(`
`) : e;
}
o(Re, "getJoiner");

// ../node_modules/comment-parser/es6/parser/tokenizers/name.js
var Ae = /* @__PURE__ */ o((e) => e && e.startsWith('"') && e.endsWith('"'), "isQuoted");
function O() {
  let e = /* @__PURE__ */ o((t, { tokens: r }, n) => r.type === "" ? t : n, "typeEnd");
  return (t) => {
    let { tokens: r } = t.source[t.source.reduce(e, 0)], n = r.description.trimLeft(), s = n.split('"');
    if (s.length > 1 && s[0] === "" && s.length % 2 === 1)
      return t.name = s[1], r.name = `"${s[1]}"`, [r.postName, r.description] = y(n.slice(r.name.length)), t;
    let i = 0, p = "", a = !1, c;
    for (let m of n) {
      if (i === 0 && k(m))
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
      if (!Ae(c) && /=(?!>)/.test(c))
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
o(O, "nameTokenizer");

// ../node_modules/comment-parser/es6/parser/tokenizers/description.js
function v(e = "compact", t = f) {
  let r = A(e);
  return (n) => (n.description = r(n.source, t), n);
}
o(v, "descriptionTokenizer");
function A(e) {
  return e === "compact" ? Ve : e === "preserve" ? Be : e;
}
o(A, "getJoiner");
function Ve(e, t = f) {
  return e.map(({ tokens: { description: r } }) => r.trim()).filter((r) => r !== "").join(" ");
}
o(Ve, "compactJoiner");
var Ce = /* @__PURE__ */ o((e, { tokens: t }, r) => t.type === "" ? e : r, "lineNo"), _e = /* @__PURE__ */ o(({ tokens: e }) => (e.delimiter ===
"" ? e.start : e.postDelimiter.slice(1)) + e.description, "getDescription");
function Be(e, t = f) {
  if (e.length === 0)
    return "";
  e[0].tokens.description === "" && e[0].tokens.delimiter === t.start && (e = e.slice(1));
  let r = e[e.length - 1];
  return r !== void 0 && r.tokens.description === "" && r.tokens.end.endsWith(t.end) && (e = e.slice(0, -1)), e = e.slice(e.reduce(Ce, 0)), e.
  map(_e).join(`
`);
}
o(Be, "preserveJoiner");

// ../node_modules/comment-parser/es6/parser/index.js
function V({ startLine: e = 0, fence: t = "```", spacing: r = "compact", markers: n = f, tokenizers: s = [
  P(),
  S(r),
  O(),
  v(r)
] } = {}) {
  if (e < 0 || e % 1 > 0)
    throw new Error("Invalid startLine");
  let i = N({ startLine: e, markers: n }), p = J({ fence: t }), a = R({ tokenizers: s }), c = A(r);
  return function(u) {
    let m = [];
    for (let ge of K(u)) {
      let E = i(ge);
      if (E === null)
        continue;
      let L = p(E), U = L.slice(1).map(a);
      m.push({
        description: c(L[0], n),
        tags: U,
        source: E,
        problems: U.reduce((de, xe) => de.concat(xe.problems), [])
      });
    }
    return m;
  };
}
o(V, "getParser");

// ../node_modules/comment-parser/es6/stringifier/index.js
function Ie(e) {
  return e.start + e.delimiter + e.postDelimiter + e.tag + e.postTag + e.type + e.postType + e.name + e.postName + e.description + e.end + e.
  lineEnd;
}
o(Ie, "join");
function C() {
  return (e) => e.source.map(({ tokens: t }) => Ie(t)).join(`
`);
}
o(C, "getStringifier");

// ../node_modules/comment-parser/es6/stringifier/inspect.js
var Le = {
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
var Mr = Object.keys(Le);

// ../node_modules/comment-parser/es6/index.js
function H(e, t = {}) {
  return V(t)(e);
}
o(H, "parse");
var lo = C();

// src/docs-tools/argTypes/jsdocParser.ts
import {
  parse as Ue,
  stringifyRules as We,
  transform as Me
} from "jsdoc-type-pratt-parser";
function ze(e) {
  return e != null && e.includes("@");
}
o(ze, "containsJsDoc");
function $e(e) {
  let n = `/**
` + (e ?? "").split(`
`).map((i) => ` * ${i}`).join(`
`) + `
*/`, s = H(n, {
    spacing: "preserve"
  });
  if (!s || s.length === 0)
    throw new Error("Cannot parse JSDoc tags.");
  return s[0];
}
o($e, "parse");
var Ye = {
  tags: ["param", "arg", "argument", "returns", "ignore", "deprecated"]
}, Q = /* @__PURE__ */ o((e, t = Ye) => {
  if (!ze(e))
    return {
      includesJsDoc: !1,
      ignore: !1
    };
  let r = $e(e), n = qe(r, t.tags);
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
function qe(e, t) {
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
            let s = Ke(n);
            s != null && (r.params == null && (r.params = []), r.params.push(s));
            break;
          }
          case "deprecated": {
            let s = Xe(n);
            s != null && (r.deprecated = s);
            break;
          }
          case "returns": {
            let s = He(n);
            s != null && (r.returns = s);
            break;
          }
          default:
            break;
        }
  return r;
}
o(qe, "extractJsDocTags");
function Ge(e) {
  return e.replace(/[\.-]$/, "");
}
o(Ge, "normaliseParamName");
function Ke(e) {
  if (!e.name || e.name === "-")
    return null;
  let t = te(e.type);
  return {
    name: e.name,
    type: t,
    description: ee(e.description),
    getPrettyName: /* @__PURE__ */ o(() => Ge(e.name), "getPrettyName"),
    getTypeName: /* @__PURE__ */ o(() => t ? re(t) : null, "getTypeName")
  };
}
o(Ke, "extractParam");
function Xe(e) {
  return e.name ? Z(e.name, e.description) : null;
}
o(Xe, "extractDeprecated");
function Z(e, t) {
  let r = e === "" ? t : `${e} ${t}`;
  return ee(r);
}
o(Z, "joinNameAndDescription");
function ee(e) {
  let t = e.replace(/^- /g, "").trim();
  return t === "" ? null : t;
}
o(ee, "normaliseDescription");
function He(e) {
  let t = te(e.type);
  return t ? {
    type: t,
    description: Z(e.name, e.description),
    getTypeName: /* @__PURE__ */ o(() => re(t), "getTypeName")
  } : null;
}
o(He, "extractReturns");
var g = We(), Qe = g.JsdocTypeObject;
g.JsdocTypeAny = () => "any";
g.JsdocTypeObject = (e, t) => `(${Qe(e, t)})`;
g.JsdocTypeOptional = (e, t) => t(e.element);
g.JsdocTypeNullable = (e, t) => t(e.element);
g.JsdocTypeNotNullable = (e, t) => t(e.element);
g.JsdocTypeUnion = (e, t) => e.elements.map(t).join("|");
function te(e) {
  try {
    return Ue(e, "typescript");
  } catch {
    return null;
  }
}
o(te, "extractType");
function re(e) {
  return Me(g, e);
}
o(re, "extractTypeName");

// src/docs-tools/argTypes/utils.ts
var ho = 90, bo = 50;
function B(e) {
  return e.length > 90;
}
o(B, "isTooLongForTypeSummary");
function oe(e) {
  return e.length > 50;
}
o(oe, "isTooLongForDefaultValueSummary");
function l(e, t) {
  return e === t ? { summary: e } : { summary: e, detail: t };
}
o(l, "createSummaryValue");
var Po = /* @__PURE__ */ o((e) => e.replace(/\\r\\n/g, "\\n"), "normalizeNewlines");

// src/docs-tools/argTypes/docgen/flow/createDefaultValue.ts
function ne(e, t) {
  if (e != null) {
    let { value: r } = e;
    if (!T(r))
      return oe(r) ? l(t?.name, r) : l(r);
  }
  return null;
}
o(ne, "createDefaultValue");

// src/docs-tools/argTypes/docgen/flow/createType.ts
function se({ name: e, value: t, elements: r, raw: n }) {
  return t ?? (r != null ? r.map(se).join(" | ") : n ?? e);
}
o(se, "generateUnionElement");
function Ze({ name: e, raw: t, elements: r }) {
  return r != null ? l(r.map(se).join(" | ")) : t != null ? l(t.replace(/^\|\s*/, "")) : l(e);
}
o(Ze, "generateUnion");
function et({ type: e, raw: t }) {
  return t != null ? l(t) : l(e);
}
o(et, "generateFuncSignature");
function tt({ type: e, raw: t }) {
  return t != null ? B(t) ? l(e, t) : l(t) : l(e);
}
o(tt, "generateObjectSignature");
function rt(e) {
  let { type: t } = e;
  return t === "object" ? tt(e) : et(e);
}
o(rt, "generateSignature");
function ot({ name: e, raw: t }) {
  return t != null ? B(t) ? l(e, t) : l(t) : l(e);
}
o(ot, "generateDefault");
function ie(e) {
  if (e == null)
    return null;
  switch (e.name) {
    case "union":
      return Ze(e);
    case "signature":
      return rt(e);
    default:
      return ot(e);
  }
}
o(ie, "createType");

// src/docs-tools/argTypes/docgen/flow/createPropDef.ts
var pe = /* @__PURE__ */ o((e, t) => {
  let { flowType: r, description: n, required: s, defaultValue: i } = t;
  return {
    name: e,
    type: ie(r),
    required: s,
    description: n,
    defaultValue: ne(i ?? null, r ?? null)
  };
}, "createFlowPropDef");

// src/docs-tools/argTypes/docgen/typeScript/createDefaultValue.ts
function ae({ defaultValue: e }) {
  if (e != null) {
    let { value: t } = e;
    if (!T(t))
      return l(t);
  }
  return null;
}
o(ae, "createDefaultValue");

// src/docs-tools/argTypes/docgen/typeScript/createType.ts
function ce({ tsType: e, required: t }) {
  if (e == null)
    return null;
  let r = e.name;
  return t || (r = r.replace(" | undefined", "")), l(
    ["Array", "Record", "signature"].includes(e.name) ? e.raw : r
  );
}
o(ce, "createType");

// src/docs-tools/argTypes/docgen/typeScript/createPropDef.ts
var le = /* @__PURE__ */ o((e, t) => {
  let { description: r, required: n } = t;
  return {
    name: e,
    type: ce(t),
    required: n,
    description: r,
    defaultValue: ae(t)
  };
}, "createTsPropDef");

// src/docs-tools/argTypes/docgen/createPropDef.ts
function nt(e) {
  return e != null ? l(e.name) : null;
}
o(nt, "createType");
function st(e) {
  let { computed: t, func: r } = e;
  return typeof t > "u" && typeof r > "u";
}
o(st, "isReactDocgenTypescript");
function it(e) {
  return e ? e.name === "string" ? !0 : e.name === "enum" ? Array.isArray(e.value) && e.value.every(
    ({ value: t }) => typeof t == "string" && t[0] === '"' && t[t.length - 1] === '"'
  ) : !1 : !1;
}
o(it, "isStringValued");
function pt(e, t) {
  if (e != null) {
    let { value: r } = e;
    if (!T(r))
      return st(e) && it(t) ? l(JSON.stringify(r)) : l(r);
  }
  return null;
}
o(pt, "createDefaultValue");
function ue(e, t, r) {
  let { description: n, required: s, defaultValue: i } = r;
  return {
    name: e,
    type: nt(t),
    required: s,
    description: n,
    defaultValue: pt(i, t)
  };
}
o(ue, "createBasicPropDef");
function w(e, t) {
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
o(w, "applyJsDocResult");
var at = /* @__PURE__ */ o((e, t, r) => {
  let n = ue(e, t.type, t);
  return n.sbType = b(t), w(n, r);
}, "javaScriptFactory"), ct = /* @__PURE__ */ o((e, t, r) => {
  let n = le(e, t);
  return n.sbType = b(t), w(n, r);
}, "tsFactory"), lt = /* @__PURE__ */ o((e, t, r) => {
  let n = pe(e, t);
  return n.sbType = b(t), w(n, r);
}, "flowFactory"), ut = /* @__PURE__ */ o((e, t, r) => {
  let n = ue(e, { name: "unknown" }, t);
  return w(n, r);
}, "unknownFactory"), I = /* @__PURE__ */ o((e) => {
  switch (e) {
    case "JavaScript":
      return at;
    case "TypeScript":
      return ct;
    case "Flow":
      return lt;
    default:
      return ut;
  }
}, "getPropDefFactory");

// src/docs-tools/argTypes/docgen/extractDocgenProps.ts
var me = /* @__PURE__ */ o((e) => e.type != null ? "JavaScript" : e.flowType != null ? "Flow" : e.tsType != null ? "TypeScript" : "Unknown",
"getTypeSystem"), mt = /* @__PURE__ */ o((e) => {
  let t = me(e[0]), r = I(t);
  return e.map((n) => {
    let s = n;
    return n.type?.elements && (s = {
      ...n,
      type: {
        ...n.type,
        value: n.type.elements
      }
    }), fe(s.name, s, t, r);
  });
}, "extractComponentSectionArray"), ft = /* @__PURE__ */ o((e) => {
  let t = Object.keys(e), r = me(e[t[0]]), n = I(r);
  return t.map((s) => {
    let i = e[s];
    return i != null ? fe(s, i, r, n) : null;
  }).filter(Boolean);
}, "extractComponentSectionObject"), on = /* @__PURE__ */ o((e, t) => {
  let r = Y(e, t);
  return $(r) ? Array.isArray(r) ? mt(r) : ft(r) : [];
}, "extractComponentProps");
function fe(e, t, r, n) {
  let s = Q(t.description);
  return s.includesJsDoc && s.ignore ? null : {
    propDef: n(e, t, s),
    jsDocTags: s.extractedTags,
    docgenInfo: t,
    typeSystem: r
  };
}
o(fe, "extractProp");
function nn(e) {
  return e != null ? q(e) : "";
}
o(nn, "extractComponentDescription");

// src/docs-tools/argTypes/enhanceArgTypes.ts
import { combineParameters as yt } from "@storybook/core/preview-api";
var cn = /* @__PURE__ */ o((e) => {
  let {
    component: t,
    argTypes: r,
    parameters: { docs: n = {} }
  } = e, { extractArgTypes: s } = n, i = s && t ? s(t) : {};
  return i ? yt(i, r) : r;
}, "enhanceArgTypes");

// src/docs-tools/shared.ts
var ye = "storybook/docs", mn = `${ye}/panel`, fn = "docs", yn = `${ye}/snippet-rendered`, gt = /* @__PURE__ */ ((n) => (n.AUTO = "auto", n.
CODE = "code", n.DYNAMIC = "dynamic", n))(gt || {});

// src/docs-tools/hasDocsOrControls.ts
var dt = /(addons\/|addon-|addon-essentials\/)(docs|controls)/, dn = /* @__PURE__ */ o((e) => e.presetsList?.some((t) => dt.test(t.name)), "\
hasDocsOrControls");
export {
  ye as ADDON_ID,
  bo as MAX_DEFAULT_VALUE_SUMMARY_LENGTH,
  ho as MAX_TYPE_SUMMARY_LENGTH,
  mn as PANEL_ID,
  fn as PARAM_KEY,
  yn as SNIPPET_RENDERED,
  gt as SourceType,
  je as TypeSystem,
  b as convert,
  l as createSummaryValue,
  cn as enhanceArgTypes,
  nn as extractComponentDescription,
  on as extractComponentProps,
  mt as extractComponentSectionArray,
  ft as extractComponentSectionObject,
  q as getDocgenDescription,
  Y as getDocgenSection,
  z as hasDocgen,
  dn as hasDocsOrControls,
  T as isDefaultValueBlacklisted,
  oe as isTooLongForDefaultValueSummary,
  B as isTooLongForTypeSummary,
  $ as isValidDocgenSection,
  Po as normalizeNewlines,
  Q as parseJsDoc,
  M as str
};
