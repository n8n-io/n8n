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
var worker_exports = {};
__export(worker_exports, {
  Worker: () => Worker
});
module.exports = __toCommonJS(worker_exports);
var import_channelOwner = require("./channelOwner");
var import_errors = require("./errors");
var import_events = require("./events");
var import_jsHandle = require("./jsHandle");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_timeoutSettings = require("./timeoutSettings");
var import_waiter = require("./waiter");
class Worker extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    // Set for service workers.
    this._closedScope = new import_manualPromise.LongStandingScope();
    this._setEventToSubscriptionMapping(/* @__PURE__ */ new Map([
      [import_events.Events.Worker.Console, "console"]
    ]));
    this._channel.on("close", () => {
      if (this._page)
        this._page._workers.delete(this);
      if (this._context)
        this._context._serviceWorkers.delete(this);
      this.emit(import_events.Events.Worker.Close, this);
    });
    this.once(import_events.Events.Worker.Close, () => this._closedScope.close(this._page?._closeErrorWithReason() || new import_errors.TargetClosedError()));
  }
  static fromNullable(worker) {
    return worker ? Worker.from(worker) : null;
  }
  static from(worker) {
    return worker._object;
  }
  url() {
    return this._initializer.url;
  }
  async evaluate(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    const result = await this._channel.evaluateExpression({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return (0, import_jsHandle.parseResult)(result.value);
  }
  async evaluateHandle(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    const result = await this._channel.evaluateExpressionHandle({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: (0, import_jsHandle.serializeArgument)(arg) });
    return import_jsHandle.JSHandle.from(result.handle);
  }
  async waitForEvent(event, optionsOrPredicate = {}) {
    return await this._wrapApiCall(async () => {
      const timeoutSettings = this._page?._timeoutSettings ?? this._context?._timeoutSettings ?? new import_timeoutSettings.TimeoutSettings(this._platform);
      const timeout = timeoutSettings.timeout(typeof optionsOrPredicate === "function" ? {} : optionsOrPredicate);
      const predicate = typeof optionsOrPredicate === "function" ? optionsOrPredicate : optionsOrPredicate.predicate;
      const waiter = import_waiter.Waiter.createForEvent(this, event);
      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== import_events.Events.Worker.Close)
        waiter.rejectOnEvent(this, import_events.Events.Worker.Close, () => new import_errors.TargetClosedError());
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Worker
});
