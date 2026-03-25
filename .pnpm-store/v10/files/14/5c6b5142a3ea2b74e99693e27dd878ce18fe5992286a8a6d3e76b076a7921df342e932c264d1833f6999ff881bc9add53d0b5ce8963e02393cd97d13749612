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
var debug_exports = {};
__export(debug_exports, {
  debugMode: () => debugMode,
  isUnderTest: () => isUnderTest
});
module.exports = __toCommonJS(debug_exports);
var import_env = require("./env");
const _debugMode = (0, import_env.getFromENV)("PWDEBUG") || "";
function debugMode() {
  if (_debugMode === "console")
    return "console";
  if (_debugMode === "0" || _debugMode === "false")
    return "";
  return _debugMode ? "inspector" : "";
}
const _isUnderTest = (0, import_env.getAsBooleanFromENV)("PWTEST_UNDER_TEST");
function isUnderTest() {
  return _isUnderTest;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  debugMode,
  isUnderTest
});
