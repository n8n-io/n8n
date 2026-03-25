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
var fileUtils_exports = {};
__export(fileUtils_exports, {
  SerializedFS: () => SerializedFS,
  canAccessFile: () => canAccessFile,
  copyFileAndMakeWritable: () => copyFileAndMakeWritable,
  existsAsync: () => existsAsync,
  mkdirIfNeeded: () => mkdirIfNeeded,
  removeFolders: () => removeFolders,
  sanitizeForFilePath: () => sanitizeForFilePath,
  toPosixPath: () => toPosixPath
});
module.exports = __toCommonJS(fileUtils_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
var import_zipBundle = require("../../zipBundle");
const existsAsync = (path2) => new Promise((resolve) => import_fs.default.stat(path2, (err) => resolve(!err)));
async function mkdirIfNeeded(filePath) {
  await import_fs.default.promises.mkdir(import_path.default.dirname(filePath), { recursive: true }).catch(() => {
  });
}
async function removeFolders(dirs) {
  return await Promise.all(dirs.map(
    (dir) => import_fs.default.promises.rm(dir, { recursive: true, force: true, maxRetries: 10 }).catch((e) => e)
  ));
}
function canAccessFile(file) {
  if (!file)
    return false;
  try {
    import_fs.default.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}
async function copyFileAndMakeWritable(from, to) {
  await import_fs.default.promises.copyFile(from, to);
  await import_fs.default.promises.chmod(to, 436);
}
function sanitizeForFilePath(s) {
  return s.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, "-");
}
function toPosixPath(aPath) {
  return aPath.split(import_path.default.sep).join(import_path.default.posix.sep);
}
class SerializedFS {
  constructor() {
    this._buffers = /* @__PURE__ */ new Map();
    this._operations = [];
    this._operationsDone = new import_manualPromise.ManualPromise();
    this._operationsDone.resolve();
  }
  mkdir(dir) {
    this._appendOperation({ op: "mkdir", dir });
  }
  writeFile(file, content, skipIfExists) {
    this._buffers.delete(file);
    this._appendOperation({ op: "writeFile", file, content, skipIfExists });
  }
  appendFile(file, text, flush) {
    if (!this._buffers.has(file))
      this._buffers.set(file, []);
    this._buffers.get(file).push(text);
    if (flush)
      this._flushFile(file);
  }
  _flushFile(file) {
    const buffer = this._buffers.get(file);
    if (buffer === void 0)
      return;
    const content = buffer.join("");
    this._buffers.delete(file);
    this._appendOperation({ op: "appendFile", file, content });
  }
  copyFile(from, to) {
    this._flushFile(from);
    this._buffers.delete(to);
    this._appendOperation({ op: "copyFile", from, to });
  }
  async syncAndGetError() {
    for (const file of this._buffers.keys())
      this._flushFile(file);
    await this._operationsDone;
    return this._error;
  }
  zip(entries, zipFileName) {
    for (const file of this._buffers.keys())
      this._flushFile(file);
    this._appendOperation({ op: "zip", entries, zipFileName });
  }
  // This method serializes all writes to the trace.
  _appendOperation(op) {
    const last = this._operations[this._operations.length - 1];
    if (last?.op === "appendFile" && op.op === "appendFile" && last.file === op.file) {
      last.content += op.content;
      return;
    }
    this._operations.push(op);
    if (this._operationsDone.isDone())
      this._performOperations();
  }
  async _performOperations() {
    this._operationsDone = new import_manualPromise.ManualPromise();
    while (this._operations.length) {
      const op = this._operations.shift();
      if (this._error)
        continue;
      try {
        await this._performOperation(op);
      } catch (e) {
        this._error = e;
      }
    }
    this._operationsDone.resolve();
  }
  async _performOperation(op) {
    switch (op.op) {
      case "mkdir": {
        await import_fs.default.promises.mkdir(op.dir, { recursive: true });
        return;
      }
      case "writeFile": {
        if (op.skipIfExists)
          await import_fs.default.promises.writeFile(op.file, op.content, { flag: "wx" }).catch(() => {
          });
        else
          await import_fs.default.promises.writeFile(op.file, op.content);
        return;
      }
      case "copyFile": {
        await import_fs.default.promises.copyFile(op.from, op.to);
        return;
      }
      case "appendFile": {
        await import_fs.default.promises.appendFile(op.file, op.content);
        return;
      }
      case "zip": {
        const zipFile = new import_zipBundle.yazl.ZipFile();
        const result = new import_manualPromise.ManualPromise();
        zipFile.on("error", (error) => result.reject(error));
        for (const entry of op.entries)
          zipFile.addFile(entry.value, entry.name);
        zipFile.end();
        zipFile.outputStream.pipe(import_fs.default.createWriteStream(op.zipFileName)).on("close", () => result.resolve()).on("error", (error) => result.reject(error));
        await result;
        return;
      }
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SerializedFS,
  canAccessFile,
  copyFileAndMakeWritable,
  existsAsync,
  mkdirIfNeeded,
  removeFolders,
  sanitizeForFilePath,
  toPosixPath
});
