"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var oopDownloadBrowserMain_exports = {};
module.exports = __toCommonJS(oopDownloadBrowserMain_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
var import_network = require("../utils/network");
var import_zipBundle = require("../../zipBundle");
var import_fileUtils = require("../utils/fileUtils");
function log(message) {
  process.send?.({ method: "log", params: { message } });
}
function progress(done, total) {
  process.send?.({ method: "progress", params: { done, total } });
}
function browserDirectoryToMarkerFilePath(browserDirectory) {
  return import_path.default.join(browserDirectory, "INSTALLATION_COMPLETE");
}
function downloadFile(options) {
  let downloadedBytes = 0;
  let totalBytes = 0;
  let chunked = false;
  const promise = new import_manualPromise.ManualPromise();
  (0, import_network.httpRequest)({
    url: options.url,
    headers: {
      "User-Agent": options.userAgent
    },
    socketTimeout: options.socketTimeout
  }, (response) => {
    log(`-- response status code: ${response.statusCode}`);
    if (response.statusCode !== 200) {
      let content = "";
      const handleError = () => {
        const error = new Error(`Download failed: server returned code ${response.statusCode} body '${content}'. URL: ${options.url}`);
        response.resume();
        promise.reject(error);
      };
      response.on("data", (chunk) => content += chunk).on("end", handleError).on("error", handleError);
      return;
    }
    chunked = response.headers["transfer-encoding"] === "chunked";
    log(`-- is chunked: ${chunked}`);
    totalBytes = parseInt(response.headers["content-length"] || "0", 10);
    log(`-- total bytes: ${totalBytes}`);
    const file = import_fs.default.createWriteStream(options.zipPath);
    file.on("finish", () => {
      if (!chunked && downloadedBytes !== totalBytes) {
        log(`-- download failed, size mismatch: ${downloadedBytes} != ${totalBytes}`);
        promise.reject(new Error(`Download failed: size mismatch, file size: ${downloadedBytes}, expected size: ${totalBytes} URL: ${options.url}`));
      } else {
        log(`-- download complete, size: ${downloadedBytes}`);
        promise.resolve();
      }
    });
    file.on("error", (error) => promise.reject(error));
    response.pipe(file);
    response.on("data", onData);
    response.on("error", (error) => {
      file.close();
      if (error?.code === "ECONNRESET") {
        log(`-- download failed, server closed connection`);
        promise.reject(new Error(`Download failed: server closed connection. URL: ${options.url}`));
      } else {
        log(`-- download failed, unexpected error`);
        promise.reject(new Error(`Download failed: ${error?.message ?? error}. URL: ${options.url}`));
      }
    });
  }, (error) => promise.reject(error));
  return promise;
  function onData(chunk) {
    downloadedBytes += chunk.length;
    if (!chunked)
      progress(downloadedBytes, totalBytes);
  }
}
async function main(options) {
  await downloadFile(options);
  log(`SUCCESS downloading ${options.title}`);
  log(`removing existing browser directory if any`);
  await (0, import_fileUtils.removeFolders)([options.browserDirectory]);
  log(`extracting archive`);
  await (0, import_zipBundle.extract)(options.zipPath, { dir: options.browserDirectory });
  if (options.executablePath) {
    log(`fixing permissions at ${options.executablePath}`);
    await import_fs.default.promises.chmod(options.executablePath, 493);
  }
  await import_fs.default.promises.writeFile(browserDirectoryToMarkerFilePath(options.browserDirectory), "");
}
process.on("message", async (message) => {
  const { method, params } = message;
  if (method === "download") {
    try {
      await main(params);
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
});
process.on("disconnect", () => {
  process.exit(0);
});
