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
var method_descriptor_exports = {};
__export(method_descriptor_exports, {
  MethodDescriptor: () => MethodDescriptor,
  default: () => method_descriptor_default
});
module.exports = __toCommonJS(method_descriptor_exports);
class MethodDescriptor {
  allowResourceHostOverride;
  authAttr;
  binary;
  bodyAttr;
  headers;
  headersAttr;
  host;
  hostAttr;
  method;
  middleware;
  parameterEncoder;
  params;
  path;
  pathAttr;
  queryParamAlias;
  signalAttr;
  timeoutAttr;
  constructor(params) {
    this.allowResourceHostOverride = params.allowResourceHostOverride || false;
    this.binary = params.binary || false;
    this.headers = params.headers;
    this.host = params.host;
    this.method = params.method || "get";
    this.parameterEncoder = params.parameterEncoder || encodeURIComponent;
    this.params = params.params;
    this.path = params.path;
    this.queryParamAlias = params.queryParamAlias || {};
    this.authAttr = params.authAttr || "auth";
    this.bodyAttr = params.bodyAttr || "body";
    this.headersAttr = params.headersAttr || "headers";
    this.hostAttr = params.hostAttr || "host";
    this.pathAttr = params.pathAttr || "path";
    this.signalAttr = params.signalAttr || "signal";
    this.timeoutAttr = params.timeoutAttr || "timeout";
    const resourceMiddleware = params.middleware || params.middlewares || [];
    this.middleware = resourceMiddleware;
  }
}
var method_descriptor_default = MethodDescriptor;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MethodDescriptor
});
//# sourceMappingURL=method-descriptor.js.map