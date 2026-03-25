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
var clock_exports = {};
__export(clock_exports, {
  Clock: () => Clock
});
module.exports = __toCommonJS(clock_exports);
class Clock {
  constructor(browserContext) {
    this._browserContext = browserContext;
  }
  async install(options = {}) {
    await this._browserContext._channel.clockInstall(options.time !== void 0 ? parseTime(options.time) : {});
  }
  async fastForward(ticks) {
    await this._browserContext._channel.clockFastForward(parseTicks(ticks));
  }
  async pauseAt(time) {
    await this._browserContext._channel.clockPauseAt(parseTime(time));
  }
  async resume() {
    await this._browserContext._channel.clockResume({});
  }
  async runFor(ticks) {
    await this._browserContext._channel.clockRunFor(parseTicks(ticks));
  }
  async setFixedTime(time) {
    await this._browserContext._channel.clockSetFixedTime(parseTime(time));
  }
  async setSystemTime(time) {
    await this._browserContext._channel.clockSetSystemTime(parseTime(time));
  }
}
function parseTime(time) {
  if (typeof time === "number")
    return { timeNumber: time };
  if (typeof time === "string")
    return { timeString: time };
  if (!isFinite(time.getTime()))
    throw new Error(`Invalid date: ${time}`);
  return { timeNumber: time.getTime() };
}
function parseTicks(ticks) {
  return {
    ticksNumber: typeof ticks === "number" ? ticks : void 0,
    ticksString: typeof ticks === "string" ? ticks : void 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Clock
});
