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
var browserContext_exports = {};
__export(browserContext_exports, {
  BrowserContext: () => BrowserContext,
  prepareBrowserContextParams: () => prepareBrowserContextParams,
  toClientCertificatesProtocol: () => toClientCertificatesProtocol
});
module.exports = __toCommonJS(browserContext_exports);
var import_artifact = require("./artifact");
var import_cdpSession = require("./cdpSession");
var import_channelOwner = require("./channelOwner");
var import_clientHelper = require("./clientHelper");
var import_clock = require("./clock");
var import_consoleMessage = require("./consoleMessage");
var import_dialog = require("./dialog");
var import_errors = require("./errors");
var import_events = require("./events");
var import_fetch = require("./fetch");
var import_frame = require("./frame");
var import_harRouter = require("./harRouter");
var network = __toESM(require("./network"));
var import_page = require("./page");
var import_tracing = require("./tracing");
var import_waiter = require("./waiter");
var import_webError = require("./webError");
var import_worker = require("./worker");
var import_timeoutSettings = require("./timeoutSettings");
var import_fileUtils = require("./fileUtils");
var import_headers = require("../utils/isomorphic/headers");
var import_urlMatch = require("../utils/isomorphic/urlMatch");
var import_rtti = require("../utils/isomorphic/rtti");
var import_stackTrace = require("../utils/isomorphic/stackTrace");
class BrowserContext extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._pages = /* @__PURE__ */ new Set();
    this._routes = [];
    this._webSocketRoutes = [];
    // Browser is null for browser contexts created outside of normal browser, e.g. android or electron.
    this._browser = null;
    this._bindings = /* @__PURE__ */ new Map();
    this._forReuse = false;
    this._serviceWorkers = /* @__PURE__ */ new Set();
    this._harRecorders = /* @__PURE__ */ new Map();
    this._closingStatus = "none";
    this._harRouters = [];
    this._options = initializer.options;
    this._timeoutSettings = new import_timeoutSettings.TimeoutSettings(this._platform);
    this.tracing = import_tracing.Tracing.from(initializer.tracing);
    this.request = import_fetch.APIRequestContext.from(initializer.requestContext);
    this.request._timeoutSettings = this._timeoutSettings;
    this.request._checkUrlAllowed = (url) => this._checkUrlAllowed(url);
    this.clock = new import_clock.Clock(this);
    this._channel.on("bindingCall", ({ binding }) => this._onBinding(import_page.BindingCall.from(binding)));
    this._channel.on("close", () => this._onClose());
    this._channel.on("page", ({ page }) => this._onPage(import_page.Page.from(page)));
    this._channel.on("route", ({ route }) => this._onRoute(network.Route.from(route)));
    this._channel.on("webSocketRoute", ({ webSocketRoute }) => this._onWebSocketRoute(network.WebSocketRoute.from(webSocketRoute)));
    this._channel.on("serviceWorker", ({ worker }) => {
      const serviceWorker = import_worker.Worker.from(worker);
      serviceWorker._context = this;
      this._serviceWorkers.add(serviceWorker);
      this.emit(import_events.Events.BrowserContext.ServiceWorker, serviceWorker);
    });
    this._channel.on("console", (event) => {
      const worker = import_worker.Worker.fromNullable(event.worker);
      const page = import_page.Page.fromNullable(event.page);
      const consoleMessage = new import_consoleMessage.ConsoleMessage(this._platform, event, page, worker);
      worker?.emit(import_events.Events.Worker.Console, consoleMessage);
      page?.emit(import_events.Events.Page.Console, consoleMessage);
      if (worker && this._serviceWorkers.has(worker)) {
        const scope = this._serviceWorkerScope(worker);
        for (const page2 of this._pages) {
          if (scope && page2.url().startsWith(scope))
            page2.emit(import_events.Events.Page.Console, consoleMessage);
        }
      }
      this.emit(import_events.Events.BrowserContext.Console, consoleMessage);
    });
    this._channel.on("pageError", ({ error, page }) => {
      const pageObject = import_page.Page.from(page);
      const parsedError = (0, import_errors.parseError)(error);
      this.emit(import_events.Events.BrowserContext.WebError, new import_webError.WebError(pageObject, parsedError));
      if (pageObject)
        pageObject.emit(import_events.Events.Page.PageError, parsedError);
    });
    this._channel.on("dialog", ({ dialog }) => {
      const dialogObject = import_dialog.Dialog.from(dialog);
      let hasListeners = this.emit(import_events.Events.BrowserContext.Dialog, dialogObject);
      const page = dialogObject.page();
      if (page)
        hasListeners = page.emit(import_events.Events.Page.Dialog, dialogObject) || hasListeners;
      if (!hasListeners) {
        if (dialogObject.type() === "beforeunload")
          dialog.accept({}).catch(() => {
          });
        else
          dialog.dismiss().catch(() => {
          });
      }
    });
    this._channel.on("request", ({ request, page }) => this._onRequest(network.Request.from(request), import_page.Page.fromNullable(page)));
    this._channel.on("requestFailed", ({ request, failureText, responseEndTiming, page }) => this._onRequestFailed(network.Request.from(request), responseEndTiming, failureText, import_page.Page.fromNullable(page)));
    this._channel.on("requestFinished", (params) => this._onRequestFinished(params));
    this._channel.on("response", ({ response, page }) => this._onResponse(network.Response.from(response), import_page.Page.fromNullable(page)));
    this._channel.on("recorderEvent", ({ event, data, page, code }) => {
      if (event === "actionAdded")
        this._onRecorderEventSink?.actionAdded?.(import_page.Page.from(page), data, code);
      else if (event === "actionUpdated")
        this._onRecorderEventSink?.actionUpdated?.(import_page.Page.from(page), data, code);
      else if (event === "signalAdded")
        this._onRecorderEventSink?.signalAdded?.(import_page.Page.from(page), data);
    });
    this._closedPromise = new Promise((f) => this.once(import_events.Events.BrowserContext.Close, f));
    this._setEventToSubscriptionMapping(/* @__PURE__ */ new Map([
      [import_events.Events.BrowserContext.Console, "console"],
      [import_events.Events.BrowserContext.Dialog, "dialog"],
      [import_events.Events.BrowserContext.Request, "request"],
      [import_events.Events.BrowserContext.Response, "response"],
      [import_events.Events.BrowserContext.RequestFinished, "requestFinished"],
      [import_events.Events.BrowserContext.RequestFailed, "requestFailed"]
    ]));
  }
  static from(context) {
    return context._object;
  }
  static fromNullable(context) {
    return context ? BrowserContext.from(context) : null;
  }
  async _initializeHarFromOptions(recordHar) {
    if (!recordHar)
      return;
    const defaultContent = recordHar.path.endsWith(".zip") ? "attach" : "embed";
    await this._recordIntoHAR(recordHar.path, null, {
      url: recordHar.urlFilter,
      updateContent: recordHar.content ?? (recordHar.omitContent ? "omit" : defaultContent),
      updateMode: recordHar.mode ?? "full"
    });
  }
  _onPage(page) {
    this._pages.add(page);
    this.emit(import_events.Events.BrowserContext.Page, page);
    if (page._opener && !page._opener.isClosed())
      page._opener.emit(import_events.Events.Page.Popup, page);
  }
  _onRequest(request, page) {
    this.emit(import_events.Events.BrowserContext.Request, request);
    if (page)
      page.emit(import_events.Events.Page.Request, request);
  }
  _onResponse(response, page) {
    this.emit(import_events.Events.BrowserContext.Response, response);
    if (page)
      page.emit(import_events.Events.Page.Response, response);
  }
  _onRequestFailed(request, responseEndTiming, failureText, page) {
    request._failureText = failureText || null;
    request._setResponseEndTiming(responseEndTiming);
    this.emit(import_events.Events.BrowserContext.RequestFailed, request);
    if (page)
      page.emit(import_events.Events.Page.RequestFailed, request);
  }
  _onRequestFinished(params) {
    const { responseEndTiming } = params;
    const request = network.Request.from(params.request);
    const response = network.Response.fromNullable(params.response);
    const page = import_page.Page.fromNullable(params.page);
    request._setResponseEndTiming(responseEndTiming);
    this.emit(import_events.Events.BrowserContext.RequestFinished, request);
    if (page)
      page.emit(import_events.Events.Page.RequestFinished, request);
    if (response)
      response._finishedPromise.resolve(null);
  }
  async _onRoute(route) {
    route._context = this;
    const page = route.request()._safePage();
    const routeHandlers = this._routes.slice();
    for (const routeHandler of routeHandlers) {
      if (page?._closeWasCalled || this._closingStatus !== "none")
        return;
      if (!routeHandler.matches(route.request().url()))
        continue;
      const index = this._routes.indexOf(routeHandler);
      if (index === -1)
        continue;
      if (routeHandler.willExpire())
        this._routes.splice(index, 1);
      const handled = await routeHandler.handle(route);
      if (!this._routes.length)
        this._updateInterceptionPatterns({ internal: true }).catch(() => {
        });
      if (handled)
        return;
    }
    await route._innerContinue(
      true
      /* isFallback */
    ).catch(() => {
    });
  }
  async _onWebSocketRoute(webSocketRoute) {
    const routeHandler = this._webSocketRoutes.find((route) => route.matches(webSocketRoute.url()));
    if (routeHandler)
      await routeHandler.handle(webSocketRoute);
    else
      webSocketRoute.connectToServer();
  }
  async _onBinding(bindingCall) {
    const func = this._bindings.get(bindingCall._initializer.name);
    if (!func)
      return;
    await bindingCall.call(func);
  }
  _serviceWorkerScope(serviceWorker) {
    try {
      let url = new URL(".", serviceWorker.url()).href;
      if (!url.endsWith("/"))
        url += "/";
      return url;
    } catch {
      return null;
    }
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
  }
  browser() {
    return this._browser;
  }
  pages() {
    return [...this._pages];
  }
  async newPage() {
    if (this._ownerPage)
      throw new Error("Please use browser.newContext()");
    return import_page.Page.from((await this._channel.newPage()).page);
  }
  async cookies(urls) {
    if (!urls)
      urls = [];
    if (urls && typeof urls === "string")
      urls = [urls];
    return (await this._channel.cookies({ urls })).cookies;
  }
  async addCookies(cookies) {
    await this._channel.addCookies({ cookies });
  }
  async clearCookies(options = {}) {
    await this._channel.clearCookies({
      name: (0, import_rtti.isString)(options.name) ? options.name : void 0,
      nameRegexSource: (0, import_rtti.isRegExp)(options.name) ? options.name.source : void 0,
      nameRegexFlags: (0, import_rtti.isRegExp)(options.name) ? options.name.flags : void 0,
      domain: (0, import_rtti.isString)(options.domain) ? options.domain : void 0,
      domainRegexSource: (0, import_rtti.isRegExp)(options.domain) ? options.domain.source : void 0,
      domainRegexFlags: (0, import_rtti.isRegExp)(options.domain) ? options.domain.flags : void 0,
      path: (0, import_rtti.isString)(options.path) ? options.path : void 0,
      pathRegexSource: (0, import_rtti.isRegExp)(options.path) ? options.path.source : void 0,
      pathRegexFlags: (0, import_rtti.isRegExp)(options.path) ? options.path.flags : void 0
    });
  }
  async grantPermissions(permissions, options) {
    await this._channel.grantPermissions({ permissions, ...options });
  }
  async clearPermissions() {
    await this._channel.clearPermissions();
  }
  async setGeolocation(geolocation) {
    await this._channel.setGeolocation({ geolocation: geolocation || void 0 });
  }
  async setExtraHTTPHeaders(headers) {
    network.validateHeaders(headers);
    await this._channel.setExtraHTTPHeaders({ headers: (0, import_headers.headersObjectToArray)(headers) });
  }
  async setOffline(offline) {
    await this._channel.setOffline({ offline });
  }
  async setHTTPCredentials(httpCredentials) {
    await this._channel.setHTTPCredentials({ httpCredentials: httpCredentials || void 0 });
  }
  async addInitScript(script, arg) {
    const source = await (0, import_clientHelper.evaluationScript)(this._platform, script, arg);
    await this._channel.addInitScript({ source });
  }
  async exposeBinding(name, callback, options = {}) {
    await this._channel.exposeBinding({ name, needsHandle: options.handle });
    this._bindings.set(name, callback);
  }
  async exposeFunction(name, callback) {
    await this._channel.exposeBinding({ name });
    const binding = (source, ...args) => callback(...args);
    this._bindings.set(name, binding);
  }
  async route(url, handler, options = {}) {
    this._routes.unshift(new network.RouteHandler(this._platform, this._options.baseURL, url, handler, options.times));
    await this._updateInterceptionPatterns({ title: "Route requests" });
  }
  async routeWebSocket(url, handler) {
    this._webSocketRoutes.unshift(new network.WebSocketRouteHandler(this._options.baseURL, url, handler));
    await this._updateWebSocketInterceptionPatterns({ title: "Route WebSockets" });
  }
  async _recordIntoHAR(har, page, options = {}) {
    const { harId } = await this._channel.harStart({
      page: page?._channel,
      options: {
        zip: har.endsWith(".zip"),
        content: options.updateContent ?? "attach",
        urlGlob: (0, import_rtti.isString)(options.url) ? options.url : void 0,
        urlRegexSource: (0, import_rtti.isRegExp)(options.url) ? options.url.source : void 0,
        urlRegexFlags: (0, import_rtti.isRegExp)(options.url) ? options.url.flags : void 0,
        mode: options.updateMode ?? "minimal"
      }
    });
    this._harRecorders.set(harId, { path: har, content: options.updateContent ?? "attach" });
  }
  async routeFromHAR(har, options = {}) {
    const localUtils = this._connection.localUtils();
    if (!localUtils)
      throw new Error("Route from har is not supported in thin clients");
    if (options.update) {
      await this._recordIntoHAR(har, null, options);
      return;
    }
    const harRouter = await import_harRouter.HarRouter.create(localUtils, har, options.notFound || "abort", { urlMatch: options.url });
    this._harRouters.push(harRouter);
    await harRouter.addContextRoute(this);
  }
  _disposeHarRouters() {
    this._harRouters.forEach((router) => router.dispose());
    this._harRouters = [];
  }
  async unrouteAll(options) {
    await this._unrouteInternal(this._routes, [], options?.behavior);
    this._disposeHarRouters();
  }
  async unroute(url, handler) {
    const removed = [];
    const remaining = [];
    for (const route of this._routes) {
      if ((0, import_urlMatch.urlMatchesEqual)(route.url, url) && (!handler || route.handler === handler))
        removed.push(route);
      else
        remaining.push(route);
    }
    await this._unrouteInternal(removed, remaining, "default");
  }
  async _unrouteInternal(removed, remaining, behavior) {
    this._routes = remaining;
    if (behavior && behavior !== "default") {
      const promises = removed.map((routeHandler) => routeHandler.stop(behavior));
      await Promise.all(promises);
    }
    await this._updateInterceptionPatterns({ title: "Unroute requests" });
  }
  async _updateInterceptionPatterns(options) {
    const patterns = network.RouteHandler.prepareInterceptionPatterns(this._routes);
    await this._wrapApiCall(() => this._channel.setNetworkInterceptionPatterns({ patterns }), options);
  }
  async _updateWebSocketInterceptionPatterns(options) {
    const patterns = network.WebSocketRouteHandler.prepareInterceptionPatterns(this._webSocketRoutes);
    await this._wrapApiCall(() => this._channel.setWebSocketInterceptionPatterns({ patterns }), options);
  }
  _effectiveCloseReason() {
    return this._closeReason || this._browser?._closeReason;
  }
  async waitForEvent(event, optionsOrPredicate = {}) {
    return await this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === "function" ? {} : optionsOrPredicate);
      const predicate = typeof optionsOrPredicate === "function" ? optionsOrPredicate : optionsOrPredicate.predicate;
      const waiter = import_waiter.Waiter.createForEvent(this, event);
      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== import_events.Events.BrowserContext.Close)
        waiter.rejectOnEvent(this, import_events.Events.BrowserContext.Close, () => new import_errors.TargetClosedError(this._effectiveCloseReason()));
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }
  async storageState(options = {}) {
    const state = await this._channel.storageState({ indexedDB: options.indexedDB });
    if (options.path) {
      await (0, import_fileUtils.mkdirIfNeeded)(this._platform, options.path);
      await this._platform.fs().promises.writeFile(options.path, JSON.stringify(state, void 0, 2), "utf8");
    }
    return state;
  }
  backgroundPages() {
    return [];
  }
  serviceWorkers() {
    return [...this._serviceWorkers];
  }
  async newCDPSession(page) {
    if (!(page instanceof import_page.Page) && !(page instanceof import_frame.Frame))
      throw new Error("page: expected Page or Frame");
    const result = await this._channel.newCDPSession(page instanceof import_page.Page ? { page: page._channel } : { frame: page._channel });
    return import_cdpSession.CDPSession.from(result.session);
  }
  _onClose() {
    this._closingStatus = "closed";
    this._browser?._contexts.delete(this);
    this._browser?._browserType._contexts.delete(this);
    this._browser?._browserType._playwright.selectors._contextsForSelectors.delete(this);
    this._disposeHarRouters();
    this.tracing._resetStackCounter();
    this.emit(import_events.Events.BrowserContext.Close, this);
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async close(options = {}) {
    if (this._closingStatus !== "none")
      return;
    this._closeReason = options.reason;
    this._closingStatus = "closing";
    await this.request.dispose(options);
    await this._instrumentation.runBeforeCloseBrowserContext(this);
    await this._wrapApiCall(async () => {
      for (const [harId, harParams] of this._harRecorders) {
        const har = await this._channel.harExport({ harId });
        const artifact = import_artifact.Artifact.from(har.artifact);
        const isCompressed = harParams.content === "attach" || harParams.path.endsWith(".zip");
        const needCompressed = harParams.path.endsWith(".zip");
        if (isCompressed && !needCompressed) {
          const localUtils = this._connection.localUtils();
          if (!localUtils)
            throw new Error("Uncompressed har is not supported in thin clients");
          await artifact.saveAs(harParams.path + ".tmp");
          await localUtils.harUnzip({ zipFile: harParams.path + ".tmp", harFile: harParams.path });
        } else {
          await artifact.saveAs(harParams.path);
        }
        await artifact.delete();
      }
    }, { internal: true });
    await this._channel.close(options);
    await this._closedPromise;
  }
  async _enableRecorder(params, eventSink) {
    if (eventSink)
      this._onRecorderEventSink = eventSink;
    await this._channel.enableRecorder(params);
  }
  async _disableRecorder() {
    this._onRecorderEventSink = void 0;
    await this._channel.disableRecorder();
  }
  async _exposeConsoleApi() {
    await this._channel.exposeConsoleApi();
  }
  _setAllowedProtocols(protocols) {
    this._allowedProtocols = protocols;
  }
  _checkUrlAllowed(url) {
    if (!this._allowedProtocols)
      return;
    let parsedURL;
    try {
      parsedURL = new URL(url);
    } catch (e) {
      throw new Error(`Access to ${url} is blocked. Invalid URL: ${e.message}`);
    }
    if (!this._allowedProtocols.includes(parsedURL.protocol))
      throw new Error(`Access to "${parsedURL.protocol}" URL is blocked. Allowed protocols: ${this._allowedProtocols.join(", ")}. Attempted URL: ${url}`);
  }
  _setAllowedDirectories(rootDirectories) {
    this._allowedDirectories = rootDirectories;
  }
  _checkFileAccess(filePath) {
    if (!this._allowedDirectories)
      return;
    const path = this._platform.path().resolve(filePath);
    const isInsideDir = (container, child) => {
      const path2 = this._platform.path();
      const rel = path2.relative(container, child);
      return !!rel && !rel.startsWith("..") && !path2.isAbsolute(rel);
    };
    if (this._allowedDirectories.some((root) => isInsideDir(root, path)))
      return;
    throw new Error(`File access denied: ${filePath} is outside allowed roots. Allowed roots: ${this._allowedDirectories.length ? this._allowedDirectories.join(", ") : "none"}`);
  }
}
async function prepareStorageState(platform, storageState) {
  if (typeof storageState !== "string")
    return storageState;
  try {
    return JSON.parse(await platform.fs().promises.readFile(storageState, "utf8"));
  } catch (e) {
    (0, import_stackTrace.rewriteErrorMessage)(e, `Error reading storage state from ${storageState}:
` + e.message);
    throw e;
  }
}
async function prepareBrowserContextParams(platform, options) {
  if (options.videoSize && !options.videosPath)
    throw new Error(`"videoSize" option requires "videosPath" to be specified`);
  if (options.extraHTTPHeaders)
    network.validateHeaders(options.extraHTTPHeaders);
  const contextParams = {
    ...options,
    viewport: options.viewport === null ? void 0 : options.viewport,
    noDefaultViewport: options.viewport === null,
    extraHTTPHeaders: options.extraHTTPHeaders ? (0, import_headers.headersObjectToArray)(options.extraHTTPHeaders) : void 0,
    storageState: options.storageState ? await prepareStorageState(platform, options.storageState) : void 0,
    serviceWorkers: options.serviceWorkers,
    colorScheme: options.colorScheme === null ? "no-override" : options.colorScheme,
    reducedMotion: options.reducedMotion === null ? "no-override" : options.reducedMotion,
    forcedColors: options.forcedColors === null ? "no-override" : options.forcedColors,
    contrast: options.contrast === null ? "no-override" : options.contrast,
    acceptDownloads: toAcceptDownloadsProtocol(options.acceptDownloads),
    clientCertificates: await toClientCertificatesProtocol(platform, options.clientCertificates)
  };
  if (!contextParams.recordVideo && options.videosPath) {
    contextParams.recordVideo = {
      dir: options.videosPath,
      size: options.videoSize
    };
  }
  if (contextParams.recordVideo && contextParams.recordVideo.dir)
    contextParams.recordVideo.dir = platform.path().resolve(contextParams.recordVideo.dir);
  return contextParams;
}
function toAcceptDownloadsProtocol(acceptDownloads) {
  if (acceptDownloads === void 0)
    return void 0;
  if (acceptDownloads)
    return "accept";
  return "deny";
}
async function toClientCertificatesProtocol(platform, certs) {
  if (!certs)
    return void 0;
  const bufferizeContent = async (value, path) => {
    if (value)
      return value;
    if (path)
      return await platform.fs().promises.readFile(path);
  };
  return await Promise.all(certs.map(async (cert) => ({
    origin: cert.origin,
    cert: await bufferizeContent(cert.cert, cert.certPath),
    key: await bufferizeContent(cert.key, cert.keyPath),
    pfx: await bufferizeContent(cert.pfx, cert.pfxPath),
    passphrase: cert.passphrase
  })));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserContext,
  prepareBrowserContextParams,
  toClientCertificatesProtocol
});
