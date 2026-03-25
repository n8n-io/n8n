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
var request_factory_exports = {};
__export(request_factory_exports, {
  requestFactory: () => requestFactory
});
module.exports = __toCommonJS(request_factory_exports);
var import_request = require("../request");
var import_method_descriptor = require("../method-descriptor");
const requestFactory = ({
  method = "GET",
  host = "http://example.org",
  path = "/path",
  auth,
  body,
  headers,
  params,
  timeout,
  context,
  ...rest
} = {}) => {
  const methodDescriptor = new import_method_descriptor.MethodDescriptor({ method, host, path });
  return new import_request.Request(
    methodDescriptor,
    {
      auth,
      body,
      headers,
      params,
      timeout,
      ...rest
    },
    context
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requestFactory
});
//# sourceMappingURL=request-factory.js.map