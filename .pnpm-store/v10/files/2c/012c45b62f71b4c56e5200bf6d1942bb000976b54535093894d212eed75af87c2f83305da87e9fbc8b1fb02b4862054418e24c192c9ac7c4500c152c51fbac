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
var artifact_exports = {};
__export(artifact_exports, {
  Artifact: () => Artifact
});
module.exports = __toCommonJS(artifact_exports);
var import_fs = __toESM(require("fs"));
var import_utils = require("../utils");
var import_errors = require("./errors");
var import_instrumentation = require("./instrumentation");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
class Artifact extends import_instrumentation.SdkObject {
  constructor(parent, localPath, unaccessibleErrorMessage, cancelCallback) {
    super(parent, "artifact");
    this._finishedPromise = new import_manualPromise.ManualPromise();
    this._saveCallbacks = [];
    this._finished = false;
    this._deleted = false;
    this._localPath = localPath;
    this._unaccessibleErrorMessage = unaccessibleErrorMessage;
    this._cancelCallback = cancelCallback;
  }
  finishedPromise() {
    return this._finishedPromise;
  }
  localPath() {
    return this._localPath;
  }
  async localPathAfterFinished() {
    if (this._unaccessibleErrorMessage)
      throw new Error(this._unaccessibleErrorMessage);
    await this._finishedPromise;
    if (this._failureError)
      throw this._failureError;
    return this._localPath;
  }
  saveAs(saveCallback) {
    if (this._unaccessibleErrorMessage)
      throw new Error(this._unaccessibleErrorMessage);
    if (this._deleted)
      throw new Error(`File already deleted. Save before deleting.`);
    if (this._failureError)
      throw this._failureError;
    if (this._finished) {
      saveCallback(this._localPath).catch(() => {
      });
      return;
    }
    this._saveCallbacks.push(saveCallback);
  }
  async failureError() {
    if (this._unaccessibleErrorMessage)
      return this._unaccessibleErrorMessage;
    await this._finishedPromise;
    return this._failureError?.message || null;
  }
  async cancel() {
    (0, import_utils.assert)(this._cancelCallback !== void 0);
    return this._cancelCallback();
  }
  async delete() {
    if (this._unaccessibleErrorMessage)
      return;
    const fileName = await this.localPathAfterFinished();
    if (this._deleted)
      return;
    this._deleted = true;
    if (fileName)
      await import_fs.default.promises.unlink(fileName).catch((e) => {
      });
  }
  async deleteOnContextClose() {
    if (this._deleted)
      return;
    this._deleted = true;
    if (!this._unaccessibleErrorMessage)
      await import_fs.default.promises.unlink(this._localPath).catch((e) => {
      });
    await this.reportFinished(new import_errors.TargetClosedError(this.closeReason()));
  }
  async reportFinished(error) {
    if (this._finished)
      return;
    this._finished = true;
    this._failureError = error;
    if (error) {
      for (const callback of this._saveCallbacks)
        await callback("", error);
    } else {
      for (const callback of this._saveCallbacks)
        await callback(this._localPath);
    }
    this._saveCallbacks = [];
    this._finishedPromise.resolve();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Artifact
});
