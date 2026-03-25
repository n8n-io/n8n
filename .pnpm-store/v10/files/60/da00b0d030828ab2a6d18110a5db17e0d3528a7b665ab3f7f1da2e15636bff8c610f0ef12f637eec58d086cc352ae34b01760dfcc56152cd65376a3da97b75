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
var harBackend_exports = {};
__export(harBackend_exports, {
  HarBackend: () => HarBackend
});
module.exports = __toCommonJS(harBackend_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_crypto = require("./utils/crypto");
const redirectStatus = [301, 302, 303, 307, 308];
class HarBackend {
  constructor(harFile, baseDir, zipFile) {
    this.id = (0, import_crypto.createGuid)();
    this._harFile = harFile;
    this._baseDir = baseDir;
    this._zipFile = zipFile;
  }
  async lookup(url, method, headers, postData, isNavigationRequest) {
    let entry;
    try {
      entry = await this._harFindResponse(url, method, headers, postData);
    } catch (e) {
      return { action: "error", message: "HAR error: " + e.message };
    }
    if (!entry)
      return { action: "noentry" };
    if (entry.request.url !== url && isNavigationRequest)
      return { action: "redirect", redirectURL: entry.request.url };
    const response = entry.response;
    try {
      const buffer = await this._loadContent(response.content);
      return {
        action: "fulfill",
        status: response.status,
        headers: response.headers,
        body: buffer
      };
    } catch (e) {
      return { action: "error", message: e.message };
    }
  }
  async _loadContent(content) {
    const file = content._file;
    let buffer;
    if (file) {
      if (this._zipFile)
        buffer = await this._zipFile.read(file);
      else
        buffer = await import_fs.default.promises.readFile(import_path.default.resolve(this._baseDir, file));
    } else {
      buffer = Buffer.from(content.text || "", content.encoding === "base64" ? "base64" : "utf-8");
    }
    return buffer;
  }
  async _harFindResponse(url, method, headers, postData) {
    const harLog = this._harFile.log;
    const visited = /* @__PURE__ */ new Set();
    while (true) {
      const entries = [];
      for (const candidate of harLog.entries) {
        if (candidate.request.url !== url || candidate.request.method !== method)
          continue;
        if (method === "POST" && postData && candidate.request.postData) {
          const buffer = await this._loadContent(candidate.request.postData);
          if (!buffer.equals(postData)) {
            const boundary = multipartBoundary(headers);
            if (!boundary)
              continue;
            const candidataBoundary = multipartBoundary(candidate.request.headers);
            if (!candidataBoundary)
              continue;
            if (postData.toString().replaceAll(boundary, "") !== buffer.toString().replaceAll(candidataBoundary, ""))
              continue;
          }
        }
        entries.push(candidate);
      }
      if (!entries.length)
        return;
      let entry = entries[0];
      if (entries.length > 1) {
        const list = [];
        for (const candidate of entries) {
          const matchingHeaders = countMatchingHeaders(candidate.request.headers, headers);
          list.push({ candidate, matchingHeaders });
        }
        list.sort((a, b) => b.matchingHeaders - a.matchingHeaders);
        entry = list[0].candidate;
      }
      if (visited.has(entry))
        throw new Error(`Found redirect cycle for ${url}`);
      visited.add(entry);
      const locationHeader = entry.response.headers.find((h) => h.name.toLowerCase() === "location");
      if (redirectStatus.includes(entry.response.status) && locationHeader) {
        const locationURL = new URL(locationHeader.value, url);
        url = locationURL.toString();
        if ((entry.response.status === 301 || entry.response.status === 302) && method === "POST" || entry.response.status === 303 && !["GET", "HEAD"].includes(method)) {
          method = "GET";
        }
        continue;
      }
      return entry;
    }
  }
  dispose() {
    this._zipFile?.close();
  }
}
function countMatchingHeaders(harHeaders, headers) {
  const set = new Set(headers.map((h) => h.name.toLowerCase() + ":" + h.value));
  let matches = 0;
  for (const h of harHeaders) {
    if (set.has(h.name.toLowerCase() + ":" + h.value))
      ++matches;
  }
  return matches;
}
function multipartBoundary(headers) {
  const contentType = headers.find((h) => h.name.toLowerCase() === "content-type");
  if (!contentType?.value.includes("multipart/form-data"))
    return void 0;
  const boundary = contentType.value.match(/boundary=(\S+)/);
  if (boundary)
    return boundary[1];
  return void 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HarBackend
});
