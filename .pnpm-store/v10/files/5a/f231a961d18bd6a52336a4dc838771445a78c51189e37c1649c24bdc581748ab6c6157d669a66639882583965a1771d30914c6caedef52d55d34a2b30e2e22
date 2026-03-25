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
var page_exports = {};
__export(page_exports, {
  InitScript: () => InitScript,
  Page: () => Page,
  PageBinding: () => PageBinding,
  Worker: () => Worker,
  WorkerEvent: () => WorkerEvent
});
module.exports = __toCommonJS(page_exports);
var import_browserContext = require("./browserContext");
var import_console = require("./console");
var import_errors = require("./errors");
var import_fileChooser = require("./fileChooser");
var frames = __toESM(require("./frames"));
var import_helper = require("./helper");
var input = __toESM(require("./input"));
var import_instrumentation = require("./instrumentation");
var js = __toESM(require("./javascript"));
var import_screenshotter = require("./screenshotter");
var import_utils = require("../utils");
var import_utils2 = require("../utils");
var import_comparators = require("./utils/comparators");
var import_debugLogger = require("./utils/debugLogger");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_utilityScriptSerializers = require("../utils/isomorphic/utilityScriptSerializers");
var import_callLog = require("./callLog");
var rawBindingsControllerSource = __toESM(require("../generated/bindingsControllerSource"));
var import_screencast = require("./screencast");
const PageEvent = {
  Close: "close",
  Crash: "crash",
  Download: "download",
  EmulatedSizeChanged: "emulatedsizechanged",
  FileChooser: "filechooser",
  FrameAttached: "frameattached",
  FrameDetached: "framedetached",
  InternalFrameNavigatedToNewDocument: "internalframenavigatedtonewdocument",
  LocatorHandlerTriggered: "locatorhandlertriggered",
  ScreencastFrame: "screencastframe",
  Video: "video",
  WebSocket: "websocket",
  Worker: "worker"
};
class Page extends import_instrumentation.SdkObject {
  constructor(delegate, browserContext) {
    super(browserContext, "page");
    this._closedState = "open";
    this._closedPromise = new import_manualPromise.ManualPromise();
    this._initializedPromise = new import_manualPromise.ManualPromise();
    this._consoleMessages = [];
    this._pageErrors = [];
    this._crashed = false;
    this.openScope = new import_utils.LongStandingScope();
    this._emulatedMedia = {};
    this._fileChooserInterceptedBy = /* @__PURE__ */ new Set();
    this._pageBindings = /* @__PURE__ */ new Map();
    this.initScripts = [];
    this._workers = /* @__PURE__ */ new Map();
    this.requestInterceptors = [];
    this.video = null;
    this._locatorHandlers = /* @__PURE__ */ new Map();
    this._lastLocatorHandlerUid = 0;
    this._locatorHandlerRunningCounter = 0;
    this._networkRequests = [];
    this.attribution.page = this;
    this.delegate = delegate;
    this.browserContext = browserContext;
    this.keyboard = new input.Keyboard(delegate.rawKeyboard, this);
    this.mouse = new input.Mouse(delegate.rawMouse, this);
    this.touchscreen = new input.Touchscreen(delegate.rawTouchscreen, this);
    this.screenshotter = new import_screenshotter.Screenshotter(this);
    this.frameManager = new frames.FrameManager(this);
    this.screencast = new import_screencast.Screencast(this);
    if (delegate.pdf)
      this.pdf = delegate.pdf.bind(delegate);
    this.coverage = delegate.coverage ? delegate.coverage() : null;
    this.isStorageStatePage = browserContext.isCreatingStorageStatePage();
  }
  static {
    this.Events = PageEvent;
  }
  async reportAsNew(opener, error) {
    if (opener) {
      const openerPageOrError = await opener.waitForInitializedOrError();
      if (openerPageOrError instanceof Page && !openerPageOrError.isClosed())
        this._opener = openerPageOrError;
    }
    this._markInitialized(error);
  }
  _markInitialized(error = void 0) {
    if (error) {
      if (this.browserContext.isClosingOrClosed())
        return;
      this.frameManager.createDummyMainFrameIfNeeded();
    }
    this._initialized = error || this;
    this.emitOnContext(import_browserContext.BrowserContext.Events.Page, this);
    for (const pageError of this._pageErrors)
      this.emitOnContext(import_browserContext.BrowserContext.Events.PageError, pageError, this);
    for (const message of this._consoleMessages)
      this.emitOnContext(import_browserContext.BrowserContext.Events.Console, message);
    if (this.isClosed())
      this.emit(Page.Events.Close);
    else
      this.instrumentation.onPageOpen(this);
    this._initializedPromise.resolve(this._initialized);
  }
  initializedOrUndefined() {
    return this._initialized ? this : void 0;
  }
  waitForInitializedOrError() {
    return this._initializedPromise;
  }
  emitOnContext(event, ...args) {
    if (this.isStorageStatePage)
      return;
    this.browserContext.emit(event, ...args);
  }
  async resetForReuse(progress) {
    await this.mainFrame().gotoImpl(progress, "about:blank", {});
    this._emulatedSize = void 0;
    this._emulatedMedia = {};
    this._extraHTTPHeaders = void 0;
    await Promise.all([
      this.delegate.updateEmulatedViewportSize(),
      this.delegate.updateEmulateMedia(),
      this.delegate.updateExtraHTTPHeaders()
    ]);
    await this.delegate.resetForReuse(progress);
  }
  _didClose() {
    this.frameManager.dispose();
    this.screencast.stopFrameThrottler();
    (0, import_utils.assert)(this._closedState !== "closed", "Page closed twice");
    this._closedState = "closed";
    this.emit(Page.Events.Close);
    this._closedPromise.resolve();
    this.instrumentation.onPageClose(this);
    this.openScope.close(new import_errors.TargetClosedError(this.closeReason()));
  }
  _didCrash() {
    this.frameManager.dispose();
    this.screencast.stopFrameThrottler();
    this.emit(Page.Events.Crash);
    this._crashed = true;
    this.instrumentation.onPageClose(this);
    this.openScope.close(new Error("Page crashed"));
  }
  async _onFileChooserOpened(handle) {
    let multiple;
    try {
      multiple = await handle.evaluate((element) => !!element.multiple);
    } catch (e) {
      return;
    }
    if (!this.listenerCount(Page.Events.FileChooser)) {
      handle.dispose();
      return;
    }
    const fileChooser = new import_fileChooser.FileChooser(this, handle, multiple);
    this.emit(Page.Events.FileChooser, fileChooser);
  }
  opener() {
    return this._opener;
  }
  mainFrame() {
    return this.frameManager.mainFrame();
  }
  frames() {
    return this.frameManager.frames();
  }
  async exposeBinding(progress, name, needsHandle, playwrightBinding) {
    if (this._pageBindings.has(name))
      throw new Error(`Function "${name}" has been already registered`);
    if (this.browserContext._pageBindings.has(name))
      throw new Error(`Function "${name}" has been already registered in the browser context`);
    await progress.race(this.browserContext.exposePlaywrightBindingIfNeeded());
    const binding = new PageBinding(name, playwrightBinding, needsHandle);
    this._pageBindings.set(name, binding);
    try {
      await progress.race(this.delegate.addInitScript(binding.initScript));
      await progress.race(this.safeNonStallingEvaluateInAllFrames(binding.initScript.source, "main"));
      return binding;
    } catch (error) {
      this._pageBindings.delete(name);
      throw error;
    }
  }
  async removeExposedBindings(bindings) {
    bindings = bindings.filter((binding) => this._pageBindings.get(binding.name) === binding);
    for (const binding of bindings)
      this._pageBindings.delete(binding.name);
    await this.delegate.removeInitScripts(bindings.map((binding) => binding.initScript));
    const cleanup = bindings.map((binding) => `{ ${binding.cleanupScript} };
`).join("");
    await this.safeNonStallingEvaluateInAllFrames(cleanup, "main");
  }
  async setExtraHTTPHeaders(progress, headers) {
    const oldHeaders = this._extraHTTPHeaders;
    try {
      this._extraHTTPHeaders = headers;
      await progress.race(this.delegate.updateExtraHTTPHeaders());
    } catch (error) {
      this._extraHTTPHeaders = oldHeaders;
      this.delegate.updateExtraHTTPHeaders().catch(() => {
      });
      throw error;
    }
  }
  extraHTTPHeaders() {
    return this._extraHTTPHeaders;
  }
  addNetworkRequest(request) {
    this._networkRequests.push(request);
    ensureArrayLimit(this._networkRequests, 100);
  }
  networkRequests() {
    return this._networkRequests;
  }
  async onBindingCalled(payload, context) {
    if (this._closedState === "closed")
      return;
    await PageBinding.dispatch(this, payload, context);
  }
  addConsoleMessage(worker, type, args, location, text) {
    const message = new import_console.ConsoleMessage(this, worker, type, text, args, location);
    const intercepted = this.frameManager.interceptConsoleMessage(message);
    if (intercepted) {
      args.forEach((arg) => arg.dispose());
      return;
    }
    this._consoleMessages.push(message);
    ensureArrayLimit(this._consoleMessages, 200);
    if (this._initialized)
      this.emitOnContext(import_browserContext.BrowserContext.Events.Console, message);
  }
  consoleMessages() {
    return this._consoleMessages;
  }
  addPageError(pageError) {
    this._pageErrors.push(pageError);
    ensureArrayLimit(this._pageErrors, 200);
    if (this._initialized)
      this.emitOnContext(import_browserContext.BrowserContext.Events.PageError, pageError, this);
  }
  pageErrors() {
    return this._pageErrors;
  }
  async reload(progress, options) {
    return this.mainFrame().raceNavigationAction(progress, async () => {
      const [response] = await Promise.all([
        // Reload must be a new document, and should not be confused with a stray pushState.
        this.mainFrame()._waitForNavigation(progress, true, options),
        progress.race(this.delegate.reload())
      ]);
      return response;
    });
  }
  async goBack(progress, options) {
    return this.mainFrame().raceNavigationAction(progress, async () => {
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false, options).catch((e) => {
        error = e;
        return null;
      });
      const result = await progress.race(this.delegate.goBack());
      if (!result) {
        waitPromise.catch(() => {
        });
        return null;
      }
      const response = await waitPromise;
      if (error)
        throw error;
      return response;
    });
  }
  async goForward(progress, options) {
    return this.mainFrame().raceNavigationAction(progress, async () => {
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false, options).catch((e) => {
        error = e;
        return null;
      });
      const result = await progress.race(this.delegate.goForward());
      if (!result) {
        waitPromise.catch(() => {
        });
        return null;
      }
      const response = await waitPromise;
      if (error)
        throw error;
      return response;
    });
  }
  requestGC() {
    return this.delegate.requestGC();
  }
  registerLocatorHandler(selector, noWaitAfter) {
    const uid = ++this._lastLocatorHandlerUid;
    this._locatorHandlers.set(uid, { selector, noWaitAfter });
    return uid;
  }
  resolveLocatorHandler(uid, remove) {
    const handler = this._locatorHandlers.get(uid);
    if (remove)
      this._locatorHandlers.delete(uid);
    if (handler) {
      handler.resolved?.resolve();
      handler.resolved = void 0;
    }
  }
  unregisterLocatorHandler(uid) {
    this._locatorHandlers.delete(uid);
  }
  async performActionPreChecks(progress) {
    await this._performWaitForNavigationCheck(progress);
    await this._performLocatorHandlersCheckpoint(progress);
    await this._performWaitForNavigationCheck(progress);
  }
  async _performWaitForNavigationCheck(progress) {
    if (process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK)
      return;
    const mainFrame = this.frameManager.mainFrame();
    if (!mainFrame || !mainFrame.pendingDocument())
      return;
    const url = mainFrame.pendingDocument()?.request?.url();
    const toUrl = url ? `" ${(0, import_utils.trimStringWithEllipsis)(url, 200)}"` : "";
    progress.log(`  waiting for${toUrl} navigation to finish...`);
    await import_helper.helper.waitForEvent(progress, mainFrame, frames.Frame.Events.InternalNavigation, (e) => {
      if (!e.isPublic)
        return false;
      if (!e.error)
        progress.log(`  navigated to "${(0, import_utils.trimStringWithEllipsis)(mainFrame.url(), 200)}"`);
      return true;
    }).promise;
  }
  async _performLocatorHandlersCheckpoint(progress) {
    if (this._locatorHandlerRunningCounter)
      return;
    for (const [uid, handler] of this._locatorHandlers) {
      if (!handler.resolved) {
        if (await this.mainFrame().isVisibleInternal(progress, handler.selector, { strict: true })) {
          handler.resolved = new import_manualPromise.ManualPromise();
          this.emit(Page.Events.LocatorHandlerTriggered, uid);
        }
      }
      if (handler.resolved) {
        ++this._locatorHandlerRunningCounter;
        progress.log(`  found ${(0, import_utils2.asLocator)(this.browserContext._browser.sdkLanguage(), handler.selector)}, intercepting action to run the handler`);
        const promise = handler.resolved.then(async () => {
          if (!handler.noWaitAfter) {
            progress.log(`  locator handler has finished, waiting for ${(0, import_utils2.asLocator)(this.browserContext._browser.sdkLanguage(), handler.selector)} to be hidden`);
            await this.mainFrame().waitForSelector(progress, handler.selector, false, { state: "hidden" });
          } else {
            progress.log(`  locator handler has finished`);
          }
        });
        await progress.race(this.openScope.race(promise)).finally(() => --this._locatorHandlerRunningCounter);
        progress.log(`  interception handler has finished, continuing`);
      }
    }
  }
  async emulateMedia(progress, options) {
    const oldEmulatedMedia = { ...this._emulatedMedia };
    if (options.media !== void 0)
      this._emulatedMedia.media = options.media;
    if (options.colorScheme !== void 0)
      this._emulatedMedia.colorScheme = options.colorScheme;
    if (options.reducedMotion !== void 0)
      this._emulatedMedia.reducedMotion = options.reducedMotion;
    if (options.forcedColors !== void 0)
      this._emulatedMedia.forcedColors = options.forcedColors;
    if (options.contrast !== void 0)
      this._emulatedMedia.contrast = options.contrast;
    try {
      await progress.race(this.delegate.updateEmulateMedia());
    } catch (error) {
      this._emulatedMedia = oldEmulatedMedia;
      this.delegate.updateEmulateMedia().catch(() => {
      });
      throw error;
    }
  }
  emulatedMedia() {
    const contextOptions = this.browserContext._options;
    return {
      media: this._emulatedMedia.media || "no-override",
      colorScheme: this._emulatedMedia.colorScheme !== void 0 ? this._emulatedMedia.colorScheme : contextOptions.colorScheme ?? "light",
      reducedMotion: this._emulatedMedia.reducedMotion !== void 0 ? this._emulatedMedia.reducedMotion : contextOptions.reducedMotion ?? "no-preference",
      forcedColors: this._emulatedMedia.forcedColors !== void 0 ? this._emulatedMedia.forcedColors : contextOptions.forcedColors ?? "none",
      contrast: this._emulatedMedia.contrast !== void 0 ? this._emulatedMedia.contrast : contextOptions.contrast ?? "no-preference"
    };
  }
  async setViewportSize(progress, viewportSize) {
    const oldEmulatedSize = this._emulatedSize;
    try {
      this._setEmulatedSize({ viewport: { ...viewportSize }, screen: { ...viewportSize } });
      await progress.race(this.delegate.updateEmulatedViewportSize());
    } catch (error) {
      this._emulatedSize = oldEmulatedSize;
      this.delegate.updateEmulatedViewportSize().catch(() => {
      });
      throw error;
    }
  }
  setEmulatedSizeFromWindowOpen(emulatedSize) {
    this._setEmulatedSize(emulatedSize);
  }
  _setEmulatedSize(emulatedSize) {
    this._emulatedSize = emulatedSize;
    this.emit(Page.Events.EmulatedSizeChanged);
  }
  emulatedSize() {
    if (this._emulatedSize)
      return this._emulatedSize;
    const contextOptions = this.browserContext._options;
    return contextOptions.viewport ? { viewport: contextOptions.viewport, screen: contextOptions.screen || contextOptions.viewport } : void 0;
  }
  async bringToFront() {
    await this.delegate.bringToFront();
  }
  async addInitScript(progress, source) {
    const initScript = new InitScript(source);
    this.initScripts.push(initScript);
    try {
      await progress.race(this.delegate.addInitScript(initScript));
    } catch (error) {
      this.removeInitScripts([initScript]).catch(() => {
      });
      throw error;
    }
    return initScript;
  }
  async removeInitScripts(initScripts) {
    const set = new Set(initScripts);
    this.initScripts = this.initScripts.filter((script) => !set.has(script));
    await this.delegate.removeInitScripts(initScripts);
  }
  needsRequestInterception() {
    return this.requestInterceptors.length > 0 || this.browserContext.requestInterceptors.length > 0;
  }
  async addRequestInterceptor(progress, handler, prepend) {
    if (prepend)
      this.requestInterceptors.unshift(handler);
    else
      this.requestInterceptors.push(handler);
    await this.delegate.updateRequestInterception();
  }
  async removeRequestInterceptor(handler) {
    const index = this.requestInterceptors.indexOf(handler);
    if (index === -1)
      return;
    this.requestInterceptors.splice(index, 1);
    await this.browserContext.notifyRoutesInFlightAboutRemovedHandler(handler);
    await this.delegate.updateRequestInterception();
  }
  async expectScreenshot(progress, options) {
    const locator = options.locator;
    const rafrafScreenshot = locator ? async (timeout) => {
      return await locator.frame.rafrafTimeoutScreenshotElementWithProgress(progress, locator.selector, timeout, options || {});
    } : async (timeout) => {
      await this.performActionPreChecks(progress);
      await this.mainFrame().rafrafTimeout(progress, timeout);
      return await this.screenshotter.screenshotPage(progress, options || {});
    };
    const comparator = (0, import_comparators.getComparator)("image/png");
    if (!options.expected && options.isNot)
      return { errorMessage: '"not" matcher requires expected result' };
    try {
      const format = (0, import_screenshotter.validateScreenshotOptions)(options || {});
      if (format !== "png")
        throw new Error("Only PNG screenshots are supported");
    } catch (error) {
      return { errorMessage: error.message };
    }
    let intermediateResult;
    const areEqualScreenshots = (actual, expected, previous) => {
      const comparatorResult = actual && expected ? comparator(actual, expected, options) : void 0;
      if (comparatorResult !== void 0 && !!comparatorResult === !!options.isNot)
        return true;
      if (comparatorResult)
        intermediateResult = { errorMessage: comparatorResult.errorMessage, diff: comparatorResult.diff, actual, previous };
      return false;
    };
    try {
      let actual;
      let previous;
      const pollIntervals = [0, 100, 250, 500];
      progress.log(`${(0, import_utils.renderTitleForCall)(progress.metadata)}${options.timeout ? ` with timeout ${options.timeout}ms` : ""}`);
      if (options.expected)
        progress.log(`  verifying given screenshot expectation`);
      else
        progress.log(`  generating new stable screenshot expectation`);
      let isFirstIteration = true;
      while (true) {
        if (this.isClosed())
          throw new Error("The page has closed");
        const screenshotTimeout = pollIntervals.shift() ?? 1e3;
        if (screenshotTimeout)
          progress.log(`waiting ${screenshotTimeout}ms before taking screenshot`);
        previous = actual;
        actual = await rafrafScreenshot(screenshotTimeout).catch((e) => {
          if (this.mainFrame().isNonRetriableError(e))
            throw e;
          progress.log(`failed to take screenshot - ` + e.message);
          return void 0;
        });
        if (!actual)
          continue;
        const expectation = options.expected && isFirstIteration ? options.expected : previous;
        if (areEqualScreenshots(actual, expectation, previous))
          break;
        if (intermediateResult)
          progress.log(intermediateResult.errorMessage);
        isFirstIteration = false;
      }
      if (!isFirstIteration)
        progress.log(`captured a stable screenshot`);
      if (!options.expected)
        return { actual };
      if (isFirstIteration) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      if (areEqualScreenshots(actual, options.expected, void 0)) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      throw new Error(intermediateResult.errorMessage);
    } catch (e) {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, import_selectorParser.isInvalidSelectorError)(e))
        throw e;
      let errorMessage = e.message;
      if (e instanceof import_errors.TimeoutError && intermediateResult?.previous)
        errorMessage = `Failed to take two consecutive stable screenshots.`;
      return {
        log: (0, import_callLog.compressCallLog)(e.message ? [...progress.metadata.log, e.message] : progress.metadata.log),
        ...intermediateResult,
        errorMessage,
        timedOut: e instanceof import_errors.TimeoutError
      };
    }
  }
  async screenshot(progress, options) {
    return await this.screenshotter.screenshotPage(progress, options);
  }
  async close(options = {}) {
    if (this._closedState === "closed")
      return;
    if (options.reason)
      this._closeReason = options.reason;
    const runBeforeUnload = !!options.runBeforeUnload;
    if (this._closedState !== "closing") {
      if (!runBeforeUnload)
        this._closedState = "closing";
      await this.delegate.closePage(runBeforeUnload).catch((e) => import_debugLogger.debugLogger.log("error", e));
    }
    if (!runBeforeUnload)
      await this._closedPromise;
  }
  isClosed() {
    return this._closedState === "closed";
  }
  hasCrashed() {
    return this._crashed;
  }
  isClosedOrClosingOrCrashed() {
    return this._closedState !== "open" || this._crashed;
  }
  addWorker(workerId, worker) {
    this._workers.set(workerId, worker);
    this.emit(Page.Events.Worker, worker);
  }
  removeWorker(workerId) {
    const worker = this._workers.get(workerId);
    if (!worker)
      return;
    worker.didClose();
    this._workers.delete(workerId);
  }
  clearWorkers() {
    for (const [workerId, worker] of this._workers) {
      worker.didClose();
      this._workers.delete(workerId);
    }
  }
  async setFileChooserInterceptedBy(enabled, by) {
    const wasIntercepted = this.fileChooserIntercepted();
    if (enabled)
      this._fileChooserInterceptedBy.add(by);
    else
      this._fileChooserInterceptedBy.delete(by);
    if (wasIntercepted !== this.fileChooserIntercepted())
      await this.delegate.updateFileChooserInterception();
  }
  fileChooserIntercepted() {
    return this._fileChooserInterceptedBy.size > 0;
  }
  frameNavigatedToNewDocument(frame) {
    this.emit(Page.Events.InternalFrameNavigatedToNewDocument, frame);
    const origin = frame.origin();
    if (origin)
      this.browserContext.addVisitedOrigin(origin);
  }
  allInitScripts() {
    const bindings = [...this.browserContext._pageBindings.values(), ...this._pageBindings.values()].map((binding) => binding.initScript);
    if (this.browserContext.bindingsInitScript)
      bindings.unshift(this.browserContext.bindingsInitScript);
    return [...bindings, ...this.browserContext.initScripts, ...this.initScripts];
  }
  getBinding(name) {
    return this._pageBindings.get(name) || this.browserContext._pageBindings.get(name);
  }
  async safeNonStallingEvaluateInAllFrames(expression, world, options = {}) {
    await Promise.all(this.frames().map(async (frame) => {
      try {
        await frame.nonStallingEvaluateInExistingContext(expression, world);
      } catch (e) {
        if (options.throwOnJSErrors && js.isJavaScriptErrorInEvaluate(e))
          throw e;
      }
    }));
  }
  async hideHighlight() {
    await Promise.all(this.frames().map((frame) => frame.hideHighlight().catch(() => {
    })));
  }
  async snapshotForAI(progress, options = {}) {
    const snapshot = await snapshotFrameForAI(progress, this.mainFrame(), options);
    return { full: snapshot.full.join("\n"), incremental: snapshot.incremental?.join("\n") };
  }
}
const WorkerEvent = {
  Close: "close"
};
class Worker extends import_instrumentation.SdkObject {
  constructor(parent, url) {
    super(parent, "worker");
    this._executionContextPromise = new import_manualPromise.ManualPromise();
    this._workerScriptLoaded = false;
    this.existingExecutionContext = null;
    this.openScope = new import_utils.LongStandingScope();
    this.url = url;
  }
  static {
    this.Events = WorkerEvent;
  }
  createExecutionContext(delegate) {
    this.existingExecutionContext = new js.ExecutionContext(this, delegate, "worker");
    if (this._workerScriptLoaded)
      this._executionContextPromise.resolve(this.existingExecutionContext);
    return this.existingExecutionContext;
  }
  workerScriptLoaded() {
    this._workerScriptLoaded = true;
    if (this.existingExecutionContext)
      this._executionContextPromise.resolve(this.existingExecutionContext);
  }
  didClose() {
    if (this.existingExecutionContext)
      this.existingExecutionContext.contextDestroyed("Worker was closed");
    this.emit(Worker.Events.Close, this);
    this.openScope.close(new Error("Worker closed"));
  }
  async evaluateExpression(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, { returnByValue: true, isFunction }, arg);
  }
  async evaluateExpressionHandle(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, { returnByValue: false, isFunction }, arg);
  }
}
class PageBinding {
  static {
    this.kController = "__playwright__binding__controller__";
  }
  static {
    this.kBindingName = "__playwright__binding__";
  }
  static createInitScript() {
    return new InitScript(`
      (() => {
        const module = {};
        ${rawBindingsControllerSource.source}
        const property = '${PageBinding.kController}';
        if (!globalThis[property])
          globalThis[property] = new (module.exports.BindingsController())(globalThis, '${PageBinding.kBindingName}');
      })();
    `);
  }
  constructor(name, playwrightFunction, needsHandle) {
    this.name = name;
    this.playwrightFunction = playwrightFunction;
    this.initScript = new InitScript(`globalThis['${PageBinding.kController}'].addBinding(${JSON.stringify(name)}, ${needsHandle})`);
    this.needsHandle = needsHandle;
    this.cleanupScript = `globalThis['${PageBinding.kController}'].removeBinding(${JSON.stringify(name)})`;
  }
  static async dispatch(page, payload, context) {
    const { name, seq, serializedArgs } = JSON.parse(payload);
    try {
      (0, import_utils.assert)(context.world);
      const binding = page.getBinding(name);
      if (!binding)
        throw new Error(`Function "${name}" is not exposed`);
      let result;
      if (binding.needsHandle) {
        const handle = await context.evaluateExpressionHandle(`arg => globalThis['${PageBinding.kController}'].takeBindingHandle(arg)`, { isFunction: true }, { name, seq }).catch((e) => null);
        result = await binding.playwrightFunction({ frame: context.frame, page, context: page.browserContext }, handle);
      } else {
        if (!Array.isArray(serializedArgs))
          throw new Error(`serializedArgs is not an array. This can happen when Array.prototype.toJSON is defined incorrectly`);
        const args = serializedArgs.map((a) => (0, import_utilityScriptSerializers.parseEvaluationResultValue)(a));
        result = await binding.playwrightFunction({ frame: context.frame, page, context: page.browserContext }, ...args);
      }
      context.evaluateExpressionHandle(`arg => globalThis['${PageBinding.kController}'].deliverBindingResult(arg)`, { isFunction: true }, { name, seq, result }).catch((e) => import_debugLogger.debugLogger.log("error", e));
    } catch (error) {
      context.evaluateExpressionHandle(`arg => globalThis['${PageBinding.kController}'].deliverBindingResult(arg)`, { isFunction: true }, { name, seq, error }).catch((e) => import_debugLogger.debugLogger.log("error", e));
    }
  }
}
class InitScript {
  constructor(source) {
    this.source = `(() => {
      ${source}
    })();`;
  }
}
async function snapshotFrameForAI(progress, frame, options = {}) {
  const snapshot = await frame.retryWithProgressAndTimeouts(progress, [1e3, 2e3, 4e3, 8e3], async (continuePolling) => {
    try {
      const context = await progress.race(frame._utilityContext());
      const injectedScript = await progress.race(context.injectedScript());
      const snapshotOrRetry = await progress.race(injectedScript.evaluate((injected, options2) => {
        const node = injected.document.body;
        if (!node)
          return true;
        return injected.incrementalAriaSnapshot(node, { mode: "ai", ...options2 });
      }, { refPrefix: frame.seq ? "f" + frame.seq : "", track: options.track, doNotRenderActive: options.doNotRenderActive }));
      if (snapshotOrRetry === true)
        return continuePolling;
      return snapshotOrRetry;
    } catch (e) {
      if (frame.isNonRetriableError(e))
        throw e;
      return continuePolling;
    }
  });
  const childSnapshotPromises = snapshot.iframeRefs.map((ref) => snapshotFrameRefForAI(progress, frame, ref, options));
  const childSnapshots = await Promise.all(childSnapshotPromises);
  const full = [];
  let incremental;
  if (snapshot.incremental !== void 0) {
    incremental = snapshot.incremental.split("\n");
    for (let i = 0; i < snapshot.iframeRefs.length; i++) {
      const childSnapshot = childSnapshots[i];
      if (childSnapshot.incremental)
        incremental.push(...childSnapshot.incremental);
      else if (childSnapshot.full.length)
        incremental.push("- <changed> iframe [ref=" + snapshot.iframeRefs[i] + "]:", ...childSnapshot.full.map((l) => "  " + l));
    }
  }
  for (const line of snapshot.full.split("\n")) {
    const match = line.match(/^(\s*)- iframe (?:\[active\] )?\[ref=([^\]]*)\]/);
    if (!match) {
      full.push(line);
      continue;
    }
    const leadingSpace = match[1];
    const ref = match[2];
    const childSnapshot = childSnapshots[snapshot.iframeRefs.indexOf(ref)] ?? { full: [] };
    full.push(childSnapshot.full.length ? line + ":" : line);
    full.push(...childSnapshot.full.map((l) => leadingSpace + "  " + l));
  }
  return { full, incremental };
}
async function snapshotFrameRefForAI(progress, parentFrame, frameRef, options) {
  const frameSelector = `aria-ref=${frameRef} >> internal:control=enter-frame`;
  const frameBodySelector = `${frameSelector} >> body`;
  const child = await progress.race(parentFrame.selectors.resolveFrameForSelector(frameBodySelector, { strict: true }));
  if (!child)
    return { full: [] };
  try {
    return await snapshotFrameForAI(progress, child.frame, options);
  } catch {
    return { full: [] };
  }
}
function ensureArrayLimit(array, limit) {
  if (array.length > limit)
    return array.splice(0, limit / 10);
  return [];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InitScript,
  Page,
  PageBinding,
  Worker,
  WorkerEvent
});
