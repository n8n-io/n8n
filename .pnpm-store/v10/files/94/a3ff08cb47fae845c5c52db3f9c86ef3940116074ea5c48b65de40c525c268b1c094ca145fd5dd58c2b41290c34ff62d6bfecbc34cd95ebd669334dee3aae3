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
var snapshotStorage_exports = {};
__export(snapshotStorage_exports, {
  SnapshotStorage: () => SnapshotStorage
});
module.exports = __toCommonJS(snapshotStorage_exports);
var import_snapshotRenderer = require("./snapshotRenderer");
var import_lruCache = require("../lruCache");
class SnapshotStorage {
  constructor() {
    this._frameSnapshots = /* @__PURE__ */ new Map();
    this._cache = new import_lruCache.LRUCache(1e8);
    // 100MB per each trace
    this._contextToResources = /* @__PURE__ */ new Map();
    this._resourceUrlsWithOverrides = /* @__PURE__ */ new Set();
  }
  addResource(contextId, resource) {
    resource.request.url = (0, import_snapshotRenderer.rewriteURLForCustomProtocol)(resource.request.url);
    this._ensureResourcesForContext(contextId).push(resource);
  }
  addFrameSnapshot(contextId, snapshot, screencastFrames) {
    for (const override of snapshot.resourceOverrides)
      override.url = (0, import_snapshotRenderer.rewriteURLForCustomProtocol)(override.url);
    let frameSnapshots = this._frameSnapshots.get(snapshot.frameId);
    if (!frameSnapshots) {
      frameSnapshots = {
        raw: [],
        renderers: []
      };
      this._frameSnapshots.set(snapshot.frameId, frameSnapshots);
      if (snapshot.isMainFrame)
        this._frameSnapshots.set(snapshot.pageId, frameSnapshots);
    }
    frameSnapshots.raw.push(snapshot);
    const resources = this._ensureResourcesForContext(contextId);
    const renderer = new import_snapshotRenderer.SnapshotRenderer(this._cache, resources, frameSnapshots.raw, screencastFrames, frameSnapshots.raw.length - 1);
    frameSnapshots.renderers.push(renderer);
    return renderer;
  }
  snapshotByName(pageOrFrameId, snapshotName) {
    const snapshot = this._frameSnapshots.get(pageOrFrameId);
    return snapshot?.renderers.find((r) => r.snapshotName === snapshotName);
  }
  snapshotsForTest() {
    return [...this._frameSnapshots.keys()];
  }
  finalize() {
    for (const resources of this._contextToResources.values())
      resources.sort((a, b) => (a._monotonicTime || 0) - (b._monotonicTime || 0));
    for (const frameSnapshots of this._frameSnapshots.values()) {
      for (const snapshot of frameSnapshots.raw) {
        for (const override of snapshot.resourceOverrides)
          this._resourceUrlsWithOverrides.add(override.url);
      }
    }
  }
  hasResourceOverride(url) {
    return this._resourceUrlsWithOverrides.has(url);
  }
  _ensureResourcesForContext(contextId) {
    let resources = this._contextToResources.get(contextId);
    if (!resources) {
      resources = [];
      this._contextToResources.set(contextId, resources);
    }
    return resources;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SnapshotStorage
});
