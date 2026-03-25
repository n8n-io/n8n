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
var bidiChromium_exports = {};
__export(bidiChromium_exports, {
  BidiChromium: () => BidiChromium
});
module.exports = __toCommonJS(bidiChromium_exports);
var import_os = __toESM(require("os"));
var import_ascii = require("../utils/ascii");
var import_browserType = require("../browserType");
var import_bidiBrowser = require("./bidiBrowser");
var import_bidiConnection = require("./bidiConnection");
var import_chromiumSwitches = require("../chromium/chromiumSwitches");
var import_chromium = require("../chromium/chromium");
class BidiChromium extends import_browserType.BrowserType {
  constructor(parent) {
    super(parent, "chromium");
  }
  async connectToTransport(transport, options, browserLogsCollector) {
    const bidiTransport = await require("./bidiOverCdp").connectBidiOverCdp(transport);
    transport[kBidiOverCdpWrapper] = bidiTransport;
    try {
      return import_bidiBrowser.BidiBrowser.connect(this.attribution.playwright, bidiTransport, options);
    } catch (e) {
      if (browserLogsCollector.recentLogs().some((log) => log.includes("Failed to create a ProcessSingleton for your profile directory."))) {
        throw new Error(
          "Failed to create a ProcessSingleton for your profile directory. This usually means that the profile is already in use by another instance of Chromium."
        );
      }
      throw e;
    }
  }
  doRewriteStartupLog(logs) {
    if (logs.includes("Missing X server"))
      logs = "\n" + (0, import_ascii.wrapInASCIIBox)(import_browserType.kNoXServerRunningError, 1);
    if (!logs.includes("crbug.com/357670") && !logs.includes("No usable sandbox!") && !logs.includes("crbug.com/638180"))
      return logs;
    return [
      `Chromium sandboxing failed!`,
      `================================`,
      `To avoid the sandboxing issue, do either of the following:`,
      `  - (preferred): Configure your environment to support sandboxing`,
      `  - (alternative): Launch Chromium without sandbox using 'chromiumSandbox: false' option`,
      `================================`,
      ``
    ].join("\n");
  }
  amendEnvironment(env) {
    return env;
  }
  attemptToGracefullyCloseBrowser(transport) {
    const bidiTransport = transport[kBidiOverCdpWrapper];
    if (bidiTransport)
      transport = bidiTransport;
    transport.send({ method: "browser.close", params: {}, id: import_bidiConnection.kBrowserCloseMessageId });
  }
  supportsPipeTransport() {
    return false;
  }
  async defaultArgs(options, isPersistent, userDataDir) {
    const chromeArguments = this._innerDefaultArgs(options);
    chromeArguments.push(`--user-data-dir=${userDataDir}`);
    chromeArguments.push("--remote-debugging-port=0");
    if (isPersistent)
      chromeArguments.push("about:blank");
    else
      chromeArguments.push("--no-startup-window");
    return chromeArguments;
  }
  async waitForReadyState(options, browserLogsCollector) {
    return (0, import_chromium.waitForReadyState)({ ...options, cdpPort: 0 }, browserLogsCollector);
  }
  _innerDefaultArgs(options) {
    const { args = [] } = options;
    const userDataDirArg = args.find((arg) => arg.startsWith("--user-data-dir"));
    if (userDataDirArg)
      throw this._createUserDataDirArgMisuseError("--user-data-dir");
    if (args.find((arg) => arg.startsWith("--remote-debugging-pipe")))
      throw new Error("Playwright manages remote debugging connection itself.");
    if (args.find((arg) => !arg.startsWith("-")))
      throw new Error("Arguments can not specify page to be opened");
    const chromeArguments = [...(0, import_chromiumSwitches.chromiumSwitches)(options.assistantMode)];
    if (import_os.default.platform() === "darwin") {
      chromeArguments.push("--enable-unsafe-swiftshader");
    }
    if (options.headless) {
      chromeArguments.push("--headless");
      chromeArguments.push(
        "--hide-scrollbars",
        "--mute-audio",
        "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"
      );
    }
    if (options.chromiumSandbox !== true)
      chromeArguments.push("--no-sandbox");
    const proxy = options.proxyOverride || options.proxy;
    if (proxy) {
      const proxyURL = new URL(proxy.server);
      const isSocks = proxyURL.protocol === "socks5:";
      if (isSocks && !options.socksProxyPort) {
        chromeArguments.push(`--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE ${proxyURL.hostname}"`);
      }
      chromeArguments.push(`--proxy-server=${proxy.server}`);
      const proxyBypassRules = [];
      if (options.socksProxyPort)
        proxyBypassRules.push("<-loopback>");
      if (proxy.bypass)
        proxyBypassRules.push(...proxy.bypass.split(",").map((t) => t.trim()).map((t) => t.startsWith(".") ? "*" + t : t));
      if (!process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK && !proxyBypassRules.includes("<-loopback>"))
        proxyBypassRules.push("<-loopback>");
      if (proxyBypassRules.length > 0)
        chromeArguments.push(`--proxy-bypass-list=${proxyBypassRules.join(";")}`);
    }
    chromeArguments.push(...args);
    return chromeArguments;
  }
}
const kBidiOverCdpWrapper = Symbol("kBidiConnectionWrapper");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiChromium
});
