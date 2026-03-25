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
var cloudflare_workers_exports = {};
__export(cloudflare_workers_exports, {
  getConnInfo: () => import_conninfo.getConnInfo,
  serveStatic: () => import_serve_static_module.serveStatic,
  upgradeWebSocket: () => import_websocket.upgradeWebSocket
});
module.exports = __toCommonJS(cloudflare_workers_exports);
var import_serve_static_module = require("./serve-static-module");
var import_websocket = require("./websocket");
var import_conninfo = require("./conninfo");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getConnInfo,
  serveStatic,
  upgradeWebSocket
});
