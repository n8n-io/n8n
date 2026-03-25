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
var fsWatcher_exports = {};
__export(fsWatcher_exports, {
  Watcher: () => Watcher
});
module.exports = __toCommonJS(fsWatcher_exports);
var import_utilsBundle = require("./utilsBundle");
class Watcher {
  constructor(onChange) {
    this._watchedPaths = [];
    this._ignoredFolders = [];
    this._collector = [];
    this._onChange = onChange;
  }
  async update(watchedPaths, ignoredFolders, reportPending) {
    if (JSON.stringify([this._watchedPaths, this._ignoredFolders]) === JSON.stringify([watchedPaths, ignoredFolders]))
      return;
    if (reportPending)
      this._reportEventsIfAny();
    this._watchedPaths = watchedPaths;
    this._ignoredFolders = ignoredFolders;
    void this._fsWatcher?.close();
    this._fsWatcher = void 0;
    this._collector.length = 0;
    clearTimeout(this._throttleTimer);
    this._throttleTimer = void 0;
    if (!this._watchedPaths.length)
      return;
    const ignored = [...this._ignoredFolders, "**/node_modules/**"];
    this._fsWatcher = import_utilsBundle.chokidar.watch(watchedPaths, { ignoreInitial: true, ignored }).on("all", async (event, file) => {
      if (this._throttleTimer)
        clearTimeout(this._throttleTimer);
      this._collector.push({ event, file });
      this._throttleTimer = setTimeout(() => this._reportEventsIfAny(), 250);
    });
    await new Promise((resolve, reject) => this._fsWatcher.once("ready", resolve).once("error", reject));
  }
  async close() {
    await this._fsWatcher?.close();
  }
  _reportEventsIfAny() {
    if (this._collector.length)
      this._onChange(this._collector.slice());
    this._collector.length = 0;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Watcher
});
