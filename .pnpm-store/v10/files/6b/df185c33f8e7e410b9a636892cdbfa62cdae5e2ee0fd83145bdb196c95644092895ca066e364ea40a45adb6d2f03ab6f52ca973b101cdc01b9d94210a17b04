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
var watchdog_exports = {};
__export(watchdog_exports, {
  setupExitWatchdog: () => setupExitWatchdog
});
module.exports = __toCommonJS(watchdog_exports);
var import_browserContextFactory = require("./browserContextFactory");
var import_context = require("./context");
function setupExitWatchdog() {
  let isExiting = false;
  const handleExit = async () => {
    if (isExiting)
      return;
    isExiting = true;
    setTimeout(() => process.exit(0), 15e3);
    await import_context.Context.disposeAll();
    await import_browserContextFactory.SharedContextFactory.dispose();
    process.exit(0);
  };
  process.stdin.on("close", handleExit);
  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  setupExitWatchdog
});
