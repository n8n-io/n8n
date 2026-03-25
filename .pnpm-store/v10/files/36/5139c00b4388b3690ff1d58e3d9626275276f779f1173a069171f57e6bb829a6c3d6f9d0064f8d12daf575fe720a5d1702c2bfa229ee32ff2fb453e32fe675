var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  fileStreamHasher: () => fileStreamHasher,
  readableStreamHasher: () => readableStreamHasher
});
module.exports = __toCommonJS(src_exports);

// src/fileStreamHasher.ts
var import_fs = require("fs");

// src/HashCalculator.ts
var import_util_utf8 = require("@smithy/util-utf8");
var import_stream = require("stream");
var HashCalculator = class extends import_stream.Writable {
  constructor(hash, options) {
    super(options);
    this.hash = hash;
  }
  static {
    __name(this, "HashCalculator");
  }
  _write(chunk, encoding, callback) {
    try {
      this.hash.update((0, import_util_utf8.toUint8Array)(chunk));
    } catch (err) {
      return callback(err);
    }
    callback();
  }
};

// src/fileStreamHasher.ts
var fileStreamHasher = /* @__PURE__ */ __name((hashCtor, fileStream) => new Promise((resolve, reject) => {
  if (!isReadStream(fileStream)) {
    reject(new Error("Unable to calculate hash for non-file streams."));
    return;
  }
  const fileStreamTee = (0, import_fs.createReadStream)(fileStream.path, {
    start: fileStream.start,
    end: fileStream.end
  });
  const hash = new hashCtor();
  const hashCalculator = new HashCalculator(hash);
  fileStreamTee.pipe(hashCalculator);
  fileStreamTee.on("error", (err) => {
    hashCalculator.end();
    reject(err);
  });
  hashCalculator.on("error", reject);
  hashCalculator.on("finish", function() {
    hash.digest().then(resolve).catch(reject);
  });
}), "fileStreamHasher");
var isReadStream = /* @__PURE__ */ __name((stream) => typeof stream.path === "string", "isReadStream");

// src/readableStreamHasher.ts
var readableStreamHasher = /* @__PURE__ */ __name((hashCtor, readableStream) => {
  if (readableStream.readableFlowing !== null) {
    throw new Error("Unable to calculate hash for flowing readable stream");
  }
  const hash = new hashCtor();
  const hashCalculator = new HashCalculator(hash);
  readableStream.pipe(hashCalculator);
  return new Promise((resolve, reject) => {
    readableStream.on("error", (err) => {
      hashCalculator.end();
      reject(err);
    });
    hashCalculator.on("error", reject);
    hashCalculator.on("finish", () => {
      hash.digest().then(resolve).catch(reject);
    });
  });
}, "readableStreamHasher");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  fileStreamHasher,
  readableStreamHasher
});

