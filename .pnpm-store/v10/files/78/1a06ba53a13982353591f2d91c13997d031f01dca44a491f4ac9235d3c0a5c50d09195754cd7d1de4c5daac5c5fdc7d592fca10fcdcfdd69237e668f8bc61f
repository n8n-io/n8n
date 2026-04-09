import ESM_COMPAT_Module from "node:module";
import { fileURLToPath as ESM_COMPAT_fileURLToPath } from 'node:url';
import { dirname as ESM_COMPAT_dirname } from 'node:path';
const __filename = ESM_COMPAT_fileURLToPath(import.meta.url);
const __dirname = ESM_COMPAT_dirname(__filename);
const require = ESM_COMPAT_Module.createRequire(import.meta.url);
var ke = Object.create;
var G = Object.defineProperty;
var Ve = Object.getOwnPropertyDescriptor;
var Ae = Object.getOwnPropertyNames;
var $e = Object.getPrototypeOf, Re = Object.prototype.hasOwnProperty;
var p = (s, e) => G(s, "name", { value: e, configurable: !0 });
var Le = (s, e) => () => (e || s((e = { exports: {} }).exports, e), e.exports);
var Me = (s, e, i, t) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let r of Ae(e))
      !Re.call(s, r) && r !== i && G(s, r, { get: () => e[r], enumerable: !(t = Ve(e, r)) || t.enumerable });
  return s;
};
var M = (s, e, i) => (i = s != null ? ke($e(s)) : {}, Me(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !s || !s.__esModule ? G(i, "default", { value: s, enumerable: !0 }) : i,
  s
));

// ../node_modules/ts-dedent/dist/index.js
var k = Le((T) => {
  "use strict";
  Object.defineProperty(T, "__esModule", { value: !0 });
  T.dedent = void 0;
  function ie(s) {
    for (var e = [], i = 1; i < arguments.length; i++)
      e[i - 1] = arguments[i];
    var t = Array.from(typeof s == "string" ? [s] : s);
    t[t.length - 1] = t[t.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var r = t.reduce(function(l, f) {
      var m = f.match(/\n([\t ]+|(?!\s).)/g);
      return m ? l.concat(m.map(function(g) {
        var x, b;
        return (b = (x = g.match(/[\t ]/g)) === null || x === void 0 ? void 0 : x.length) !== null && b !== void 0 ? b : 0;
      })) : l;
    }, []);
    if (r.length) {
      var o = new RegExp(`
[	 ]{` + Math.min.apply(Math, r) + "}", "g");
      t = t.map(function(l) {
        return l.replace(o, `
`);
      });
    }
    t[0] = t[0].replace(/^\r?\n/, "");
    var a = t[0];
    return e.forEach(function(l, f) {
      var m = a.match(/(?:^|\n)( *)$/), g = m ? m[1] : "", x = l;
      typeof l == "string" && l.includes(`
`) && (x = String(l).split(`
`).map(function(b, y) {
        return y === 0 ? b : "" + g + b;
      }).join(`
`)), a += x + t[f + 1];
    }), a;
  }
  p(ie, "dedent");
  T.dedent = ie;
  T.default = ie;
});

// src/csf-tools/CsfFile.ts
var O = M(k(), 1);
import { readFile as Ue, writeFile as qe } from "node:fs/promises";
import {
  BabelFileClass as Be,
  babelParse as pe,
  generate as We,
  recast as fe,
  types as c,
  traverse as Ge
} from "@storybook/core/babel";
import { isExportStory as se, storyNameFromExport as ne, toId as ze } from "@storybook/core/csf";

// src/csf-tools/findVarInitialization.ts
import { types as V } from "@storybook/core/babel";
var P = /* @__PURE__ */ p((s, e) => {
  let i = null, t = null;
  return e.body.find((r) => (V.isVariableDeclaration(r) ? t = r.declarations : V.isExportNamedDeclaration(r) && V.isVariableDeclaration(r.declaration) &&
  (t = r.declaration.declarations), t && t.find((o) => V.isVariableDeclarator(o) && V.isIdentifier(o.id) && o.id.name === s ? (i = o.init, !0) :
  !1))), i;
}, "findVarInitialization");

// src/csf-tools/CsfFile.ts
var oe = console, Xe = /\/preview(.(js|jsx|mjs|ts|tsx))?$/, Ke = /* @__PURE__ */ p((s) => Xe.test(s), "isValidPreviewPath");
function Je(s) {
  if (c.isArrayExpression(s))
    return s.elements.map((e) => {
      if (c.isStringLiteral(e))
        return e.value;
      throw new Error(`Expected string literal: ${e}`);
    });
  if (c.isStringLiteral(s))
    return new RegExp(s.value);
  if (c.isRegExpLiteral(s))
    return new RegExp(s.pattern, s.flags);
  throw new Error(`Unknown include/exclude: ${s}`);
}
p(Je, "parseIncludeExclude");
function ae(s) {
  if (!c.isArrayExpression(s))
    throw new Error("CSF: Expected tags array");
  return s.elements.map((e) => {
    if (c.isStringLiteral(e))
      return e.value;
    throw new Error("CSF: Expected tag to be string literal");
  });
}
p(ae, "parseTags");
var I = /* @__PURE__ */ p((s, e) => {
  let i = "";
  if (s.loc) {
    let { line: t, column: r } = s.loc?.start || {};
    i = `(line ${t}, col ${r})`;
  }
  return `${e || ""} ${i}`.trim();
}, "formatLocation"), Qe = /* @__PURE__ */ p((s) => Ze.test(s), "isModuleMock"), le = /* @__PURE__ */ p((s, e, i) => {
  let t = s;
  if (c.isCallExpression(s)) {
    let { callee: r, arguments: o } = s;
    if (c.isProgram(e) && c.isMemberExpression(r) && c.isIdentifier(r.object) && c.isIdentifier(r.property) && r.property.name === "bind" &&
    (o.length === 0 || o.length === 1 && c.isObjectExpression(o[0]) && o[0].properties.length === 0)) {
      let a = r.object.name, l = P(a, e);
      l && (i._templates[a] = l, t = l);
    }
  }
  return c.isArrowFunctionExpression(t) || c.isFunctionDeclaration(t) ? t.params.length > 0 : !1;
}, "isArgsStory"), He = /* @__PURE__ */ p((s) => {
  if (c.isArrayExpression(s))
    return s.elements.map((e) => {
      if (c.isStringLiteral(e))
        return e.value;
      throw new Error(`Expected string literal named export: ${e}`);
    });
  throw new Error(`Expected array of string literals: ${s}`);
}, "parseExportsOrder"), ce = /* @__PURE__ */ p((s, e) => e.reduce(
  (i, t) => {
    let r = s[t];
    return r && (i[t] = r), i;
  },
  {}
), "sortExports"), Ye = /* @__PURE__ */ p((s) => {
  if (c.isArrowFunctionExpression(s) || c.isFunctionDeclaration(s)) {
    let e = s.params;
    if (e.length >= 1) {
      let [i] = e;
      if (c.isObjectPattern(i))
        return !!i.properties.find((t) => {
          if (c.isObjectProperty(t) && c.isIdentifier(t.key))
            return t.key.name === "mount";
        });
    }
  }
  return !1;
}, "hasMount"), Ze = /^[.\/#].*\.mock($|\.[^.]*$)/i, U = class extends Error {
  static {
    p(this, "NoMetaError");
  }
  constructor(e, i, t) {
    let r = "".trim();
    super(O.dedent`
      CSF: ${e} ${I(i, t)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, z = class extends Error {
  static {
    p(this, "MultipleMetaError");
  }
  constructor(e, i, t) {
    let r = `${e} ${I(i, t)}`.trim();
    super(O.dedent`
      CSF: ${e} ${I(i, t)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, q = class extends Error {
  static {
    p(this, "MixedFactoryError");
  }
  constructor(e, i, t) {
    let r = `${e} ${I(i, t)}`.trim();
    super(O.dedent`
      CSF: ${e} ${I(i, t)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, B = class extends Error {
  static {
    p(this, "BadMetaError");
  }
  constructor(e, i, t) {
    let r = "".trim();
    super(O.dedent`
      CSF: ${e} ${I(i, t)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, X = class {
  constructor(e, i, t) {
    this._stories = {};
    this._metaAnnotations = {};
    this._storyExports = {};
    this._storyPaths = {};
    this._storyStatements = {};
    this._storyAnnotations = {};
    this._templates = {};
    this._ast = e, this._file = t, this._options = i, this.imports = [];
  }
  static {
    p(this, "CsfFile");
  }
  /** @deprecated Use `_options.fileName` instead */
  get _fileName() {
    return this._options.fileName;
  }
  /** @deprecated Use `_options.makeTitle` instead */
  get _makeTitle() {
    return this._options.makeTitle;
  }
  _parseTitle(e) {
    let i = c.isIdentifier(e) ? P(e.name, this._ast.program) : e;
    if (c.isStringLiteral(i))
      return i.value;
    if (c.isTSSatisfiesExpression(i) && c.isStringLiteral(i.expression))
      return i.expression.value;
    throw new Error(O.dedent`
      CSF: unexpected dynamic title ${I(i, this._options.fileName)}

      More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#string-literal-titles
    `);
  }
  _parseMeta(e, i) {
    if (this._metaNode)
      throw new z("multiple meta objects", e, this._options.fileName);
    this._metaNode = e;
    let t = {};
    e.properties.forEach((r) => {
      if (c.isIdentifier(r.key)) {
        if (this._metaAnnotations[r.key.name] = r.value, r.key.name === "title")
          t.title = this._parseTitle(r.value);
        else if (["includeStories", "excludeStories"].includes(r.key.name))
          t[r.key.name] = Je(r.value);
        else if (r.key.name === "component") {
          let o = r.value;
          if (c.isIdentifier(o)) {
            let l = o.name, f = i.body.find(
              (m) => c.isImportDeclaration(m) && m.specifiers.find((g) => g.local.name === l)
            );
            if (f) {
              let { source: m } = f;
              c.isStringLiteral(m) && (this._rawComponentPath = m.value);
            }
          }
          let { code: a } = fe.print(r.value, {});
          t.component = a;
        } else if (r.key.name === "tags") {
          let o = r.value;
          c.isIdentifier(o) && (o = P(o.name, this._ast.program)), t.tags = ae(o);
        } else if (r.key.name === "id")
          if (c.isStringLiteral(r.value))
            t.id = r.value.value;
          else
            throw new Error(`Unexpected component id: ${r.value}`);
      }
    }), this._meta = t;
  }
  getStoryExport(e) {
    let i = this._storyExports[e];
    if (i = c.isVariableDeclarator(i) ? i.init : i, c.isCallExpression(i)) {
      let { callee: t, arguments: r } = i;
      if (c.isMemberExpression(t) && c.isIdentifier(t.object) && c.isIdentifier(t.property) && t.property.name === "bind" && (r.length === 0 ||
      r.length === 1 && c.isObjectExpression(r[0]) && r[0].properties.length === 0)) {
        let { name: o } = t.object;
        i = this._templates[o];
      }
    }
    return i;
  }
  parse() {
    let e = this;
    if (Ge(this._ast, {
      ExportDefaultDeclaration: {
        enter(t) {
          let { node: r, parent: o } = t, a = c.isIdentifier(r.declaration) && c.isProgram(o);
          if (e._options.transformInlineMeta && !a && c.isExpression(r.declaration)) {
            let m = t.scope.generateUidIdentifier("meta");
            e._metaVariableName = m.name;
            let g = [
              c.variableDeclaration("const", [c.variableDeclarator(m, r.declaration)]),
              c.exportDefaultDeclaration(m)
            ];
            g.forEach((x) => x.loc = t.node.loc), t.replaceWithMultiple(g);
            return;
          }
          let l, f;
          if (a) {
            let m = r.declaration.name;
            e._metaVariableName = m;
            let g = /* @__PURE__ */ p((x) => c.isIdentifier(x.id) && x.id.name === m, "isVariableDeclarator");
            e._metaStatement = e._ast.program.body.find(
              (x) => c.isVariableDeclaration(x) && x.declarations.find(g)
            ), f = (e?._metaStatement?.declarations || []).find(
              g
            )?.init;
          } else
            e._metaStatement = r, f = r.declaration;
          if (c.isObjectExpression(f) ? l = f : (
            // export default { ... } as Meta<...>
            (c.isTSAsExpression(f) || c.isTSSatisfiesExpression(f)) && c.isObjectExpression(f.expression) && (l = f.expression)
          ), l && c.isProgram(o) && e._parseMeta(l, o), e._metaStatement && !e._metaNode)
            throw new U(
              "default export must be an object",
              e._metaStatement,
              e._options.fileName
            );
          e._metaPath = t;
        }
      },
      ExportNamedDeclaration: {
        enter(t) {
          let { node: r, parent: o } = t, a;
          c.isVariableDeclaration(r.declaration) ? a = r.declaration.declarations.filter((l) => c.isVariableDeclarator(l)) : c.isFunctionDeclaration(
          r.declaration) && (a = [r.declaration]), a ? a.forEach((l) => {
            if (c.isIdentifier(l.id)) {
              let f = !1, { name: m } = l.id;
              if (m === "__namedExportsOrder" && c.isVariableDeclarator(l)) {
                e._namedExportsOrder = He(l.init);
                return;
              }
              e._storyExports[m] = l, e._storyPaths[m] = t, e._storyStatements[m] = r;
              let g = ne(m);
              e._storyAnnotations[m] ? oe.warn(
                `Unexpected annotations for "${m}" before story declaration`
              ) : e._storyAnnotations[m] = {};
              let x;
              if (c.isVariableDeclarator(l) ? x = c.isTSAsExpression(l.init) || c.isTSSatisfiesExpression(l.init) ? l.init.expression : l.init :
              x = l, c.isCallExpression(x) && c.isMemberExpression(x.callee) && c.isIdentifier(x.callee.property) && x.callee.property.name ===
              "story" && (f = !0, x = x.arguments[0]), e._metaIsFactory && !f)
                throw new q(
                  "expected factory story",
                  x,
                  e._options.fileName
                );
              if (!e._metaIsFactory && f)
                throw e._metaNode ? new q(
                  "expected non-factory story",
                  x,
                  e._options.fileName
                ) : new B(
                  "meta() factory must be imported from .storybook/preview configuration",
                  x,
                  e._options.fileName
                );
              let b = {};
              c.isObjectExpression(x) ? (b.__isArgsStory = !0, x.properties.forEach((y) => {
                if (c.isIdentifier(y.key)) {
                  if (y.key.name === "render")
                    b.__isArgsStory = le(
                      y.value,
                      o,
                      e
                    );
                  else if (y.key.name === "name" && c.isStringLiteral(y.value))
                    g = y.value.value;
                  else if (y.key.name === "storyName" && c.isStringLiteral(y.value))
                    oe.warn(
                      `Unexpected usage of "storyName" in "${m}". Please use "name" instead.`
                    );
                  else if (y.key.name === "parameters" && c.isObjectExpression(y.value)) {
                    let h = y.value.properties.find(
                      (D) => c.isObjectProperty(D) && c.isIdentifier(D.key) && D.key.name === "__id"
                    );
                    h && (b.__id = h.value.value);
                  }
                  e._storyAnnotations[m][y.key.name] = y.value;
                }
              })) : b.__isArgsStory = le(x, o, e), e._stories[m] = {
                id: "FIXME",
                name: g,
                parameters: b,
                __stats: {
                  factory: f
                }
              };
            }
          }) : r.specifiers.length > 0 && r.specifiers.forEach((l) => {
            if (c.isExportSpecifier(l) && c.isIdentifier(l.exported)) {
              let { name: f } = l.exported, { name: m } = l.local, g = c.isProgram(o) ? P(l.local.name, o) : l.local;
              if (f === "default") {
                let x;
                c.isObjectExpression(g) ? x = g : (
                  // export default { ... } as Meta<...>
                  c.isTSAsExpression(g) && c.isObjectExpression(g.expression) && (x = g.expression)
                ), x && c.isProgram(o) && e._parseMeta(x, o);
              } else
                e._storyAnnotations[f] = {}, e._storyStatements[f] = g, e._storyPaths[f] = t, e._stories[f] = {
                  id: "FIXME",
                  name: f,
                  localName: m,
                  parameters: {},
                  __stats: {}
                };
            }
          });
        }
      },
      ExpressionStatement: {
        enter({ node: t, parent: r }) {
          let { expression: o } = t;
          if (c.isProgram(r) && c.isAssignmentExpression(o) && c.isMemberExpression(o.left) && c.isIdentifier(o.left.object) && c.isIdentifier(
          o.left.property)) {
            let a = o.left.object.name, l = o.left.property.name, f = o.right;
            if (e._storyAnnotations[a] && (l === "story" && c.isObjectExpression(f) ? f.properties.forEach((m) => {
              c.isIdentifier(m.key) && (e._storyAnnotations[a][m.key.name] = m.value);
            }) : e._storyAnnotations[a][l] = f), l === "storyName" && c.isStringLiteral(f)) {
              let m = f.value, g = e._stories[a];
              if (!g)
                return;
              g.name = m;
            }
          }
        }
      },
      CallExpression: {
        enter(t) {
          let { node: r } = t, { callee: o } = r;
          if (c.isIdentifier(o) && o.name === "storiesOf")
            throw new Error(O.dedent`
              Unexpected \`storiesOf\` usage: ${I(r, e._options.fileName)}.

              SB8 does not support \`storiesOf\`. 
            `);
          if (c.isMemberExpression(o) && c.isIdentifier(o.property) && o.property.name === "meta" && c.isIdentifier(o.object) && r.arguments.
          length > 0) {
            let l = t.scope.getBinding(o.object.name)?.path?.parentPath?.node;
            if (c.isImportDeclaration(l))
              if (Ke(l.source.value)) {
                let f = r.arguments[0];
                e._metaVariableName = o.property.name, e._metaIsFactory = !0, e._parseMeta(f, e._ast.program);
              } else
                throw new B(
                  "meta() factory must be imported from .storybook/preview configuration",
                  l,
                  e._options.fileName
                );
          }
        }
      },
      ImportDeclaration: {
        enter({ node: t }) {
          let { source: r } = t;
          if (c.isStringLiteral(r))
            e.imports.push(r.value);
          else
            throw new Error("CSF: unexpected import source");
        }
      }
    }), !e._meta)
      throw new U("missing default export", e._ast, e._options.fileName);
    let i = Object.entries(e._stories);
    if (e._meta.title = this._options.makeTitle(e._meta?.title), e._metaAnnotations.play && (e._meta.tags = [...e._meta.tags || [], "play-fn"]),
    e._stories = i.reduce(
      (t, [r, o]) => {
        if (!se(r, e._meta))
          return t;
        let a = o.parameters?.__id ?? ze(e._meta?.id || e._meta?.title, ne(r)), l = { ...o.parameters, __id: a }, { includeStories: f } = e.
        _meta || {};
        r === "__page" && (i.length === 1 || Array.isArray(f) && f.length === 1) && (l.docsOnly = !0), t[r] = { ...o, id: a, parameters: l };
        let m = e._storyAnnotations[r], { tags: g, play: x } = m;
        if (g) {
          let h = c.isIdentifier(g) ? P(g.name, this._ast.program) : g;
          t[r].tags = ae(h);
        }
        x && (t[r].tags = [...t[r].tags || [], "play-fn"]);
        let b = t[r].__stats;
        ["play", "render", "loaders", "beforeEach", "globals", "tags"].forEach((h) => {
          b[h] = !!m[h] || !!e._metaAnnotations[h];
        });
        let y = e.getStoryExport(r);
        return b.storyFn = !!(c.isArrowFunctionExpression(y) || c.isFunctionDeclaration(y)), b.mount = Ye(m.play ?? e._metaAnnotations.play),
        b.moduleMock = !!e.imports.find((h) => Qe(h)), t;
      },
      {}
    ), Object.keys(e._storyExports).forEach((t) => {
      se(t, e._meta) || (delete e._storyExports[t], delete e._storyAnnotations[t], delete e._storyStatements[t]);
    }), e._namedExportsOrder) {
      let t = Object.keys(e._storyExports);
      e._storyExports = ce(e._storyExports, e._namedExportsOrder), e._stories = ce(e._stories, e._namedExportsOrder);
      let r = Object.keys(e._storyExports);
      if (t.length !== r.length)
        throw new Error(
          `Missing exports after sort: ${t.filter(
            (o) => !r.includes(o)
          )}`
        );
    }
    return e;
  }
  get meta() {
    return this._meta;
  }
  get stories() {
    return Object.values(this._stories);
  }
  get indexInputs() {
    let { fileName: e } = this._options;
    if (!e)
      throw new Error(
        O.dedent`Cannot automatically create index inputs with CsfFile.indexInputs because the CsfFile instance was created without a the fileName option.
        Either add the fileName option when creating the CsfFile instance, or create the index inputs manually.`
      );
    return Object.entries(this._stories).map(([i, t]) => {
      let r = [...this._meta?.tags ?? [], ...t.tags ?? []];
      return {
        type: "story",
        importPath: e,
        rawComponentPath: this._rawComponentPath,
        exportName: i,
        name: t.name,
        title: this.meta?.title,
        metaId: this.meta?.id,
        tags: r,
        __id: t.id,
        __stats: t.__stats
      };
    });
  }
}, et = /* @__PURE__ */ p(({
  code: s,
  filename: e = "",
  ast: i
}) => new Be({ filename: e }, { code: s, ast: i ?? pe(s) }), "babelParseFile"), K = /* @__PURE__ */ p((s, e) => {
  let i = pe(s), t = et({ code: s, filename: e.fileName, ast: i });
  return new X(i, e, t);
}, "loadCsf"), de = /* @__PURE__ */ p((s, e = { sourceMaps: !1 }, i) => {
  let t = We(s._ast, e, i);
  return e.sourceMaps ? t : t.code;
}, "formatCsf"), tt = /* @__PURE__ */ p((s, e = {}) => fe.print(s._ast, e), "printCsf"), Ft = /* @__PURE__ */ p(async (s, e) => {
  let i = (await Ue(s, "utf-8")).toString();
  return K(i, { ...e, fileName: s });
}, "readCsf"), Ct = /* @__PURE__ */ p(async (s, e) => {
  if (!(e || s._options.fileName))
    throw new Error("Please specify a fileName for writeCsf");
  await qe(e, tt(s).code);
}, "writeCsf");

// src/csf-tools/ConfigFile.ts
var xe = M(k(), 1);
import { readFile as rt, writeFile as it } from "node:fs/promises";
import {
  babelParse as ge,
  generate as me,
  recast as st,
  types as n,
  traverse as ue
} from "@storybook/core/babel";
var J = console, Q = /* @__PURE__ */ p(({
  expectedType: s,
  foundType: e,
  node: i
}) => xe.dedent`
      CSF Parsing error: Expected '${s}' but found '${e}' instead in '${i?.type}'.
    `, "getCsfParsingErrorMessage"), A = /* @__PURE__ */ p((s) => n.isIdentifier(s.key) ? s.key.name : n.isStringLiteral(s.key) ? s.key.value :
null, "propKey"), W = /* @__PURE__ */ p((s) => n.isTSAsExpression(s) || n.isTSSatisfiesExpression(s) ? W(s.expression) : s, "unwrap"), ye = /* @__PURE__ */ p(
(s, e) => {
  if (s.length === 0)
    return e;
  if (n.isObjectExpression(e)) {
    let [i, ...t] = s, r = e.properties.find((o) => A(o) === i);
    if (r)
      return ye(t, r.value);
  }
}, "_getPath"), be = /* @__PURE__ */ p((s, e) => {
  if (s.length === 0) {
    if (n.isObjectExpression(e))
      return e.properties;
    throw new Error("Expected object expression");
  }
  if (n.isObjectExpression(e)) {
    let [i, ...t] = s, r = e.properties.find((o) => A(o) === i);
    if (r)
      return t.length === 0 ? e.properties : be(t, r.value);
  }
}, "_getPathProperties"), Ee = /* @__PURE__ */ p((s, e) => {
  let i = null, t = null;
  return e.body.find((r) => (n.isVariableDeclaration(r) ? t = r.declarations : n.isExportNamedDeclaration(r) && n.isVariableDeclaration(r.declaration) &&
  (t = r.declaration.declarations), t && t.find((o) => n.isVariableDeclarator(o) && n.isIdentifier(o.id) && o.id.name === s ? (i = o, !0) : !1))),
  i;
}, "_findVarDeclarator"), v = /* @__PURE__ */ p((s, e) => Ee(s, e)?.init, "_findVarInitialization"), $ = /* @__PURE__ */ p((s, e) => {
  if (s.length === 0)
    return e;
  let [i, ...t] = s, r = $(t, e);
  return n.objectExpression([n.objectProperty(n.identifier(i), r)]);
}, "_makeObjectExpression"), H = /* @__PURE__ */ p((s, e, i) => {
  let [t, ...r] = s, o = i.properties.find(
    (a) => A(a) === t
  );
  o ? n.isObjectExpression(o.value) && r.length > 0 ? H(r, e, o.value) : o.value = $(r, e) : i.properties.push(
    n.objectProperty(n.identifier(t), $(r, e))
  );
}, "_updateExportNode"), Y = class {
  constructor(e, i, t) {
    this._exports = {};
    // FIXME: this is a hack. this is only used in the case where the user is
    // modifying a named export that's a scalar. The _exports map is not suitable
    // for that. But rather than refactor the whole thing, we just use this as a stopgap.
    this._exportDecls = {};
    this.hasDefaultExport = !1;
    this._ast = e, this._code = i, this.fileName = t;
  }
  static {
    p(this, "ConfigFile");
  }
  _parseExportsObject(e) {
    this._exportsObject = e, e.properties.forEach((i) => {
      let t = A(i);
      if (t) {
        let r = i.value;
        n.isIdentifier(r) && (r = v(r.name, this._ast.program)), this._exports[t] = r;
      }
    });
  }
  parse() {
    let e = this;
    return ue(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node: i, parent: t }) {
          e.hasDefaultExport = !0;
          let r = n.isIdentifier(i.declaration) && n.isProgram(t) ? v(i.declaration.name, t) : i.declaration;
          r = W(r), n.isCallExpression(r) && n.isObjectExpression(r.arguments[0]) && (r = r.arguments[0]), n.isObjectExpression(r) ? e._parseExportsObject(
          r) : J.warn(
            Q({
              expectedType: "ObjectExpression",
              foundType: r?.type,
              node: r || i.declaration
            })
          );
        }
      },
      ExportNamedDeclaration: {
        enter({ node: i, parent: t }) {
          if (n.isVariableDeclaration(i.declaration))
            i.declaration.declarations.forEach((r) => {
              if (n.isVariableDeclarator(r) && n.isIdentifier(r.id)) {
                let { name: o } = r.id, a = r.init;
                n.isIdentifier(a) && (a = v(a.name, t)), e._exports[o] = a, e._exportDecls[o] = r;
              }
            });
          else if (n.isFunctionDeclaration(i.declaration)) {
            let r = i.declaration;
            if (n.isIdentifier(r.id)) {
              let { name: o } = r.id;
              e._exportDecls[o] = r;
            }
          } else i.specifiers ? i.specifiers.forEach((r) => {
            if (n.isExportSpecifier(r) && n.isIdentifier(r.local) && n.isIdentifier(r.exported)) {
              let { name: o } = r.local, { name: a } = r.exported, l = Ee(o, t);
              l && (e._exports[a] = l.init, e._exportDecls[a] = l);
            }
          }) : J.warn(
            Q({
              expectedType: "VariableDeclaration",
              foundType: i.declaration?.type,
              node: i.declaration
            })
          );
        }
      },
      ExpressionStatement: {
        enter({ node: i, parent: t }) {
          if (n.isAssignmentExpression(i.expression) && i.expression.operator === "=") {
            let { left: r, right: o } = i.expression;
            if (n.isMemberExpression(r) && n.isIdentifier(r.object) && r.object.name === "module" && n.isIdentifier(r.property) && r.property.
            name === "exports") {
              let a = o;
              n.isIdentifier(o) && (a = v(o.name, t)), a = W(a), n.isObjectExpression(a) ? (e._exportsObject = a, a.properties.forEach((l) => {
                let f = A(l);
                if (f) {
                  let m = l.value;
                  n.isIdentifier(m) && (m = v(
                    m.name,
                    t
                  )), e._exports[f] = m;
                }
              })) : J.warn(
                Q({
                  expectedType: "ObjectExpression",
                  foundType: a?.type,
                  node: a
                })
              );
            }
          }
        }
      },
      CallExpression: {
        enter: /* @__PURE__ */ p(({ node: i }) => {
          n.isIdentifier(i.callee) && i.callee.name === "definePreview" && i.arguments.length === 1 && n.isObjectExpression(i.arguments[0]) &&
          e._parseExportsObject(i.arguments[0]);
        }, "enter")
      }
    }), e;
  }
  getFieldNode(e) {
    let [i, ...t] = e, r = this._exports[i];
    if (r)
      return ye(t, r);
  }
  getFieldProperties(e) {
    let [i, ...t] = e, r = this._exports[i];
    if (r)
      return be(t, r);
  }
  getFieldValue(e) {
    let i = this.getFieldNode(e);
    if (i) {
      let { code: t } = me(i, {});
      return (0, eval)(`(() => (${t}))()`);
    }
  }
  getSafeFieldValue(e) {
    try {
      return this.getFieldValue(e);
    } catch {
    }
  }
  setFieldNode(e, i) {
    let [t, ...r] = e, o = this._exports[t];
    if (this._exportsObject)
      H(e, i, this._exportsObject), this._exports[e[0]] = i;
    else if (o && n.isObjectExpression(o) && r.length > 0)
      H(r, i, o);
    else if (o && r.length === 0 && this._exportDecls[e[0]]) {
      let a = this._exportDecls[e[0]];
      n.isVariableDeclarator(a) && (a.init = $([], i));
    } else {
      if (this.hasDefaultExport)
        throw new Error(
          `Could not set the "${e.join(
            "."
          )}" field as the default export is not an object in this file.`
        );
      {
        let a = $(r, i), l = n.exportNamedDeclaration(
          n.variableDeclaration("const", [n.variableDeclarator(n.identifier(t), a)])
        );
        this._exports[t] = a, this._ast.program.body.push(l);
      }
    }
  }
  /**
   * @example
   *
   * ```ts
   * // 1. { framework: 'framework-name' }
   * // 2. { framework: { name: 'framework-name', options: {} }
   * getNameFromPath(['framework']); // => 'framework-name'
   * ```
   *
   * @returns The name of a node in a given path, supporting the following formats:
   */
  getNameFromPath(e) {
    let i = this.getFieldNode(e);
    if (i)
      return this._getPresetValue(i, "name");
  }
  /**
   * Returns an array of names of a node in a given path, supporting the following formats:
   *
   * @example
   *
   * ```ts
   * const config = {
   *   addons: ['first-addon', { name: 'second-addon', options: {} }],
   * };
   * // => ['first-addon', 'second-addon']
   * getNamesFromPath(['addons']);
   * ```
   */
  getNamesFromPath(e) {
    let i = this.getFieldNode(e);
    if (!i)
      return;
    let t = [];
    return n.isArrayExpression(i) && i.elements.forEach((r) => {
      t.push(this._getPresetValue(r, "name"));
    }), t;
  }
  _getPnpWrappedValue(e) {
    if (n.isCallExpression(e)) {
      let i = e.arguments[0];
      if (n.isStringLiteral(i))
        return i.value;
    }
  }
  /**
   * Given a node and a fallback property, returns a **non-evaluated** string value of the node.
   *
   * 1. `{ node: 'value' }`
   * 2. `{ node: { fallbackProperty: 'value' } }`
   */
  _getPresetValue(e, i) {
    let t;
    if (n.isStringLiteral(e) ? t = e.value : n.isObjectExpression(e) ? e.properties.forEach((r) => {
      n.isObjectProperty(r) && n.isIdentifier(r.key) && r.key.name === i && (n.isStringLiteral(r.value) ? t = r.value.value : t = this._getPnpWrappedValue(
      r.value)), n.isObjectProperty(r) && n.isStringLiteral(r.key) && r.key.value === "name" && n.isStringLiteral(r.value) && (t = r.value.value);
    }) : n.isCallExpression(e) && (t = this._getPnpWrappedValue(e)), !t)
      throw new Error(
        `The given node must be a string literal or an object expression with a "${i}" property that is a string literal.`
      );
    return t;
  }
  removeField(e) {
    let i = /* @__PURE__ */ p((r, o) => {
      let a = r.findIndex(
        (l) => n.isIdentifier(l.key) && l.key.name === o || n.isStringLiteral(l.key) && l.key.value === o
      );
      a >= 0 && r.splice(a, 1);
    }, "removeProperty");
    if (e.length === 1) {
      let r = !1;
      if (this._ast.program.body.forEach((o) => {
        if (n.isExportNamedDeclaration(o) && n.isVariableDeclaration(o.declaration)) {
          let a = o.declaration.declarations[0];
          n.isIdentifier(a.id) && a.id.name === e[0] && (this._ast.program.body.splice(this._ast.program.body.indexOf(o), 1), r = !0);
        }
        if (n.isExportDefaultDeclaration(o)) {
          let a = o.declaration;
          if (n.isIdentifier(a) && (a = v(a.name, this._ast.program)), a = W(a), n.isObjectExpression(a)) {
            let l = a.properties;
            i(l, e[0]), r = !0;
          }
        }
        if (n.isExpressionStatement(o) && n.isAssignmentExpression(o.expression) && n.isMemberExpression(o.expression.left) && n.isIdentifier(
        o.expression.left.object) && o.expression.left.object.name === "module" && n.isIdentifier(o.expression.left.property) && o.expression.
        left.property.name === "exports" && n.isObjectExpression(o.expression.right)) {
          let a = o.expression.right.properties;
          i(a, e[0]), r = !0;
        }
      }), r)
        return;
    }
    let t = this.getFieldProperties(e);
    if (t) {
      let r = e.at(-1);
      i(t, r);
    }
  }
  appendValueToArray(e, i) {
    let t = this.valueToNode(i);
    t && this.appendNodeToArray(e, t);
  }
  appendNodeToArray(e, i) {
    let t = this.getFieldNode(e);
    if (!t)
      this.setFieldNode(e, n.arrayExpression([i]));
    else if (n.isArrayExpression(t))
      t.elements.push(i);
    else
      throw new Error(`Expected array at '${e.join(".")}', got '${t.type}'`);
  }
  /**
   * Specialized helper to remove addons or other array entries that can either be strings or
   * objects with a name property.
   */
  removeEntryFromArray(e, i) {
    let t = this.getFieldNode(e);
    if (t)
      if (n.isArrayExpression(t)) {
        let r = t.elements.findIndex((o) => n.isStringLiteral(o) ? o.value === i : n.isObjectExpression(o) ? this._getPresetValue(o, "name") ===
        i : this._getPnpWrappedValue(o) === i);
        if (r >= 0)
          t.elements.splice(r, 1);
        else
          throw new Error(`Could not find '${i}' in array at '${e.join(".")}'`);
      } else
        throw new Error(`Expected array at '${e.join(".")}', got '${t.type}'`);
  }
  _inferQuotes() {
    if (!this._quotes) {
      let e = (this._ast.tokens || []).slice(0, 500).reduce(
        (i, t) => (t.type.label === "string" && (i[this._code[t.start]] += 1), i),
        { "'": 0, '"': 0 }
      );
      this._quotes = e["'"] > e['"'] ? "single" : "double";
    }
    return this._quotes;
  }
  valueToNode(e) {
    let i = this._inferQuotes(), t;
    if (i === "single") {
      let { code: r } = me(n.valueToNode(e), { jsescOption: { quotes: i } }), o = ge(`const __x = ${r}`);
      ue(o, {
        VariableDeclaration: {
          enter({ node: a }) {
            a.declarations.length === 1 && n.isVariableDeclarator(a.declarations[0]) && n.isIdentifier(a.declarations[0].id) && a.declarations[0].
            id.name === "__x" && (t = a.declarations[0].init);
          }
        }
      });
    } else
      t = n.valueToNode(e);
    return t;
  }
  setFieldValue(e, i) {
    let t = this.valueToNode(i);
    if (!t)
      throw new Error(`Unexpected value ${JSON.stringify(i)}`);
    this.setFieldNode(e, t);
  }
  getBodyDeclarations() {
    return this._ast.program.body;
  }
  setBodyDeclaration(e) {
    this._ast.program.body.push(e);
  }
  /**
   * Import specifiers for a specific require import
   *
   * @example
   *
   * ```ts
   * // const { foo } = require('bar');
   * setRequireImport(['foo'], 'bar');
   *
   * // const foo = require('bar');
   * setRequireImport('foo', 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setRequireImport(e, i) {
    let t = this._ast.program.body.find(
      (a) => n.isVariableDeclaration(a) && a.declarations.length === 1 && n.isVariableDeclarator(a.declarations[0]) && n.isCallExpression(a.
      declarations[0].init) && n.isIdentifier(a.declarations[0].init.callee) && a.declarations[0].init.callee.name === "require" && n.isStringLiteral(
      a.declarations[0].init.arguments[0]) && a.declarations[0].init.arguments[0].value === i
    ), r = /* @__PURE__ */ p((a) => n.isObjectPattern(t?.declarations[0].id) && t?.declarations[0].id.properties.find(
      (l) => n.isObjectProperty(l) && n.isIdentifier(l.key) && l.key.name === a
    ), "hasRequireSpecifier"), o = /* @__PURE__ */ p((a, l) => a.declarations.length === 1 && n.isVariableDeclarator(a.declarations[0]) && n.
    isIdentifier(a.declarations[0].id) && a.declarations[0].id.name === l, "hasDefaultRequireSpecifier");
    if (typeof e == "string") {
      let a = /* @__PURE__ */ p(() => {
        this._ast.program.body.unshift(
          n.variableDeclaration("const", [
            n.variableDeclarator(
              n.identifier(e),
              n.callExpression(n.identifier("require"), [n.stringLiteral(i)])
            )
          ])
        );
      }, "addDefaultRequireSpecifier");
      t && o(t, e) || a();
    } else t ? e.forEach((a) => {
      r(a) || t.declarations[0].id.properties.push(
        n.objectProperty(n.identifier(a), n.identifier(a), void 0, !0)
      );
    }) : this._ast.program.body.unshift(
      n.variableDeclaration("const", [
        n.variableDeclarator(
          n.objectPattern(
            e.map(
              (a) => n.objectProperty(n.identifier(a), n.identifier(a), void 0, !0)
            )
          ),
          n.callExpression(n.identifier("require"), [n.stringLiteral(i)])
        )
      ])
    );
  }
  /**
   * Set import specifiers for a given import statement.
   *
   * Does not support setting type imports (yet)
   *
   * @example
   *
   * ```ts
   * // import { foo } from 'bar';
   * setImport(['foo'], 'bar');
   *
   * // import foo from 'bar';
   * setImport('foo', 'bar');
   *
   * // import * as foo from 'bar';
   * setImport({ namespace: 'foo' }, 'bar');
   *
   * // import 'bar';
   * setImport(null, 'bar');
   * ```
   *
   * @param importSpecifiers - The import specifiers to set. If a string is passed in, a default
   *   import will be set. Otherwise, an array of named imports will be set
   * @param fromImport - The module to import from
   */
  setImport(e, i) {
    let t = /* @__PURE__ */ p((f) => n.importSpecifier(n.identifier(f), n.identifier(f)), "getNewImportSpecifier"), r = /* @__PURE__ */ p((f, m) => f.
    specifiers.find(
      (g) => n.isImportSpecifier(g) && n.isIdentifier(g.imported) && g.imported.name === m
    ), "hasImportSpecifier"), o = /* @__PURE__ */ p((f, m) => f.specifiers.find(
      (g) => n.isImportNamespaceSpecifier(g) && n.isIdentifier(g.local) && g.local.name === m
    ), "hasNamespaceImportSpecifier"), a = /* @__PURE__ */ p((f, m) => f.specifiers.find(
      (g) => n.isImportDefaultSpecifier(g) && n.isIdentifier(g.local) && g.local.name === m
    ), "hasDefaultImportSpecifier"), l = this._ast.program.body.find(
      (f) => n.isImportDeclaration(f) && f.source.value === i
    );
    e === null ? l || this._ast.program.body.unshift(n.importDeclaration([], n.stringLiteral(i))) : typeof e == "string" ? l ? a(l, e) || l.
    specifiers.push(
      n.importDefaultSpecifier(n.identifier(e))
    ) : this._ast.program.body.unshift(
      n.importDeclaration(
        [n.importDefaultSpecifier(n.identifier(e))],
        n.stringLiteral(i)
      )
    ) : Array.isArray(e) ? l ? e.forEach((f) => {
      r(l, f) || l.specifiers.push(t(f));
    }) : this._ast.program.body.unshift(
      n.importDeclaration(
        e.map(t),
        n.stringLiteral(i)
      )
    ) : e.namespace && (l ? o(l, e.namespace) || l.specifiers.push(
      n.importNamespaceSpecifier(n.identifier(e.namespace))
    ) : this._ast.program.body.unshift(
      n.importDeclaration(
        [n.importNamespaceSpecifier(n.identifier(e.namespace))],
        n.stringLiteral(i)
      )
    ));
  }
}, nt = /* @__PURE__ */ p((s, e) => {
  let i = ge(s);
  return new Y(i, s, e);
}, "loadConfig"), ot = /* @__PURE__ */ p((s) => at(s).code, "formatConfig"), at = /* @__PURE__ */ p((s, e = {}) => st.print(s._ast, e), "pri\
ntConfig"), $t = /* @__PURE__ */ p(async (s) => {
  let e = (await rt(s, "utf-8")).toString();
  return nt(e, s).parse();
}, "readConfig"), Rt = /* @__PURE__ */ p(async (s, e) => {
  let i = e || s.fileName;
  if (!i)
    throw new Error("Please specify a fileName for writeConfig");
  await it(i, ot(s));
}, "writeConfig"), Lt = /* @__PURE__ */ p((s) => !!s._ast.program.body.find((i) => n.isImportDeclaration(i) && i.source.value.includes("@sto\
rybook") && i.specifiers.some((t) => n.isImportSpecifier(t) && n.isIdentifier(t.imported) && t.imported.name === "definePreview")), "isCsfFa\
ctoryPreview");

// src/csf-tools/getStorySortParameter.ts
var je = M(k(), 1);
import { babelParse as lt, generate as he, types as E, traverse as ct } from "@storybook/core/babel";
var pt = console, Z = /* @__PURE__ */ p((s, e) => {
  let i;
  return s.properties.forEach((t) => {
    E.isIdentifier(t.key) && t.key.name === e && (i = t.value);
  }), i;
}, "getValue"), ee = /* @__PURE__ */ p((s) => {
  let e = R(s);
  if (E.isArrayExpression(e))
    return e.elements.map((i) => ee(i));
  if (E.isObjectExpression(e))
    return e.properties.reduce((i, t) => (E.isIdentifier(t.key) && (i[t.key.name] = ee(t.value)), i), {});
  if (E.isLiteral(e))
    return e.value;
  if (E.isIdentifier(e))
    return w(e.name, !0);
  throw new Error(`Unknown node type ${e.type}`);
}, "parseValue"), w = /* @__PURE__ */ p((s, e) => {
  let i = je.dedent`
    Unexpected '${s}'. Parameter 'options.storySort' should be defined inline e.g.:

    export default {
      parameters: {
        options: {
          storySort: <array | object | function>
        },
      },
    };
  `;
  if (e)
    throw new Error(i);
  pt.info(i);
}, "unsupported"), R = /* @__PURE__ */ p((s) => E.isTSAsExpression(s) || E.isTSSatisfiesExpression(s) ? s.expression : s, "stripTSModifiers"),
Se = /* @__PURE__ */ p((s) => {
  let e = R(s);
  if (E.isObjectExpression(e)) {
    let i = Z(e, "options");
    if (i) {
      if (E.isObjectExpression(i))
        return Z(i, "storySort");
      w("options", !0);
    }
  }
}, "parseParameters"), _e = /* @__PURE__ */ p((s, e) => {
  let i = R(s);
  if (E.isObjectExpression(i)) {
    let t = Z(i, "parameters");
    if (E.isIdentifier(t) && (t = P(t.name, e)), t)
      return Se(t);
  } else
    w("default", !0);
}, "parseDefault"), Wt = /* @__PURE__ */ p((s) => {
  if (!s.includes("storySort"))
    return;
  let e, i = lt(s);
  if (ct(i, {
    ExportNamedDeclaration: {
      enter({ node: t }) {
        E.isVariableDeclaration(t.declaration) ? t.declaration.declarations.forEach((r) => {
          if (E.isVariableDeclarator(r) && E.isIdentifier(r.id)) {
            let { name: o } = r.id;
            if (o === "parameters" && r.init) {
              let a = R(r.init);
              e = Se(a);
            }
          }
        }) : t.specifiers.forEach((r) => {
          E.isIdentifier(r.exported) && r.exported.name === "parameters" && w("parameters", !1);
        });
      }
    },
    ExportDefaultDeclaration: {
      enter({ node: t }) {
        let r = t.declaration;
        E.isIdentifier(r) && (r = P(r.name, i.program)), r = R(r), E.isCallExpression(r) && E.isObjectExpression(r.arguments?.[0]) ? e = _e(
        r.arguments[0], i.program) : E.isObjectExpression(r) ? e = _e(r, i.program) : w("default", !1);
      }
    }
  }), !!e) {
    if (E.isArrowFunctionExpression(e)) {
      let { code: t } = he(e, {});
      return (0, eval)(t);
    }
    if (E.isFunctionExpression(e)) {
      let { code: t } = he(e, {}), r = e.id?.name, o = `(a, b) => {
      ${t};
      return ${r}(a, b)
    }`;
      return (0, eval)(o);
    }
    return E.isLiteral(e) || E.isArrayExpression(e) || E.isObjectExpression(e) ? ee(e) : w("storySort", !0);
  }
}, "getStorySortParameter");

// src/csf-tools/enrichCsf.ts
import { generate as ft, types as u } from "@storybook/core/babel";
var dt = /* @__PURE__ */ p((s, e, i, t) => {
  let r = e.getStoryExport(i), o = u.isCallExpression(r) && u.isMemberExpression(r.callee) && u.isIdentifier(r.callee.object) && r.callee.object.
  name === "meta", a = !t?.disableSource && ut(r), l = !t?.disableDescription && Oe(e._storyStatements[i]), f = [], m = o ? u.memberExpression(
  u.identifier(i), u.identifier("input")) : u.identifier(i), g = u.memberExpression(m, u.identifier("parameters"));
  f.push(u.spreadElement(g));
  let x = u.optionalMemberExpression(
    g,
    u.identifier("docs"),
    !1,
    !0
  ), b = [];
  if (a) {
    let y = u.optionalMemberExpression(
      x,
      u.identifier("source"),
      !1,
      !0
    );
    b.push(
      u.objectProperty(
        u.identifier("source"),
        u.objectExpression([
          u.objectProperty(u.identifier("originalSource"), u.stringLiteral(a)),
          u.spreadElement(y)
        ])
      )
    );
  }
  if (l) {
    let y = u.optionalMemberExpression(
      x,
      u.identifier("description"),
      !1,
      !0
    );
    b.push(
      u.objectProperty(
        u.identifier("description"),
        u.objectExpression([
          u.objectProperty(u.identifier("story"), u.stringLiteral(l)),
          u.spreadElement(y)
        ])
      )
    );
  }
  if (b.length > 0) {
    f.push(
      u.objectProperty(
        u.identifier("docs"),
        u.objectExpression([u.spreadElement(x), ...b])
      )
    );
    let y = u.expressionStatement(
      u.assignmentExpression("=", g, u.objectExpression(f))
    );
    s._ast.program.body.push(y);
  }
}, "enrichCsfStory"), Pe = /* @__PURE__ */ p((s, e, i) => {
  if (!e.length) {
    s.properties.find(
      (f) => u.isObjectProperty(f) && u.isIdentifier(f.key) && f.key.name === "component"
    ) || s.properties.unshift(i);
    return;
  }
  let [t, ...r] = e, o = s.properties.find(
    (l) => u.isObjectProperty(l) && u.isIdentifier(l.key) && l.key.name === t && u.isObjectExpression(l.value)
  ), a;
  o ? a = o.value : (a = u.objectExpression([]), s.properties.push(u.objectProperty(u.identifier(t), a))), Pe(a, r, i);
}, "addComponentDescription"), mt = /* @__PURE__ */ p((s, e, i) => {
  let t = !i?.disableDescription && Oe(e._metaStatement);
  if (t) {
    let r = s._metaNode;
    r && u.isObjectExpression(r) && Pe(
      r,
      ["parameters", "docs", "description"],
      u.objectProperty(u.identifier("component"), u.stringLiteral(t))
    );
  }
}, "enrichCsfMeta"), Kt = /* @__PURE__ */ p((s, e, i) => {
  mt(s, e, i), Object.keys(s._storyExports).forEach((t) => {
    dt(s, e, t, i);
  });
}, "enrichCsf"), ut = /* @__PURE__ */ p((s) => {
  let e = u.isVariableDeclarator(s) ? s.init : s, { code: i } = ft(e, {});
  return i;
}, "extractSource"), Oe = /* @__PURE__ */ p((s) => s?.leadingComments ? s.leadingComments.map((i) => i.type === "CommentLine" || !i.value.startsWith(
"*") ? null : i.value.split(`
`).map((t) => t.replace(/^(\s+)?(\*+)?(\s)?/, "")).join(`
`).trim()).filter(Boolean).join(`
`) : "", "extractDescription");

// src/csf-tools/index.ts
import { babelParse as cr } from "@storybook/core/babel";

// src/csf-tools/vitest-plugin/transformer.ts
var te = M(k(), 1);
import { types as d } from "@storybook/core/babel";
import { getStoryTitle as gt } from "@storybook/core/common";
import { combineTags as xt } from "@storybook/core/csf";
var Ie = console, yt = /* @__PURE__ */ p((s, e) => !(e.include.length && !e.include.some((i) => s?.includes(i)) || e.exclude.some((i) => s?.
includes(i))), "isValidTest");
async function bt({
  code: s,
  fileName: e,
  configDir: i,
  stories: t,
  tagsFilter: r,
  previewLevelTags: o = []
}) {
  if (!/\.stor(y|ies)\./.test(e))
    return s;
  let l = K(s, {
    fileName: e,
    transformInlineMeta: !0,
    makeTitle: /* @__PURE__ */ p((_) => {
      let S = gt({
        storyFilePath: e,
        configDir: i,
        stories: t,
        userTitle: _
      }) || "unknown";
      return S === "unknown" && Ie.warn(
        te.dedent`
            [Storybook]: Could not calculate story title for "${e}".
            Please make sure that this file matches the globs included in the "stories" field in your Storybook configuration at "${i}".
          `
      ), S;
    }, "makeTitle")
  }).parse(), f = l._ast, m = l._metaVariableName, g = l._metaNode, x = g.properties.find(
    (_) => d.isObjectProperty(_) && d.isIdentifier(_.key) && _.key.name === "title"
  ), b = d.stringLiteral(l._meta?.title || "unknown");
  if (x ? d.isObjectProperty(x) && (x.value = b) : g.properties.push(d.objectProperty(d.identifier("title"), b)), !g || !l._meta)
    throw new Error(
      `The Storybook vitest plugin could not detect the meta (default export) object in the story file. 

Please make sure you have a default export with the meta object. If you are using a different export format that is not supported, please fi\
le an issue with details about your use case.`
    );
  let y = {};
  Object.keys(l._stories).map((_) => {
    let S = xt(
      "test",
      "dev",
      ...o,
      ...l.meta?.tags || [],
      ...l._stories[_].tags || []
    );
    yt(S, r) && (y[_] = l._storyStatements[_]);
  });
  let h = l._file.path.scope.generateUidIdentifier("test"), D = l._file.path.scope.generateUidIdentifier("describe");
  if (Object.keys(y).length === 0) {
    let _ = d.expressionStatement(
      d.callExpression(d.memberExpression(D, d.identifier("skip")), [
        d.stringLiteral("No valid tests found")
      ])
    );
    f.program.body.push(_);
    let S = [
      d.importDeclaration(
        [
          d.importSpecifier(h, d.identifier("test")),
          d.importSpecifier(D, d.identifier("describe"))
        ],
        d.stringLiteral("vitest")
      )
    ];
    f.program.body.unshift(...S);
  } else {
    let re = function() {
      let j = l._file.path.scope.generateUidIdentifier("isRunningFromThisFile"), N = d.memberExpression(
        d.callExpression(d.memberExpression(_, d.identifier("getState")), []),
        d.identifier("testPath")
      ), F = d.memberExpression(
        d.memberExpression(d.identifier("globalThis"), d.identifier("__vitest_worker__")),
        d.identifier("filepath")
      ), C = d.logicalExpression(
        "??",
        // TODO: switch order of testPathProperty and filePathProperty when the bug is fixed
        // https://github.com/vitest-dev/vitest/issues/6367 (or probably just use testPathProperty)
        F,
        N
      ), L = d.callExpression(
        d.memberExpression(
          d.memberExpression(
            d.memberExpression(d.identifier("import"), d.identifier("meta")),
            d.identifier("url")
          ),
          d.identifier("includes")
        ),
        [C]
      );
      return { isRunningFromThisFileDeclaration: d.variableDeclaration("const", [
        d.variableDeclarator(j, L)
      ]), isRunningFromThisFileId: j };
    };
    var Et = re;
    p(re, "getTestGuardDeclaration");
    let _ = l._file.path.scope.generateUidIdentifier("expect"), S = l._file.path.scope.generateUidIdentifier("testStory"), De = d.identifier(
    JSON.stringify(r.skip)), { isRunningFromThisFileDeclaration: Ne, isRunningFromThisFileId: ve } = re();
    f.program.body.push(Ne);
    let we = /* @__PURE__ */ p(({
      localName: j,
      exportName: N,
      testTitle: F,
      node: C
    }) => {
      let L = d.expressionStatement(
        d.callExpression(h, [
          d.stringLiteral(F),
          d.callExpression(S, [
            d.stringLiteral(N),
            d.identifier(j),
            d.identifier(m),
            De
          ])
        ])
      );
      return L.loc = C.loc, L;
    }, "getTestStatementForStory"), Fe = Object.entries(y).map(([j, N]) => {
      if (N === null) {
        Ie.warn(
          te.dedent`
            [Storybook]: Could not transform "${j}" story into test at "${e}".
            Please make sure to define stories in the same file and not re-export stories coming from other files".
          `
        );
        return;
      }
      let F = l._stories[j].localName ?? j, C = l._stories[j].name ?? j;
      return we({ testTitle: C, localName: F, exportName: j, node: N });
    }).filter((j) => !!j), Ce = d.ifStatement(ve, d.blockStatement(Fe));
    f.program.body.push(Ce);
    let Te = [
      d.importDeclaration(
        [
          d.importSpecifier(h, d.identifier("test")),
          d.importSpecifier(_, d.identifier("expect"))
        ],
        d.stringLiteral("vitest")
      ),
      d.importDeclaration(
        [d.importSpecifier(S, d.identifier("testStory"))],
        d.stringLiteral("@storybook/experimental-addon-test/internal/test-utils")
      )
    ];
    f.program.body.unshift(...Te);
  }
  return de(l, { sourceMaps: !0, sourceFileName: e }, s);
}
p(bt, "vitestTransform");
export {
  B as BadMetaError,
  Y as ConfigFile,
  X as CsfFile,
  q as MixedFactoryError,
  z as MultipleMetaError,
  U as NoMetaError,
  cr as babelParse,
  et as babelParseFile,
  Kt as enrichCsf,
  mt as enrichCsfMeta,
  dt as enrichCsfStory,
  Oe as extractDescription,
  ut as extractSource,
  ot as formatConfig,
  de as formatCsf,
  Wt as getStorySortParameter,
  Lt as isCsfFactoryPreview,
  Qe as isModuleMock,
  Ke as isValidPreviewPath,
  nt as loadConfig,
  K as loadCsf,
  at as printConfig,
  tt as printCsf,
  $t as readConfig,
  Ft as readCsf,
  bt as vitestTransform,
  Rt as writeConfig,
  Ct as writeCsf
};
