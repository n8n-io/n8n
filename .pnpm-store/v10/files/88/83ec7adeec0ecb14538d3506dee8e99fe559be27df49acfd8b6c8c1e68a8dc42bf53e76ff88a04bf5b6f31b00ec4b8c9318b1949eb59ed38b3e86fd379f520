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
var encode_json_exports = {};
__export(encode_json_exports, {
  CONTENT_TYPE_JSON: () => CONTENT_TYPE_JSON,
  EncodeJsonMiddleware: () => EncodeJsonMiddleware,
  default: () => encode_json_default
});
module.exports = __toCommonJS(encode_json_exports);
var import_response = require("../response");
const CONTENT_TYPE_JSON = "application/json;charset=utf-8";
const isJson = (contentType) => import_response.REGEXP_CONTENT_TYPE_JSON.test(contentType);
const alreadyEncoded = (body) => typeof body === "string";
const EncodeJsonMiddleware = () => ({
  async prepareRequest(next) {
    const request = await next();
    try {
      const body = request.body();
      const contentType = request.header("content-type");
      if (body) {
        const shouldEncodeBody = contentType == null || typeof contentType === "string" && isJson(contentType) && !alreadyEncoded(body);
        const encodedBody = shouldEncodeBody ? JSON.stringify(body) : body;
        return request.enhance({
          headers: { "content-type": contentType == null ? CONTENT_TYPE_JSON : contentType },
          body: encodedBody
        });
      }
    } catch (e) {
    }
    return request;
  }
});
var encode_json_default = EncodeJsonMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CONTENT_TYPE_JSON,
  EncodeJsonMiddleware
});
//# sourceMappingURL=encode-json.js.map