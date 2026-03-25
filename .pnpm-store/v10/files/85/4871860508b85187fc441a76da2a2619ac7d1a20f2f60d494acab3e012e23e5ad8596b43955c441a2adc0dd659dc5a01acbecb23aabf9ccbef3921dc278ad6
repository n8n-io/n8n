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
var extensionContextFactory_exports = {};
__export(extensionContextFactory_exports, {
  ExtensionContextFactory: () => ExtensionContextFactory
});
module.exports = __toCommonJS(extensionContextFactory_exports);
var playwright = __toESM(require("playwright-core"));
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_utils = require("playwright-core/lib/utils");
var import_cdpRelay = require("./cdpRelay");
const debugLogger = (0, import_utilsBundle.debug)("pw:mcp:relay");
class ExtensionContextFactory {
  constructor(browserChannel, userDataDir, executablePath) {
    this._browserChannel = browserChannel;
    this._userDataDir = userDataDir;
    this._executablePath = executablePath;
  }
  async createContext(clientInfo, abortSignal, options) {
    const browser = await this._obtainBrowser(clientInfo, abortSignal, options?.toolName);
    return {
      browserContext: browser.contexts()[0],
      close: async () => {
        debugLogger("close() called for browser context");
        await browser.close();
      }
    };
  }
  async _obtainBrowser(clientInfo, abortSignal, toolName) {
    const relay = await this._startRelay(abortSignal);
    await relay.ensureExtensionConnectionForMCPContext(clientInfo, abortSignal, toolName);
    return await playwright.chromium.connectOverCDP(relay.cdpEndpoint(), { isLocal: true });
  }
  async _startRelay(abortSignal) {
    const httpServer = (0, import_utils.createHttpServer)();
    await (0, import_utils.startHttpServer)(httpServer, {});
    if (abortSignal.aborted) {
      httpServer.close();
      throw new Error(abortSignal.reason);
    }
    const cdpRelayServer = new import_cdpRelay.CDPRelayServer(httpServer, this._browserChannel, this._userDataDir, this._executablePath);
    abortSignal.addEventListener("abort", () => cdpRelayServer.stop());
    debugLogger(`CDP relay server started, extension endpoint: ${cdpRelayServer.extensionEndpoint()}.`);
    return cdpRelayServer;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExtensionContextFactory
});
