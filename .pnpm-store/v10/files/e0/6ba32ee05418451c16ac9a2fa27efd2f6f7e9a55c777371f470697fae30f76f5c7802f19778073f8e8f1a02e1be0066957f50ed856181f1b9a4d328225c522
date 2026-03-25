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
var context_exports = {};
__export(context_exports, {
  Context: () => Context
});
module.exports = __toCommonJS(context_exports);
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_utils = require("playwright-core/lib/utils");
var import_playwright_core = require("playwright-core");
var import_url = require("url");
var import_os = __toESM(require("os"));
var import_log = require("../log");
var import_tab = require("./tab");
var import_config = require("./config");
const testDebug = (0, import_utilsBundle.debug)("pw:mcp:test");
class Context {
  constructor(options) {
    this._tabs = [];
    this._abortController = new AbortController();
    this.config = options.config;
    this.sessionLog = options.sessionLog;
    this.options = options;
    this._browserContextFactory = options.browserContextFactory;
    this._clientInfo = options.clientInfo;
    testDebug("create context");
    Context._allContexts.add(this);
  }
  static {
    this._allContexts = /* @__PURE__ */ new Set();
  }
  static async disposeAll() {
    await Promise.all([...Context._allContexts].map((context) => context.dispose()));
  }
  tabs() {
    return this._tabs;
  }
  currentTab() {
    return this._currentTab;
  }
  currentTabOrDie() {
    if (!this._currentTab)
      throw new Error("No open pages available.");
    return this._currentTab;
  }
  async newTab() {
    const { browserContext } = await this._ensureBrowserContext({});
    const page = await browserContext.newPage();
    this._currentTab = this._tabs.find((t) => t.page === page);
    return this._currentTab;
  }
  async selectTab(index) {
    const tab = this._tabs[index];
    if (!tab)
      throw new Error(`Tab ${index} not found`);
    await tab.page.bringToFront();
    this._currentTab = tab;
    return tab;
  }
  async ensureTab(options = {}) {
    const { browserContext } = await this._ensureBrowserContext(options);
    if (!this._currentTab)
      await browserContext.newPage();
    return this._currentTab;
  }
  async closeTab(index) {
    const tab = index === void 0 ? this._currentTab : this._tabs[index];
    if (!tab)
      throw new Error(`Tab ${index} not found`);
    const url = tab.page.url();
    await tab.page.close();
    return url;
  }
  async outputFile(fileName, options) {
    return (0, import_config.outputFile)(this.config, this._clientInfo, fileName, options);
  }
  _onPageCreated(page) {
    const tab = new import_tab.Tab(this, page, (tab2) => this._onPageClosed(tab2));
    this._tabs.push(tab);
    if (!this._currentTab)
      this._currentTab = tab;
  }
  _onPageClosed(tab) {
    const index = this._tabs.indexOf(tab);
    if (index === -1)
      return;
    this._tabs.splice(index, 1);
    if (this._currentTab === tab)
      this._currentTab = this._tabs[Math.min(index, this._tabs.length - 1)];
    if (!this._tabs.length)
      void this.closeBrowserContext();
  }
  async closeBrowserContext() {
    if (!this._closeBrowserContextPromise)
      this._closeBrowserContextPromise = this._closeBrowserContextImpl().catch(import_log.logUnhandledError);
    await this._closeBrowserContextPromise;
    this._closeBrowserContextPromise = void 0;
  }
  isRunningTool() {
    return this._runningToolName !== void 0;
  }
  setRunningTool(name) {
    this._runningToolName = name;
  }
  async _closeBrowserContextImpl() {
    if (!this._browserContextPromise)
      return;
    testDebug("close context");
    const promise = this._browserContextPromise;
    this._browserContextPromise = void 0;
    this._browserContextOption = void 0;
    await promise.then(async ({ browserContext, close }) => {
      if (this.config.saveTrace)
        await browserContext.tracing.stop();
      await close();
    });
  }
  async dispose() {
    this._abortController.abort("MCP context disposed");
    await this.closeBrowserContext();
    Context._allContexts.delete(this);
  }
  async _setupRequestInterception(context) {
    if (this.config.network?.allowedOrigins?.length) {
      await context.route("**", (route) => route.abort("blockedbyclient"));
      for (const origin of this.config.network.allowedOrigins)
        await context.route(originOrHostGlob(origin), (route) => route.continue());
    }
    if (this.config.network?.blockedOrigins?.length) {
      for (const origin of this.config.network.blockedOrigins)
        await context.route(originOrHostGlob(origin), (route) => route.abort("blockedbyclient"));
    }
  }
  async ensureBrowserContext(options = {}) {
    const { browserContext } = await this._ensureBrowserContext(options);
    return browserContext;
  }
  _ensureBrowserContext(options) {
    if (this._browserContextPromise && (options.forceHeadless === void 0 || this._browserContextOption?.forceHeadless === options.forceHeadless))
      return this._browserContextPromise;
    const closePrework = this._browserContextPromise ? this.closeBrowserContext() : Promise.resolve();
    this._browserContextPromise = closePrework.then(() => this._setupBrowserContext(options));
    this._browserContextPromise.catch(() => {
      this._browserContextPromise = void 0;
      this._browserContextOption = void 0;
    });
    this._browserContextOption = options;
    return this._browserContextPromise;
  }
  async _setupBrowserContext(options) {
    if (this._closeBrowserContextPromise)
      throw new Error("Another browser context is being closed.");
    if (this.config.testIdAttribute)
      import_playwright_core.selectors.setTestIdAttribute(this.config.testIdAttribute);
    const result = await this._browserContextFactory.createContext(this._clientInfo, this._abortController.signal, { toolName: this._runningToolName, ...options });
    const { browserContext } = result;
    if (!this.config.allowUnrestrictedFileAccess) {
      browserContext._setAllowedProtocols(["http:", "https:", "about:", "data:"]);
      browserContext._setAllowedDirectories(allRootPaths(this._clientInfo));
    }
    await this._setupRequestInterception(browserContext);
    for (const page of browserContext.pages())
      this._onPageCreated(page);
    browserContext.on("page", (page) => this._onPageCreated(page));
    if (this.config.saveTrace) {
      await browserContext.tracing.start({
        name: "trace-" + Date.now(),
        screenshots: true,
        snapshots: true,
        _live: true
      });
    }
    return result;
  }
  lookupSecret(secretName) {
    if (!this.config.secrets?.[secretName])
      return { value: secretName, code: (0, import_utils.escapeWithQuotes)(secretName, "'") };
    return {
      value: this.config.secrets[secretName],
      code: `process.env['${secretName}']`
    };
  }
  firstRootPath() {
    return allRootPaths(this._clientInfo)[0];
  }
}
function allRootPaths(clientInfo) {
  const paths = [];
  for (const root of clientInfo.roots) {
    const url = new URL(root.uri);
    let rootPath;
    try {
      rootPath = (0, import_url.fileURLToPath)(url);
    } catch (e) {
      if (e.code === "ERR_INVALID_FILE_URL_PATH" && import_os.default.platform() === "win32")
        rootPath = decodeURIComponent(url.pathname);
    }
    if (!rootPath)
      continue;
    paths.push(rootPath);
  }
  if (paths.length === 0)
    paths.push(process.cwd());
  return paths;
}
function originOrHostGlob(originOrHost) {
  try {
    const url = new URL(originOrHost);
    if (url.origin !== "null")
      return `${url.origin}/**`;
  } catch {
  }
  return `*://${originOrHost}/**`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Context
});
