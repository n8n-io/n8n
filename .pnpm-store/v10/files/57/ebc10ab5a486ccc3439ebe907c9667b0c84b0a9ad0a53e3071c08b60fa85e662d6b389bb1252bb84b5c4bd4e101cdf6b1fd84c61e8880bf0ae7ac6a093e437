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
var multipartPolicy_exports = {};
__export(multipartPolicy_exports, {
  multipartPolicy: () => multipartPolicy,
  multipartPolicyName: () => multipartPolicyName
});
module.exports = __toCommonJS(multipartPolicy_exports);
var import_bytesEncoding = require("../util/bytesEncoding.js");
var import_typeGuards = require("../util/typeGuards.js");
var import_uuidUtils = require("../util/uuidUtils.js");
var import_concat = require("../util/concat.js");
function generateBoundary() {
  return `----AzSDKFormBoundary${(0, import_uuidUtils.randomUUID)()}`;
}
function encodeHeaders(headers) {
  let result = "";
  for (const [key, value] of headers) {
    result += `${key}: ${value}\r
`;
  }
  return result;
}
function getLength(source) {
  if (source instanceof Uint8Array) {
    return source.byteLength;
  } else if ((0, import_typeGuards.isBlob)(source)) {
    return source.size === -1 ? void 0 : source.size;
  } else {
    return void 0;
  }
}
function getTotalLength(sources) {
  let total = 0;
  for (const source of sources) {
    const partLength = getLength(source);
    if (partLength === void 0) {
      return void 0;
    } else {
      total += partLength;
    }
  }
  return total;
}
async function buildRequestBody(request, parts, boundary) {
  const sources = [
    (0, import_bytesEncoding.stringToUint8Array)(`--${boundary}`, "utf-8"),
    ...parts.flatMap((part) => [
      (0, import_bytesEncoding.stringToUint8Array)("\r\n", "utf-8"),
      (0, import_bytesEncoding.stringToUint8Array)(encodeHeaders(part.headers), "utf-8"),
      (0, import_bytesEncoding.stringToUint8Array)("\r\n", "utf-8"),
      part.body,
      (0, import_bytesEncoding.stringToUint8Array)(`\r
--${boundary}`, "utf-8")
    ]),
    (0, import_bytesEncoding.stringToUint8Array)("--\r\n\r\n", "utf-8")
  ];
  const contentLength = getTotalLength(sources);
  if (contentLength) {
    request.headers.set("Content-Length", contentLength);
  }
  request.body = await (0, import_concat.concat)(sources);
}
const multipartPolicyName = "multipartPolicy";
const maxBoundaryLength = 70;
const validBoundaryCharacters = new Set(
  `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'()+,-./:=?`
);
function assertValidBoundary(boundary) {
  if (boundary.length > maxBoundaryLength) {
    throw new Error(`Multipart boundary "${boundary}" exceeds maximum length of 70 characters`);
  }
  if (Array.from(boundary).some((x) => !validBoundaryCharacters.has(x))) {
    throw new Error(`Multipart boundary "${boundary}" contains invalid characters`);
  }
}
function multipartPolicy() {
  return {
    name: multipartPolicyName,
    async sendRequest(request, next) {
      if (!request.multipartBody) {
        return next(request);
      }
      if (request.body) {
        throw new Error("multipartBody and regular body cannot be set at the same time");
      }
      let boundary = request.multipartBody.boundary;
      const contentTypeHeader = request.headers.get("Content-Type") ?? "multipart/mixed";
      const parsedHeader = contentTypeHeader.match(/^(multipart\/[^ ;]+)(?:; *boundary=(.+))?$/);
      if (!parsedHeader) {
        throw new Error(
          `Got multipart request body, but content-type header was not multipart: ${contentTypeHeader}`
        );
      }
      const [, contentType, parsedBoundary] = parsedHeader;
      if (parsedBoundary && boundary && parsedBoundary !== boundary) {
        throw new Error(
          `Multipart boundary was specified as ${parsedBoundary} in the header, but got ${boundary} in the request body`
        );
      }
      boundary ??= parsedBoundary;
      if (boundary) {
        assertValidBoundary(boundary);
      } else {
        boundary = generateBoundary();
      }
      request.headers.set("Content-Type", `${contentType}; boundary=${boundary}`);
      await buildRequestBody(request, request.multipartBody.parts, boundary);
      request.multipartBody = void 0;
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  multipartPolicy,
  multipartPolicyName
});
