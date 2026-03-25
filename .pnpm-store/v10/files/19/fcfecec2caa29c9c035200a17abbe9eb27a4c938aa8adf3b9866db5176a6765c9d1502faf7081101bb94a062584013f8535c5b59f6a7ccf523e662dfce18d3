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
var localUtils_exports = {};
__export(localUtils_exports, {
  LocalUtils: () => LocalUtils
});
module.exports = __toCommonJS(localUtils_exports);
var import_channelOwner = require("./channelOwner");
class LocalUtils extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this.devices = {};
    for (const { name, descriptor } of initializer.deviceDescriptors)
      this.devices[name] = descriptor;
  }
  async zip(params) {
    return await this._channel.zip(params);
  }
  async harOpen(params) {
    return await this._channel.harOpen(params);
  }
  async harLookup(params) {
    return await this._channel.harLookup(params);
  }
  async harClose(params) {
    return await this._channel.harClose(params);
  }
  async harUnzip(params) {
    return await this._channel.harUnzip(params);
  }
  async tracingStarted(params) {
    return await this._channel.tracingStarted(params);
  }
  async traceDiscarded(params) {
    return await this._channel.traceDiscarded(params);
  }
  async addStackToTracingNoReply(params) {
    return await this._channel.addStackToTracingNoReply(params);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LocalUtils
});
