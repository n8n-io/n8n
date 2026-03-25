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
var writableStreamDispatcher_exports = {};
__export(writableStreamDispatcher_exports, {
  WritableStreamDispatcher: () => WritableStreamDispatcher
});
module.exports = __toCommonJS(writableStreamDispatcher_exports);
var import_fs = __toESM(require("fs"));
var import_dispatcher = require("./dispatcher");
var import_instrumentation = require("../instrumentation");
class WritableStreamSdkObject extends import_instrumentation.SdkObject {
  constructor(parent, streamOrDirectory, lastModifiedMs) {
    super(parent, "stream");
    this.streamOrDirectory = streamOrDirectory;
    this.lastModifiedMs = lastModifiedMs;
  }
}
class WritableStreamDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, streamOrDirectory, lastModifiedMs) {
    super(scope, new WritableStreamSdkObject(scope._object, streamOrDirectory, lastModifiedMs), "WritableStream", {});
    this._type_WritableStream = true;
  }
  async write(params, progress) {
    if (typeof this._object.streamOrDirectory === "string")
      throw new Error("Cannot write to a directory");
    const stream = this._object.streamOrDirectory;
    await progress.race(new Promise((fulfill, reject) => {
      stream.write(params.binary, (error) => {
        if (error)
          reject(error);
        else
          fulfill();
      });
    }));
  }
  async close(params, progress) {
    if (typeof this._object.streamOrDirectory === "string")
      throw new Error("Cannot close a directory");
    const stream = this._object.streamOrDirectory;
    await progress.race(new Promise((fulfill) => stream.end(fulfill)));
    if (this._object.lastModifiedMs)
      await progress.race(import_fs.default.promises.utimes(this.path(), new Date(this._object.lastModifiedMs), new Date(this._object.lastModifiedMs)));
  }
  path() {
    if (typeof this._object.streamOrDirectory === "string")
      return this._object.streamOrDirectory;
    return this._object.streamOrDirectory.path;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WritableStreamDispatcher
});
