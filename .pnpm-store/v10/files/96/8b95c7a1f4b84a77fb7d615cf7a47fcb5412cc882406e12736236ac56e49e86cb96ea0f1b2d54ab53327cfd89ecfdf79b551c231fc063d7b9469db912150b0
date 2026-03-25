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
var artifactDispatcher_exports = {};
__export(artifactDispatcher_exports, {
  ArtifactDispatcher: () => ArtifactDispatcher
});
module.exports = __toCommonJS(artifactDispatcher_exports);
var import_fs = __toESM(require("fs"));
var import_dispatcher = require("./dispatcher");
var import_streamDispatcher = require("./streamDispatcher");
var import_fileUtils = require("../utils/fileUtils");
class ArtifactDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, artifact) {
    super(scope, artifact, "Artifact", {
      absolutePath: artifact.localPath()
    });
    this._type_Artifact = true;
  }
  static from(parentScope, artifact) {
    return ArtifactDispatcher.fromNullable(parentScope, artifact);
  }
  static fromNullable(parentScope, artifact) {
    if (!artifact)
      return void 0;
    const result = parentScope.connection.existingDispatcher(artifact);
    return result || new ArtifactDispatcher(parentScope, artifact);
  }
  async pathAfterFinished(params, progress) {
    const path = await progress.race(this._object.localPathAfterFinished());
    return { value: path };
  }
  async saveAs(params, progress) {
    return await progress.race(new Promise((resolve, reject) => {
      this._object.saveAs(async (localPath, error) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          await (0, import_fileUtils.mkdirIfNeeded)(params.path);
          await import_fs.default.promises.copyFile(localPath, params.path);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    }));
  }
  async saveAsStream(params, progress) {
    return await progress.race(new Promise((resolve, reject) => {
      this._object.saveAs(async (localPath, error) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          const readable = import_fs.default.createReadStream(localPath, { highWaterMark: 1024 * 1024 });
          const stream = new import_streamDispatcher.StreamDispatcher(this, readable);
          resolve({ stream });
          await new Promise((resolve2) => {
            readable.on("close", resolve2);
            readable.on("end", resolve2);
            readable.on("error", resolve2);
          });
        } catch (e) {
          reject(e);
        }
      });
    }));
  }
  async stream(params, progress) {
    const fileName = await progress.race(this._object.localPathAfterFinished());
    const readable = import_fs.default.createReadStream(fileName, { highWaterMark: 1024 * 1024 });
    return { stream: new import_streamDispatcher.StreamDispatcher(this, readable) };
  }
  async failure(params, progress) {
    const error = await progress.race(this._object.failureError());
    return { error: error || void 0 };
  }
  async cancel(params, progress) {
    await progress.race(this._object.cancel());
  }
  async delete(params, progress) {
    progress.metadata.potentiallyClosesScope = true;
    await progress.race(this._object.delete());
    this._dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ArtifactDispatcher
});
