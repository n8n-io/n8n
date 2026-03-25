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
var android_exports = {};
__export(android_exports, {
  Android: () => Android,
  AndroidDevice: () => AndroidDevice
});
module.exports = __toCommonJS(android_exports);
var import_events = require("events");
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_pipeTransport = require("../utils/pipeTransport");
var import_crypto = require("../utils/crypto");
var import_debug = require("../utils/debug");
var import_env = require("../utils/env");
var import_task = require("../utils/task");
var import_debugLogger = require("../utils/debugLogger");
var import_utilsBundle = require("../../utilsBundle");
var import_utilsBundle2 = require("../../utilsBundle");
var import_browserContext = require("../browserContext");
var import_chromiumSwitches = require("../chromium/chromiumSwitches");
var import_crBrowser = require("../chromium/crBrowser");
var import_fileUtils = require("../utils/fileUtils");
var import_helper = require("../helper");
var import_instrumentation = require("../instrumentation");
var import_processLauncher = require("../utils/processLauncher");
var import_progress = require("../progress");
var import_registry = require("../registry");
const ARTIFACTS_FOLDER = import_path.default.join(import_os.default.tmpdir(), "playwright-artifacts-");
class Android extends import_instrumentation.SdkObject {
  constructor(parent, backend) {
    super(parent, "android");
    this._devices = /* @__PURE__ */ new Map();
    this._backend = backend;
  }
  async devices(progress, options) {
    const devices = (await progress.race(this._backend.devices(options))).filter((d) => d.status === "device");
    const newSerials = /* @__PURE__ */ new Set();
    for (const d of devices) {
      newSerials.add(d.serial);
      if (this._devices.has(d.serial))
        continue;
      await progress.race(AndroidDevice.create(this, d, options).then((device) => this._devices.set(d.serial, device)));
    }
    for (const d of this._devices.keys()) {
      if (!newSerials.has(d))
        this._devices.delete(d);
    }
    return [...this._devices.values()];
  }
  _deviceClosed(device) {
    this._devices.delete(device.serial);
  }
}
class AndroidDevice extends import_instrumentation.SdkObject {
  constructor(android, backend, model, options) {
    super(android, "android-device");
    this._lastId = 0;
    this._callbacks = /* @__PURE__ */ new Map();
    this._webViews = /* @__PURE__ */ new Map();
    this._browserConnections = /* @__PURE__ */ new Set();
    this._isClosed = false;
    this._android = android;
    this._backend = backend;
    this.model = model;
    this.serial = backend.serial;
    this._options = options;
    this.logName = "browser";
  }
  static {
    this.Events = {
      WebViewAdded: "webViewAdded",
      WebViewRemoved: "webViewRemoved",
      Close: "close"
    };
  }
  static async create(android, backend, options) {
    await backend.init();
    const model = await backend.runCommand("shell:getprop ro.product.model");
    const device = new AndroidDevice(android, backend, model.toString().trim(), options);
    await device._init();
    return device;
  }
  async _init() {
    await this._refreshWebViews();
    const poll = () => {
      this._pollingWebViews = setTimeout(() => this._refreshWebViews().then(poll).catch(() => {
        this.close().catch(() => {
        });
      }), 500);
    };
    poll();
  }
  async shell(command) {
    const result = await this._backend.runCommand(`shell:${command}`);
    await this._refreshWebViews();
    return result;
  }
  async open(progress, command) {
    return await this._open(progress, command);
  }
  async screenshot() {
    return await this._backend.runCommand(`shell:screencap -p`);
  }
  async _driver() {
    if (this._isClosed)
      return;
    if (!this._driverPromise) {
      const controller = new import_progress.ProgressController();
      this._driverPromise = controller.run((progress) => this._installDriver(progress));
    }
    return this._driverPromise;
  }
  async _installDriver(progress) {
    (0, import_utilsBundle.debug)("pw:android")("Stopping the old driver");
    await progress.race(this.shell(`am force-stop com.microsoft.playwright.androiddriver`));
    if (!this._options.omitDriverInstall) {
      (0, import_utilsBundle.debug)("pw:android")("Uninstalling the old driver");
      await progress.race(this.shell(`cmd package uninstall com.microsoft.playwright.androiddriver`));
      await progress.race(this.shell(`cmd package uninstall com.microsoft.playwright.androiddriver.test`));
      (0, import_utilsBundle.debug)("pw:android")("Installing the new driver");
      const executable = import_registry.registry.findExecutable("android");
      const packageManagerCommand = (0, import_env.getPackageManagerExecCommand)();
      for (const file of ["android-driver.apk", "android-driver-target.apk"]) {
        const fullName = import_path.default.join(executable.directory, file);
        if (!import_fs.default.existsSync(fullName))
          throw new Error(`Please install Android driver apk using '${packageManagerCommand} playwright install android'`);
        await this.installApk(progress, await progress.race(import_fs.default.promises.readFile(fullName)));
      }
    } else {
      (0, import_utilsBundle.debug)("pw:android")("Skipping the driver installation");
    }
    (0, import_utilsBundle.debug)("pw:android")("Starting the new driver");
    this.shell("am instrument -w com.microsoft.playwright.androiddriver.test/androidx.test.runner.AndroidJUnitRunner").catch((e) => (0, import_utilsBundle.debug)("pw:android")(e));
    const socket = await this._waitForLocalAbstract(progress, "playwright_android_driver_socket");
    const transport = new import_pipeTransport.PipeTransport(socket, socket, socket, "be");
    transport.onmessage = (message) => {
      const response = JSON.parse(message);
      const { id, result, error } = response;
      const callback = this._callbacks.get(id);
      if (!callback)
        return;
      if (error)
        callback.reject(new Error(error));
      else
        callback.fulfill(result);
      this._callbacks.delete(id);
    };
    return transport;
  }
  async _waitForLocalAbstract(progress, socketName) {
    let socket;
    (0, import_utilsBundle.debug)("pw:android")(`Polling the socket localabstract:${socketName}`);
    while (!socket) {
      try {
        socket = await this._open(progress, `localabstract:${socketName}`);
      } catch (e) {
        if ((0, import_progress.isAbortError)(e))
          throw e;
        await progress.wait(250);
      }
    }
    (0, import_utilsBundle.debug)("pw:android")(`Connected to localabstract:${socketName}`);
    return socket;
  }
  async send(method, params = {}) {
    params = {
      ...params,
      // Patch the timeout in, just in case it's missing in one of the commands.
      timeout: params.timeout || 0
    };
    if (params.androidSelector) {
      params.selector = params.androidSelector;
      delete params.androidSelector;
    }
    const driver = await this._driver();
    if (!driver)
      throw new Error("Device is closed");
    const id = ++this._lastId;
    const result = new Promise((fulfill, reject) => this._callbacks.set(id, { fulfill, reject }));
    driver.send(JSON.stringify({ id, method, params }));
    return result;
  }
  async close() {
    if (this._isClosed)
      return;
    this._isClosed = true;
    if (this._pollingWebViews)
      clearTimeout(this._pollingWebViews);
    for (const connection of this._browserConnections)
      await connection.close();
    if (this._driverPromise) {
      const driver = await this._driver();
      driver?.close();
    }
    await this._backend.close();
    this._android._deviceClosed(this);
    this.emit(AndroidDevice.Events.Close);
  }
  async launchBrowser(progress, pkg = "com.android.chrome", options) {
    (0, import_utilsBundle.debug)("pw:android")("Force-stopping", pkg);
    await this._backend.runCommand(`shell:am force-stop ${pkg}`);
    const socketName = (0, import_debug.isUnderTest)() ? "webview_devtools_remote_playwright_test" : "playwright_" + (0, import_crypto.createGuid)() + "_devtools_remote";
    const commandLine = this._defaultArgs(options, socketName).join(" ");
    (0, import_utilsBundle.debug)("pw:android")("Starting", pkg, commandLine);
    await progress.race(this._backend.runCommand(`shell:echo "${Buffer.from(commandLine).toString("base64")}" | base64 -d > /data/local/tmp/chrome-command-line`));
    await progress.race(this._backend.runCommand(`shell:am start -a android.intent.action.VIEW -d about:blank ${pkg}`));
    const browserContext = await this._connectToBrowser(progress, socketName, options);
    try {
      await progress.race(this._backend.runCommand(`shell:rm /data/local/tmp/chrome-command-line`));
      return browserContext;
    } catch (error) {
      await browserContext.close({ reason: "Failed to launch" }).catch(() => {
      });
      throw error;
    }
  }
  _defaultArgs(options, socketName) {
    const chromeArguments = [
      "_",
      "--disable-fre",
      "--no-default-browser-check",
      `--remote-debugging-socket-name=${socketName}`,
      ...(0, import_chromiumSwitches.chromiumSwitches)(void 0, void 0, true),
      ...this._innerDefaultArgs(options)
    ];
    return chromeArguments;
  }
  _innerDefaultArgs(options) {
    const { args = [], proxy } = options;
    const chromeArguments = [];
    if (proxy) {
      chromeArguments.push(`--proxy-server=${proxy.server}`);
      const proxyBypassRules = [];
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
  async connectToWebView(progress, socketName) {
    const webView = this._webViews.get(socketName);
    if (!webView)
      throw new Error("WebView has been closed");
    return await this._connectToBrowser(progress, socketName);
  }
  async _connectToBrowser(progress, socketName, options = {}) {
    const socket = await this._waitForLocalAbstract(progress, socketName);
    try {
      const androidBrowser = new AndroidBrowser(this, socket);
      await progress.race(androidBrowser._init());
      this._browserConnections.add(androidBrowser);
      const artifactsDir = await progress.race(import_fs.default.promises.mkdtemp(ARTIFACTS_FOLDER));
      const cleanupArtifactsDir = async () => {
        const errors = (await (0, import_fileUtils.removeFolders)([artifactsDir])).filter(Boolean);
        for (let i = 0; i < (errors || []).length; ++i)
          (0, import_utilsBundle.debug)("pw:android")(`exception while removing ${artifactsDir}: ${errors[i]}`);
      };
      import_processLauncher.gracefullyCloseSet.add(cleanupArtifactsDir);
      socket.on("close", async () => {
        import_processLauncher.gracefullyCloseSet.delete(cleanupArtifactsDir);
        cleanupArtifactsDir().catch((e) => (0, import_utilsBundle.debug)("pw:android")(`could not cleanup artifacts dir: ${e}`));
      });
      const browserOptions = {
        name: "clank",
        isChromium: true,
        slowMo: 0,
        persistent: { ...options, noDefaultViewport: true },
        artifactsDir,
        downloadsPath: artifactsDir,
        tracesDir: artifactsDir,
        browserProcess: new ClankBrowserProcess(androidBrowser),
        proxy: options.proxy,
        protocolLogger: import_helper.helper.debugProtocolLogger(),
        browserLogsCollector: new import_debugLogger.RecentLogsCollector(),
        originalLaunchOptions: {}
      };
      (0, import_browserContext.validateBrowserContextOptions)(options, browserOptions);
      const browser = await progress.race(import_crBrowser.CRBrowser.connect(this.attribution.playwright, androidBrowser, browserOptions));
      const defaultContext = browser._defaultContext;
      await defaultContext._loadDefaultContextAsIs(progress);
      return defaultContext;
    } catch (error) {
      socket.close();
      throw error;
    }
  }
  _open(progress, command) {
    return (0, import_progress.raceUncancellableOperationWithCleanup)(progress, () => this._backend.open(command), (socket) => socket.close());
  }
  webViews() {
    return [...this._webViews.values()];
  }
  async installApk(progress, content, options) {
    const args = options && options.args ? options.args : ["-r", "-t", "-S"];
    (0, import_utilsBundle.debug)("pw:android")("Opening install socket");
    const installSocket = await this._open(progress, `shell:cmd package install ${args.join(" ")} ${content.length}`);
    (0, import_utilsBundle.debug)("pw:android")("Writing driver bytes: " + content.length);
    await progress.race(installSocket.write(content));
    const success = await progress.race(new Promise((f) => installSocket.on("data", f)));
    (0, import_utilsBundle.debug)("pw:android")("Written driver bytes: " + success);
    installSocket.close();
  }
  async push(progress, content, path2, mode = 420) {
    const socket = await this._open(progress, `sync:`);
    const sendHeader = async (command, length) => {
      const buffer = Buffer.alloc(command.length + 4);
      buffer.write(command, 0);
      buffer.writeUInt32LE(length, command.length);
      await progress.race(socket.write(buffer));
    };
    const send = async (command, data) => {
      await sendHeader(command, data.length);
      await progress.race(socket.write(data));
    };
    await send("SEND", Buffer.from(`${path2},${mode}`));
    const maxChunk = 65535;
    for (let i = 0; i < content.length; i += maxChunk)
      await send("DATA", content.slice(i, i + maxChunk));
    await sendHeader("DONE", Date.now() / 1e3 | 0);
    const result = await progress.race(new Promise((f) => socket.once("data", f)));
    const code = result.slice(0, 4).toString();
    if (code !== "OKAY")
      throw new Error("Could not push: " + code);
    socket.close();
  }
  async _refreshWebViews() {
    const sockets = (await this._backend.runCommand(`shell:cat /proc/net/unix | grep webview_devtools_remote`)).toString().split("\n");
    if (this._isClosed)
      return;
    const socketNames = /* @__PURE__ */ new Set();
    for (const line of sockets) {
      const matchSocketName = line.match(/[^@]+@(.*?webview_devtools_remote_?.*)/);
      if (!matchSocketName)
        continue;
      const socketName = matchSocketName[1];
      socketNames.add(socketName);
      if (this._webViews.has(socketName))
        continue;
      const match = line.match(/[^@]+@.*?webview_devtools_remote_?(\d*)/);
      let pid = -1;
      if (match && match[1])
        pid = +match[1];
      const pkg = await this._extractPkg(pid);
      if (this._isClosed)
        return;
      const webView = { pid, pkg, socketName };
      this._webViews.set(socketName, webView);
      this.emit(AndroidDevice.Events.WebViewAdded, webView);
    }
    for (const p of this._webViews.keys()) {
      if (!socketNames.has(p)) {
        this._webViews.delete(p);
        this.emit(AndroidDevice.Events.WebViewRemoved, p);
      }
    }
  }
  async _extractPkg(pid) {
    let pkg = "";
    if (pid === -1)
      return pkg;
    const procs = (await this._backend.runCommand(`shell:ps -A | grep ${pid}`)).toString().split("\n");
    for (const proc of procs) {
      const match = proc.match(/[^\s]+\s+(\d+).*$/);
      if (!match)
        continue;
      pkg = proc.substring(proc.lastIndexOf(" ") + 1);
    }
    return pkg;
  }
}
class AndroidBrowser extends import_events.EventEmitter {
  constructor(device, socket) {
    super();
    this._waitForNextTask = (0, import_task.makeWaitForNextTask)();
    this.setMaxListeners(0);
    this.device = device;
    this._socket = socket;
    this._socket.on("close", () => {
      this._waitForNextTask(() => {
        if (this.onclose)
          this.onclose();
      });
    });
    this._receiver = new import_utilsBundle2.wsReceiver();
    this._receiver.on("message", (message) => {
      this._waitForNextTask(() => {
        if (this.onmessage)
          this.onmessage(JSON.parse(message));
      });
    });
  }
  async _init() {
    await this._socket.write(Buffer.from(`GET /devtools/browser HTTP/1.1\r
Upgrade: WebSocket\r
Connection: Upgrade\r
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r
Sec-WebSocket-Version: 13\r
\r
`));
    await new Promise((f) => this._socket.once("data", f));
    this._socket.on("data", (data) => this._receiver._write(data, "binary", () => {
    }));
  }
  async send(s) {
    await this._socket.write(encodeWebFrame(JSON.stringify(s)));
  }
  async close() {
    this._socket.close();
  }
}
function encodeWebFrame(data) {
  return import_utilsBundle2.wsSender.frame(Buffer.from(data), {
    opcode: 1,
    mask: true,
    fin: true,
    readOnly: true
  })[0];
}
class ClankBrowserProcess {
  constructor(browser) {
    this._browser = browser;
  }
  async kill() {
  }
  async close() {
    await this._browser.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Android,
  AndroidDevice
});
