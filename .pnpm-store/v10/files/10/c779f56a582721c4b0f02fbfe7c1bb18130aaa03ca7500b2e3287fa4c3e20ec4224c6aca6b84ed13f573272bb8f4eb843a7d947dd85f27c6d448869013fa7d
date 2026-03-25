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
var waiter_exports = {};
__export(waiter_exports, {
  Waiter: () => Waiter
});
module.exports = __toCommonJS(waiter_exports);
var import_errors = require("./errors");
var import_stackTrace = require("../utils/isomorphic/stackTrace");
class Waiter {
  constructor(channelOwner, event) {
    this._failures = [];
    this._logs = [];
    this._waitId = channelOwner._platform.createGuid();
    this._channelOwner = channelOwner;
    this._savedZone = channelOwner._platform.zones.current().pop();
    this._channelOwner._channel.waitForEventInfo({ info: { waitId: this._waitId, phase: "before", event } }).catch(() => {
    });
    this._dispose = [
      () => this._channelOwner._wrapApiCall(async () => {
        await this._channelOwner._channel.waitForEventInfo({ info: { waitId: this._waitId, phase: "after", error: this._error } });
      }, { internal: true }).catch(() => {
      })
    ];
  }
  static createForEvent(channelOwner, event) {
    return new Waiter(channelOwner, event);
  }
  async waitForEvent(emitter, event, predicate) {
    const { promise, dispose } = waitForEvent(emitter, event, this._savedZone, predicate);
    return await this.waitForPromise(promise, dispose);
  }
  rejectOnEvent(emitter, event, error, predicate) {
    const { promise, dispose } = waitForEvent(emitter, event, this._savedZone, predicate);
    this._rejectOn(promise.then(() => {
      throw typeof error === "function" ? error() : error;
    }), dispose);
  }
  rejectOnTimeout(timeout, message) {
    if (!timeout)
      return;
    const { promise, dispose } = waitForTimeout(timeout);
    this._rejectOn(promise.then(() => {
      throw new import_errors.TimeoutError(message);
    }), dispose);
  }
  rejectImmediately(error) {
    this._immediateError = error;
  }
  dispose() {
    for (const dispose of this._dispose)
      dispose();
  }
  async waitForPromise(promise, dispose) {
    try {
      if (this._immediateError)
        throw this._immediateError;
      const result = await Promise.race([promise, ...this._failures]);
      if (dispose)
        dispose();
      return result;
    } catch (e) {
      if (dispose)
        dispose();
      this._error = e.message;
      this.dispose();
      (0, import_stackTrace.rewriteErrorMessage)(e, e.message + formatLogRecording(this._logs));
      throw e;
    }
  }
  log(s) {
    this._logs.push(s);
    this._channelOwner._wrapApiCall(async () => {
      await this._channelOwner._channel.waitForEventInfo({ info: { waitId: this._waitId, phase: "log", message: s } });
    }, { internal: true }).catch(() => {
    });
  }
  _rejectOn(promise, dispose) {
    this._failures.push(promise);
    if (dispose)
      this._dispose.push(dispose);
  }
}
function waitForEvent(emitter, event, savedZone, predicate) {
  let listener;
  const promise = new Promise((resolve, reject) => {
    listener = async (eventArg) => {
      await savedZone.run(async () => {
        try {
          if (predicate && !await predicate(eventArg))
            return;
          emitter.removeListener(event, listener);
          resolve(eventArg);
        } catch (e) {
          emitter.removeListener(event, listener);
          reject(e);
        }
      });
    };
    emitter.addListener(event, listener);
  });
  const dispose = () => emitter.removeListener(event, listener);
  return { promise, dispose };
}
function waitForTimeout(timeout) {
  let timeoutId;
  const promise = new Promise((resolve) => timeoutId = setTimeout(resolve, timeout));
  const dispose = () => clearTimeout(timeoutId);
  return { promise, dispose };
}
function formatLogRecording(log) {
  if (!log.length)
    return "";
  const header = ` logs `;
  const headerLength = 60;
  const leftLength = (headerLength - header.length) / 2;
  const rightLength = headerLength - header.length - leftLength;
  return `
${"=".repeat(leftLength)}${header}${"=".repeat(rightLength)}
${log.join("\n")}
${"=".repeat(headerLength)}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Waiter
});
