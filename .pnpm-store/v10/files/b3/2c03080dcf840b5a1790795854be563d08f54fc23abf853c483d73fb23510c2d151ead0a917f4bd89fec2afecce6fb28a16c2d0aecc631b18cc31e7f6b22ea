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
var fileUtils_exports = {};
__export(fileUtils_exports, {
  fileUploadSizeLimit: () => fileUploadSizeLimit,
  mkdirIfNeeded: () => mkdirIfNeeded
});
module.exports = __toCommonJS(fileUtils_exports);
const fileUploadSizeLimit = 50 * 1024 * 1024;
async function mkdirIfNeeded(platform, filePath) {
  await platform.fs().promises.mkdir(platform.path().dirname(filePath), { recursive: true }).catch(() => {
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fileUploadSizeLimit,
  mkdirIfNeeded
});
