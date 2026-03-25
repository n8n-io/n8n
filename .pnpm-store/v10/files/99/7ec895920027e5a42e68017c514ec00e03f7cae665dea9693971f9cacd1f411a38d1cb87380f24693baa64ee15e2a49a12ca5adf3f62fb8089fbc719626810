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
var reporterV2_exports = {};
__export(reporterV2_exports, {
  wrapReporterAsV2: () => wrapReporterAsV2
});
module.exports = __toCommonJS(reporterV2_exports);
function wrapReporterAsV2(reporter) {
  try {
    if ("version" in reporter && reporter.version() === "v2")
      return reporter;
  } catch (e) {
  }
  return new ReporterV2Wrapper(reporter);
}
class ReporterV2Wrapper {
  constructor(reporter) {
    this._deferred = [];
    this._reporter = reporter;
  }
  version() {
    return "v2";
  }
  onConfigure(config) {
    this._config = config;
  }
  onBegin(suite) {
    this._reporter.onBegin?.(this._config, suite);
    const deferred = this._deferred;
    this._deferred = null;
    for (const item of deferred) {
      if (item.error)
        this.onError(item.error);
      if (item.stdout)
        this.onStdOut(item.stdout.chunk, item.stdout.test, item.stdout.result);
      if (item.stderr)
        this.onStdErr(item.stderr.chunk, item.stderr.test, item.stderr.result);
    }
  }
  onTestBegin(test, result) {
    this._reporter.onTestBegin?.(test, result);
  }
  onStdOut(chunk, test, result) {
    if (this._deferred) {
      this._deferred.push({ stdout: { chunk, test, result } });
      return;
    }
    this._reporter.onStdOut?.(chunk, test, result);
  }
  onStdErr(chunk, test, result) {
    if (this._deferred) {
      this._deferred.push({ stderr: { chunk, test, result } });
      return;
    }
    this._reporter.onStdErr?.(chunk, test, result);
  }
  onTestEnd(test, result) {
    this._reporter.onTestEnd?.(test, result);
  }
  async onEnd(result) {
    return await this._reporter.onEnd?.(result);
  }
  async onExit() {
    await this._reporter.onExit?.();
  }
  onError(error) {
    if (this._deferred) {
      this._deferred.push({ error });
      return;
    }
    this._reporter.onError?.(error);
  }
  onStepBegin(test, result, step) {
    this._reporter.onStepBegin?.(test, result, step);
  }
  onStepEnd(test, result, step) {
    this._reporter.onStepEnd?.(test, result, step);
  }
  printsToStdio() {
    return this._reporter.printsToStdio ? this._reporter.printsToStdio() : true;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  wrapReporterAsV2
});
