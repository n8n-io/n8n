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
var browserType_exports = {};
__export(browserType_exports, {
  BrowserType: () => BrowserType,
  kNoXServerRunningError: () => kNoXServerRunningError
});
module.exports = __toCommonJS(browserType_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_browserContext = require("./browserContext");
var import_debug = require("./utils/debug");
var import_assert = require("../utils/isomorphic/assert");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_time = require("../utils/isomorphic/time");
var import_fileUtils = require("./utils/fileUtils");
var import_helper = require("./helper");
var import_instrumentation = require("./instrumentation");
var import_pipeTransport = require("./pipeTransport");
var import_processLauncher = require("./utils/processLauncher");
var import_protocolError = require("./protocolError");
var import_registry = require("./registry");
var import_socksClientCertificatesInterceptor = require("./socksClientCertificatesInterceptor");
var import_transport = require("./transport");
var import_debugLogger = require("./utils/debugLogger");
const kNoXServerRunningError = "Looks like you launched a headed browser without having a XServer running.\nSet either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright.\n\n<3 Playwright Team";
class BrowserType extends import_instrumentation.SdkObject {
  constructor(parent, browserName) {
    super(parent, "browser-type");
    this.attribution.browserType = this;
    this._name = browserName;
    this.logName = "browser";
  }
  executablePath() {
    return import_registry.registry.findExecutable(this._name).executablePath(this.attribution.playwright.options.sdkLanguage) || "";
  }
  name() {
    return this._name;
  }
  async launch(progress, options, protocolLogger) {
    options = this._validateLaunchOptions(options);
    const seleniumHubUrl = options.__testHookSeleniumRemoteURL || process.env.SELENIUM_REMOTE_URL;
    if (seleniumHubUrl)
      return this._launchWithSeleniumHub(progress, seleniumHubUrl, options);
    return this._innerLaunchWithRetries(progress, options, void 0, import_helper.helper.debugProtocolLogger(protocolLogger)).catch((e) => {
      throw this._rewriteStartupLog(e);
    });
  }
  async launchPersistentContext(progress, userDataDir, options) {
    const launchOptions = this._validateLaunchOptions(options);
    let clientCertificatesProxy;
    if (options.clientCertificates?.length) {
      clientCertificatesProxy = await import_socksClientCertificatesInterceptor.ClientCertificatesProxy.create(progress, options);
      launchOptions.proxyOverride = clientCertificatesProxy.proxySettings();
      options = { ...options };
      options.internalIgnoreHTTPSErrors = true;
    }
    try {
      const browser = await this._innerLaunchWithRetries(progress, launchOptions, options, import_helper.helper.debugProtocolLogger(), userDataDir).catch((e) => {
        throw this._rewriteStartupLog(e);
      });
      browser._defaultContext._clientCertificatesProxy = clientCertificatesProxy;
      return browser._defaultContext;
    } catch (error) {
      await clientCertificatesProxy?.close().catch(() => {
      });
      throw error;
    }
  }
  async _innerLaunchWithRetries(progress, options, persistent, protocolLogger, userDataDir) {
    try {
      return await this._innerLaunch(progress, options, persistent, protocolLogger, userDataDir);
    } catch (error) {
      const errorMessage = typeof error === "object" && typeof error.message === "string" ? error.message : "";
      if (errorMessage.includes("Inconsistency detected by ld.so")) {
        progress.log(`<restarting browser due to hitting race condition in glibc>`);
        return this._innerLaunch(progress, options, persistent, protocolLogger, userDataDir);
      }
      throw error;
    }
  }
  async _innerLaunch(progress, options, persistent, protocolLogger, maybeUserDataDir) {
    options.proxy = options.proxy ? (0, import_browserContext.normalizeProxySettings)(options.proxy) : void 0;
    const browserLogsCollector = new import_debugLogger.RecentLogsCollector();
    const { browserProcess, userDataDir, artifactsDir, transport } = await this._launchProcess(progress, options, !!persistent, browserLogsCollector, maybeUserDataDir);
    try {
      if (options.__testHookBeforeCreateBrowser)
        await progress.race(options.__testHookBeforeCreateBrowser());
      const browserOptions = {
        name: this._name,
        isChromium: this._name === "chromium",
        channel: options.channel,
        slowMo: options.slowMo,
        persistent,
        headful: !options.headless,
        artifactsDir,
        downloadsPath: options.downloadsPath || artifactsDir,
        tracesDir: options.tracesDir || artifactsDir,
        browserProcess,
        customExecutablePath: options.executablePath,
        proxy: options.proxy,
        protocolLogger,
        browserLogsCollector,
        wsEndpoint: transport instanceof import_transport.WebSocketTransport ? transport.wsEndpoint : void 0,
        originalLaunchOptions: options
      };
      if (persistent)
        (0, import_browserContext.validateBrowserContextOptions)(persistent, browserOptions);
      copyTestHooks(options, browserOptions);
      const browser = await progress.race(this.connectToTransport(transport, browserOptions, browserLogsCollector));
      browser._userDataDirForTest = userDataDir;
      if (persistent && !options.ignoreAllDefaultArgs)
        await browser._defaultContext._loadDefaultContext(progress);
      return browser;
    } catch (error) {
      await browserProcess.close().catch(() => {
      });
      throw error;
    }
  }
  async _prepareToLaunch(options, isPersistent, userDataDir) {
    const {
      ignoreDefaultArgs,
      ignoreAllDefaultArgs,
      args = [],
      executablePath = null
    } = options;
    await this._createArtifactDirs(options);
    const tempDirectories = [];
    const artifactsDir = await import_fs.default.promises.mkdtemp(import_path.default.join(import_os.default.tmpdir(), "playwright-artifacts-"));
    tempDirectories.push(artifactsDir);
    if (userDataDir) {
      (0, import_assert.assert)(import_path.default.isAbsolute(userDataDir), "userDataDir must be an absolute path");
      if (!await (0, import_fileUtils.existsAsync)(userDataDir))
        await import_fs.default.promises.mkdir(userDataDir, { recursive: true, mode: 448 });
    } else {
      userDataDir = await import_fs.default.promises.mkdtemp(import_path.default.join(import_os.default.tmpdir(), `playwright_${this._name}dev_profile-`));
      tempDirectories.push(userDataDir);
    }
    await this.prepareUserDataDir(options, userDataDir);
    const browserArguments = [];
    if (ignoreAllDefaultArgs)
      browserArguments.push(...args);
    else if (ignoreDefaultArgs)
      browserArguments.push(...(await this.defaultArgs(options, isPersistent, userDataDir)).filter((arg) => ignoreDefaultArgs.indexOf(arg) === -1));
    else
      browserArguments.push(...await this.defaultArgs(options, isPersistent, userDataDir));
    let executable;
    if (executablePath) {
      if (!await (0, import_fileUtils.existsAsync)(executablePath))
        throw new Error(`Failed to launch ${this._name} because executable doesn't exist at ${executablePath}`);
      executable = executablePath;
    } else {
      const registryExecutable = import_registry.registry.findExecutable(this.getExecutableName(options));
      if (!registryExecutable || registryExecutable.browserName !== this._name)
        throw new Error(`Unsupported ${this._name} channel "${options.channel}"`);
      executable = registryExecutable.executablePathOrDie(this.attribution.playwright.options.sdkLanguage);
      await import_registry.registry.validateHostRequirementsForExecutablesIfNeeded([registryExecutable], this.attribution.playwright.options.sdkLanguage);
    }
    return { executable, browserArguments, userDataDir, artifactsDir, tempDirectories };
  }
  async _launchProcess(progress, options, isPersistent, browserLogsCollector, userDataDir) {
    const {
      handleSIGINT = true,
      handleSIGTERM = true,
      handleSIGHUP = true
    } = options;
    const env = options.env ? (0, import_processLauncher.envArrayToObject)(options.env) : process.env;
    const prepared = await progress.race(this._prepareToLaunch(options, isPersistent, userDataDir));
    let transport = void 0;
    let browserProcess = void 0;
    const exitPromise = new import_manualPromise.ManualPromise();
    const { launchedProcess, gracefullyClose, kill } = await (0, import_processLauncher.launchProcess)({
      command: prepared.executable,
      args: prepared.browserArguments,
      env: this.amendEnvironment(env, prepared.userDataDir, isPersistent, options),
      handleSIGINT,
      handleSIGTERM,
      handleSIGHUP,
      log: (message) => {
        progress.log(message);
        browserLogsCollector.log(message);
      },
      stdio: "pipe",
      tempDirectories: prepared.tempDirectories,
      attemptToGracefullyClose: async () => {
        if (options.__testHookGracefullyClose)
          await options.__testHookGracefullyClose();
        if (transport) {
          this.attemptToGracefullyCloseBrowser(transport);
        } else {
          throw new Error("Force-killing the browser because no transport is available to gracefully close it.");
        }
      },
      onExit: (exitCode, signal) => {
        exitPromise.resolve();
        if (browserProcess && browserProcess.onclose)
          browserProcess.onclose(exitCode, signal);
      }
    });
    async function closeOrKill(timeout) {
      let timer;
      try {
        await Promise.race([
          gracefullyClose(),
          new Promise((resolve, reject) => timer = setTimeout(reject, timeout))
        ]);
      } catch (ignored) {
        await kill().catch((ignored2) => {
        });
      } finally {
        clearTimeout(timer);
      }
    }
    browserProcess = {
      onclose: void 0,
      process: launchedProcess,
      close: () => closeOrKill(options.__testHookBrowserCloseTimeout || import_time.DEFAULT_PLAYWRIGHT_TIMEOUT),
      kill
    };
    try {
      const { wsEndpoint } = await progress.race([
        this.waitForReadyState(options, browserLogsCollector),
        exitPromise.then(() => ({ wsEndpoint: void 0 }))
      ]);
      if (exitPromise.isDone()) {
        const log = import_helper.helper.formatBrowserLogs(browserLogsCollector.recentLogs());
        const updatedLog = this.doRewriteStartupLog(log);
        throw new Error(`Failed to launch the browser process.
Browser logs:
${updatedLog}`);
      }
      if (options.cdpPort !== void 0 || !this.supportsPipeTransport()) {
        transport = await import_transport.WebSocketTransport.connect(progress, wsEndpoint);
      } else {
        const stdio = launchedProcess.stdio;
        transport = new import_pipeTransport.PipeTransport(stdio[3], stdio[4]);
      }
      return { browserProcess, artifactsDir: prepared.artifactsDir, userDataDir: prepared.userDataDir, transport };
    } catch (error) {
      await closeOrKill(import_time.DEFAULT_PLAYWRIGHT_TIMEOUT).catch(() => {
      });
      throw error;
    }
  }
  async _createArtifactDirs(options) {
    if (options.downloadsPath)
      await import_fs.default.promises.mkdir(options.downloadsPath, { recursive: true });
    if (options.tracesDir)
      await import_fs.default.promises.mkdir(options.tracesDir, { recursive: true });
  }
  async connectOverCDP(progress, endpointURL, options) {
    throw new Error("CDP connections are only supported by Chromium");
  }
  async _launchWithSeleniumHub(progress, hubUrl, options) {
    throw new Error("Connecting to SELENIUM_REMOTE_URL is only supported by Chromium");
  }
  _validateLaunchOptions(options) {
    let { headless = true, downloadsPath, proxy } = options;
    if ((0, import_debug.debugMode)() === "inspector")
      headless = false;
    if (downloadsPath && !import_path.default.isAbsolute(downloadsPath))
      downloadsPath = import_path.default.join(process.cwd(), downloadsPath);
    if (options.socksProxyPort)
      proxy = { server: `socks5://127.0.0.1:${options.socksProxyPort}` };
    return { ...options, headless, downloadsPath, proxy };
  }
  _createUserDataDirArgMisuseError(userDataDirArg) {
    switch (this.attribution.playwright.options.sdkLanguage) {
      case "java":
        return new Error(`Pass userDataDir parameter to 'BrowserType.launchPersistentContext(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
      case "python":
        return new Error(`Pass user_data_dir parameter to 'browser_type.launch_persistent_context(user_data_dir, **kwargs)' instead of specifying '${userDataDirArg}' argument`);
      case "csharp":
        return new Error(`Pass userDataDir parameter to 'BrowserType.LaunchPersistentContextAsync(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
      default:
        return new Error(`Pass userDataDir parameter to 'browserType.launchPersistentContext(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
    }
  }
  _rewriteStartupLog(error) {
    if (!(0, import_protocolError.isProtocolError)(error))
      return error;
    if (error.logs)
      error.logs = this.doRewriteStartupLog(error.logs);
    return error;
  }
  async waitForReadyState(options, browserLogsCollector) {
    return {};
  }
  async prepareUserDataDir(options, userDataDir) {
  }
  supportsPipeTransport() {
    return true;
  }
  getExecutableName(options) {
    return options.channel || this._name;
  }
}
function copyTestHooks(from, to) {
  for (const [key, value] of Object.entries(from)) {
    if (key.startsWith("__testHook"))
      to[key] = value;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserType,
  kNoXServerRunningError
});
