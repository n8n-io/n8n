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
var tracing_exports = {};
__export(tracing_exports, {
  Tracing: () => Tracing
});
module.exports = __toCommonJS(tracing_exports);
var import_artifact = require("./artifact");
var import_channelOwner = require("./channelOwner");
class Tracing extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._includeSources = false;
    this._isLive = false;
    this._isTracing = false;
  }
  static from(channel) {
    return channel._object;
  }
  async start(options = {}) {
    await this._wrapApiCall(async () => {
      this._includeSources = !!options.sources;
      this._isLive = !!options._live;
      await this._channel.tracingStart({
        name: options.name,
        snapshots: options.snapshots,
        screenshots: options.screenshots,
        live: options._live
      });
      const { traceName } = await this._channel.tracingStartChunk({ name: options.name, title: options.title });
      await this._startCollectingStacks(traceName, this._isLive);
    });
  }
  async startChunk(options = {}) {
    await this._wrapApiCall(async () => {
      const { traceName } = await this._channel.tracingStartChunk(options);
      await this._startCollectingStacks(traceName, this._isLive);
    });
  }
  async group(name, options = {}) {
    await this._channel.tracingGroup({ name, location: options.location });
  }
  async groupEnd() {
    await this._channel.tracingGroupEnd();
  }
  async _startCollectingStacks(traceName, live) {
    if (!this._isTracing) {
      this._isTracing = true;
      this._connection.setIsTracing(true);
    }
    const result = await this._connection.localUtils()?.tracingStarted({ tracesDir: this._tracesDir, traceName, live });
    this._stacksId = result?.stacksId;
  }
  async stopChunk(options = {}) {
    await this._wrapApiCall(async () => {
      await this._doStopChunk(options.path);
    });
  }
  async stop(options = {}) {
    await this._wrapApiCall(async () => {
      await this._doStopChunk(options.path);
      await this._channel.tracingStop();
    });
  }
  async _doStopChunk(filePath) {
    this._resetStackCounter();
    if (!filePath) {
      await this._channel.tracingStopChunk({ mode: "discard" });
      if (this._stacksId)
        await this._connection.localUtils().traceDiscarded({ stacksId: this._stacksId });
      return;
    }
    const localUtils = this._connection.localUtils();
    if (!localUtils)
      throw new Error("Cannot save trace in thin clients");
    const isLocal = !this._connection.isRemote();
    if (isLocal) {
      const result2 = await this._channel.tracingStopChunk({ mode: "entries" });
      await localUtils.zip({ zipFile: filePath, entries: result2.entries, mode: "write", stacksId: this._stacksId, includeSources: this._includeSources });
      return;
    }
    const result = await this._channel.tracingStopChunk({ mode: "archive" });
    if (!result.artifact) {
      if (this._stacksId)
        await localUtils.traceDiscarded({ stacksId: this._stacksId });
      return;
    }
    const artifact = import_artifact.Artifact.from(result.artifact);
    await artifact.saveAs(filePath);
    await artifact.delete();
    await localUtils.zip({ zipFile: filePath, entries: [], mode: "append", stacksId: this._stacksId, includeSources: this._includeSources });
  }
  _resetStackCounter() {
    if (this._isTracing) {
      this._isTracing = false;
      this._connection.setIsTracing(false);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Tracing
});
