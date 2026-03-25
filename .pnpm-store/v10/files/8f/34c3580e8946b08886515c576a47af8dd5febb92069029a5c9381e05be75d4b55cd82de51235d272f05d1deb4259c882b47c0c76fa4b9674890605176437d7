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
var bidiFirefox_exports = {};
__export(bidiFirefox_exports, {
  BidiFirefox: () => BidiFirefox
});
module.exports = __toCommonJS(bidiFirefox_exports);
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_ascii = require("../utils/ascii");
var import_browserType = require("../browserType");
var import_bidiBrowser = require("./bidiBrowser");
var import_bidiConnection = require("./bidiConnection");
var import_firefoxPrefs = require("./third_party/firefoxPrefs");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
class BidiFirefox extends import_browserType.BrowserType {
  constructor(parent) {
    super(parent, "firefox");
  }
  executablePath() {
    return "";
  }
  async connectToTransport(transport, options) {
    return import_bidiBrowser.BidiBrowser.connect(this.attribution.playwright, transport, options);
  }
  doRewriteStartupLog(logs) {
    if (logs.includes(`as root in a regular user's session is not supported.`))
      logs = "\n" + (0, import_ascii.wrapInASCIIBox)(`Firefox is unable to launch if the $HOME folder isn't owned by the current user.
Workaround: Set the HOME=/root environment variable${process.env.GITHUB_ACTION ? " in your GitHub Actions workflow file" : ""} when running Playwright.`, 1);
    if (logs.includes("no DISPLAY environment variable specified"))
      logs = "\n" + (0, import_ascii.wrapInASCIIBox)(import_browserType.kNoXServerRunningError, 1);
    return logs;
  }
  amendEnvironment(env) {
    if (!import_path.default.isAbsolute(import_os.default.homedir()))
      throw new Error(`Cannot launch Firefox with relative home directory. Did you set ${import_os.default.platform() === "win32" ? "USERPROFILE" : "HOME"} to a relative path?`);
    env = {
      ...env,
      "MOZ_CRASHREPORTER": "1",
      "MOZ_CRASHREPORTER_NO_REPORT": "1",
      "MOZ_CRASHREPORTER_SHUTDOWN": "1"
    };
    if (import_os.default.platform() === "linux") {
      return { ...env, SNAP_NAME: void 0, SNAP_INSTANCE_NAME: void 0 };
    }
    return env;
  }
  attemptToGracefullyCloseBrowser(transport) {
    this._attemptToGracefullyCloseBrowser(transport).catch(() => {
    });
  }
  async _attemptToGracefullyCloseBrowser(transport) {
    if (!transport.onmessage) {
      transport.send({ method: "session.new", params: { capabilities: {} }, id: import_bidiConnection.kShutdownSessionNewMessageId });
      await new Promise((resolve) => {
        transport.onmessage = (message) => {
          if (message.id === import_bidiConnection.kShutdownSessionNewMessageId)
            resolve(true);
        };
      });
    }
    transport.send({ method: "browser.close", params: {}, id: import_bidiConnection.kBrowserCloseMessageId });
  }
  supportsPipeTransport() {
    return false;
  }
  async prepareUserDataDir(options, userDataDir) {
    await (0, import_firefoxPrefs.createProfile)({
      path: userDataDir,
      preferences: options.firefoxUserPrefs || {}
    });
  }
  async defaultArgs(options, isPersistent, userDataDir) {
    const { args = [], headless } = options;
    const userDataDirArg = args.find((arg) => arg.startsWith("-profile") || arg.startsWith("--profile"));
    if (userDataDirArg)
      throw this._createUserDataDirArgMisuseError("--profile");
    if (args.find((arg) => !arg.startsWith("-")))
      throw new Error("Arguments can not specify page to be opened");
    const firefoxArguments = ["--remote-debugging-port=0"];
    if (headless)
      firefoxArguments.push("--headless");
    else
      firefoxArguments.push("--foreground");
    firefoxArguments.push(`--profile`, userDataDir);
    firefoxArguments.push(...args);
    return firefoxArguments;
  }
  async waitForReadyState(options, browserLogsCollector) {
    const result = new import_manualPromise.ManualPromise();
    browserLogsCollector.onMessage((message) => {
      const match = message.match(/WebDriver BiDi listening on (ws:\/\/.*)$/);
      if (match)
        result.resolve({ wsEndpoint: match[1] + "/session" });
    });
    return result;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiFirefox
});
