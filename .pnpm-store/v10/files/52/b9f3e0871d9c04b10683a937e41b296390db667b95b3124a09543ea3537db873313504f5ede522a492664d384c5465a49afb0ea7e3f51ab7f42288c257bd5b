"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var browser_exports = {};
__export(browser_exports, {
  Browser: () => Browser
});
module.exports = __toCommonJS(browser_exports);
var import_artifact = require("./artifact");
var import_browserContext = require("./browserContext");
var import_cdpSession = require("./cdpSession");
var import_channelOwner = require("./channelOwner");
var import_errors = require("./errors");
var import_events = require("./events");
var import_fileUtils = require("./fileUtils");
class Browser extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._contexts = /* @__PURE__ */ new Set();
    this._isConnected = true;
    this._shouldCloseConnectionOnClose = false;
    this._options = {};
    this._name = initializer.name;
    this._channel.on("context", ({ context }) => this._didCreateContext(import_browserContext.BrowserContext.from(context)));
    this._channel.on("close", () => this._didClose());
    this._closedPromise = new Promise((f) => this.once(import_events.Events.Browser.Disconnected, f));
  }
  static from(browser) {
    return browser._object;
  }
  browserType() {
    return this._browserType;
  }
  async newContext(options = {}) {
    return await this._innerNewContext(options, false);
  }
  async _newContextForReuse(options = {}) {
    return await this._innerNewContext(options, true);
  }
  async _disconnectFromReusedContext(reason) {
    const context = [...this._contexts].find((context2) => context2._forReuse);
    if (!context)
      return;
    await this._instrumentation.runBeforeCloseBrowserContext(context);
    for (const page of context.pages())
      page._onClose();
    context._onClose();
    await this._channel.disconnectFromReusedContext({ reason });
  }
  async _innerNewContext(userOptions = {}, forReuse) {
    const options = this._browserType._playwright.selectors._withSelectorOptions(userOptions);
    await this._instrumentation.runBeforeCreateBrowserContext(options);
    const contextOptions = await (0, import_browserContext.prepareBrowserContextParams)(this._platform, options);
    const response = forReuse ? await this._channel.newContextForReuse(contextOptions) : await this._channel.newContext(contextOptions);
    const context = import_browserContext.BrowserContext.from(response.context);
    if (forReuse)
      context._forReuse = true;
    if (options.logger)
      context._logger = options.logger;
    await context._initializeHarFromOptions(options.recordHar);
    await this._instrumentation.runAfterCreateBrowserContext(context);
    return context;
  }
  _connectToBrowserType(browserType, browserOptions, logger) {
    this._browserType = browserType;
    this._options = browserOptions;
    this._logger = logger;
    for (const context of this._contexts)
      this._setupBrowserContext(context);
  }
  _didCreateContext(context) {
    context._browser = this;
    this._contexts.add(context);
    if (this._browserType)
      this._setupBrowserContext(context);
  }
  _setupBrowserContext(context) {
    context._logger = this._logger;
    context.tracing._tracesDir = this._options.tracesDir;
    this._browserType._contexts.add(context);
    this._browserType._playwright.selectors._contextsForSelectors.add(context);
    context.setDefaultTimeout(this._browserType._playwright._defaultContextTimeout);
    context.setDefaultNavigationTimeout(this._browserType._playwright._defaultContextNavigationTimeout);
  }
  contexts() {
    return [...this._contexts];
  }
  version() {
    return this._initializer.version;
  }
  async newPage(options = {}) {
    return await this._wrapApiCall(async () => {
      const context = await this.newContext(options);
      const page = await context.newPage();
      page._ownedContext = context;
      context._ownerPage = page;
      return page;
    }, { title: "Create page" });
  }
  isConnected() {
    return this._isConnected;
  }
  async newBrowserCDPSession() {
    return import_cdpSession.CDPSession.from((await this._channel.newBrowserCDPSession()).session);
  }
  async startTracing(page, options = {}) {
    this._path = options.path;
    await this._channel.startTracing({ ...options, page: page ? page._channel : void 0 });
  }
  async stopTracing() {
    const artifact = import_artifact.Artifact.from((await this._channel.stopTracing()).artifact);
    const buffer = await artifact.readIntoBuffer();
    await artifact.delete();
    if (this._path) {
      await (0, import_fileUtils.mkdirIfNeeded)(this._platform, this._path);
      await this._platform.fs().promises.writeFile(this._path, buffer);
      this._path = void 0;
    }
    return buffer;
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async close(options = {}) {
    this._closeReason = options.reason;
    try {
      if (this._shouldCloseConnectionOnClose)
        this._connection.close();
      else
        await this._channel.close(options);
      await this._closedPromise;
    } catch (e) {
      if ((0, import_errors.isTargetClosedError)(e))
        return;
      throw e;
    }
  }
  _didClose() {
    this._isConnected = false;
    this.emit(import_events.Events.Browser.Disconnected, this);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Browser
});
