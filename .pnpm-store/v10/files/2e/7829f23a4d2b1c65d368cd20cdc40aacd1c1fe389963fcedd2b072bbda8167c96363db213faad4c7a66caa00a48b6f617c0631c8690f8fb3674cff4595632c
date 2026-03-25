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
var debugger_exports = {};
__export(debugger_exports, {
  Debugger: () => Debugger
});
module.exports = __toCommonJS(debugger_exports);
var import_events = require("events");
var import_utils = require("../utils");
var import_browserContext = require("./browserContext");
var import_protocolMetainfo = require("../utils/isomorphic/protocolMetainfo");
const symbol = Symbol("Debugger");
class Debugger extends import_events.EventEmitter {
  constructor(context) {
    super();
    this._pauseOnNextStatement = false;
    this._pausedCallsMetadata = /* @__PURE__ */ new Map();
    this._muted = false;
    this._context = context;
    this._context[symbol] = this;
    this._enabled = (0, import_utils.debugMode)() === "inspector";
    if (this._enabled)
      this.pauseOnNextStatement();
    context.instrumentation.addListener(this, context);
    this._context.once(import_browserContext.BrowserContext.Events.Close, () => {
      this._context.instrumentation.removeListener(this);
    });
  }
  static {
    this.Events = {
      PausedStateChanged: "pausedstatechanged"
    };
  }
  async setMuted(muted) {
    this._muted = muted;
  }
  async onBeforeCall(sdkObject, metadata) {
    if (this._muted)
      return;
    if (shouldPauseOnCall(sdkObject, metadata) || this._pauseOnNextStatement && shouldPauseBeforeStep(metadata))
      await this.pause(sdkObject, metadata);
  }
  async onBeforeInputAction(sdkObject, metadata) {
    if (this._muted)
      return;
    if (this._enabled && this._pauseOnNextStatement)
      await this.pause(sdkObject, metadata);
  }
  async pause(sdkObject, metadata) {
    if (this._muted)
      return;
    this._enabled = true;
    metadata.pauseStartTime = (0, import_utils.monotonicTime)();
    const result = new Promise((resolve) => {
      this._pausedCallsMetadata.set(metadata, { resolve, sdkObject });
    });
    this.emit(Debugger.Events.PausedStateChanged);
    return result;
  }
  resume(step) {
    if (!this.isPaused())
      return;
    this._pauseOnNextStatement = step;
    const endTime = (0, import_utils.monotonicTime)();
    for (const [metadata, { resolve }] of this._pausedCallsMetadata) {
      metadata.pauseEndTime = endTime;
      resolve();
    }
    this._pausedCallsMetadata.clear();
    this.emit(Debugger.Events.PausedStateChanged);
  }
  pauseOnNextStatement() {
    this._pauseOnNextStatement = true;
  }
  isPaused(metadata) {
    if (metadata)
      return this._pausedCallsMetadata.has(metadata);
    return !!this._pausedCallsMetadata.size;
  }
  pausedDetails() {
    const result = [];
    for (const [metadata, { sdkObject }] of this._pausedCallsMetadata)
      result.push({ metadata, sdkObject });
    return result;
  }
}
function shouldPauseOnCall(sdkObject, metadata) {
  if (sdkObject.attribution.playwright.options.isServer)
    return false;
  if (!sdkObject.attribution.browser?.options.headful && !(0, import_utils.isUnderTest)())
    return false;
  return metadata.method === "pause";
}
function shouldPauseBeforeStep(metadata) {
  if (metadata.internal)
    return false;
  const metainfo = import_protocolMetainfo.methodMetainfo.get(metadata.type + "." + metadata.method);
  return !!metainfo?.pausesBeforeAction;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Debugger
});
