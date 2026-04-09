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
var pipelineRequest_exports = {};
__export(pipelineRequest_exports, {
  createPipelineRequest: () => createPipelineRequest
});
module.exports = __toCommonJS(pipelineRequest_exports);
var import_httpHeaders = require("./httpHeaders.js");
var import_uuidUtils = require("./util/uuidUtils.js");
class PipelineRequestImpl {
  url;
  method;
  headers;
  timeout;
  withCredentials;
  body;
  multipartBody;
  formData;
  streamResponseStatusCodes;
  enableBrowserStreams;
  proxySettings;
  disableKeepAlive;
  abortSignal;
  requestId;
  allowInsecureConnection;
  onUploadProgress;
  onDownloadProgress;
  requestOverrides;
  authSchemes;
  constructor(options) {
    this.url = options.url;
    this.body = options.body;
    this.headers = options.headers ?? (0, import_httpHeaders.createHttpHeaders)();
    this.method = options.method ?? "GET";
    this.timeout = options.timeout ?? 0;
    this.multipartBody = options.multipartBody;
    this.formData = options.formData;
    this.disableKeepAlive = options.disableKeepAlive ?? false;
    this.proxySettings = options.proxySettings;
    this.streamResponseStatusCodes = options.streamResponseStatusCodes;
    this.withCredentials = options.withCredentials ?? false;
    this.abortSignal = options.abortSignal;
    this.onUploadProgress = options.onUploadProgress;
    this.onDownloadProgress = options.onDownloadProgress;
    this.requestId = options.requestId || (0, import_uuidUtils.randomUUID)();
    this.allowInsecureConnection = options.allowInsecureConnection ?? false;
    this.enableBrowserStreams = options.enableBrowserStreams ?? false;
    this.requestOverrides = options.requestOverrides;
    this.authSchemes = options.authSchemes;
  }
}
function createPipelineRequest(options) {
  return new PipelineRequestImpl(options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPipelineRequest
});
