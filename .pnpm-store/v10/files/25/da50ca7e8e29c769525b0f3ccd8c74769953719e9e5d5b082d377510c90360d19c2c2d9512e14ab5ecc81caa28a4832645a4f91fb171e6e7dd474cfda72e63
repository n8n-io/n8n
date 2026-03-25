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
var frames_exports = {};
__export(frames_exports, {
  Frame: () => Frame,
  FrameManager: () => FrameManager,
  NavigationAbortedError: () => NavigationAbortedError
});
module.exports = __toCommonJS(frames_exports);
var import_browserContext = require("./browserContext");
var dom = __toESM(require("./dom"));
var import_errors = require("./errors");
var import_fileUploadUtils = require("./fileUploadUtils");
var import_frameSelectors = require("./frameSelectors");
var import_helper = require("./helper");
var import_instrumentation = require("./instrumentation");
var js = __toESM(require("./javascript"));
var network = __toESM(require("./network"));
var import_page = require("./page");
var import_progress = require("./progress");
var types = __toESM(require("./types"));
var import_utils = require("../utils");
var import_protocolError = require("./protocolError");
var import_debugLogger = require("./utils/debugLogger");
var import_eventsHelper = require("./utils/eventsHelper");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_callLog = require("./callLog");
class NavigationAbortedError extends Error {
  constructor(documentId, message) {
    super(message);
    this.documentId = documentId;
  }
}
const kDummyFrameId = "<dummy>";
class FrameManager {
  constructor(page) {
    this._frames = /* @__PURE__ */ new Map();
    this._consoleMessageTags = /* @__PURE__ */ new Map();
    this._signalBarriers = /* @__PURE__ */ new Set();
    this._webSockets = /* @__PURE__ */ new Map();
    this._nextFrameSeq = 0;
    this._page = page;
    this._mainFrame = void 0;
  }
  nextFrameSeq() {
    return this._nextFrameSeq++;
  }
  createDummyMainFrameIfNeeded() {
    if (!this._mainFrame)
      this.frameAttached(kDummyFrameId, null);
  }
  dispose() {
    for (const frame of this._frames.values()) {
      frame._stopNetworkIdleTimer();
      frame._invalidateNonStallingEvaluations("Target crashed");
    }
  }
  mainFrame() {
    return this._mainFrame;
  }
  frames() {
    const frames = [];
    collect(this._mainFrame);
    return frames;
    function collect(frame) {
      frames.push(frame);
      for (const subframe of frame.childFrames())
        collect(subframe);
    }
  }
  frame(frameId) {
    return this._frames.get(frameId) || null;
  }
  frameAttached(frameId, parentFrameId) {
    const parentFrame = parentFrameId ? this._frames.get(parentFrameId) : null;
    if (!parentFrame) {
      if (this._mainFrame) {
        this._frames.delete(this._mainFrame._id);
        this._mainFrame._id = frameId;
      } else {
        (0, import_utils.assert)(!this._frames.has(frameId));
        this._mainFrame = new Frame(this._page, frameId, parentFrame);
      }
      this._frames.set(frameId, this._mainFrame);
      return this._mainFrame;
    } else {
      (0, import_utils.assert)(!this._frames.has(frameId));
      const frame = new Frame(this._page, frameId, parentFrame);
      this._frames.set(frameId, frame);
      this._page.emit(import_page.Page.Events.FrameAttached, frame);
      return frame;
    }
  }
  async waitForSignalsCreatedBy(progress, waitAfter, action) {
    if (!waitAfter)
      return action();
    const barrier = new SignalBarrier(progress);
    this._signalBarriers.add(barrier);
    try {
      const result = await action();
      await progress.race(this._page.delegate.inputActionEpilogue());
      await barrier.waitFor();
      await new Promise((0, import_utils.makeWaitForNextTask)());
      return result;
    } finally {
      this._signalBarriers.delete(barrier);
    }
  }
  frameWillPotentiallyRequestNavigation() {
    for (const barrier of this._signalBarriers)
      barrier.retain();
  }
  frameDidPotentiallyRequestNavigation() {
    for (const barrier of this._signalBarriers)
      barrier.release();
  }
  frameRequestedNavigation(frameId, documentId) {
    const frame = this._frames.get(frameId);
    if (!frame)
      return;
    for (const barrier of this._signalBarriers)
      barrier.addFrameNavigation(frame);
    if (frame.pendingDocument() && frame.pendingDocument().documentId === documentId) {
      return;
    }
    const request = documentId ? Array.from(frame._inflightRequests).find((request2) => request2._documentId === documentId) : void 0;
    frame.setPendingDocument({ documentId, request });
  }
  frameCommittedNewDocumentNavigation(frameId, url, name, documentId, initial) {
    const frame = this._frames.get(frameId);
    this.removeChildFramesRecursively(frame);
    this.clearWebSockets(frame);
    frame._url = url;
    frame._name = name;
    let keepPending;
    const pendingDocument = frame.pendingDocument();
    if (pendingDocument) {
      if (pendingDocument.documentId === void 0) {
        pendingDocument.documentId = documentId;
      }
      if (pendingDocument.documentId === documentId) {
        frame._currentDocument = pendingDocument;
      } else {
        keepPending = pendingDocument;
        frame._currentDocument = { documentId, request: void 0 };
      }
      frame.setPendingDocument(void 0);
    } else {
      frame._currentDocument = { documentId, request: void 0 };
    }
    frame._onClearLifecycle();
    const navigationEvent = { url, name, newDocument: frame._currentDocument, isPublic: true };
    this._fireInternalFrameNavigation(frame, navigationEvent);
    if (!initial) {
      import_debugLogger.debugLogger.log("api", `  navigated to "${url}"`);
      this._page.frameNavigatedToNewDocument(frame);
    }
    frame.setPendingDocument(keepPending);
  }
  frameCommittedSameDocumentNavigation(frameId, url) {
    const frame = this._frames.get(frameId);
    if (!frame)
      return;
    const pending = frame.pendingDocument();
    if (pending && pending.documentId === void 0 && pending.request === void 0) {
      frame.setPendingDocument(void 0);
    }
    frame._url = url;
    const navigationEvent = { url, name: frame._name, isPublic: true };
    this._fireInternalFrameNavigation(frame, navigationEvent);
    import_debugLogger.debugLogger.log("api", `  navigated to "${url}"`);
  }
  frameAbortedNavigation(frameId, errorText, documentId) {
    const frame = this._frames.get(frameId);
    if (!frame || !frame.pendingDocument())
      return;
    if (documentId !== void 0 && frame.pendingDocument().documentId !== documentId)
      return;
    const navigationEvent = {
      url: frame._url,
      name: frame._name,
      newDocument: frame.pendingDocument(),
      error: new NavigationAbortedError(documentId, errorText),
      isPublic: !(documentId && frame._redirectedNavigations.has(documentId))
    };
    frame.setPendingDocument(void 0);
    this._fireInternalFrameNavigation(frame, navigationEvent);
  }
  frameDetached(frameId) {
    const frame = this._frames.get(frameId);
    if (frame) {
      this._removeFramesRecursively(frame);
      this._page.mainFrame()._recalculateNetworkIdle();
    }
  }
  frameLifecycleEvent(frameId, event) {
    const frame = this._frames.get(frameId);
    if (frame)
      frame._onLifecycleEvent(event);
  }
  requestStarted(request, route) {
    const frame = request.frame();
    this._inflightRequestStarted(request);
    if (request._documentId)
      frame.setPendingDocument({ documentId: request._documentId, request });
    if (request._isFavicon) {
      route?.abort("aborted").catch(() => {
      });
      return;
    }
    this._page.addNetworkRequest(request);
    this._page.emitOnContext(import_browserContext.BrowserContext.Events.Request, request);
    if (route)
      new network.Route(request, route).handle([...this._page.requestInterceptors, ...this._page.browserContext.requestInterceptors]);
  }
  requestReceivedResponse(response) {
    if (response.request()._isFavicon)
      return;
    this._page.emitOnContext(import_browserContext.BrowserContext.Events.Response, response);
  }
  reportRequestFinished(request, response) {
    this._inflightRequestFinished(request);
    if (request._isFavicon)
      return;
    this._page.emitOnContext(import_browserContext.BrowserContext.Events.RequestFinished, { request, response });
  }
  requestFailed(request, canceled) {
    const frame = request.frame();
    this._inflightRequestFinished(request);
    if (frame.pendingDocument() && frame.pendingDocument().request === request) {
      let errorText = request.failure().errorText;
      if (canceled)
        errorText += "; maybe frame was detached?";
      this.frameAbortedNavigation(frame._id, errorText, frame.pendingDocument().documentId);
    }
    if (request._isFavicon)
      return;
    this._page.emitOnContext(import_browserContext.BrowserContext.Events.RequestFailed, request);
  }
  removeChildFramesRecursively(frame) {
    for (const child of frame.childFrames())
      this._removeFramesRecursively(child);
  }
  _removeFramesRecursively(frame) {
    this.removeChildFramesRecursively(frame);
    frame._onDetached();
    this._frames.delete(frame._id);
    if (!this._page.isClosed())
      this._page.emit(import_page.Page.Events.FrameDetached, frame);
  }
  _inflightRequestFinished(request) {
    const frame = request.frame();
    if (request._isFavicon)
      return;
    if (!frame._inflightRequests.has(request))
      return;
    frame._inflightRequests.delete(request);
    if (frame._inflightRequests.size === 0)
      frame._startNetworkIdleTimer();
  }
  _inflightRequestStarted(request) {
    const frame = request.frame();
    if (request._isFavicon)
      return;
    frame._inflightRequests.add(request);
    if (frame._inflightRequests.size === 1)
      frame._stopNetworkIdleTimer();
  }
  interceptConsoleMessage(message) {
    if (message.type() !== "debug")
      return false;
    const tag = message.text();
    const handler = this._consoleMessageTags.get(tag);
    if (!handler)
      return false;
    this._consoleMessageTags.delete(tag);
    handler();
    return true;
  }
  clearWebSockets(frame) {
    if (frame.parentFrame())
      return;
    this._webSockets.clear();
  }
  onWebSocketCreated(requestId, url) {
    const ws = new network.WebSocket(this._page, url);
    this._webSockets.set(requestId, ws);
  }
  onWebSocketRequest(requestId) {
    const ws = this._webSockets.get(requestId);
    if (ws && ws.markAsNotified())
      this._page.emit(import_page.Page.Events.WebSocket, ws);
  }
  onWebSocketResponse(requestId, status, statusText) {
    const ws = this._webSockets.get(requestId);
    if (status < 400)
      return;
    if (ws)
      ws.error(`${statusText}: ${status}`);
  }
  onWebSocketFrameSent(requestId, opcode, data) {
    const ws = this._webSockets.get(requestId);
    if (ws)
      ws.frameSent(opcode, data);
  }
  webSocketFrameReceived(requestId, opcode, data) {
    const ws = this._webSockets.get(requestId);
    if (ws)
      ws.frameReceived(opcode, data);
  }
  webSocketClosed(requestId) {
    const ws = this._webSockets.get(requestId);
    if (ws)
      ws.closed();
    this._webSockets.delete(requestId);
  }
  webSocketError(requestId, errorMessage) {
    const ws = this._webSockets.get(requestId);
    if (ws)
      ws.error(errorMessage);
  }
  _fireInternalFrameNavigation(frame, event) {
    frame.emit(Frame.Events.InternalNavigation, event);
  }
}
const FrameEvent = {
  InternalNavigation: "internalnavigation",
  AddLifecycle: "addlifecycle",
  RemoveLifecycle: "removelifecycle"
};
class Frame extends import_instrumentation.SdkObject {
  constructor(page, id, parentFrame) {
    super(page, "frame");
    this._firedLifecycleEvents = /* @__PURE__ */ new Set();
    this._firedNetworkIdleSelf = false;
    this._url = "";
    this._contextData = /* @__PURE__ */ new Map();
    this._childFrames = /* @__PURE__ */ new Set();
    this._name = "";
    this._inflightRequests = /* @__PURE__ */ new Set();
    this._setContentCounter = 0;
    this._detachedScope = new import_utils.LongStandingScope();
    this._raceAgainstEvaluationStallingEventsPromises = /* @__PURE__ */ new Set();
    this._redirectedNavigations = /* @__PURE__ */ new Map();
    this.attribution.frame = this;
    this.seq = page.frameManager.nextFrameSeq();
    this._id = id;
    this._page = page;
    this._parentFrame = parentFrame;
    this._currentDocument = { documentId: void 0, request: void 0 };
    this.selectors = new import_frameSelectors.FrameSelectors(this);
    this._contextData.set("main", { contextPromise: new import_manualPromise.ManualPromise(), context: null });
    this._contextData.set("utility", { contextPromise: new import_manualPromise.ManualPromise(), context: null });
    this._setContext("main", null);
    this._setContext("utility", null);
    if (this._parentFrame)
      this._parentFrame._childFrames.add(this);
    this._firedLifecycleEvents.add("commit");
    if (id !== kDummyFrameId)
      this._startNetworkIdleTimer();
  }
  static {
    this.Events = FrameEvent;
  }
  isDetached() {
    return this._detachedScope.isClosed();
  }
  _onLifecycleEvent(event) {
    if (this._firedLifecycleEvents.has(event))
      return;
    this._firedLifecycleEvents.add(event);
    this.emit(Frame.Events.AddLifecycle, event);
    if (this === this._page.mainFrame() && this._url !== "about:blank")
      import_debugLogger.debugLogger.log("api", `  "${event}" event fired`);
    this._page.mainFrame()._recalculateNetworkIdle();
  }
  _onClearLifecycle() {
    for (const event of this._firedLifecycleEvents)
      this.emit(Frame.Events.RemoveLifecycle, event);
    this._firedLifecycleEvents.clear();
    this._inflightRequests = new Set(Array.from(this._inflightRequests).filter((request) => request === this._currentDocument.request));
    this._stopNetworkIdleTimer();
    if (this._inflightRequests.size === 0)
      this._startNetworkIdleTimer();
    this._page.mainFrame()._recalculateNetworkIdle(this);
    this._onLifecycleEvent("commit");
  }
  setPendingDocument(documentInfo) {
    this._pendingDocument = documentInfo;
    if (documentInfo)
      this._invalidateNonStallingEvaluations("Navigation interrupted the evaluation");
  }
  pendingDocument() {
    return this._pendingDocument;
  }
  _invalidateNonStallingEvaluations(message) {
    if (!this._raceAgainstEvaluationStallingEventsPromises.size)
      return;
    const error = new Error(message);
    for (const promise of this._raceAgainstEvaluationStallingEventsPromises)
      promise.reject(error);
  }
  async raceAgainstEvaluationStallingEvents(cb) {
    if (this._pendingDocument)
      throw new Error("Frame is currently attempting a navigation");
    if (this._page.browserContext.dialogManager.hasOpenDialogsForPage(this._page))
      throw new Error("Open JavaScript dialog prevents evaluation");
    const promise = new import_manualPromise.ManualPromise();
    this._raceAgainstEvaluationStallingEventsPromises.add(promise);
    try {
      return await Promise.race([
        cb(),
        promise
      ]);
    } finally {
      this._raceAgainstEvaluationStallingEventsPromises.delete(promise);
    }
  }
  nonStallingRawEvaluateInExistingMainContext(expression) {
    return this.raceAgainstEvaluationStallingEvents(() => {
      const context = this._existingMainContext();
      if (!context)
        throw new Error("Frame does not yet have a main execution context");
      return context.rawEvaluateJSON(expression);
    });
  }
  nonStallingEvaluateInExistingContext(expression, world) {
    return this.raceAgainstEvaluationStallingEvents(() => {
      const context = this._contextData.get(world)?.context;
      if (!context)
        throw new Error("Frame does not yet have the execution context");
      return context.evaluateExpression(expression, { isFunction: false });
    });
  }
  _recalculateNetworkIdle(frameThatAllowsRemovingNetworkIdle) {
    let isNetworkIdle = this._firedNetworkIdleSelf;
    for (const child of this._childFrames) {
      child._recalculateNetworkIdle(frameThatAllowsRemovingNetworkIdle);
      if (!child._firedLifecycleEvents.has("networkidle"))
        isNetworkIdle = false;
    }
    if (isNetworkIdle && !this._firedLifecycleEvents.has("networkidle")) {
      this._firedLifecycleEvents.add("networkidle");
      this.emit(Frame.Events.AddLifecycle, "networkidle");
      if (this === this._page.mainFrame() && this._url !== "about:blank")
        import_debugLogger.debugLogger.log("api", `  "networkidle" event fired`);
    }
    if (frameThatAllowsRemovingNetworkIdle !== this && this._firedLifecycleEvents.has("networkidle") && !isNetworkIdle) {
      this._firedLifecycleEvents.delete("networkidle");
      this.emit(Frame.Events.RemoveLifecycle, "networkidle");
    }
  }
  async raceNavigationAction(progress, action) {
    return import_utils.LongStandingScope.raceMultiple([
      this._detachedScope,
      this._page.openScope
    ], action().catch((e) => {
      if (e instanceof NavigationAbortedError && e.documentId) {
        const data = this._redirectedNavigations.get(e.documentId);
        if (data) {
          progress.log(`waiting for redirected navigation to "${data.url}"`);
          return progress.race(data.gotoPromise);
        }
      }
      throw e;
    }));
  }
  redirectNavigation(url, documentId, referer) {
    const controller = new import_progress.ProgressController();
    const data = {
      url,
      gotoPromise: controller.run((progress) => this.gotoImpl(progress, url, { referer }), 0)
    };
    this._redirectedNavigations.set(documentId, data);
    data.gotoPromise.finally(() => this._redirectedNavigations.delete(documentId));
  }
  async goto(progress, url, options = {}) {
    const constructedNavigationURL = (0, import_utils.constructURLBasedOnBaseURL)(this._page.browserContext._options.baseURL, url);
    return this.raceNavigationAction(progress, async () => this.gotoImpl(progress, constructedNavigationURL, options));
  }
  async gotoImpl(progress, url, options) {
    const waitUntil = verifyLifecycle("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    progress.log(`navigating to "${url}", waiting until "${waitUntil}"`);
    const headers = this._page.extraHTTPHeaders() || [];
    const refererHeader = headers.find((h) => h.name.toLowerCase() === "referer");
    let referer = refererHeader ? refererHeader.value : void 0;
    if (options.referer !== void 0) {
      if (referer !== void 0 && referer !== options.referer)
        throw new Error('"referer" is already specified as extra HTTP header');
      referer = options.referer;
    }
    url = import_helper.helper.completeUserURL(url);
    const navigationEvents = [];
    const collectNavigations = (arg) => navigationEvents.push(arg);
    this.on(Frame.Events.InternalNavigation, collectNavigations);
    const navigateResult = await progress.race(this._page.delegate.navigateFrame(this, url, referer)).finally(
      () => this.off(Frame.Events.InternalNavigation, collectNavigations)
    );
    let event;
    if (navigateResult.newDocumentId) {
      const predicate = (event2) => {
        return event2.newDocument && (event2.newDocument.documentId === navigateResult.newDocumentId || !event2.error);
      };
      const events = navigationEvents.filter(predicate);
      if (events.length)
        event = events[0];
      else
        event = await import_helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, predicate).promise;
      if (event.newDocument.documentId !== navigateResult.newDocumentId) {
        throw new NavigationAbortedError(navigateResult.newDocumentId, `Navigation to "${url}" is interrupted by another navigation to "${event.url}"`);
      }
      if (event.error)
        throw event.error;
    } else {
      const predicate = (e) => !e.newDocument;
      const events = navigationEvents.filter(predicate);
      if (events.length)
        event = events[0];
      else
        event = await import_helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, predicate).promise;
    }
    if (!this._firedLifecycleEvents.has(waitUntil))
      await import_helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, (e) => e === waitUntil).promise;
    const request = event.newDocument ? event.newDocument.request : void 0;
    const response = request ? progress.race(request._finalRequest().response()) : null;
    return response;
  }
  async _waitForNavigation(progress, requiresNewDocument, options) {
    const waitUntil = verifyLifecycle("waitUntil", options.waitUntil === void 0 ? "load" : options.waitUntil);
    progress.log(`waiting for navigation until "${waitUntil}"`);
    const navigationEvent = await import_helper.helper.waitForEvent(progress, this, Frame.Events.InternalNavigation, (event) => {
      if (event.error)
        return true;
      if (requiresNewDocument && !event.newDocument)
        return false;
      progress.log(`  navigated to "${this._url}"`);
      return true;
    }).promise;
    if (navigationEvent.error)
      throw navigationEvent.error;
    if (!this._firedLifecycleEvents.has(waitUntil))
      await import_helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, (e) => e === waitUntil).promise;
    const request = navigationEvent.newDocument ? navigationEvent.newDocument.request : void 0;
    return request ? progress.race(request._finalRequest().response()) : null;
  }
  async waitForLoadState(progress, state) {
    const waitUntil = verifyLifecycle("state", state);
    if (!this._firedLifecycleEvents.has(waitUntil))
      await import_helper.helper.waitForEvent(progress, this, Frame.Events.AddLifecycle, (e) => e === waitUntil).promise;
  }
  async frameElement() {
    return this._page.delegate.getFrameElement(this);
  }
  _context(world) {
    return this._contextData.get(world).contextPromise.then((contextOrDestroyedReason) => {
      if (contextOrDestroyedReason instanceof js.ExecutionContext)
        return contextOrDestroyedReason;
      throw new Error(contextOrDestroyedReason.destroyedReason);
    });
  }
  _mainContext() {
    return this._context("main");
  }
  _existingMainContext() {
    return this._contextData.get("main")?.context || null;
  }
  _utilityContext() {
    return this._context("utility");
  }
  async evaluateExpression(expression, options = {}, arg) {
    const context = await this._context(options.world ?? "main");
    const value = await context.evaluateExpression(expression, options, arg);
    return value;
  }
  async evaluateExpressionHandle(expression, options = {}, arg) {
    const context = await this._context(options.world ?? "main");
    const value = await context.evaluateExpressionHandle(expression, options, arg);
    return value;
  }
  async querySelector(selector, options) {
    import_debugLogger.debugLogger.log("api", `    finding element using the selector "${selector}"`);
    return this.selectors.query(selector, options);
  }
  async waitForSelector(progress, selector, performActionPreChecksAndLog, options, scope) {
    if (options.visibility)
      throw new Error("options.visibility is not supported, did you mean options.state?");
    if (options.waitFor && options.waitFor !== "visible")
      throw new Error("options.waitFor is not supported, did you mean options.state?");
    const { state = "visible" } = options;
    if (!["attached", "detached", "visible", "hidden"].includes(state))
      throw new Error(`state: expected one of (attached|detached|visible|hidden)`);
    if (performActionPreChecksAndLog)
      progress.log(`waiting for ${this._asLocator(selector)}${state === "attached" ? "" : " to be " + state}`);
    const promise = this.retryWithProgressAndTimeouts(progress, [0, 20, 50, 100, 100, 500], async (continuePolling) => {
      if (performActionPreChecksAndLog)
        await this._page.performActionPreChecks(progress);
      const resolved = await progress.race(this.selectors.resolveInjectedForSelector(selector, options, scope));
      if (!resolved) {
        if (state === "hidden" || state === "detached")
          return null;
        return continuePolling;
      }
      const result = await progress.race(resolved.injected.evaluateHandle((injected, { info, root }) => {
        if (root && !root.isConnected)
          throw injected.createStacklessError("Element is not attached to the DOM");
        const elements = injected.querySelectorAll(info.parsed, root || document);
        const element2 = elements[0];
        const visible2 = element2 ? injected.utils.isElementVisible(element2) : false;
        let log2 = "";
        if (elements.length > 1) {
          if (info.strict)
            throw injected.strictModeViolationError(info.parsed, elements);
          log2 = `  locator resolved to ${elements.length} elements. Proceeding with the first one: ${injected.previewNode(elements[0])}`;
        } else if (element2) {
          log2 = `  locator resolved to ${visible2 ? "visible" : "hidden"} ${injected.previewNode(element2)}`;
        }
        injected.checkDeprecatedSelectorUsage(info.parsed, elements);
        return { log: log2, element: element2, visible: visible2, attached: !!element2 };
      }, { info: resolved.info, root: resolved.frame === this ? scope : void 0 }));
      const { log, visible, attached } = await progress.race(result.evaluate((r) => ({ log: r.log, visible: r.visible, attached: r.attached })));
      if (log)
        progress.log(log);
      const success = { attached, detached: !attached, visible, hidden: !visible }[state];
      if (!success) {
        result.dispose();
        return continuePolling;
      }
      if (options.omitReturnValue) {
        result.dispose();
        return null;
      }
      const element = state === "attached" || state === "visible" ? await progress.race(result.evaluateHandle((r) => r.element)) : null;
      result.dispose();
      if (!element)
        return null;
      if (options.__testHookBeforeAdoptNode)
        await progress.race(options.__testHookBeforeAdoptNode());
      try {
        const mainContext = await progress.race(resolved.frame._mainContext());
        return await progress.race(element._adoptTo(mainContext));
      } catch (e) {
        return continuePolling;
      }
    });
    return scope ? scope._context._raceAgainstContextDestroyed(promise) : promise;
  }
  async dispatchEvent(progress, selector, type, eventInit = {}, options, scope) {
    await this._callOnElementOnceMatches(progress, selector, (injectedScript, element, data) => {
      injectedScript.dispatchEvent(element, data.type, data.eventInit);
    }, { type, eventInit }, { mainWorld: true, ...options }, scope);
  }
  async evalOnSelector(selector, strict, expression, isFunction, arg, scope) {
    const handle = await this.selectors.query(selector, { strict }, scope);
    if (!handle)
      throw new Error(`Failed to find element matching selector "${selector}"`);
    const result = await handle.evaluateExpression(expression, { isFunction }, arg);
    handle.dispose();
    return result;
  }
  async evalOnSelectorAll(selector, expression, isFunction, arg, scope) {
    const arrayHandle = await this.selectors.queryArrayInMainWorld(selector, scope);
    const result = await arrayHandle.evaluateExpression(expression, { isFunction }, arg);
    arrayHandle.dispose();
    return result;
  }
  async maskSelectors(selectors, color) {
    const context = await this._utilityContext();
    const injectedScript = await context.injectedScript();
    await injectedScript.evaluate((injected, { parsed, color: color2 }) => {
      injected.maskSelectors(parsed, color2);
    }, { parsed: selectors, color });
  }
  async querySelectorAll(selector) {
    return this.selectors.queryAll(selector);
  }
  async queryCount(selector, options) {
    try {
      return await this.selectors.queryCount(selector, options);
    } catch (e) {
      if (this.isNonRetriableError(e))
        throw e;
      return 0;
    }
  }
  async content() {
    try {
      const context = await this._utilityContext();
      return await context.evaluate(() => {
        let retVal = "";
        if (document.doctype)
          retVal = new XMLSerializer().serializeToString(document.doctype);
        if (document.documentElement)
          retVal += document.documentElement.outerHTML;
        return retVal;
      });
    } catch (e) {
      if (this.isNonRetriableError(e))
        throw e;
      throw new Error(`Unable to retrieve content because the page is navigating and changing the content.`);
    }
  }
  async setContent(progress, html, options) {
    const tag = `--playwright--set--content--${this._id}--${++this._setContentCounter}--`;
    await this.raceNavigationAction(progress, async () => {
      const waitUntil = options.waitUntil === void 0 ? "load" : options.waitUntil;
      progress.log(`setting frame content, waiting until "${waitUntil}"`);
      const context = await progress.race(this._utilityContext());
      const tagPromise = new import_manualPromise.ManualPromise();
      this._page.frameManager._consoleMessageTags.set(tag, () => {
        this._onClearLifecycle();
        tagPromise.resolve();
      });
      const lifecyclePromise = progress.race(tagPromise).then(() => this.waitForLoadState(progress, waitUntil));
      const contentPromise = progress.race(context.evaluate(({ html: html2, tag: tag2 }) => {
        document.open();
        console.debug(tag2);
        document.write(html2);
        document.close();
      }, { html, tag }));
      await Promise.all([contentPromise, lifecyclePromise]);
      return null;
    }).finally(() => {
      this._page.frameManager._consoleMessageTags.delete(tag);
    });
  }
  name() {
    return this._name || "";
  }
  url() {
    return this._url;
  }
  origin() {
    if (!this._url.startsWith("http"))
      return;
    return network.parseURL(this._url)?.origin;
  }
  parentFrame() {
    return this._parentFrame;
  }
  childFrames() {
    return Array.from(this._childFrames);
  }
  async addScriptTag(params) {
    const {
      url = null,
      content = null,
      type = ""
    } = params;
    if (!url && !content)
      throw new Error("Provide an object with a `url`, `path` or `content` property");
    const context = await this._mainContext();
    return this._raceWithCSPError(async () => {
      if (url !== null)
        return (await context.evaluateHandle(addScriptUrl, { url, type })).asElement();
      const result = (await context.evaluateHandle(addScriptContent, { content, type })).asElement();
      if (this._page.delegate.cspErrorsAsynchronousForInlineScripts)
        await context.evaluate(() => true);
      return result;
    });
    async function addScriptUrl(params2) {
      const script = document.createElement("script");
      script.src = params2.url;
      if (params2.type)
        script.type = params2.type;
      const promise = new Promise((res, rej) => {
        script.onload = res;
        script.onerror = (e) => rej(typeof e === "string" ? new Error(e) : new Error(`Failed to load script at ${script.src}`));
      });
      document.head.appendChild(script);
      await promise;
      return script;
    }
    function addScriptContent(params2) {
      const script = document.createElement("script");
      script.type = params2.type || "text/javascript";
      script.text = params2.content;
      let error = null;
      script.onerror = (e) => error = e;
      document.head.appendChild(script);
      if (error)
        throw error;
      return script;
    }
  }
  async addStyleTag(params) {
    const {
      url = null,
      content = null
    } = params;
    if (!url && !content)
      throw new Error("Provide an object with a `url`, `path` or `content` property");
    const context = await this._mainContext();
    return this._raceWithCSPError(async () => {
      if (url !== null)
        return (await context.evaluateHandle(addStyleUrl, url)).asElement();
      return (await context.evaluateHandle(addStyleContent, content)).asElement();
    });
    async function addStyleUrl(url2) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url2;
      const promise = new Promise((res, rej) => {
        link.onload = res;
        link.onerror = rej;
      });
      document.head.appendChild(link);
      await promise;
      return link;
    }
    async function addStyleContent(content2) {
      const style = document.createElement("style");
      style.type = "text/css";
      style.appendChild(document.createTextNode(content2));
      const promise = new Promise((res, rej) => {
        style.onload = res;
        style.onerror = rej;
      });
      document.head.appendChild(style);
      await promise;
      return style;
    }
  }
  async _raceWithCSPError(func) {
    const listeners = [];
    let result;
    let error;
    let cspMessage;
    const actionPromise = func().then((r) => result = r).catch((e) => error = e);
    const errorPromise = new Promise((resolve) => {
      listeners.push(import_eventsHelper.eventsHelper.addEventListener(this._page.browserContext, import_browserContext.BrowserContext.Events.Console, (message) => {
        if (message.page() !== this._page || message.type() !== "error")
          return;
        if (message.text().includes("Content-Security-Policy") || message.text().includes("Content Security Policy")) {
          cspMessage = message;
          resolve();
        }
      }));
    });
    await Promise.race([actionPromise, errorPromise]);
    import_eventsHelper.eventsHelper.removeEventListeners(listeners);
    if (cspMessage)
      throw new Error(cspMessage.text());
    if (error)
      throw error;
    return result;
  }
  async retryWithProgressAndTimeouts(progress, timeouts, action) {
    const continuePolling = Symbol("continuePolling");
    timeouts = [0, ...timeouts];
    let timeoutIndex = 0;
    while (true) {
      const timeout = timeouts[Math.min(timeoutIndex++, timeouts.length - 1)];
      if (timeout) {
        const actionPromise = new Promise((f) => setTimeout(f, timeout));
        await progress.race(import_utils.LongStandingScope.raceMultiple([
          this._page.openScope,
          this._detachedScope
        ], actionPromise));
      }
      try {
        const result = await action(continuePolling);
        if (result === continuePolling)
          continue;
        return result;
      } catch (e) {
        if (this.isNonRetriableError(e))
          throw e;
        continue;
      }
    }
  }
  isNonRetriableError(e) {
    if ((0, import_progress.isAbortError)(e))
      return true;
    if (js.isJavaScriptErrorInEvaluate(e) || (0, import_protocolError.isSessionClosedError)(e))
      return true;
    if (dom.isNonRecoverableDOMError(e) || (0, import_selectorParser.isInvalidSelectorError)(e))
      return true;
    if (this.isDetached())
      return true;
    return false;
  }
  async _retryWithProgressIfNotConnected(progress, selector, options, action) {
    progress.log(`waiting for ${this._asLocator(selector)}`);
    const noAutoWaiting = options.__testHookNoAutoWaiting ?? options.noAutoWaiting;
    const performActionPreChecks = (options.performActionPreChecks ?? !options.force) && !noAutoWaiting;
    return this.retryWithProgressAndTimeouts(progress, [0, 20, 50, 100, 100, 500], async (continuePolling) => {
      if (performActionPreChecks)
        await this._page.performActionPreChecks(progress);
      const resolved = await progress.race(this.selectors.resolveInjectedForSelector(selector, { strict: options.strict }));
      if (!resolved) {
        if (noAutoWaiting)
          throw new dom.NonRecoverableDOMError("Element(s) not found");
        return continuePolling;
      }
      const result = await progress.race(resolved.injected.evaluateHandle((injected, { info, callId }) => {
        const elements = injected.querySelectorAll(info.parsed, document);
        if (callId)
          injected.markTargetElements(new Set(elements), callId);
        const element2 = elements[0];
        let log2 = "";
        if (elements.length > 1) {
          if (info.strict)
            throw injected.strictModeViolationError(info.parsed, elements);
          log2 = `  locator resolved to ${elements.length} elements. Proceeding with the first one: ${injected.previewNode(elements[0])}`;
        } else if (element2) {
          log2 = `  locator resolved to ${injected.previewNode(element2)}`;
        }
        injected.checkDeprecatedSelectorUsage(info.parsed, elements);
        return { log: log2, success: !!element2, element: element2 };
      }, { info: resolved.info, callId: progress.metadata.id }));
      const { log, success } = await progress.race(result.evaluate((r) => ({ log: r.log, success: r.success })));
      if (log)
        progress.log(log);
      if (!success) {
        if (noAutoWaiting)
          throw new dom.NonRecoverableDOMError("Element(s) not found");
        result.dispose();
        return continuePolling;
      }
      const element = await progress.race(result.evaluateHandle((r) => r.element));
      result.dispose();
      try {
        const result2 = await action(element);
        if (result2 === "error:notconnected") {
          if (noAutoWaiting)
            throw new dom.NonRecoverableDOMError("Element is not attached to the DOM");
          progress.log("element was detached from the DOM, retrying");
          return continuePolling;
        }
        return result2;
      } finally {
        element?.dispose();
      }
    });
  }
  async rafrafTimeoutScreenshotElementWithProgress(progress, selector, timeout, options) {
    return await this._retryWithProgressIfNotConnected(progress, selector, { strict: true, performActionPreChecks: true }, async (handle) => {
      await handle._frame.rafrafTimeout(progress, timeout);
      return await this._page.screenshotter.screenshotElement(progress, handle, options);
    });
  }
  async click(progress, selector, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._click(progress, { ...options, waitAfter: !options.noWaitAfter })));
  }
  async dblclick(progress, selector, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._dblclick(progress, options)));
  }
  async dragAndDrop(progress, source, target, options) {
    dom.assertDone(await this._retryWithProgressIfNotConnected(progress, source, options, async (handle) => {
      return handle._retryPointerAction(progress, "move and down", false, async (point) => {
        await this._page.mouse.move(progress, point.x, point.y);
        await this._page.mouse.down(progress);
      }, {
        ...options,
        waitAfter: "disabled",
        position: options.sourcePosition
      });
    }));
    dom.assertDone(await this._retryWithProgressIfNotConnected(progress, target, { ...options, performActionPreChecks: false }, async (handle) => {
      return handle._retryPointerAction(progress, "move and up", false, async (point) => {
        await this._page.mouse.move(progress, point.x, point.y, { steps: options.steps });
        await this._page.mouse.up(progress);
      }, {
        ...options,
        waitAfter: "disabled",
        position: options.targetPosition
      });
    }));
  }
  async tap(progress, selector, options) {
    if (!this._page.browserContext._options.hasTouch)
      throw new Error("The page does not support tap. Use hasTouch context option to enable touch support.");
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._tap(progress, options)));
  }
  async fill(progress, selector, value, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._fill(progress, value, options)));
  }
  async focus(progress, selector, options) {
    dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._focus(progress)));
  }
  async blur(progress, selector, options) {
    dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._blur(progress)));
  }
  async resolveSelector(progress, selector, options = {}) {
    const element = await progress.race(this.selectors.query(selector, options));
    if (!element)
      throw new Error(`No element matching ${selector}`);
    const generated = await progress.race(element.evaluateInUtility(async ([injected, node]) => {
      return injected.generateSelectorSimple(node);
    }, {}));
    if (!generated)
      throw new Error(`Unable to generate locator for ${selector}`);
    let frame = element._frame;
    const result = [generated];
    while (frame?.parentFrame()) {
      const frameElement = await progress.race(frame.frameElement());
      if (frameElement) {
        const generated2 = await progress.race(frameElement.evaluateInUtility(async ([injected, node]) => {
          return injected.generateSelectorSimple(node);
        }, {}));
        frameElement.dispose();
        if (generated2 === "error:notconnected" || !generated2)
          throw new Error(`Unable to generate locator for ${selector}`);
        result.push(generated2);
      }
      frame = frame.parentFrame();
    }
    const resolvedSelector = result.reverse().join(" >> internal:control=enter-frame >> ");
    return { resolvedSelector };
  }
  async textContent(progress, selector, options, scope) {
    return this._callOnElementOnceMatches(progress, selector, (injected, element) => element.textContent, void 0, options, scope);
  }
  async innerText(progress, selector, options, scope) {
    return this._callOnElementOnceMatches(progress, selector, (injectedScript, element) => {
      if (element.namespaceURI !== "http://www.w3.org/1999/xhtml")
        throw injectedScript.createStacklessError("Node is not an HTMLElement");
      return element.innerText;
    }, void 0, options, scope);
  }
  async innerHTML(progress, selector, options, scope) {
    return this._callOnElementOnceMatches(progress, selector, (injected, element) => element.innerHTML, void 0, options, scope);
  }
  async getAttribute(progress, selector, name, options, scope) {
    return this._callOnElementOnceMatches(progress, selector, (injected, element, data) => element.getAttribute(data.name), { name }, options, scope);
  }
  async inputValue(progress, selector, options, scope) {
    return this._callOnElementOnceMatches(progress, selector, (injectedScript, node) => {
      const element = injectedScript.retarget(node, "follow-label");
      if (!element || element.nodeName !== "INPUT" && element.nodeName !== "TEXTAREA" && element.nodeName !== "SELECT")
        throw injectedScript.createStacklessError("Node is not an <input>, <textarea> or <select> element");
      return element.value;
    }, void 0, options, scope);
  }
  async highlight(progress, selector) {
    const resolved = await progress.race(this.selectors.resolveInjectedForSelector(selector));
    if (!resolved)
      return;
    return await progress.race(resolved.injected.evaluate((injected, { info }) => {
      return injected.highlight(info.parsed);
    }, { info: resolved.info }));
  }
  async hideHighlight() {
    return this.raceAgainstEvaluationStallingEvents(async () => {
      const context = await this._utilityContext();
      const injectedScript = await context.injectedScript();
      return await injectedScript.evaluate((injected) => {
        return injected.hideHighlight();
      });
    });
  }
  async _elementState(progress, selector, state, options, scope) {
    const result = await this._callOnElementOnceMatches(progress, selector, (injected, element, data) => {
      return injected.elementState(element, data.state);
    }, { state }, options, scope);
    if (result.received === "error:notconnected")
      dom.throwElementIsNotAttached();
    return result.matches;
  }
  async isVisible(progress, selector, options = {}, scope) {
    progress.log(`  checking visibility of ${this._asLocator(selector)}`);
    return await this.isVisibleInternal(progress, selector, options, scope);
  }
  async isVisibleInternal(progress, selector, options = {}, scope) {
    try {
      const resolved = await progress.race(this.selectors.resolveInjectedForSelector(selector, options, scope));
      if (!resolved)
        return false;
      return await progress.race(resolved.injected.evaluate((injected, { info, root }) => {
        const element = injected.querySelector(info.parsed, root || document, info.strict);
        const state = element ? injected.elementState(element, "visible") : { matches: false, received: "error:notconnected" };
        return state.matches;
      }, { info: resolved.info, root: resolved.frame === this ? scope : void 0 }));
    } catch (e) {
      if (this.isNonRetriableError(e))
        throw e;
      return false;
    }
  }
  async isHidden(progress, selector, options = {}, scope) {
    return !await this.isVisible(progress, selector, options, scope);
  }
  async isDisabled(progress, selector, options, scope) {
    return this._elementState(progress, selector, "disabled", options, scope);
  }
  async isEnabled(progress, selector, options, scope) {
    return this._elementState(progress, selector, "enabled", options, scope);
  }
  async isEditable(progress, selector, options, scope) {
    return this._elementState(progress, selector, "editable", options, scope);
  }
  async isChecked(progress, selector, options, scope) {
    return this._elementState(progress, selector, "checked", options, scope);
  }
  async hover(progress, selector, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._hover(progress, options)));
  }
  async selectOption(progress, selector, elements, values, options) {
    return await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._selectOption(progress, elements, values, options));
  }
  async setInputFiles(progress, selector, params) {
    const inputFileItems = await (0, import_fileUploadUtils.prepareFilesForUpload)(this, params);
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, params, (handle) => handle._setInputFiles(progress, inputFileItems)));
  }
  async type(progress, selector, text, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._type(progress, text, options)));
  }
  async press(progress, selector, key, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._press(progress, key, options)));
  }
  async check(progress, selector, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._setChecked(progress, true, options)));
  }
  async uncheck(progress, selector, options) {
    return dom.assertDone(await this._retryWithProgressIfNotConnected(progress, selector, options, (handle) => handle._setChecked(progress, false, options)));
  }
  async waitForTimeout(progress, timeout) {
    return progress.wait(timeout);
  }
  async ariaSnapshot(progress, selector) {
    return await this._retryWithProgressIfNotConnected(progress, selector, { strict: true, performActionPreChecks: true }, (handle) => progress.race(handle.ariaSnapshot()));
  }
  async expect(progress, selector, options) {
    progress.log(`${(0, import_utils.renderTitleForCall)(progress.metadata)}${options.timeoutForLogs ? ` with timeout ${options.timeoutForLogs}ms` : ""}`);
    const lastIntermediateResult = { isSet: false };
    const fixupMetadataError = (result) => {
      if (result.matches === options.isNot)
        progress.metadata.error = { error: { name: "Expect", message: "Expect failed" } };
    };
    try {
      if (selector)
        progress.log(`waiting for ${this._asLocator(selector)}`);
      if (!options.noAutoWaiting)
        await this._page.performActionPreChecks(progress);
      try {
        const resultOneShot = await this._expectInternal(progress, selector, options, lastIntermediateResult, true);
        if (options.noAutoWaiting || resultOneShot.matches !== options.isNot)
          return resultOneShot;
      } catch (e) {
        if (options.noAutoWaiting || this.isNonRetriableError(e))
          throw e;
      }
      const result = await this.retryWithProgressAndTimeouts(progress, [100, 250, 500, 1e3], async (continuePolling) => {
        if (!options.noAutoWaiting)
          await this._page.performActionPreChecks(progress);
        const { matches, received } = await this._expectInternal(progress, selector, options, lastIntermediateResult, false);
        if (matches === options.isNot) {
          return continuePolling;
        }
        return { matches, received };
      });
      fixupMetadataError(result);
      return result;
    } catch (e) {
      const result = { matches: options.isNot, log: (0, import_callLog.compressCallLog)(progress.metadata.log) };
      if ((0, import_selectorParser.isInvalidSelectorError)(e)) {
        result.errorMessage = "Error: " + e.message;
      } else if (js.isJavaScriptErrorInEvaluate(e)) {
        result.errorMessage = e.message;
      } else if (lastIntermediateResult.isSet) {
        result.received = lastIntermediateResult.received;
        result.errorMessage = lastIntermediateResult.errorMessage;
      }
      if (e instanceof import_errors.TimeoutError)
        result.timedOut = true;
      fixupMetadataError(result);
      return result;
    }
  }
  async _expectInternal(progress, selector, options, lastIntermediateResult, noAbort) {
    const race = (p) => noAbort ? p : progress.race(p);
    const selectorInFrame = selector ? await race(this.selectors.resolveFrameForSelector(selector, { strict: true })) : void 0;
    const { frame, info } = selectorInFrame || { frame: this, info: void 0 };
    const world = options.expression === "to.have.property" ? "main" : info?.world ?? "utility";
    const context = await race(frame._context(world));
    const injected = await race(context.injectedScript());
    const { log, matches, received, missingReceived } = await race(injected.evaluate(async (injected2, { info: info2, options: options2, callId }) => {
      const elements = info2 ? injected2.querySelectorAll(info2.parsed, document) : [];
      if (callId)
        injected2.markTargetElements(new Set(elements), callId);
      const isArray = options2.expression === "to.have.count" || options2.expression.endsWith(".array");
      let log2 = "";
      if (isArray)
        log2 = `  locator resolved to ${elements.length} element${elements.length === 1 ? "" : "s"}`;
      else if (elements.length > 1)
        throw injected2.strictModeViolationError(info2.parsed, elements);
      else if (elements.length)
        log2 = `  locator resolved to ${injected2.previewNode(elements[0])}`;
      if (info2)
        injected2.checkDeprecatedSelectorUsage(info2.parsed, elements);
      return { log: log2, ...await injected2.expect(elements[0], options2, elements) };
    }, { info, options, callId: progress.metadata.id }));
    if (log)
      progress.log(log);
    if (matches === options.isNot) {
      if (missingReceived) {
        lastIntermediateResult.errorMessage = "Error: element(s) not found";
      } else {
        lastIntermediateResult.errorMessage = void 0;
        lastIntermediateResult.received = received;
      }
      lastIntermediateResult.isSet = true;
      if (!missingReceived && !Array.isArray(received))
        progress.log(`  unexpected value "${renderUnexpectedValue(options.expression, received)}"`);
    }
    return { matches, received };
  }
  async waitForFunctionExpression(progress, expression, isFunction, arg, options, world = "main") {
    if (typeof options.pollingInterval === "number")
      (0, import_utils.assert)(options.pollingInterval > 0, "Cannot poll with non-positive interval: " + options.pollingInterval);
    expression = js.normalizeEvaluationExpression(expression, isFunction);
    return this.retryWithProgressAndTimeouts(progress, [100], async () => {
      const context = world === "main" ? await progress.race(this._mainContext()) : await progress.race(this._utilityContext());
      const injectedScript = await progress.race(context.injectedScript());
      const handle = await progress.race(injectedScript.evaluateHandle((injected, { expression: expression2, isFunction: isFunction2, polling, arg: arg2 }) => {
        let evaledExpression;
        const predicate = () => {
          let result2 = evaledExpression ?? globalThis.eval(expression2);
          if (isFunction2 === true) {
            evaledExpression = result2;
            result2 = result2(arg2);
          } else if (isFunction2 === false) {
            result2 = result2;
          } else {
            if (typeof result2 === "function") {
              evaledExpression = result2;
              result2 = result2(arg2);
            }
          }
          return result2;
        };
        let fulfill;
        let reject;
        let aborted = false;
        const result = new Promise((f, r) => {
          fulfill = f;
          reject = r;
        });
        const next = () => {
          if (aborted)
            return;
          try {
            const success = predicate();
            if (success) {
              fulfill(success);
              return;
            }
            if (typeof polling !== "number")
              injected.utils.builtins.requestAnimationFrame(next);
            else
              injected.utils.builtins.setTimeout(next, polling);
          } catch (e) {
            reject(e);
          }
        };
        next();
        return { result, abort: () => aborted = true };
      }, { expression, isFunction, polling: options.pollingInterval, arg }));
      try {
        return await progress.race(handle.evaluateHandle((h) => h.result));
      } catch (error) {
        await handle.evaluate((h) => h.abort()).catch(() => {
        });
        throw error;
      } finally {
        handle.dispose();
      }
    });
  }
  async waitForFunctionValueInUtility(progress, pageFunction) {
    const expression = `() => {
      const result = (${pageFunction})();
      if (!result)
        return result;
      return JSON.stringify(result);
    }`;
    const handle = await this.waitForFunctionExpression(progress, expression, true, void 0, {}, "utility");
    return JSON.parse(handle.rawValue());
  }
  async title() {
    const context = await this._utilityContext();
    return context.evaluate(() => document.title);
  }
  async rafrafTimeout(progress, timeout) {
    if (timeout === 0)
      return;
    const context = await progress.race(this._utilityContext());
    await Promise.all([
      // wait for double raf
      progress.race(context.evaluate(() => new Promise((x) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(x);
        });
      }))),
      progress.wait(timeout)
    ]);
  }
  _onDetached() {
    this._stopNetworkIdleTimer();
    this._detachedScope.close(new Error("Frame was detached"));
    for (const data of this._contextData.values()) {
      if (data.context)
        data.context.contextDestroyed("Frame was detached");
      data.contextPromise.resolve({ destroyedReason: "Frame was detached" });
    }
    if (this._parentFrame)
      this._parentFrame._childFrames.delete(this);
    this._parentFrame = null;
  }
  async _callOnElementOnceMatches(progress, selector, body, taskData, options, scope) {
    const callbackText = body.toString();
    progress.log(`waiting for ${this._asLocator(selector)}`);
    const promise = this.retryWithProgressAndTimeouts(progress, [0, 20, 50, 100, 100, 500], async (continuePolling) => {
      const resolved = await progress.race(this.selectors.resolveInjectedForSelector(selector, options, scope));
      if (!resolved)
        return continuePolling;
      const { log, success, value } = await progress.race(resolved.injected.evaluate((injected, { info, callbackText: callbackText2, taskData: taskData2, callId, root }) => {
        const callback = injected.eval(callbackText2);
        const element = injected.querySelector(info.parsed, root || document, info.strict);
        if (!element)
          return { success: false };
        const log2 = `  locator resolved to ${injected.previewNode(element)}`;
        if (callId)
          injected.markTargetElements(/* @__PURE__ */ new Set([element]), callId);
        return { log: log2, success: true, value: callback(injected, element, taskData2) };
      }, { info: resolved.info, callbackText, taskData, callId: progress.metadata.id, root: resolved.frame === this ? scope : void 0 }));
      if (log)
        progress.log(log);
      if (!success)
        return continuePolling;
      return value;
    });
    return scope ? scope._context._raceAgainstContextDestroyed(promise) : promise;
  }
  _setContext(world, context) {
    const data = this._contextData.get(world);
    data.context = context;
    if (context)
      data.contextPromise.resolve(context);
    else
      data.contextPromise = new import_manualPromise.ManualPromise();
  }
  _contextCreated(world, context) {
    const data = this._contextData.get(world);
    if (data.context) {
      data.context.contextDestroyed("Execution context was destroyed, most likely because of a navigation");
      this._setContext(world, null);
    }
    this._setContext(world, context);
  }
  _contextDestroyed(context) {
    if (this._detachedScope.isClosed())
      return;
    context.contextDestroyed("Execution context was destroyed, most likely because of a navigation");
    for (const [world, data] of this._contextData) {
      if (data.context === context)
        this._setContext(world, null);
    }
  }
  _startNetworkIdleTimer() {
    (0, import_utils.assert)(!this._networkIdleTimer);
    if (this._firedLifecycleEvents.has("networkidle") || this._detachedScope.isClosed())
      return;
    this._networkIdleTimer = setTimeout(() => {
      this._firedNetworkIdleSelf = true;
      this._page.mainFrame()._recalculateNetworkIdle();
    }, 500);
  }
  _stopNetworkIdleTimer() {
    if (this._networkIdleTimer)
      clearTimeout(this._networkIdleTimer);
    this._networkIdleTimer = void 0;
    this._firedNetworkIdleSelf = false;
  }
  async extendInjectedScript(source, arg) {
    const context = await this._context("main");
    const injectedScriptHandle = await context.injectedScript();
    await injectedScriptHandle.evaluate((injectedScript, { source: source2, arg: arg2 }) => {
      injectedScript.extend(source2, arg2);
    }, { source, arg });
  }
  _asLocator(selector) {
    return (0, import_utils.asLocator)(this._page.browserContext._browser.sdkLanguage(), selector);
  }
}
class SignalBarrier {
  constructor(progress) {
    this._protectCount = 0;
    this._promise = new import_manualPromise.ManualPromise();
    this._progress = progress;
    this.retain();
  }
  waitFor() {
    this.release();
    return this._progress.race(this._promise);
  }
  addFrameNavigation(frame) {
    if (frame.parentFrame())
      return;
    this.retain();
    const waiter = import_helper.helper.waitForEvent(this._progress, frame, Frame.Events.InternalNavigation, (e) => {
      if (!e.isPublic)
        return false;
      if (!e.error && this._progress)
        this._progress.log(`  navigated to "${frame._url}"`);
      return true;
    });
    import_utils.LongStandingScope.raceMultiple([
      frame._page.openScope,
      frame._detachedScope
    ], waiter.promise).catch(() => {
    }).finally(() => {
      waiter.dispose();
      this.release();
    });
  }
  retain() {
    ++this._protectCount;
  }
  release() {
    --this._protectCount;
    if (!this._protectCount)
      this._promise.resolve();
  }
}
function verifyLifecycle(name, waitUntil) {
  if (waitUntil === "networkidle0")
    waitUntil = "networkidle";
  if (!types.kLifecycleEvents.has(waitUntil))
    throw new Error(`${name}: expected one of (load|domcontentloaded|networkidle|commit)`);
  return waitUntil;
}
function renderUnexpectedValue(expression, received) {
  if (expression === "to.match.aria")
    return received ? received.raw : received;
  return received;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Frame,
  FrameManager,
  NavigationAbortedError
});
