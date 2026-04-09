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
var sendRequest_exports = {};
__export(sendRequest_exports, {
  getRequestBody: () => getRequestBody,
  sendRequest: () => sendRequest
});
module.exports = __toCommonJS(sendRequest_exports);
var import_restError = require("../restError.js");
var import_httpHeaders = require("../httpHeaders.js");
var import_pipelineRequest = require("../pipelineRequest.js");
var import_clientHelpers = require("./clientHelpers.js");
var import_typeGuards = require("../util/typeGuards.js");
var import_multipart = require("./multipart.js");
async function sendRequest(method, url, pipeline, options = {}, customHttpClient) {
  const httpClient = customHttpClient ?? (0, import_clientHelpers.getCachedDefaultHttpsClient)();
  const request = buildPipelineRequest(method, url, options);
  try {
    const response = await pipeline.sendRequest(httpClient, request);
    const headers = response.headers.toJSON();
    const stream = response.readableStreamBody ?? response.browserStreamBody;
    const parsedBody = options.responseAsStream || stream !== void 0 ? void 0 : getResponseBody(response);
    const body = stream ?? parsedBody;
    if (options?.onResponse) {
      options.onResponse({ ...response, request, rawHeaders: headers, parsedBody });
    }
    return {
      request,
      headers,
      status: `${response.status}`,
      body
    };
  } catch (e) {
    if ((0, import_restError.isRestError)(e) && e.response && options.onResponse) {
      const { response } = e;
      const rawHeaders = response.headers.toJSON();
      options?.onResponse({ ...response, request, rawHeaders }, e);
    }
    throw e;
  }
}
function getRequestContentType(options = {}) {
  return options.contentType ?? options.headers?.["content-type"] ?? getContentType(options.body);
}
function getContentType(body) {
  if (body === void 0) {
    return void 0;
  }
  if (ArrayBuffer.isView(body)) {
    return "application/octet-stream";
  }
  if ((0, import_typeGuards.isBlob)(body) && body.type) {
    return body.type;
  }
  if (typeof body === "string") {
    try {
      JSON.parse(body);
      return "application/json";
    } catch (error) {
      return void 0;
    }
  }
  return "application/json";
}
function buildPipelineRequest(method, url, options = {}) {
  const requestContentType = getRequestContentType(options);
  const { body, multipartBody } = getRequestBody(options.body, requestContentType);
  const headers = (0, import_httpHeaders.createHttpHeaders)({
    ...options.headers ? options.headers : {},
    accept: options.accept ?? options.headers?.accept ?? "application/json",
    ...requestContentType && {
      "content-type": requestContentType
    }
  });
  return (0, import_pipelineRequest.createPipelineRequest)({
    url,
    method,
    body,
    multipartBody,
    headers,
    allowInsecureConnection: options.allowInsecureConnection,
    abortSignal: options.abortSignal,
    onUploadProgress: options.onUploadProgress,
    onDownloadProgress: options.onDownloadProgress,
    timeout: options.timeout,
    enableBrowserStreams: true,
    streamResponseStatusCodes: options.responseAsStream ? /* @__PURE__ */ new Set([Number.POSITIVE_INFINITY]) : void 0
  });
}
function getRequestBody(body, contentType = "") {
  if (body === void 0) {
    return { body: void 0 };
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return { body };
  }
  if ((0, import_typeGuards.isBlob)(body)) {
    return { body };
  }
  if ((0, import_typeGuards.isReadableStream)(body) || typeof body === "function") {
    return { body };
  }
  if (ArrayBuffer.isView(body)) {
    return { body: body instanceof Uint8Array ? body : JSON.stringify(body) };
  }
  const firstType = contentType.split(";")[0];
  switch (firstType) {
    case "application/json":
      return { body: JSON.stringify(body) };
    case "multipart/form-data":
      if (Array.isArray(body)) {
        return { multipartBody: (0, import_multipart.buildMultipartBody)(body) };
      }
      return { body: JSON.stringify(body) };
    case "text/plain":
      return { body: String(body) };
    default:
      if (typeof body === "string") {
        return { body };
      }
      return { body: JSON.stringify(body) };
  }
}
function getResponseBody(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const firstType = contentType.split(";")[0];
  const bodyToParse = response.bodyAsText ?? "";
  if (firstType === "text/plain") {
    return String(bodyToParse);
  }
  try {
    return bodyToParse ? JSON.parse(bodyToParse) : void 0;
  } catch (error) {
    if (firstType === "application/json") {
      throw createParseError(response, error);
    }
    return String(bodyToParse);
  }
}
function createParseError(response, err) {
  const msg = `Error "${err}" occurred while parsing the response body - ${response.bodyAsText}.`;
  const errCode = err.code ?? import_restError.RestError.PARSE_ERROR;
  return new import_restError.RestError(msg, {
    code: errCode,
    statusCode: response.status,
    request: response.request,
    response
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRequestBody,
  sendRequest
});
