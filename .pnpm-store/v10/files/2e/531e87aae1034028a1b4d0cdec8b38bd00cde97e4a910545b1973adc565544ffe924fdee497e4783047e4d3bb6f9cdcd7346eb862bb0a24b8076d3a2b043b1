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
var stream_exports = {};
__export(stream_exports, {
  Stream: () => Stream
});
module.exports = __toCommonJS(stream_exports);
var import_channelOwner = require("./channelOwner");
class Stream extends import_channelOwner.ChannelOwner {
  static from(Stream2) {
    return Stream2._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }
  stream() {
    return this._platform.streamReadable(this._channel);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Stream
});
