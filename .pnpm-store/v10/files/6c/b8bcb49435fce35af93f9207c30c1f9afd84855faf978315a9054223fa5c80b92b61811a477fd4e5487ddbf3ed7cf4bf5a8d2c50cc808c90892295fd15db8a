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
var recorder_exports = {};
__export(recorder_exports, {
  Recorder: () => Recorder,
  RecorderEvent: () => RecorderEvent
});
module.exports = __toCommonJS(recorder_exports);
var import_events = __toESM(require("events"));
var import_fs = __toESM(require("fs"));
var import_utils = require("../utils");
var import_browserContext = require("./browserContext");
var import_debugger = require("./debugger");
var import_recorderUtils = require("./recorder/recorderUtils");
var import_locatorParser = require("../utils/isomorphic/locatorParser");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
var import_progress = require("./progress");
var import_recorderSignalProcessor = require("./recorder/recorderSignalProcessor");
var rawRecorderSource = __toESM(require("./../generated/pollingRecorderSource"));
var import_utils2 = require("./../utils");
var import_frames = require("./frames");
var import_page = require("./page");
var import_recorderRunner = require("./recorder/recorderRunner");
const recorderSymbol = Symbol("recorderSymbol");
const RecorderEvent = {
  PausedStateChanged: "pausedStateChanged",
  ModeChanged: "modeChanged",
  ElementPicked: "elementPicked",
  CallLogsUpdated: "callLogsUpdated",
  UserSourcesChanged: "userSourcesChanged",
  ActionAdded: "actionAdded",
  SignalAdded: "signalAdded",
  PageNavigated: "pageNavigated",
  ContextClosed: "contextClosed"
};
class Recorder extends import_events.default {
  constructor(context, params) {
    super();
    this._highlightedElement = {};
    this._overlayState = { offsetX: 0 };
    this._currentCallsMetadata = /* @__PURE__ */ new Map();
    this._userSources = /* @__PURE__ */ new Map();
    this._omitCallTracking = false;
    this._currentLanguage = "javascript";
    this._pageAliases = /* @__PURE__ */ new Map();
    this._lastPopupOrdinal = 0;
    this._lastDialogOrdinal = -1;
    this._lastDownloadOrdinal = -1;
    this._listeners = [];
    this._enabled = false;
    this._callLogs = [];
    this._context = context;
    this._params = params;
    this._mode = params.mode || "none";
    this._recorderMode = params.recorderMode ?? "default";
    this.handleSIGINT = params.handleSIGINT;
    this._signalProcessor = new import_recorderSignalProcessor.RecorderSignalProcessor({
      addAction: (actionInContext) => {
        if (this._enabled)
          this.emit(RecorderEvent.ActionAdded, actionInContext);
      },
      addSignal: (signal) => {
        if (this._enabled)
          this.emit(RecorderEvent.SignalAdded, signal);
      }
    });
    context.on(import_browserContext.BrowserContext.Events.BeforeClose, () => {
      this.emit(RecorderEvent.ContextClosed);
    });
    this._listeners.push(import_utils2.eventsHelper.addEventListener(process, "exit", () => {
      this.emit(RecorderEvent.ContextClosed);
    }));
    this._setEnabled(params.mode === "recording");
    this._omitCallTracking = !!params.omitCallTracking;
    this._debugger = context.debugger();
    context.instrumentation.addListener(this, context);
    if ((0, import_utils.isUnderTest)()) {
      this._overlayState.offsetX = 200;
    }
  }
  static forContext(context, params) {
    let recorderPromise = context[recorderSymbol];
    if (!recorderPromise) {
      recorderPromise = Recorder._create(context, params);
      context[recorderSymbol] = recorderPromise;
    }
    return recorderPromise;
  }
  static async existingForContext(context) {
    const recorderPromise = context[recorderSymbol];
    return await recorderPromise;
  }
  static async _create(context, params = {}) {
    const recorder = new Recorder(context, params);
    await recorder._install();
    return recorder;
  }
  async _install() {
    this.emit(RecorderEvent.ModeChanged, this._mode);
    this.emit(RecorderEvent.PausedStateChanged, this._debugger.isPaused());
    this._context.once(import_browserContext.BrowserContext.Events.Close, () => {
      import_utils2.eventsHelper.removeEventListeners(this._listeners);
      this._context.instrumentation.removeListener(this);
      this.emit(RecorderEvent.ContextClosed);
    });
    const controller = new import_progress.ProgressController();
    await controller.run(async (progress) => {
      await this._context.exposeBinding(progress, "__pw_recorderState", false, async (source) => {
        let actionSelector;
        let actionPoint;
        const hasActiveScreenshotCommand = [...this._currentCallsMetadata.keys()].some(isScreenshotCommand);
        if (!hasActiveScreenshotCommand) {
          actionSelector = await this._scopeHighlightedSelectorToFrame(source.frame);
          for (const [metadata, sdkObject] of this._currentCallsMetadata) {
            if (source.page === sdkObject.attribution.page) {
              actionPoint = metadata.point || actionPoint;
              actionSelector = actionSelector || metadata.params.selector;
            }
          }
        }
        const uiState = {
          mode: this._mode,
          actionPoint,
          actionSelector,
          ariaTemplate: this._highlightedElement.ariaTemplate,
          language: this._currentLanguage,
          testIdAttributeName: this._testIdAttributeName(),
          overlay: this._overlayState
        };
        return uiState;
      });
      await this._context.exposeBinding(progress, "__pw_recorderElementPicked", false, async ({ frame }, elementInfo) => {
        const selectorChain = await (0, import_recorderUtils.generateFrameSelector)(frame);
        this.emit(RecorderEvent.ElementPicked, { selector: (0, import_recorderUtils.buildFullSelector)(selectorChain, elementInfo.selector), ariaSnapshot: elementInfo.ariaSnapshot }, true);
      });
      await this._context.exposeBinding(progress, "__pw_recorderSetMode", false, async ({ frame }, mode) => {
        if (frame.parentFrame())
          return;
        this.setMode(mode);
      });
      await this._context.exposeBinding(progress, "__pw_recorderSetOverlayState", false, async ({ frame }, state) => {
        if (frame.parentFrame())
          return;
        this._overlayState = state;
      });
      await this._context.exposeBinding(progress, "__pw_resume", false, () => {
        this._debugger.resume(false);
      });
      this._context.on(import_browserContext.BrowserContext.Events.Page, (page) => this._onPage(page));
      for (const page of this._context.pages())
        this._onPage(page);
      this._context.dialogManager.addDialogHandler((dialog) => {
        this._onDialog(dialog.page());
        return false;
      });
      await this._context.exposeBinding(
        progress,
        "__pw_recorderPerformAction",
        false,
        (source, action) => this._performAction(source.frame, action)
      );
      await this._context.exposeBinding(
        progress,
        "__pw_recorderRecordAction",
        false,
        (source, action) => this._recordAction(source.frame, action)
      );
      await this._context.extendInjectedScript(rawRecorderSource.source, { recorderMode: this._recorderMode });
    });
    if (this._debugger.isPaused())
      this._pausedStateChanged();
    this._debugger.on(import_debugger.Debugger.Events.PausedStateChanged, () => this._pausedStateChanged());
  }
  _pausedStateChanged() {
    for (const { metadata, sdkObject } of this._debugger.pausedDetails()) {
      if (!this._currentCallsMetadata.has(metadata))
        this.onBeforeCall(sdkObject, metadata);
    }
    this.emit(RecorderEvent.PausedStateChanged, this._debugger.isPaused());
    this._updateUserSources();
    this.updateCallLog([...this._currentCallsMetadata.keys()]);
  }
  mode() {
    return this._mode;
  }
  setMode(mode) {
    if (this._mode === mode)
      return;
    this._highlightedElement = {};
    this._mode = mode;
    this.emit(RecorderEvent.ModeChanged, this._mode);
    this._setEnabled(this._isRecording());
    this._debugger.setMuted(this._isRecording());
    if (this._mode !== "none" && this._mode !== "standby" && this._context.pages().length === 1)
      this._context.pages()[0].bringToFront().catch(() => {
      });
    this._refreshOverlay();
  }
  url() {
    const page = this._context.pages()[0];
    return page?.mainFrame().url();
  }
  setHighlightedSelector(selector) {
    this._highlightedElement = { selector: (0, import_locatorParser.locatorOrSelectorAsSelector)(this._currentLanguage, selector, this._context.selectors().testIdAttributeName()) };
    this._refreshOverlay();
  }
  setHighlightedAriaTemplate(ariaTemplate) {
    this._highlightedElement = { ariaTemplate };
    this._refreshOverlay();
  }
  step() {
    this._debugger.resume(true);
  }
  setLanguage(language) {
    this._currentLanguage = language;
    this._refreshOverlay();
  }
  resume() {
    this._debugger.resume(false);
  }
  pause() {
    this._debugger.pauseOnNextStatement();
  }
  paused() {
    return this._debugger.isPaused();
  }
  close() {
    this._debugger.resume(false);
  }
  hideHighlightedSelector() {
    this._highlightedElement = {};
    this._refreshOverlay();
  }
  pausedSourceId() {
    for (const { metadata } of this._debugger.pausedDetails()) {
      if (!metadata.location)
        continue;
      const source = this._userSources.get(metadata.location.file);
      if (!source)
        continue;
      return source.id;
    }
  }
  userSources() {
    return [...this._userSources.values()];
  }
  callLog() {
    return this._callLogs;
  }
  async _scopeHighlightedSelectorToFrame(frame) {
    if (!this._highlightedElement.selector)
      return;
    try {
      const mainFrame = frame._page.mainFrame();
      const resolved = await mainFrame.selectors.resolveFrameForSelector(this._highlightedElement.selector);
      if (!resolved)
        return "";
      if (resolved?.frame === mainFrame)
        return (0, import_selectorParser.stringifySelector)(resolved.info.parsed);
      if (resolved?.frame === frame)
        return (0, import_selectorParser.stringifySelector)(resolved.info.parsed);
      return "";
    } catch {
      return "";
    }
  }
  _refreshOverlay() {
    for (const page of this._context.pages()) {
      for (const frame of page.frames())
        frame.evaluateExpression("window.__pw_refreshOverlay()").catch(() => {
        });
    }
  }
  async onBeforeCall(sdkObject, metadata) {
    if (this._omitCallTracking || this._isRecording())
      return;
    this._currentCallsMetadata.set(metadata, sdkObject);
    this._updateUserSources();
    this.updateCallLog([metadata]);
    if (isScreenshotCommand(metadata))
      this.hideHighlightedSelector();
    else if (metadata.params && metadata.params.selector)
      this._highlightedElement = { selector: metadata.params.selector };
  }
  async onAfterCall(sdkObject, metadata) {
    if (this._omitCallTracking || this._isRecording())
      return;
    if (!metadata.error)
      this._currentCallsMetadata.delete(metadata);
    this._updateUserSources();
    this.updateCallLog([metadata]);
  }
  _updateUserSources() {
    for (const source of this._userSources.values()) {
      source.highlight = [];
      source.revealLine = void 0;
    }
    for (const metadata of this._currentCallsMetadata.keys()) {
      if (!metadata.location)
        continue;
      const { file, line } = metadata.location;
      let source = this._userSources.get(file);
      if (!source) {
        source = { isRecorded: false, label: file, id: file, text: this._readSource(file), highlight: [], language: languageForFile(file) };
        this._userSources.set(file, source);
      }
      if (line) {
        const paused = this._debugger.isPaused(metadata);
        source.highlight.push({ line, type: metadata.error ? "error" : paused ? "paused" : "running" });
        source.revealLine = line;
      }
    }
    this.emit(RecorderEvent.UserSourcesChanged, this.userSources(), this.pausedSourceId());
  }
  async onBeforeInputAction(sdkObject, metadata) {
  }
  async onCallLog(sdkObject, metadata, logName, message) {
    this.updateCallLog([metadata]);
  }
  updateCallLog(metadatas) {
    if (this._isRecording())
      return;
    const logs = [];
    for (const metadata of metadatas) {
      if (!metadata.method || metadata.internal)
        continue;
      let status = "done";
      if (this._currentCallsMetadata.has(metadata))
        status = "in-progress";
      if (this._debugger.isPaused(metadata))
        status = "paused";
      logs.push((0, import_recorderUtils.metadataToCallLog)(metadata, status));
    }
    this._callLogs = logs;
    this.emit(RecorderEvent.CallLogsUpdated, logs);
  }
  _isRecording() {
    return ["recording", "assertingText", "assertingVisibility", "assertingValue", "assertingSnapshot"].includes(this._mode);
  }
  _readSource(fileName) {
    try {
      return import_fs.default.readFileSync(fileName, "utf-8");
    } catch (e) {
      return "// No source available";
    }
  }
  _setEnabled(enabled) {
    this._enabled = enabled;
  }
  async _onPage(page) {
    const frame = page.mainFrame();
    page.on(import_page.Page.Events.Close, () => {
      this._signalProcessor.addAction({
        frame: this._describeMainFrame(page),
        action: {
          name: "closePage",
          signals: []
        },
        startTime: (0, import_utils2.monotonicTime)()
      });
      this._pageAliases.delete(page);
      this._filePrimaryURLChanged();
    });
    frame.on(import_frames.Frame.Events.InternalNavigation, (event) => {
      if (event.isPublic) {
        this._onFrameNavigated(frame, page);
        this._filePrimaryURLChanged();
      }
    });
    page.on(import_page.Page.Events.Download, () => this._onDownload(page));
    const suffix = this._pageAliases.size ? String(++this._lastPopupOrdinal) : "";
    const pageAlias = "page" + suffix;
    this._pageAliases.set(page, pageAlias);
    if (page.opener()) {
      this._onPopup(page.opener(), page);
    } else {
      this._signalProcessor.addAction({
        frame: this._describeMainFrame(page),
        action: {
          name: "openPage",
          url: page.mainFrame().url(),
          signals: []
        },
        startTime: (0, import_utils2.monotonicTime)()
      });
    }
    this._filePrimaryURLChanged();
  }
  _filePrimaryURLChanged() {
    const page = this._context.pages()[0];
    this.emit(RecorderEvent.PageNavigated, page?.mainFrame().url());
  }
  clear() {
    if (this._params.mode === "recording") {
      for (const page of this._context.pages())
        this._onFrameNavigated(page.mainFrame(), page);
    }
  }
  _describeMainFrame(page) {
    return {
      pageGuid: page.guid,
      pageAlias: this._pageAliases.get(page),
      framePath: []
    };
  }
  async _describeFrame(frame) {
    return {
      pageGuid: frame._page.guid,
      pageAlias: this._pageAliases.get(frame._page),
      framePath: await (0, import_recorderUtils.generateFrameSelector)(frame)
    };
  }
  _testIdAttributeName() {
    return this._params.testIdAttributeName || this._context.selectors().testIdAttributeName() || "data-testid";
  }
  async _createActionInContext(frame, action) {
    const frameDescription = await this._describeFrame(frame);
    const actionInContext = {
      frame: frameDescription,
      action,
      description: void 0,
      startTime: (0, import_utils2.monotonicTime)()
    };
    return actionInContext;
  }
  async _performAction(frame, action) {
    const actionInContext = await this._createActionInContext(frame, action);
    this._signalProcessor.addAction(actionInContext);
    if (actionInContext.action.name !== "openPage" && actionInContext.action.name !== "closePage")
      await (0, import_recorderRunner.performAction)(this._pageAliases, actionInContext);
    actionInContext.endTime = (0, import_utils2.monotonicTime)();
  }
  async _recordAction(frame, action) {
    const actionInContext = await this._createActionInContext(frame, action);
    this._signalProcessor.addAction(actionInContext);
  }
  _onFrameNavigated(frame, page) {
    const pageAlias = this._pageAliases.get(page);
    this._signalProcessor.signal(pageAlias, frame, { name: "navigation", url: frame.url() });
  }
  _onPopup(page, popup) {
    const pageAlias = this._pageAliases.get(page);
    const popupAlias = this._pageAliases.get(popup);
    this._signalProcessor.signal(pageAlias, page.mainFrame(), { name: "popup", popupAlias });
  }
  _onDownload(page) {
    const pageAlias = this._pageAliases.get(page);
    ++this._lastDownloadOrdinal;
    this._signalProcessor.signal(pageAlias, page.mainFrame(), { name: "download", downloadAlias: this._lastDownloadOrdinal ? String(this._lastDownloadOrdinal) : "" });
  }
  _onDialog(page) {
    const pageAlias = this._pageAliases.get(page);
    ++this._lastDialogOrdinal;
    this._signalProcessor.signal(pageAlias, page.mainFrame(), { name: "dialog", dialogAlias: this._lastDialogOrdinal ? String(this._lastDialogOrdinal) : "" });
  }
}
function isScreenshotCommand(metadata) {
  return metadata.method.toLowerCase().includes("screenshot");
}
function languageForFile(file) {
  if (file.endsWith(".py"))
    return "python";
  if (file.endsWith(".java"))
    return "java";
  if (file.endsWith(".cs"))
    return "csharp";
  return "javascript";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Recorder,
  RecorderEvent
});
