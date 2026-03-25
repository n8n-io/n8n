"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var download_exports = {};
__export(download_exports, {
  Download: () => Download
});
module.exports = __toCommonJS(download_exports);
var import_path = __toESM(require("path"));
var import_page = require("./page");
var import_utils = require("../utils");
var import_artifact = require("./artifact");
class Download {
  constructor(page, downloadsPath, uuid, url, suggestedFilename) {
    const unaccessibleErrorMessage = page.browserContext._options.acceptDownloads === "deny" ? "Pass { acceptDownloads: true } when you are creating your browser context." : void 0;
    this.artifact = new import_artifact.Artifact(page, import_path.default.join(downloadsPath, uuid), unaccessibleErrorMessage, () => {
      return this._page.browserContext.cancelDownload(uuid);
    });
    this._page = page;
    this.url = url;
    this._suggestedFilename = suggestedFilename;
    page.browserContext._downloads.add(this);
    if (suggestedFilename !== void 0)
      this._fireDownloadEvent();
  }
  page() {
    return this._page;
  }
  _filenameSuggested(suggestedFilename) {
    (0, import_utils.assert)(this._suggestedFilename === void 0);
    this._suggestedFilename = suggestedFilename;
    this._fireDownloadEvent();
  }
  suggestedFilename() {
    return this._suggestedFilename;
  }
  _fireDownloadEvent() {
    this._page.instrumentation.onDownload(this._page, this);
    this._page.emit(import_page.Page.Events.Download, this);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Download
});
