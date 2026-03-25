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
var multiplexer_exports = {};
__export(multiplexer_exports, {
  Multiplexer: () => Multiplexer
});
module.exports = __toCommonJS(multiplexer_exports);
class Multiplexer {
  constructor(reporters) {
    this._reporters = reporters;
  }
  version() {
    return "v2";
  }
  onConfigure(config) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onConfigure?.(config));
  }
  onBegin(suite) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onBegin?.(suite));
  }
  onTestBegin(test, result) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onTestBegin?.(test, result));
  }
  onStdOut(chunk, test, result) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onStdOut?.(chunk, test, result));
  }
  onStdErr(chunk, test, result) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onStdErr?.(chunk, test, result));
  }
  async onTestPaused(test, result) {
    for (const reporter of this._reporters)
      await wrapAsync(() => reporter.onTestPaused?.(test, result));
  }
  onTestEnd(test, result) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onTestEnd?.(test, result));
  }
  onMachineEnd(result) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onMachineEnd?.(result));
  }
  async onEnd(result) {
    for (const reporter of this._reporters) {
      const outResult = await wrapAsync(() => reporter.onEnd?.(result));
      if (outResult?.status)
        result.status = outResult.status;
    }
    return result;
  }
  async onExit() {
    for (const reporter of this._reporters)
      await wrapAsync(() => reporter.onExit?.());
  }
  onError(error) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onError?.(error));
  }
  onStepBegin(test, result, step) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onStepBegin?.(test, result, step));
  }
  onStepEnd(test, result, step) {
    for (const reporter of this._reporters)
      wrap(() => reporter.onStepEnd?.(test, result, step));
  }
  printsToStdio() {
    return this._reporters.some((r) => {
      let prints = false;
      wrap(() => prints = r.printsToStdio ? r.printsToStdio() : true);
      return prints;
    });
  }
}
async function wrapAsync(callback) {
  try {
    return await callback();
  } catch (e) {
    console.error("Error in reporter", e);
  }
}
function wrap(callback) {
  try {
    callback();
  } catch (e) {
    console.error("Error in reporter", e);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Multiplexer
});
