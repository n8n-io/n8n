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
var response_factory_exports = {};
__export(response_factory_exports, {
  responseFactory: () => responseFactory
});
module.exports = __toCommonJS(response_factory_exports);
var import_response = require("../response");
var import_request_factory = require("./request-factory");
const responseFactory = ({
  method = "GET",
  host = "http://example.org",
  path = "/path",
  request = (0, import_request_factory.requestFactory)({ method, host, path }),
  status = 200,
  data = {},
  headers = {},
  errors = []
} = {}) => {
  let responseData;
  let contentType;
  if (typeof data === "string") {
    contentType = "text/plain";
    responseData = data;
  } else {
    contentType = "application/json";
    responseData = JSON.stringify(data);
  }
  return new import_response.Response(
    request,
    status,
    responseData,
    { "content-type": contentType, ...headers },
    errors
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  responseFactory
});
//# sourceMappingURL=response-factory.js.map