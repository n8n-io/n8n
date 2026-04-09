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
var multipart_exports = {};
__export(multipart_exports, {
  buildBodyPart: () => buildBodyPart,
  buildMultipartBody: () => buildMultipartBody
});
module.exports = __toCommonJS(multipart_exports);
var import_restError = require("../restError.js");
var import_httpHeaders = require("../httpHeaders.js");
var import_bytesEncoding = require("../util/bytesEncoding.js");
var import_typeGuards = require("../util/typeGuards.js");
function getHeaderValue(descriptor, headerName) {
  if (descriptor.headers) {
    const actualHeaderName = Object.keys(descriptor.headers).find(
      (x) => x.toLowerCase() === headerName.toLowerCase()
    );
    if (actualHeaderName) {
      return descriptor.headers[actualHeaderName];
    }
  }
  return void 0;
}
function getPartContentType(descriptor) {
  const contentTypeHeader = getHeaderValue(descriptor, "content-type");
  if (contentTypeHeader) {
    return contentTypeHeader;
  }
  if (descriptor.contentType === null) {
    return void 0;
  }
  if (descriptor.contentType) {
    return descriptor.contentType;
  }
  const { body } = descriptor;
  if (body === null || body === void 0) {
    return void 0;
  }
  if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
    return "text/plain; charset=UTF-8";
  }
  if (body instanceof Blob) {
    return body.type || "application/octet-stream";
  }
  if ((0, import_typeGuards.isBinaryBody)(body)) {
    return "application/octet-stream";
  }
  return "application/json";
}
function escapeDispositionField(value) {
  return JSON.stringify(value);
}
function getContentDisposition(descriptor) {
  const contentDispositionHeader = getHeaderValue(descriptor, "content-disposition");
  if (contentDispositionHeader) {
    return contentDispositionHeader;
  }
  if (descriptor.dispositionType === void 0 && descriptor.name === void 0 && descriptor.filename === void 0) {
    return void 0;
  }
  const dispositionType = descriptor.dispositionType ?? "form-data";
  let disposition = dispositionType;
  if (descriptor.name) {
    disposition += `; name=${escapeDispositionField(descriptor.name)}`;
  }
  let filename = void 0;
  if (descriptor.filename) {
    filename = descriptor.filename;
  } else if (typeof File !== "undefined" && descriptor.body instanceof File) {
    const filenameFromFile = descriptor.body.name;
    if (filenameFromFile !== "") {
      filename = filenameFromFile;
    }
  }
  if (filename) {
    disposition += `; filename=${escapeDispositionField(filename)}`;
  }
  return disposition;
}
function normalizeBody(body, contentType) {
  if (body === void 0) {
    return new Uint8Array([]);
  }
  if ((0, import_typeGuards.isBinaryBody)(body)) {
    return body;
  }
  if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
    return (0, import_bytesEncoding.stringToUint8Array)(String(body), "utf-8");
  }
  if (contentType && /application\/(.+\+)?json(;.+)?/i.test(String(contentType))) {
    return (0, import_bytesEncoding.stringToUint8Array)(JSON.stringify(body), "utf-8");
  }
  throw new import_restError.RestError(`Unsupported body/content-type combination: ${body}, ${contentType}`);
}
function buildBodyPart(descriptor) {
  const contentType = getPartContentType(descriptor);
  const contentDisposition = getContentDisposition(descriptor);
  const headers = (0, import_httpHeaders.createHttpHeaders)(descriptor.headers ?? {});
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }
  const body = normalizeBody(descriptor.body, contentType);
  return {
    headers,
    body
  };
}
function buildMultipartBody(parts) {
  return { parts: parts.map(buildBodyPart) };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildBodyPart,
  buildMultipartBody
});
