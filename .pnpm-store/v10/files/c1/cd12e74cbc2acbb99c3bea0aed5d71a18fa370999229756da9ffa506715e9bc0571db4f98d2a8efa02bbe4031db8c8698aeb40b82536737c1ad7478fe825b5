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
var import_clientHelper = require("./clientHelper");
var import_locator = require("./locator");
class Selectors {
  constructor(platform) {
    this._selectorEngines = [];
    this._contextsForSelectors = /* @__PURE__ */ new Set();
    this._platform = platform;
  }
  async register(name, script, options = {}) {
    if (this._selectorEngines.some((engine) => engine.name === name))
      throw new Error(`selectors.register: "${name}" selector engine has been already registered`);
    const source = await (0, import_clientHelper.evaluationScript)(this._platform, script, void 0, false);
    const selectorEngine = { ...options, name, source };
    for (const context of this._contextsForSelectors)
      await context._channel.registerSelectorEngine({ selectorEngine });
    this._selectorEngines.push(selectorEngine);
  }
  setTestIdAttribute(attributeName) {
    this._testIdAttributeName = attributeName;
    (0, import_locator.setTestIdAttribute)(attributeName);
    for (const context of this._contextsForSelectors)
      context._channel.setTestIdAttributeName({ testIdAttributeName: attributeName }).catch(() => {
      });
  }
  _withSelectorOptions(options) {
    return { ...options, selectorEngines: this._selectorEngines, testIdAttributeName: this._testIdAttributeName };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Selectors
});
