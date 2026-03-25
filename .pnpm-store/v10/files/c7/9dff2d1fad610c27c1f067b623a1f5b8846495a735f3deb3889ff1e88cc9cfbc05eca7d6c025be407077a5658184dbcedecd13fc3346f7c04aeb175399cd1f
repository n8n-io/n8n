"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var mcp_exports = {};
__export(mcp_exports, {
  createConnection: () => createConnection
});
module.exports = __toCommonJS(mcp_exports);
var import_browserServerBackend = require("./browser/browserServerBackend");
var import_config = require("./browser/config");
var import_browserContextFactory = require("./browser/browserContextFactory");
var mcpServer = __toESM(require("./sdk/server"));
const packageJSON = require("../../package.json");
async function createConnection(userConfig = {}, contextGetter) {
  const config = await (0, import_config.resolveConfig)(userConfig);
  const factory = contextGetter ? new SimpleBrowserContextFactory(contextGetter) : (0, import_browserContextFactory.contextFactory)(config);
  return mcpServer.createServer("Playwright", packageJSON.version, new import_browserServerBackend.BrowserServerBackend(config, factory), false);
}
class SimpleBrowserContextFactory {
  constructor(contextGetter) {
    this.name = "custom";
    this.description = "Connect to a browser using a custom context getter";
    this._contextGetter = contextGetter;
  }
  async createContext() {
    const browserContext = await this._contextGetter();
    return {
      browserContext,
      close: () => browserContext.close()
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createConnection
});
