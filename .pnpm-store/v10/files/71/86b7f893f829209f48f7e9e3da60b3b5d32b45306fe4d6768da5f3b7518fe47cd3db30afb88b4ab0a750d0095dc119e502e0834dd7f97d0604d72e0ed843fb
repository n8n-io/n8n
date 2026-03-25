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
var clientHelper_exports = {};
__export(clientHelper_exports, {
  addSourceUrlToScript: () => addSourceUrlToScript,
  envObjectToArray: () => envObjectToArray,
  evaluationScript: () => evaluationScript
});
module.exports = __toCommonJS(clientHelper_exports);
var import_rtti = require("../utils/isomorphic/rtti");
function envObjectToArray(env) {
  const result = [];
  for (const name in env) {
    if (!Object.is(env[name], void 0))
      result.push({ name, value: String(env[name]) });
  }
  return result;
}
async function evaluationScript(platform, fun, arg, addSourceUrl = true) {
  if (typeof fun === "function") {
    const source = fun.toString();
    const argString = Object.is(arg, void 0) ? "undefined" : JSON.stringify(arg);
    return `(${source})(${argString})`;
  }
  if (arg !== void 0)
    throw new Error("Cannot evaluate a string with arguments");
  if ((0, import_rtti.isString)(fun))
    return fun;
  if (fun.content !== void 0)
    return fun.content;
  if (fun.path !== void 0) {
    let source = await platform.fs().promises.readFile(fun.path, "utf8");
    if (addSourceUrl)
      source = addSourceUrlToScript(source, fun.path);
    return source;
  }
  throw new Error("Either path or content property must be present");
}
function addSourceUrlToScript(source, path) {
  return `${source}
//# sourceURL=${path.replace(/\n/g, "")}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addSourceUrlToScript,
  envObjectToArray,
  evaluationScript
});
