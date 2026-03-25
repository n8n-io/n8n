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
var artifact_exports = {};
__export(artifact_exports, {
  Artifact: () => Artifact
});
module.exports = __toCommonJS(artifact_exports);
var import_channelOwner = require("./channelOwner");
var import_stream = require("./stream");
var import_fileUtils = require("./fileUtils");
class Artifact extends import_channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  async pathAfterFinished() {
    if (this._connection.isRemote())
      throw new Error(`Path is not available when connecting remotely. Use saveAs() to save a local copy.`);
    return (await this._channel.pathAfterFinished()).value;
  }
  async saveAs(path) {
    if (!this._connection.isRemote()) {
      await this._channel.saveAs({ path });
      return;
    }
    const result = await this._channel.saveAsStream();
    const stream = import_stream.Stream.from(result.stream);
    await (0, import_fileUtils.mkdirIfNeeded)(this._platform, path);
    await new Promise((resolve, reject) => {
      stream.stream().pipe(this._platform.fs().createWriteStream(path)).on("finish", resolve).on("error", reject);
    });
  }
  async failure() {
    return (await this._channel.failure()).error || null;
  }
  async createReadStream() {
    const result = await this._channel.stream();
    const stream = import_stream.Stream.from(result.stream);
    return stream.stream();
  }
  async readIntoBuffer() {
    const stream = await this.createReadStream();
    return await new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => {
        chunks.push(chunk);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on("error", reject);
    });
  }
  async cancel() {
    return await this._channel.cancel();
  }
  async delete() {
    return await this._channel.delete();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Artifact
});
