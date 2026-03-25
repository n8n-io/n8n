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
var androidServerImpl_exports = {};
__export(androidServerImpl_exports, {
  AndroidServerLauncherImpl: () => AndroidServerLauncherImpl
});
module.exports = __toCommonJS(androidServerImpl_exports);
var import_playwrightServer = require("./remote/playwrightServer");
var import_playwright = require("./server/playwright");
var import_crypto = require("./server/utils/crypto");
var import_utilsBundle = require("./utilsBundle");
var import_progress = require("./server/progress");
class AndroidServerLauncherImpl {
  async launchServer(options = {}) {
    const playwright = (0, import_playwright.createPlaywright)({ sdkLanguage: "javascript", isServer: true });
    const controller = new import_progress.ProgressController();
    let devices = await controller.run((progress) => playwright.android.devices(progress, {
      host: options.adbHost,
      port: options.adbPort,
      omitDriverInstall: options.omitDriverInstall
    }));
    if (devices.length === 0)
      throw new Error("No devices found");
    if (options.deviceSerialNumber) {
      devices = devices.filter((d) => d.serial === options.deviceSerialNumber);
      if (devices.length === 0)
        throw new Error(`No device with serial number '${options.deviceSerialNumber}' was found`);
    }
    if (devices.length > 1)
      throw new Error(`More than one device found. Please specify deviceSerialNumber`);
    const device = devices[0];
    const path = options.wsPath ? options.wsPath.startsWith("/") ? options.wsPath : `/${options.wsPath}` : `/${(0, import_crypto.createGuid)()}`;
    const server = new import_playwrightServer.PlaywrightServer({ mode: "launchServer", path, maxConnections: 1, preLaunchedAndroidDevice: device });
    const wsEndpoint = await server.listen(options.port, options.host);
    const browserServer = new import_utilsBundle.ws.EventEmitter();
    browserServer.wsEndpoint = () => wsEndpoint;
    browserServer.close = () => device.close();
    browserServer.kill = () => device.close();
    device.on("close", () => {
      server.close();
      browserServer.emit("close");
    });
    return browserServer;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AndroidServerLauncherImpl
});
