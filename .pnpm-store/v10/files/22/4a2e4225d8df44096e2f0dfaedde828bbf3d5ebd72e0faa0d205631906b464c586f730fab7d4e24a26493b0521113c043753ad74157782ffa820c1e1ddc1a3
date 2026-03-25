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
var basic_auth_exports = {};
__export(basic_auth_exports, {
  BasicAuthMiddleware: () => BasicAuthMiddleware,
  default: () => basic_auth_default
});
module.exports = __toCommonJS(basic_auth_exports);
var import_utils = require("../utils/index");
const BasicAuthMiddleware = (authConfig) => function BasicAuthMiddleware2() {
  return {
    async prepareRequest(next) {
      const request = await next();
      const auth = request.auth();
      return !auth ? request.enhance({ auth: (0, import_utils.assign)({}, authConfig) }) : request;
    }
  };
};
var basic_auth_default = BasicAuthMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BasicAuthMiddleware
});
//# sourceMappingURL=basic-auth.js.map