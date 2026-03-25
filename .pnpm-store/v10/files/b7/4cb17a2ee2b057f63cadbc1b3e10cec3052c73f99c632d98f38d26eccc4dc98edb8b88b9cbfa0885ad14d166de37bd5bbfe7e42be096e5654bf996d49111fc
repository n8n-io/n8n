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
var apiSuffixExemption_exports = {};
__export(apiSuffixExemption_exports, {
  isExemptedFromApiSuffix: () => isExemptedFromApiSuffix
});
module.exports = __toCommonJS(apiSuffixExemption_exports);
var import_constants = require("../../constants");
function isExemptedFromApiSuffix(filename) {
  return import_constants.CREDS_EXEMPTED_FROM_API_SUFFIX.some((cred) => filename.includes(cred));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isExemptedFromApiSuffix
});
