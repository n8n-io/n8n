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
var platform_exports = {};
__export(platform_exports, {
  emptyPlatform: () => emptyPlatform
});
module.exports = __toCommonJS(platform_exports);
var import_colors = require("../utils/isomorphic/colors");
const noopZone = {
  push: () => noopZone,
  pop: () => noopZone,
  run: (func) => func(),
  data: () => void 0
};
const emptyPlatform = {
  name: "empty",
  boxedStackPrefixes: () => [],
  calculateSha1: async () => {
    throw new Error("Not implemented");
  },
  colors: import_colors.webColors,
  createGuid: () => {
    throw new Error("Not implemented");
  },
  defaultMaxListeners: () => 10,
  env: {},
  fs: () => {
    throw new Error("Not implemented");
  },
  inspectCustom: void 0,
  isDebugMode: () => false,
  isJSDebuggerAttached: () => false,
  isLogEnabled(name) {
    return false;
  },
  isUnderTest: () => false,
  log(name, message) {
  },
  path: () => {
    throw new Error("Function not implemented.");
  },
  pathSeparator: "/",
  showInternalStackFrames: () => false,
  streamFile(path, writable) {
    throw new Error("Streams are not available");
  },
  streamReadable: (channel) => {
    throw new Error("Streams are not available");
  },
  streamWritable: (channel) => {
    throw new Error("Streams are not available");
  },
  zodToJsonSchema: (schema) => {
    throw new Error("Zod is not available");
  },
  zones: { empty: noopZone, current: () => noopZone }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emptyPlatform
});
