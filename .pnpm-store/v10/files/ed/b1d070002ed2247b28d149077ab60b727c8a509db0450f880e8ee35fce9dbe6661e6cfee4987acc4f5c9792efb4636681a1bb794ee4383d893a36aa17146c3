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
var crBrowser_exports = {};
__export(crBrowser_exports, {
  CRBrowser: () => CRBrowser,
  CRBrowserContext: () => CRBrowserContext
});
module.exports = __toCommonJS(crBrowser_exports);
var import_path = __toESM(require("path"));
var import_assert = require("../../utils/isomorphic/assert");
var import_crypto = require("../utils/crypto");
var import_artifact = require("../artifact");
var import_browser = require("../browser");
var import_browserContext = require("../browserContext");
var import_frames = require("../frames");
var network = __toESM(require("../network"));
var import_page = require("../page");
var import_crConnection = require("./crConnection");
var import_crPage = require("./crPage");
var import_crProtocolHelper = require("./crProtocolHelper");
var import_crServiceWorker = require("./crServiceWorker");
class CRBrowser extends import_browser.Browser {
  constructor(parent, connection, options) {
    super(parent, options);
    this._clientRootSessionPromise = null;
    this._contexts = /* @__PURE__ */ new Map();
    this._crPages = /* @__PURE__ */ new Map();
    this._serviceWorkers = /* @__PURE__ */ new Map();
    this._version = "";
    this._majorVersion = 0;
    this._tracingRecording = false;
    this._userAgent = "";
    this._connection = connection;
    this._session = this._connection.rootSession;
    this._connection.on(import_crConnection.ConnectionEvents.Disconnected, () => this._didDisconnect());
    this._session.on("Target.attachedToTarget", this._onAttachedToTarget.bind(this));
    this._session.on("Target.detachedFromTarget", this._onDetachedFromTarget.bind(this));
    this._session.on("Browser.downloadWillBegin", this._onDownloadWillBegin.bind(this));
    this._session.on("Browser.downloadProgress", this._onDownloadProgress.bind(this));
  }
  static async connect(parent, transport, options, devtools) {
    options = { ...options };
    const connection = new import_crConnection.CRConnection(parent, transport, options.protocolLogger, options.browserLogsCollector);
    const browser = new CRBrowser(parent, connection, options);
    browser._devtools = devtools;
    if (browser.isClank())
      browser._isCollocatedWithServer = false;
    const session = connection.rootSession;
    if (options.__testHookOnConnectToBrowser)
      await options.__testHookOnConnectToBrowser();
    const version = await session.send("Browser.getVersion");
    browser._version = version.product.substring(version.product.indexOf("/") + 1);
    try {
      browser._majorVersion = +browser._version.split(".")[0];
    } catch {
    }
    browser._userAgent = version.userAgent;
    browser.options.headful = !version.userAgent.includes("Headless");
    if (!options.persistent) {
      await session.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
      return browser;
    }
    browser._defaultContext = new CRBrowserContext(browser, void 0, options.persistent);
    await Promise.all([
      session.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }).then(async () => {
        await session.send("Target.getTargetInfo");
      }),
      browser._defaultContext._initialize()
    ]);
    await browser._waitForAllPagesToBeInitialized();
    return browser;
  }
  async doCreateNewContext(options) {
    const proxy = options.proxyOverride || options.proxy;
    let proxyBypassList = void 0;
    if (proxy) {
      if (process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK)
        proxyBypassList = proxy.bypass;
      else
        proxyBypassList = "<-loopback>" + (proxy.bypass ? `,${proxy.bypass}` : "");
    }
    const { browserContextId } = await this._session.send("Target.createBrowserContext", {
      disposeOnDetach: true,
      proxyServer: proxy ? proxy.server : void 0,
      proxyBypassList
    });
    const context = new CRBrowserContext(this, browserContextId, options);
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
  majorVersion() {
    return this._majorVersion;
  }
  userAgent() {
    return this._userAgent;
  }
  _platform() {
    if (this._userAgent.includes("Windows"))
      return "win";
    if (this._userAgent.includes("Macintosh"))
      return "mac";
    return "linux";
  }
  isClank() {
    return this.options.name === "clank";
  }
  async _waitForAllPagesToBeInitialized() {
    await Promise.all([...this._crPages.values()].map((crPage) => crPage._page.waitForInitializedOrError()));
  }
  _onAttachedToTarget({ targetInfo, sessionId, waitingForDebugger }) {
    if (targetInfo.type === "browser")
      return;
    const session = this._session.createChildSession(sessionId);
    (0, import_assert.assert)(targetInfo.browserContextId, "targetInfo: " + JSON.stringify(targetInfo, null, 2));
    let context = this._contexts.get(targetInfo.browserContextId) || null;
    if (!context) {
      context = this._defaultContext;
    }
    if (targetInfo.type === "other" && targetInfo.url.startsWith("devtools://devtools") && this._devtools) {
      this._devtools.install(session);
      return;
    }
    const treatOtherAsPage = targetInfo.type === "other" && process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
    if (!context || targetInfo.type === "other" && !treatOtherAsPage) {
      session.detach().catch(() => {
      });
      return;
    }
    (0, import_assert.assert)(!this._crPages.has(targetInfo.targetId), "Duplicate target " + targetInfo.targetId);
    (0, import_assert.assert)(!this._serviceWorkers.has(targetInfo.targetId), "Duplicate target " + targetInfo.targetId);
    if (targetInfo.type === "page" || treatOtherAsPage) {
      const opener = targetInfo.openerId ? this._crPages.get(targetInfo.openerId) || null : null;
      const crPage = new import_crPage.CRPage(session, targetInfo.targetId, context, opener, { hasUIWindow: targetInfo.type === "page" });
      this._crPages.set(targetInfo.targetId, crPage);
      return;
    }
    if (targetInfo.type === "service_worker") {
      const serviceWorker = new import_crServiceWorker.CRServiceWorker(context, session, targetInfo.url);
      this._serviceWorkers.set(targetInfo.targetId, serviceWorker);
      context.emit(CRBrowserContext.CREvents.ServiceWorker, serviceWorker);
      return;
    }
    session.detach().catch(() => {
    });
  }
  _onDetachedFromTarget(payload) {
    const targetId = payload.targetId;
    const crPage = this._crPages.get(targetId);
    if (crPage) {
      this._crPages.delete(targetId);
      crPage.didClose();
      return;
    }
    const serviceWorker = this._serviceWorkers.get(targetId);
    if (serviceWorker) {
      this._serviceWorkers.delete(targetId);
      serviceWorker.didClose();
      return;
    }
  }
  _didDisconnect() {
    for (const crPage of this._crPages.values())
      crPage.didClose();
    this._crPages.clear();
    for (const serviceWorker of this._serviceWorkers.values())
      serviceWorker.didClose();
    this._serviceWorkers.clear();
    this._didClose();
  }
  _findOwningPage(frameId) {
    for (const crPage of this._crPages.values()) {
      const frame = crPage._page.frameManager.frame(frameId);
      if (frame)
        return crPage;
    }
    return null;
  }
  _onDownloadWillBegin(payload) {
    const page = this._findOwningPage(payload.frameId);
    if (!page) {
      return;
    }
    page.willBeginDownload();
    let originPage = page._page.initializedOrUndefined();
    if (!originPage && page._opener)
      originPage = page._opener._page.initializedOrUndefined();
    if (!originPage)
      return;
    this._downloadCreated(originPage, payload.guid, payload.url, payload.suggestedFilename);
  }
  _onDownloadProgress(payload) {
    if (payload.state === "completed")
      this._downloadFinished(payload.guid, "");
    if (payload.state === "canceled")
      this._downloadFinished(payload.guid, this._closeReason || "canceled");
  }
  async _closePage(crPage) {
    await this._session.send("Target.closeTarget", { targetId: crPage._targetId });
  }
  async newBrowserCDPSession() {
    return await this._connection.createBrowserSession();
  }
  async startTracing(page, options = {}) {
    (0, import_assert.assert)(!this._tracingRecording, "Cannot start recording trace while already recording trace.");
    this._tracingClient = page ? page.delegate._mainFrameSession._client : this._session;
    const defaultCategories = [
      "-*",
      "devtools.timeline",
      "v8.execute",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "toplevel",
      "blink.console",
      "blink.user_timing",
      "latencyInfo",
      "disabled-by-default-devtools.timeline.stack",
      "disabled-by-default-v8.cpu_profiler",
      "disabled-by-default-v8.cpu_profiler.hires"
    ];
    const {
      screenshots = false,
      categories = defaultCategories
    } = options;
    if (screenshots)
      categories.push("disabled-by-default-devtools.screenshot");
    this._tracingRecording = true;
    await this._tracingClient.send("Tracing.start", {
      transferMode: "ReturnAsStream",
      categories: categories.join(",")
    });
  }
  async stopTracing() {
    (0, import_assert.assert)(this._tracingClient, "Tracing was not started.");
    const [event] = await Promise.all([
      new Promise((f) => this._tracingClient.once("Tracing.tracingComplete", f)),
      this._tracingClient.send("Tracing.end")
    ]);
    const tracingPath = import_path.default.join(this.options.artifactsDir, (0, import_crypto.createGuid)() + ".crtrace");
    await (0, import_crProtocolHelper.saveProtocolStream)(this._tracingClient, event.stream, tracingPath);
    this._tracingRecording = false;
    const artifact = new import_artifact.Artifact(this, tracingPath);
    artifact.reportFinished();
    return artifact;
  }
  isConnected() {
    return !this._connection._closed;
  }
  async _clientRootSession() {
    if (!this._clientRootSessionPromise)
      this._clientRootSessionPromise = this._connection.createBrowserSession();
    return this._clientRootSessionPromise;
  }
}
const CREvents = {
  ServiceWorker: "serviceworker"
};
class CRBrowserContext extends import_browserContext.BrowserContext {
  static {
    this.CREvents = CREvents;
  }
  constructor(browser, browserContextId, options) {
    super(browser, options, browserContextId);
    this._authenticateProxyViaCredentials();
  }
  async _initialize() {
    (0, import_assert.assert)(!Array.from(this._browser._crPages.values()).some((page) => page._browserContext === this));
    const promises = [super._initialize()];
    if (this._browser.options.name !== "clank" && this._options.acceptDownloads !== "internal-browser-default") {
      promises.push(this._browser._session.send("Browser.setDownloadBehavior", {
        behavior: this._options.acceptDownloads === "accept" ? "allowAndName" : "deny",
        browserContextId: this._browserContextId,
        downloadPath: this._browser.options.downloadsPath,
        eventsEnabled: true
      }));
    }
    await Promise.all(promises);
  }
  _crPages() {
    return [...this._browser._crPages.values()].filter((crPage) => crPage._browserContext === this);
  }
  possiblyUninitializedPages() {
    return this._crPages().map((crPage) => crPage._page);
  }
  async doCreateNewPage() {
    const { targetId } = await this._browser._session.send("Target.createTarget", { url: "about:blank", browserContextId: this._browserContextId });
    return this._browser._crPages.get(targetId)._page;
  }
  async doGetCookies(urls) {
    const { cookies } = await this._browser._session.send("Storage.getCookies", { browserContextId: this._browserContextId });
    return network.filterCookies(cookies.map((c) => {
      const { name, value, domain, path: path2, expires, httpOnly, secure, sameSite } = c;
      const copy = {
        name,
        value,
        domain,
        path: path2,
        expires,
        httpOnly,
        secure,
        sameSite: sameSite ?? "Lax"
      };
      if (c.partitionKey) {
        copy._crHasCrossSiteAncestor = c.partitionKey.hasCrossSiteAncestor;
        copy.partitionKey = c.partitionKey.topLevelSite;
      }
      return copy;
    }), urls);
  }
  async addCookies(cookies) {
    function toChromiumCookie(cookie) {
      const { name, value, url, domain, path: path2, expires, httpOnly, secure, sameSite, partitionKey, _crHasCrossSiteAncestor } = cookie;
      const copy = {
        name,
        value,
        url,
        domain,
        path: path2,
        expires,
        httpOnly,
        secure,
        sameSite
      };
      if (partitionKey) {
        copy.partitionKey = {
          topLevelSite: partitionKey,
          // _crHasCrossSiteAncestor is non-standard, set it true by default if the cookie is partitioned.
          hasCrossSiteAncestor: _crHasCrossSiteAncestor ?? true
        };
      }
      return copy;
    }
    await this._browser._session.send("Storage.setCookies", {
      cookies: network.rewriteCookies(cookies).map(toChromiumCookie),
      browserContextId: this._browserContextId
    });
  }
  async doClearCookies() {
    await this._browser._session.send("Storage.clearCookies", { browserContextId: this._browserContextId });
  }
  async doGrantPermissions(origin, permissions) {
    const webPermissionToProtocol = /* @__PURE__ */ new Map([
      ["geolocation", "geolocation"],
      ["midi", "midi"],
      ["notifications", "notifications"],
      ["camera", "videoCapture"],
      ["microphone", "audioCapture"],
      ["background-sync", "backgroundSync"],
      ["ambient-light-sensor", "sensors"],
      ["accelerometer", "sensors"],
      ["gyroscope", "sensors"],
      ["magnetometer", "sensors"],
      ["clipboard-read", "clipboardReadWrite"],
      ["clipboard-write", "clipboardSanitizedWrite"],
      ["payment-handler", "paymentHandler"],
      // chrome-specific permissions we have.
      ["midi-sysex", "midiSysex"],
      ["storage-access", "storageAccess"],
      ["local-fonts", "localFonts"],
      ["local-network-access", ["localNetworkAccess", "localNetwork", "loopbackNetwork"]]
    ]);
    const filtered = permissions.flatMap((permission) => {
      const protocolPermission = webPermissionToProtocol.get(permission);
      if (!protocolPermission)
        throw new Error("Unknown permission: " + permission);
      return typeof protocolPermission === "string" ? [protocolPermission] : protocolPermission;
    });
    await this._browser._session.send("Browser.grantPermissions", { origin: origin === "*" ? void 0 : origin, browserContextId: this._browserContextId, permissions: filtered });
  }
  async doClearPermissions() {
    await this._browser._session.send("Browser.resetPermissions", { browserContextId: this._browserContextId });
  }
  async setGeolocation(geolocation) {
    (0, import_browserContext.verifyGeolocation)(geolocation);
    this._options.geolocation = geolocation;
    for (const page of this.pages())
      await page.delegate.updateGeolocation();
  }
  async doUpdateExtraHTTPHeaders() {
    for (const page of this.pages())
      await page.delegate.updateExtraHTTPHeaders();
    for (const sw of this.serviceWorkers())
      await sw.updateExtraHTTPHeaders();
  }
  async setUserAgent(userAgent) {
    this._options.userAgent = userAgent;
    for (const page of this.pages())
      await page.delegate.updateUserAgent();
  }
  async doUpdateOffline() {
    for (const page of this.pages())
      await page.delegate.updateOffline();
    for (const sw of this.serviceWorkers())
      await sw.updateOffline();
  }
  async doSetHTTPCredentials(httpCredentials) {
    this._options.httpCredentials = httpCredentials;
    for (const page of this.pages())
      await page.delegate.updateHttpCredentials();
    for (const sw of this.serviceWorkers())
      await sw.updateHttpCredentials();
  }
  async doAddInitScript(initScript) {
    for (const page of this.pages())
      await page.delegate.addInitScript(initScript);
  }
  async doRemoveInitScripts(initScripts) {
    for (const page of this.pages())
      await page.delegate.removeInitScripts(initScripts);
  }
  async doUpdateRequestInterception() {
    for (const page of this.pages())
      await page.delegate.updateRequestInterception();
    for (const sw of this.serviceWorkers())
      await sw.updateRequestInterception();
  }
  async doUpdateDefaultViewport() {
  }
  async doUpdateDefaultEmulatedMedia() {
  }
  async doExposePlaywrightBinding() {
    for (const page of this._crPages())
      await page.exposePlaywrightBinding();
  }
  async doClose(reason) {
    await this.dialogManager.closeBeforeUnloadDialogs();
    if (!this._browserContextId) {
      await this.stopVideoRecording();
      await this._browser.close({ reason });
      return;
    }
    await this._browser._session.send("Target.disposeBrowserContext", { browserContextId: this._browserContextId });
    this._browser._contexts.delete(this._browserContextId);
    for (const [targetId, serviceWorker] of this._browser._serviceWorkers) {
      if (serviceWorker.browserContext !== this)
        continue;
      serviceWorker.didClose();
      this._browser._serviceWorkers.delete(targetId);
    }
  }
  async stopVideoRecording() {
    await Promise.all(this._crPages().map((crPage) => crPage._page.screencast.stopVideoRecording()));
  }
  onClosePersistent() {
  }
  async clearCache() {
    for (const page of this._crPages())
      await page._networkManager.clearCache();
  }
  async cancelDownload(guid) {
    await this._browser._session.send("Browser.cancelDownload", {
      guid,
      browserContextId: this._browserContextId
    });
  }
  serviceWorkers() {
    return Array.from(this._browser._serviceWorkers.values()).filter((serviceWorker) => serviceWorker.browserContext === this);
  }
  async newCDPSession(page) {
    let targetId = null;
    if (page instanceof import_page.Page) {
      targetId = page.delegate._targetId;
    } else if (page instanceof import_frames.Frame) {
      const session = page._page.delegate._sessions.get(page._id);
      if (!session)
        throw new Error(`This frame does not have a separate CDP session, it is a part of the parent frame's session`);
      targetId = session._targetId;
    } else {
      throw new Error("page: expected Page or Frame");
    }
    const rootSession = await this._browser._clientRootSession();
    return rootSession.attachToTarget(targetId);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRBrowser,
  CRBrowserContext
});
