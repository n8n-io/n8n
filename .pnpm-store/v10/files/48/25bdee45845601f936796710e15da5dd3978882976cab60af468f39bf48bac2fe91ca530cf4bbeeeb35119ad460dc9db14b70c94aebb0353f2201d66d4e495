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
var browserServerImpl_exports = {};
__export(browserServerImpl_exports, {
  BrowserServerLauncherImpl: () => BrowserServerLauncherImpl
});
module.exports = __toCommonJS(browserServerImpl_exports);
var import_playwrightServer = require("./remote/playwrightServer");
var import_helper = require("./server/helper");
var import_playwright = require("./server/playwright");
var import_crypto = require("./server/utils/crypto");
var import_debug = require("./server/utils/debug");
var import_stackTrace = require("./utils/isomorphic/stackTrace");
var import_time = require("./utils/isomorphic/time");
var import_utilsBundle = require("./utilsBundle");
var validatorPrimitives = __toESM(require("./protocol/validatorPrimitives"));
var import_progress = require("./server/progress");
class BrowserServerLauncherImpl {
  constructor(browserName) {
    this._browserName = browserName;
  }
  async launchServer(options = {}) {
    const playwright = (0, import_playwright.createPlaywright)({ sdkLanguage: "javascript", isServer: true });
    const metadata = { id: "", startTime: 0, endTime: 0, type: "Internal", method: "", params: {}, log: [], internal: true };
    const validatorContext = {
      tChannelImpl: (names, arg, path2) => {
        throw new validatorPrimitives.ValidationError(`${path2}: channels are not expected in launchServer`);
      },
      binary: "buffer",
      isUnderTest: import_debug.isUnderTest
    };
    let launchOptions = {
      ...options,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : void 0,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? envObjectToArray(options.env) : void 0,
      timeout: options.timeout ?? import_time.DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT
    };
    let browser;
    try {
      const controller = new import_progress.ProgressController(metadata);
      browser = await controller.run(async (progress) => {
        if (options._userDataDir !== void 0) {
          const validator = validatorPrimitives.scheme["BrowserTypeLaunchPersistentContextParams"];
          launchOptions = validator({ ...launchOptions, userDataDir: options._userDataDir }, "", validatorContext);
          const context = await playwright[this._browserName].launchPersistentContext(progress, options._userDataDir, launchOptions);
          return context._browser;
        } else {
          const validator = validatorPrimitives.scheme["BrowserTypeLaunchParams"];
          launchOptions = validator(launchOptions, "", validatorContext);
          return await playwright[this._browserName].launch(progress, launchOptions, toProtocolLogger(options.logger));
        }
      });
    } catch (e) {
      const log = import_helper.helper.formatBrowserLogs(metadata.log);
      (0, import_stackTrace.rewriteErrorMessage)(e, `${e.message} Failed to launch browser.${log}`);
      throw e;
    }
    const path = options.wsPath ? options.wsPath.startsWith("/") ? options.wsPath : `/${options.wsPath}` : `/${(0, import_crypto.createGuid)()}`;
    const server = new import_playwrightServer.PlaywrightServer({ mode: options._sharedBrowser ? "launchServerShared" : "launchServer", path, maxConnections: Infinity, preLaunchedBrowser: browser });
    const wsEndpoint = await server.listen(options.port, options.host);
    const browserServer = new import_utilsBundle.ws.EventEmitter();
    browserServer.process = () => browser.options.browserProcess.process;
    browserServer.wsEndpoint = () => wsEndpoint;
    browserServer.close = () => browser.options.browserProcess.close();
    browserServer[Symbol.asyncDispose] = browserServer.close;
    browserServer.kill = () => browser.options.browserProcess.kill();
    browserServer._disconnectForTest = () => server.close();
    browserServer._userDataDirForTest = browser._userDataDirForTest;
    browser.options.browserProcess.onclose = (exitCode, signal) => {
      server.close();
      browserServer.emit("close", exitCode, signal);
    };
    return browserServer;
  }
}
function toProtocolLogger(logger) {
  return logger ? (direction, message) => {
    if (logger.isEnabled("protocol", "verbose"))
      logger.log("protocol", "verbose", (direction === "send" ? "SEND \u25BA " : "\u25C0 RECV ") + JSON.stringify(message), [], {});
  } : void 0;
}
function envObjectToArray(env) {
  const result = [];
  for (const name in env) {
    if (!Object.is(env[name], void 0))
      result.push({ name, value: String(env[name]) });
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserServerLauncherImpl
});
