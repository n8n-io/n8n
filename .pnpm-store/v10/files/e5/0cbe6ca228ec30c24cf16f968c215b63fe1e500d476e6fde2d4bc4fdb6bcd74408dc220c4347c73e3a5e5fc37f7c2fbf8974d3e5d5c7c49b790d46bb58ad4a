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
var handler_exports = {};
__export(handler_exports, {
  createBody: () => createBody,
  handle: () => handle,
  isContentTypeBinary: () => isContentTypeBinary
});
module.exports = __toCommonJS(handler_exports);
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_encode = require("../../utils/encode");
globalThis.crypto ??= import_node_crypto.default;
const convertHeaders = (headers) => {
  const cfHeaders = {};
  headers.forEach((value, key) => {
    cfHeaders[key.toLowerCase()] = [
      ...cfHeaders[key.toLowerCase()] || [],
      { key: key.toLowerCase(), value }
    ];
  });
  return cfHeaders;
};
const handle = (app) => {
  return async (event, ...args) => {
    const [context, callback] = args;
    const res = await app.fetch(createRequest(event), {
      event,
      context,
      callback: (err, result) => {
        callback?.(err, result);
      },
      config: event.Records[0].cf.config,
      request: event.Records[0].cf.request,
      response: event.Records[0].cf.response
    });
    return createResult(res);
  };
};
const createResult = async (res) => {
  const isBase64Encoded = isContentTypeBinary(res.headers.get("content-type") || "");
  const body = isBase64Encoded ? (0, import_encode.encodeBase64)(await res.arrayBuffer()) : await res.text();
  return {
    status: res.status.toString(),
    headers: convertHeaders(res.headers),
    body,
    ...isBase64Encoded && { bodyEncoding: "base64" }
  };
};
const createRequest = (event) => {
  const queryString = event.Records[0].cf.request.querystring;
  const host = event.Records[0].cf.request.headers?.host?.[0]?.value || event.Records[0].cf.config.distributionDomainName;
  const urlPath = `https://${host}${event.Records[0].cf.request.uri}`;
  const url = queryString ? `${urlPath}?${queryString}` : urlPath;
  const headers = new Headers();
  Object.entries(event.Records[0].cf.request.headers).forEach(([k, v]) => {
    v.forEach((header) => headers.set(k, header.value));
  });
  const requestBody = event.Records[0].cf.request.body;
  const method = event.Records[0].cf.request.method;
  const body = createBody(method, requestBody);
  return new Request(url, {
    headers,
    method,
    body
  });
};
const createBody = (method, requestBody) => {
  if (!requestBody || !requestBody.data) {
    return void 0;
  }
  if (method === "GET" || method === "HEAD") {
    return void 0;
  }
  if (requestBody.encoding === "base64") {
    return (0, import_encode.decodeBase64)(requestBody.data);
  }
  return requestBody.data;
};
const isContentTypeBinary = (contentType) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml.*)$/.test(
    contentType
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBody,
  handle,
  isContentTypeBinary
});
