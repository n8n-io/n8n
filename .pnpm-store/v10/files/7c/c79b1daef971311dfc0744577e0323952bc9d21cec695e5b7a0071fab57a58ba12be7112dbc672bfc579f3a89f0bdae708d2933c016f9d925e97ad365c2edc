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
var nodePlatform_exports = {};
__export(nodePlatform_exports, {
  nodePlatform: () => nodePlatform,
  setBoxedStackPrefixes: () => setBoxedStackPrefixes
});
module.exports = __toCommonJS(nodePlatform_exports);
var import_crypto = __toESM(require("crypto"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var util = __toESM(require("util"));
var import_stream = require("stream");
var import_events = require("events");
var import_utilsBundle = require("../../utilsBundle");
var import_debugLogger = require("./debugLogger");
var import_zones = require("./zones");
var import_debug = require("./debug");
var import_mcpBundle = require("../../mcpBundle");
const pipelineAsync = util.promisify(import_stream.pipeline);
class NodeZone {
  constructor(zone) {
    this._zone = zone;
  }
  push(data) {
    return new NodeZone(this._zone.with("apiZone", data));
  }
  pop() {
    return new NodeZone(this._zone.without("apiZone"));
  }
  run(func) {
    return this._zone.run(func);
  }
  data() {
    return this._zone.data("apiZone");
  }
}
let boxedStackPrefixes = [];
function setBoxedStackPrefixes(prefixes) {
  boxedStackPrefixes = prefixes;
}
const coreDir = import_path.default.dirname(require.resolve("../../../package.json"));
const nodePlatform = {
  name: "node",
  boxedStackPrefixes: () => {
    if (process.env.PWDEBUGIMPL)
      return [];
    return [coreDir, ...boxedStackPrefixes];
  },
  calculateSha1: (text) => {
    const sha1 = import_crypto.default.createHash("sha1");
    sha1.update(text);
    return Promise.resolve(sha1.digest("hex"));
  },
  colors: import_utilsBundle.colors,
  coreDir,
  createGuid: () => import_crypto.default.randomBytes(16).toString("hex"),
  defaultMaxListeners: () => import_events.EventEmitter.defaultMaxListeners,
  fs: () => import_fs.default,
  env: process.env,
  inspectCustom: util.inspect.custom,
  isDebugMode: () => (0, import_debug.debugMode)() === "inspector",
  isJSDebuggerAttached: () => !!require("inspector").url(),
  isLogEnabled(name) {
    return import_debugLogger.debugLogger.isEnabled(name);
  },
  isUnderTest: () => (0, import_debug.isUnderTest)(),
  log(name, message) {
    import_debugLogger.debugLogger.log(name, message);
  },
  path: () => import_path.default,
  pathSeparator: import_path.default.sep,
  showInternalStackFrames: () => !!process.env.PWDEBUGIMPL,
  async streamFile(path2, stream) {
    await pipelineAsync(import_fs.default.createReadStream(path2), stream);
  },
  streamReadable: (channel) => {
    return new ReadableStreamImpl(channel);
  },
  streamWritable: (channel) => {
    return new WritableStreamImpl(channel);
  },
  zodToJsonSchema: (schema) => {
    if ("_zod" in schema)
      return import_mcpBundle.z.toJSONSchema(schema);
    return (0, import_mcpBundle.zodToJsonSchema)(schema);
  },
  zones: {
    current: () => new NodeZone((0, import_zones.currentZone)()),
    empty: new NodeZone(import_zones.emptyZone)
  }
};
class ReadableStreamImpl extends import_stream.Readable {
  constructor(channel) {
    super();
    this._channel = channel;
  }
  async _read() {
    const result = await this._channel.read({ size: 1024 * 1024 });
    if (result.binary.byteLength)
      this.push(result.binary);
    else
      this.push(null);
  }
  _destroy(error, callback) {
    this._channel.close().catch((e) => null);
    super._destroy(error, callback);
  }
}
class WritableStreamImpl extends import_stream.Writable {
  constructor(channel) {
    super();
    this._channel = channel;
  }
  async _write(chunk, encoding, callback) {
    const error = await this._channel.write({ binary: typeof chunk === "string" ? Buffer.from(chunk) : chunk }).catch((e) => e);
    callback(error || null);
  }
  async _final(callback) {
    const error = await this._channel.close().catch((e) => e);
    callback(error || null);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  nodePlatform,
  setBoxedStackPrefixes
});
