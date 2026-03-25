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
var harRecorder_exports = {};
__export(harRecorder_exports, {
  HarRecorder: () => HarRecorder
});
module.exports = __toCommonJS(harRecorder_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_artifact = require("../artifact");
var import_harTracer = require("./harTracer");
var import_crypto = require("../utils/crypto");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
var import_zipBundle = require("../../zipBundle");
class HarRecorder {
  constructor(context, page, options) {
    this._isFlushed = false;
    this._entries = [];
    this._zipFile = null;
    this._writtenZipEntries = /* @__PURE__ */ new Set();
    this._artifact = new import_artifact.Artifact(context, import_path.default.join(context._browser.options.artifactsDir, `${(0, import_crypto.createGuid)()}.har`));
    const urlFilterRe = options.urlRegexSource !== void 0 && options.urlRegexFlags !== void 0 ? new RegExp(options.urlRegexSource, options.urlRegexFlags) : void 0;
    const expectsZip = !!options.zip;
    const content = options.content || (expectsZip ? "attach" : "embed");
    this._tracer = new import_harTracer.HarTracer(context, page, this, {
      content,
      slimMode: options.mode === "minimal",
      includeTraceInfo: false,
      recordRequestOverrides: true,
      waitForContentOnStop: true,
      urlFilter: urlFilterRe ?? options.urlGlob
    });
    this._zipFile = content === "attach" || expectsZip ? new import_zipBundle.yazl.ZipFile() : null;
    this._tracer.start({ omitScripts: false });
  }
  onEntryStarted(entry) {
    this._entries.push(entry);
  }
  onEntryFinished(entry) {
  }
  onContentBlob(sha1, buffer) {
    if (!this._zipFile || this._writtenZipEntries.has(sha1))
      return;
    this._writtenZipEntries.add(sha1);
    this._zipFile.addBuffer(buffer, sha1);
  }
  async flush() {
    if (this._isFlushed)
      return;
    this._isFlushed = true;
    await this._tracer.flush();
    const log = this._tracer.stop();
    log.entries = this._entries;
    const harFileContent = jsonStringify({ log });
    if (this._zipFile) {
      const result = new import_manualPromise.ManualPromise();
      this._zipFile.on("error", (error) => result.reject(error));
      this._zipFile.addBuffer(Buffer.from(harFileContent, "utf-8"), "har.har");
      this._zipFile.end();
      this._zipFile.outputStream.pipe(import_fs.default.createWriteStream(this._artifact.localPath())).on("close", () => {
        result.resolve();
      });
      await result;
    } else {
      await import_fs.default.promises.writeFile(this._artifact.localPath(), harFileContent);
    }
  }
  async export() {
    await this.flush();
    this._artifact.reportFinished();
    return this._artifact;
  }
}
function jsonStringify(object) {
  const tokens = [];
  innerJsonStringify(object, tokens, "", false, void 0);
  return tokens.join("");
}
function innerJsonStringify(object, tokens, indent, flat, parentKey) {
  if (typeof object !== "object" || object === null) {
    tokens.push(JSON.stringify(object));
    return;
  }
  const isArray = Array.isArray(object);
  if (!isArray && object.constructor.name !== "Object") {
    tokens.push(JSON.stringify(object));
    return;
  }
  const entries = isArray ? object : Object.entries(object).filter((e) => e[1] !== void 0);
  if (!entries.length) {
    tokens.push(isArray ? `[]` : `{}`);
    return;
  }
  const childIndent = `${indent}  `;
  let brackets;
  if (isArray)
    brackets = flat ? { open: "[", close: "]" } : { open: `[
${childIndent}`, close: `
${indent}]` };
  else
    brackets = flat ? { open: "{ ", close: " }" } : { open: `{
${childIndent}`, close: `
${indent}}` };
  tokens.push(brackets.open);
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i];
    if (i)
      tokens.push(flat ? `, ` : `,
${childIndent}`);
    if (!isArray)
      tokens.push(`${JSON.stringify(entry[0])}: `);
    const key = isArray ? void 0 : entry[0];
    const flatten = flat || key === "timings" || parentKey === "headers";
    innerJsonStringify(isArray ? entry : entry[1], tokens, childIndent, flatten, key);
  }
  tokens.push(brackets.close);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HarRecorder
});
