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
var src_exports = {};
__export(src_exports, {
  Response: () => import_response.Response,
  configs: () => import_mappersmith.configs,
  default: () => import_mappersmith2.forge,
  forge: () => import_mappersmith2.forge,
  setContext: () => import_mappersmith2.setContext,
  version: () => import_mappersmith2.version
});
module.exports = __toCommonJS(src_exports);
var import_mappersmith = require("./mappersmith");
var import_xhr = require("./gateway/xhr");
var import_http = require("./gateway/http");
var import_fetch = require("./gateway/fetch");
var import_response = require("./response");
var import_mappersmith2 = require("./mappersmith");
let _process = null;
let defaultGateway = null;
try {
  _process = eval(
    'typeof __TEST_SERVICE_WORKER__ === "undefined" && typeof process === "object" ? process : undefined'
  );
} catch (e) {
}
if (typeof XMLHttpRequest !== "undefined") {
  defaultGateway = import_xhr.XHR;
} else if (typeof _process !== "undefined") {
  defaultGateway = import_http.HTTP;
} else if (typeof self !== "undefined") {
  defaultGateway = import_fetch.Fetch;
}
import_mappersmith.configs.gateway = defaultGateway;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Response,
  configs,
  forge,
  setContext,
  version
});
//# sourceMappingURL=index.js.map