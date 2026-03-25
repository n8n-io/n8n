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
var ascii_exports = {};
__export(ascii_exports, {
  jsonStringifyForceASCII: () => jsonStringifyForceASCII,
  wrapInASCIIBox: () => wrapInASCIIBox
});
module.exports = __toCommonJS(ascii_exports);
function wrapInASCIIBox(text, padding = 0) {
  const lines = text.split("\n");
  const maxLength = Math.max(...lines.map((line) => line.length));
  return [
    "\u2554" + "\u2550".repeat(maxLength + padding * 2) + "\u2557",
    ...lines.map((line) => "\u2551" + " ".repeat(padding) + line + " ".repeat(maxLength - line.length + padding) + "\u2551"),
    "\u255A" + "\u2550".repeat(maxLength + padding * 2) + "\u255D"
  ].join("\n");
}
function jsonStringifyForceASCII(object) {
  return JSON.stringify(object).replace(
    /[\u007f-\uffff]/g,
    (c) => "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4)
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  jsonStringifyForceASCII,
  wrapInASCIIBox
});
