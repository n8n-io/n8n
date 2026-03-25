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
var page_exports = {};
__export(page_exports, {
  BindingCall: () => BindingCall,
  Page: () => Page
});
module.exports = __toCommonJS(page_exports);
var import_artifact = require("./artifact");
var import_channelOwner = require("./channelOwner");
var import_clientHelper = require("./clientHelper");
var import_coverage = require("./coverage");
var import_download = require("./download");
var import_elementHandle = require("./elementHandle");
var import_errors = require("./errors");
var import_events = require("./events");
var import_fileChooser = require("./fileChooser");
var import_frame = require("./frame");
var import_harRouter = require("./harRouter");
var import_input = require("./input");
var import_jsHandle = require("./jsHandle");
var import_network = require("./network");
var import_video = require("./video");
var import_waiter = require("./waiter");
var import_worker = require("./worker");
var import_timeoutSettings = require("./timeoutSettings");
var import_assert = require("../utils/isomorphic/assert");
var import_fileUtils = require("./fileUtils");
var import_headers = require("../utils/isomorphic/headers");
var import_stringUtils = require("../utils/isomorphic/stringUtils");
var import_urlMatch = require("../utils/isomorphic/urlMatch");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_rtti = require("../utils/isomorphic/rtti");
var import_consoleMessage = require("./consoleMessage");
var import_pageAgent = require("./pageAgent");
class Page extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._frames = /* @__PURE__ */ new Set();
    this._workers = /* @__PURE__ */ new Set();
    this._closed = false;
    this._closedOrCrashedScope = new import_manualPromise.LongStandingScope();
    this._routes = [];
    this._webSocketRoutes = [];
    this._bindings = /* @__PURE__ */ new Map();
    this._video = null;
    this._closeWasCalled = false;
    this._harRouters = [];
    this._locatorHandlers = /* @__PURE__ */ new Map();
    this._instrumentation.onPage(this);
    this._browserContext = parent;
    this._timeoutSettings = new import_timeoutSettings.TimeoutSettings(this._platform, this._browserContext._timeoutSettings);
    this.keyboard = new import_input.Keyboard(this);
    this.mouse = new import_input.Mouse(this);
    this.request = this._browserContext.request;
    this.touchscreen = new import_input.Touchscreen(this);
    this.clock = this._browserContext.clock;
    this._mainFrame = import_frame.Frame.from(initializer.mainFrame);
    this._mainFrame._page = this;
    this._frames.add(this._mainFrame);
    this._viewportSize = initializer.viewportSize;
    this._closed = initializer.isClosed;
    this._opener = Page.fromNullable(initializer.opener);
    this._channel.on("bindingCall", ({ binding }) => this._onBinding(BindingCall.from(binding)));
    this._channel.on("close", () => this._onClose());
    this._channel.on("crash", () => this._onCrash());
    this._channel.on("download", ({ url, suggestedFilename, artifact }) => {
      const artifactObject = import_artifact.Artifact.from(artifact);
      this.emit(import_events.Events.Page.Download, new import_download.Download(this, url, suggestedFilename, artifactObject));
    });
    this._channel.on("fileChooser", ({ element, isMultiple }) => this.emit(import_events.Events.Page.FileChooser, new import_fileChooser.FileChooser(this, import_elementHandle.ElementHandle.from(element), isMultiple)));
    this._channel.on("frameAttached", ({ frame }) => this._onFrameAttached(import_frame.Frame.from(frame)));
    this._channel.on("frameDetached", ({ frame }) => this._onFrameDetached(import_frame.Frame.from(frame)));
    this._channel.on("locatorHandlerTriggered", ({ uid }) => this._onLocatorHandlerTriggered(uid));
    this._channel.on("route", ({ route }) => this._onRoute(import_network.Route.from(route)));
    this._channel.on("webSocketRoute", ({ webSocketRoute }) => this._onWebSocketRoute(import_network.WebSocketRoute.from(webSocketRoute)));
    this._channel.on("video", ({ artifact }) => {
      const artifactObject = import_artifact.Artifact.from(artifact);
      this._forceVideo()._artifactReady(artifactObject);
    });
    this._channel.on("viewportSizeChanged", ({ viewportSize }) => this._viewportSize = viewportSize);
    this._channel.on("webSocket", ({ webSocket }) => this.emit(import_events.Events.Page.WebSocket, import_network.WebSocket.from(webSocket)));
    this._channel.on("worker", ({ worker }) => this._onWorker(import_worker.Worker.from(worker)));
    this.coverage = new import_coverage.Coverage(this._channel);
    this.once(import_events.Events.Page.Close, () => this._closedOrCrashedScope.close(this._closeErrorWithReason()));
    this.once(import_events.Events.Page.Crash, () => this._closedOrCrashedScope.close(new import_errors.TargetClosedError()));
    this._setEventToSubscriptionMapping(/* @__PURE__ */ new Map([
      [import_events.Events.Page.Console, "console"],
      [import_events.Events.Page.Dialog, "dialog"],
      [import_events.Events.Page.Request, "request"],
      [import_events.Events.Page.Response, "response"],
      [import_events.Events.Page.RequestFinished, "requestFinished"],
      [import_events.Events.Page.RequestFailed, "requestFailed"],
      [import_events.Events.Page.FileChooser, "fileChooser"]
    ]));
  }
  static from(page) {
    return page._object;
  }
  static fromNullable(page) {
    return page ? Page.from(page) : null;
  }
  _onFrameAttached(frame) {
    frame._page = this;
    this._frames.add(frame);
    if (frame._parentFrame)
      frame._parentFrame._childFrames.add(frame);
    this.emit(import_events.Events.Page.FrameAttached, frame);
  }
  _onFrameDetached(frame) {
    this._frames.delete(frame);
    frame._detached = true;
    if (frame._parentFrame)
      frame._parentFrame._childFrames.delete(frame);
    this.emit(import_events.Events.Page.FrameDetached, frame);
  }
  async _onRoute(route) {
    route._context = this.context();
    const routeHandlers = this._routes.slice();
    for (const routeHandler of routeHandlers) {
      if (this._closeWasCalled || this._browserContext._closingStatus !== "none")
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
    await this._browserContext._onRoute(route);
  }
  async _onWebSocketRoute(webSocketRoute) {
    const routeHandler = this._webSocketRoutes.find((route) => route.matches(webSocketRoute.url()));
    if (routeHandler)
      await routeHandler.handle(webSocketRoute);
    else
      await this._browserContext._onWebSocketRoute(webSocketRoute);
  }
  async _onBinding(bindingCall) {
    const func = this._bindings.get(bindingCall._initializer.name);
    if (func) {
      await bindingCall.call(func);
      return;
    }
    await this._browserContext._onBinding(bindingCall);
  }
  _onWorker(worker) {
    this._workers.add(worker);
    worker._page = this;
    this.emit(import_events.Events.Page.Worker, worker);
  }
  _onClose() {
    this._closed = true;
    this._browserContext._pages.delete(this);
    this._disposeHarRouters();
    this.emit(import_events.Events.Page.Close, this);
  }
  _onCrash() {
    this.emit(import_events.Events.Page.Crash, this);
  }
  context() {
    return this._browserContext;
  }
  async opener() {
    if (!this._opener || this._opener.isClosed())
      return null;
    return this._opener;
  }
  mainFrame() {
    return this._mainFrame;
  }
  frame(frameSelector) {
    const name = (0, import_rtti.isString)(frameSelector) ? frameSelector : frameSelector.name;
    const url = (0, import_rtti.isObject)(frameSelector) ? frameSelector.url : void 0;
    (0, import_assert.assert)(name || url, "Either name or url matcher should be specified");
    return this.frames().find((f) => {
      if (name)
        return f.name() === name;
      return (0, import_urlMatch.urlMatches)(this._browserContext._options.baseURL, f.url(), url);
    }) || null;
  }
  frames() {
    return [...this._frames];
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
  }
  _forceVideo() {
    if (!this._video)
      this._video = new import_video.Video(this, this._connection);
    return this._video;
  }
  video() {
    if (!this._browserContext._options.recordVideo)
      return null;
    return this._forceVideo();
  }
  async $(selector, options) {
    return await this._mainFrame.$(selector, options);
  }
  async waitForSelector(selector, options) {
    return await this._mainFrame.waitForSelector(selector, options);
  }
  async dispatchEvent(selector, type, eventInit, options) {
    return await this._mainFrame.dispatchEvent(selector, type, eventInit, options);
  }
  async evaluateHandle(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    return await this._mainFrame.evaluateHandle(pageFunction, arg);
  }
  async $eval(selector, pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 3);
    return await this._mainFrame.$eval(selector, pageFunction, arg);
  }
  async $$eval(selector, pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 3);
    return await this._mainFrame.$$eval(selector, pageFunction, arg);
  }
  async $$(selector) {
    return await this._mainFrame.$$(selector);
  }
  async addScriptTag(options = {}) {
    return await this._mainFrame.addScriptTag(options);
  }
  async addStyleTag(options = {}) {
    return await this._mainFrame.addStyleTag(options);
  }
  async exposeFunction(name, callback) {
    await this._channel.exposeBinding({ name });
    const binding = (source, ...args) => callback(...args);
    this._bindings.set(name, binding);
  }
  async exposeBinding(name, callback, options = {}) {
    await this._channel.exposeBinding({ name, needsHandle: options.handle });
    this._bindings.set(name, callback);
  }
  async setExtraHTTPHeaders(headers) {
    (0, import_network.validateHeaders)(headers);
    await this._channel.setExtraHTTPHeaders({ headers: (0, import_headers.headersObjectToArray)(headers) });
  }
  url() {
    return this._mainFrame.url();
  }
  async content() {
    return await this._mainFrame.content();
  }
  async setContent(html, options) {
    return await this._mainFrame.setContent(html, options);
  }
  async goto(url, options) {
    return await this._mainFrame.goto(url, options);
  }
  async reload(options = {}) {
    const waitUntil = (0, import_frame.verifyLoadState)("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    return import_network.Response.fromNullable((await this._channel.reload({ ...options, waitUntil, timeout: this._timeoutSettings.navigationTimeout(options) })).response);
  }
  async addLocatorHandler(locator, handler, options = {}) {
    if (locator._frame !== this._mainFrame)
      throw new Error(`Locator must belong to the main frame of this page`);
    if (options.times === 0)
      return;
    const { uid } = await this._channel.registerLocatorHandler({ selector: locator._selector, noWaitAfter: options.noWaitAfter });
    this._locatorHandlers.set(uid, { locator, handler, times: options.times });
  }
  async _onLocatorHandlerTriggered(uid) {
    let remove = false;
    try {
      const handler = this._locatorHandlers.get(uid);
      if (handler && handler.times !== 0) {
        if (handler.times !== void 0)
          handler.times--;
        await handler.handler(handler.locator);
      }
      remove = handler?.times === 0;
    } finally {
      if (remove)
        this._locatorHandlers.delete(uid);
      this._channel.resolveLocatorHandlerNoReply({ uid, remove }).catch(() => {
      });
    }
  }
  async removeLocatorHandler(locator) {
    for (const [uid, data] of this._locatorHandlers) {
      if (data.locator._equals(locator)) {
        this._locatorHandlers.delete(uid);
        await this._channel.unregisterLocatorHandler({ uid }).catch(() => {
        });
      }
    }
  }
  async waitForLoadState(state, options) {
    return await this._mainFrame.waitForLoadState(state, options);
  }
  async waitForNavigation(options) {
    return await this._mainFrame.waitForNavigation(options);
  }
  async waitForURL(url, options) {
    return await this._mainFrame.waitForURL(url, options);
  }
  async waitForRequest(urlOrPredicate, options = {}) {
    const predicate = async (request) => {
      if ((0, import_rtti.isString)(urlOrPredicate) || (0, import_rtti.isRegExp)(urlOrPredicate))
        return (0, import_urlMatch.urlMatches)(this._browserContext._options.baseURL, request.url(), urlOrPredicate);
      return await urlOrPredicate(request);
    };
    const trimmedUrl = trimUrl(urlOrPredicate);
    const logLine = trimmedUrl ? `waiting for request ${trimmedUrl}` : void 0;
    return await this._waitForEvent(import_events.Events.Page.Request, { predicate, timeout: options.timeout }, logLine);
  }
  async waitForResponse(urlOrPredicate, options = {}) {
    const predicate = async (response) => {
      if ((0, import_rtti.isString)(urlOrPredicate) || (0, import_rtti.isRegExp)(urlOrPredicate))
        return (0, import_urlMatch.urlMatches)(this._browserContext._options.baseURL, response.url(), urlOrPredicate);
      return await urlOrPredicate(response);
    };
    const trimmedUrl = trimUrl(urlOrPredicate);
    const logLine = trimmedUrl ? `waiting for response ${trimmedUrl}` : void 0;
    return await this._waitForEvent(import_events.Events.Page.Response, { predicate, timeout: options.timeout }, logLine);
  }
  async waitForEvent(event, optionsOrPredicate = {}) {
    return await this._waitForEvent(event, optionsOrPredicate, `waiting for event "${event}"`);
  }
  _closeErrorWithReason() {
    return new import_errors.TargetClosedError(this._closeReason || this._browserContext._effectiveCloseReason());
  }
  async _waitForEvent(event, optionsOrPredicate, logLine) {
    return await this._wrapApiCall(async () => {
      const timeout = this._timeoutSettings.timeout(typeof optionsOrPredicate === "function" ? {} : optionsOrPredicate);
      const predicate = typeof optionsOrPredicate === "function" ? optionsOrPredicate : optionsOrPredicate.predicate;
      const waiter = import_waiter.Waiter.createForEvent(this, event);
      if (logLine)
        waiter.log(logLine);
      waiter.rejectOnTimeout(timeout, `Timeout ${timeout}ms exceeded while waiting for event "${event}"`);
      if (event !== import_events.Events.Page.Crash)
        waiter.rejectOnEvent(this, import_events.Events.Page.Crash, new Error("Page crashed"));
      if (event !== import_events.Events.Page.Close)
        waiter.rejectOnEvent(this, import_events.Events.Page.Close, () => this._closeErrorWithReason());
      const result = await waiter.waitForEvent(this, event, predicate);
      waiter.dispose();
      return result;
    });
  }
  async goBack(options = {}) {
    const waitUntil = (0, import_frame.verifyLoadState)("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    return import_network.Response.fromNullable((await this._channel.goBack({ ...options, waitUntil, timeout: this._timeoutSettings.navigationTimeout(options) })).response);
  }
  async goForward(options = {}) {
    const waitUntil = (0, import_frame.verifyLoadState)("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    return import_network.Response.fromNullable((await this._channel.goForward({ ...options, waitUntil, timeout: this._timeoutSettings.navigationTimeout(options) })).response);
  }
  async requestGC() {
    await this._channel.requestGC();
  }
  async emulateMedia(options = {}) {
    await this._channel.emulateMedia({
      media: options.media === null ? "no-override" : options.media,
      colorScheme: options.colorScheme === null ? "no-override" : options.colorScheme,
      reducedMotion: options.reducedMotion === null ? "no-override" : options.reducedMotion,
      forcedColors: options.forcedColors === null ? "no-override" : options.forcedColors,
      contrast: options.contrast === null ? "no-override" : options.contrast
    });
  }
  async setViewportSize(viewportSize) {
    this._viewportSize = viewportSize;
    await this._channel.setViewportSize({ viewportSize });
  }
  viewportSize() {
    return this._viewportSize || null;
  }
  async evaluate(pageFunction, arg) {
    (0, import_jsHandle.assertMaxArguments)(arguments.length, 2);
    return await this._mainFrame.evaluate(pageFunction, arg);
  }
  async _evaluateFunction(functionDeclaration) {
    return this._mainFrame._evaluateFunction(functionDeclaration);
  }
  async addInitScript(script, arg) {
    const source = await (0, import_clientHelper.evaluationScript)(this._platform, script, arg);
    await this._channel.addInitScript({ source });
  }
  async route(url, handler, options = {}) {
    this._routes.unshift(new import_network.RouteHandler(this._platform, this._browserContext._options.baseURL, url, handler, options.times));
    await this._updateInterceptionPatterns({ title: "Route requests" });
  }
  async routeFromHAR(har, options = {}) {
    const localUtils = this._connection.localUtils();
    if (!localUtils)
      throw new Error("Route from har is not supported in thin clients");
    if (options.update) {
      await this._browserContext._recordIntoHAR(har, this, options);
      return;
    }
    const harRouter = await import_harRouter.HarRouter.create(localUtils, har, options.notFound || "abort", { urlMatch: options.url });
    this._harRouters.push(harRouter);
    await harRouter.addPageRoute(this);
  }
  async routeWebSocket(url, handler) {
    this._webSocketRoutes.unshift(new import_network.WebSocketRouteHandler(this._browserContext._options.baseURL, url, handler));
    await this._updateWebSocketInterceptionPatterns({ title: "Route WebSockets" });
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
    const patterns = import_network.RouteHandler.prepareInterceptionPatterns(this._routes);
    await this._wrapApiCall(() => this._channel.setNetworkInterceptionPatterns({ patterns }), options);
  }
  async _updateWebSocketInterceptionPatterns(options) {
    const patterns = import_network.WebSocketRouteHandler.prepareInterceptionPatterns(this._webSocketRoutes);
    await this._wrapApiCall(() => this._channel.setWebSocketInterceptionPatterns({ patterns }), options);
  }
  async screenshot(options = {}) {
    const mask = options.mask;
    const copy = { ...options, mask: void 0, timeout: this._timeoutSettings.timeout(options) };
    if (!copy.type)
      copy.type = (0, import_elementHandle.determineScreenshotType)(options);
    if (mask) {
      copy.mask = mask.map((locator) => ({
        frame: locator._frame._channel,
        selector: locator._selector
      }));
    }
    const result = await this._channel.screenshot(copy);
    if (options.path) {
      await (0, import_fileUtils.mkdirIfNeeded)(this._platform, options.path);
      await this._platform.fs().promises.writeFile(options.path, result.binary);
    }
    return result.binary;
  }
  async _expectScreenshot(options) {
    const mask = options?.mask ? options?.mask.map((locator2) => ({
      frame: locator2._frame._channel,
      selector: locator2._selector
    })) : void 0;
    const locator = options.locator ? {
      frame: options.locator._frame._channel,
      selector: options.locator._selector
    } : void 0;
    return await this._channel.expectScreenshot({
      ...options,
      isNot: !!options.isNot,
      locator,
      mask
    });
  }
  async title() {
    return await this._mainFrame.title();
  }
  async bringToFront() {
    await this._channel.bringToFront();
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async close(options = {}) {
    this._closeReason = options.reason;
    if (!options.runBeforeUnload)
      this._closeWasCalled = true;
    try {
      if (this._ownedContext)
        await this._ownedContext.close();
      else
        await this._channel.close(options);
    } catch (e) {
      if ((0, import_errors.isTargetClosedError)(e) && !options.runBeforeUnload)
        return;
      throw e;
    }
  }
  isClosed() {
    return this._closed;
  }
  async click(selector, options) {
    return await this._mainFrame.click(selector, options);
  }
  async dragAndDrop(source, target, options) {
    return await this._mainFrame.dragAndDrop(source, target, options);
  }
  async dblclick(selector, options) {
    await this._mainFrame.dblclick(selector, options);
  }
  async tap(selector, options) {
    return await this._mainFrame.tap(selector, options);
  }
  async fill(selector, value, options) {
    return await this._mainFrame.fill(selector, value, options);
  }
  async consoleMessages() {
    const { messages } = await this._channel.consoleMessages();
    return messages.map((message) => new import_consoleMessage.ConsoleMessage(this._platform, message, this, null));
  }
  async pageErrors() {
    const { errors } = await this._channel.pageErrors();
    return errors.map((error) => (0, import_errors.parseError)(error));
  }
  locator(selector, options) {
    return this.mainFrame().locator(selector, options);
  }
  getByTestId(testId) {
    return this.mainFrame().getByTestId(testId);
  }
  getByAltText(text, options) {
    return this.mainFrame().getByAltText(text, options);
  }
  getByLabel(text, options) {
    return this.mainFrame().getByLabel(text, options);
  }
  getByPlaceholder(text, options) {
    return this.mainFrame().getByPlaceholder(text, options);
  }
  getByText(text, options) {
    return this.mainFrame().getByText(text, options);
  }
  getByTitle(text, options) {
    return this.mainFrame().getByTitle(text, options);
  }
  getByRole(role, options = {}) {
    return this.mainFrame().getByRole(role, options);
  }
  frameLocator(selector) {
    return this.mainFrame().frameLocator(selector);
  }
  async focus(selector, options) {
    return await this._mainFrame.focus(selector, options);
  }
  async textContent(selector, options) {
    return await this._mainFrame.textContent(selector, options);
  }
  async innerText(selector, options) {
    return await this._mainFrame.innerText(selector, options);
  }
  async innerHTML(selector, options) {
    return await this._mainFrame.innerHTML(selector, options);
  }
  async getAttribute(selector, name, options) {
    return await this._mainFrame.getAttribute(selector, name, options);
  }
  async inputValue(selector, options) {
    return await this._mainFrame.inputValue(selector, options);
  }
  async isChecked(selector, options) {
    return await this._mainFrame.isChecked(selector, options);
  }
  async isDisabled(selector, options) {
    return await this._mainFrame.isDisabled(selector, options);
  }
  async isEditable(selector, options) {
    return await this._mainFrame.isEditable(selector, options);
  }
  async isEnabled(selector, options) {
    return await this._mainFrame.isEnabled(selector, options);
  }
  async isHidden(selector, options) {
    return await this._mainFrame.isHidden(selector, options);
  }
  async isVisible(selector, options) {
    return await this._mainFrame.isVisible(selector, options);
  }
  async hover(selector, options) {
    return await this._mainFrame.hover(selector, options);
  }
  async selectOption(selector, values, options) {
    return await this._mainFrame.selectOption(selector, values, options);
  }
  async setInputFiles(selector, files, options) {
    return await this._mainFrame.setInputFiles(selector, files, options);
  }
  async type(selector, text, options) {
    return await this._mainFrame.type(selector, text, options);
  }
  async press(selector, key, options) {
    return await this._mainFrame.press(selector, key, options);
  }
  async check(selector, options) {
    return await this._mainFrame.check(selector, options);
  }
  async uncheck(selector, options) {
    return await this._mainFrame.uncheck(selector, options);
  }
  async setChecked(selector, checked, options) {
    return await this._mainFrame.setChecked(selector, checked, options);
  }
  async waitForTimeout(timeout) {
    return await this._mainFrame.waitForTimeout(timeout);
  }
  async waitForFunction(pageFunction, arg, options) {
    return await this._mainFrame.waitForFunction(pageFunction, arg, options);
  }
  async requests() {
    const { requests } = await this._channel.requests();
    return requests.map((request) => import_network.Request.from(request));
  }
  workers() {
    return [...this._workers];
  }
  async pause(_options) {
    if (this._platform.isJSDebuggerAttached())
      return;
    const defaultNavigationTimeout = this._browserContext._timeoutSettings.defaultNavigationTimeout();
    const defaultTimeout = this._browserContext._timeoutSettings.defaultTimeout();
    this._browserContext.setDefaultNavigationTimeout(0);
    this._browserContext.setDefaultTimeout(0);
    this._instrumentation?.onWillPause({ keepTestTimeout: !!_options?.__testHookKeepTestTimeout });
    await this._closedOrCrashedScope.safeRace(this.context()._channel.pause());
    this._browserContext.setDefaultNavigationTimeout(defaultNavigationTimeout);
    this._browserContext.setDefaultTimeout(defaultTimeout);
  }
  async pdf(options = {}) {
    const transportOptions = { ...options };
    if (transportOptions.margin)
      transportOptions.margin = { ...transportOptions.margin };
    if (typeof options.width === "number")
      transportOptions.width = options.width + "px";
    if (typeof options.height === "number")
      transportOptions.height = options.height + "px";
    for (const margin of ["top", "right", "bottom", "left"]) {
      const index = margin;
      if (options.margin && typeof options.margin[index] === "number")
        transportOptions.margin[index] = transportOptions.margin[index] + "px";
    }
    const result = await this._channel.pdf(transportOptions);
    if (options.path) {
      const platform = this._platform;
      await platform.fs().promises.mkdir(platform.path().dirname(options.path), { recursive: true });
      await platform.fs().promises.writeFile(options.path, result.pdf);
    }
    return result.pdf;
  }
  // @ts-expect-error agents are hidden
  async agent(options = {}) {
    const params = {
      api: options.provider?.api,
      apiEndpoint: options.provider?.apiEndpoint,
      apiKey: options.provider?.apiKey,
      apiTimeout: options.provider?.apiTimeout,
      apiCacheFile: options.provider?._apiCacheFile,
      doNotRenderActive: options._doNotRenderActive,
      model: options.provider?.model,
      cacheFile: options.cache?.cacheFile,
      cacheOutFile: options.cache?.cacheOutFile,
      maxTokens: options.limits?.maxTokens,
      maxActions: options.limits?.maxActions,
      maxActionRetries: options.limits?.maxActionRetries,
      // @ts-expect-error runAgents is hidden
      secrets: options.secrets ? Object.entries(options.secrets).map(([name, value]) => ({ name, value })) : void 0,
      systemPrompt: options.systemPrompt
    };
    const { agent } = await this._channel.agent(params);
    const pageAgent = import_pageAgent.PageAgent.from(agent);
    pageAgent._expectTimeout = options?.expect?.timeout;
    return pageAgent;
  }
  async _snapshotForAI(options = {}) {
    return await this._channel.snapshotForAI({ timeout: this._timeoutSettings.timeout(options), track: options.track });
  }
}
class BindingCall extends import_channelOwner.ChannelOwner {
  static from(channel) {
    return channel._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
  }
  async call(func) {
    try {
      const frame = import_frame.Frame.from(this._initializer.frame);
      const source = {
        context: frame._page.context(),
        page: frame._page,
        frame
      };
      let result;
      if (this._initializer.handle)
        result = await func(source, import_jsHandle.JSHandle.from(this._initializer.handle));
      else
        result = await func(source, ...this._initializer.args.map(import_jsHandle.parseResult));
      this._channel.resolve({ result: (0, import_jsHandle.serializeArgument)(result) }).catch(() => {
      });
    } catch (e) {
      this._channel.reject({ error: (0, import_errors.serializeError)(e) }).catch(() => {
      });
    }
  }
}
function trimUrl(param) {
  if ((0, import_rtti.isRegExp)(param))
    return `/${(0, import_stringUtils.trimStringWithEllipsis)(param.source, 50)}/${param.flags}`;
  if ((0, import_rtti.isString)(param))
    return `"${(0, import_stringUtils.trimStringWithEllipsis)(param, 50)}"`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BindingCall,
  Page
});
