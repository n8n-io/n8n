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
var wkPage_exports = {};
__export(wkPage_exports, {
  WKPage: () => WKPage
});
module.exports = __toCommonJS(wkPage_exports);
var import_utils = require("../../utils");
var import_headers = require("../../utils/isomorphic/headers");
var import_eventsHelper = require("../utils/eventsHelper");
var import_hostPlatform = require("../utils/hostPlatform");
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var import_utilsBundle = require("../../utilsBundle");
var dialog = __toESM(require("../dialog"));
var dom = __toESM(require("../dom"));
var import_errors = require("../errors");
var import_helper = require("../helper");
var network = __toESM(require("../network"));
var import_page = require("../page");
var import_wkConnection = require("./wkConnection");
var import_wkExecutionContext = require("./wkExecutionContext");
var import_wkInput = require("./wkInput");
var import_wkInterceptableRequest = require("./wkInterceptableRequest");
var import_wkProvisionalPage = require("./wkProvisionalPage");
var import_wkWorkers = require("./wkWorkers");
var import_webkit = require("./webkit");
const UTILITY_WORLD_NAME = "__playwright_utility_world__";
const enableFrameSessions = !process.env.WK_DISABLE_FRAME_SESSIONS;
class WKPage {
  constructor(browserContext, pageProxySession, opener) {
    this._provisionalPage = null;
    this._targetIdToFrameSession = /* @__PURE__ */ new Map();
    this._requestIdToRequest = /* @__PURE__ */ new Map();
    this._requestIdToRequestWillBeSentEvent = /* @__PURE__ */ new Map();
    this._sessionListeners = [];
    this._firstNonInitialNavigationCommittedFulfill = () => {
    };
    this._firstNonInitialNavigationCommittedReject = (e) => {
    };
    this._lastConsoleMessage = null;
    this._requestIdToResponseReceivedPayloadEvent = /* @__PURE__ */ new Map();
    this._screencastGeneration = 0;
    this._pageProxySession = pageProxySession;
    this._opener = opener;
    this.rawKeyboard = new import_wkInput.RawKeyboardImpl(pageProxySession);
    this.rawMouse = new import_wkInput.RawMouseImpl(pageProxySession);
    this.rawTouchscreen = new import_wkInput.RawTouchscreenImpl(pageProxySession);
    this._contextIdToContext = /* @__PURE__ */ new Map();
    this._page = new import_page.Page(this, browserContext);
    this.rawMouse.setPage(this._page);
    this._workers = new import_wkWorkers.WKWorkers(this._page);
    this._session = void 0;
    this._browserContext = browserContext;
    this._page.on(import_page.Page.Events.FrameDetached, (frame) => this._removeContextsForFrame(frame, false));
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Target.targetCreated", this._onTargetCreated.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Target.targetDestroyed", this._onTargetDestroyed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Target.dispatchMessageFromTarget", this._onDispatchMessageFromTarget.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Target.didCommitProvisionalTarget", this._onDidCommitProvisionalTarget.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Screencast.screencastFrame", this._onScreencastFrame.bind(this))
    ];
    this._firstNonInitialNavigationCommittedPromise = new Promise((f, r) => {
      this._firstNonInitialNavigationCommittedFulfill = f;
      this._firstNonInitialNavigationCommittedReject = r;
    });
    this._firstNonInitialNavigationCommittedPromise.catch(() => {
    });
    if (opener && !browserContext._options.noDefaultViewport && opener._nextWindowOpenPopupFeatures) {
      const viewportSize = import_helper.helper.getViewportSizeFromWindowFeatures(opener._nextWindowOpenPopupFeatures);
      opener._nextWindowOpenPopupFeatures = void 0;
      if (viewportSize)
        this._page.setEmulatedSizeFromWindowOpen({ viewport: viewportSize, screen: viewportSize });
    }
  }
  async _initializePageProxySession() {
    if (this._page.isStorageStatePage)
      return;
    const promises = [
      this._pageProxySession.send("Dialog.enable"),
      this._pageProxySession.send("Emulation.setActiveAndFocused", { active: true })
    ];
    const contextOptions = this._browserContext._options;
    if (contextOptions.javaScriptEnabled === false)
      promises.push(this._pageProxySession.send("Emulation.setJavaScriptEnabled", { enabled: false }));
    promises.push(this._updateViewport());
    promises.push(this.updateHttpCredentials());
    if (this._browserContext._permissions.size) {
      for (const [key, value] of this._browserContext._permissions)
        promises.push(this._grantPermissions(key, value));
    }
    promises.push(this._initializeVideoRecording());
    await Promise.all(promises);
  }
  _setSession(session) {
    import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
    this._session = session;
    this.rawKeyboard.setSession(session);
    this.rawMouse.setSession(session);
    this._addSessionListeners();
    this._workers.setSession(session);
  }
  // This method is called for provisional targets as well. The session passed as the parameter
  // may be different from the current session and may be destroyed without becoming current.
  async _initializeSession(session, provisional, resourceTreeHandler) {
    await this._initializeSessionMayThrow(session, resourceTreeHandler).catch((e) => {
      if (provisional && session.isDisposed())
        return;
      if (this._session === session)
        throw e;
    });
  }
  async _initializeSessionMayThrow(session, resourceTreeHandler) {
    const [, frameTree] = await Promise.all([
      // Page agent must be enabled before Runtime.
      session.send("Page.enable"),
      session.send("Page.getResourceTree")
    ]);
    resourceTreeHandler(frameTree);
    const promises = [
      // Resource tree should be received before first execution context.
      session.send("Runtime.enable"),
      session.send("Page.createUserWorld", { name: UTILITY_WORLD_NAME }).catch((_) => {
      }),
      // Worlds are per-process
      session.send("Network.enable"),
      this._workers.initializeSession(session)
    ];
    if (enableFrameSessions)
      this._initializeFrameSessions(frameTree.frameTree, promises);
    else
      promises.push(session.send("Console.enable"));
    if (this._page.browserContext.needsPlaywrightBinding())
      promises.push(session.send("Runtime.addBinding", { name: import_page.PageBinding.kBindingName }));
    if (this._page.needsRequestInterception()) {
      promises.push(session.send("Network.setInterceptionEnabled", { enabled: true }));
      promises.push(session.send("Network.setResourceCachingDisabled", { disabled: true }));
      promises.push(session.send("Network.addInterception", { url: ".*", stage: "request", isRegex: true }));
    }
    if (this._page.isStorageStatePage) {
      await Promise.all(promises);
      return;
    }
    const contextOptions = this._browserContext._options;
    if (contextOptions.userAgent)
      promises.push(this.updateUserAgent());
    const emulatedMedia = this._page.emulatedMedia();
    if (emulatedMedia.media || emulatedMedia.colorScheme || emulatedMedia.reducedMotion || emulatedMedia.forcedColors || emulatedMedia.contrast)
      promises.push(WKPage._setEmulateMedia(session, emulatedMedia.media, emulatedMedia.colorScheme, emulatedMedia.reducedMotion, emulatedMedia.forcedColors, emulatedMedia.contrast));
    const bootstrapScript = this._calculateBootstrapScript();
    if (bootstrapScript.length)
      promises.push(session.send("Page.setBootstrapScript", { source: bootstrapScript }));
    this._page.frames().map((frame) => frame.evaluateExpression(bootstrapScript).catch((e) => {
    }));
    if (contextOptions.bypassCSP)
      promises.push(session.send("Page.setBypassCSP", { enabled: true }));
    const emulatedSize = this._page.emulatedSize();
    if (emulatedSize) {
      promises.push(session.send("Page.setScreenSizeOverride", {
        width: emulatedSize.screen.width,
        height: emulatedSize.screen.height
      }));
    }
    promises.push(this.updateEmulateMedia());
    promises.push(session.send("Network.setExtraHTTPHeaders", { headers: (0, import_headers.headersArrayToObject)(
      this._calculateExtraHTTPHeaders(),
      false
      /* lowerCase */
    ) }));
    if (contextOptions.offline)
      promises.push(session.send("Network.setEmulateOfflineState", { offline: true }));
    promises.push(session.send("Page.setTouchEmulationEnabled", { enabled: !!contextOptions.hasTouch }));
    if (contextOptions.timezoneId) {
      promises.push(session.send("Page.setTimeZone", { timeZone: contextOptions.timezoneId }).catch((e) => {
        throw new Error(`Invalid timezone ID: ${contextOptions.timezoneId}`);
      }));
    }
    if (this._page.fileChooserIntercepted())
      promises.push(session.send("Page.setInterceptFileChooserDialog", { enabled: true }));
    promises.push(session.send("Page.overrideSetting", { setting: "DeviceOrientationEventEnabled", value: contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "FullScreenEnabled", value: !contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "NotificationsEnabled", value: !contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "PointerLockEnabled", value: !contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "InputTypeMonthEnabled", value: contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "InputTypeWeekEnabled", value: contextOptions.isMobile }));
    promises.push(session.send("Page.overrideSetting", { setting: "FixedBackgroundsPaintRelativeToDocument", value: contextOptions.isMobile }));
    await Promise.all(promises);
  }
  _initializeFrameSessions(frame, promises) {
    const session = this._targetIdToFrameSession.get(`frame-${frame.frame.id}`);
    if (session)
      promises.push(session.initialize());
    for (const childFrame of frame.childFrames || [])
      this._initializeFrameSessions(childFrame, promises);
  }
  _onDidCommitProvisionalTarget(event) {
    const { oldTargetId, newTargetId } = event;
    (0, import_utils.assert)(this._provisionalPage);
    (0, import_utils.assert)(this._provisionalPage._session.sessionId === newTargetId, "Unknown new target: " + newTargetId);
    (0, import_utils.assert)(this._session.sessionId === oldTargetId, "Unknown old target: " + oldTargetId);
    const newSession = this._provisionalPage._session;
    this._provisionalPage.commit();
    this._provisionalPage.dispose();
    this._provisionalPage = null;
    this._setSession(newSession);
  }
  _onTargetDestroyed(event) {
    const { targetId, crashed } = event;
    if (this._provisionalPage && this._provisionalPage._session.sessionId === targetId) {
      this._maybeCancelCoopNavigationRequest(this._provisionalPage);
      this._provisionalPage._session.dispose();
      this._provisionalPage.dispose();
      this._provisionalPage = null;
    } else if (this._session.sessionId === targetId) {
      this._session.dispose();
      import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
      if (crashed) {
        this._session.markAsCrashed();
        this._page._didCrash();
      }
    } else if (this._targetIdToFrameSession.has(targetId)) {
      this._targetIdToFrameSession.get(targetId).dispose();
      this._targetIdToFrameSession.delete(targetId);
    }
  }
  didClose() {
    this._pageProxySession.dispose();
    import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    if (this._session)
      this._session.dispose();
    if (this._provisionalPage) {
      this._provisionalPage._session.dispose();
      this._provisionalPage.dispose();
      this._provisionalPage = null;
    }
    this._firstNonInitialNavigationCommittedReject(new import_errors.TargetClosedError(this._page.closeReason()));
    this._page._didClose();
  }
  dispatchMessageToSession(message) {
    this._pageProxySession.dispatchMessage(message);
  }
  handleProvisionalLoadFailed(event) {
    if (!this._page.initializedOrUndefined()) {
      this._firstNonInitialNavigationCommittedReject(new Error("Initial load failed"));
      return;
    }
    if (!this._provisionalPage)
      return;
    let errorText = event.error;
    if (errorText.includes("cancelled"))
      errorText += "; maybe frame was detached?";
    this._page.frameManager.frameAbortedNavigation(this._page.mainFrame()._id, errorText, event.loaderId);
  }
  handleWindowOpen(event) {
    this._nextWindowOpenPopupFeatures = event.windowFeatures;
  }
  async _onTargetCreated(event) {
    const { targetInfo } = event;
    const session = new import_wkConnection.WKSession(this._pageProxySession.connection, targetInfo.targetId, (message) => {
      this._pageProxySession.send("Target.sendMessageToTarget", {
        message: JSON.stringify(message),
        targetId: targetInfo.targetId
      }).catch((e) => {
        session.dispatchMessage({ id: message.id, error: { message: e.message } });
      });
    });
    if (targetInfo.type === "frame") {
      if (enableFrameSessions) {
        const wkFrame = new WKFrame(this, session);
        this._targetIdToFrameSession.set(targetInfo.targetId, wkFrame);
        await wkFrame.initialize().catch((e) => {
        });
      }
      return;
    }
    (0, import_utils.assert)(targetInfo.type === "page", "Only page targets are expected in WebKit, received: " + targetInfo.type);
    if (!targetInfo.isProvisional) {
      (0, import_utils.assert)(!this._page.initializedOrUndefined());
      let pageOrError;
      try {
        this._setSession(session);
        await Promise.all([
          this._initializePageProxySession(),
          this._initializeSession(session, false, ({ frameTree }) => this._handleFrameTree(frameTree))
        ]);
        pageOrError = this._page;
      } catch (e) {
        pageOrError = e;
      }
      if (targetInfo.isPaused)
        this._pageProxySession.sendMayFail("Target.resume", { targetId: targetInfo.targetId });
      if (pageOrError instanceof import_page.Page && this._page.mainFrame().url() === "") {
        try {
          await this._firstNonInitialNavigationCommittedPromise;
        } catch (e) {
          pageOrError = e;
        }
      }
      this._page.reportAsNew(this._opener?._page, pageOrError instanceof import_page.Page ? void 0 : pageOrError);
    } else {
      (0, import_utils.assert)(targetInfo.isProvisional);
      (0, import_utils.assert)(!this._provisionalPage);
      this._provisionalPage = new import_wkProvisionalPage.WKProvisionalPage(session, this);
      if (targetInfo.isPaused) {
        this._provisionalPage.initializationPromise.then(() => {
          this._pageProxySession.sendMayFail("Target.resume", { targetId: targetInfo.targetId });
        });
      }
    }
  }
  _onDispatchMessageFromTarget(event) {
    const { targetId, message } = event;
    if (this._provisionalPage && this._provisionalPage._session.sessionId === targetId)
      this._provisionalPage._session.dispatchMessage(JSON.parse(message));
    else if (this._session.sessionId === targetId)
      this._session.dispatchMessage(JSON.parse(message));
    else if (this._targetIdToFrameSession.has(targetId))
      this._targetIdToFrameSession.get(targetId)._session.dispatchMessage(JSON.parse(message));
    else
      throw new Error("Unknown target: " + targetId);
  }
  _addSessionListeners() {
    this._sessionListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.frameNavigated", (event) => this._onFrameNavigated(event.frame, false)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.navigatedWithinDocument", (event) => this._onFrameNavigatedWithinDocument(event.frameId, event.url)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.frameAttached", (event) => this._onFrameAttached(event.frameId, event.parentFrameId)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.frameDetached", (event) => this._onFrameDetached(event.frameId)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.willCheckNavigationPolicy", (event) => this._onWillCheckNavigationPolicy(event.frameId)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.didCheckNavigationPolicy", (event) => this._onDidCheckNavigationPolicy(event.frameId, event.cancel)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.loadEventFired", (event) => this._page.frameManager.frameLifecycleEvent(event.frameId, "load")),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.domContentEventFired", (event) => this._page.frameManager.frameLifecycleEvent(event.frameId, "domcontentloaded")),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.executionContextCreated", (event) => this._onExecutionContextCreated(event.context)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.bindingCalled", (event) => this._onBindingCalled(event.contextId, event.argument)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Console.messageAdded", (event) => this._onConsoleMessage(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Console.messageRepeatCountUpdated", (event) => this._onConsoleRepeatCountUpdated(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._pageProxySession, "Dialog.javascriptDialogOpening", (event) => this._onDialog(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.fileChooserOpened", (event) => this._onFileChooserOpened(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.requestWillBeSent", (e) => this._onRequestWillBeSent(this._session, e)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.requestIntercepted", (e) => this._onRequestIntercepted(this._session, e)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.responseReceived", (e) => this._onResponseReceived(this._session, e)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.loadingFinished", (e) => this._onLoadingFinished(e)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.loadingFailed", (e) => this._onLoadingFailed(this._session, e)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketCreated", (e) => this._page.frameManager.onWebSocketCreated(e.requestId, e.url)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketWillSendHandshakeRequest", (e) => this._page.frameManager.onWebSocketRequest(e.requestId)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketHandshakeResponseReceived", (e) => this._page.frameManager.onWebSocketResponse(e.requestId, e.response.status, e.response.statusText)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketFrameSent", (e) => e.response.payloadData && this._page.frameManager.onWebSocketFrameSent(e.requestId, e.response.opcode, e.response.payloadData)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketFrameReceived", (e) => e.response.payloadData && this._page.frameManager.webSocketFrameReceived(e.requestId, e.response.opcode, e.response.payloadData)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketClosed", (e) => this._page.frameManager.webSocketClosed(e.requestId)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Network.webSocketFrameError", (e) => this._page.frameManager.webSocketError(e.requestId, e.errorMessage))
    ];
  }
  async _updateState(method, params) {
    await this._forAllSessions((session) => session.send(method, params).then());
  }
  async _forAllSessions(callback) {
    const sessions = [
      this._session
    ];
    if (this._provisionalPage)
      sessions.push(this._provisionalPage._session);
    await Promise.all(sessions.map((session) => callback(session).catch((e) => {
    })));
  }
  _onWillCheckNavigationPolicy(frameId) {
    if (this._provisionalPage)
      return;
    this._page.frameManager.frameRequestedNavigation(frameId);
  }
  _onDidCheckNavigationPolicy(frameId, cancel) {
    if (!cancel)
      return;
    if (this._provisionalPage)
      return;
    this._page.frameManager.frameAbortedNavigation(frameId, "Navigation canceled by policy check");
  }
  _handleFrameTree(frameTree) {
    this._onFrameAttached(frameTree.frame.id, frameTree.frame.parentId || null);
    this._onFrameNavigated(frameTree.frame, true);
    this._page.frameManager.frameLifecycleEvent(frameTree.frame.id, "domcontentloaded");
    this._page.frameManager.frameLifecycleEvent(frameTree.frame.id, "load");
    if (!frameTree.childFrames)
      return;
    for (const child of frameTree.childFrames)
      this._handleFrameTree(child);
  }
  _onFrameAttached(frameId, parentFrameId) {
    return this._page.frameManager.frameAttached(frameId, parentFrameId);
  }
  _onFrameNavigated(framePayload, initial) {
    const frame = this._page.frameManager.frame(framePayload.id);
    (0, import_utils.assert)(frame);
    this._removeContextsForFrame(frame, true);
    if (!framePayload.parentId)
      this._workers.clear();
    this._page.frameManager.frameCommittedNewDocumentNavigation(framePayload.id, framePayload.url, framePayload.name || "", framePayload.loaderId, initial);
    if (!initial)
      this._firstNonInitialNavigationCommittedFulfill();
  }
  _onFrameNavigatedWithinDocument(frameId, url) {
    this._page.frameManager.frameCommittedSameDocumentNavigation(frameId, url);
  }
  _onFrameDetached(frameId) {
    this._page.frameManager.frameDetached(frameId);
  }
  _removeContextsForFrame(frame, notifyFrame) {
    for (const [contextId, context] of this._contextIdToContext) {
      if (context.frame === frame) {
        this._contextIdToContext.delete(contextId);
        if (notifyFrame)
          frame._contextDestroyed(context);
      }
    }
  }
  _onExecutionContextCreated(contextPayload) {
    if (this._contextIdToContext.has(contextPayload.id))
      return;
    const frame = this._page.frameManager.frame(contextPayload.frameId);
    if (!frame)
      return;
    const delegate = new import_wkExecutionContext.WKExecutionContext(this._session, contextPayload.id);
    let worldName = null;
    if (contextPayload.type === "normal")
      worldName = "main";
    else if (contextPayload.type === "user" && contextPayload.name === UTILITY_WORLD_NAME)
      worldName = "utility";
    const context = new dom.FrameExecutionContext(delegate, frame, worldName);
    if (worldName)
      frame._contextCreated(worldName, context);
    this._contextIdToContext.set(contextPayload.id, context);
  }
  async _onBindingCalled(contextId, argument) {
    const pageOrError = await this._page.waitForInitializedOrError();
    if (!(pageOrError instanceof Error)) {
      const context = this._contextIdToContext.get(contextId);
      if (context)
        await this._page.onBindingCalled(argument, context);
    }
  }
  async navigateFrame(frame, url, referrer) {
    if (this._pageProxySession.isDisposed())
      throw new import_errors.TargetClosedError(this._page.closeReason());
    const pageProxyId = this._pageProxySession.sessionId;
    const result = await this._pageProxySession.connection.browserSession.send("Playwright.navigate", { url, pageProxyId, frameId: frame._id, referrer });
    return { newDocumentId: result.loaderId };
  }
  _onConsoleMessage(event) {
    const { type, level, text, parameters, url, line: lineNumber, column: columnNumber, source } = event.message;
    if (level === "error" && source === "javascript") {
      const { name, message } = (0, import_stackTrace.splitErrorMessage)(text);
      let stack;
      if (event.message.stackTrace) {
        stack = text + "\n" + event.message.stackTrace.callFrames.map((callFrame) => {
          return `    at ${callFrame.functionName || "unknown"} (${callFrame.url}:${callFrame.lineNumber}:${callFrame.columnNumber})`;
        }).join("\n");
      } else {
        stack = "";
      }
      this._lastConsoleMessage = null;
      const error = new Error(message);
      error.stack = stack;
      error.name = name;
      this._page.addPageError(error);
      return;
    }
    let derivedType = type || "";
    if (type === "log")
      derivedType = level;
    else if (type === "timing")
      derivedType = "timeEnd";
    const handles = [];
    for (const p of parameters || []) {
      let context;
      if (p.objectId) {
        const objectId = JSON.parse(p.objectId);
        context = this._contextIdToContext.get(objectId.injectedScriptId);
      } else {
        context = [...this._contextIdToContext.values()].find((c) => c.frame === this._page.mainFrame());
      }
      if (!context)
        return;
      handles.push((0, import_wkExecutionContext.createHandle)(context, p));
    }
    this._lastConsoleMessage = {
      derivedType,
      text,
      handles,
      count: 0,
      location: {
        url: url || "",
        lineNumber: (lineNumber || 1) - 1,
        columnNumber: (columnNumber || 1) - 1
      }
    };
    this._onConsoleRepeatCountUpdated({ count: 1 });
  }
  _onConsoleRepeatCountUpdated(event) {
    if (this._lastConsoleMessage) {
      const {
        derivedType,
        text,
        handles,
        count,
        location
      } = this._lastConsoleMessage;
      for (let i = count; i < event.count; ++i)
        this._page.addConsoleMessage(null, derivedType, handles, location, handles.length ? void 0 : text);
      this._lastConsoleMessage.count = event.count;
    }
  }
  _onDialog(event) {
    this._page.browserContext.dialogManager.dialogDidOpen(new dialog.Dialog(
      this._page,
      event.type,
      event.message,
      async (accept, promptText) => {
        if (event.type === "beforeunload" && !accept)
          this._page.frameManager.frameAbortedNavigation(this._page.mainFrame()._id, "navigation cancelled by beforeunload dialog");
        await this._pageProxySession.send("Dialog.handleJavaScriptDialog", { accept, promptText });
      },
      event.defaultPrompt
    ));
  }
  async _onFileChooserOpened(event) {
    let handle;
    try {
      const context = await this._page.frameManager.frame(event.frameId)._mainContext();
      handle = (0, import_wkExecutionContext.createHandle)(context, event.element).asElement();
    } catch (e) {
      return;
    }
    await this._page._onFileChooserOpened(handle);
  }
  static async _setEmulateMedia(session, mediaType, colorScheme, reducedMotion, forcedColors, contrast) {
    const promises = [];
    promises.push(session.send("Page.setEmulatedMedia", { media: mediaType === "no-override" ? "" : mediaType }));
    let appearance = void 0;
    switch (colorScheme) {
      case "light":
        appearance = "Light";
        break;
      case "dark":
        appearance = "Dark";
        break;
      case "no-override":
        appearance = void 0;
        break;
    }
    promises.push(session.send("Page.overrideUserPreference", { name: "PrefersColorScheme", value: appearance }));
    let reducedMotionWk = void 0;
    switch (reducedMotion) {
      case "reduce":
        reducedMotionWk = "Reduce";
        break;
      case "no-preference":
        reducedMotionWk = "NoPreference";
        break;
      case "no-override":
        reducedMotionWk = void 0;
        break;
    }
    promises.push(session.send("Page.overrideUserPreference", { name: "PrefersReducedMotion", value: reducedMotionWk }));
    let forcedColorsWk = void 0;
    switch (forcedColors) {
      case "active":
        forcedColorsWk = "Active";
        break;
      case "none":
        forcedColorsWk = "None";
        break;
      case "no-override":
        forcedColorsWk = void 0;
        break;
    }
    promises.push(session.send("Page.setForcedColors", { forcedColors: forcedColorsWk }));
    let contrastWk = void 0;
    switch (contrast) {
      case "more":
        contrastWk = "More";
        break;
      case "no-preference":
        contrastWk = "NoPreference";
        break;
      case "no-override":
        contrastWk = void 0;
        break;
    }
    promises.push(session.send("Page.overrideUserPreference", { name: "PrefersContrast", value: contrastWk }));
    await Promise.all(promises);
  }
  async updateExtraHTTPHeaders() {
    await this._updateState("Network.setExtraHTTPHeaders", { headers: (0, import_headers.headersArrayToObject)(
      this._calculateExtraHTTPHeaders(),
      false
      /* lowerCase */
    ) });
  }
  _calculateExtraHTTPHeaders() {
    const locale = this._browserContext._options.locale;
    const headers = network.mergeHeaders([
      this._browserContext._options.extraHTTPHeaders,
      this._page.extraHTTPHeaders(),
      locale ? network.singleHeader("Accept-Language", locale) : void 0
    ]);
    return headers;
  }
  async updateEmulateMedia() {
    const emulatedMedia = this._page.emulatedMedia();
    const colorScheme = emulatedMedia.colorScheme;
    const reducedMotion = emulatedMedia.reducedMotion;
    const forcedColors = emulatedMedia.forcedColors;
    const contrast = emulatedMedia.contrast;
    await this._forAllSessions((session) => WKPage._setEmulateMedia(session, emulatedMedia.media, colorScheme, reducedMotion, forcedColors, contrast));
  }
  async updateEmulatedViewportSize() {
    this._browserContext._validateEmulatedViewport(this._page.emulatedSize()?.viewport);
    await this._updateViewport();
  }
  async updateUserAgent() {
    const contextOptions = this._browserContext._options;
    this._updateState("Page.overrideUserAgent", { value: contextOptions.userAgent });
  }
  async bringToFront() {
    this._pageProxySession.send("Target.activate", {
      targetId: this._session.sessionId
    });
  }
  async _updateViewport() {
    const options = this._browserContext._options;
    const emulatedSize = this._page.emulatedSize();
    if (!emulatedSize)
      return;
    const viewportSize = emulatedSize.viewport;
    const screenSize = emulatedSize.screen;
    const promises = [
      this._pageProxySession.send("Emulation.setDeviceMetricsOverride", {
        width: viewportSize.width,
        height: viewportSize.height,
        fixedLayout: !!options.isMobile,
        deviceScaleFactor: options.deviceScaleFactor || 1
      }),
      this._session.send("Page.setScreenSizeOverride", {
        width: screenSize.width,
        height: screenSize.height
      })
    ];
    if (options.isMobile) {
      const angle = viewportSize.width > viewportSize.height ? 90 : 0;
      promises.push(this._pageProxySession.send("Emulation.setOrientationOverride", { angle }));
    }
    await Promise.all(promises);
    if (!this._browserContext._browser?.options.headful && (import_hostPlatform.hostPlatform === "ubuntu22.04-x64" || import_hostPlatform.hostPlatform.startsWith("debian12")))
      await new Promise((r) => setTimeout(r, 500));
  }
  async updateRequestInterception() {
    const enabled = this._page.needsRequestInterception();
    await Promise.all([
      this._updateState("Network.setInterceptionEnabled", { enabled }),
      this._updateState("Network.setResourceCachingDisabled", { disabled: enabled }),
      this._updateState("Network.addInterception", { url: ".*", stage: "request", isRegex: true })
    ]);
  }
  async updateOffline() {
    await this._updateState("Network.setEmulateOfflineState", { offline: !!this._browserContext._options.offline });
  }
  async updateHttpCredentials() {
    const credentials = this._browserContext._options.httpCredentials || { username: "", password: "", origin: "" };
    await this._pageProxySession.send("Emulation.setAuthCredentials", { username: credentials.username, password: credentials.password, origin: credentials.origin });
  }
  async updateFileChooserInterception() {
    const enabled = this._page.fileChooserIntercepted();
    await this._session.send("Page.setInterceptFileChooserDialog", { enabled }).catch(() => {
    });
  }
  async reload() {
    await this._session.send("Page.reload");
  }
  goBack() {
    return this._session.send("Page.goBack").then(() => true).catch((error) => {
      if (error instanceof Error && error.message.includes(`Protocol error (Page.goBack): Failed to go`))
        return false;
      throw error;
    });
  }
  goForward() {
    return this._session.send("Page.goForward").then(() => true).catch((error) => {
      if (error instanceof Error && error.message.includes(`Protocol error (Page.goForward): Failed to go`))
        return false;
      throw error;
    });
  }
  async requestGC() {
    await this._session.send("Heap.gc");
  }
  async addInitScript(initScript) {
    await this._updateBootstrapScript();
  }
  async removeInitScripts(initScripts) {
    await this._updateBootstrapScript();
  }
  async exposePlaywrightBinding() {
    await this._updateState("Runtime.addBinding", { name: import_page.PageBinding.kBindingName });
  }
  _calculateBootstrapScript() {
    const scripts = [];
    if (!this._page.browserContext._options.isMobile) {
      scripts.push("delete window.orientation");
      scripts.push("delete window.ondevicemotion");
      scripts.push("delete window.ondeviceorientation");
    }
    scripts.push('if (!window.safari) window.safari = { pushNotification: { toString() { return "[object SafariRemoteNotification]"; } } };');
    scripts.push("if (!window.GestureEvent) window.GestureEvent = function GestureEvent() {};");
    scripts.push(this._publicKeyCredentialScript());
    scripts.push(...this._page.allInitScripts().map((script) => script.source));
    return scripts.join(";\n");
  }
  _publicKeyCredentialScript() {
    function polyfill() {
      window.PublicKeyCredential ??= {
        async getClientCapabilities() {
          return {};
        },
        async isConditionalMediationAvailable() {
          return false;
        },
        async isUserVerifyingPlatformAuthenticatorAvailable() {
          return false;
        }
      };
    }
    return `(${polyfill.toString()})();`;
  }
  async _updateBootstrapScript() {
    await this._updateState("Page.setBootstrapScript", { source: this._calculateBootstrapScript() });
  }
  async closePage(runBeforeUnload) {
    await this._pageProxySession.sendMayFail("Target.close", {
      targetId: this._session.sessionId,
      runBeforeUnload
    });
  }
  async setBackgroundColor(color) {
    await this._session.send("Page.setDefaultBackgroundColorOverride", { color });
  }
  _toolbarHeight() {
    if (this._page.browserContext._browser?.options.headful)
      return import_hostPlatform.hostPlatform === "mac10.15" ? 55 : 59;
    return 0;
  }
  async _initializeVideoRecording() {
    const screencast = this._page.screencast;
    const videoOptions = screencast.launchVideoRecorder();
    if (videoOptions)
      await screencast.startVideoRecording(videoOptions);
  }
  validateScreenshotDimension(side, omitDeviceScaleFactor) {
    if (process.platform === "darwin")
      return;
    if (!omitDeviceScaleFactor && this._page.browserContext._options.deviceScaleFactor)
      side = Math.ceil(side * this._page.browserContext._options.deviceScaleFactor);
    if (side > 32767)
      throw new Error("Cannot take screenshot larger than 32767 pixels on any dimension");
  }
  async takeScreenshot(progress, format, documentRect, viewportRect, quality, fitsViewport, scale) {
    const rect = documentRect || viewportRect;
    const omitDeviceScaleFactor = scale === "css";
    this.validateScreenshotDimension(rect.width, omitDeviceScaleFactor);
    this.validateScreenshotDimension(rect.height, omitDeviceScaleFactor);
    const result = await progress.race(this._session.send("Page.snapshotRect", { ...rect, coordinateSystem: documentRect ? "Page" : "Viewport", omitDeviceScaleFactor }));
    const prefix = "data:image/png;base64,";
    let buffer = Buffer.from(result.dataURL.substr(prefix.length), "base64");
    if (format === "jpeg")
      buffer = import_utilsBundle.jpegjs.encode(import_utilsBundle.PNG.sync.read(buffer), quality).data;
    return buffer;
  }
  async getContentFrame(handle) {
    const nodeInfo = await this._session.send("DOM.describeNode", {
      objectId: handle._objectId
    });
    if (!nodeInfo.contentFrameId)
      return null;
    return this._page.frameManager.frame(nodeInfo.contentFrameId);
  }
  async getOwnerFrame(handle) {
    if (!handle._objectId)
      return null;
    const nodeInfo = await this._session.send("DOM.describeNode", {
      objectId: handle._objectId
    });
    return nodeInfo.ownerFrameId || null;
  }
  async getBoundingBox(handle) {
    const quads = await this.getContentQuads(handle);
    if (!quads || !quads.length)
      return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const quad of quads) {
      for (const point of quad) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  async scrollRectIntoViewIfNeeded(handle, rect) {
    return await this._session.send("DOM.scrollIntoViewIfNeeded", {
      objectId: handle._objectId,
      rect
    }).then(() => "done").catch((e) => {
      if (e instanceof Error && e.message.includes("Node does not have a layout object"))
        return "error:notvisible";
      if (e instanceof Error && e.message.includes("Node is detached from document"))
        return "error:notconnected";
      throw e;
    });
  }
  async startScreencast(options) {
    const { generation } = await this._pageProxySession.send("Screencast.startScreencast", {
      quality: options.quality,
      width: options.width,
      height: options.height,
      toolbarHeight: this._toolbarHeight()
    });
    this._screencastGeneration = generation;
  }
  async stopScreencast() {
    await this._pageProxySession.sendMayFail("Screencast.stopScreencast");
  }
  _onScreencastFrame(event) {
    const generation = this._screencastGeneration;
    this._page.screencast.throttleFrameAck(() => {
      this._pageProxySession.sendMayFail("Screencast.screencastFrameAck", { generation });
    });
    const buffer = Buffer.from(event.data, "base64");
    this._page.emit(import_page.Page.Events.ScreencastFrame, {
      buffer,
      frameSwapWallTime: event.timestamp ? event.timestamp * 1e3 : Date.now(),
      width: event.deviceWidth,
      height: event.deviceHeight
    });
  }
  rafCountForStablePosition() {
    return process.platform === "win32" ? 5 : 1;
  }
  async getContentQuads(handle) {
    const result = await this._session.sendMayFail("DOM.getContentQuads", {
      objectId: handle._objectId
    });
    if (!result)
      return null;
    return result.quads.map((quad) => [
      { x: quad[0], y: quad[1] },
      { x: quad[2], y: quad[3] },
      { x: quad[4], y: quad[5] },
      { x: quad[6], y: quad[7] }
    ]);
  }
  async setInputFilePaths(handle, paths) {
    const pageProxyId = this._pageProxySession.sessionId;
    const objectId = handle._objectId;
    if (this._browserContext._browser?.options.channel === "webkit-wsl")
      paths = await Promise.all(paths.map((path) => (0, import_webkit.translatePathToWSL)(path)));
    await Promise.all([
      this._pageProxySession.connection.browserSession.send("Playwright.grantFileReadAccess", { pageProxyId, paths }),
      this._session.send("DOM.setInputFiles", { objectId, paths })
    ]);
  }
  async adoptElementHandle(handle, to) {
    const result = await this._session.sendMayFail("DOM.resolveNode", {
      objectId: handle._objectId,
      executionContextId: to.delegate._contextId
    });
    if (!result || result.object.subtype === "null")
      throw new Error(dom.kUnableToAdoptErrorMessage);
    return (0, import_wkExecutionContext.createHandle)(to, result.object);
  }
  async inputActionEpilogue() {
  }
  async resetForReuse(progress) {
  }
  async getFrameElement(frame) {
    const parent = frame.parentFrame();
    if (!parent)
      throw new Error("Frame has been detached.");
    const context = await parent._mainContext();
    const result = await this._session.send("DOM.resolveNode", {
      frameId: frame._id,
      executionContextId: context.delegate._contextId
    });
    if (!result || result.object.subtype === "null")
      throw new Error("Frame has been detached.");
    return (0, import_wkExecutionContext.createHandle)(context, result.object);
  }
  _maybeCancelCoopNavigationRequest(provisionalPage) {
    const navigationRequest = provisionalPage.coopNavigationRequest();
    for (const [requestId, request] of this._requestIdToRequest) {
      if (request.request === navigationRequest) {
        this._onLoadingFailed(provisionalPage._session, {
          requestId,
          errorText: "Provisiolal navigation canceled.",
          timestamp: request._timestamp,
          canceled: true
        });
        return;
      }
    }
  }
  _adoptRequestFromNewProcess(navigationRequest, newSession, newRequestId) {
    for (const [requestId, request] of this._requestIdToRequest) {
      if (request.request === navigationRequest) {
        this._requestIdToRequest.delete(requestId);
        request.adoptRequestFromNewProcess(newSession, newRequestId);
        this._requestIdToRequest.set(newRequestId, request);
        return;
      }
    }
  }
  _onRequestWillBeSent(session, event) {
    if (event.request.url.startsWith("data:"))
      return;
    if (event.request.url.startsWith("about:"))
      return;
    if (this._page.needsRequestInterception() && !event.redirectResponse)
      this._requestIdToRequestWillBeSentEvent.set(event.requestId, event);
    else
      this._onRequest(session, event, false);
  }
  _onRequest(session, event, intercepted) {
    let redirectedFrom = null;
    if (event.redirectResponse) {
      const request2 = this._requestIdToRequest.get(event.requestId);
      if (request2) {
        this._handleRequestRedirect(request2, event.requestId, event.redirectResponse, event.timestamp);
        redirectedFrom = request2;
      }
    }
    const frame = redirectedFrom ? redirectedFrom.request.frame() : this._page.frameManager.frame(event.frameId);
    if (!frame)
      return;
    const isNavigationRequest = event.type === "Document";
    const documentId = isNavigationRequest ? event.loaderId : void 0;
    const request = new import_wkInterceptableRequest.WKInterceptableRequest(session, frame, event, redirectedFrom, documentId);
    let route;
    if (intercepted) {
      route = new import_wkInterceptableRequest.WKRouteImpl(session, event.requestId);
      request.request.setRawRequestHeaders(null);
    }
    this._requestIdToRequest.set(event.requestId, request);
    this._page.frameManager.requestStarted(request.request, route);
  }
  _handleRequestRedirect(request, requestId, responsePayload, timestamp) {
    const response = request.createResponse(responsePayload);
    response._securityDetailsFinished();
    response._serverAddrFinished();
    response.setResponseHeadersSize(null);
    response.setEncodedBodySize(null);
    response._requestFinished(responsePayload.timing ? import_helper.helper.secondsToRoundishMillis(timestamp - request._timestamp) : -1);
    this._requestIdToRequest.delete(requestId);
    this._page.frameManager.requestReceivedResponse(response);
    this._page.frameManager.reportRequestFinished(request.request, response);
  }
  _onRequestIntercepted(session, event) {
    const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(event.requestId);
    if (!requestWillBeSentEvent) {
      session.sendMayFail("Network.interceptWithRequest", { requestId: event.requestId });
      return;
    }
    this._requestIdToRequestWillBeSentEvent.delete(event.requestId);
    this._onRequest(session, requestWillBeSentEvent, true);
  }
  _onResponseReceived(session, event) {
    const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(event.requestId);
    if (requestWillBeSentEvent) {
      this._requestIdToRequestWillBeSentEvent.delete(event.requestId);
      this._onRequest(session, requestWillBeSentEvent, false);
    }
    const request = this._requestIdToRequest.get(event.requestId);
    if (!request)
      return;
    this._requestIdToResponseReceivedPayloadEvent.set(event.requestId, event);
    const response = request.createResponse(event.response);
    this._page.frameManager.requestReceivedResponse(response);
    if (response.status() === 204 && request.request.isNavigationRequest()) {
      this._onLoadingFailed(session, {
        requestId: event.requestId,
        errorText: "Aborted: 204 No Content",
        timestamp: event.timestamp
      });
    }
  }
  _onLoadingFinished(event) {
    const request = this._requestIdToRequest.get(event.requestId);
    if (!request)
      return;
    const response = request.request._existingResponse();
    if (response) {
      const responseReceivedPayload = this._requestIdToResponseReceivedPayloadEvent.get(event.requestId);
      response._serverAddrFinished(parseRemoteAddress(event?.metrics?.remoteAddress));
      response._securityDetailsFinished({
        protocol: isLoadedSecurely(response.url(), response.timing()) ? event.metrics?.securityConnection?.protocol : void 0,
        subjectName: responseReceivedPayload?.response.security?.certificate?.subject,
        validFrom: responseReceivedPayload?.response.security?.certificate?.validFrom,
        validTo: responseReceivedPayload?.response.security?.certificate?.validUntil
      });
      if (event.metrics?.protocol)
        response._setHttpVersion(event.metrics.protocol);
      response.setEncodedBodySize(event.metrics?.responseBodyBytesReceived ?? null);
      response.setResponseHeadersSize(event.metrics?.responseHeaderBytesReceived ?? null);
      response._requestFinished(import_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));
    } else {
      request.request.setRawRequestHeaders(null);
    }
    this._requestIdToResponseReceivedPayloadEvent.delete(event.requestId);
    this._requestIdToRequest.delete(event.requestId);
    this._page.frameManager.reportRequestFinished(request.request, response);
  }
  _onLoadingFailed(session, event) {
    const requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(event.requestId);
    if (requestWillBeSentEvent) {
      this._requestIdToRequestWillBeSentEvent.delete(event.requestId);
      this._onRequest(session, requestWillBeSentEvent, false);
    }
    const request = this._requestIdToRequest.get(event.requestId);
    if (!request)
      return;
    const response = request.request._existingResponse();
    if (response) {
      response._serverAddrFinished();
      response._securityDetailsFinished();
      response.setResponseHeadersSize(null);
      response.setEncodedBodySize(null);
      response._requestFinished(import_helper.helper.secondsToRoundishMillis(event.timestamp - request._timestamp));
    } else {
      request.request.setRawRequestHeaders(null);
    }
    this._requestIdToRequest.delete(event.requestId);
    request.request._setFailureText(event.errorText);
    this._page.frameManager.requestFailed(request.request, event.errorText.includes("cancelled"));
  }
  async _grantPermissions(origin, permissions) {
    const webPermissionToProtocol = /* @__PURE__ */ new Map([
      ["geolocation", "geolocation"],
      ["notifications", "notifications"],
      ["clipboard-read", "clipboard-read"]
    ]);
    const filtered = permissions.map((permission) => {
      const protocolPermission = webPermissionToProtocol.get(permission);
      if (!protocolPermission)
        throw new Error("Unknown permission: " + permission);
      return protocolPermission;
    });
    await this._pageProxySession.send("Emulation.grantPermissions", { origin, permissions: filtered });
  }
  async _clearPermissions() {
    await this._pageProxySession.send("Emulation.resetPermissions", {});
  }
  shouldToggleStyleSheetToSyncAnimations() {
    return true;
  }
}
class WKFrame {
  constructor(page, session) {
    this._sessionListeners = [];
    this._initializePromise = null;
    this._page = page;
    this._session = session;
  }
  async initialize() {
    if (this._initializePromise)
      return this._initializePromise;
    this._initializePromise = this._initializeImpl();
    return this._initializePromise;
  }
  async _initializeImpl() {
    this._sessionListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Console.messageAdded", (event) => this._page._onConsoleMessage(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Console.messageRepeatCountUpdated", (event) => this._page._onConsoleRepeatCountUpdated(event))
    ];
    await this._session.send("Console.enable");
  }
  dispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
    this._session.dispose();
  }
}
function parseRemoteAddress(value) {
  if (!value)
    return;
  try {
    const colon = value.lastIndexOf(":");
    const dot = value.lastIndexOf(".");
    if (dot < 0) {
      return {
        ipAddress: `[${value.slice(0, colon)}]`,
        port: +value.slice(colon + 1)
      };
    }
    if (colon > dot) {
      const [address, port] = value.split(":");
      return {
        ipAddress: address,
        port: +port
      };
    } else {
      const [address, port] = value.split(".");
      return {
        ipAddress: `[${address}]`,
        port: +port
      };
    }
  } catch (_) {
  }
}
function isLoadedSecurely(url, timing) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "wss:" && u.protocol !== "sftp:")
      return false;
    if (timing.secureConnectionStart === -1 && timing.connectStart !== -1)
      return false;
    return true;
  } catch (_) {
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKPage
});
