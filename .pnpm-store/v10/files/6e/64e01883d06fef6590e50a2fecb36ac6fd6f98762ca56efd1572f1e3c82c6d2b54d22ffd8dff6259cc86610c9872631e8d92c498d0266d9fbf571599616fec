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
var proxy_exports = {};
__export(proxy_exports, {
  proxy: () => proxy
});
module.exports = __toCommonJS(proxy_exports);
var import_http_exception = require("../../http-exception");
const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
];
const ALLOWED_TOKEN_PATTERN = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;
const buildRequestInitFromRequest = (request, strictConnectionProcessing) => {
  if (!request) {
    return {};
  }
  const headers = new Headers(request.headers);
  if (strictConnectionProcessing) {
    const connectionValue = headers.get("connection");
    if (connectionValue) {
      const headerNames = connectionValue.split(",").map((h) => h.trim());
      const invalidHeaders = headerNames.filter((h) => !ALLOWED_TOKEN_PATTERN.test(h));
      if (invalidHeaders.length > 0) {
        throw new import_http_exception.HTTPException(400, {
          message: `Invalid Connection header value: ${invalidHeaders.join(", ")}`
        });
      }
      headerNames.forEach((headerName) => {
        headers.delete(headerName);
      });
    }
  }
  hopByHopHeaders.forEach((header) => {
    headers.delete(header);
  });
  return {
    method: request.method,
    body: request.body,
    duplex: request.body ? "half" : void 0,
    headers,
    signal: request.signal
  };
};
const preprocessRequestInit = (requestInit) => {
  if (!requestInit.headers || Array.isArray(requestInit.headers) || requestInit.headers instanceof Headers) {
    return requestInit;
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(requestInit.headers)) {
    if (value == null) {
      headers.delete(key);
    } else {
      headers.set(key, value);
    }
  }
  requestInit.headers = headers;
  return requestInit;
};
const proxy = async (input, proxyInit) => {
  const {
    raw,
    customFetch,
    strictConnectionProcessing = false,
    ...requestInit
  } = proxyInit instanceof Request ? { raw: proxyInit } : proxyInit ?? {};
  const req = new Request(input, {
    ...buildRequestInitFromRequest(raw, strictConnectionProcessing),
    ...preprocessRequestInit(requestInit)
  });
  req.headers.delete("accept-encoding");
  const res = await (customFetch || fetch)(req);
  const resHeaders = new Headers(res.headers);
  hopByHopHeaders.forEach((header) => {
    resHeaders.delete(header);
  });
  if (resHeaders.has("content-encoding")) {
    resHeaders.delete("content-encoding");
    resHeaders.delete("content-length");
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  proxy
});
