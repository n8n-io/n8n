"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var clock_exports = {};
__export(clock_exports, {
  Clock: () => Clock
});
module.exports = __toCommonJS(clock_exports);
var rawClockSource = __toESM(require("../generated/clockSource"));
class Clock {
  constructor(browserContext) {
    this._initScripts = [];
    this._browserContext = browserContext;
  }
  async uninstall(progress) {
    await progress.race(this._browserContext.removeInitScripts(this._initScripts));
    this._initScripts = [];
  }
  async fastForward(progress, ticks) {
    await this._installIfNeeded(progress);
    const ticksMillis = parseTicks(ticks);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('fastForward', ${Date.now()}, ${ticksMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.fastForward(${ticksMillis})`));
  }
  async install(progress, time) {
    await this._installIfNeeded(progress);
    const timeMillis = time !== void 0 ? parseTime(time) : Date.now();
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('install', ${Date.now()}, ${timeMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.install(${timeMillis})`));
  }
  async pauseAt(progress, ticks) {
    await this._installIfNeeded(progress);
    const timeMillis = parseTime(ticks);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('pauseAt', ${Date.now()}, ${timeMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.pauseAt(${timeMillis})`));
  }
  resumeNoReply() {
    if (!this._initScripts.length)
      return;
    const doResume = async () => {
      this._initScripts.push(await this._browserContext.addInitScript(void 0, `globalThis.__pwClock.controller.log('resume', ${Date.now()})`));
      await this._evaluateInFrames(`globalThis.__pwClock.controller.resume()`);
    };
    doResume().catch(() => {
    });
  }
  async resume(progress) {
    await this._installIfNeeded(progress);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('resume', ${Date.now()})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.resume()`));
  }
  async setFixedTime(progress, time) {
    await this._installIfNeeded(progress);
    const timeMillis = parseTime(time);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('setFixedTime', ${Date.now()}, ${timeMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.setFixedTime(${timeMillis})`));
  }
  async setSystemTime(progress, time) {
    await this._installIfNeeded(progress);
    const timeMillis = parseTime(time);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('setSystemTime', ${Date.now()}, ${timeMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.setSystemTime(${timeMillis})`));
  }
  async runFor(progress, ticks) {
    await this._installIfNeeded(progress);
    const ticksMillis = parseTicks(ticks);
    this._initScripts.push(await this._browserContext.addInitScript(progress, `globalThis.__pwClock.controller.log('runFor', ${Date.now()}, ${ticksMillis})`));
    await progress.race(this._evaluateInFrames(`globalThis.__pwClock.controller.runFor(${ticksMillis})`));
  }
  async _installIfNeeded(progress) {
    if (this._initScripts.length)
      return;
    const script = `(() => {
      const module = {};
      ${rawClockSource.source}
      if (!globalThis.__pwClock)
        globalThis.__pwClock = (module.exports.inject())(globalThis);
    })();`;
    const initScript = await this._browserContext.addInitScript(progress, script);
    await progress.race(this._evaluateInFrames(script));
    this._initScripts.push(initScript);
  }
  async _evaluateInFrames(script) {
    await this._browserContext.safeNonStallingEvaluateInAllFrames(script, "main", { throwOnJSErrors: true });
  }
}
function parseTicks(value) {
  if (typeof value === "number")
    return value;
  if (!value)
    return 0;
  const str = value;
  const strings = str.split(":");
  const l = strings.length;
  let i = l;
  let ms = 0;
  let parsed;
  if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
    throw new Error(
      `Clock only understands numbers, 'mm:ss' and 'hh:mm:ss'`
    );
  }
  while (i--) {
    parsed = parseInt(strings[i], 10);
    if (parsed >= 60)
      throw new Error(`Invalid time ${str}`);
    ms += parsed * Math.pow(60, l - i - 1);
  }
  return ms * 1e3;
}
function parseTime(epoch) {
  if (!epoch)
    return 0;
  if (typeof epoch === "number")
    return epoch;
  const parsed = new Date(epoch);
  if (!isFinite(parsed.getTime()))
    throw new Error(`Invalid date: ${epoch}`);
  return parsed.getTime();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Clock
});
