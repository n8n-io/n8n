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
var coverage_exports = {};
__export(coverage_exports, {
  Coverage: () => Coverage
});
module.exports = __toCommonJS(coverage_exports);
class Coverage {
  constructor(channel) {
    this._channel = channel;
  }
  async startJSCoverage(options = {}) {
    await this._channel.startJSCoverage(options);
  }
  async stopJSCoverage() {
    return (await this._channel.stopJSCoverage()).entries;
  }
  async startCSSCoverage(options = {}) {
    await this._channel.startCSSCoverage(options);
  }
  async stopCSSCoverage() {
    return (await this._channel.stopCSSCoverage()).entries;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Coverage
});
