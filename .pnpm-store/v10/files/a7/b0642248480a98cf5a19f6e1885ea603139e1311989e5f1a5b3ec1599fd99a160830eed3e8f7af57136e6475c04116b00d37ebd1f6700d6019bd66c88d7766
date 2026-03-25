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
var crPage_exports = {};
__export(crPage_exports, {
  CRPage: () => CRPage
});
module.exports = __toCommonJS(crPage_exports);
var import_assert = require("../../utils/isomorphic/assert");
var import_eventsHelper = require("../utils/eventsHelper");
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var dialog = __toESM(require("../dialog"));
var dom = __toESM(require("../dom"));
var frames = __toESM(require("../frames"));
var import_helper = require("../helper");
var network = __toESM(require("../network"));
var import_page = require("../page");
var import_crCoverage = require("./crCoverage");
var import_crDragDrop = require("./crDragDrop");
var import_crExecutionContext = require("./crExecutionContext");
var import_crInput = require("./crInput");
var import_crNetworkManager = require("./crNetworkManager");
var import_crPdf = require("./crPdf");
var import_crProtocolHelper = require("./crProtocolHelper");
var import_defaultFontFamilies = require("./defaultFontFamilies");
var import_errors = require("../errors");
var import_protocolError = require("../protocolError");
class CRPage {
  constructor(client, targetId, browserContext, opener, bits) {
    this._sessions = /* @__PURE__ */ new Map();
    // Holds window features for the next popup being opened via window.open,
    // until the popup target arrives. This could be racy if two oopifs
    // simultaneously call window.open with window features: the order
    // of their Page.windowOpen events is not guaranteed to match the order
    // of new popup targets.
    this._nextWindowOpenPopupFeatures = [];
    this._targetId = targetId;
    this._opener = opener;
    const dragManager = new import_crDragDrop.DragManager(this);
    this.rawKeyboard = new import_crInput.RawKeyboardImpl(client, browserContext._browser._platform() === "mac", dragManager);
    this.rawMouse = new import_crInput.RawMouseImpl(this, client, dragManager);
    this.rawTouchscreen = new import_crInput.RawTouchscreenImpl(client);
    this._pdf = new import_crPdf.CRPDF(client);
    this._coverage = new import_crCoverage.CRCoverage(client);
    this._browserContext = browserContext;
    this._page = new import_page.Page(this, browserContext);
    this.utilityWorldName = `__playwright_utility_world_${this._page.guid}`;
    this._networkManager = new import_crNetworkManager.CRNetworkManager(this._page, null);
    this.updateOffline();
    this.updateExtraHTTPHeaders();
    this.updateHttpCredentials();
    this.updateRequestInterception();
    this._mainFrameSession = new FrameSession(this, client, targetId, null);
    this._sessions.set(targetId, this._mainFrameSession);
    if (opener && !browserContext._options.noDefaultViewport) {
      const features = opener._nextWindowOpenPopupFeatures.shift() || [];
      const viewportSize = import_helper.helper.getViewportSizeFromWindowFeatures(features);
      if (viewportSize)
        this._page.setEmulatedSizeFromWindowOpen({ viewport: viewportSize, screen: viewportSize });
    }
    this._mainFrameSession._initialize(bits.hasUIWindow).then(
      () => this._page.reportAsNew(this._opener?._page, void 0),
      (error) => this._page.reportAsNew(this._opener?._page, error)
    );
  }
  static mainFrameSession(page) {
    const crPage = page.delegate;
    return crPage._mainFrameSession;
  }
  async _forAllFrameSessions(cb) {
    const frameSessions = Array.from(this._sessions.values());
    await Promise.all(frameSessions.map((frameSession) => {
      if (frameSession._isMainFrame())
        return cb(frameSession);
      return cb(frameSession).catch((e) => {
        if ((0, import_protocolError.isSessionClosedError)(e))
          return;
        throw e;
      });
    }));
  }
  _sessionForFrame(frame) {
    while (!this._sessions.has(frame._id)) {
      const parent = frame.parentFrame();
      if (!parent)
        throw new Error(`Frame has been detached.`);
      frame = parent;
    }
    return this._sessions.get(frame._id);
  }
  _sessionForHandle(handle) {
    const frame = handle._context.frame;
    return this._sessionForFrame(frame);
  }
  willBeginDownload() {
    this._mainFrameSession._willBeginDownload();
  }
  didClose() {
    for (const session of this._sessions.values())
      session.dispose();
    this._page._didClose();
  }
  async navigateFrame(frame, url, referrer) {
    return this._sessionForFrame(frame)._navigate(frame, url, referrer);
  }
  async updateExtraHTTPHeaders() {
    const headers = network.mergeHeaders([
      this._browserContext._options.extraHTTPHeaders,
      this._page.extraHTTPHeaders()
    ]);
    await this._networkManager.setExtraHTTPHeaders(headers);
  }
  async updateGeolocation() {
    await this._forAllFrameSessions((frame) => frame._updateGeolocation(false));
  }
  async updateOffline() {
    await this._networkManager.setOffline(!!this._browserContext._options.offline);
  }
  async updateHttpCredentials() {
    await this._networkManager.authenticate(this._browserContext._options.httpCredentials || null);
  }
  async updateEmulatedViewportSize(preserveWindowBoundaries) {
    await this._mainFrameSession._updateViewport(preserveWindowBoundaries);
  }
  async bringToFront() {
    await this._mainFrameSession._client.send("Page.bringToFront");
  }
  async updateEmulateMedia() {
    await this._forAllFrameSessions((frame) => frame._updateEmulateMedia());
  }
  async updateUserAgent() {
    await this._forAllFrameSessions((frame) => frame._updateUserAgent());
  }
  async updateRequestInterception() {
    await this._networkManager.setRequestInterception(this._page.needsRequestInterception());
  }
  async updateFileChooserInterception() {
    await this._forAllFrameSessions((frame) => frame._updateFileChooserInterception(false));
  }
  async reload() {
    await this._mainFrameSession._client.send("Page.reload");
  }
  async _go(delta) {
    const history = await this._mainFrameSession._client.send("Page.getNavigationHistory");
    const entry = history.entries[history.currentIndex + delta];
    if (!entry)
      return false;
    await this._mainFrameSession._client.send("Page.navigateToHistoryEntry", { entryId: entry.id });
    return true;
  }
  goBack() {
    return this._go(-1);
  }
  goForward() {
    return this._go(1);
  }
  async requestGC() {
    await this._mainFrameSession._client.send("HeapProfiler.collectGarbage");
  }
  async addInitScript(initScript, world = "main") {
    await this._forAllFrameSessions((frame) => frame._evaluateOnNewDocument(initScript, world));
  }
  async exposePlaywrightBinding() {
    await this._forAllFrameSessions((frame) => frame.exposePlaywrightBinding());
  }
  async removeInitScripts(initScripts) {
    await this._forAllFrameSessions((frame) => frame._removeEvaluatesOnNewDocument(initScripts));
  }
  async closePage(runBeforeUnload) {
    if (runBeforeUnload)
      await this._mainFrameSession._client.send("Page.close");
    else
      await this._browserContext._browser._closePage(this);
  }
  async setBackgroundColor(color) {
    await this._mainFrameSession._client.send("Emulation.setDefaultBackgroundColorOverride", { color });
  }
  async takeScreenshot(progress, format, documentRect, viewportRect, quality, fitsViewport, scale) {
    const { visualViewport } = await progress.race(this._mainFrameSession._client.send("Page.getLayoutMetrics"));
    if (!documentRect) {
      documentRect = {
        x: visualViewport.pageX + viewportRect.x,
        y: visualViewport.pageY + viewportRect.y,
        ...import_helper.helper.enclosingIntSize({
          width: viewportRect.width / visualViewport.scale,
          height: viewportRect.height / visualViewport.scale
        })
      };
    }
    const clip = { ...documentRect, scale: viewportRect ? visualViewport.scale : 1 };
    if (scale === "css") {
      const deviceScaleFactor = this._browserContext._options.deviceScaleFactor || 1;
      clip.scale /= deviceScaleFactor;
    }
    const result = await progress.race(this._mainFrameSession._client.send("Page.captureScreenshot", { format, quality, clip, captureBeyondViewport: !fitsViewport }));
    return Buffer.from(result.data, "base64");
  }
  async getContentFrame(handle) {
    return this._sessionForHandle(handle)._getContentFrame(handle);
  }
  async getOwnerFrame(handle) {
    return this._sessionForHandle(handle)._getOwnerFrame(handle);
  }
  async getBoundingBox(handle) {
    return this._sessionForHandle(handle)._getBoundingBox(handle);
  }
  async scrollRectIntoViewIfNeeded(handle, rect) {
    return this._sessionForHandle(handle)._scrollRectIntoViewIfNeeded(handle, rect);
  }
  async startScreencast(options) {
    await this._mainFrameSession._client.send("Page.startScreencast", {
      format: "jpeg",
      quality: options.quality,
      maxWidth: options.width,
      maxHeight: options.height
    });
  }
  async stopScreencast() {
    await this._mainFrameSession._client._sendMayFail("Page.stopScreencast");
  }
  rafCountForStablePosition() {
    return 1;
  }
  async getContentQuads(handle) {
    return this._sessionForHandle(handle)._getContentQuads(handle);
  }
  async setInputFilePaths(handle, files) {
    const frame = await handle.ownerFrame();
    if (!frame)
      throw new Error("Cannot set input files to detached input element");
    const parentSession = this._sessionForFrame(frame);
    await parentSession._client.send("DOM.setFileInputFiles", {
      objectId: handle._objectId,
      files
    });
  }
  async adoptElementHandle(handle, to) {
    return this._sessionForHandle(handle)._adoptElementHandle(handle, to);
  }
  async inputActionEpilogue() {
    await this._mainFrameSession._client.send("Page.enable").catch((e) => {
    });
  }
  async resetForReuse(progress) {
    await this.rawMouse.move(progress, -1, -1, "none", /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), true);
  }
  async pdf(options) {
    return this._pdf.generate(options);
  }
  coverage() {
    return this._coverage;
  }
  async getFrameElement(frame) {
    let parent = frame.parentFrame();
    if (!parent)
      throw new Error("Frame has been detached.");
    const parentSession = this._sessionForFrame(parent);
    const { backendNodeId } = await parentSession._client.send("DOM.getFrameOwner", { frameId: frame._id }).catch((e) => {
      if (e instanceof Error && e.message.includes("Frame with the given id was not found."))
        (0, import_stackTrace.rewriteErrorMessage)(e, "Frame has been detached.");
      throw e;
    });
    parent = frame.parentFrame();
    if (!parent)
      throw new Error("Frame has been detached.");
    return parentSession._adoptBackendNodeId(backendNodeId, await parent._mainContext());
  }
  shouldToggleStyleSheetToSyncAnimations() {
    return false;
  }
}
class FrameSession {
  constructor(crPage, client, targetId, parentSession) {
    this._childSessions = /* @__PURE__ */ new Set();
    this._contextIdToContext = /* @__PURE__ */ new Map();
    this._eventListeners = [];
    this._firstNonInitialNavigationCommittedFulfill = () => {
    };
    this._firstNonInitialNavigationCommittedReject = (e) => {
    };
    // Marks the oopif session that remote -> local transition has happened in the parent.
    // See Target.detachedFromTarget handler for details.
    this._swappedIn = false;
    this._workerSessions = /* @__PURE__ */ new Map();
    this._initScriptIds = /* @__PURE__ */ new Map();
    this._client = client;
    this._crPage = crPage;
    this._page = crPage._page;
    this._targetId = targetId;
    this._parentSession = parentSession;
    if (parentSession)
      parentSession._childSessions.add(this);
    this._firstNonInitialNavigationCommittedPromise = new Promise((f, r) => {
      this._firstNonInitialNavigationCommittedFulfill = f;
      this._firstNonInitialNavigationCommittedReject = r;
    });
    this._firstNonInitialNavigationCommittedPromise.catch(() => {
    });
  }
  _isMainFrame() {
    return this._targetId === this._crPage._targetId;
  }
  _addRendererListeners() {
    this._eventListeners.push(...[
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Log.entryAdded", (event) => this._onLogEntryAdded(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.fileChooserOpened", (event) => this._onFileChooserOpened(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.frameAttached", (event) => this._onFrameAttached(event.frameId, event.parentFrameId)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.frameDetached", (event) => this._onFrameDetached(event.frameId, event.reason)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.frameNavigated", (event) => this._onFrameNavigated(event.frame, false)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.frameRequestedNavigation", (event) => this._onFrameRequestedNavigation(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.javascriptDialogOpening", (event) => this._onDialog(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.navigatedWithinDocument", (event) => this._onFrameNavigatedWithinDocument(event.frameId, event.url)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.bindingCalled", (event) => this._onBindingCalled(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.consoleAPICalled", (event) => this._onConsoleAPI(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.exceptionThrown", (exception) => this._handleException(exception.exceptionDetails)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.executionContextCreated", (event) => this._onExecutionContextCreated(event.context)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.executionContextDestroyed", (event) => this._onExecutionContextDestroyed(event.executionContextId)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.executionContextsCleared", (event) => this._onExecutionContextsCleared())
    ]);
  }
  _addBrowserListeners() {
    this._eventListeners.push(...[
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Target.attachedToTarget", (event) => this._onAttachedToTarget(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Target.detachedFromTarget", (event) => this._onDetachedFromTarget(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Inspector.targetCrashed", (event) => this._onTargetCrashed()),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.screencastFrame", (event) => this._onScreencastFrame(event)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.windowOpen", (event) => this._onWindowOpen(event))
    ]);
  }
  async _initialize(hasUIWindow) {
    if (!this._page.isStorageStatePage && hasUIWindow && !this._crPage._browserContext._browser.isClank() && !this._crPage._browserContext._options.noDefaultViewport) {
      const { windowId } = await this._client.send("Browser.getWindowForTarget");
      this._windowId = windowId;
    }
    let videoOptions;
    if (!this._page.isStorageStatePage && this._isMainFrame() && hasUIWindow)
      videoOptions = this._crPage._page.screencast.launchVideoRecorder();
    let lifecycleEventsEnabled;
    if (!this._isMainFrame())
      this._addRendererListeners();
    this._addBrowserListeners();
    this._bufferedAttachedToTargetEvents = [];
    const promises = [
      this._client.send("Page.enable"),
      this._client.send("Page.getFrameTree").then(({ frameTree }) => {
        if (this._isMainFrame()) {
          this._handleFrameTree(frameTree);
          this._addRendererListeners();
        }
        const attachedToTargetEvents = this._bufferedAttachedToTargetEvents || [];
        this._bufferedAttachedToTargetEvents = void 0;
        for (const event of attachedToTargetEvents)
          this._onAttachedToTarget(event);
        const localFrames = this._isMainFrame() ? this._page.frames() : [this._page.frameManager.frame(this._targetId)];
        for (const frame of localFrames) {
          this._client._sendMayFail("Page.createIsolatedWorld", {
            frameId: frame._id,
            grantUniveralAccess: true,
            worldName: this._crPage.utilityWorldName
          });
        }
        const isInitialEmptyPage = this._isMainFrame() && this._page.mainFrame().url() === ":";
        if (isInitialEmptyPage) {
          lifecycleEventsEnabled.catch((e) => {
          }).then(() => {
            this._eventListeners.push(import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.lifecycleEvent", (event) => this._onLifecycleEvent(event)));
          });
        } else {
          this._firstNonInitialNavigationCommittedFulfill();
          this._eventListeners.push(import_eventsHelper.eventsHelper.addEventListener(this._client, "Page.lifecycleEvent", (event) => this._onLifecycleEvent(event)));
        }
      }),
      this._client.send("Log.enable", {}),
      lifecycleEventsEnabled = this._client.send("Page.setLifecycleEventsEnabled", { enabled: true }),
      this._client.send("Runtime.enable", {}),
      this._client.send("Page.addScriptToEvaluateOnNewDocument", {
        source: "",
        worldName: this._crPage.utilityWorldName
      }),
      this._crPage._networkManager.addSession(this._client, void 0, this._isMainFrame()),
      this._client.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true })
    ];
    if (!this._page.isStorageStatePage) {
      if (this._crPage._browserContext.needsPlaywrightBinding())
        promises.push(this.exposePlaywrightBinding());
      if (this._isMainFrame())
        promises.push(this._client.send("Emulation.setFocusEmulationEnabled", { enabled: true }));
      const options = this._crPage._browserContext._options;
      if (options.bypassCSP)
        promises.push(this._client.send("Page.setBypassCSP", { enabled: true }));
      if (options.ignoreHTTPSErrors || options.internalIgnoreHTTPSErrors)
        promises.push(this._client.send("Security.setIgnoreCertificateErrors", { ignore: true }));
      if (this._isMainFrame())
        promises.push(this._updateViewport());
      if (options.hasTouch)
        promises.push(this._client.send("Emulation.setTouchEmulationEnabled", { enabled: true }));
      if (options.javaScriptEnabled === false)
        promises.push(this._client.send("Emulation.setScriptExecutionDisabled", { value: true }));
      if (options.userAgent || options.locale)
        promises.push(this._updateUserAgent());
      if (options.locale)
        promises.push(emulateLocale(this._client, options.locale));
      if (options.timezoneId)
        promises.push(emulateTimezone(this._client, options.timezoneId));
      if (!this._crPage._browserContext._browser.options.headful)
        promises.push(this._setDefaultFontFamilies(this._client));
      promises.push(this._updateGeolocation(true));
      promises.push(this._updateEmulateMedia());
      promises.push(this._updateFileChooserInterception(true));
      for (const initScript of this._crPage._page.allInitScripts())
        promises.push(this._evaluateOnNewDocument(
          initScript,
          "main",
          true
          /* runImmediately */
        ));
      if (videoOptions)
        promises.push(this._crPage._page.screencast.startVideoRecording(videoOptions));
    }
    promises.push(this._client.send("Runtime.runIfWaitingForDebugger"));
    promises.push(this._firstNonInitialNavigationCommittedPromise);
    await Promise.all(promises);
  }
  dispose() {
    this._firstNonInitialNavigationCommittedReject(new import_errors.TargetClosedError(this._page.closeReason()));
    for (const childSession of this._childSessions)
      childSession.dispose();
    if (this._parentSession)
      this._parentSession._childSessions.delete(this);
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._crPage._networkManager.removeSession(this._client);
    this._crPage._sessions.delete(this._targetId);
    this._client.dispose();
  }
  async _navigate(frame, url, referrer) {
    const response = await this._client.send("Page.navigate", { url, referrer, frameId: frame._id, referrerPolicy: "unsafeUrl" });
    if (response.isDownload)
      throw new frames.NavigationAbortedError(response.loaderId, "Download is starting");
    if (response.errorText)
      throw new frames.NavigationAbortedError(response.loaderId, `${response.errorText} at ${url}`);
    return { newDocumentId: response.loaderId };
  }
  _onLifecycleEvent(event) {
    if (this._eventBelongsToStaleFrame(event.frameId))
      return;
    if (event.name === "load")
      this._page.frameManager.frameLifecycleEvent(event.frameId, "load");
    else if (event.name === "DOMContentLoaded")
      this._page.frameManager.frameLifecycleEvent(event.frameId, "domcontentloaded");
  }
  _handleFrameTree(frameTree) {
    this._onFrameAttached(frameTree.frame.id, frameTree.frame.parentId || null);
    this._onFrameNavigated(frameTree.frame, true);
    if (!frameTree.childFrames)
      return;
    for (const child of frameTree.childFrames)
      this._handleFrameTree(child);
  }
  _eventBelongsToStaleFrame(frameId) {
    const frame = this._page.frameManager.frame(frameId);
    if (!frame)
      return true;
    const session = this._crPage._sessionForFrame(frame);
    return session && session !== this && !session._swappedIn;
  }
  _onFrameAttached(frameId, parentFrameId) {
    const frameSession = this._crPage._sessions.get(frameId);
    if (frameSession && frameId !== this._targetId) {
      frameSession._swappedIn = true;
      const frame = this._page.frameManager.frame(frameId);
      if (frame)
        this._page.frameManager.removeChildFramesRecursively(frame);
      return;
    }
    if (parentFrameId && !this._page.frameManager.frame(parentFrameId)) {
      return;
    }
    this._page.frameManager.frameAttached(frameId, parentFrameId);
  }
  _onFrameNavigated(framePayload, initial) {
    if (this._eventBelongsToStaleFrame(framePayload.id))
      return;
    this._page.frameManager.frameCommittedNewDocumentNavigation(framePayload.id, framePayload.url + (framePayload.urlFragment || ""), framePayload.name || "", framePayload.loaderId, initial);
    if (!initial)
      this._firstNonInitialNavigationCommittedFulfill();
  }
  _onFrameRequestedNavigation(payload) {
    if (this._eventBelongsToStaleFrame(payload.frameId))
      return;
    if (payload.disposition === "currentTab")
      this._page.frameManager.frameRequestedNavigation(payload.frameId);
  }
  _onFrameNavigatedWithinDocument(frameId, url) {
    if (this._eventBelongsToStaleFrame(frameId))
      return;
    this._page.frameManager.frameCommittedSameDocumentNavigation(frameId, url);
  }
  _onFrameDetached(frameId, reason) {
    if (this._crPage._sessions.has(frameId)) {
      return;
    }
    if (reason === "swap") {
      const frame = this._page.frameManager.frame(frameId);
      if (frame)
        this._page.frameManager.removeChildFramesRecursively(frame);
      return;
    }
    this._page.frameManager.frameDetached(frameId);
  }
  _onExecutionContextCreated(contextPayload) {
    const frame = contextPayload.auxData ? this._page.frameManager.frame(contextPayload.auxData.frameId) : null;
    if (!frame || this._eventBelongsToStaleFrame(frame._id))
      return;
    const delegate = new import_crExecutionContext.CRExecutionContext(this._client, contextPayload);
    let worldName = null;
    if (contextPayload.auxData && !!contextPayload.auxData.isDefault)
      worldName = "main";
    else if (contextPayload.name === this._crPage.utilityWorldName)
      worldName = "utility";
    const context = new dom.FrameExecutionContext(delegate, frame, worldName);
    if (worldName)
      frame._contextCreated(worldName, context);
    this._contextIdToContext.set(contextPayload.id, context);
  }
  _onExecutionContextDestroyed(executionContextId) {
    const context = this._contextIdToContext.get(executionContextId);
    if (!context)
      return;
    this._contextIdToContext.delete(executionContextId);
    context.frame._contextDestroyed(context);
  }
  _onExecutionContextsCleared() {
    for (const contextId of Array.from(this._contextIdToContext.keys()))
      this._onExecutionContextDestroyed(contextId);
  }
  _onAttachedToTarget(event) {
    if (this._bufferedAttachedToTargetEvents) {
      this._bufferedAttachedToTargetEvents.push(event);
      return;
    }
    const session = this._client.createChildSession(event.sessionId);
    if (event.targetInfo.type === "iframe") {
      const targetId = event.targetInfo.targetId;
      let frame = this._page.frameManager.frame(targetId);
      if (!frame && event.targetInfo.parentFrameId) {
        frame = this._page.frameManager.frameAttached(targetId, event.targetInfo.parentFrameId);
      }
      if (!frame)
        return;
      this._page.frameManager.removeChildFramesRecursively(frame);
      for (const [contextId, context] of this._contextIdToContext) {
        if (context.frame === frame)
          this._onExecutionContextDestroyed(contextId);
      }
      const frameSession = new FrameSession(this._crPage, session, targetId, this);
      this._crPage._sessions.set(targetId, frameSession);
      frameSession._initialize(false).catch((e) => e);
      return;
    }
    if (event.targetInfo.type !== "worker") {
      session.detach().catch(() => {
      });
      return;
    }
    const url = event.targetInfo.url;
    const worker = new import_page.Worker(this._page, url);
    this._page.addWorker(event.sessionId, worker);
    this._workerSessions.set(event.sessionId, session);
    session.once("Runtime.executionContextCreated", async (event2) => {
      worker.createExecutionContext(new import_crExecutionContext.CRExecutionContext(session, event2.context));
    });
    if (this._crPage._browserContext._browser.majorVersion() >= 143)
      session.on("Inspector.workerScriptLoaded", () => worker.workerScriptLoaded());
    else
      worker.workerScriptLoaded();
    session._sendMayFail("Runtime.enable");
    this._crPage._networkManager.addSession(session, this._page.frameManager.frame(this._targetId) ?? void 0).catch(() => {
    });
    session._sendMayFail("Runtime.runIfWaitingForDebugger");
    session._sendMayFail("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    session.on("Target.attachedToTarget", (event2) => this._onAttachedToTarget(event2));
    session.on("Target.detachedFromTarget", (event2) => this._onDetachedFromTarget(event2));
    session.on("Runtime.consoleAPICalled", (event2) => {
      const args = event2.args.map((o) => (0, import_crExecutionContext.createHandle)(worker.existingExecutionContext, o));
      this._page.addConsoleMessage(worker, event2.type, args, (0, import_crProtocolHelper.toConsoleMessageLocation)(event2.stackTrace));
    });
    session.on("Runtime.exceptionThrown", (exception) => this._page.addPageError((0, import_crProtocolHelper.exceptionToError)(exception.exceptionDetails)));
  }
  _onDetachedFromTarget(event) {
    const workerSession = this._workerSessions.get(event.sessionId);
    if (workerSession) {
      workerSession.dispose();
      this._page.removeWorker(event.sessionId);
      return;
    }
    const childFrameSession = this._crPage._sessions.get(event.targetId);
    if (!childFrameSession)
      return;
    if (childFrameSession._swappedIn) {
      childFrameSession.dispose();
      return;
    }
    this._client.send("Page.enable").catch((e) => null).then(() => {
      if (!childFrameSession._swappedIn)
        this._page.frameManager.frameDetached(event.targetId);
      childFrameSession.dispose();
    });
  }
  _onWindowOpen(event) {
    this._crPage._nextWindowOpenPopupFeatures.push(event.windowFeatures);
  }
  async _onConsoleAPI(event) {
    if (event.executionContextId === 0) {
      return;
    }
    const context = this._contextIdToContext.get(event.executionContextId);
    if (!context)
      return;
    const values = event.args.map((arg) => (0, import_crExecutionContext.createHandle)(context, arg));
    this._page.addConsoleMessage(null, event.type, values, (0, import_crProtocolHelper.toConsoleMessageLocation)(event.stackTrace));
  }
  async _onBindingCalled(event) {
    const pageOrError = await this._crPage._page.waitForInitializedOrError();
    if (!(pageOrError instanceof Error)) {
      const context = this._contextIdToContext.get(event.executionContextId);
      if (context)
        await this._page.onBindingCalled(event.payload, context);
    }
  }
  _onDialog(event) {
    if (!this._page.frameManager.frame(this._targetId))
      return;
    this._page.browserContext.dialogManager.dialogDidOpen(new dialog.Dialog(
      this._page,
      event.type,
      event.message,
      async (accept, promptText) => {
        if (this._isMainFrame() && event.type === "beforeunload" && !accept)
          this._page.frameManager.frameAbortedNavigation(this._page.mainFrame()._id, "navigation cancelled by beforeunload dialog");
        await this._client.send("Page.handleJavaScriptDialog", { accept, promptText });
      },
      event.defaultPrompt
    ));
  }
  _handleException(exceptionDetails) {
    this._page.addPageError((0, import_crProtocolHelper.exceptionToError)(exceptionDetails));
  }
  async _onTargetCrashed() {
    this._client._markAsCrashed();
    this._page._didCrash();
  }
  _onLogEntryAdded(event) {
    const { level, text, args, source, url, lineNumber } = event.entry;
    if (args)
      args.map((arg) => (0, import_crProtocolHelper.releaseObject)(this._client, arg.objectId));
    if (source !== "worker") {
      const location = {
        url: url || "",
        lineNumber: lineNumber || 0,
        columnNumber: 0
      };
      this._page.addConsoleMessage(null, level, [], location, text);
    }
  }
  async _onFileChooserOpened(event) {
    if (!event.backendNodeId)
      return;
    const frame = this._page.frameManager.frame(event.frameId);
    if (!frame)
      return;
    let handle;
    try {
      const utilityContext = await frame._utilityContext();
      handle = await this._adoptBackendNodeId(event.backendNodeId, utilityContext);
    } catch (e) {
      return;
    }
    await this._page._onFileChooserOpened(handle);
  }
  _willBeginDownload() {
    if (!this._crPage._page.initializedOrUndefined()) {
      this._firstNonInitialNavigationCommittedReject(new Error("Starting new page download"));
    }
  }
  _onScreencastFrame(payload) {
    this._page.screencast.throttleFrameAck(() => {
      this._client._sendMayFail("Page.screencastFrameAck", { sessionId: payload.sessionId });
    });
    const buffer = Buffer.from(payload.data, "base64");
    this._page.emit(import_page.Page.Events.ScreencastFrame, {
      buffer,
      frameSwapWallTime: payload.metadata.timestamp ? payload.metadata.timestamp * 1e3 : Date.now(),
      width: payload.metadata.deviceWidth,
      height: payload.metadata.deviceHeight
    });
  }
  async _updateGeolocation(initial) {
    const geolocation = this._crPage._browserContext._options.geolocation;
    if (!initial || geolocation)
      await this._client.send("Emulation.setGeolocationOverride", geolocation || {});
  }
  async _updateViewport(preserveWindowBoundaries) {
    if (this._crPage._browserContext._browser.isClank())
      return;
    (0, import_assert.assert)(this._isMainFrame());
    const options = this._crPage._browserContext._options;
    const emulatedSize = this._page.emulatedSize();
    if (!emulatedSize)
      return;
    const viewportSize = emulatedSize.viewport;
    const screenSize = emulatedSize.screen;
    const isLandscape = screenSize.width > screenSize.height;
    const metricsOverride = {
      mobile: !!options.isMobile,
      width: viewportSize.width,
      height: viewportSize.height,
      screenWidth: screenSize.width,
      screenHeight: screenSize.height,
      deviceScaleFactor: options.deviceScaleFactor || 1,
      screenOrientation: !!options.isMobile ? isLandscape ? { angle: 90, type: "landscapePrimary" } : { angle: 0, type: "portraitPrimary" } : { angle: 0, type: "landscapePrimary" },
      dontSetVisibleSize: preserveWindowBoundaries
    };
    if (JSON.stringify(this._metricsOverride) === JSON.stringify(metricsOverride))
      return;
    const promises = [];
    if (!preserveWindowBoundaries && this._windowId) {
      let insets = { width: 0, height: 0 };
      if (this._crPage._browserContext._browser.options.headful) {
        insets = { width: 24, height: 88 };
        if (process.platform === "win32")
          insets = { width: 16, height: 88 };
        else if (process.platform === "linux")
          insets = { width: 8, height: 85 };
        else if (process.platform === "darwin")
          insets = { width: 2, height: 80 };
        if (this._crPage._browserContext.isPersistentContext()) {
          insets.height += 46;
        }
      }
      promises.push(this.setWindowBounds({
        width: viewportSize.width + insets.width,
        height: viewportSize.height + insets.height
      }));
    }
    promises.push(this._client.send("Emulation.setDeviceMetricsOverride", metricsOverride));
    await Promise.all(promises);
    this._metricsOverride = metricsOverride;
  }
  async windowBounds() {
    const { bounds } = await this._client.send("Browser.getWindowBounds", {
      windowId: this._windowId
    });
    return bounds;
  }
  async setWindowBounds(bounds) {
    return await this._client.send("Browser.setWindowBounds", {
      windowId: this._windowId,
      bounds
    });
  }
  async _updateEmulateMedia() {
    const emulatedMedia = this._page.emulatedMedia();
    const media = emulatedMedia.media === "no-override" ? "" : emulatedMedia.media;
    const colorScheme = emulatedMedia.colorScheme === "no-override" ? "" : emulatedMedia.colorScheme;
    const reducedMotion = emulatedMedia.reducedMotion === "no-override" ? "" : emulatedMedia.reducedMotion;
    const forcedColors = emulatedMedia.forcedColors === "no-override" ? "" : emulatedMedia.forcedColors;
    const contrast = emulatedMedia.contrast === "no-override" ? "" : emulatedMedia.contrast;
    const features = [
      { name: "prefers-color-scheme", value: colorScheme },
      { name: "prefers-reduced-motion", value: reducedMotion },
      { name: "forced-colors", value: forcedColors },
      { name: "prefers-contrast", value: contrast }
    ];
    await this._client.send("Emulation.setEmulatedMedia", { media, features });
  }
  async _updateUserAgent() {
    const options = this._crPage._browserContext._options;
    await this._client.send("Emulation.setUserAgentOverride", {
      userAgent: options.userAgent || "",
      acceptLanguage: options.locale,
      userAgentMetadata: calculateUserAgentMetadata(options)
    });
  }
  async _setDefaultFontFamilies(session) {
    const fontFamilies = import_defaultFontFamilies.platformToFontFamilies[this._crPage._browserContext._browser._platform()];
    await session.send("Page.setFontFamilies", fontFamilies);
  }
  async _updateFileChooserInterception(initial) {
    const enabled = this._page.fileChooserIntercepted();
    if (initial && !enabled)
      return;
    await this._client.send("Page.setInterceptFileChooserDialog", { enabled }).catch(() => {
    });
  }
  async _evaluateOnNewDocument(initScript, world, runImmediately) {
    const worldName = world === "utility" ? this._crPage.utilityWorldName : void 0;
    const { identifier } = await this._client.send("Page.addScriptToEvaluateOnNewDocument", { source: initScript.source, worldName, runImmediately });
    this._initScriptIds.set(initScript, identifier);
  }
  async _removeEvaluatesOnNewDocument(initScripts) {
    const ids = [];
    for (const script of initScripts) {
      const id = this._initScriptIds.get(script);
      if (id)
        ids.push(id);
      this._initScriptIds.delete(script);
    }
    await Promise.all(ids.map((identifier) => this._client.send("Page.removeScriptToEvaluateOnNewDocument", { identifier }).catch(() => {
    })));
  }
  async exposePlaywrightBinding() {
    await this._client.send("Runtime.addBinding", { name: import_page.PageBinding.kBindingName });
  }
  async _getContentFrame(handle) {
    const nodeInfo = await this._client.send("DOM.describeNode", {
      objectId: handle._objectId
    });
    if (!nodeInfo || typeof nodeInfo.node.frameId !== "string")
      return null;
    return this._page.frameManager.frame(nodeInfo.node.frameId);
  }
  async _getOwnerFrame(handle) {
    const documentElement = await handle.evaluateHandle((node) => {
      const doc = node;
      if (doc.documentElement && doc.documentElement.ownerDocument === doc)
        return doc.documentElement;
      return node.ownerDocument ? node.ownerDocument.documentElement : null;
    });
    if (!documentElement)
      return null;
    if (!documentElement._objectId)
      return null;
    const nodeInfo = await this._client.send("DOM.describeNode", {
      objectId: documentElement._objectId
    });
    const frameId = nodeInfo && typeof nodeInfo.node.frameId === "string" ? nodeInfo.node.frameId : null;
    documentElement.dispose();
    return frameId;
  }
  async _getBoundingBox(handle) {
    const result = await this._client._sendMayFail("DOM.getBoxModel", {
      objectId: handle._objectId
    });
    if (!result)
      return null;
    const quad = result.model.border;
    const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
    const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
    const width = Math.max(quad[0], quad[2], quad[4], quad[6]) - x;
    const height = Math.max(quad[1], quad[3], quad[5], quad[7]) - y;
    const position = await this._framePosition();
    if (!position)
      return null;
    return { x: x + position.x, y: y + position.y, width, height };
  }
  async _framePosition() {
    const frame = this._page.frameManager.frame(this._targetId);
    if (!frame)
      return null;
    if (frame === this._page.mainFrame())
      return { x: 0, y: 0 };
    const element = await frame.frameElement();
    const box = await element.boundingBox();
    return box;
  }
  async _scrollRectIntoViewIfNeeded(handle, rect) {
    return await this._client.send("DOM.scrollIntoViewIfNeeded", {
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
  async _getContentQuads(handle) {
    const result = await this._client._sendMayFail("DOM.getContentQuads", {
      objectId: handle._objectId
    });
    if (!result)
      return null;
    const position = await this._framePosition();
    if (!position)
      return null;
    return result.quads.map((quad) => [
      { x: quad[0] + position.x, y: quad[1] + position.y },
      { x: quad[2] + position.x, y: quad[3] + position.y },
      { x: quad[4] + position.x, y: quad[5] + position.y },
      { x: quad[6] + position.x, y: quad[7] + position.y }
    ]);
  }
  async _adoptElementHandle(handle, to) {
    const nodeInfo = await this._client.send("DOM.describeNode", {
      objectId: handle._objectId
    });
    return this._adoptBackendNodeId(nodeInfo.node.backendNodeId, to);
  }
  async _adoptBackendNodeId(backendNodeId, to) {
    const result = await this._client._sendMayFail("DOM.resolveNode", {
      backendNodeId,
      executionContextId: to.delegate._contextId
    });
    if (!result || result.object.subtype === "null")
      throw new Error(dom.kUnableToAdoptErrorMessage);
    return (0, import_crExecutionContext.createHandle)(to, result.object).asElement();
  }
}
async function emulateLocale(session, locale) {
  try {
    await session.send("Emulation.setLocaleOverride", { locale });
  } catch (exception) {
    if (exception.message.includes("Another locale override is already in effect"))
      return;
    throw exception;
  }
}
async function emulateTimezone(session, timezoneId) {
  try {
    await session.send("Emulation.setTimezoneOverride", { timezoneId });
  } catch (exception) {
    if (exception.message.includes("Timezone override is already in effect"))
      return;
    if (exception.message.includes("Invalid timezone"))
      throw new Error(`Invalid timezone ID: ${timezoneId}`);
    throw exception;
  }
}
function calculateUserAgentMetadata(options) {
  const ua = options.userAgent;
  if (!ua)
    return void 0;
  const metadata = {
    mobile: !!options.isMobile,
    model: "",
    architecture: "x86",
    platform: "Windows",
    platformVersion: ""
  };
  const androidMatch = ua.match(/Android (\d+(\.\d+)?(\.\d+)?)/);
  const iPhoneMatch = ua.match(/iPhone OS (\d+(_\d+)?)/);
  const iPadMatch = ua.match(/iPad; CPU OS (\d+(_\d+)?)/);
  const macOSMatch = ua.match(/Mac OS X (\d+(_\d+)?(_\d+)?)/);
  const windowsMatch = ua.match(/Windows\D+(\d+(\.\d+)?(\.\d+)?)/);
  if (androidMatch) {
    metadata.platform = "Android";
    metadata.platformVersion = androidMatch[1];
    metadata.architecture = "arm";
  } else if (iPhoneMatch) {
    metadata.platform = "iOS";
    metadata.platformVersion = iPhoneMatch[1];
    metadata.architecture = "arm";
  } else if (iPadMatch) {
    metadata.platform = "iOS";
    metadata.platformVersion = iPadMatch[1];
    metadata.architecture = "arm";
  } else if (macOSMatch) {
    metadata.platform = "macOS";
    metadata.platformVersion = macOSMatch[1];
    if (!ua.includes("Intel"))
      metadata.architecture = "arm";
  } else if (windowsMatch) {
    metadata.platform = "Windows";
    metadata.platformVersion = windowsMatch[1];
  } else if (ua.toLowerCase().includes("linux")) {
    metadata.platform = "Linux";
  }
  if (ua.includes("ARM"))
    metadata.architecture = "arm";
  return metadata;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRPage
});
