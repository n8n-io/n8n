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
var download_exports = {};
__export(download_exports, {
  Download: () => Download
});
module.exports = __toCommonJS(download_exports);
class Download {
  constructor(page, url, suggestedFilename, artifact) {
    this._page = page;
    this._url = url;
    this._suggestedFilename = suggestedFilename;
    this._artifact = artifact;
  }
  page() {
    return this._page;
  }
  url() {
    return this._url;
  }
  suggestedFilename() {
    return this._suggestedFilename;
  }
  async path() {
    return await this._artifact.pathAfterFinished();
  }
  async saveAs(path) {
    return await this._artifact.saveAs(path);
  }
  async failure() {
    return await this._artifact.failure();
  }
  async createReadStream() {
    return await this._artifact.createReadStream();
  }
  async cancel() {
    return await this._artifact.cancel();
  }
  async delete() {
    return await this._artifact.delete();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Download
});
