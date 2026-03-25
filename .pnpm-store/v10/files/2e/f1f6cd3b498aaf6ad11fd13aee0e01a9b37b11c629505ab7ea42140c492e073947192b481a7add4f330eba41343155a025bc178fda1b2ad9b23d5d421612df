"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var selectors_exports = {};
__export(selectors_exports, {
  Selectors: () => Selectors
});
module.exports = __toCommonJS(selectors_exports);
var import_crypto = require("./utils/crypto");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
class Selectors {
  constructor(engines, testIdAttributeName) {
    this.guid = `selectors@${(0, import_crypto.createGuid)()}`;
    this._builtinEngines = /* @__PURE__ */ new Set([
      "css",
      "css:light",
      "xpath",
      "xpath:light",
      "_react",
      "_vue",
      "text",
      "text:light",
      "id",
      "id:light",
      "data-testid",
      "data-testid:light",
      "data-test-id",
      "data-test-id:light",
      "data-test",
      "data-test:light",
      "nth",
      "visible",
      "internal:control",
      "internal:has",
      "internal:has-not",
      "internal:has-text",
      "internal:has-not-text",
      "internal:and",
      "internal:or",
      "internal:chain",
      "role",
      "internal:attr",
      "internal:label",
      "internal:text",
      "internal:role",
      "internal:testid",
      "internal:describe",
      "aria-ref"
    ]);
    this._builtinEnginesInMainWorld = /* @__PURE__ */ new Set([
      "_react",
      "_vue"
    ]);
    this._engines = /* @__PURE__ */ new Map();
    this._testIdAttributeName = testIdAttributeName ?? "data-testid";
    for (const engine of engines)
      this.register(engine);
  }
  register(engine) {
    if (!engine.name.match(/^[a-zA-Z_0-9-]+$/))
      throw new Error("Selector engine name may only contain [a-zA-Z0-9_] characters");
    if (this._builtinEngines.has(engine.name) || engine.name === "zs" || engine.name === "zs:light")
      throw new Error(`"${engine.name}" is a predefined selector engine`);
    if (this._engines.has(engine.name))
      throw new Error(`"${engine.name}" selector engine has been already registered`);
    this._engines.set(engine.name, engine);
  }
  testIdAttributeName() {
    return this._testIdAttributeName;
  }
  setTestIdAttributeName(testIdAttributeName) {
    this._testIdAttributeName = testIdAttributeName;
  }
  parseSelector(selector, strict) {
    const parsed = typeof selector === "string" ? (0, import_selectorParser.parseSelector)(selector) : selector;
    let needsMainWorld = false;
    (0, import_selectorParser.visitAllSelectorParts)(parsed, (part) => {
      const name = part.name;
      const custom = this._engines.get(name);
      if (!custom && !this._builtinEngines.has(name))
        throw new import_selectorParser.InvalidSelectorError(`Unknown engine "${name}" while parsing selector ${(0, import_selectorParser.stringifySelector)(parsed)}`);
      if (custom && !custom.contentScript)
        needsMainWorld = true;
      if (this._builtinEnginesInMainWorld.has(name))
        needsMainWorld = true;
    });
    return {
      parsed,
      world: needsMainWorld ? "main" : "utility",
      strict
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Selectors
});
