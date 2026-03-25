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
var playwrightConnection_exports = {};
__export(playwrightConnection_exports, {
  PlaywrightConnection: () => PlaywrightConnection
});
module.exports = __toCommonJS(playwrightConnection_exports);
var import_server = require("../server");
var import_android = require("../server/android/android");
var import_browser = require("../server/browser");
var import_debugControllerDispatcher = require("../server/dispatchers/debugControllerDispatcher");
var import_profiler = require("../server/utils/profiler");
var import_utils = require("../utils");
var import_debugLogger = require("../server/utils/debugLogger");
class PlaywrightConnection {
  constructor(semaphore, ws, controller, playwright, initialize, id) {
    this._cleanups = [];
    this._disconnected = false;
    this._ws = ws;
    this._semaphore = semaphore;
    this._id = id;
    this._profileName = (/* @__PURE__ */ new Date()).toISOString();
    const lock = this._semaphore.acquire();
    this._dispatcherConnection = new import_server.DispatcherConnection();
    this._dispatcherConnection.onmessage = async (message) => {
      await lock;
      if (ws.readyState !== ws.CLOSING) {
        const messageString = JSON.stringify(message);
        if (import_debugLogger.debugLogger.isEnabled("server:channel"))
          import_debugLogger.debugLogger.log("server:channel", `[${this._id}] ${(0, import_utils.monotonicTime)() * 1e3} SEND \u25BA ${messageString}`);
        if (import_debugLogger.debugLogger.isEnabled("server:metadata"))
          this.logServerMetadata(message, messageString, "SEND");
        ws.send(messageString);
      }
    };
    ws.on("message", async (message) => {
      await lock;
      const messageString = Buffer.from(message).toString();
      const jsonMessage = JSON.parse(messageString);
      if (import_debugLogger.debugLogger.isEnabled("server:channel"))
        import_debugLogger.debugLogger.log("server:channel", `[${this._id}] ${(0, import_utils.monotonicTime)() * 1e3} \u25C0 RECV ${messageString}`);
      if (import_debugLogger.debugLogger.isEnabled("server:metadata"))
        this.logServerMetadata(jsonMessage, messageString, "RECV");
      this._dispatcherConnection.dispatch(jsonMessage);
    });
    ws.on("close", () => this._onDisconnect());
    ws.on("error", (error) => this._onDisconnect(error));
    if (controller) {
      import_debugLogger.debugLogger.log("server", `[${this._id}] engaged reuse controller mode`);
      this._root = new import_debugControllerDispatcher.DebugControllerDispatcher(this._dispatcherConnection, playwright.debugController);
      return;
    }
    this._root = new import_server.RootDispatcher(this._dispatcherConnection, async (scope, params) => {
      await (0, import_profiler.startProfiling)();
      const options = await initialize();
      if (options.preLaunchedBrowser) {
        const browser = options.preLaunchedBrowser;
        browser.options.sdkLanguage = params.sdkLanguage;
        browser.on(import_browser.Browser.Events.Disconnected, () => {
          this.close({ code: 1001, reason: "Browser closed" });
        });
      }
      if (options.preLaunchedAndroidDevice) {
        const androidDevice = options.preLaunchedAndroidDevice;
        androidDevice.on(import_android.AndroidDevice.Events.Close, () => {
          this.close({ code: 1001, reason: "Android device disconnected" });
        });
      }
      if (options.dispose)
        this._cleanups.push(options.dispose);
      const dispatcher = new import_server.PlaywrightDispatcher(scope, playwright, options);
      this._cleanups.push(() => dispatcher.cleanup());
      return dispatcher;
    });
  }
  async _onDisconnect(error) {
    this._disconnected = true;
    import_debugLogger.debugLogger.log("server", `[${this._id}] disconnected. error: ${error}`);
    await this._root.stopPendingOperations(new Error("Disconnected")).catch(() => {
    });
    this._root._dispose();
    import_debugLogger.debugLogger.log("server", `[${this._id}] starting cleanup`);
    for (const cleanup of this._cleanups)
      await cleanup().catch(() => {
      });
    await (0, import_profiler.stopProfiling)(this._profileName);
    this._semaphore.release();
    import_debugLogger.debugLogger.log("server", `[${this._id}] finished cleanup`);
  }
  logServerMetadata(message, messageString, direction) {
    const serverLogMetadata = {
      wallTime: Date.now(),
      id: message.id,
      guid: message.guid,
      method: message.method,
      payloadSizeInBytes: Buffer.byteLength(messageString, "utf-8")
    };
    import_debugLogger.debugLogger.log("server:metadata", (direction === "SEND" ? "SEND \u25BA " : "\u25C0 RECV ") + JSON.stringify(serverLogMetadata));
  }
  async close(reason) {
    if (this._disconnected)
      return;
    import_debugLogger.debugLogger.log("server", `[${this._id}] force closing connection: ${reason?.reason || ""} (${reason?.code || 0})`);
    try {
      this._ws.close(reason?.code, reason?.reason);
    } catch (e) {
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PlaywrightConnection
});
