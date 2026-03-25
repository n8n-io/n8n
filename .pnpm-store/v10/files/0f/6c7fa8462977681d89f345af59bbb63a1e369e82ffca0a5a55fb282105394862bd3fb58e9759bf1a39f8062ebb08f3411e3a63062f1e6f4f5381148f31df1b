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
var browserDispatcher_exports = {};
__export(browserDispatcher_exports, {
  BrowserDispatcher: () => BrowserDispatcher
});
module.exports = __toCommonJS(browserDispatcher_exports);
var import_browser = require("../browser");
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_cdpSessionDispatcher = require("./cdpSessionDispatcher");
var import_dispatcher = require("./dispatcher");
var import_browserContext = require("../browserContext");
var import_artifactDispatcher = require("./artifactDispatcher");
class BrowserDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, browser, options = {}) {
    super(scope, browser, "Browser", { version: browser.version(), name: browser.options.name });
    this._type_Browser = true;
    this._isolatedContexts = /* @__PURE__ */ new Set();
    this._options = options;
    if (!options.isolateContexts) {
      this.addObjectListener(import_browser.Browser.Events.Context, (context) => this._dispatchEvent("context", { context: import_browserContextDispatcher.BrowserContextDispatcher.from(this, context) }));
      this.addObjectListener(import_browser.Browser.Events.Disconnected, () => this._didClose());
      if (browser._defaultContext)
        this._dispatchEvent("context", { context: import_browserContextDispatcher.BrowserContextDispatcher.from(this, browser._defaultContext) });
      for (const context of browser.contexts())
        this._dispatchEvent("context", { context: import_browserContextDispatcher.BrowserContextDispatcher.from(this, context) });
    }
  }
  _didClose() {
    this._dispatchEvent("close");
    this._dispose();
  }
  async newContext(params, progress) {
    if (params.recordVideo && this._object.attribution.playwright.options.isServer)
      params.recordVideo.dir = this._object.options.artifactsDir;
    if (!this._options.isolateContexts) {
      const context2 = await this._object.newContext(progress, params);
      const contextDispatcher2 = import_browserContextDispatcher.BrowserContextDispatcher.from(this, context2);
      return { context: contextDispatcher2 };
    }
    const context = await this._object.newContext(progress, params);
    this._isolatedContexts.add(context);
    context.on(import_browserContext.BrowserContext.Events.Close, () => this._isolatedContexts.delete(context));
    const contextDispatcher = import_browserContextDispatcher.BrowserContextDispatcher.from(this, context);
    this._dispatchEvent("context", { context: contextDispatcher });
    return { context: contextDispatcher };
  }
  async newContextForReuse(params, progress) {
    const context = await this._object.newContextForReuse(progress, params);
    const contextDispatcher = import_browserContextDispatcher.BrowserContextDispatcher.from(this, context);
    this._dispatchEvent("context", { context: contextDispatcher });
    return { context: contextDispatcher };
  }
  async disconnectFromReusedContext(params, progress) {
    const context = this._object.contextForReuse();
    const contextDispatcher = context ? this.connection.existingDispatcher(context) : void 0;
    if (contextDispatcher) {
      await contextDispatcher.stopPendingOperations(new Error(params.reason));
      contextDispatcher._dispose();
    }
  }
  async close(params, progress) {
    if (this._options.ignoreStopAndKill)
      return;
    progress.metadata.potentiallyClosesScope = true;
    await this._object.close(params);
  }
  async killForTests(params, progress) {
    if (this._options.ignoreStopAndKill)
      return;
    progress.metadata.potentiallyClosesScope = true;
    await this._object.killForTests();
  }
  async defaultUserAgentForTest() {
    return { userAgent: this._object.userAgent() };
  }
  async newBrowserCDPSession(params, progress) {
    if (!this._object.options.isChromium)
      throw new Error(`CDP session is only available in Chromium`);
    const crBrowser = this._object;
    return { session: new import_cdpSessionDispatcher.CDPSessionDispatcher(this, await crBrowser.newBrowserCDPSession()) };
  }
  async startTracing(params, progress) {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    await crBrowser.startTracing(params.page ? params.page._object : void 0, params);
  }
  async stopTracing(params, progress) {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    return { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this, await crBrowser.stopTracing()) };
  }
  async cleanupContexts() {
    await Promise.all(Array.from(this._isolatedContexts).map((context) => context.close({ reason: "Global context cleanup (connection terminated)" })));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserDispatcher
});
