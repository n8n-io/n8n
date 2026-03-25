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
var testServer_exports = {};
__export(testServer_exports, {
  TestServerDispatcher: () => TestServerDispatcher,
  runTestServer: () => runTestServer,
  runUIMode: () => runUIMode
});
module.exports = __toCommonJS(testServer_exports);
var import_util = __toESM(require("util"));
var import_server = require("playwright-core/lib/server");
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_configLoader = require("../common/configLoader");
var import_list = __toESM(require("../reporters/list"));
var import_reporters = require("./reporters");
var import_sigIntWatcher = require("./sigIntWatcher");
var import_testRunner = require("./testRunner");
const originalDebugLog = import_utilsBundle.debug.log;
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;
const originalStdinIsTTY = process.stdin.isTTY;
class TestServer {
  constructor(configLocation, configCLIOverrides) {
    this._configLocation = configLocation;
    this._configCLIOverrides = configCLIOverrides;
  }
  async start(options) {
    this._dispatcher = new TestServerDispatcher(this._configLocation, this._configCLIOverrides);
    return await (0, import_server.startTraceViewerServer)({ ...options, transport: this._dispatcher.transport });
  }
  async stop() {
    await this._dispatcher?.stop();
  }
}
class TestServerDispatcher {
  constructor(configLocation, configCLIOverrides) {
    this._serializer = require.resolve("./uiModeReporter");
    this._closeOnDisconnect = false;
    this._testRunner = new import_testRunner.TestRunner(configLocation, configCLIOverrides);
    this.transport = {
      onconnect: () => {
      },
      dispatch: (method, params) => this[method](params),
      onclose: () => {
        if (this._closeOnDisconnect)
          (0, import_utils.gracefullyProcessExitDoNotHang)(0);
      }
    };
    this._dispatchEvent = (method, params) => this.transport.sendEvent?.(method, params);
    this._testRunner.on(import_testRunner.TestRunnerEvent.TestFilesChanged, (testFiles) => this._dispatchEvent("testFilesChanged", { testFiles }));
    this._testRunner.on(import_testRunner.TestRunnerEvent.TestPaused, (params) => this._dispatchEvent("testPaused", { errors: params.errors }));
  }
  async _wireReporter(messageSink) {
    return await (0, import_reporters.createReporterForTestServer)(this._serializer, messageSink);
  }
  async _collectingReporter() {
    const report = [];
    return {
      reporter: await (0, import_reporters.createReporterForTestServer)(this._serializer, (e) => report.push(e)),
      report
    };
  }
  async initialize(params) {
    this._serializer = params.serializer || require.resolve("./uiModeReporter");
    this._closeOnDisconnect = !!params.closeOnDisconnect;
    await this._testRunner.initialize({
      ...params
    });
    this._setInterceptStdio(!!params.interceptStdio);
  }
  async ping() {
  }
  async open(params) {
    if ((0, import_utils.isUnderTest)())
      return;
    (0, import_utilsBundle.open)("vscode://file/" + params.location.file + ":" + params.location.line).catch((e) => console.error(e));
  }
  async resizeTerminal(params) {
    this._testRunner.resizeTerminal(params);
  }
  async checkBrowsers() {
    return { hasBrowsers: this._testRunner.hasSomeBrowsers() };
  }
  async installBrowsers() {
    await this._testRunner.installBrowsers();
  }
  async runGlobalSetup(params) {
    const { reporter, report } = await this._collectingReporter();
    this._globalSetupReport = report;
    const { status, env } = await this._testRunner.runGlobalSetup([reporter, new import_list.default()]);
    return { report, status, env };
  }
  async runGlobalTeardown() {
    const { status } = await this._testRunner.runGlobalTeardown();
    const report = this._globalSetupReport || [];
    this._globalSetupReport = void 0;
    return { status, report };
  }
  async startDevServer(params) {
    await this.stopDevServer({});
    const { reporter, report } = await this._collectingReporter();
    const { status } = await this._testRunner.startDevServer(reporter, "out-of-process");
    return { report, status };
  }
  async stopDevServer(params) {
    const { status } = await this._testRunner.stopDevServer();
    const report = this._devServerReport || [];
    this._devServerReport = void 0;
    return { status, report };
  }
  async clearCache(params) {
    await this._testRunner.clearCache();
  }
  async listFiles(params) {
    const { reporter, report } = await this._collectingReporter();
    const { status } = await this._testRunner.listFiles(reporter, params.projects);
    return { report, status };
  }
  async listTests(params) {
    const { reporter, report } = await this._collectingReporter();
    const { status } = await this._testRunner.listTests(reporter, params);
    return { report, status };
  }
  async runTests(params) {
    const wireReporter = await this._wireReporter((e) => this._dispatchEvent("report", e));
    const { status } = await this._testRunner.runTests(wireReporter, {
      ...params,
      doNotRunDepsOutsideProjectFilter: true,
      pauseAtEnd: params.pauseAtEnd,
      pauseOnError: params.pauseOnError
    });
    return { status };
  }
  async watch(params) {
    await this._testRunner.watch(params.fileNames);
  }
  async findRelatedTestFiles(params) {
    return this._testRunner.findRelatedTestFiles(params.files);
  }
  async stopTests() {
    await this._testRunner.stopTests();
  }
  async stop() {
    this._setInterceptStdio(false);
    await this._testRunner.stop();
  }
  async closeGracefully() {
    await this._testRunner.closeGracefully();
  }
  _setInterceptStdio(interceptStdio) {
    if (process.env.PWTEST_DEBUG)
      return;
    if (interceptStdio) {
      if (import_utilsBundle.debug.log === originalDebugLog) {
        import_utilsBundle.debug.log = (...args) => {
          const string = import_util.default.format(...args) + "\n";
          return originalStderrWrite.apply(process.stderr, [string]);
        };
      }
      const stdoutWrite = (chunk) => {
        this._dispatchEvent("stdio", chunkToPayload("stdout", chunk));
        return true;
      };
      const stderrWrite = (chunk) => {
        this._dispatchEvent("stdio", chunkToPayload("stderr", chunk));
        return true;
      };
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
      process.stdin.isTTY = void 0;
    } else {
      import_utilsBundle.debug.log = originalDebugLog;
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      process.stdin.isTTY = originalStdinIsTTY;
    }
  }
}
async function runUIMode(configFile, configCLIOverrides, options) {
  const configLocation = (0, import_configLoader.resolveConfigLocation)(configFile);
  return await innerRunTestServer(configLocation, configCLIOverrides, options, async (server, cancelPromise) => {
    await (0, import_server.installRootRedirect)(server, void 0, { ...options, webApp: "uiMode.html" });
    if (options.host !== void 0 || options.port !== void 0) {
      await (0, import_server.openTraceInBrowser)(server.urlPrefix("human-readable"));
    } else {
      const channel = await installedChromiumChannelForUI(configLocation, configCLIOverrides);
      const page = await (0, import_server.openTraceViewerApp)(server.urlPrefix("precise"), "chromium", {
        headless: (0, import_utils.isUnderTest)() && process.env.PWTEST_HEADED_FOR_TEST !== "1",
        persistentContextOptions: {
          handleSIGINT: false,
          channel
        }
      });
      page.on("close", () => cancelPromise.resolve());
    }
  });
}
async function installedChromiumChannelForUI(configLocation, configCLIOverrides) {
  const config = await (0, import_configLoader.loadConfig)(configLocation, configCLIOverrides).catch((e) => null);
  if (!config)
    return void 0;
  if (config.projects.some((p) => (!p.project.use.browserName || p.project.use.browserName === "chromium") && !p.project.use.channel))
    return void 0;
  for (const channel of ["chromium", "chrome", "msedge"]) {
    if (config.projects.some((p) => p.project.use.channel === channel))
      return channel;
  }
  return void 0;
}
async function runTestServer(configFile, configCLIOverrides, options) {
  const configLocation = (0, import_configLoader.resolveConfigLocation)(configFile);
  return await innerRunTestServer(configLocation, configCLIOverrides, options, async (server) => {
    console.log("Listening on " + server.urlPrefix("precise").replace("http:", "ws:") + "/" + server.wsGuid());
  });
}
async function innerRunTestServer(configLocation, configCLIOverrides, options, openUI) {
  const testServer = new TestServer(configLocation, configCLIOverrides);
  const cancelPromise = new import_utils.ManualPromise();
  const sigintWatcher = new import_sigIntWatcher.SigIntWatcher();
  process.stdin.on("close", () => (0, import_utils.gracefullyProcessExitDoNotHang)(0));
  void sigintWatcher.promise().then(() => cancelPromise.resolve());
  try {
    const server = await testServer.start(options);
    await openUI(server, cancelPromise);
    await cancelPromise;
  } finally {
    await testServer.stop();
    sigintWatcher.disarm();
  }
  return sigintWatcher.hadSignal() ? "interrupted" : "passed";
}
function chunkToPayload(type, chunk) {
  if (chunk instanceof Uint8Array)
    return { type, buffer: chunk.toString("base64") };
  return { type, text: chunk };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestServerDispatcher,
  runTestServer,
  runUIMode
});
