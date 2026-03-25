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
var traceLoader_exports = {};
__export(traceLoader_exports, {
  TraceLoader: () => TraceLoader
});
module.exports = __toCommonJS(traceLoader_exports);
var import_traceUtils = require("@isomorphic/traceUtils");
var import_snapshotStorage = require("./snapshotStorage");
var import_traceModernizer = require("./traceModernizer");
class TraceLoader {
  constructor() {
    this.contextEntries = [];
    this._resourceToContentType = /* @__PURE__ */ new Map();
  }
  async load(backend, unzipProgress) {
    this._backend = backend;
    const ordinals = [];
    let hasSource = false;
    for (const entryName of await this._backend.entryNames()) {
      const match = entryName.match(/(.+)\.trace$/);
      if (match)
        ordinals.push(match[1] || "");
      if (entryName.includes("src@"))
        hasSource = true;
    }
    if (!ordinals.length)
      throw new Error("Cannot find .trace file");
    this._snapshotStorage = new import_snapshotStorage.SnapshotStorage();
    const total = ordinals.length * 3;
    let done = 0;
    for (const ordinal of ordinals) {
      const contextEntry = createEmptyContext();
      contextEntry.hasSource = hasSource;
      const modernizer = new import_traceModernizer.TraceModernizer(contextEntry, this._snapshotStorage);
      const trace = await this._backend.readText(ordinal + ".trace") || "";
      modernizer.appendTrace(trace);
      unzipProgress(++done, total);
      const network = await this._backend.readText(ordinal + ".network") || "";
      modernizer.appendTrace(network);
      unzipProgress(++done, total);
      contextEntry.actions = modernizer.actions().sort((a1, a2) => a1.startTime - a2.startTime);
      if (!backend.isLive()) {
        for (const action of contextEntry.actions.slice().reverse()) {
          if (!action.endTime && !action.error) {
            for (const a of contextEntry.actions) {
              if (a.parentId === action.callId && action.endTime < a.endTime)
                action.endTime = a.endTime;
            }
          }
        }
      }
      const stacks = await this._backend.readText(ordinal + ".stacks");
      if (stacks) {
        const callMetadata = (0, import_traceUtils.parseClientSideCallMetadata)(JSON.parse(stacks));
        for (const action of contextEntry.actions)
          action.stack = action.stack || callMetadata.get(action.callId);
      }
      unzipProgress(++done, total);
      for (const resource of contextEntry.resources) {
        if (resource.request.postData?._sha1)
          this._resourceToContentType.set(resource.request.postData._sha1, stripEncodingFromContentType(resource.request.postData.mimeType));
        if (resource.response.content?._sha1)
          this._resourceToContentType.set(resource.response.content._sha1, stripEncodingFromContentType(resource.response.content.mimeType));
      }
      this.contextEntries.push(contextEntry);
    }
    this._snapshotStorage.finalize();
  }
  async hasEntry(filename) {
    return this._backend.hasEntry(filename);
  }
  async resourceForSha1(sha1) {
    const blob = await this._backend.readBlob("resources/" + sha1);
    const contentType = this._resourceToContentType.get(sha1);
    if (!blob || contentType === void 0 || contentType === "x-unknown")
      return blob;
    return new Blob([blob], { type: contentType });
  }
  storage() {
    return this._snapshotStorage;
  }
}
function stripEncodingFromContentType(contentType) {
  const charset = contentType.match(/^(.*);\s*charset=.*$/);
  if (charset)
    return charset[1];
  return contentType;
}
function createEmptyContext() {
  return {
    origin: "testRunner",
    startTime: Number.MAX_SAFE_INTEGER,
    wallTime: Number.MAX_SAFE_INTEGER,
    endTime: 0,
    browserName: "",
    options: {
      deviceScaleFactor: 1,
      isMobile: false,
      viewport: { width: 1280, height: 800 }
    },
    pages: [],
    resources: [],
    actions: [],
    events: [],
    errors: [],
    stdio: [],
    hasSource: false,
    contextId: ""
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TraceLoader
});
