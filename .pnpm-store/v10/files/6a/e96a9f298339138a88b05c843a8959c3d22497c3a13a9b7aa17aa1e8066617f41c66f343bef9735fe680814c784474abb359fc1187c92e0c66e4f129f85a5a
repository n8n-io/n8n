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
var browserContextFactory_exports = {};
__export(browserContextFactory_exports, {
  SharedContextFactory: () => SharedContextFactory,
  contextFactory: () => contextFactory,
  identityBrowserContextFactory: () => identityBrowserContextFactory
});
module.exports = __toCommonJS(browserContextFactory_exports);
var import_crypto = __toESM(require("crypto"));
var import_fs = __toESM(require("fs"));
var import_net = __toESM(require("net"));
var import_path = __toESM(require("path"));
var playwright = __toESM(require("playwright-core"));
var import_registry = require("playwright-core/lib/server/registry/index");
var import_server = require("playwright-core/lib/server");
var import_log = require("../log");
var import_config = require("./config");
var import_server2 = require("../sdk/server");
function contextFactory(config) {
  if (config.sharedBrowserContext)
    return SharedContextFactory.create(config);
  if (config.browser.remoteEndpoint)
    return new RemoteContextFactory(config);
  if (config.browser.cdpEndpoint)
    return new CdpContextFactory(config);
  if (config.browser.isolated)
    return new IsolatedContextFactory(config);
  return new PersistentContextFactory(config);
}
function identityBrowserContextFactory(browserContext) {
  return {
    createContext: async (clientInfo, abortSignal, options) => {
      return {
        browserContext,
        close: async () => {
        }
      };
    }
  };
}
class BaseContextFactory {
  constructor(name, config) {
    this._logName = name;
    this.config = config;
  }
  async _obtainBrowser(clientInfo, options) {
    if (this._browserPromise)
      return this._browserPromise;
    (0, import_log.testDebug)(`obtain browser (${this._logName})`);
    this._browserPromise = this._doObtainBrowser(clientInfo, options);
    void this._browserPromise.then((browser) => {
      browser.on("disconnected", () => {
        this._browserPromise = void 0;
      });
    }).catch(() => {
      this._browserPromise = void 0;
    });
    return this._browserPromise;
  }
  async _doObtainBrowser(clientInfo, options) {
    throw new Error("Not implemented");
  }
  async createContext(clientInfo, _, options) {
    (0, import_log.testDebug)(`create browser context (${this._logName})`);
    const browser = await this._obtainBrowser(clientInfo, options);
    const browserContext = await this._doCreateContext(browser, clientInfo);
    await addInitScript(browserContext, this.config.browser.initScript);
    return {
      browserContext,
      close: () => this._closeBrowserContext(browserContext, browser)
    };
  }
  async _doCreateContext(browser, clientInfo) {
    throw new Error("Not implemented");
  }
  async _closeBrowserContext(browserContext, browser) {
    (0, import_log.testDebug)(`close browser context (${this._logName})`);
    if (browser.contexts().length === 1)
      this._browserPromise = void 0;
    await browserContext.close().catch(import_log.logUnhandledError);
    if (browser.contexts().length === 0) {
      (0, import_log.testDebug)(`close browser (${this._logName})`);
      await browser.close().catch(import_log.logUnhandledError);
    }
  }
}
class IsolatedContextFactory extends BaseContextFactory {
  constructor(config) {
    super("isolated", config);
  }
  async _doObtainBrowser(clientInfo, options) {
    await injectCdpPort(this.config.browser);
    const browserType = playwright[this.config.browser.browserName];
    const tracesDir = await computeTracesDir(this.config, clientInfo);
    if (tracesDir && this.config.saveTrace)
      await startTraceServer(this.config, tracesDir);
    return browserType.launch({
      tracesDir,
      ...this.config.browser.launchOptions,
      handleSIGINT: false,
      handleSIGTERM: false,
      ...options.forceHeadless !== void 0 ? { headless: options.forceHeadless === "headless" } : {}
    }).catch((error) => {
      if (error.message.includes("Executable doesn't exist"))
        throw new Error(`Browser specified in your config is not installed. Either install it (likely) or change the config.`);
      throw error;
    });
  }
  async _doCreateContext(browser, clientInfo) {
    return browser.newContext(await browserContextOptionsFromConfig(this.config, clientInfo));
  }
}
class CdpContextFactory extends BaseContextFactory {
  constructor(config) {
    super("cdp", config);
  }
  async _doObtainBrowser() {
    return playwright.chromium.connectOverCDP(this.config.browser.cdpEndpoint, {
      headers: this.config.browser.cdpHeaders,
      timeout: this.config.browser.cdpTimeout
    });
  }
  async _doCreateContext(browser) {
    return this.config.browser.isolated ? await browser.newContext() : browser.contexts()[0];
  }
}
class RemoteContextFactory extends BaseContextFactory {
  constructor(config) {
    super("remote", config);
  }
  async _doObtainBrowser() {
    const url = new URL(this.config.browser.remoteEndpoint);
    url.searchParams.set("browser", this.config.browser.browserName);
    if (this.config.browser.launchOptions)
      url.searchParams.set("launch-options", JSON.stringify(this.config.browser.launchOptions));
    return playwright[this.config.browser.browserName].connect(String(url));
  }
  async _doCreateContext(browser) {
    return browser.newContext();
  }
}
class PersistentContextFactory {
  constructor(config) {
    this.name = "persistent";
    this.description = "Create a new persistent browser context";
    this._userDataDirs = /* @__PURE__ */ new Set();
    this.config = config;
  }
  async createContext(clientInfo, abortSignal, options) {
    await injectCdpPort(this.config.browser);
    (0, import_log.testDebug)("create browser context (persistent)");
    const userDataDir = this.config.browser.userDataDir ?? await this._createUserDataDir(clientInfo);
    const tracesDir = await computeTracesDir(this.config, clientInfo);
    if (tracesDir && this.config.saveTrace)
      await startTraceServer(this.config, tracesDir);
    this._userDataDirs.add(userDataDir);
    (0, import_log.testDebug)("lock user data dir", userDataDir);
    const browserType = playwright[this.config.browser.browserName];
    for (let i = 0; i < 5; i++) {
      const launchOptions = {
        tracesDir,
        ...this.config.browser.launchOptions,
        ...await browserContextOptionsFromConfig(this.config, clientInfo),
        handleSIGINT: false,
        handleSIGTERM: false,
        ignoreDefaultArgs: [
          "--disable-extensions"
        ],
        assistantMode: true,
        ...options.forceHeadless !== void 0 ? { headless: options.forceHeadless === "headless" } : {}
      };
      try {
        const browserContext = await browserType.launchPersistentContext(userDataDir, launchOptions);
        await addInitScript(browserContext, this.config.browser.initScript);
        const close = () => this._closeBrowserContext(browserContext, userDataDir);
        return { browserContext, close };
      } catch (error) {
        if (error.message.includes("Executable doesn't exist"))
          throw new Error(`Browser specified in your config is not installed. Either install it (likely) or change the config.`);
        if (error.message.includes("cannot open shared object file: No such file or directory")) {
          const browserName = launchOptions.channel ?? this.config.browser.browserName;
          throw new Error(`Missing system dependencies required to run browser ${browserName}. Install them with: sudo npx playwright install-deps ${browserName}`);
        }
        if (error.message.includes("ProcessSingleton") || // On Windows the process exits silently with code 21 when the profile is in use.
        error.message.includes("exitCode=21")) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Browser is already in use for ${userDataDir}, use --isolated to run multiple instances of the same browser`);
  }
  async _closeBrowserContext(browserContext, userDataDir) {
    (0, import_log.testDebug)("close browser context (persistent)");
    (0, import_log.testDebug)("release user data dir", userDataDir);
    await browserContext.close().catch(() => {
    });
    this._userDataDirs.delete(userDataDir);
    if (process.env.PWMCP_PROFILES_DIR_FOR_TEST && userDataDir.startsWith(process.env.PWMCP_PROFILES_DIR_FOR_TEST))
      await import_fs.default.promises.rm(userDataDir, { recursive: true }).catch(import_log.logUnhandledError);
    (0, import_log.testDebug)("close browser context complete (persistent)");
  }
  async _createUserDataDir(clientInfo) {
    const dir = process.env.PWMCP_PROFILES_DIR_FOR_TEST ?? import_registry.registryDirectory;
    const browserToken = this.config.browser.launchOptions?.channel ?? this.config.browser?.browserName;
    const rootPath = (0, import_server2.firstRootPath)(clientInfo);
    const rootPathToken = rootPath ? `-${createHash(rootPath)}` : "";
    const result = import_path.default.join(dir, `mcp-${browserToken}${rootPathToken}`);
    await import_fs.default.promises.mkdir(result, { recursive: true });
    return result;
  }
}
async function injectCdpPort(browserConfig) {
  if (browserConfig.browserName === "chromium")
    browserConfig.launchOptions.cdpPort = await findFreePort();
}
async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = import_net.default.createServer();
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}
async function startTraceServer(config, tracesDir) {
  if (!config.saveTrace)
    return;
  const server = await (0, import_server.startTraceViewerServer)();
  const urlPrefix = server.urlPrefix("human-readable");
  const url = urlPrefix + "/trace/index.html?trace=" + tracesDir + "/trace.json";
  console.error("\nTrace viewer listening on " + url);
}
function createHash(data) {
  return import_crypto.default.createHash("sha256").update(data).digest("hex").slice(0, 7);
}
async function addInitScript(browserContext, initScript) {
  for (const scriptPath of initScript ?? [])
    await browserContext.addInitScript({ path: import_path.default.resolve(scriptPath) });
}
class SharedContextFactory {
  static create(config) {
    if (SharedContextFactory._instance)
      throw new Error("SharedContextFactory already exists");
    const baseConfig = { ...config, sharedBrowserContext: false };
    const baseFactory = contextFactory(baseConfig);
    SharedContextFactory._instance = new SharedContextFactory(baseFactory);
    return SharedContextFactory._instance;
  }
  constructor(baseFactory) {
    this._baseFactory = baseFactory;
  }
  async createContext(clientInfo, abortSignal, options) {
    if (!this._contextPromise) {
      (0, import_log.testDebug)("create shared browser context");
      this._contextPromise = this._baseFactory.createContext(clientInfo, abortSignal, options);
    }
    const { browserContext } = await this._contextPromise;
    (0, import_log.testDebug)(`shared context client connected`);
    return {
      browserContext,
      close: async () => {
        (0, import_log.testDebug)(`shared context client disconnected`);
      }
    };
  }
  static async dispose() {
    await SharedContextFactory._instance?._dispose();
  }
  async _dispose() {
    const contextPromise = this._contextPromise;
    this._contextPromise = void 0;
    if (!contextPromise)
      return;
    const { close } = await contextPromise;
    await close();
  }
}
async function computeTracesDir(config, clientInfo) {
  if (!config.saveTrace && !config.capabilities?.includes("tracing"))
    return;
  return await (0, import_config.outputFile)(config, clientInfo, `traces`, { origin: "code", title: "Collecting trace" });
}
async function browserContextOptionsFromConfig(config, clientInfo) {
  const result = { ...config.browser.contextOptions };
  if (config.saveVideo) {
    const dir = await (0, import_config.outputFile)(config, clientInfo, `videos`, { origin: "code", title: "Saving video" });
    result.recordVideo = {
      dir,
      size: config.saveVideo
    };
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SharedContextFactory,
  contextFactory,
  identityBrowserContextFactory
});
