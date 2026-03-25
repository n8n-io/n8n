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
var filename_exports = {};
__export(filename_exports, {
  getNodeFilename: () => getNodeFilename,
  isCredClassFile: () => isCredClassFile,
  isCredentialFile: () => isCredentialFile,
  isNodeFile: () => isNodeFile,
  isRegularNodeFile: () => isRegularNodeFile,
  isTriggerNodeFile: () => isTriggerNodeFile,
  toExpectedNodeFilename: () => toExpectedNodeFilename
});
module.exports = __toCommonJS(filename_exports);
const isTestRun = process.env.NODE_ENV === "test";
function getNodeFilename(fullPath) {
  if (isTestRun)
    return "Test.node.ts";
  const filename = fullPath.replace(/\\/g, "/").split("/").pop();
  if (!filename) {
    throw new Error(`Failed to extract node filename from path: ${fullPath}`);
  }
  return filename;
}
function isCredentialFile(fullPath) {
  if (isTestRun)
    return true;
  return getNodeFilename(fullPath).endsWith(".credentials.ts");
}
function isNodeFile(fullPath) {
  if (isTestRun)
    return true;
  return getNodeFilename(fullPath).endsWith(".node.ts");
}
function isRegularNodeFile(filePath) {
  if (isTestRun)
    return true;
  const filename = getNodeFilename(filePath);
  return filename.endsWith(".node.ts") && !filename.endsWith("Trigger.node.ts") && !filename.endsWith("EmailReadImap.node.ts");
}
function isTriggerNodeFile(filePath) {
  if (isTestRun)
    return true;
  return getNodeFilename(filePath).endsWith("Trigger.node.ts");
}
function isCredClassFile(filePath) {
  if (isTestRun)
    return true;
  return getNodeFilename(filePath).endsWith(".credentials.ts");
}
function toExpectedNodeFilename(name) {
  return name.charAt(0).toUpperCase() + name.slice(1) + ".node.ts";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getNodeFilename,
  isCredClassFile,
  isCredentialFile,
  isNodeFile,
  isRegularNodeFile,
  isTriggerNodeFile,
  toExpectedNodeFilename
});
