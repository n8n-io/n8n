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
var timeoutManager_exports = {};
__export(timeoutManager_exports, {
  TimeoutManager: () => TimeoutManager,
  TimeoutManagerError: () => TimeoutManagerError,
  kMaxDeadline: () => kMaxDeadline
});
module.exports = __toCommonJS(timeoutManager_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_util = require("../util");
const kMaxDeadline = 2147483647;
class TimeoutManager {
  constructor(timeout) {
    this._ignoreTimeouts = false;
    this._defaultSlot = { timeout, elapsed: 0 };
  }
  setIgnoreTimeouts() {
    this._ignoreTimeouts = true;
    if (this._running)
      this._updateTimeout(this._running);
  }
  interrupt() {
    if (this._running)
      this._running.timeoutPromise.reject(this._createTimeoutError(this._running));
  }
  isTimeExhaustedFor(runnable) {
    const slot = runnable.fixture?.slot || runnable.slot || this._defaultSlot;
    return slot.timeout > 0 && slot.elapsed >= slot.timeout - 1;
  }
  async withRunnable(runnable, cb) {
    if (this._running)
      throw new Error(`Internal error: duplicate runnable`);
    const running = this._running = {
      runnable,
      slot: runnable.fixture?.slot || runnable.slot || this._defaultSlot,
      start: (0, import_utils.monotonicTime)(),
      deadline: kMaxDeadline,
      timer: void 0,
      timeoutPromise: new import_utils.ManualPromise()
    };
    let debugTitle = "";
    try {
      if (import_util.debugTest.enabled) {
        debugTitle = runnable.fixture ? `${runnable.fixture.phase} "${runnable.fixture.title}"` : runnable.type;
        const location = runnable.location ? ` at "${(0, import_util.formatLocation)(runnable.location)}"` : ``;
        (0, import_util.debugTest)(`started ${debugTitle}${location}`);
      }
      this._updateTimeout(running);
      return await Promise.race([
        cb(),
        running.timeoutPromise
      ]);
    } finally {
      if (running.timer)
        clearTimeout(running.timer);
      running.timer = void 0;
      running.slot.elapsed += (0, import_utils.monotonicTime)() - running.start;
      this._running = void 0;
      if (import_util.debugTest.enabled)
        (0, import_util.debugTest)(`finished ${debugTitle}`);
    }
  }
  _updateTimeout(running) {
    if (running.timer)
      clearTimeout(running.timer);
    running.timer = void 0;
    if (this._ignoreTimeouts || !running.slot.timeout) {
      running.deadline = kMaxDeadline;
      return;
    }
    running.deadline = running.start + (running.slot.timeout - running.slot.elapsed);
    const timeout = running.deadline - (0, import_utils.monotonicTime)() + 1;
    if (timeout <= 0)
      running.timeoutPromise.reject(this._createTimeoutError(running));
    else
      running.timer = setTimeout(() => running.timeoutPromise.reject(this._createTimeoutError(running)), timeout);
  }
  defaultSlot() {
    return this._defaultSlot;
  }
  slow() {
    const slot = this._running ? this._running.slot : this._defaultSlot;
    slot.timeout = slot.timeout * 3;
    if (this._running)
      this._updateTimeout(this._running);
  }
  setTimeout(timeout) {
    const slot = this._running ? this._running.slot : this._defaultSlot;
    slot.timeout = timeout;
    if (this._running)
      this._updateTimeout(this._running);
  }
  currentSlotDeadline() {
    return this._running ? this._running.deadline : kMaxDeadline;
  }
  currentSlotType() {
    return this._running ? this._running.runnable.type : "test";
  }
  _createTimeoutError(running) {
    let message = "";
    const timeout = running.slot.timeout;
    const runnable = running.runnable;
    switch (runnable.type) {
      case "test": {
        if (runnable.fixture) {
          if (runnable.fixture.phase === "setup")
            message = `Test timeout of ${timeout}ms exceeded while setting up "${runnable.fixture.title}".`;
          else
            message = `Tearing down "${runnable.fixture.title}" exceeded the test timeout of ${timeout}ms.`;
        } else {
          message = `Test timeout of ${timeout}ms exceeded.`;
        }
        break;
      }
      case "afterEach":
      case "beforeEach":
        message = `Test timeout of ${timeout}ms exceeded while running "${runnable.type}" hook.`;
        break;
      case "beforeAll":
      case "afterAll":
        message = `"${runnable.type}" hook timeout of ${timeout}ms exceeded.`;
        break;
      case "teardown": {
        if (runnable.fixture)
          message = `Worker teardown timeout of ${timeout}ms exceeded while ${runnable.fixture.phase === "setup" ? "setting up" : "tearing down"} "${runnable.fixture.title}".`;
        else
          message = `Worker teardown timeout of ${timeout}ms exceeded.`;
        break;
      }
      case "skip":
      case "slow":
      case "fixme":
      case "fail":
        message = `"${runnable.type}" modifier timeout of ${timeout}ms exceeded.`;
        break;
    }
    const fixtureWithSlot = runnable.fixture?.slot ? runnable.fixture : void 0;
    if (fixtureWithSlot)
      message = `Fixture "${fixtureWithSlot.title}" timeout of ${timeout}ms exceeded during ${fixtureWithSlot.phase}.`;
    message = import_utils2.colors.red(message);
    const location = (fixtureWithSlot || runnable).location;
    const error = new TimeoutManagerError(message);
    error.name = "";
    error.stack = message + (location ? `
    at ${location.file}:${location.line}:${location.column}` : "");
    return error;
  }
}
class TimeoutManagerError extends Error {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TimeoutManager,
  TimeoutManagerError,
  kMaxDeadline
});
