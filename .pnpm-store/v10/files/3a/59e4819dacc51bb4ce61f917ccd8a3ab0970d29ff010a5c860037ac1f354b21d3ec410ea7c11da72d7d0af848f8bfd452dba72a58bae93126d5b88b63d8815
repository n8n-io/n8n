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
var clientStackTrace_exports = {};
__export(clientStackTrace_exports, {
  captureLibraryStackTrace: () => captureLibraryStackTrace
});
module.exports = __toCommonJS(clientStackTrace_exports);
var import_stackTrace = require("../utils/isomorphic/stackTrace");
function captureLibraryStackTrace(platform) {
  const stack = (0, import_stackTrace.captureRawStack)();
  let parsedFrames = stack.map((line) => {
    const frame = (0, import_stackTrace.parseStackFrame)(line, platform.pathSeparator, platform.showInternalStackFrames());
    if (!frame || !frame.file)
      return null;
    const isPlaywrightLibrary = !!platform.coreDir && frame.file.startsWith(platform.coreDir);
    const parsed = {
      frame,
      frameText: line,
      isPlaywrightLibrary
    };
    return parsed;
  }).filter(Boolean);
  let apiName = "";
  for (let i = 0; i < parsedFrames.length - 1; i++) {
    const parsedFrame = parsedFrames[i];
    if (parsedFrame.isPlaywrightLibrary && !parsedFrames[i + 1].isPlaywrightLibrary) {
      apiName = apiName || normalizeAPIName(parsedFrame.frame.function);
      break;
    }
  }
  function normalizeAPIName(name) {
    if (!name)
      return "";
    const match = name.match(/(API|JS|CDP|[A-Z])(.*)/);
    if (!match)
      return name;
    return match[1].toLowerCase() + match[2];
  }
  const filterPrefixes = platform.boxedStackPrefixes();
  parsedFrames = parsedFrames.filter((f) => {
    if (filterPrefixes.some((prefix) => f.frame.file.startsWith(prefix)))
      return false;
    return true;
  });
  return {
    frames: parsedFrames.map((p) => p.frame),
    apiName
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  captureLibraryStackTrace
});
