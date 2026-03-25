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
var firefox_exports = {};
__export(firefox_exports, {
  Firefox: () => Firefox
});
module.exports = __toCommonJS(firefox_exports);
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_ffBrowser = require("./ffBrowser");
var import_ffConnection = require("./ffConnection");
var import_ascii = require("../utils/ascii");
var import_browserType = require("../browserType");
var import_manualPromise = require("../../utils/isomorphic/manualPromise");
class Firefox extends import_browserType.BrowserType {
  constructor(parent, bidiFirefox) {
    super(parent, "firefox");
    this._bidiFirefox = bidiFirefox;
  }
  launch(progress, options, protocolLogger) {
    if (options.channel?.startsWith("moz-"))
      return this._bidiFirefox.launch(progress, options, protocolLogger);
    return super.launch(progress, options, protocolLogger);
  }
  async launchPersistentContext(progress, userDataDir, options) {
    if (options.channel?.startsWith("moz-"))
      return this._bidiFirefox.launchPersistentContext(progress, userDataDir, options);
    return super.launchPersistentContext(progress, userDataDir, options);
  }
  connectToTransport(transport, options) {
    return import_ffBrowser.FFBrowser.connect(this.attribution.playwright, transport, options);
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
    if (import_os.default.platform() === "linux") {
      return { ...env, SNAP_NAME: void 0, SNAP_INSTANCE_NAME: void 0 };
    }
    return env;
  }
  attemptToGracefullyCloseBrowser(transport) {
    const message = { method: "Browser.close", params: {}, id: import_ffConnection.kBrowserCloseMessageId };
    transport.send(message);
  }
  async defaultArgs(options, isPersistent, userDataDir) {
    const { args = [], headless } = options;
    const userDataDirArg = args.find((arg) => arg.startsWith("-profile") || arg.startsWith("--profile"));
    if (userDataDirArg)
      throw this._createUserDataDirArgMisuseError("--profile");
    if (args.find((arg) => arg.startsWith("-juggler")))
      throw new Error("Use the port parameter instead of -juggler argument");
    const firefoxArguments = ["-no-remote"];
    if (headless) {
      firefoxArguments.push("-headless");
    } else {
      firefoxArguments.push("-wait-for-browser");
      firefoxArguments.push("-foreground");
    }
    firefoxArguments.push(`-profile`, userDataDir);
    firefoxArguments.push("-juggler-pipe");
    firefoxArguments.push(...args);
    if (isPersistent)
      firefoxArguments.push("about:blank");
    else
      firefoxArguments.push("-silent");
    return firefoxArguments;
  }
  waitForReadyState(options, browserLogsCollector) {
    const result = new import_manualPromise.ManualPromise();
    browserLogsCollector.onMessage((message) => {
      if (message.includes("Juggler listening to the pipe"))
        result.resolve({});
    });
    return result;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Firefox
});
