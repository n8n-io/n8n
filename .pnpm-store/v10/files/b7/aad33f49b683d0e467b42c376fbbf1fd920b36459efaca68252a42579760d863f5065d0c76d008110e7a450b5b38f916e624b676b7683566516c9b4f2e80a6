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

// src/conninfo.ts
var conninfo_exports = {};
__export(conninfo_exports, {
  getConnInfo: () => getConnInfo
});
module.exports = __toCommonJS(conninfo_exports);
var getConnInfo = (c) => {
  const bindings = c.env.server ? c.env.server : c.env;
  const address = bindings.incoming.socket.remoteAddress;
  const port = bindings.incoming.socket.remotePort;
  const family = bindings.incoming.socket.remoteFamily;
  return {
    remote: {
      address,
      port,
      addressType: family === "IPv4" ? "IPv4" : family === "IPv6" ? "IPv6" : void 0
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getConnInfo
});
