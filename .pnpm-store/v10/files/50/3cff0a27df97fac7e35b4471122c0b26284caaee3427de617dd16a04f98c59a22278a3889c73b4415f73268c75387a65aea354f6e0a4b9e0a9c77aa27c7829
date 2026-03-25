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
var testRunner_exports = {};
__export(testRunner_exports, {
  TestRunner: () => TestRunner,
  TestRunnerEvent: () => TestRunnerEvent,
  runAllTestsWithConfig: () => runAllTestsWithConfig
});
module.exports = __toCommonJS(testRunner_exports);
var import_events = __toESM(require("events"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_server = require("playwright-core/lib/server");
var import_utils = require("playwright-core/lib/utils");
var import_configLoader = require("../common/configLoader");
var import_fsWatcher = require("../fsWatcher");
var import_teleReceiver = require("../isomorphic/teleReceiver");
var import_gitCommitInfoPlugin = require("../plugins/gitCommitInfoPlugin");
var import_webServerPlugin = require("../plugins/webServerPlugin");
var import_base = require("../reporters/base");
var import_internalReporter = require("../reporters/internalReporter");
var import_compilationCache = require("../transform/compilationCache");
var import_util = require("../util");
var import_reporters = require("./reporters");
var import_tasks = require("./tasks");
var import_lastRun = require("./lastRun");
const TestRunnerEvent = {
  TestFilesChanged: "testFilesChanged",
  TestPaused: "testPaused"
};
class TestRunner extends import_events.default {
  constructor(configLocation, configCLIOverrides) {
    super();
    this._watchedProjectDirs = /* @__PURE__ */ new Set();
    this._ignoredProjectOutputs = /* @__PURE__ */ new Set();
    this._watchedTestDependencies = /* @__PURE__ */ new Set();
    this._queue = Promise.resolve();
    this._watchTestDirs = false;
    this._populateDependenciesOnList = false;
    this._startingEnv = {};
    this.configLocation = configLocation;
    this._configCLIOverrides = configCLIOverrides;
    this._watcher = new import_fsWatcher.Watcher((events) => {
      const collector = /* @__PURE__ */ new Set();
      events.forEach((f) => (0, import_compilationCache.collectAffectedTestFiles)(f.file, collector));
      this.emit(TestRunnerEvent.TestFilesChanged, [...collector]);
    });
  }
  async initialize(params) {
    (0, import_utils.setPlaywrightTestProcessEnv)();
    this._watchTestDirs = !!params.watchTestDirs;
    this._populateDependenciesOnList = !!params.populateDependenciesOnList;
    this._startingEnv = { ...process.env };
  }
  resizeTerminal(params) {
    process.stdout.columns = params.cols;
    process.stdout.rows = params.rows;
    process.stderr.columns = params.cols;
    process.stderr.rows = params.rows;
  }
  hasSomeBrowsers() {
    for (const browserName of ["chromium", "webkit", "firefox"]) {
      try {
        import_server.registry.findExecutable(browserName).executablePathOrDie("javascript");
        return true;
      } catch {
      }
    }
    return false;
  }
  async installBrowsers() {
    const executables = import_server.registry.defaultExecutables();
    await import_server.registry.install(executables);
  }
  async loadConfig() {
    const { config, error } = await this._loadConfig(this._configCLIOverrides);
    if (config)
      return config;
    throw new Error("Failed to load config: " + (error ? error.message : "Unknown error"));
  }
  async runGlobalSetup(userReporters) {
    await this.runGlobalTeardown();
    const reporter = new import_internalReporter.InternalReporter(userReporters);
    const config = await this._loadConfigOrReportError(reporter, this._configCLIOverrides);
    if (!config)
      return { status: "failed", env: [] };
    const { status, cleanup } = await (0, import_tasks.runTasksDeferCleanup)(new import_tasks.TestRun(config, reporter), [
      ...(0, import_tasks.createGlobalSetupTasks)(config)
    ]);
    const env = [];
    for (const key of /* @__PURE__ */ new Set([...Object.keys(process.env), ...Object.keys(this._startingEnv)])) {
      if (this._startingEnv[key] !== process.env[key])
        env.push([key, process.env[key] ?? null]);
    }
    if (status !== "passed")
      await cleanup();
    else
      this._globalSetup = { cleanup };
    return { status, env };
  }
  async runGlobalTeardown() {
    const globalSetup = this._globalSetup;
    const status = await globalSetup?.cleanup();
    this._globalSetup = void 0;
    return { status };
  }
  async startDevServer(userReporter, mode) {
    await this.stopDevServer();
    const reporter = new import_internalReporter.InternalReporter([userReporter]);
    const config = await this._loadConfigOrReportError(reporter);
    if (!config)
      return { status: "failed" };
    const { status, cleanup } = await (0, import_tasks.runTasksDeferCleanup)(new import_tasks.TestRun(config, reporter), [
      ...(0, import_tasks.createPluginSetupTasks)(config),
      (0, import_tasks.createLoadTask)(mode, { failOnLoadErrors: true, filterOnly: false }),
      (0, import_tasks.createStartDevServerTask)()
    ]);
    if (status !== "passed")
      await cleanup();
    else
      this._devServer = { cleanup };
    return { status };
  }
  async stopDevServer() {
    const devServer = this._devServer;
    const status = await devServer?.cleanup();
    this._devServer = void 0;
    return { status };
  }
  async clearCache(userReporter) {
    const reporter = new import_internalReporter.InternalReporter(userReporter ? [userReporter] : []);
    const config = await this._loadConfigOrReportError(reporter);
    if (!config)
      return { status: "failed" };
    const status = await (0, import_tasks.runTasks)(new import_tasks.TestRun(config, reporter), [
      ...(0, import_tasks.createPluginSetupTasks)(config),
      (0, import_tasks.createClearCacheTask)(config)
    ]);
    return { status };
  }
  async listFiles(userReporter, projects) {
    const reporter = new import_internalReporter.InternalReporter([userReporter]);
    const config = await this._loadConfigOrReportError(reporter);
    if (!config)
      return { status: "failed" };
    config.cliProjectFilter = projects?.length ? projects : void 0;
    const status = await (0, import_tasks.runTasks)(new import_tasks.TestRun(config, reporter), [
      (0, import_tasks.createListFilesTask)(),
      (0, import_tasks.createReportBeginTask)()
    ]);
    return { status };
  }
  async listTests(userReporter, params) {
    let result;
    this._queue = this._queue.then(async () => {
      const { config, status } = await this._innerListTests(userReporter, params);
      if (config)
        await this._updateWatchedDirs(config);
      result = { status };
    }).catch(printInternalError);
    await this._queue;
    return result;
  }
  async _innerListTests(userReporter, params) {
    const overrides = {
      ...this._configCLIOverrides,
      repeatEach: 1,
      retries: 0
    };
    const reporter = new import_internalReporter.InternalReporter([userReporter]);
    const config = await this._loadConfigOrReportError(reporter, overrides);
    if (!config)
      return { status: "failed" };
    config.cliArgs = params.locations || [];
    config.cliGrep = params.grep;
    config.cliGrepInvert = params.grepInvert;
    config.cliProjectFilter = params.projects?.length ? params.projects : void 0;
    config.cliListOnly = true;
    const status = await (0, import_tasks.runTasks)(new import_tasks.TestRun(config, reporter), [
      (0, import_tasks.createLoadTask)("out-of-process", { failOnLoadErrors: false, filterOnly: false, populateDependencies: this._populateDependenciesOnList }),
      (0, import_tasks.createReportBeginTask)()
    ]);
    return { config, status };
  }
  async _updateWatchedDirs(config) {
    this._watchedProjectDirs = /* @__PURE__ */ new Set();
    this._ignoredProjectOutputs = /* @__PURE__ */ new Set();
    for (const p of config.projects) {
      this._watchedProjectDirs.add(p.project.testDir);
      this._ignoredProjectOutputs.add(p.project.outputDir);
    }
    const result = await resolveCtDirs(config);
    if (result) {
      this._watchedProjectDirs.add(result.templateDir);
      this._ignoredProjectOutputs.add(result.outDir);
    }
    if (this._watchTestDirs)
      await this._updateWatcher(false);
  }
  async _updateWatcher(reportPending) {
    await this._watcher.update([...this._watchedProjectDirs, ...this._watchedTestDependencies], [...this._ignoredProjectOutputs], reportPending);
  }
  async runTests(userReporter, params) {
    let result = { status: "passed" };
    this._queue = this._queue.then(async () => {
      result = await this._innerRunTests(userReporter, params).catch((e) => {
        printInternalError(e);
        return { status: "failed" };
      });
    });
    await this._queue;
    return result;
  }
  async _innerRunTests(userReporter, params) {
    await this.stopTests();
    const overrides = {
      ...this._configCLIOverrides,
      repeatEach: 1,
      retries: 0,
      timeout: params.timeout,
      preserveOutputDir: true,
      reporter: params.reporters ? params.reporters.map((r) => [r]) : void 0,
      use: {
        ...this._configCLIOverrides.use,
        ...params.trace === "on" ? { trace: { mode: "on", sources: false, _live: true } } : {},
        ...params.trace === "off" ? { trace: "off" } : {},
        ...params.video === "on" || params.video === "off" ? { video: params.video } : {},
        ...params.headed !== void 0 ? { headless: !params.headed } : {},
        _optionContextReuseMode: params.reuseContext ? "when-possible" : void 0,
        _optionConnectOptions: params.connectWsEndpoint ? { wsEndpoint: params.connectWsEndpoint } : void 0,
        actionTimeout: params.actionTimeout
      },
      ...params.updateSnapshots ? { updateSnapshots: params.updateSnapshots } : {},
      ...params.updateSourceMethod ? { updateSourceMethod: params.updateSourceMethod } : {},
      ...params.runAgents ? { runAgents: params.runAgents } : {},
      ...params.workers ? { workers: params.workers } : {}
    };
    const config = await this._loadConfigOrReportError(new import_internalReporter.InternalReporter([userReporter]), overrides);
    if (!config)
      return { status: "failed" };
    config.cliListOnly = false;
    config.cliPassWithNoTests = true;
    config.cliArgs = params.locations;
    config.cliGrep = params.grep;
    config.cliGrepInvert = params.grepInvert;
    config.cliProjectFilter = params.projects?.length ? params.projects : void 0;
    config.preOnlyTestFilters = [];
    if (params.testIds) {
      const testIdSet = new Set(params.testIds);
      config.preOnlyTestFilters.push((test) => testIdSet.has(test.id));
    }
    const configReporters = params.disableConfigReporters ? [] : await (0, import_reporters.createReporters)(config, "test");
    const reporter = new import_internalReporter.InternalReporter([...configReporters, userReporter]);
    const stop = new import_utils.ManualPromise();
    const tasks = [
      (0, import_tasks.createApplyRebaselinesTask)(),
      (0, import_tasks.createLoadTask)("out-of-process", { filterOnly: true, failOnLoadErrors: !!params.failOnLoadErrors, doNotRunDepsOutsideProjectFilter: params.doNotRunDepsOutsideProjectFilter }),
      ...(0, import_tasks.createRunTestsTasks)(config)
    ];
    const testRun = new import_tasks.TestRun(config, reporter, { pauseOnError: params.pauseOnError, pauseAtEnd: params.pauseAtEnd });
    testRun.failureTracker.onTestPaused = (params2) => this.emit(TestRunnerEvent.TestPaused, params2);
    const run = (0, import_tasks.runTasks)(testRun, tasks, 0, stop).then(async (status) => {
      this._testRun = void 0;
      return status;
    });
    this._testRun = { run, stop };
    return { status: await run };
  }
  async watch(fileNames) {
    this._watchedTestDependencies = /* @__PURE__ */ new Set();
    for (const fileName of fileNames) {
      this._watchedTestDependencies.add(fileName);
      (0, import_compilationCache.dependenciesForTestFile)(fileName).forEach((file) => this._watchedTestDependencies.add(file));
    }
    await this._updateWatcher(true);
  }
  async findRelatedTestFiles(files, userReporter) {
    const errorReporter = (0, import_reporters.createErrorCollectingReporter)(import_base.internalScreen);
    const reporter = new import_internalReporter.InternalReporter(userReporter ? [userReporter, errorReporter] : [errorReporter]);
    const config = await this._loadConfigOrReportError(reporter);
    if (!config)
      return { errors: errorReporter.errors(), testFiles: [] };
    const status = await (0, import_tasks.runTasks)(new import_tasks.TestRun(config, reporter), [
      ...(0, import_tasks.createPluginSetupTasks)(config),
      (0, import_tasks.createLoadTask)("out-of-process", { failOnLoadErrors: true, filterOnly: false, populateDependencies: true })
    ]);
    if (status !== "passed")
      return { errors: errorReporter.errors(), testFiles: [] };
    return { testFiles: (0, import_compilationCache.affectedTestFiles)(files) };
  }
  async stopTests() {
    this._testRun?.stop?.resolve();
    await this._testRun?.run;
  }
  async closeGracefully() {
    (0, import_utils.gracefullyProcessExitDoNotHang)(0);
  }
  async stop() {
    await this.runGlobalTeardown();
  }
  async _loadConfig(overrides) {
    try {
      const config = await (0, import_configLoader.loadConfig)(this.configLocation, overrides);
      if (!this._plugins) {
        (0, import_webServerPlugin.webServerPluginsForConfig)(config).forEach((p) => config.plugins.push({ factory: p }));
        (0, import_gitCommitInfoPlugin.addGitCommitInfoPlugin)(config);
        this._plugins = config.plugins || [];
      } else {
        config.plugins.splice(0, config.plugins.length, ...this._plugins);
      }
      return { config };
    } catch (e) {
      return { config: null, error: (0, import_util.serializeError)(e) };
    }
  }
  async _loadConfigOrReportError(reporter, overrides) {
    const { config, error } = await this._loadConfig(overrides);
    if (config)
      return config;
    reporter.onConfigure(import_teleReceiver.baseFullConfig);
    reporter.onError(error);
    await reporter.onEnd({ status: "failed" });
    await reporter.onExit();
    return null;
  }
}
function printInternalError(e) {
  console.error("Internal error:", e);
}
async function resolveCtDirs(config) {
  const use = config.config.projects[0].use;
  const relativeTemplateDir = use.ctTemplateDir || "playwright";
  const templateDir = await import_fs.default.promises.realpath(import_path.default.normalize(import_path.default.join(config.configDir, relativeTemplateDir))).catch(() => void 0);
  if (!templateDir)
    return null;
  const outDir = use.ctCacheDir ? import_path.default.resolve(config.configDir, use.ctCacheDir) : import_path.default.resolve(templateDir, ".cache");
  return {
    outDir,
    templateDir
  };
}
async function runAllTestsWithConfig(config) {
  (0, import_utils.setPlaywrightTestProcessEnv)();
  const listOnly = config.cliListOnly;
  (0, import_gitCommitInfoPlugin.addGitCommitInfoPlugin)(config);
  (0, import_webServerPlugin.webServerPluginsForConfig)(config).forEach((p) => config.plugins.push({ factory: p }));
  const reporters = await (0, import_reporters.createReporters)(config, listOnly ? "list" : "test");
  const lastRun = new import_lastRun.LastRunReporter(config);
  if (config.cliLastFailed)
    await lastRun.filterLastFailed();
  const reporter = new import_internalReporter.InternalReporter([...reporters, lastRun]);
  const tasks = listOnly ? [
    (0, import_tasks.createLoadTask)("in-process", { failOnLoadErrors: true, filterOnly: false }),
    (0, import_tasks.createReportBeginTask)()
  ] : [
    (0, import_tasks.createApplyRebaselinesTask)(),
    ...(0, import_tasks.createGlobalSetupTasks)(config),
    (0, import_tasks.createLoadTask)("in-process", { filterOnly: true, failOnLoadErrors: true }),
    ...(0, import_tasks.createRunTestsTasks)(config)
  ];
  const testRun = new import_tasks.TestRun(config, reporter, { pauseAtEnd: config.configCLIOverrides.pause, pauseOnError: config.configCLIOverrides.pause });
  const status = await (0, import_tasks.runTasks)(testRun, tasks, config.config.globalTimeout);
  await new Promise((resolve) => process.stdout.write("", () => resolve()));
  await new Promise((resolve) => process.stderr.write("", () => resolve()));
  return status;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestRunner,
  TestRunnerEvent,
  runAllTestsWithConfig
});
