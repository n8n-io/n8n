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
var connection_exports = {};
__export(connection_exports, {
  Connection: () => Connection
});
module.exports = __toCommonJS(connection_exports);
var import_eventEmitter = require("./eventEmitter");
var import_android = require("./android");
var import_artifact = require("./artifact");
var import_browser = require("./browser");
var import_browserContext = require("./browserContext");
var import_browserType = require("./browserType");
var import_cdpSession = require("./cdpSession");
var import_channelOwner = require("./channelOwner");
var import_clientInstrumentation = require("./clientInstrumentation");
var import_dialog = require("./dialog");
var import_electron = require("./electron");
var import_elementHandle = require("./elementHandle");
var import_errors = require("./errors");
var import_fetch = require("./fetch");
var import_frame = require("./frame");
var import_jsHandle = require("./jsHandle");
var import_jsonPipe = require("./jsonPipe");
var import_localUtils = require("./localUtils");
var import_network = require("./network");
var import_page = require("./page");
var import_playwright = require("./playwright");
var import_stream = require("./stream");
var import_tracing = require("./tracing");
var import_worker = require("./worker");
var import_writableStream = require("./writableStream");
var import_validator = require("../protocol/validator");
var import_stackTrace = require("../utils/isomorphic/stackTrace");
var import_pageAgent = require("./pageAgent");
class Root extends import_channelOwner.ChannelOwner {
  constructor(connection) {
    super(connection, "Root", "", {});
  }
  async initialize() {
    return import_playwright.Playwright.from((await this._channel.initialize({
      sdkLanguage: "javascript"
    })).playwright);
  }
}
class DummyChannelOwner extends import_channelOwner.ChannelOwner {
}
class Connection extends import_eventEmitter.EventEmitter {
  constructor(platform, localUtils, instrumentation, headers = []) {
    super(platform);
    this._objects = /* @__PURE__ */ new Map();
    this.onmessage = (message) => {
    };
    this._lastId = 0;
    this._callbacks = /* @__PURE__ */ new Map();
    this._isRemote = false;
    this._rawBuffers = false;
    this._tracingCount = 0;
    this._instrumentation = instrumentation || (0, import_clientInstrumentation.createInstrumentation)();
    this._localUtils = localUtils;
    this._rootObject = new Root(this);
    this.headers = headers;
  }
  markAsRemote() {
    this._isRemote = true;
  }
  isRemote() {
    return this._isRemote;
  }
  useRawBuffers() {
    this._rawBuffers = true;
  }
  rawBuffers() {
    return this._rawBuffers;
  }
  localUtils() {
    return this._localUtils;
  }
  async initializePlaywright() {
    return await this._rootObject.initialize();
  }
  getObjectWithKnownName(guid) {
    return this._objects.get(guid);
  }
  setIsTracing(isTracing) {
    if (isTracing)
      this._tracingCount++;
    else
      this._tracingCount--;
  }
  async sendMessageToServer(object, method, params, options) {
    if (this._closedError)
      throw this._closedError;
    if (object._wasCollected)
      throw new Error("The object has been collected to prevent unbounded heap growth.");
    const guid = object._guid;
    const type = object._type;
    const id = ++this._lastId;
    const message = { id, guid, method, params };
    if (this._platform.isLogEnabled("channel")) {
      this._platform.log("channel", "SEND> " + JSON.stringify(message));
    }
    const location = options.frames?.[0] ? { file: options.frames[0].file, line: options.frames[0].line, column: options.frames[0].column } : void 0;
    const metadata = { title: options.title, location, internal: options.internal, stepId: options.stepId };
    if (this._tracingCount && options.frames && type !== "LocalUtils")
      this._localUtils?.addStackToTracingNoReply({ callData: { stack: options.frames ?? [], id } }).catch(() => {
      });
    this._platform.zones.empty.run(() => this.onmessage({ ...message, metadata }));
    return await new Promise((resolve, reject) => this._callbacks.set(id, { resolve, reject, title: options.title, type, method }));
  }
  _validatorFromWireContext() {
    return {
      tChannelImpl: this._tChannelImplFromWire.bind(this),
      binary: this._rawBuffers ? "buffer" : "fromBase64",
      isUnderTest: () => this._platform.isUnderTest()
    };
  }
  dispatch(message) {
    if (this._closedError)
      return;
    const { id, guid, method, params, result, error, log } = message;
    if (id) {
      if (this._platform.isLogEnabled("channel"))
        this._platform.log("channel", "<RECV " + JSON.stringify(message));
      const callback = this._callbacks.get(id);
      if (!callback)
        throw new Error(`Cannot find command to respond: ${id}`);
      this._callbacks.delete(id);
      if (error && !result) {
        const parsedError = (0, import_errors.parseError)(error);
        (0, import_stackTrace.rewriteErrorMessage)(parsedError, parsedError.message + formatCallLog(this._platform, log));
        callback.reject(parsedError);
      } else {
        const validator2 = (0, import_validator.findValidator)(callback.type, callback.method, "Result");
        callback.resolve(validator2(result, "", this._validatorFromWireContext()));
      }
      return;
    }
    if (this._platform.isLogEnabled("channel"))
      this._platform.log("channel", "<EVENT " + JSON.stringify(message));
    if (method === "__create__") {
      this._createRemoteObject(guid, params.type, params.guid, params.initializer);
      return;
    }
    const object = this._objects.get(guid);
    if (!object)
      throw new Error(`Cannot find object to "${method}": ${guid}`);
    if (method === "__adopt__") {
      const child = this._objects.get(params.guid);
      if (!child)
        throw new Error(`Unknown new child: ${params.guid}`);
      object._adopt(child);
      return;
    }
    if (method === "__dispose__") {
      object._dispose(params.reason);
      return;
    }
    const validator = (0, import_validator.findValidator)(object._type, method, "Event");
    object._channel.emit(method, validator(params, "", this._validatorFromWireContext()));
  }
  close(cause) {
    if (this._closedError)
      return;
    this._closedError = new import_errors.TargetClosedError(cause);
    for (const callback of this._callbacks.values())
      callback.reject(this._closedError);
    this._callbacks.clear();
    this.emit("close");
  }
  _tChannelImplFromWire(names, arg, path, context) {
    if (arg && typeof arg === "object" && typeof arg.guid === "string") {
      const object = this._objects.get(arg.guid);
      if (!object)
        throw new Error(`Object with guid ${arg.guid} was not bound in the connection`);
      if (names !== "*" && !names.includes(object._type))
        throw new import_validator.ValidationError(`${path}: expected channel ${names.toString()}`);
      return object._channel;
    }
    throw new import_validator.ValidationError(`${path}: expected channel ${names.toString()}`);
  }
  _createRemoteObject(parentGuid, type, guid, initializer) {
    const parent = this._objects.get(parentGuid);
    if (!parent)
      throw new Error(`Cannot find parent object ${parentGuid} to create ${guid}`);
    let result;
    const validator = (0, import_validator.findValidator)(type, "", "Initializer");
    initializer = validator(initializer, "", this._validatorFromWireContext());
    switch (type) {
      case "Android":
        result = new import_android.Android(parent, type, guid, initializer);
        break;
      case "AndroidSocket":
        result = new import_android.AndroidSocket(parent, type, guid, initializer);
        break;
      case "AndroidDevice":
        result = new import_android.AndroidDevice(parent, type, guid, initializer);
        break;
      case "APIRequestContext":
        result = new import_fetch.APIRequestContext(parent, type, guid, initializer);
        break;
      case "Artifact":
        result = new import_artifact.Artifact(parent, type, guid, initializer);
        break;
      case "BindingCall":
        result = new import_page.BindingCall(parent, type, guid, initializer);
        break;
      case "Browser":
        result = new import_browser.Browser(parent, type, guid, initializer);
        break;
      case "BrowserContext":
        result = new import_browserContext.BrowserContext(parent, type, guid, initializer);
        break;
      case "BrowserType":
        result = new import_browserType.BrowserType(parent, type, guid, initializer);
        break;
      case "CDPSession":
        result = new import_cdpSession.CDPSession(parent, type, guid, initializer);
        break;
      case "Dialog":
        result = new import_dialog.Dialog(parent, type, guid, initializer);
        break;
      case "Electron":
        result = new import_electron.Electron(parent, type, guid, initializer);
        break;
      case "ElectronApplication":
        result = new import_electron.ElectronApplication(parent, type, guid, initializer);
        break;
      case "ElementHandle":
        result = new import_elementHandle.ElementHandle(parent, type, guid, initializer);
        break;
      case "Frame":
        result = new import_frame.Frame(parent, type, guid, initializer);
        break;
      case "JSHandle":
        result = new import_jsHandle.JSHandle(parent, type, guid, initializer);
        break;
      case "JsonPipe":
        result = new import_jsonPipe.JsonPipe(parent, type, guid, initializer);
        break;
      case "LocalUtils":
        result = new import_localUtils.LocalUtils(parent, type, guid, initializer);
        if (!this._localUtils)
          this._localUtils = result;
        break;
      case "Page":
        result = new import_page.Page(parent, type, guid, initializer);
        break;
      case "PageAgent":
        result = new import_pageAgent.PageAgent(parent, type, guid, initializer);
        break;
      case "Playwright":
        result = new import_playwright.Playwright(parent, type, guid, initializer);
        break;
      case "Request":
        result = new import_network.Request(parent, type, guid, initializer);
        break;
      case "Response":
        result = new import_network.Response(parent, type, guid, initializer);
        break;
      case "Route":
        result = new import_network.Route(parent, type, guid, initializer);
        break;
      case "Stream":
        result = new import_stream.Stream(parent, type, guid, initializer);
        break;
      case "SocksSupport":
        result = new DummyChannelOwner(parent, type, guid, initializer);
        break;
      case "Tracing":
        result = new import_tracing.Tracing(parent, type, guid, initializer);
        break;
      case "WebSocket":
        result = new import_network.WebSocket(parent, type, guid, initializer);
        break;
      case "WebSocketRoute":
        result = new import_network.WebSocketRoute(parent, type, guid, initializer);
        break;
      case "Worker":
        result = new import_worker.Worker(parent, type, guid, initializer);
        break;
      case "WritableStream":
        result = new import_writableStream.WritableStream(parent, type, guid, initializer);
        break;
      default:
        throw new Error("Missing type " + type);
    }
    return result;
  }
}
function formatCallLog(platform, log) {
  if (!log || !log.some((l) => !!l))
    return "";
  return `
Call log:
${platform.colors.dim(log.join("\n"))}
`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Connection
});
