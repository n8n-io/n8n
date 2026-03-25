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
var ffPage_exports = {};
__export(ffPage_exports, {
  FFPage: () => FFPage,
  UTILITY_WORLD_NAME: () => UTILITY_WORLD_NAME
});
module.exports = __toCommonJS(ffPage_exports);
var import_eventsHelper = require("../utils/eventsHelper");
var dialog = __toESM(require("../dialog"));
var dom = __toESM(require("../dom"));
var import_page = require("../page");
var import_page2 = require("../page");
var import_ffConnection = require("./ffConnection");
var import_ffExecutionContext = require("./ffExecutionContext");
var import_ffInput = require("./ffInput");
var import_ffNetworkManager = require("./ffNetworkManager");
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var import_errors = require("../errors");
var import_debugLogger = require("../utils/debugLogger");
const UTILITY_WORLD_NAME = "__playwright_utility_world__";
class FFPage {
  constructor(session, browserContext, opener) {
    this.cspErrorsAsynchronousForInlineScripts = true;
    this._reportedAsNew = false;
    this._workers = /* @__PURE__ */ new Map();
    this._initScripts = [];
    this._session = session;
    this._opener = opener;
    this.rawKeyboard = new import_ffInput.RawKeyboardImpl(session);
    this.rawMouse = new import_ffInput.RawMouseImpl(session);
    this.rawTouchscreen = new import_ffInput.RawTouchscreenImpl(session);
    this._contextIdToContext = /* @__PURE__ */ new Map();
    this._browserContext = browserContext;
    this._page = new import_page2.Page(this, browserContext);
    this.rawMouse.setPage(this._page);
    this._networkManager = new import_ffNetworkManager.FFNetworkManager(session, this._page);
    this._page.on(import_page2.Page.Events.FrameDetached, (frame) => this._removeContextsForFrame(frame));
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.eventFired", this._onEventFired.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.frameAttached", this._onFrameAttached.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.frameDetached", this._onFrameDetached.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.navigationAborted", this._onNavigationAborted.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.navigationCommitted", this._onNavigationCommitted.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.navigationStarted", this._onNavigationStarted.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.sameDocumentNavigation", this._onSameDocumentNavigation.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.executionContextCreated", this._onExecutionContextCreated.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.executionContextDestroyed", this._onExecutionContextDestroyed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.executionContextsCleared", this._onExecutionContextsCleared.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.linkClicked", (event) => this._onLinkClicked(event.phase)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.uncaughtError", this._onUncaughtError.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Runtime.console", this._onConsole.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.dialogOpened", this._onDialogOpened.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.bindingCalled", this._onBindingCalled.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.fileChooserOpened", this._onFileChooserOpened.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.workerCreated", this._onWorkerCreated.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.workerDestroyed", this._onWorkerDestroyed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.dispatchMessageFromWorker", this._onDispatchMessageFromWorker.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.crashed", this._onCrashed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.webSocketCreated", this._onWebSocketCreated.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.webSocketClosed", this._onWebSocketClosed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.webSocketFrameReceived", this._onWebSocketFrameReceived.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.webSocketFrameSent", this._onWebSocketFrameSent.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._session, "Page.screencastFrame", this._onScreencastFrame.bind(this))
    ];
    const screencast = this._page.screencast;
    const videoOptions = screencast.launchVideoRecorder();
    if (videoOptions)
      screencast.startVideoRecording(videoOptions).catch((e) => import_debugLogger.debugLogger.log("error", e));
    this._session.once("Page.ready", () => {
      if (this._reportedAsNew)
        return;
      this._reportedAsNew = true;
      this._page.reportAsNew(this._opener?._page);
    });
    this.addInitScript(new import_page.InitScript(""), UTILITY_WORLD_NAME).catch((e) => this._markAsError(e));
  }
  async _markAsError(error) {
    if (this._reportedAsNew)
      return;
    this._reportedAsNew = true;
    this._page.reportAsNew(this._opener?._page, error);
  }
  _onWebSocketCreated(event) {
    this._page.frameManager.onWebSocketCreated(webSocketId(event.frameId, event.wsid), event.requestURL);
    this._page.frameManager.onWebSocketRequest(webSocketId(event.frameId, event.wsid));
  }
  _onWebSocketClosed(event) {
    if (event.error)
      this._page.frameManager.webSocketError(webSocketId(event.frameId, event.wsid), event.error);
    this._page.frameManager.webSocketClosed(webSocketId(event.frameId, event.wsid));
  }
  _onWebSocketFrameReceived(event) {
    this._page.frameManager.webSocketFrameReceived(webSocketId(event.frameId, event.wsid), event.opcode, event.data);
  }
  _onWebSocketFrameSent(event) {
    this._page.frameManager.onWebSocketFrameSent(webSocketId(event.frameId, event.wsid), event.opcode, event.data);
  }
  _onExecutionContextCreated(payload) {
    const { executionContextId, auxData } = payload;
    const frame = this._page.frameManager.frame(auxData.frameId);
    if (!frame)
      return;
    const delegate = new import_ffExecutionContext.FFExecutionContext(this._session, executionContextId);
    let worldName = null;
    if (auxData.name === UTILITY_WORLD_NAME)
      worldName = "utility";
    else if (!auxData.name)
      worldName = "main";
    const context = new dom.FrameExecutionContext(delegate, frame, worldName);
    if (worldName)
      frame._contextCreated(worldName, context);
    this._contextIdToContext.set(executionContextId, context);
  }
  _onExecutionContextDestroyed(payload) {
    const { executionContextId } = payload;
    const context = this._contextIdToContext.get(executionContextId);
    if (!context)
      return;
    this._contextIdToContext.delete(executionContextId);
    context.frame._contextDestroyed(context);
  }
  _onExecutionContextsCleared() {
    for (const executionContextId of Array.from(this._contextIdToContext.keys()))
      this._onExecutionContextDestroyed({ executionContextId });
  }
  _removeContextsForFrame(frame) {
    for (const [contextId, context] of this._contextIdToContext) {
      if (context.frame === frame)
        this._contextIdToContext.delete(contextId);
    }
  }
  _onLinkClicked(phase) {
    if (phase === "before")
      this._page.frameManager.frameWillPotentiallyRequestNavigation();
    else
      this._page.frameManager.frameDidPotentiallyRequestNavigation();
  }
  _onNavigationStarted(params) {
    this._page.frameManager.frameRequestedNavigation(params.frameId, params.navigationId);
  }
  _onNavigationAborted(params) {
    this._page.frameManager.frameAbortedNavigation(params.frameId, params.errorText, params.navigationId);
  }
  _onNavigationCommitted(params) {
    for (const [workerId, worker] of this._workers) {
      if (worker.frameId === params.frameId)
        this._onWorkerDestroyed({ workerId });
    }
    this._page.frameManager.frameCommittedNewDocumentNavigation(params.frameId, params.url, params.name || "", params.navigationId || "", false);
  }
  _onSameDocumentNavigation(params) {
    this._page.frameManager.frameCommittedSameDocumentNavigation(params.frameId, params.url);
  }
  _onFrameAttached(params) {
    this._page.frameManager.frameAttached(params.frameId, params.parentFrameId);
  }
  _onFrameDetached(params) {
    this._page.frameManager.frameDetached(params.frameId);
  }
  _onEventFired(payload) {
    const { frameId, name } = payload;
    if (name === "load")
      this._page.frameManager.frameLifecycleEvent(frameId, "load");
    if (name === "DOMContentLoaded")
      this._page.frameManager.frameLifecycleEvent(frameId, "domcontentloaded");
  }
  _onUncaughtError(params) {
    const { name, message } = (0, import_stackTrace.splitErrorMessage)(params.message);
    const error = new Error(message);
    error.stack = params.message + "\n" + params.stack.split("\n").filter(Boolean).map((a) => a.replace(/([^@]*)@(.*)/, "    at $1 ($2)")).join("\n");
    error.name = name;
    this._page.addPageError(error);
  }
  _onConsole(payload) {
    const { type, args, executionContextId, location } = payload;
    const context = this._contextIdToContext.get(executionContextId);
    if (!context)
      return;
    this._page.addConsoleMessage(null, type === "warn" ? "warning" : type, args.map((arg) => (0, import_ffExecutionContext.createHandle)(context, arg)), location);
  }
  _onDialogOpened(params) {
    this._page.browserContext.dialogManager.dialogDidOpen(new dialog.Dialog(
      this._page,
      params.type,
      params.message,
      async (accept, promptText) => {
        await this._session.sendMayFail("Page.handleDialog", { dialogId: params.dialogId, accept, promptText });
      },
      params.defaultValue
    ));
  }
  async _onBindingCalled(event) {
    const pageOrError = await this._page.waitForInitializedOrError();
    if (!(pageOrError instanceof Error)) {
      const context = this._contextIdToContext.get(event.executionContextId);
      if (context)
        await this._page.onBindingCalled(event.payload, context);
    }
  }
  async _onFileChooserOpened(payload) {
    const { executionContextId, element } = payload;
    const context = this._contextIdToContext.get(executionContextId);
    if (!context)
      return;
    const handle = (0, import_ffExecutionContext.createHandle)(context, element).asElement();
    await this._page._onFileChooserOpened(handle);
  }
  async _onWorkerCreated(event) {
    const workerId = event.workerId;
    const worker = new import_page2.Worker(this._page, event.url);
    const workerSession = new import_ffConnection.FFSession(this._session._connection, workerId, (message) => {
      this._session.send("Page.sendMessageToWorker", {
        frameId: event.frameId,
        workerId,
        message: JSON.stringify(message)
      }).catch((e) => {
        workerSession.dispatchMessage({ id: message.id, method: "", params: {}, error: { message: e.message, data: void 0 } });
      });
    });
    this._workers.set(workerId, { session: workerSession, frameId: event.frameId });
    this._page.addWorker(workerId, worker);
    workerSession.once("Runtime.executionContextCreated", (event2) => {
      worker.createExecutionContext(new import_ffExecutionContext.FFExecutionContext(workerSession, event2.executionContextId));
      worker.workerScriptLoaded();
    });
    workerSession.on("Runtime.console", (event2) => {
      const { type, args, location } = event2;
      const context = worker.existingExecutionContext;
      this._page.addConsoleMessage(worker, type, args.map((arg) => (0, import_ffExecutionContext.createHandle)(context, arg)), location);
    });
  }
  _onWorkerDestroyed(event) {
    const workerId = event.workerId;
    const worker = this._workers.get(workerId);
    if (!worker)
      return;
    worker.session.dispose();
    this._workers.delete(workerId);
    this._page.removeWorker(workerId);
  }
  async _onDispatchMessageFromWorker(event) {
    const worker = this._workers.get(event.workerId);
    if (!worker)
      return;
    worker.session.dispatchMessage(JSON.parse(event.message));
  }
  async _onCrashed(event) {
    this._session.markAsCrashed();
    this._page._didCrash();
  }
  didClose() {
    this._markAsError(new import_errors.TargetClosedError(this._page.closeReason()));
    this._session.dispose();
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._networkManager.dispose();
    this._page._didClose();
  }
  async navigateFrame(frame, url, referer) {
    const response = await this._session.send("Page.navigate", { url, referer, frameId: frame._id });
    return { newDocumentId: response.navigationId || void 0 };
  }
  async updateExtraHTTPHeaders() {
    await this._session.send("Network.setExtraHTTPHeaders", { headers: this._page.extraHTTPHeaders() || [] });
  }
  async updateEmulatedViewportSize() {
    const viewportSize = this._page.emulatedSize()?.viewport ?? null;
    await this._session.send("Page.setViewportSize", { viewportSize });
  }
  async bringToFront() {
    await this._session.send("Page.bringToFront", {});
  }
  async updateEmulateMedia() {
    const emulatedMedia = this._page.emulatedMedia();
    const colorScheme = emulatedMedia.colorScheme === "no-override" ? void 0 : emulatedMedia.colorScheme;
    const reducedMotion = emulatedMedia.reducedMotion === "no-override" ? void 0 : emulatedMedia.reducedMotion;
    const forcedColors = emulatedMedia.forcedColors === "no-override" ? void 0 : emulatedMedia.forcedColors;
    const contrast = emulatedMedia.contrast === "no-override" ? void 0 : emulatedMedia.contrast;
    await this._session.send("Page.setEmulatedMedia", {
      // Empty string means reset.
      type: emulatedMedia.media === "no-override" ? "" : emulatedMedia.media,
      colorScheme,
      reducedMotion,
      forcedColors,
      contrast
    });
  }
  async updateRequestInterception() {
    await this._networkManager.setRequestInterception(this._page.needsRequestInterception());
  }
  async updateFileChooserInterception() {
    const enabled = this._page.fileChooserIntercepted();
    await this._session.send("Page.setInterceptFileChooserDialog", { enabled }).catch(() => {
    });
  }
  async reload() {
    await this._session.send("Page.reload");
  }
  async goBack() {
    const { success } = await this._session.send("Page.goBack", { frameId: this._page.mainFrame()._id });
    return success;
  }
  async goForward() {
    const { success } = await this._session.send("Page.goForward", { frameId: this._page.mainFrame()._id });
    return success;
  }
  async requestGC() {
    await this._session.send("Heap.collectGarbage");
  }
  async addInitScript(initScript, worldName) {
    this._initScripts.push({ initScript, worldName });
    await this._updateInitScripts();
  }
  async removeInitScripts(initScripts) {
    const set = new Set(initScripts);
    this._initScripts = this._initScripts.filter((s) => !set.has(s.initScript));
    await this._updateInitScripts();
  }
  async _updateInitScripts() {
    await this._session.send("Page.setInitScripts", { scripts: this._initScripts.map((s) => ({ script: s.initScript.source, worldName: s.worldName })) });
  }
  async closePage(runBeforeUnload) {
    await this._session.send("Page.close", { runBeforeUnload });
  }
  async setBackgroundColor(color) {
    if (color)
      throw new Error("Not implemented");
  }
  async takeScreenshot(progress, format, documentRect, viewportRect, quality, fitsViewport, scale) {
    if (!documentRect) {
      const scrollOffset = await this._page.mainFrame().waitForFunctionValueInUtility(progress, () => ({ x: window.scrollX, y: window.scrollY }));
      documentRect = {
        x: viewportRect.x + scrollOffset.x,
        y: viewportRect.y + scrollOffset.y,
        width: viewportRect.width,
        height: viewportRect.height
      };
    }
    const { data } = await progress.race(this._session.send("Page.screenshot", {
      mimeType: "image/" + format,
      clip: documentRect,
      quality,
      omitDeviceScaleFactor: scale === "css"
    }));
    return Buffer.from(data, "base64");
  }
  async getContentFrame(handle) {
    const { contentFrameId } = await this._session.send("Page.describeNode", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId
    });
    if (!contentFrameId)
      return null;
    return this._page.frameManager.frame(contentFrameId);
  }
  async getOwnerFrame(handle) {
    const { ownerFrameId } = await this._session.send("Page.describeNode", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId
    });
    return ownerFrameId || null;
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
    return await this._session.send("Page.scrollIntoViewIfNeeded", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId,
      rect
    }).then(() => "done").catch((e) => {
      if (e instanceof Error && e.message.includes("Node is detached from document"))
        return "error:notconnected";
      if (e instanceof Error && e.message.includes("Node does not have a layout object"))
        return "error:notvisible";
      throw e;
    });
  }
  async startScreencast(options) {
    await this._session.send("Page.startScreencast", options);
  }
  async stopScreencast() {
    await this._session.sendMayFail("Page.stopScreencast");
  }
  _onScreencastFrame(event) {
    this._page.screencast.throttleFrameAck(() => {
      this._session.sendMayFail("Page.screencastFrameAck");
    });
    const buffer = Buffer.from(event.data, "base64");
    this._page.emit(import_page2.Page.Events.ScreencastFrame, {
      buffer,
      frameSwapWallTime: event.timestamp * 1e3,
      // timestamp is in seconds, we need to convert to milliseconds.
      width: event.deviceWidth,
      height: event.deviceHeight
    });
  }
  rafCountForStablePosition() {
    return 1;
  }
  async getContentQuads(handle) {
    const result = await this._session.sendMayFail("Page.getContentQuads", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId
    });
    if (!result)
      return null;
    return result.quads.map((quad) => [quad.p1, quad.p2, quad.p3, quad.p4]);
  }
  async setInputFilePaths(handle, files) {
    await this._session.send("Page.setFileInputFiles", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId,
      files
    });
  }
  async adoptElementHandle(handle, to) {
    const result = await this._session.send("Page.adoptNode", {
      frameId: handle._context.frame._id,
      objectId: handle._objectId,
      executionContextId: to.delegate._executionContextId
    });
    if (!result.remoteObject)
      throw new Error(dom.kUnableToAdoptErrorMessage);
    return (0, import_ffExecutionContext.createHandle)(to, result.remoteObject);
  }
  async inputActionEpilogue() {
  }
  async resetForReuse(progress) {
    await this.rawMouse.move(progress, -1, -1, "none", /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), false);
  }
  async getFrameElement(frame) {
    const parent = frame.parentFrame();
    if (!parent)
      throw new Error("Frame has been detached.");
    const context = await parent._mainContext();
    const result = await this._session.send("Page.adoptNode", {
      frameId: frame._id,
      executionContextId: context.delegate._executionContextId
    });
    if (!result.remoteObject)
      throw new Error("Frame has been detached.");
    return (0, import_ffExecutionContext.createHandle)(context, result.remoteObject);
  }
  shouldToggleStyleSheetToSyncAnimations() {
    return false;
  }
}
function webSocketId(frameId, wsid) {
  return `${frameId}---${wsid}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FFPage,
  UTILITY_WORLD_NAME
});
