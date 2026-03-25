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
var electron_exports = {};
__export(electron_exports, {
  Electron: () => Electron,
  ElectronApplication: () => ElectronApplication
});
module.exports = __toCommonJS(electron_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var readline = __toESM(require("readline"));
var import_utils = require("../../utils");
var import_ascii = require("../utils/ascii");
var import_debugLogger = require("../utils/debugLogger");
var import_eventsHelper = require("../utils/eventsHelper");
var import_browserContext = require("../browserContext");
var import_crBrowser = require("../chromium/crBrowser");
var import_crConnection = require("../chromium/crConnection");
var import_crExecutionContext = require("../chromium/crExecutionContext");
var import_crProtocolHelper = require("../chromium/crProtocolHelper");
var import_console = require("../console");
var import_helper = require("../helper");
var import_instrumentation = require("../instrumentation");
var js = __toESM(require("../javascript"));
var import_processLauncher = require("../utils/processLauncher");
var import_transport = require("../transport");
const ARTIFACTS_FOLDER = import_path.default.join(import_os.default.tmpdir(), "playwright-artifacts-");
class ElectronApplication extends import_instrumentation.SdkObject {
  constructor(parent, browser, nodeConnection, process2) {
    super(parent, "electron-app");
    this._nodeElectronHandlePromise = new import_utils.ManualPromise();
    this._process = process2;
    this._browserContext = browser._defaultContext;
    this._nodeConnection = nodeConnection;
    this._nodeSession = nodeConnection.rootSession;
    this._nodeSession.on("Runtime.executionContextCreated", async (event) => {
      if (!event.context.auxData || !event.context.auxData.isDefault)
        return;
      const crExecutionContext = new import_crExecutionContext.CRExecutionContext(this._nodeSession, event.context);
      this._nodeExecutionContext = new js.ExecutionContext(this, crExecutionContext, "electron");
      const { result: remoteObject } = await crExecutionContext._client.send("Runtime.evaluate", {
        expression: `require('electron')`,
        contextId: event.context.id,
        // Needed after Electron 28 to get access to require: https://github.com/microsoft/playwright/issues/28048
        includeCommandLineAPI: true
      });
      this._nodeElectronHandlePromise.resolve(new js.JSHandle(this._nodeExecutionContext, "object", "ElectronModule", remoteObject.objectId));
    });
    this._nodeSession.on("Runtime.consoleAPICalled", (event) => this._onConsoleAPI(event));
    const appClosePromise = new Promise((f) => this.once(ElectronApplication.Events.Close, f));
    this._browserContext.setCustomCloseHandler(async () => {
      await this._browserContext.stopVideoRecording();
      const electronHandle = await this._nodeElectronHandlePromise;
      await electronHandle.evaluate(({ app }) => app.quit()).catch(() => {
      });
      this._nodeConnection.close();
      await appClosePromise;
    });
  }
  static {
    this.Events = {
      Close: "close",
      Console: "console"
    };
  }
  async _onConsoleAPI(event) {
    if (event.executionContextId === 0) {
      return;
    }
    if (!this._nodeExecutionContext)
      return;
    const args = event.args.map((arg) => (0, import_crExecutionContext.createHandle)(this._nodeExecutionContext, arg));
    const message = new import_console.ConsoleMessage(null, null, event.type, void 0, args, (0, import_crProtocolHelper.toConsoleMessageLocation)(event.stackTrace));
    this.emit(ElectronApplication.Events.Console, message);
  }
  async initialize() {
    await this._nodeSession.send("Runtime.enable", {});
    await this._nodeSession.send("Runtime.evaluate", { expression: "__playwright_run()" });
  }
  process() {
    return this._process;
  }
  context() {
    return this._browserContext;
  }
  async close() {
    await this._browserContext.close({ reason: "Application exited" });
  }
  async browserWindow(page) {
    const targetId = page.delegate._targetId;
    const electronHandle = await this._nodeElectronHandlePromise;
    return await electronHandle.evaluateHandle(({ BrowserWindow, webContents }, targetId2) => {
      const wc = webContents.fromDevToolsTargetId(targetId2);
      return BrowserWindow.fromWebContents(wc);
    }, targetId);
  }
}
class Electron extends import_instrumentation.SdkObject {
  constructor(playwright) {
    super(playwright, "electron");
    this.logName = "browser";
  }
  async launch(progress, options) {
    let app = void 0;
    let electronArguments = ["--inspect=0", "--remote-debugging-port=0", ...options.args || []];
    if (import_os.default.platform() === "linux") {
      const runningAsRoot = process.geteuid && process.geteuid() === 0;
      if (runningAsRoot && electronArguments.indexOf("--no-sandbox") === -1)
        electronArguments.unshift("--no-sandbox");
    }
    const artifactsDir = await progress.race(import_fs.default.promises.mkdtemp(ARTIFACTS_FOLDER));
    const browserLogsCollector = new import_debugLogger.RecentLogsCollector();
    const env = options.env ? (0, import_processLauncher.envArrayToObject)(options.env) : process.env;
    let command;
    if (options.executablePath) {
      command = options.executablePath;
    } else {
      try {
        command = require("electron/index.js");
      } catch (error) {
        if (error?.code === "MODULE_NOT_FOUND") {
          throw new Error("\n" + (0, import_ascii.wrapInASCIIBox)([
            "Electron executablePath not found!",
            "Please install it using `npm install -D electron` or set the executablePath to your Electron executable."
          ].join("\n"), 1));
        }
        throw error;
      }
      electronArguments.unshift("-r", require.resolve("./loader"));
    }
    let shell = false;
    if (process.platform === "win32") {
      shell = true;
      command = [command, ...electronArguments].map((arg) => `"${escapeDoubleQuotes(arg)}"`).join(" ");
      electronArguments = [];
    }
    delete env.NODE_OPTIONS;
    const { launchedProcess, gracefullyClose, kill } = await (0, import_processLauncher.launchProcess)({
      command,
      args: electronArguments,
      env,
      log: (message) => {
        progress.log(message);
        browserLogsCollector.log(message);
      },
      shell,
      stdio: "pipe",
      cwd: options.cwd,
      tempDirectories: [artifactsDir],
      attemptToGracefullyClose: () => app.close(),
      handleSIGINT: true,
      handleSIGTERM: true,
      handleSIGHUP: true,
      onExit: () => app?.emit(ElectronApplication.Events.Close)
    });
    const waitForXserverError = waitForLine(progress, launchedProcess, /Unable to open X display/).then(() => {
      throw new Error([
        "Unable to open X display!",
        `================================`,
        "Most likely this is because there is no X server available.",
        "Use 'xvfb-run' on Linux to launch your tests with an emulated display server.",
        "For example: 'xvfb-run npm run test:e2e'",
        `================================`,
        progress.metadata.log
      ].join("\n"));
    });
    const nodeMatchPromise = waitForLine(progress, launchedProcess, /^Debugger listening on (ws:\/\/.*)$/);
    const chromeMatchPromise = waitForLine(progress, launchedProcess, /^DevTools listening on (ws:\/\/.*)$/);
    const debuggerDisconnectPromise = waitForLine(progress, launchedProcess, /Waiting for the debugger to disconnect\.\.\./);
    try {
      const nodeMatch = await nodeMatchPromise;
      const nodeTransport = await import_transport.WebSocketTransport.connect(progress, nodeMatch[1]);
      const nodeConnection = new import_crConnection.CRConnection(this, nodeTransport, import_helper.helper.debugProtocolLogger(), browserLogsCollector);
      debuggerDisconnectPromise.then(() => {
        nodeTransport.close();
      }).catch(() => {
      });
      const chromeMatch = await Promise.race([
        chromeMatchPromise,
        waitForXserverError
      ]);
      const chromeTransport = await import_transport.WebSocketTransport.connect(progress, chromeMatch[1]);
      const browserProcess = {
        onclose: void 0,
        process: launchedProcess,
        close: gracefullyClose,
        kill
      };
      const contextOptions = {
        ...options,
        noDefaultViewport: true
      };
      const browserOptions = {
        name: "electron",
        isChromium: true,
        headful: true,
        persistent: contextOptions,
        browserProcess,
        protocolLogger: import_helper.helper.debugProtocolLogger(),
        browserLogsCollector,
        artifactsDir,
        downloadsPath: artifactsDir,
        tracesDir: options.tracesDir || artifactsDir,
        originalLaunchOptions: {}
      };
      (0, import_browserContext.validateBrowserContextOptions)(contextOptions, browserOptions);
      const browser = await progress.race(import_crBrowser.CRBrowser.connect(this.attribution.playwright, chromeTransport, browserOptions));
      app = new ElectronApplication(this, browser, nodeConnection, launchedProcess);
      await progress.race(app.initialize());
      return app;
    } catch (error) {
      await kill();
      throw error;
    }
  }
}
async function waitForLine(progress, process2, regex) {
  const promise = new import_utils.ManualPromise();
  const rl = readline.createInterface({ input: process2.stderr });
  const failError = new Error("Process failed to launch!");
  const listeners = [
    import_eventsHelper.eventsHelper.addEventListener(rl, "line", onLine),
    import_eventsHelper.eventsHelper.addEventListener(rl, "close", () => promise.reject(failError)),
    import_eventsHelper.eventsHelper.addEventListener(process2, "exit", () => promise.reject(failError)),
    // It is Ok to remove error handler because we did not create process and there is another listener.
    import_eventsHelper.eventsHelper.addEventListener(process2, "error", () => promise.reject(failError))
  ];
  function onLine(line) {
    const match = line.match(regex);
    if (match)
      promise.resolve(match);
  }
  try {
    return await progress.race(promise);
  } finally {
    import_eventsHelper.eventsHelper.removeEventListeners(listeners);
  }
}
function escapeDoubleQuotes(str) {
  return str.replace(/"/g, '\\"');
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Electron,
  ElectronApplication
});
