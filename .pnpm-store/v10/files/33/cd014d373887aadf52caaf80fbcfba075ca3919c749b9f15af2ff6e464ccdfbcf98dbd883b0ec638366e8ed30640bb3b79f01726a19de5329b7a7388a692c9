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
var pageDispatcher_exports = {};
__export(pageDispatcher_exports, {
  BindingCallDispatcher: () => BindingCallDispatcher,
  PageDispatcher: () => PageDispatcher,
  WorkerDispatcher: () => WorkerDispatcher
});
module.exports = __toCommonJS(pageDispatcher_exports);
var import_page = require("../page");
var import_dispatcher = require("./dispatcher");
var import_errors = require("../errors");
var import_artifactDispatcher = require("./artifactDispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_networkDispatchers2 = require("./networkDispatchers");
var import_networkDispatchers3 = require("./networkDispatchers");
var import_webSocketRouteDispatcher = require("./webSocketRouteDispatcher");
var import_instrumentation = require("../instrumentation");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
var import_pageAgentDispatcher = require("./pageAgentDispatcher");
class PageDispatcher extends import_dispatcher.Dispatcher {
  constructor(parentScope, page) {
    const mainFrame = import_frameDispatcher.FrameDispatcher.from(parentScope, page.mainFrame());
    super(parentScope, page, "Page", {
      mainFrame,
      viewportSize: page.emulatedSize()?.viewport,
      isClosed: page.isClosed(),
      opener: PageDispatcher.fromNullable(parentScope, page.opener())
    });
    this._type_EventTarget = true;
    this._type_Page = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this._webSocketInterceptionPatterns = [];
    this._bindings = [];
    this._initScripts = [];
    this._interceptionUrlMatchers = [];
    this._locatorHandlers = /* @__PURE__ */ new Set();
    this._jsCoverageActive = false;
    this._cssCoverageActive = false;
    this.adopt(mainFrame);
    this._page = page;
    this._requestInterceptor = (route, request) => {
      const matchesSome = this._interceptionUrlMatchers.some((urlMatch) => (0, import_urlMatch.urlMatches)(this._page.browserContext._options.baseURL, request.url(), urlMatch));
      if (!matchesSome) {
        route.continue({ isFallback: true }).catch(() => {
        });
        return;
      }
      this._dispatchEvent("route", { route: new import_networkDispatchers3.RouteDispatcher(import_networkDispatchers.RequestDispatcher.from(this.parentScope(), request), route) });
    };
    this.addObjectListener(import_page.Page.Events.Close, () => {
      this._dispatchEvent("close");
      this._dispose();
    });
    this.addObjectListener(import_page.Page.Events.Crash, () => this._dispatchEvent("crash"));
    this.addObjectListener(import_page.Page.Events.Download, (download) => {
      this._dispatchEvent("download", { url: download.url, suggestedFilename: download.suggestedFilename(), artifact: import_artifactDispatcher.ArtifactDispatcher.from(parentScope, download.artifact) });
    });
    this.addObjectListener(import_page.Page.Events.EmulatedSizeChanged, () => this._dispatchEvent("viewportSizeChanged", { viewportSize: page.emulatedSize()?.viewport }));
    this.addObjectListener(import_page.Page.Events.FileChooser, (fileChooser) => this._dispatchEvent("fileChooser", {
      element: import_elementHandlerDispatcher.ElementHandleDispatcher.from(mainFrame, fileChooser.element()),
      isMultiple: fileChooser.isMultiple()
    }));
    this.addObjectListener(import_page.Page.Events.FrameAttached, (frame) => this._onFrameAttached(frame));
    this.addObjectListener(import_page.Page.Events.FrameDetached, (frame) => this._onFrameDetached(frame));
    this.addObjectListener(import_page.Page.Events.LocatorHandlerTriggered, (uid) => this._dispatchEvent("locatorHandlerTriggered", { uid }));
    this.addObjectListener(import_page.Page.Events.WebSocket, (webSocket) => this._dispatchEvent("webSocket", { webSocket: new import_networkDispatchers3.WebSocketDispatcher(this, webSocket) }));
    this.addObjectListener(import_page.Page.Events.Worker, (worker) => this._dispatchEvent("worker", { worker: new WorkerDispatcher(this, worker) }));
    this.addObjectListener(import_page.Page.Events.Video, (artifact) => this._dispatchEvent("video", { artifact: import_artifactDispatcher.ArtifactDispatcher.from(parentScope, artifact) }));
    if (page.video)
      this._dispatchEvent("video", { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this.parentScope(), page.video) });
    const frames = page.frameManager.frames();
    for (let i = 1; i < frames.length; i++)
      this._onFrameAttached(frames[i]);
  }
  static from(parentScope, page) {
    return PageDispatcher.fromNullable(parentScope, page);
  }
  static fromNullable(parentScope, page) {
    if (!page)
      return void 0;
    const result = parentScope.connection.existingDispatcher(page);
    return result || new PageDispatcher(parentScope, page);
  }
  page() {
    return this._page;
  }
  async exposeBinding(params, progress) {
    const binding = await this._page.exposeBinding(progress, params.name, !!params.needsHandle, (source, ...args) => {
      if (this._disposed)
        return;
      const binding2 = new BindingCallDispatcher(this, params.name, !!params.needsHandle, source, args);
      this._dispatchEvent("bindingCall", { binding: binding2 });
      return binding2.promise();
    });
    this._bindings.push(binding);
  }
  async setExtraHTTPHeaders(params, progress) {
    await this._page.setExtraHTTPHeaders(progress, params.headers);
  }
  async reload(params, progress) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.reload(progress, params)) };
  }
  async goBack(params, progress) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.goBack(progress, params)) };
  }
  async goForward(params, progress) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.goForward(progress, params)) };
  }
  async requestGC(params, progress) {
    await progress.race(this._page.requestGC());
  }
  async registerLocatorHandler(params, progress) {
    const uid = this._page.registerLocatorHandler(params.selector, params.noWaitAfter);
    this._locatorHandlers.add(uid);
    return { uid };
  }
  async resolveLocatorHandlerNoReply(params, progress) {
    this._page.resolveLocatorHandler(params.uid, params.remove);
  }
  async unregisterLocatorHandler(params, progress) {
    this._page.unregisterLocatorHandler(params.uid);
    this._locatorHandlers.delete(params.uid);
  }
  async emulateMedia(params, progress) {
    await this._page.emulateMedia(progress, {
      media: params.media,
      colorScheme: params.colorScheme,
      reducedMotion: params.reducedMotion,
      forcedColors: params.forcedColors,
      contrast: params.contrast
    });
  }
  async setViewportSize(params, progress) {
    await this._page.setViewportSize(progress, params.viewportSize);
  }
  async addInitScript(params, progress) {
    this._initScripts.push(await this._page.addInitScript(progress, params.source));
  }
  async setNetworkInterceptionPatterns(params, progress) {
    const hadMatchers = this._interceptionUrlMatchers.length > 0;
    if (!params.patterns.length) {
      if (hadMatchers)
        await this._page.removeRequestInterceptor(this._requestInterceptor);
      this._interceptionUrlMatchers = [];
    } else {
      this._interceptionUrlMatchers = params.patterns.map((pattern) => pattern.regexSource ? new RegExp(pattern.regexSource, pattern.regexFlags) : pattern.glob);
      if (!hadMatchers)
        await this._page.addRequestInterceptor(progress, this._requestInterceptor);
    }
  }
  async setWebSocketInterceptionPatterns(params, progress) {
    this._webSocketInterceptionPatterns = params.patterns;
    if (params.patterns.length && !this._routeWebSocketInitScript)
      this._routeWebSocketInitScript = await import_webSocketRouteDispatcher.WebSocketRouteDispatcher.install(progress, this.connection, this._page);
  }
  async expectScreenshot(params, progress) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    const locator = params.locator ? {
      frame: params.locator.frame._object,
      selector: params.locator.selector
    } : void 0;
    return await this._page.expectScreenshot(progress, {
      ...params,
      locator,
      mask
    });
  }
  async screenshot(params, progress) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    return { binary: await this._page.screenshot(progress, { ...params, mask }) };
  }
  async close(params, progress) {
    if (!params.runBeforeUnload)
      progress.metadata.potentiallyClosesScope = true;
    await this._page.close(params);
  }
  async updateSubscription(params, progress) {
    if (params.event === "fileChooser")
      await this._page.setFileChooserInterceptedBy(params.enabled, this);
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
  async keyboardDown(params, progress) {
    await this._page.keyboard.down(progress, params.key);
  }
  async keyboardUp(params, progress) {
    await this._page.keyboard.up(progress, params.key);
  }
  async keyboardInsertText(params, progress) {
    await this._page.keyboard.insertText(progress, params.text);
  }
  async keyboardType(params, progress) {
    await this._page.keyboard.type(progress, params.text, params);
  }
  async keyboardPress(params, progress) {
    await this._page.keyboard.press(progress, params.key, params);
  }
  async consoleMessages(params, progress) {
    this._subscriptions.add("console");
    return { messages: this._page.consoleMessages().map((message) => this.parentScope().serializeConsoleMessage(message, this)) };
  }
  async pageErrors(params, progress) {
    return { errors: this._page.pageErrors().map((error) => (0, import_errors.serializeError)(error)) };
  }
  async mouseMove(params, progress) {
    progress.metadata.point = { x: params.x, y: params.y };
    await this._page.mouse.move(progress, params.x, params.y, params);
  }
  async mouseDown(params, progress) {
    progress.metadata.point = this._page.mouse.currentPoint();
    await this._page.mouse.down(progress, params);
  }
  async mouseUp(params, progress) {
    progress.metadata.point = this._page.mouse.currentPoint();
    await this._page.mouse.up(progress, params);
  }
  async mouseClick(params, progress) {
    progress.metadata.point = { x: params.x, y: params.y };
    await this._page.mouse.click(progress, params.x, params.y, params);
  }
  async mouseWheel(params, progress) {
    await this._page.mouse.wheel(progress, params.deltaX, params.deltaY);
  }
  async touchscreenTap(params, progress) {
    progress.metadata.point = { x: params.x, y: params.y };
    await this._page.touchscreen.tap(progress, params.x, params.y);
  }
  async pdf(params, progress) {
    if (!this._page.pdf)
      throw new Error("PDF generation is only supported for Headless Chromium");
    const buffer = await progress.race(this._page.pdf(params));
    return { pdf: buffer };
  }
  async requests(params, progress) {
    this._subscriptions.add("request");
    return { requests: this._page.networkRequests().map((request) => import_networkDispatchers.RequestDispatcher.from(this.parentScope(), request)) };
  }
  async snapshotForAI(params, progress) {
    return await this._page.snapshotForAI(progress, params);
  }
  async bringToFront(params, progress) {
    await progress.race(this._page.bringToFront());
  }
  async startJSCoverage(params, progress) {
    const coverage = this._page.coverage;
    await coverage.startJSCoverage(progress, params);
    this._jsCoverageActive = true;
  }
  async stopJSCoverage(params, progress) {
    this._jsCoverageActive = false;
    const coverage = this._page.coverage;
    return await coverage.stopJSCoverage();
  }
  async startCSSCoverage(params, progress) {
    const coverage = this._page.coverage;
    await coverage.startCSSCoverage(progress, params);
    this._cssCoverageActive = true;
  }
  async stopCSSCoverage(params, progress) {
    this._cssCoverageActive = false;
    const coverage = this._page.coverage;
    return await coverage.stopCSSCoverage();
  }
  async agent(params, progress) {
    return { agent: new import_pageAgentDispatcher.PageAgentDispatcher(this, params) };
  }
  _onFrameAttached(frame) {
    this._dispatchEvent("frameAttached", { frame: import_frameDispatcher.FrameDispatcher.from(this.parentScope(), frame) });
  }
  _onFrameDetached(frame) {
    this._dispatchEvent("frameDetached", { frame: import_frameDispatcher.FrameDispatcher.from(this.parentScope(), frame) });
  }
  _onDispose() {
    if (this._page.isClosedOrClosingOrCrashed())
      return;
    this._interceptionUrlMatchers = [];
    this._page.removeRequestInterceptor(this._requestInterceptor).catch(() => {
    });
    this._page.removeExposedBindings(this._bindings).catch(() => {
    });
    this._bindings = [];
    this._page.removeInitScripts(this._initScripts).catch(() => {
    });
    this._initScripts = [];
    if (this._routeWebSocketInitScript)
      import_webSocketRouteDispatcher.WebSocketRouteDispatcher.uninstall(this.connection, this._page, this._routeWebSocketInitScript).catch(() => {
      });
    this._routeWebSocketInitScript = void 0;
    for (const uid of this._locatorHandlers)
      this._page.unregisterLocatorHandler(uid);
    this._locatorHandlers.clear();
    this._page.setFileChooserInterceptedBy(false, this).catch(() => {
    });
    if (this._jsCoverageActive)
      this._page.coverage.stopJSCoverage().catch(() => {
      });
    this._jsCoverageActive = false;
    if (this._cssCoverageActive)
      this._page.coverage.stopCSSCoverage().catch(() => {
      });
    this._cssCoverageActive = false;
  }
}
class WorkerDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, worker) {
    super(scope, worker, "Worker", {
      url: worker.url
    });
    this._type_Worker = true;
    this._type_EventTarget = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this.addObjectListener(import_page.Worker.Events.Close, () => this._dispatchEvent("close"));
  }
  static fromNullable(scope, worker) {
    if (!worker)
      return void 0;
    const result = scope.connection.existingDispatcher(worker);
    return result || new WorkerDispatcher(scope, worker);
  }
  async evaluateExpression(params, progress) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await progress.race(this._object.evaluateExpression(params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg)))) };
  }
  async evaluateExpressionHandle(params, progress) {
    return { handle: import_jsHandleDispatcher.JSHandleDispatcher.fromJSHandle(this, await progress.race(this._object.evaluateExpressionHandle(params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg)))) };
  }
  async updateSubscription(params, progress) {
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
}
class BindingCallDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, name, needsHandle, source, args) {
    const frameDispatcher = import_frameDispatcher.FrameDispatcher.from(scope.parentScope(), source.frame);
    super(scope, new import_instrumentation.SdkObject(scope._object, "bindingCall"), "BindingCall", {
      frame: frameDispatcher,
      name,
      args: needsHandle ? void 0 : args.map(import_jsHandleDispatcher.serializeResult),
      handle: needsHandle ? import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSOrElementHandle(frameDispatcher, args[0]) : void 0
    });
    this._type_BindingCall = true;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  promise() {
    return this._promise;
  }
  async resolve(params, progress) {
    this._resolve((0, import_jsHandleDispatcher.parseArgument)(params.result));
    this._dispose();
  }
  async reject(params, progress) {
    this._reject((0, import_errors.parseError)(params.error));
    this._dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BindingCallDispatcher,
  PageDispatcher,
  WorkerDispatcher
});
