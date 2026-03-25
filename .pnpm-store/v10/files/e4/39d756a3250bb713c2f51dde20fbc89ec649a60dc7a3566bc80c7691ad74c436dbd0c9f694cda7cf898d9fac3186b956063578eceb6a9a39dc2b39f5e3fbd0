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
var ffBrowser_exports = {};
__export(ffBrowser_exports, {
  FFBrowser: () => FFBrowser,
  FFBrowserContext: () => FFBrowserContext
});
module.exports = __toCommonJS(ffBrowser_exports);
var import_utils = require("../../utils");
var import_browser = require("../browser");
var import_browserContext = require("../browserContext");
var import_errors = require("../errors");
var network = __toESM(require("../network"));
var import_ffConnection = require("./ffConnection");
var import_ffPage = require("./ffPage");
var import_page = require("../page");
class FFBrowser extends import_browser.Browser {
  constructor(parent, connection, options) {
    super(parent, options);
    this._version = "";
    this._userAgent = "";
    this._connection = connection;
    this.session = connection.rootSession;
    this._ffPages = /* @__PURE__ */ new Map();
    this._contexts = /* @__PURE__ */ new Map();
    this._connection.on(import_ffConnection.ConnectionEvents.Disconnected, () => this._onDisconnect());
    this.session.on("Browser.attachedToTarget", this._onAttachedToTarget.bind(this));
    this.session.on("Browser.detachedFromTarget", this._onDetachedFromTarget.bind(this));
    this.session.on("Browser.downloadCreated", this._onDownloadCreated.bind(this));
    this.session.on("Browser.downloadFinished", this._onDownloadFinished.bind(this));
  }
  static async connect(parent, transport, options) {
    const connection = new import_ffConnection.FFConnection(transport, options.protocolLogger, options.browserLogsCollector);
    const browser = new FFBrowser(parent, connection, options);
    if (options.__testHookOnConnectToBrowser)
      await options.__testHookOnConnectToBrowser();
    let firefoxUserPrefs = options.originalLaunchOptions.firefoxUserPrefs ?? {};
    if (Object.keys(kBandaidFirefoxUserPrefs).length)
      firefoxUserPrefs = { ...kBandaidFirefoxUserPrefs, ...firefoxUserPrefs };
    const promises = [
      browser.session.send("Browser.enable", {
        attachToDefaultContext: !!options.persistent,
        userPrefs: Object.entries(firefoxUserPrefs).map(([name, value]) => ({ name, value }))
      }),
      browser._initVersion()
    ];
    if (options.persistent) {
      browser._defaultContext = new FFBrowserContext(browser, void 0, options.persistent);
      promises.push(browser._defaultContext._initialize());
    }
    const proxy = options.originalLaunchOptions.proxyOverride || options.proxy;
    if (proxy)
      promises.push(browser.session.send("Browser.setBrowserProxy", toJugglerProxyOptions(proxy)));
    await Promise.all(promises);
    return browser;
  }
  async _initVersion() {
    const result = await this.session.send("Browser.getInfo");
    this._version = result.version.substring(result.version.indexOf("/") + 1);
    this._userAgent = result.userAgent;
  }
  isConnected() {
    return !this._connection._closed;
  }
  async doCreateNewContext(options) {
    if (options.isMobile)
      throw new Error("options.isMobile is not supported in Firefox");
    const { browserContextId } = await this.session.send("Browser.createBrowserContext", { removeOnDetach: true });
    const context = new FFBrowserContext(this, browserContextId, options);
    await context._initialize();
    this._contexts.set(browserContextId, context);
    return context;
  }
  contexts() {
    return Array.from(this._contexts.values());
  }
  version() {
    return this._version;
  }
  userAgent() {
    return this._userAgent;
  }
  _onDetachedFromTarget(payload) {
    const ffPage = this._ffPages.get(payload.targetId);
    this._ffPages.delete(payload.targetId);
    ffPage.didClose();
  }
  _onAttachedToTarget(payload) {
    const { targetId, browserContextId, openerId, type } = payload.targetInfo;
    (0, import_utils.assert)(type === "page");
    const context = browserContextId ? this._contexts.get(browserContextId) : this._defaultContext;
    (0, import_utils.assert)(context, `Unknown context id:${browserContextId}, _defaultContext: ${this._defaultContext}`);
    const session = this._connection.createSession(payload.sessionId);
    const opener = openerId ? this._ffPages.get(openerId) : null;
    const ffPage = new import_ffPage.FFPage(session, context, opener);
    this._ffPages.set(targetId, ffPage);
  }
  _onDownloadCreated(payload) {
    const ffPage = this._ffPages.get(payload.pageTargetId);
    if (!ffPage)
      return;
    ffPage._page.frameManager.frameAbortedNavigation(payload.frameId, "Download is starting");
    let originPage = ffPage._page.initializedOrUndefined();
    if (!originPage) {
      ffPage._markAsError(new Error("Starting new page download"));
      if (ffPage._opener)
        originPage = ffPage._opener._page.initializedOrUndefined();
    }
    if (!originPage)
      return;
    this._downloadCreated(originPage, payload.uuid, payload.url, payload.suggestedFileName);
  }
  _onDownloadFinished(payload) {
    const error = payload.canceled ? "canceled" : payload.error;
    this._downloadFinished(payload.uuid, error);
  }
  _onDisconnect() {
    for (const video of this._idToVideo.values())
      video.artifact.reportFinished(new import_errors.TargetClosedError(this.closeReason()));
    this._idToVideo.clear();
    for (const ffPage of this._ffPages.values())
      ffPage.didClose();
    this._ffPages.clear();
    this._didClose();
  }
}
class FFBrowserContext extends import_browserContext.BrowserContext {
  constructor(browser, browserContextId, options) {
    super(browser, options, browserContextId);
  }
  async _initialize() {
    (0, import_utils.assert)(!this._ffPages().length);
    const browserContextId = this._browserContextId;
    const promises = [
      super._initialize(),
      this._updateInitScripts()
    ];
    if (this._options.acceptDownloads !== "internal-browser-default") {
      promises.push(this._browser.session.send("Browser.setDownloadOptions", {
        browserContextId,
        downloadOptions: {
          behavior: this._options.acceptDownloads === "accept" ? "saveToDisk" : "cancel",
          downloadsDir: this._browser.options.downloadsPath
        }
      }));
    }
    promises.push(this.doUpdateDefaultViewport());
    if (this._options.hasTouch)
      promises.push(this._browser.session.send("Browser.setTouchOverride", { browserContextId, hasTouch: true }));
    if (this._options.userAgent)
      promises.push(this._browser.session.send("Browser.setUserAgentOverride", { browserContextId, userAgent: this._options.userAgent }));
    if (this._options.bypassCSP)
      promises.push(this._browser.session.send("Browser.setBypassCSP", { browserContextId, bypassCSP: true }));
    if (this._options.ignoreHTTPSErrors || this._options.internalIgnoreHTTPSErrors)
      promises.push(this._browser.session.send("Browser.setIgnoreHTTPSErrors", { browserContextId, ignoreHTTPSErrors: true }));
    if (this._options.javaScriptEnabled === false)
      promises.push(this._browser.session.send("Browser.setJavaScriptDisabled", { browserContextId, javaScriptDisabled: true }));
    if (this._options.locale)
      promises.push(this._browser.session.send("Browser.setLocaleOverride", { browserContextId, locale: this._options.locale }));
    if (this._options.timezoneId)
      promises.push(this._browser.session.send("Browser.setTimezoneOverride", { browserContextId, timezoneId: this._options.timezoneId }));
    if (this._options.extraHTTPHeaders || this._options.locale)
      promises.push(this.doUpdateExtraHTTPHeaders());
    if (this._options.httpCredentials)
      promises.push(this.setHTTPCredentials(this._options.httpCredentials));
    if (this._options.geolocation)
      promises.push(this.setGeolocation(this._options.geolocation));
    if (this._options.offline)
      promises.push(this.doUpdateOffline());
    promises.push(this.doUpdateDefaultEmulatedMedia());
    if (this._options.recordVideo) {
      promises.push(this._browser.session.send("Browser.setScreencastOptions", {
        // validateBrowserContextOptions ensures correct video size.
        options: {
          ...this._options.recordVideo.size,
          quality: 90
        },
        browserContextId: this._browserContextId
      }));
    }
    const proxy = this._options.proxyOverride || this._options.proxy;
    if (proxy) {
      promises.push(this._browser.session.send("Browser.setContextProxy", {
        browserContextId: this._browserContextId,
        ...toJugglerProxyOptions(proxy)
      }));
    }
    await Promise.all(promises);
  }
  _ffPages() {
    return Array.from(this._browser._ffPages.values()).filter((ffPage) => ffPage._browserContext === this);
  }
  possiblyUninitializedPages() {
    return this._ffPages().map((ffPage) => ffPage._page);
  }
  async doCreateNewPage() {
    const { targetId } = await this._browser.session.send("Browser.newPage", {
      browserContextId: this._browserContextId
    }).catch((e) => {
      if (e.message.includes("Failed to override timezone"))
        throw new Error(`Invalid timezone ID: ${this._options.timezoneId}`);
      throw e;
    });
    return this._browser._ffPages.get(targetId)._page;
  }
  async doGetCookies(urls) {
    const { cookies } = await this._browser.session.send("Browser.getCookies", { browserContextId: this._browserContextId });
    return network.filterCookies(cookies.map((c) => {
      const { name, value, domain, path, expires, httpOnly, secure, sameSite } = c;
      return {
        name,
        value,
        domain,
        path,
        expires,
        httpOnly,
        secure,
        sameSite
      };
    }), urls);
  }
  async addCookies(cookies) {
    const cc = network.rewriteCookies(cookies).map((c) => {
      const { name, value, url, domain, path, expires, httpOnly, secure, sameSite } = c;
      return {
        name,
        value,
        url,
        domain,
        path,
        expires: expires === -1 ? void 0 : expires,
        httpOnly,
        secure,
        sameSite
      };
    });
    await this._browser.session.send("Browser.setCookies", { browserContextId: this._browserContextId, cookies: cc });
  }
  async doClearCookies() {
    await this._browser.session.send("Browser.clearCookies", { browserContextId: this._browserContextId });
  }
  async doGrantPermissions(origin, permissions) {
    const webPermissionToProtocol = /* @__PURE__ */ new Map([
      ["geolocation", "geo"],
      ["persistent-storage", "persistent-storage"],
      ["push", "push"],
      ["notifications", "desktop-notification"]
    ]);
    const filtered = permissions.map((permission) => {
      const protocolPermission = webPermissionToProtocol.get(permission);
      if (!protocolPermission)
        throw new Error("Unknown permission: " + permission);
      return protocolPermission;
    });
    await this._browser.session.send("Browser.grantPermissions", { origin, browserContextId: this._browserContextId, permissions: filtered });
  }
  async doClearPermissions() {
    await this._browser.session.send("Browser.resetPermissions", { browserContextId: this._browserContextId });
  }
  async setGeolocation(geolocation) {
    (0, import_browserContext.verifyGeolocation)(geolocation);
    this._options.geolocation = geolocation;
    await this._browser.session.send("Browser.setGeolocationOverride", { browserContextId: this._browserContextId, geolocation: geolocation || null });
  }
  async doUpdateExtraHTTPHeaders() {
    let allHeaders = this._options.extraHTTPHeaders || [];
    if (this._options.locale)
      allHeaders = network.mergeHeaders([allHeaders, network.singleHeader("Accept-Language", this._options.locale)]);
    await this._browser.session.send("Browser.setExtraHTTPHeaders", { browserContextId: this._browserContextId, headers: allHeaders });
  }
  async setUserAgent(userAgent) {
    await this._browser.session.send("Browser.setUserAgentOverride", { browserContextId: this._browserContextId, userAgent: userAgent || null });
  }
  async doUpdateOffline() {
    await this._browser.session.send("Browser.setOnlineOverride", { browserContextId: this._browserContextId, override: this._options.offline ? "offline" : "online" });
  }
  async doSetHTTPCredentials(httpCredentials) {
    this._options.httpCredentials = httpCredentials;
    let credentials = null;
    if (httpCredentials) {
      const { username, password, origin } = httpCredentials;
      credentials = { username, password, origin };
    }
    await this._browser.session.send("Browser.setHTTPCredentials", { browserContextId: this._browserContextId, credentials });
  }
  async doAddInitScript(initScript) {
    await this._updateInitScripts();
  }
  async doRemoveInitScripts(initScripts) {
    await this._updateInitScripts();
  }
  async _updateInitScripts() {
    const bindingScripts = [...this._pageBindings.values()].map((binding) => binding.initScript.source);
    if (this.bindingsInitScript)
      bindingScripts.unshift(this.bindingsInitScript.source);
    const initScripts = this.initScripts.map((script) => script.source);
    await this._browser.session.send("Browser.setInitScripts", { browserContextId: this._browserContextId, scripts: [...bindingScripts, ...initScripts].map((script) => ({ script })) });
  }
  async doUpdateRequestInterception() {
    await Promise.all([
      this._browser.session.send("Browser.setRequestInterception", { browserContextId: this._browserContextId, enabled: this.requestInterceptors.length > 0 }),
      this._browser.session.send("Browser.setCacheDisabled", { browserContextId: this._browserContextId, cacheDisabled: this.requestInterceptors.length > 0 })
    ]);
  }
  async doUpdateDefaultViewport() {
    if (!this._options.viewport)
      return;
    const viewport = {
      viewportSize: { width: this._options.viewport.width, height: this._options.viewport.height },
      deviceScaleFactor: this._options.deviceScaleFactor || 1
    };
    await this._browser.session.send("Browser.setDefaultViewport", { browserContextId: this._browserContextId, viewport });
  }
  async doUpdateDefaultEmulatedMedia() {
    if (this._options.colorScheme !== "no-override") {
      await this._browser.session.send("Browser.setColorScheme", {
        browserContextId: this._browserContextId,
        colorScheme: this._options.colorScheme !== void 0 ? this._options.colorScheme : "light"
      });
    }
    if (this._options.reducedMotion !== "no-override") {
      await this._browser.session.send("Browser.setReducedMotion", {
        browserContextId: this._browserContextId,
        reducedMotion: this._options.reducedMotion !== void 0 ? this._options.reducedMotion : "no-preference"
      });
    }
    if (this._options.forcedColors !== "no-override") {
      await this._browser.session.send("Browser.setForcedColors", {
        browserContextId: this._browserContextId,
        forcedColors: this._options.forcedColors !== void 0 ? this._options.forcedColors : "none"
      });
    }
    if (this._options.contrast !== "no-override") {
      await this._browser.session.send("Browser.setContrast", {
        browserContextId: this._browserContextId,
        contrast: this._options.contrast !== void 0 ? this._options.contrast : "no-preference"
      });
    }
  }
  async doExposePlaywrightBinding() {
    this._browser.session.send("Browser.addBinding", { browserContextId: this._browserContextId, name: import_page.PageBinding.kBindingName, script: "" });
  }
  onClosePersistent() {
  }
  async clearCache() {
    await this._browser.session.send("Browser.clearCache");
  }
  async doClose(reason) {
    if (!this._browserContextId) {
      if (this._options.recordVideo)
        await Promise.all(this._ffPages().map((ffPage) => ffPage._page.screencast.stopVideoRecording()));
      await this._browser.close({ reason });
    } else {
      await this._browser.session.send("Browser.removeBrowserContext", { browserContextId: this._browserContextId });
      this._browser._contexts.delete(this._browserContextId);
    }
  }
  async cancelDownload(uuid) {
    await this._browser.session.send("Browser.cancelDownload", { uuid });
  }
}
function toJugglerProxyOptions(proxy) {
  const proxyServer = new URL(proxy.server);
  let port = parseInt(proxyServer.port, 10);
  let type = "http";
  if (proxyServer.protocol === "socks5:")
    type = "socks";
  else if (proxyServer.protocol === "socks4:")
    type = "socks4";
  else if (proxyServer.protocol === "https:")
    type = "https";
  if (proxyServer.port === "") {
    if (proxyServer.protocol === "http:")
      port = 80;
    else if (proxyServer.protocol === "https:")
      port = 443;
  }
  return {
    type,
    bypass: proxy.bypass ? proxy.bypass.split(",").map((domain) => domain.trim()) : [],
    host: proxyServer.hostname,
    port,
    username: proxy.username,
    password: proxy.password
  };
}
const kBandaidFirefoxUserPrefs = {};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FFBrowser,
  FFBrowserContext
});
