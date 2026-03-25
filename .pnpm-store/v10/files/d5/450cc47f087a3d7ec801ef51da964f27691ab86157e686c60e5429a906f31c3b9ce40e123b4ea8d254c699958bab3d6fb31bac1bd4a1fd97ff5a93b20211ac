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
var blob_exports = {};
__export(blob_exports, {
  BlobReporter: () => BlobReporter,
  currentBlobReportVersion: () => currentBlobReportVersion
});
module.exports = __toCommonJS(blob_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_stream = require("stream");
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_zipBundle = require("playwright-core/lib/zipBundle");
var import_base = require("./base");
var import_teleEmitter = require("./teleEmitter");
const currentBlobReportVersion = 2;
class BlobReporter extends import_teleEmitter.TeleReporterEmitter {
  constructor(options) {
    super((message) => this._messages.push(message));
    this._messages = [];
    this._attachments = [];
    this._options = options;
    if (this._options.fileName && !this._options.fileName.endsWith(".zip"))
      throw new Error(`Blob report file name must end with .zip extension: ${this._options.fileName}`);
    this._salt = (0, import_utils2.createGuid)();
  }
  onConfigure(config) {
    const metadata = {
      version: currentBlobReportVersion,
      userAgent: (0, import_utils2.getUserAgent)(),
      // TODO: remove after some time, recommend config.tag instead.
      name: process.env.PWTEST_BOT_NAME,
      shard: config.shard ?? void 0,
      pathSeparator: import_path.default.sep
    };
    this._messages.push({
      method: "onBlobReportMetadata",
      params: metadata
    });
    this._config = config;
    super.onConfigure(config);
  }
  async onTestPaused(test, result) {
  }
  async onEnd(result) {
    await super.onEnd(result);
    const zipFileName = await this._prepareOutputFile();
    const zipFile = new import_zipBundle.yazl.ZipFile();
    const zipFinishPromise = new import_utils2.ManualPromise();
    const finishPromise = zipFinishPromise.catch((e) => {
      throw new Error(`Failed to write report ${zipFileName}: ` + e.message);
    });
    zipFile.on("error", (error) => zipFinishPromise.reject(error));
    zipFile.outputStream.pipe(import_fs.default.createWriteStream(zipFileName)).on("close", () => {
      zipFinishPromise.resolve(void 0);
    }).on("error", (error) => zipFinishPromise.reject(error));
    for (const { originalPath, zipEntryPath } of this._attachments) {
      if (!import_fs.default.statSync(originalPath, { throwIfNoEntry: false })?.isFile())
        continue;
      zipFile.addFile(originalPath, zipEntryPath);
    }
    const lines = this._messages.map((m) => JSON.stringify(m) + "\n");
    const content = import_stream.Readable.from(lines);
    zipFile.addReadStream(content, "report.jsonl");
    zipFile.end();
    await finishPromise;
  }
  async _prepareOutputFile() {
    const { outputFile, outputDir } = (0, import_base.resolveOutputFile)("BLOB", {
      ...this._options,
      default: {
        fileName: this._defaultReportName(this._config),
        outputDir: "blob-report"
      }
    });
    if (!process.env.PWTEST_BLOB_DO_NOT_REMOVE)
      await (0, import_utils.removeFolders)([outputDir]);
    await import_fs.default.promises.mkdir(import_path.default.dirname(outputFile), { recursive: true });
    return outputFile;
  }
  _defaultReportName(config) {
    let reportName = "report";
    if (this._options._commandHash)
      reportName += "-" + (0, import_utils.sanitizeForFilePath)(this._options._commandHash);
    if (config.shard) {
      const paddedNumber = `${config.shard.current}`.padStart(`${config.shard.total}`.length, "0");
      reportName = `${reportName}-${paddedNumber}`;
    }
    return `${reportName}.zip`;
  }
  _serializeAttachments(attachments) {
    return super._serializeAttachments(attachments).map((attachment) => {
      if (!attachment.path)
        return attachment;
      const sha1 = (0, import_utils2.calculateSha1)(attachment.path + this._salt);
      const extension = import_utilsBundle.mime.getExtension(attachment.contentType) || "dat";
      const newPath = `resources/${sha1}.${extension}`;
      this._attachments.push({ originalPath: attachment.path, zipEntryPath: newPath });
      return {
        ...attachment,
        path: newPath
      };
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BlobReporter,
  currentBlobReportVersion
});
