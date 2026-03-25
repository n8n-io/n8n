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
var storage_exports = {};
__export(storage_exports, {
  Storage: () => Storage
});
module.exports = __toCommonJS(storage_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
class Storage {
  static {
    this._storages = /* @__PURE__ */ new Map();
  }
  static {
    this._serializeQueue = Promise.resolve();
  }
  static clone(storageFile, outputDir) {
    return Storage._withStorage(storageFile, (storage) => storage._clone(outputDir));
  }
  static upstream(storageFile, storageOutFile) {
    return Storage._withStorage(storageFile, (storage) => storage._upstream(storageOutFile));
  }
  static _withStorage(fileName, runnable) {
    this._serializeQueue = this._serializeQueue.then(() => {
      let storage = Storage._storages.get(fileName);
      if (!storage) {
        storage = new Storage(fileName);
        Storage._storages.set(fileName, storage);
      }
      return runnable(storage);
    });
    return this._serializeQueue;
  }
  constructor(fileName) {
    this._fileName = fileName;
  }
  async _clone(outputDir) {
    const entries = await this._load();
    if (this._lastSnapshotFileName)
      return this._lastSnapshotFileName;
    const snapshotFile = import_path.default.join(outputDir, `pw-storage-${(0, import_utils.createGuid)()}.json`);
    await import_fs.default.promises.writeFile(snapshotFile, JSON.stringify(entries, null, 2)).catch(() => {
    });
    this._lastSnapshotFileName = snapshotFile;
    return snapshotFile;
  }
  async _upstream(storageOutFile) {
    const entries = await this._load();
    const newEntries = await import_fs.default.promises.readFile(storageOutFile, "utf8").then(JSON.parse).catch(() => ({}));
    for (const [key, newValue] of Object.entries(newEntries))
      entries[key] = newValue;
    this._lastSnapshotFileName = void 0;
    await import_fs.default.promises.writeFile(this._fileName, JSON.stringify(entries, null, 2));
  }
  async _load() {
    if (!this._entriesPromise)
      this._entriesPromise = import_fs.default.promises.readFile(this._fileName, "utf8").then(JSON.parse).catch(() => ({}));
    return this._entriesPromise;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Storage
});
