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
var time_exports = {};
__export(time_exports, {
  DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT: () => DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT,
  DEFAULT_PLAYWRIGHT_TIMEOUT: () => DEFAULT_PLAYWRIGHT_TIMEOUT,
  monotonicTime: () => monotonicTime,
  setTimeOrigin: () => setTimeOrigin,
  timeOrigin: () => timeOrigin
});
module.exports = __toCommonJS(time_exports);
let _timeOrigin = performance.timeOrigin;
let _timeShift = 0;
function setTimeOrigin(origin) {
  _timeOrigin = origin;
  _timeShift = performance.timeOrigin - origin;
}
function timeOrigin() {
  return _timeOrigin;
}
function monotonicTime() {
  return Math.floor((performance.now() + _timeShift) * 1e3) / 1e3;
}
const DEFAULT_PLAYWRIGHT_TIMEOUT = 3e4;
const DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT = 3 * 60 * 1e3;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT,
  DEFAULT_PLAYWRIGHT_TIMEOUT,
  monotonicTime,
  setTimeOrigin,
  timeOrigin
});
