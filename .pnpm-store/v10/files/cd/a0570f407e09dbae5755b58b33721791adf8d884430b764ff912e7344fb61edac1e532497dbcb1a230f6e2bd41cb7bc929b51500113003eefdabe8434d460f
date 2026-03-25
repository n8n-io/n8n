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
var matcherHint_exports = {};
__export(matcherHint_exports, {
  ExpectError: () => ExpectError,
  isJestError: () => isJestError
});
module.exports = __toCommonJS(matcherHint_exports);
var import_utils = require("playwright-core/lib/utils");
class ExpectError extends Error {
  constructor(jestError, customMessage, stackFrames) {
    super("");
    this.name = jestError.name;
    this.message = jestError.message;
    this.matcherResult = jestError.matcherResult;
    if (customMessage)
      this.message = customMessage + "\n\n" + this.message;
    this.stack = this.name + ": " + this.message + "\n" + (0, import_utils.stringifyStackFrames)(stackFrames).join("\n");
  }
}
function isJestError(e) {
  return e instanceof Error && "matcherResult" in e && !!e.matcherResult;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExpectError,
  isJestError
});
