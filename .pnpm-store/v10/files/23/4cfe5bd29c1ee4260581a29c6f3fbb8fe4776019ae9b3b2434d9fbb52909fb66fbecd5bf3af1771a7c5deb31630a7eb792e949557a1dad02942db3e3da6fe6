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
var restError_exports = {};
__export(restError_exports, {
  createRestError: () => createRestError
});
module.exports = __toCommonJS(restError_exports);
var import_restError = require("../restError.js");
var import_httpHeaders = require("../httpHeaders.js");
function createRestError(messageOrResponse, response) {
  const resp = typeof messageOrResponse === "string" ? response : messageOrResponse;
  const internalError = resp.body?.error ?? resp.body;
  const message = typeof messageOrResponse === "string" ? messageOrResponse : internalError?.message ?? `Unexpected status code: ${resp.status}`;
  return new import_restError.RestError(message, {
    statusCode: statusCodeToNumber(resp.status),
    code: internalError?.code,
    request: resp.request,
    response: toPipelineResponse(resp)
  });
}
function toPipelineResponse(response) {
  return {
    headers: (0, import_httpHeaders.createHttpHeaders)(response.headers),
    request: response.request,
    status: statusCodeToNumber(response.status) ?? -1
  };
}
function statusCodeToNumber(statusCode) {
  const status = Number.parseInt(statusCode);
  return Number.isNaN(status) ? void 0 : status;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRestError
});
