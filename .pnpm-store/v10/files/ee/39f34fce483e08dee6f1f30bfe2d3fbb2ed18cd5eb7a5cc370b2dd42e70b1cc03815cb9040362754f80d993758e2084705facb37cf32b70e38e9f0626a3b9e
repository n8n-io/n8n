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
var wkBrowser_exports = {};
__export(wkBrowser_exports, {
  WKBrowser: () => WKBrowser,
  WKBrowserContext: () => WKBrowserContext
});
module.exports = __toCommonJS(wkBrowser_exports);
var import_utils = require("../../utils");
var import_browser = require("../browser");
var import_browserContext = require("../browserContext");
var network = __toESM(require("../network"));
var import_wkConnection = require("./wkConnection");
var import_wkPage = require("./wkPage");
var import_errors = require("../errors");
var import_webkit = require("./webkit");
const BROWSER_VERSION = "26.0";
const DEFAULT_USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${BROWSER_VERSION} Safari/605.1.15`;
class WKBrowser extends import_browser.Browser {
  constructor(parent, transport, options) {
    super(parent, options);
    this._contexts = /* @__PURE__ */ new Map();
    this._wkPages = /* @__PURE__ */ new Map();
    this._connection = new import_wkConnection.WKConnection(transport, this._onDisconnect.bind(this), options.protocolLogger, options.browserLogsCollector);
    this._browserSession = this._connection.browserSession;
    this._browserSession.on("Playwright.pageProxyCreated", this._onPageProxyCreated.bind(this));
    this._browserSession.on("Playwright.pageProxyDestroyed", this._onPageProxyDestroyed.bind(this));
    this._browserSession.on("Playwright.provisionalLoadFailed", (event) => this._onProvisionalLoadFailed(event));
    this._browserSession.on("Playwright.windowOpen", (event) => this._onWindowOpen(event));
    this._browserSession.on("Playwright.downloadCreated", this._onDownloadCreated.bind(this));
    this._browserSession.on("Playwright.downloadFilenameSuggested", this._onDownloadFilenameSuggested.bind(this));
    this._browserSession.on("Playwright.downloadFinished", this._onDownloadFinished.bind(this));
    this._browserSession.on(import_wkConnection.kPageProxyMessageReceived, this._onPageProxyMessageReceived.bind(this));
  }
  static async connect(parent, transport, options) {
    const browser = new WKBrowser(parent, transport, options);
    if (options.__testHookOnConnectToBrowser)
      await options.__testHookOnConnectToBrowser();
    const promises = [
      browser._browserSession.send("Playwright.enable")
    ];
    if (options.persistent) {
      options.persistent.userAgent ||= DEFAULT_USER_AGENT;
      browser._defaultContext = new WKBrowserContext(browser, void 0, options.persistent);
      promises.push(browser._defaultContext._initialize());
    }
    await Promise.all(promises);
    return browser;
  }
  _onDisconnect() {
    for (const wkPage of this._wkPages.values())
      wkPage.didClose();
    this._wkPages.clear();
    for (const video of this._idToVideo.values())
      video.artifact.reportFinished(new import_errors.TargetClosedError(this.closeReason()));
    this._idToVideo.clear();
    this._didClose();
  }
  async doCreateNewContext(options) {
    const proxy = options.proxyOverride || options.proxy;
    const createOptions = proxy ? {
      // Enable socks5 hostname resolution on Windows.
      // See https://github.com/microsoft/playwright/issues/20451
      proxyServer: process.platform === "win32" && this.attribution.browser?.options.channel !== "webkit-wsl" ? proxy.server.replace(/^socks5:\/\//, "socks5h://") : proxy.server,
      proxyBypassList: proxy.bypass
    } : void 0;
    const { browserContextId } = await this._browserSession.send("Playwright.createContext", createOptions);
    options.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    const context = new WKBrowserContext(this, browserContextId, options);
    await context._initialize();
    this._contexts.set(browserContextId, context);
    return context;
  }
  contexts() {
    return Array.from(this._contexts.values());
  }
  version() {
    return BROWSER_VERSION;
  }
  userAgent() {
    return DEFAULT_USER_AGENT;
  }
  _onDownloadCreated(payload) {
    const page = this._wkPages.get(payload.pageProxyId);
    if (!page)
      return;
    let frameId = payload.frameId;
    if (!page._page.frameManager.frame(frameId))
      frameId = page._page.mainFrame()._id;
    page._page.frameManager.frameAbortedNavigation(frameId, "Download is starting");
    let originPage = page._page.initializedOrUndefined();
    if (!originPage) {
      page._firstNonInitialNavigationCommittedReject(new Error("Starting new page download"));
      if (page._opener)
        originPage = page._opener._page.initializedOrUndefined();
    }
    if (!originPage)
      return;
    this._downloadCreated(originPage, payload.uuid, payload.url);
  }
  _onDownloadFilenameSuggested(payload) {
    this._downloadFilenameSuggested(payload.uuid, payload.suggestedFilename);
  }
  _onDownloadFinished(payload) {
    this._downloadFinished(payload.uuid, payload.error);
  }
  _onPageProxyCreated(event) {
    const pageProxyId = event.pageProxyId;
    let context = null;
    if (event.browserContextId) {
      context = this._contexts.get(event.browserContextId) || null;
    }
    if (!context)
      context = this._defaultContext;
    if (!context)
      return;
    const pageProxySession = new import_wkConnection.WKSession(this._connection, pageProxyId, (message) => {
      this._connection.rawSend({ ...message, pageProxyId });
    });
    const opener = event.openerId ? this._wkPages.get(event.openerId) : void 0;
    const wkPage = new import_wkPage.WKPage(context, pageProxySession, opener || null);
    this._wkPages.set(pageProxyId, wkPage);
  }
  _onPageProxyDestroyed(event) {
    const pageProxyId = event.pageProxyId;
    const wkPage = this._wkPages.get(pageProxyId);
    if (!wkPage)
      return;
    this._wkPages.delete(pageProxyId);
    wkPage.didClose();
  }
  _onPageProxyMessageReceived(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage)
      return;
    wkPage.dispatchMessageToSession(event.message);
  }
  _onProvisionalLoadFailed(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage)
      return;
    wkPage.handleProvisionalLoadFailed(event);
  }
  _onWindowOpen(event) {
    const wkPage = this._wkPages.get(event.pageProxyId);
    if (!wkPage)
      return;
    wkPage.handleWindowOpen(event);
  }
  isConnected() {
    return !this._connection.isClosed();
  }
}
class WKBrowserContext extends import_browserContext.BrowserContext {
  constructor(browser, browserContextId, options) {
    super(browser, options, browserContextId);
    this._validateEmulatedViewport(options.viewport);
    this._authenticateProxyViaHeader();
  }
  async _initialize() {
    (0, import_utils.assert)(!this._wkPages().length);
    const browserContextId = this._browserContextId;
    const promises = [super._initialize()];
    promises.push(this._browser._browserSession.send("Playwright.setDownloadBehavior", {
      behavior: this._options.acceptDownloads === "accept" ? "allow" : "deny",
      downloadPath: this._browser.options.channel === "webkit-wsl" ? await (0, import_webkit.translatePathToWSL)(this._browser.options.downloadsPath) : this._browser.options.downloadsPath,
      browserContextId
    }));
    if (this._options.ignoreHTTPSErrors || this._options.internalIgnoreHTTPSErrors)
      promises.push(this._browser._browserSession.send("Playwright.setIgnoreCertificateErrors", { browserContextId, ignore: true }));
    if (this._options.locale)
      promises.push(this._browser._browserSession.send("Playwright.setLanguages", { browserContextId, languages: [this._options.locale] }));
    if (this._options.geolocation)
      promises.push(this.setGeolocation(this._options.geolocation));
    if (this._options.offline)
      promises.push(this.doUpdateOffline());
    if (this._options.httpCredentials)
      promises.push(this.setHTTPCredentials(this._options.httpCredentials));
    await Promise.all(promises);
  }
  _wkPages() {
    return Array.from(this._browser._wkPages.values()).filter((wkPage) => wkPage._browserContext === this);
  }
  possiblyUninitializedPages() {
    return this._wkPages().map((wkPage) => wkPage._page);
  }
  async doCreateNewPage() {
    const { pageProxyId } = await this._browser._browserSession.send("Playwright.createPage", { browserContextId: this._browserContextId });
    return this._browser._wkPages.get(pageProxyId)._page;
  }
  async doGetCookies(urls) {
    const { cookies } = await this._browser._browserSession.send("Playwright.getAllCookies", { browserContextId: this._browserContextId });
    return network.filterCookies(cookies.map((c) => {
      const { name, value, domain, path, expires, httpOnly, secure, sameSite } = c;
      const copy = {
        name,
        value,
        domain,
        path,
        expires: expires === -1 ? -1 : expires / 1e3,
        httpOnly,
        secure,
        sameSite
      };
      return copy;
    }), urls);
  }
  async addCookies(cookies) {
    const cc = network.rewriteCookies(cookies).map((c) => {
      const { name, value, domain, path, expires, httpOnly, secure, sameSite } = c;
      const copy = {
        name,
        value,
        domain,
        path,
        expires: expires && expires !== -1 ? expires * 1e3 : expires,
        httpOnly,
        secure,
        sameSite,
        session: expires === -1 || expires === void 0
      };
      return copy;
    });
    await this._browser._browserSession.send("Playwright.setCookies", { cookies: cc, browserContextId: this._browserContextId });
  }
  async doClearCookies() {
    await this._browser._browserSession.send("Playwright.deleteAllCookies", { browserContextId: this._browserContextId });
  }
  async doGrantPermissions(origin, permissions) {
    await Promise.all(this.pages().map((page) => page.delegate._grantPermissions(origin, permissions)));
  }
  async doClearPermissions() {
    await Promise.all(this.pages().map((page) => page.delegate._clearPermissions()));
  }
  async setGeolocation(geolocation) {
    (0, import_browserContext.verifyGeolocation)(geolocation);
    this._options.geolocation = geolocation;
    const payload = geolocation ? { ...geolocation, timestamp: Date.now() } : void 0;
    await this._browser._browserSession.send("Playwright.setGeolocationOverride", { browserContextId: this._browserContextId, geolocation: payload });
  }
  async doUpdateExtraHTTPHeaders() {
    for (const page of this.pages())
      await page.delegate.updateExtraHTTPHeaders();
  }
  async setUserAgent(userAgent) {
    this._options.userAgent = userAgent;
    for (const page of this.pages())
      await page.delegate.updateUserAgent();
  }
  async doUpdateOffline() {
    for (const page of this.pages())
      await page.delegate.updateOffline();
  }
  async doSetHTTPCredentials(httpCredentials) {
    this._options.httpCredentials = httpCredentials;
    for (const page of this.pages())
      await page.delegate.updateHttpCredentials();
  }
  async doAddInitScript(initScript) {
    for (const page of this.pages())
      await page.delegate._updateBootstrapScript();
  }
  async doRemoveInitScripts(initScripts) {
    for (const page of this.pages())
      await page.delegate._updateBootstrapScript();
  }
  async doUpdateRequestInterception() {
    for (const page of this.pages())
      await page.delegate.updateRequestInterception();
  }
  async doUpdateDefaultViewport() {
  }
  async doUpdateDefaultEmulatedMedia() {
  }
  async doExposePlaywrightBinding() {
    for (const page of this.pages())
      await page.delegate.exposePlaywrightBinding();
  }
  onClosePersistent() {
  }
  async clearCache() {
    await this._browser._browserSession.send("Playwright.clearMemoryCache", {
      browserContextId: this._browserContextId
    });
  }
  async doClose(reason) {
    if (!this._browserContextId) {
      await Promise.all(this._wkPages().map((wkPage) => wkPage._page.screencast.stopVideoRecording()));
      await this._browser.close({ reason });
    } else {
      await this._browser._browserSession.send("Playwright.deleteContext", { browserContextId: this._browserContextId });
      this._browser._contexts.delete(this._browserContextId);
    }
  }
  async cancelDownload(uuid) {
    await this._browser._browserSession.send("Playwright.cancelDownload", { uuid });
  }
  _validateEmulatedViewport(viewportSize) {
    if (!viewportSize)
      return;
    if (process.platform === "win32" && this._browser.options.headful && (viewportSize.width < 250 || viewportSize.height < 240))
      throw new Error(`WebKit on Windows has a minimal viewport of 250x240.`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKBrowser,
  WKBrowserContext
});
