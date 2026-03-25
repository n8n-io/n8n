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
var cdpSession_exports = {};
__export(cdpSession_exports, {
  CDPSession: () => CDPSession
});
module.exports = __toCommonJS(cdpSession_exports);
var import_channelOwner = require("./channelOwner");
class CDPSession extends import_channelOwner.ChannelOwner {
  static from(cdpSession) {
    return cdpSession._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._channel.on("event", ({ method, params }) => {
      this.emit(method, params);
    });
    this.on = super.on;
    this.addListener = super.addListener;
    this.off = super.removeListener;
    this.removeListener = super.removeListener;
    this.once = super.once;
  }
  async send(method, params) {
    const result = await this._channel.send({ method, params });
    return result.result;
  }
  async detach() {
    return await this._channel.detach();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CDPSession
});
