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
var traceUtils_exports = {};
__export(traceUtils_exports, {
  parseClientSideCallMetadata: () => parseClientSideCallMetadata,
  serializeClientSideCallMetadata: () => serializeClientSideCallMetadata
});
module.exports = __toCommonJS(traceUtils_exports);
function parseClientSideCallMetadata(data) {
  const result = /* @__PURE__ */ new Map();
  const { files, stacks } = data;
  for (const s of stacks) {
    const [id, ff] = s;
    result.set(`call@${id}`, ff.map((f) => ({ file: files[f[0]], line: f[1], column: f[2], function: f[3] })));
  }
  return result;
}
function serializeClientSideCallMetadata(metadatas) {
  const fileNames = /* @__PURE__ */ new Map();
  const stacks = [];
  for (const m of metadatas) {
    if (!m.stack || !m.stack.length)
      continue;
    const stack = [];
    for (const frame of m.stack) {
      let ordinal = fileNames.get(frame.file);
      if (typeof ordinal !== "number") {
        ordinal = fileNames.size;
        fileNames.set(frame.file, ordinal);
      }
      const stackFrame = [ordinal, frame.line || 0, frame.column || 0, frame.function || ""];
      stack.push(stackFrame);
    }
    stacks.push([m.id, stack]);
  }
  return { files: [...fileNames.keys()], stacks };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseClientSideCallMetadata,
  serializeClientSideCallMetadata
});
