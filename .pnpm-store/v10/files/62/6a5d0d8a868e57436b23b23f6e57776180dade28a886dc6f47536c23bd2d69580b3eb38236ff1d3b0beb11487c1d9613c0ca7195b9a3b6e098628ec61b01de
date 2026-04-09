"use strict";
var We = Object.create;
var V = Object.defineProperty;
var Ge = Object.getOwnPropertyDescriptor;
var ze = Object.getOwnPropertyNames;
var Xe = Object.getPrototypeOf, Ke = Object.prototype.hasOwnProperty;
var p = (s, e) => V(s, "name", { value: e, configurable: !0 });
var Je = (s, e) => () => (e || s((e = { exports: {} }).exports, e), e.exports), Qe = (s, e) => {
  for (var t in e)
    V(s, t, { get: e[t], enumerable: !0 });
}, le = (s, e, t, r) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let i of ze(e))
      !Ke.call(s, i) && i !== t && V(s, i, { get: () => e[i], enumerable: !(r = Ge(e, i)) || r.enumerable });
  return s;
};
var G = (s, e, t) => (t = s != null ? We(Xe(s)) : {}, le(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  e || !s || !s.__esModule ? V(t, "default", { value: s, enumerable: !0 }) : t,
  s
)), He = (s) => le(V({}, "__esModule", { value: !0 }), s);

// ../node_modules/ts-dedent/dist/index.js
var $ = Je((A) => {
  "use strict";
  Object.defineProperty(A, "__esModule", { value: !0 });
  A.dedent = void 0;
  function ce(s) {
    for (var e = [], t = 1; t < arguments.length; t++)
      e[t - 1] = arguments[t];
    var r = Array.from(typeof s == "string" ? [s] : s);
    r[r.length - 1] = r[r.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var i = r.reduce(function(l, f) {
      var m = f.match(/\n([\t ]+|(?!\s).)/g);
      return m ? l.concat(m.map(function(g) {
        var x, E;
        return (E = (x = g.match(/[\t ]/g)) === null || x === void 0 ? void 0 : x.length) !== null && E !== void 0 ? E : 0;
      })) : l;
    }, []);
    if (i.length) {
      var o = new RegExp(`
[	 ]{` + Math.min.apply(Math, i) + "}", "g");
      r = r.map(function(l) {
        return l.replace(o, `
`);
      });
    }
    r[0] = r[0].replace(/^\r?\n/, "");
    var a = r[0];
    return e.forEach(function(l, f) {
      var m = a.match(/(?:^|\n)( *)$/), g = m ? m[1] : "", x = l;
      typeof l == "string" && l.includes(`
`) && (x = String(l).split(`
`).map(function(E, b) {
        return b === 0 ? E : "" + g + E;
      }).join(`
`)), a += x + r[f + 1];
    }), a;
  }
  p(ce, "dedent");
  A.dedent = ce;
  A.default = ce;
});

// src/csf-tools/index.ts
var dt = {};
Qe(dt, {
  BadMetaError: () => M,
  ConfigFile: () => H,
  CsfFile: () => X,
  MixedFactoryError: () => L,
  MultipleMetaError: () => z,
  NoMetaError: () => R,
  babelParse: () => Ae.babelParse,
  babelParseFile: () => xe,
  enrichCsf: () => pt,
  enrichCsfMeta: () => we,
  enrichCsfStory: () => Ne,
  extractDescription: () => ne,
  extractSource: () => Fe,
  formatConfig: () => Se,
  formatCsf: () => Z,
  getStorySortParameter: () => ct,
  isCsfFactoryPreview: () => at,
  isModuleMock: () => ge,
  isValidPreviewPath: () => ue,
  loadConfig: () => je,
  loadCsf: () => J,
  printConfig: () => Pe,
  printCsf: () => ye,
  readConfig: () => nt,
  readCsf: () => it,
  vitestTransform: () => Ve,
  writeConfig: () => ot,
  writeCsf: () => st
});
module.exports = He(dt);

// src/csf-tools/CsfFile.ts
var K = require("node:fs/promises"), c = require("@storybook/core/babel"), I = require("@storybook/core/csf"), O = G($(), 1);

// src/csf-tools/findVarInitialization.ts
var w = require("@storybook/core/babel");
var P = /* @__PURE__ */ p((s, e) => {
  let t = null, r = null;
  return e.body.find((i) => (w.types.isVariableDeclaration(i) ? r = i.declarations : w.types.isExportNamedDeclaration(i) && w.types.isVariableDeclaration(
  i.declaration) && (r = i.declaration.declarations), r && r.find((o) => w.types.isVariableDeclarator(o) && w.types.isIdentifier(o.id) && o.
  id.name === s ? (t = o.init, !0) : !1))), t;
}, "findVarInitialization");

// src/csf-tools/CsfFile.ts
var pe = console, Ye = /\/preview(.(js|jsx|mjs|ts|tsx))?$/, ue = /* @__PURE__ */ p((s) => Ye.test(s), "isValidPreviewPath");
function Ze(s) {
  if (c.types.isArrayExpression(s))
    return s.elements.map((e) => {
      if (c.types.isStringLiteral(e))
        return e.value;
      throw new Error(`Expected string literal: ${e}`);
    });
  if (c.types.isStringLiteral(s))
    return new RegExp(s.value);
  if (c.types.isRegExpLiteral(s))
    return new RegExp(s.pattern, s.flags);
  throw new Error(`Unknown include/exclude: ${s}`);
}
p(Ze, "parseIncludeExclude");
function fe(s) {
  if (!c.types.isArrayExpression(s))
    throw new Error("CSF: Expected tags array");
  return s.elements.map((e) => {
    if (c.types.isStringLiteral(e))
      return e.value;
    throw new Error("CSF: Expected tag to be string literal");
  });
}
p(fe, "parseTags");
var D = /* @__PURE__ */ p((s, e) => {
  let t = "";
  if (s.loc) {
    let { line: r, column: i } = s.loc?.start || {};
    t = `(line ${r}, col ${i})`;
  }
  return `${e || ""} ${t}`.trim();
}, "formatLocation"), ge = /* @__PURE__ */ p((s) => rt.test(s), "isModuleMock"), de = /* @__PURE__ */ p((s, e, t) => {
  let r = s;
  if (c.types.isCallExpression(s)) {
    let { callee: i, arguments: o } = s;
    if (c.types.isProgram(e) && c.types.isMemberExpression(i) && c.types.isIdentifier(i.object) && c.types.isIdentifier(i.property) && i.property.
    name === "bind" && (o.length === 0 || o.length === 1 && c.types.isObjectExpression(o[0]) && o[0].properties.length === 0)) {
      let a = i.object.name, l = P(a, e);
      l && (t._templates[a] = l, r = l);
    }
  }
  return c.types.isArrowFunctionExpression(r) || c.types.isFunctionDeclaration(r) ? r.params.length > 0 : !1;
}, "isArgsStory"), et = /* @__PURE__ */ p((s) => {
  if (c.types.isArrayExpression(s))
    return s.elements.map((e) => {
      if (c.types.isStringLiteral(e))
        return e.value;
      throw new Error(`Expected string literal named export: ${e}`);
    });
  throw new Error(`Expected array of string literals: ${s}`);
}, "parseExportsOrder"), me = /* @__PURE__ */ p((s, e) => e.reduce(
  (t, r) => {
    let i = s[r];
    return i && (t[r] = i), t;
  },
  {}
), "sortExports"), tt = /* @__PURE__ */ p((s) => {
  if (c.types.isArrowFunctionExpression(s) || c.types.isFunctionDeclaration(s)) {
    let e = s.params;
    if (e.length >= 1) {
      let [t] = e;
      if (c.types.isObjectPattern(t))
        return !!t.properties.find((r) => {
          if (c.types.isObjectProperty(r) && c.types.isIdentifier(r.key))
            return r.key.name === "mount";
        });
    }
  }
  return !1;
}, "hasMount"), rt = /^[.\/#].*\.mock($|\.[^.]*$)/i, R = class extends Error {
  static {
    p(this, "NoMetaError");
  }
  constructor(e, t, r) {
    let i = "".trim();
    super(O.dedent`
      CSF: ${e} ${D(t, r)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, z = class extends Error {
  static {
    p(this, "MultipleMetaError");
  }
  constructor(e, t, r) {
    let i = `${e} ${D(t, r)}`.trim();
    super(O.dedent`
      CSF: ${e} ${D(t, r)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, L = class extends Error {
  static {
    p(this, "MixedFactoryError");
  }
  constructor(e, t, r) {
    let i = `${e} ${D(t, r)}`.trim();
    super(O.dedent`
      CSF: ${e} ${D(t, r)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, M = class extends Error {
  static {
    p(this, "BadMetaError");
  }
  constructor(e, t, r) {
    let i = "".trim();
    super(O.dedent`
      CSF: ${e} ${D(t, r)}
      
      More info: https://storybook.js.org/docs/writing-stories#default-export
    `), this.name = this.constructor.name;
  }
}, X = class {
  constructor(e, t, r) {
    this._stories = {};
    this._metaAnnotations = {};
    this._storyExports = {};
    this._storyPaths = {};
    this._storyStatements = {};
    this._storyAnnotations = {};
    this._templates = {};
    this._ast = e, this._file = r, this._options = t, this.imports = [];
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
    let t = c.types.isIdentifier(e) ? P(e.name, this._ast.program) : e;
    if (c.types.isStringLiteral(t))
      return t.value;
    if (c.types.isTSSatisfiesExpression(t) && c.types.isStringLiteral(t.expression))
      return t.expression.value;
    throw new Error(O.dedent`
      CSF: unexpected dynamic title ${D(t, this._options.fileName)}

      More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#string-literal-titles
    `);
  }
  _parseMeta(e, t) {
    if (this._metaNode)
      throw new z("multiple meta objects", e, this._options.fileName);
    this._metaNode = e;
    let r = {};
    e.properties.forEach((i) => {
      if (c.types.isIdentifier(i.key)) {
        if (this._metaAnnotations[i.key.name] = i.value, i.key.name === "title")
          r.title = this._parseTitle(i.value);
        else if (["includeStories", "excludeStories"].includes(i.key.name))
          r[i.key.name] = Ze(i.value);
        else if (i.key.name === "component") {
          let o = i.value;
          if (c.types.isIdentifier(o)) {
            let l = o.name, f = t.body.find(
              (m) => c.types.isImportDeclaration(m) && m.specifiers.find((g) => g.local.name === l)
            );
            if (f) {
              let { source: m } = f;
              c.types.isStringLiteral(m) && (this._rawComponentPath = m.value);
            }
          }
          let { code: a } = c.recast.print(i.value, {});
          r.component = a;
        } else if (i.key.name === "tags") {
          let o = i.value;
          c.types.isIdentifier(o) && (o = P(o.name, this._ast.program)), r.tags = fe(o);
        } else if (i.key.name === "id")
          if (c.types.isStringLiteral(i.value))
            r.id = i.value.value;
          else
            throw new Error(`Unexpected component id: ${i.value}`);
      }
    }), this._meta = r;
  }
  getStoryExport(e) {
    let t = this._storyExports[e];
    if (t = c.types.isVariableDeclarator(t) ? t.init : t, c.types.isCallExpression(t)) {
      let { callee: r, arguments: i } = t;
      if (c.types.isMemberExpression(r) && c.types.isIdentifier(r.object) && c.types.isIdentifier(r.property) && r.property.name === "bind" &&
      (i.length === 0 || i.length === 1 && c.types.isObjectExpression(i[0]) && i[0].properties.length === 0)) {
        let { name: o } = r.object;
        t = this._templates[o];
      }
    }
    return t;
  }
  parse() {
    let e = this;
    if ((0, c.traverse)(this._ast, {
      ExportDefaultDeclaration: {
        enter(r) {
          let { node: i, parent: o } = r, a = c.types.isIdentifier(i.declaration) && c.types.isProgram(o);
          if (e._options.transformInlineMeta && !a && c.types.isExpression(i.declaration)) {
            let m = r.scope.generateUidIdentifier("meta");
            e._metaVariableName = m.name;
            let g = [
              c.types.variableDeclaration("const", [c.types.variableDeclarator(m, i.declaration)]),
              c.types.exportDefaultDeclaration(m)
            ];
            g.forEach((x) => x.loc = r.node.loc), r.replaceWithMultiple(g);
            return;
          }
          let l, f;
          if (a) {
            let m = i.declaration.name;
            e._metaVariableName = m;
            let g = /* @__PURE__ */ p((x) => c.types.isIdentifier(x.id) && x.id.name === m, "isVariableDeclarator");
            e._metaStatement = e._ast.program.body.find(
              (x) => c.types.isVariableDeclaration(x) && x.declarations.find(g)
            ), f = (e?._metaStatement?.declarations || []).find(
              g
            )?.init;
          } else
            e._metaStatement = i, f = i.declaration;
          if (c.types.isObjectExpression(f) ? l = f : (
            // export default { ... } as Meta<...>
            (c.types.isTSAsExpression(f) || c.types.isTSSatisfiesExpression(f)) && c.types.isObjectExpression(f.expression) && (l = f.expression)
          ), l && c.types.isProgram(o) && e._parseMeta(l, o), e._metaStatement && !e._metaNode)
            throw new R(
              "default export must be an object",
              e._metaStatement,
              e._options.fileName
            );
          e._metaPath = r;
        }
      },
      ExportNamedDeclaration: {
        enter(r) {
          let { node: i, parent: o } = r, a;
          c.types.isVariableDeclaration(i.declaration) ? a = i.declaration.declarations.filter((l) => c.types.isVariableDeclarator(l)) : c.types.
          isFunctionDeclaration(i.declaration) && (a = [i.declaration]), a ? a.forEach((l) => {
            if (c.types.isIdentifier(l.id)) {
              let f = !1, { name: m } = l.id;
              if (m === "__namedExportsOrder" && c.types.isVariableDeclarator(l)) {
                e._namedExportsOrder = et(l.init);
                return;
              }
              e._storyExports[m] = l, e._storyPaths[m] = r, e._storyStatements[m] = i;
              let g = (0, I.storyNameFromExport)(m);
              e._storyAnnotations[m] ? pe.warn(
                `Unexpected annotations for "${m}" before story declaration`
              ) : e._storyAnnotations[m] = {};
              let x;
              if (c.types.isVariableDeclarator(l) ? x = c.types.isTSAsExpression(l.init) || c.types.isTSSatisfiesExpression(l.init) ? l.init.
              expression : l.init : x = l, c.types.isCallExpression(x) && c.types.isMemberExpression(x.callee) && c.types.isIdentifier(x.callee.
              property) && x.callee.property.name === "story" && (f = !0, x = x.arguments[0]), e._metaIsFactory && !f)
                throw new L(
                  "expected factory story",
                  x,
                  e._options.fileName
                );
              if (!e._metaIsFactory && f)
                throw e._metaNode ? new L(
                  "expected non-factory story",
                  x,
                  e._options.fileName
                ) : new M(
                  "meta() factory must be imported from .storybook/preview configuration",
                  x,
                  e._options.fileName
                );
              let E = {};
              c.types.isObjectExpression(x) ? (E.__isArgsStory = !0, x.properties.forEach((b) => {
                if (c.types.isIdentifier(b.key)) {
                  if (b.key.name === "render")
                    E.__isArgsStory = de(
                      b.value,
                      o,
                      e
                    );
                  else if (b.key.name === "name" && c.types.isStringLiteral(b.value))
                    g = b.value.value;
                  else if (b.key.name === "storyName" && c.types.isStringLiteral(b.value))
                    pe.warn(
                      `Unexpected usage of "storyName" in "${m}". Please use "name" instead.`
                    );
                  else if (b.key.name === "parameters" && c.types.isObjectExpression(b.value)) {
                    let h = b.value.properties.find(
                      (N) => c.types.isObjectProperty(N) && c.types.isIdentifier(N.key) && N.key.name === "__id"
                    );
                    h && (E.__id = h.value.value);
                  }
                  e._storyAnnotations[m][b.key.name] = b.value;
                }
              })) : E.__isArgsStory = de(x, o, e), e._stories[m] = {
                id: "FIXME",
                name: g,
                parameters: E,
                __stats: {
                  factory: f
                }
              };
            }
          }) : i.specifiers.length > 0 && i.specifiers.forEach((l) => {
            if (c.types.isExportSpecifier(l) && c.types.isIdentifier(l.exported)) {
              let { name: f } = l.exported, { name: m } = l.local, g = c.types.isProgram(o) ? P(l.local.name, o) : l.local;
              if (f === "default") {
                let x;
                c.types.isObjectExpression(g) ? x = g : (
                  // export default { ... } as Meta<...>
                  c.types.isTSAsExpression(g) && c.types.isObjectExpression(g.expression) && (x = g.expression)
                ), x && c.types.isProgram(o) && e._parseMeta(x, o);
              } else
                e._storyAnnotations[f] = {}, e._storyStatements[f] = g, e._storyPaths[f] = r, e._stories[f] = {
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
        enter({ node: r, parent: i }) {
          let { expression: o } = r;
          if (c.types.isProgram(i) && c.types.isAssignmentExpression(o) && c.types.isMemberExpression(o.left) && c.types.isIdentifier(o.left.
          object) && c.types.isIdentifier(o.left.property)) {
            let a = o.left.object.name, l = o.left.property.name, f = o.right;
            if (e._storyAnnotations[a] && (l === "story" && c.types.isObjectExpression(f) ? f.properties.forEach((m) => {
              c.types.isIdentifier(m.key) && (e._storyAnnotations[a][m.key.name] = m.value);
            }) : e._storyAnnotations[a][l] = f), l === "storyName" && c.types.isStringLiteral(f)) {
              let m = f.value, g = e._stories[a];
              if (!g)
                return;
              g.name = m;
            }
          }
        }
      },
      CallExpression: {
        enter(r) {
          let { node: i } = r, { callee: o } = i;
          if (c.types.isIdentifier(o) && o.name === "storiesOf")
            throw new Error(O.dedent`
              Unexpected \`storiesOf\` usage: ${D(i, e._options.fileName)}.

              SB8 does not support \`storiesOf\`. 
            `);
          if (c.types.isMemberExpression(o) && c.types.isIdentifier(o.property) && o.property.name === "meta" && c.types.isIdentifier(o.object) &&
          i.arguments.length > 0) {
            let l = r.scope.getBinding(o.object.name)?.path?.parentPath?.node;
            if (c.types.isImportDeclaration(l))
              if (ue(l.source.value)) {
                let f = i.arguments[0];
                e._metaVariableName = o.property.name, e._metaIsFactory = !0, e._parseMeta(f, e._ast.program);
              } else
                throw new M(
                  "meta() factory must be imported from .storybook/preview configuration",
                  l,
                  e._options.fileName
                );
          }
        }
      },
      ImportDeclaration: {
        enter({ node: r }) {
          let { source: i } = r;
          if (c.types.isStringLiteral(i))
            e.imports.push(i.value);
          else
            throw new Error("CSF: unexpected import source");
        }
      }
    }), !e._meta)
      throw new R("missing default export", e._ast, e._options.fileName);
    let t = Object.entries(e._stories);
    if (e._meta.title = this._options.makeTitle(e._meta?.title), e._metaAnnotations.play && (e._meta.tags = [...e._meta.tags || [], "play-fn"]),
    e._stories = t.reduce(
      (r, [i, o]) => {
        if (!(0, I.isExportStory)(i, e._meta))
          return r;
        let a = o.parameters?.__id ?? (0, I.toId)(e._meta?.id || e._meta?.title, (0, I.storyNameFromExport)(i)), l = { ...o.parameters, __id: a },
        { includeStories: f } = e._meta || {};
        i === "__page" && (t.length === 1 || Array.isArray(f) && f.length === 1) && (l.docsOnly = !0), r[i] = { ...o, id: a, parameters: l };
        let m = e._storyAnnotations[i], { tags: g, play: x } = m;
        if (g) {
          let h = c.types.isIdentifier(g) ? P(g.name, this._ast.program) : g;
          r[i].tags = fe(h);
        }
        x && (r[i].tags = [...r[i].tags || [], "play-fn"]);
        let E = r[i].__stats;
        ["play", "render", "loaders", "beforeEach", "globals", "tags"].forEach((h) => {
          E[h] = !!m[h] || !!e._metaAnnotations[h];
        });
        let b = e.getStoryExport(i);
        return E.storyFn = !!(c.types.isArrowFunctionExpression(b) || c.types.isFunctionDeclaration(b)), E.mount = tt(m.play ?? e._metaAnnotations.
        play), E.moduleMock = !!e.imports.find((h) => ge(h)), r;
      },
      {}
    ), Object.keys(e._storyExports).forEach((r) => {
      (0, I.isExportStory)(r, e._meta) || (delete e._storyExports[r], delete e._storyAnnotations[r], delete e._storyStatements[r]);
    }), e._namedExportsOrder) {
      let r = Object.keys(e._storyExports);
      e._storyExports = me(e._storyExports, e._namedExportsOrder), e._stories = me(e._stories, e._namedExportsOrder);
      let i = Object.keys(e._storyExports);
      if (r.length !== i.length)
        throw new Error(
          `Missing exports after sort: ${r.filter(
            (o) => !i.includes(o)
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
    return Object.entries(this._stories).map(([t, r]) => {
      let i = [...this._meta?.tags ?? [], ...r.tags ?? []];
      return {
        type: "story",
        importPath: e,
        rawComponentPath: this._rawComponentPath,
        exportName: t,
        name: r.name,
        title: this.meta?.title,
        metaId: this.meta?.id,
        tags: i,
        __id: r.id,
        __stats: r.__stats
      };
    });
  }
}, xe = /* @__PURE__ */ p(({
  code: s,
  filename: e = "",
  ast: t
}) => new c.BabelFileClass({ filename: e }, { code: s, ast: t ?? (0, c.babelParse)(s) }), "babelParseFile"), J = /* @__PURE__ */ p((s, e) => {
  let t = (0, c.babelParse)(s), r = xe({ code: s, filename: e.fileName, ast: t });
  return new X(t, e, r);
}, "loadCsf"), Z = /* @__PURE__ */ p((s, e = { sourceMaps: !1 }, t) => {
  let r = (0, c.generate)(s._ast, e, t);
  return e.sourceMaps ? r : r.code;
}, "formatCsf"), ye = /* @__PURE__ */ p((s, e = {}) => c.recast.print(s._ast, e), "printCsf"), it = /* @__PURE__ */ p(async (s, e) => {
  let t = (await (0, K.readFile)(s, "utf-8")).toString();
  return J(t, { ...e, fileName: s });
}, "readCsf"), st = /* @__PURE__ */ p(async (s, e) => {
  if (!(e || s._options.fileName))
    throw new Error("Please specify a fileName for writeCsf");
  await (0, K.writeFile)(e, ye(s).code);
}, "writeCsf");

// src/csf-tools/ConfigFile.ts
var Y = require("node:fs/promises"), n = require("@storybook/core/babel"), be = G($(), 1);
var ee = console, te = /* @__PURE__ */ p(({
  expectedType: s,
  foundType: e,
  node: t
}) => be.dedent`
      CSF Parsing error: Expected '${s}' but found '${e}' instead in '${t?.type}'.
    `, "getCsfParsingErrorMessage"), U = /* @__PURE__ */ p((s) => n.types.isIdentifier(s.key) ? s.key.name : n.types.isStringLiteral(s.key) ?
s.key.value : null, "propKey"), Q = /* @__PURE__ */ p((s) => n.types.isTSAsExpression(s) || n.types.isTSSatisfiesExpression(s) ? Q(s.expression) :
s, "unwrap"), Ee = /* @__PURE__ */ p((s, e) => {
  if (s.length === 0)
    return e;
  if (n.types.isObjectExpression(e)) {
    let [t, ...r] = s, i = e.properties.find((o) => U(o) === t);
    if (i)
      return Ee(r, i.value);
  }
}, "_getPath"), he = /* @__PURE__ */ p((s, e) => {
  if (s.length === 0) {
    if (n.types.isObjectExpression(e))
      return e.properties;
    throw new Error("Expected object expression");
  }
  if (n.types.isObjectExpression(e)) {
    let [t, ...r] = s, i = e.properties.find((o) => U(o) === t);
    if (i)
      return r.length === 0 ? e.properties : he(r, i.value);
  }
}, "_getPathProperties"), _e = /* @__PURE__ */ p((s, e) => {
  let t = null, r = null;
  return e.body.find((i) => (n.types.isVariableDeclaration(i) ? r = i.declarations : n.types.isExportNamedDeclaration(i) && n.types.isVariableDeclaration(
  i.declaration) && (r = i.declaration.declarations), r && r.find((o) => n.types.isVariableDeclarator(o) && n.types.isIdentifier(o.id) && o.
  id.name === s ? (t = o, !0) : !1))), t;
}, "_findVarDeclarator"), F = /* @__PURE__ */ p((s, e) => _e(s, e)?.init, "_findVarInitialization"), q = /* @__PURE__ */ p((s, e) => {
  if (s.length === 0)
    return e;
  let [t, ...r] = s, i = q(r, e);
  return n.types.objectExpression([n.types.objectProperty(n.types.identifier(t), i)]);
}, "_makeObjectExpression"), re = /* @__PURE__ */ p((s, e, t) => {
  let [r, ...i] = s, o = t.properties.find(
    (a) => U(a) === r
  );
  o ? n.types.isObjectExpression(o.value) && i.length > 0 ? re(i, e, o.value) : o.value = q(i, e) : t.properties.push(
    n.types.objectProperty(n.types.identifier(r), q(i, e))
  );
}, "_updateExportNode"), H = class {
  constructor(e, t, r) {
    this._exports = {};
    // FIXME: this is a hack. this is only used in the case where the user is
    // modifying a named export that's a scalar. The _exports map is not suitable
    // for that. But rather than refactor the whole thing, we just use this as a stopgap.
    this._exportDecls = {};
    this.hasDefaultExport = !1;
    this._ast = e, this._code = t, this.fileName = r;
  }
  static {
    p(this, "ConfigFile");
  }
  _parseExportsObject(e) {
    this._exportsObject = e, e.properties.forEach((t) => {
      let r = U(t);
      if (r) {
        let i = t.value;
        n.types.isIdentifier(i) && (i = F(i.name, this._ast.program)), this._exports[r] = i;
      }
    });
  }
  parse() {
    let e = this;
    return (0, n.traverse)(this._ast, {
      ExportDefaultDeclaration: {
        enter({ node: t, parent: r }) {
          e.hasDefaultExport = !0;
          let i = n.types.isIdentifier(t.declaration) && n.types.isProgram(r) ? F(t.declaration.name, r) : t.declaration;
          i = Q(i), n.types.isCallExpression(i) && n.types.isObjectExpression(i.arguments[0]) && (i = i.arguments[0]), n.types.isObjectExpression(
          i) ? e._parseExportsObject(i) : ee.warn(
            te({
              expectedType: "ObjectExpression",
              foundType: i?.type,
              node: i || t.declaration
            })
          );
        }
      },
      ExportNamedDeclaration: {
        enter({ node: t, parent: r }) {
          if (n.types.isVariableDeclaration(t.declaration))
            t.declaration.declarations.forEach((i) => {
              if (n.types.isVariableDeclarator(i) && n.types.isIdentifier(i.id)) {
                let { name: o } = i.id, a = i.init;
                n.types.isIdentifier(a) && (a = F(a.name, r)), e._exports[o] = a, e._exportDecls[o] = i;
              }
            });
          else if (n.types.isFunctionDeclaration(t.declaration)) {
            let i = t.declaration;
            if (n.types.isIdentifier(i.id)) {
              let { name: o } = i.id;
              e._exportDecls[o] = i;
            }
          } else t.specifiers ? t.specifiers.forEach((i) => {
            if (n.types.isExportSpecifier(i) && n.types.isIdentifier(i.local) && n.types.isIdentifier(i.exported)) {
              let { name: o } = i.local, { name: a } = i.exported, l = _e(o, r);
              l && (e._exports[a] = l.init, e._exportDecls[a] = l);
            }
          }) : ee.warn(
            te({
              expectedType: "VariableDeclaration",
              foundType: t.declaration?.type,
              node: t.declaration
            })
          );
        }
      },
      ExpressionStatement: {
        enter({ node: t, parent: r }) {
          if (n.types.isAssignmentExpression(t.expression) && t.expression.operator === "=") {
            let { left: i, right: o } = t.expression;
            if (n.types.isMemberExpression(i) && n.types.isIdentifier(i.object) && i.object.name === "module" && n.types.isIdentifier(i.property) &&
            i.property.name === "exports") {
              let a = o;
              n.types.isIdentifier(o) && (a = F(o.name, r)), a = Q(a), n.types.isObjectExpression(a) ? (e._exportsObject = a, a.properties.forEach(
              (l) => {
                let f = U(l);
                if (f) {
                  let m = l.value;
                  n.types.isIdentifier(m) && (m = F(
                    m.name,
                    r
                  )), e._exports[f] = m;
                }
              })) : ee.warn(
                te({
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
        enter: /* @__PURE__ */ p(({ node: t }) => {
          n.types.isIdentifier(t.callee) && t.callee.name === "definePreview" && t.arguments.length === 1 && n.types.isObjectExpression(t.arguments[0]) &&
          e._parseExportsObject(t.arguments[0]);
        }, "enter")
      }
    }), e;
  }
  getFieldNode(e) {
    let [t, ...r] = e, i = this._exports[t];
    if (i)
      return Ee(r, i);
  }
  getFieldProperties(e) {
    let [t, ...r] = e, i = this._exports[t];
    if (i)
      return he(r, i);
  }
  getFieldValue(e) {
    let t = this.getFieldNode(e);
    if (t) {
      let { code: r } = (0, n.generate)(t, {});
      return (0, eval)(`(() => (${r}))()`);
    }
  }
  getSafeFieldValue(e) {
    try {
      return this.getFieldValue(e);
    } catch {
    }
  }
  setFieldNode(e, t) {
    let [r, ...i] = e, o = this._exports[r];
    if (this._exportsObject)
      re(e, t, this._exportsObject), this._exports[e[0]] = t;
    else if (o && n.types.isObjectExpression(o) && i.length > 0)
      re(i, t, o);
    else if (o && i.length === 0 && this._exportDecls[e[0]]) {
      let a = this._exportDecls[e[0]];
      n.types.isVariableDeclarator(a) && (a.init = q([], t));
    } else {
      if (this.hasDefaultExport)
        throw new Error(
          `Could not set the "${e.join(
            "."
          )}" field as the default export is not an object in this file.`
        );
      {
        let a = q(i, t), l = n.types.exportNamedDeclaration(
          n.types.variableDeclaration("const", [n.types.variableDeclarator(n.types.identifier(r), a)])
        );
        this._exports[r] = a, this._ast.program.body.push(l);
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
    let t = this.getFieldNode(e);
    if (t)
      return this._getPresetValue(t, "name");
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
    let t = this.getFieldNode(e);
    if (!t)
      return;
    let r = [];
    return n.types.isArrayExpression(t) && t.elements.forEach((i) => {
      r.push(this._getPresetValue(i, "name"));
    }), r;
  }
  _getPnpWrappedValue(e) {
    if (n.types.isCallExpression(e)) {
      let t = e.arguments[0];
      if (n.types.isStringLiteral(t))
        return t.value;
    }
  }
  /**
   * Given a node and a fallback property, returns a **non-evaluated** string value of the node.
   *
   * 1. `{ node: 'value' }`
   * 2. `{ node: { fallbackProperty: 'value' } }`
   */
  _getPresetValue(e, t) {
    let r;
    if (n.types.isStringLiteral(e) ? r = e.value : n.types.isObjectExpression(e) ? e.properties.forEach((i) => {
      n.types.isObjectProperty(i) && n.types.isIdentifier(i.key) && i.key.name === t && (n.types.isStringLiteral(i.value) ? r = i.value.value :
      r = this._getPnpWrappedValue(i.value)), n.types.isObjectProperty(i) && n.types.isStringLiteral(i.key) && i.key.value === "name" && n.types.
      isStringLiteral(i.value) && (r = i.value.value);
    }) : n.types.isCallExpression(e) && (r = this._getPnpWrappedValue(e)), !r)
      throw new Error(
        `The given node must be a string literal or an object expression with a "${t}" property that is a string literal.`
      );
    return r;
  }
  removeField(e) {
    let t = /* @__PURE__ */ p((i, o) => {
      let a = i.findIndex(
        (l) => n.types.isIdentifier(l.key) && l.key.name === o || n.types.isStringLiteral(l.key) && l.key.value === o
      );
      a >= 0 && i.splice(a, 1);
    }, "removeProperty");
    if (e.length === 1) {
      let i = !1;
      if (this._ast.program.body.forEach((o) => {
        if (n.types.isExportNamedDeclaration(o) && n.types.isVariableDeclaration(o.declaration)) {
          let a = o.declaration.declarations[0];
          n.types.isIdentifier(a.id) && a.id.name === e[0] && (this._ast.program.body.splice(this._ast.program.body.indexOf(o), 1), i = !0);
        }
        if (n.types.isExportDefaultDeclaration(o)) {
          let a = o.declaration;
          if (n.types.isIdentifier(a) && (a = F(a.name, this._ast.program)), a = Q(a), n.types.isObjectExpression(a)) {
            let l = a.properties;
            t(l, e[0]), i = !0;
          }
        }
        if (n.types.isExpressionStatement(o) && n.types.isAssignmentExpression(o.expression) && n.types.isMemberExpression(o.expression.left) &&
        n.types.isIdentifier(o.expression.left.object) && o.expression.left.object.name === "module" && n.types.isIdentifier(o.expression.left.
        property) && o.expression.left.property.name === "exports" && n.types.isObjectExpression(o.expression.right)) {
          let a = o.expression.right.properties;
          t(a, e[0]), i = !0;
        }
      }), i)
        return;
    }
    let r = this.getFieldProperties(e);
    if (r) {
      let i = e.at(-1);
      t(r, i);
    }
  }
  appendValueToArray(e, t) {
    let r = this.valueToNode(t);
    r && this.appendNodeToArray(e, r);
  }
  appendNodeToArray(e, t) {
    let r = this.getFieldNode(e);
    if (!r)
      this.setFieldNode(e, n.types.arrayExpression([t]));
    else if (n.types.isArrayExpression(r))
      r.elements.push(t);
    else
      throw new Error(`Expected array at '${e.join(".")}', got '${r.type}'`);
  }
  /**
   * Specialized helper to remove addons or other array entries that can either be strings or
   * objects with a name property.
   */
  removeEntryFromArray(e, t) {
    let r = this.getFieldNode(e);
    if (r)
      if (n.types.isArrayExpression(r)) {
        let i = r.elements.findIndex((o) => n.types.isStringLiteral(o) ? o.value === t : n.types.isObjectExpression(o) ? this._getPresetValue(
        o, "name") === t : this._getPnpWrappedValue(o) === t);
        if (i >= 0)
          r.elements.splice(i, 1);
        else
          throw new Error(`Could not find '${t}' in array at '${e.join(".")}'`);
      } else
        throw new Error(`Expected array at '${e.join(".")}', got '${r.type}'`);
  }
  _inferQuotes() {
    if (!this._quotes) {
      let e = (this._ast.tokens || []).slice(0, 500).reduce(
        (t, r) => (r.type.label === "string" && (t[this._code[r.start]] += 1), t),
        { "'": 0, '"': 0 }
      );
      this._quotes = e["'"] > e['"'] ? "single" : "double";
    }
    return this._quotes;
  }
  valueToNode(e) {
    let t = this._inferQuotes(), r;
    if (t === "single") {
      let { code: i } = (0, n.generate)(n.types.valueToNode(e), { jsescOption: { quotes: t } }), o = (0, n.babelParse)(`const __x = ${i}`);
      (0, n.traverse)(o, {
        VariableDeclaration: {
          enter({ node: a }) {
            a.declarations.length === 1 && n.types.isVariableDeclarator(a.declarations[0]) && n.types.isIdentifier(a.declarations[0].id) && a.
            declarations[0].id.name === "__x" && (r = a.declarations[0].init);
          }
        }
      });
    } else
      r = n.types.valueToNode(e);
    return r;
  }
  setFieldValue(e, t) {
    let r = this.valueToNode(t);
    if (!r)
      throw new Error(`Unexpected value ${JSON.stringify(t)}`);
    this.setFieldNode(e, r);
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
  setRequireImport(e, t) {
    let r = this._ast.program.body.find(
      (a) => n.types.isVariableDeclaration(a) && a.declarations.length === 1 && n.types.isVariableDeclarator(a.declarations[0]) && n.types.isCallExpression(
      a.declarations[0].init) && n.types.isIdentifier(a.declarations[0].init.callee) && a.declarations[0].init.callee.name === "require" && n.types.
      isStringLiteral(a.declarations[0].init.arguments[0]) && a.declarations[0].init.arguments[0].value === t
    ), i = /* @__PURE__ */ p((a) => n.types.isObjectPattern(r?.declarations[0].id) && r?.declarations[0].id.properties.find(
      (l) => n.types.isObjectProperty(l) && n.types.isIdentifier(l.key) && l.key.name === a
    ), "hasRequireSpecifier"), o = /* @__PURE__ */ p((a, l) => a.declarations.length === 1 && n.types.isVariableDeclarator(a.declarations[0]) &&
    n.types.isIdentifier(a.declarations[0].id) && a.declarations[0].id.name === l, "hasDefaultRequireSpecifier");
    if (typeof e == "string") {
      let a = /* @__PURE__ */ p(() => {
        this._ast.program.body.unshift(
          n.types.variableDeclaration("const", [
            n.types.variableDeclarator(
              n.types.identifier(e),
              n.types.callExpression(n.types.identifier("require"), [n.types.stringLiteral(t)])
            )
          ])
        );
      }, "addDefaultRequireSpecifier");
      r && o(r, e) || a();
    } else r ? e.forEach((a) => {
      i(a) || r.declarations[0].id.properties.push(
        n.types.objectProperty(n.types.identifier(a), n.types.identifier(a), void 0, !0)
      );
    }) : this._ast.program.body.unshift(
      n.types.variableDeclaration("const", [
        n.types.variableDeclarator(
          n.types.objectPattern(
            e.map(
              (a) => n.types.objectProperty(n.types.identifier(a), n.types.identifier(a), void 0, !0)
            )
          ),
          n.types.callExpression(n.types.identifier("require"), [n.types.stringLiteral(t)])
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
  setImport(e, t) {
    let r = /* @__PURE__ */ p((f) => n.types.importSpecifier(n.types.identifier(f), n.types.identifier(f)), "getNewImportSpecifier"), i = /* @__PURE__ */ p(
    (f, m) => f.specifiers.find(
      (g) => n.types.isImportSpecifier(g) && n.types.isIdentifier(g.imported) && g.imported.name === m
    ), "hasImportSpecifier"), o = /* @__PURE__ */ p((f, m) => f.specifiers.find(
      (g) => n.types.isImportNamespaceSpecifier(g) && n.types.isIdentifier(g.local) && g.local.name === m
    ), "hasNamespaceImportSpecifier"), a = /* @__PURE__ */ p((f, m) => f.specifiers.find(
      (g) => n.types.isImportDefaultSpecifier(g) && n.types.isIdentifier(g.local) && g.local.name === m
    ), "hasDefaultImportSpecifier"), l = this._ast.program.body.find(
      (f) => n.types.isImportDeclaration(f) && f.source.value === t
    );
    e === null ? l || this._ast.program.body.unshift(n.types.importDeclaration([], n.types.stringLiteral(t))) : typeof e == "string" ? l ? a(
    l, e) || l.specifiers.push(
      n.types.importDefaultSpecifier(n.types.identifier(e))
    ) : this._ast.program.body.unshift(
      n.types.importDeclaration(
        [n.types.importDefaultSpecifier(n.types.identifier(e))],
        n.types.stringLiteral(t)
      )
    ) : Array.isArray(e) ? l ? e.forEach((f) => {
      i(l, f) || l.specifiers.push(r(f));
    }) : this._ast.program.body.unshift(
      n.types.importDeclaration(
        e.map(r),
        n.types.stringLiteral(t)
      )
    ) : e.namespace && (l ? o(l, e.namespace) || l.specifiers.push(
      n.types.importNamespaceSpecifier(n.types.identifier(e.namespace))
    ) : this._ast.program.body.unshift(
      n.types.importDeclaration(
        [n.types.importNamespaceSpecifier(n.types.identifier(e.namespace))],
        n.types.stringLiteral(t)
      )
    ));
  }
}, je = /* @__PURE__ */ p((s, e) => {
  let t = (0, n.babelParse)(s);
  return new H(t, s, e);
}, "loadConfig"), Se = /* @__PURE__ */ p((s) => Pe(s).code, "formatConfig"), Pe = /* @__PURE__ */ p((s, e = {}) => n.recast.print(s._ast, e),
"printConfig"), nt = /* @__PURE__ */ p(async (s) => {
  let e = (await (0, Y.readFile)(s, "utf-8")).toString();
  return je(e, s).parse();
}, "readConfig"), ot = /* @__PURE__ */ p(async (s, e) => {
  let t = e || s.fileName;
  if (!t)
    throw new Error("Please specify a fileName for writeConfig");
  await (0, Y.writeFile)(t, Se(s));
}, "writeConfig"), at = /* @__PURE__ */ p((s) => !!s._ast.program.body.find((t) => n.types.isImportDeclaration(t) && t.source.value.includes(
"@storybook") && t.specifiers.some((r) => n.types.isImportSpecifier(r) && n.types.isIdentifier(r.imported) && r.imported.name === "definePre\
view")), "isCsfFactoryPreview");

// src/csf-tools/getStorySortParameter.ts
var y = require("@storybook/core/babel"), Ie = G($(), 1);
var lt = console, ie = /* @__PURE__ */ p((s, e) => {
  let t;
  return s.properties.forEach((r) => {
    y.types.isIdentifier(r.key) && r.key.name === e && (t = r.value);
  }), t;
}, "getValue"), se = /* @__PURE__ */ p((s) => {
  let e = B(s);
  if (y.types.isArrayExpression(e))
    return e.elements.map((t) => se(t));
  if (y.types.isObjectExpression(e))
    return e.properties.reduce((t, r) => (y.types.isIdentifier(r.key) && (t[r.key.name] = se(r.value)), t), {});
  if (y.types.isLiteral(e))
    return e.value;
  if (y.types.isIdentifier(e))
    return C(e.name, !0);
  throw new Error(`Unknown node type ${e.type}`);
}, "parseValue"), C = /* @__PURE__ */ p((s, e) => {
  let t = Ie.dedent`
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
    throw new Error(t);
  lt.info(t);
}, "unsupported"), B = /* @__PURE__ */ p((s) => y.types.isTSAsExpression(s) || y.types.isTSSatisfiesExpression(s) ? s.expression : s, "strip\
TSModifiers"), De = /* @__PURE__ */ p((s) => {
  let e = B(s);
  if (y.types.isObjectExpression(e)) {
    let t = ie(e, "options");
    if (t) {
      if (y.types.isObjectExpression(t))
        return ie(t, "storySort");
      C("options", !0);
    }
  }
}, "parseParameters"), Oe = /* @__PURE__ */ p((s, e) => {
  let t = B(s);
  if (y.types.isObjectExpression(t)) {
    let r = ie(t, "parameters");
    if (y.types.isIdentifier(r) && (r = P(r.name, e)), r)
      return De(r);
  } else
    C("default", !0);
}, "parseDefault"), ct = /* @__PURE__ */ p((s) => {
  if (!s.includes("storySort"))
    return;
  let e, t = (0, y.babelParse)(s);
  if ((0, y.traverse)(t, {
    ExportNamedDeclaration: {
      enter({ node: r }) {
        y.types.isVariableDeclaration(r.declaration) ? r.declaration.declarations.forEach((i) => {
          if (y.types.isVariableDeclarator(i) && y.types.isIdentifier(i.id)) {
            let { name: o } = i.id;
            if (o === "parameters" && i.init) {
              let a = B(i.init);
              e = De(a);
            }
          }
        }) : r.specifiers.forEach((i) => {
          y.types.isIdentifier(i.exported) && i.exported.name === "parameters" && C("parameters", !1);
        });
      }
    },
    ExportDefaultDeclaration: {
      enter({ node: r }) {
        let i = r.declaration;
        y.types.isIdentifier(i) && (i = P(i.name, t.program)), i = B(i), y.types.isCallExpression(i) && y.types.isObjectExpression(i.arguments?.[0]) ?
        e = Oe(i.arguments[0], t.program) : y.types.isObjectExpression(i) ? e = Oe(i, t.program) : C("default", !1);
      }
    }
  }), !!e) {
    if (y.types.isArrowFunctionExpression(e)) {
      let { code: r } = (0, y.generate)(e, {});
      return (0, eval)(r);
    }
    if (y.types.isFunctionExpression(e)) {
      let { code: r } = (0, y.generate)(e, {}), i = e.id?.name, o = `(a, b) => {
      ${r};
      return ${i}(a, b)
    }`;
      return (0, eval)(o);
    }
    return y.types.isLiteral(e) || y.types.isArrayExpression(e) || y.types.isObjectExpression(e) ? se(e) : C("storySort", !0);
  }
}, "getStorySortParameter");

// src/csf-tools/enrichCsf.ts
var u = require("@storybook/core/babel");
var Ne = /* @__PURE__ */ p((s, e, t, r) => {
  let i = e.getStoryExport(t), o = u.types.isCallExpression(i) && u.types.isMemberExpression(i.callee) && u.types.isIdentifier(i.callee.object) &&
  i.callee.object.name === "meta", a = !r?.disableSource && Fe(i), l = !r?.disableDescription && ne(e._storyStatements[t]), f = [], m = o ? u.types.
  memberExpression(u.types.identifier(t), u.types.identifier("input")) : u.types.identifier(t), g = u.types.memberExpression(m, u.types.identifier(
  "parameters"));
  f.push(u.types.spreadElement(g));
  let x = u.types.optionalMemberExpression(
    g,
    u.types.identifier("docs"),
    !1,
    !0
  ), E = [];
  if (a) {
    let b = u.types.optionalMemberExpression(
      x,
      u.types.identifier("source"),
      !1,
      !0
    );
    E.push(
      u.types.objectProperty(
        u.types.identifier("source"),
        u.types.objectExpression([
          u.types.objectProperty(u.types.identifier("originalSource"), u.types.stringLiteral(a)),
          u.types.spreadElement(b)
        ])
      )
    );
  }
  if (l) {
    let b = u.types.optionalMemberExpression(
      x,
      u.types.identifier("description"),
      !1,
      !0
    );
    E.push(
      u.types.objectProperty(
        u.types.identifier("description"),
        u.types.objectExpression([
          u.types.objectProperty(u.types.identifier("story"), u.types.stringLiteral(l)),
          u.types.spreadElement(b)
        ])
      )
    );
  }
  if (E.length > 0) {
    f.push(
      u.types.objectProperty(
        u.types.identifier("docs"),
        u.types.objectExpression([u.types.spreadElement(x), ...E])
      )
    );
    let b = u.types.expressionStatement(
      u.types.assignmentExpression("=", g, u.types.objectExpression(f))
    );
    s._ast.program.body.push(b);
  }
}, "enrichCsfStory"), ve = /* @__PURE__ */ p((s, e, t) => {
  if (!e.length) {
    s.properties.find(
      (f) => u.types.isObjectProperty(f) && u.types.isIdentifier(f.key) && f.key.name === "component"
    ) || s.properties.unshift(t);
    return;
  }
  let [r, ...i] = e, o = s.properties.find(
    (l) => u.types.isObjectProperty(l) && u.types.isIdentifier(l.key) && l.key.name === r && u.types.isObjectExpression(l.value)
  ), a;
  o ? a = o.value : (a = u.types.objectExpression([]), s.properties.push(u.types.objectProperty(u.types.identifier(r), a))), ve(a, i, t);
}, "addComponentDescription"), we = /* @__PURE__ */ p((s, e, t) => {
  let r = !t?.disableDescription && ne(e._metaStatement);
  if (r) {
    let i = s._metaNode;
    i && u.types.isObjectExpression(i) && ve(
      i,
      ["parameters", "docs", "description"],
      u.types.objectProperty(u.types.identifier("component"), u.types.stringLiteral(r))
    );
  }
}, "enrichCsfMeta"), pt = /* @__PURE__ */ p((s, e, t) => {
  we(s, e, t), Object.keys(s._storyExports).forEach((r) => {
    Ne(s, e, r, t);
  });
}, "enrichCsf"), Fe = /* @__PURE__ */ p((s) => {
  let e = u.types.isVariableDeclarator(s) ? s.init : s, { code: t } = (0, u.generate)(e, {});
  return t;
}, "extractSource"), ne = /* @__PURE__ */ p((s) => s?.leadingComments ? s.leadingComments.map((t) => t.type === "CommentLine" || !t.value.startsWith(
"*") ? null : t.value.split(`
`).map((r) => r.replace(/^(\s+)?(\*+)?(\s)?/, "")).join(`
`).trim()).filter(Boolean).join(`
`) : "", "extractDescription");

// src/csf-tools/index.ts
var Ae = require("@storybook/core/babel");

// src/csf-tools/vitest-plugin/transformer.ts
var d = require("@storybook/core/babel"), Te = require("@storybook/core/common"), ke = require("@storybook/core/csf"), oe = G($(), 1);
var Ce = console, ft = /* @__PURE__ */ p((s, e) => !(e.include.length && !e.include.some((t) => s?.includes(t)) || e.exclude.some((t) => s?.
includes(t))), "isValidTest");
async function Ve({
  code: s,
  fileName: e,
  configDir: t,
  stories: r,
  tagsFilter: i,
  previewLevelTags: o = []
}) {
  if (!/\.stor(y|ies)\./.test(e))
    return s;
  let l = J(s, {
    fileName: e,
    transformInlineMeta: !0,
    makeTitle: /* @__PURE__ */ p((_) => {
      let S = (0, Te.getStoryTitle)({
        storyFilePath: e,
        configDir: t,
        stories: r,
        userTitle: _
      }) || "unknown";
      return S === "unknown" && Ce.warn(
        oe.dedent`
            [Storybook]: Could not calculate story title for "${e}".
            Please make sure that this file matches the globs included in the "stories" field in your Storybook configuration at "${t}".
          `
      ), S;
    }, "makeTitle")
  }).parse(), f = l._ast, m = l._metaVariableName, g = l._metaNode, x = g.properties.find(
    (_) => d.types.isObjectProperty(_) && d.types.isIdentifier(_.key) && _.key.name === "title"
  ), E = d.types.stringLiteral(l._meta?.title || "unknown");
  if (x ? d.types.isObjectProperty(x) && (x.value = E) : g.properties.push(d.types.objectProperty(d.types.identifier("title"), E)), !g || !l.
  _meta)
    throw new Error(
      `The Storybook vitest plugin could not detect the meta (default export) object in the story file. 

Please make sure you have a default export with the meta object. If you are using a different export format that is not supported, please fi\
le an issue with details about your use case.`
    );
  let b = {};
  Object.keys(l._stories).map((_) => {
    let S = (0, ke.combineTags)(
      "test",
      "dev",
      ...o,
      ...l.meta?.tags || [],
      ...l._stories[_].tags || []
    );
    ft(S, i) && (b[_] = l._storyStatements[_]);
  });
  let h = l._file.path.scope.generateUidIdentifier("test"), N = l._file.path.scope.generateUidIdentifier("describe");
  if (Object.keys(b).length === 0) {
    let _ = d.types.expressionStatement(
      d.types.callExpression(d.types.memberExpression(N, d.types.identifier("skip")), [
        d.types.stringLiteral("No valid tests found")
      ])
    );
    f.program.body.push(_);
    let S = [
      d.types.importDeclaration(
        [
          d.types.importSpecifier(h, d.types.identifier("test")),
          d.types.importSpecifier(N, d.types.identifier("describe"))
        ],
        d.types.stringLiteral("vitest")
      )
    ];
    f.program.body.unshift(...S);
  } else {
    let ae = function() {
      let j = l._file.path.scope.generateUidIdentifier("isRunningFromThisFile"), v = d.types.memberExpression(
        d.types.callExpression(d.types.memberExpression(_, d.types.identifier("getState")), []),
        d.types.identifier("testPath")
      ), T = d.types.memberExpression(
        d.types.memberExpression(d.types.identifier("globalThis"), d.types.identifier("__vitest_worker__")),
        d.types.identifier("filepath")
      ), k = d.types.logicalExpression(
        "??",
        // TODO: switch order of testPathProperty and filePathProperty when the bug is fixed
        // https://github.com/vitest-dev/vitest/issues/6367 (or probably just use testPathProperty)
        T,
        v
      ), W = d.types.callExpression(
        d.types.memberExpression(
          d.types.memberExpression(
            d.types.memberExpression(d.types.identifier("import"), d.types.identifier("meta")),
            d.types.identifier("url")
          ),
          d.types.identifier("includes")
        ),
        [k]
      );
      return { isRunningFromThisFileDeclaration: d.types.variableDeclaration("const", [
        d.types.variableDeclarator(j, W)
      ]), isRunningFromThisFileId: j };
    };
    var mt = ae;
    p(ae, "getTestGuardDeclaration");
    let _ = l._file.path.scope.generateUidIdentifier("expect"), S = l._file.path.scope.generateUidIdentifier("testStory"), $e = d.types.identifier(
    JSON.stringify(i.skip)), { isRunningFromThisFileDeclaration: Re, isRunningFromThisFileId: Le } = ae();
    f.program.body.push(Re);
    let Me = /* @__PURE__ */ p(({
      localName: j,
      exportName: v,
      testTitle: T,
      node: k
    }) => {
      let W = d.types.expressionStatement(
        d.types.callExpression(h, [
          d.types.stringLiteral(T),
          d.types.callExpression(S, [
            d.types.stringLiteral(v),
            d.types.identifier(j),
            d.types.identifier(m),
            $e
          ])
        ])
      );
      return W.loc = k.loc, W;
    }, "getTestStatementForStory"), Ue = Object.entries(b).map(([j, v]) => {
      if (v === null) {
        Ce.warn(
          oe.dedent`
            [Storybook]: Could not transform "${j}" story into test at "${e}".
            Please make sure to define stories in the same file and not re-export stories coming from other files".
          `
        );
        return;
      }
      let T = l._stories[j].localName ?? j, k = l._stories[j].name ?? j;
      return Me({ testTitle: k, localName: T, exportName: j, node: v });
    }).filter((j) => !!j), qe = d.types.ifStatement(Le, d.types.blockStatement(Ue));
    f.program.body.push(qe);
    let Be = [
      d.types.importDeclaration(
        [
          d.types.importSpecifier(h, d.types.identifier("test")),
          d.types.importSpecifier(_, d.types.identifier("expect"))
        ],
        d.types.stringLiteral("vitest")
      ),
      d.types.importDeclaration(
        [d.types.importSpecifier(S, d.types.identifier("testStory"))],
        d.types.stringLiteral("@storybook/experimental-addon-test/internal/test-utils")
      )
    ];
    f.program.body.unshift(...Be);
  }
  return Z(l, { sourceMaps: !0, sourceFileName: e }, s);
}
p(Ve, "vitestTransform");
