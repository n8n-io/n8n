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
var video_exports = {};
__export(video_exports, {
  Video: () => Video
});
module.exports = __toCommonJS(video_exports);
var import_artifact = require("./artifact");
class Video {
  constructor(page, connection, artifact) {
    this._isRemote = false;
    this._page = page;
    this._isRemote = connection.isRemote();
    this._artifact = artifact;
  }
  async start(options = {}) {
    const result = await this._page._channel.videoStart(options);
    this._artifact = import_artifact.Artifact.from(result.artifact);
  }
  async stop(options = {}) {
    await this._page._wrapApiCall(async () => {
      await this._page._channel.videoStop();
      if (options.path)
        await this.saveAs(options.path);
    });
  }
  async path() {
    if (this._isRemote)
      throw new Error(`Path is not available when connecting remotely. Use saveAs() to save a local copy.`);
    if (!this._artifact)
      throw new Error("Video recording has not been started.");
    return this._artifact._initializer.absolutePath;
  }
  async saveAs(path) {
    if (!this._artifact)
      throw new Error("Video recording has not been started.");
    return await this._artifact.saveAs(path);
  }
  async delete() {
    if (this._artifact)
      await this._artifact.delete();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Video
});
