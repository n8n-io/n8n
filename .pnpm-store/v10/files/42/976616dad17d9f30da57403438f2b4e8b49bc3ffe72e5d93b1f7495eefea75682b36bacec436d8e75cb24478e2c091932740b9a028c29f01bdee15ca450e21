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
var jsonl_exports = {};
__export(jsonl_exports, {
  JsonlLanguageGenerator: () => JsonlLanguageGenerator
});
module.exports = __toCommonJS(jsonl_exports);
var import_utils = require("../../utils");
class JsonlLanguageGenerator {
  constructor() {
    this.id = "jsonl";
    this.groupName = "";
    this.name = "JSONL";
    this.highlighter = "javascript";
  }
  generateAction(actionInContext) {
    const locator = actionInContext.action.selector ? JSON.parse((0, import_utils.asLocator)("jsonl", actionInContext.action.selector)) : void 0;
    const entry = {
      ...actionInContext.action,
      ...actionInContext.frame,
      locator,
      ariaSnapshot: void 0
    };
    return JSON.stringify(entry);
  }
  generateHeader(options) {
    return JSON.stringify(options);
  }
  generateFooter(saveStorage) {
    return "";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JsonlLanguageGenerator
});
