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
var import_download = require("./download");
var import_instrumentation = require("./instrumentation");
var import_page = require("./page");
var import_socksClientCertificatesInterceptor = require("./socksClientCertificatesInterceptor");
class Browser extends import_instrumentation.SdkObject {
  constructor(parent, options) {
    super(parent, "browser");
    this._downloads = /* @__PURE__ */ new Map();
    this._defaultContext = null;
    this._startedClosing = false;
    this._idToVideo = /* @__PURE__ */ new Map();
    this._isCollocatedWithServer = true;
    this.attribution.browser = this;
    this.options = options;
    this.instrumentation.onBrowserOpen(this);
  }
  static {
    this.Events = {
      Context: "context",
      Disconnected: "disconnected"
    };
  }
  sdkLanguage() {
    return this.options.sdkLanguage || this.attribution.playwright.options.sdkLanguage;
  }
  async newContext(progress, options) {
    (0, import_browserContext.validateBrowserContextOptions)(options, this.options);
    let clientCertificatesProxy;
    let context;
    try {
      if (options.clientCertificates?.length) {
        clientCertificatesProxy = await import_socksClientCertificatesInterceptor.ClientCertificatesProxy.create(progress, options);
        options = { ...options };
        options.proxyOverride = clientCertificatesProxy.proxySettings();
        options.internalIgnoreHTTPSErrors = true;
      }
      context = await progress.race(this.doCreateNewContext(options));
      context._clientCertificatesProxy = clientCertificatesProxy;
      if (options.__testHookBeforeSetStorageState)
        await progress.race(options.__testHookBeforeSetStorageState());
      await context.setStorageState(progress, options.storageState, "initial");
      this.emit(Browser.Events.Context, context);
      return context;
    } catch (error) {
      await context?.close({ reason: "Failed to create context" }).catch(() => {
      });
      await clientCertificatesProxy?.close().catch(() => {
      });
      throw error;
    }
  }
  async newContextForReuse(progress, params) {
    const hash = import_browserContext.BrowserContext.reusableContextHash(params);
    if (!this._contextForReuse || hash !== this._contextForReuse.hash || !this._contextForReuse.context.canResetForReuse()) {
      if (this._contextForReuse)
        await this._contextForReuse.context.close({ reason: "Context reused" });
      this._contextForReuse = { context: await this.newContext(progress, params), hash };
      return this._contextForReuse.context;
    }
    await this._contextForReuse.context.resetForReuse(progress, params);
    return this._contextForReuse.context;
  }
  contextForReuse() {
    return this._contextForReuse?.context;
  }
  _downloadCreated(page, uuid, url, suggestedFilename) {
    const download = new import_download.Download(page, this.options.downloadsPath || "", uuid, url, suggestedFilename);
    this._downloads.set(uuid, download);
  }
  _downloadFilenameSuggested(uuid, suggestedFilename) {
    const download = this._downloads.get(uuid);
    if (!download)
      return;
    download._filenameSuggested(suggestedFilename);
  }
  _downloadFinished(uuid, error) {
    const download = this._downloads.get(uuid);
    if (!download)
      return;
    download.artifact.reportFinished(error ? new Error(error) : void 0);
    this._downloads.delete(uuid);
  }
  _videoStarted(context, videoId, path, pageOrError) {
    const artifact = new import_artifact.Artifact(context, path);
    this._idToVideo.set(videoId, { context, artifact });
    pageOrError.then((page) => {
      if (page instanceof import_page.Page) {
        page.video = artifact;
        page.emitOnContext(import_browserContext.BrowserContext.Events.VideoStarted, artifact);
        page.emit(import_page.Page.Events.Video, artifact);
      }
    });
  }
  _takeVideo(videoId) {
    const video = this._idToVideo.get(videoId);
    this._idToVideo.delete(videoId);
    return video?.artifact;
  }
  _didClose() {
    for (const context of this.contexts())
      context._browserClosed();
    if (this._defaultContext)
      this._defaultContext._browserClosed();
    this.emit(Browser.Events.Disconnected);
    this.instrumentation.onBrowserClose(this);
  }
  async close(options) {
    if (!this._startedClosing) {
      if (options.reason)
        this._closeReason = options.reason;
      this._startedClosing = true;
      await this.options.browserProcess.close();
    }
    if (this.isConnected())
      await new Promise((x) => this.once(Browser.Events.Disconnected, x));
  }
  async killForTests() {
    await this.options.browserProcess.kill();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Browser
});
