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
var snapshotServer_exports = {};
__export(snapshotServer_exports, {
  SnapshotServer: () => SnapshotServer
});
module.exports = __toCommonJS(snapshotServer_exports);
class SnapshotServer {
  constructor(snapshotStorage, resourceLoader) {
    this._snapshotIds = /* @__PURE__ */ new Map();
    this._snapshotStorage = snapshotStorage;
    this._resourceLoader = resourceLoader;
  }
  serveSnapshot(pageOrFrameId, searchParams, snapshotUrl) {
    const snapshot = this._snapshot(pageOrFrameId, searchParams);
    if (!snapshot)
      return new Response(null, { status: 404 });
    const renderedSnapshot = snapshot.render();
    this._snapshotIds.set(snapshotUrl, snapshot);
    return new Response(renderedSnapshot.html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  async serveClosestScreenshot(pageOrFrameId, searchParams) {
    const snapshot = this._snapshot(pageOrFrameId, searchParams);
    const sha1 = snapshot?.closestScreenshot();
    if (!sha1)
      return new Response(null, { status: 404 });
    return new Response(await this._resourceLoader(sha1));
  }
  serveSnapshotInfo(pageOrFrameId, searchParams) {
    const snapshot = this._snapshot(pageOrFrameId, searchParams);
    return this._respondWithJson(snapshot ? {
      viewport: snapshot.viewport(),
      url: snapshot.snapshot().frameUrl,
      timestamp: snapshot.snapshot().timestamp,
      wallTime: snapshot.snapshot().wallTime
    } : {
      error: "No snapshot found"
    });
  }
  _snapshot(pageOrFrameId, params) {
    const name = params.get("name");
    return this._snapshotStorage.snapshotByName(pageOrFrameId, name);
  }
  _respondWithJson(object) {
    return new Response(JSON.stringify(object), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000",
        "Content-Type": "application/json"
      }
    });
  }
  async serveResource(requestUrlAlternatives, method, snapshotUrl) {
    let resource;
    const snapshot = this._snapshotIds.get(snapshotUrl);
    for (const requestUrl of requestUrlAlternatives) {
      resource = snapshot?.resourceByUrl(removeHash(requestUrl), method);
      if (resource)
        break;
    }
    if (!resource)
      return new Response(null, { status: 404 });
    const sha1 = resource.response.content._sha1;
    const content = sha1 ? await this._resourceLoader(sha1) || new Blob([]) : new Blob([]);
    let contentType = resource.response.content.mimeType;
    const isTextEncoding = /^text\/|^application\/(javascript|json)/.test(contentType);
    if (isTextEncoding && !contentType.includes("charset"))
      contentType = `${contentType}; charset=utf-8`;
    const headers = new Headers();
    if (contentType !== "x-unknown")
      headers.set("Content-Type", contentType);
    for (const { name, value } of resource.response.headers)
      headers.set(name, value);
    headers.delete("Content-Encoding");
    headers.delete("Access-Control-Allow-Origin");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.delete("Content-Length");
    headers.set("Content-Length", String(content.size));
    if (this._snapshotStorage.hasResourceOverride(resource.request.url))
      headers.set("Cache-Control", "no-store, no-cache, max-age=0");
    else
      headers.set("Cache-Control", "public, max-age=31536000");
    const { status } = resource.response;
    const isNullBodyStatus = status === 101 || status === 204 || status === 205 || status === 304;
    return new Response(isNullBodyStatus ? null : content, {
      headers,
      status: resource.response.status,
      statusText: resource.response.statusText
    });
  }
}
function removeHash(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch (e) {
    return url;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SnapshotServer
});
