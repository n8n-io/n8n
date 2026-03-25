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
var debugController_exports = {};
__export(debugController_exports, {
  DebugController: () => DebugController
});
module.exports = __toCommonJS(debugController_exports);
var import_instrumentation = require("./instrumentation");
var import_processLauncher = require("./utils/processLauncher");
var import_recorder = require("./recorder");
var import_utils = require("../utils");
var import_ariaSnapshot = require("../utils/isomorphic/ariaSnapshot");
var import_utilsBundle = require("../utilsBundle");
var import_locatorParser = require("../utils/isomorphic/locatorParser");
var import_language = require("./codegen/language");
var import_recorderUtils = require("./recorder/recorderUtils");
var import_javascript = require("./codegen/javascript");
class DebugController extends import_instrumentation.SdkObject {
  constructor(playwright) {
    super({ attribution: { isInternalPlaywright: true }, instrumentation: (0, import_instrumentation.createInstrumentation)() }, void 0, "DebugController");
    this._sdkLanguage = "javascript";
    this._generateAutoExpect = false;
    this._playwright = playwright;
  }
  static {
    this.Events = {
      StateChanged: "stateChanged",
      InspectRequested: "inspectRequested",
      SourceChanged: "sourceChanged",
      Paused: "paused",
      SetModeRequested: "setModeRequested"
    };
  }
  initialize(codegenId, sdkLanguage) {
    this._sdkLanguage = sdkLanguage;
  }
  dispose() {
    this.setReportStateChanged(false);
  }
  setReportStateChanged(enabled) {
    if (enabled && !this._trackHierarchyListener) {
      this._trackHierarchyListener = {
        onPageOpen: () => this._emitSnapshot(false),
        onPageClose: () => this._emitSnapshot(false)
      };
      this._playwright.instrumentation.addListener(this._trackHierarchyListener, null);
      this._emitSnapshot(true);
    } else if (!enabled && this._trackHierarchyListener) {
      this._playwright.instrumentation.removeListener(this._trackHierarchyListener);
      this._trackHierarchyListener = void 0;
    }
  }
  async setRecorderMode(progress, params) {
    await progress.race(this._closeBrowsersWithoutPages());
    this._generateAutoExpect = !!params.generateAutoExpect;
    if (params.mode === "none") {
      for (const recorder of await progress.race(this._allRecorders())) {
        recorder.hideHighlightedSelector();
        recorder.setMode("none");
      }
      return;
    }
    if (!this._playwright.allBrowsers().length)
      await this._playwright.chromium.launch(progress, { headless: !!process.env.PW_DEBUG_CONTROLLER_HEADLESS });
    const pages = this._playwright.allPages();
    if (!pages.length) {
      const [browser] = this._playwright.allBrowsers();
      const context = await browser.newContextForReuse(progress, {});
      await context.newPage(progress);
    }
    if (params.testIdAttributeName) {
      for (const page of this._playwright.allPages())
        page.browserContext.selectors().setTestIdAttributeName(params.testIdAttributeName);
    }
    for (const recorder of await progress.race(this._allRecorders())) {
      recorder.hideHighlightedSelector();
      recorder.setMode(params.mode);
    }
  }
  async highlight(progress, params) {
    if (params.selector)
      (0, import_locatorParser.unsafeLocatorOrSelectorAsSelector)(this._sdkLanguage, params.selector, "data-testid");
    const ariaTemplate = params.ariaTemplate ? (0, import_ariaSnapshot.parseAriaSnapshotUnsafe)(import_utilsBundle.yaml, params.ariaTemplate) : void 0;
    for (const recorder of await progress.race(this._allRecorders())) {
      if (ariaTemplate)
        recorder.setHighlightedAriaTemplate(ariaTemplate);
      else if (params.selector)
        recorder.setHighlightedSelector(params.selector);
    }
  }
  async hideHighlight(progress) {
    for (const recorder of await progress.race(this._allRecorders()))
      recorder.hideHighlightedSelector();
    await Promise.all(this._playwright.allPages().map((p) => p.hideHighlight().catch(() => {
    })));
  }
  async resume(progress) {
    for (const recorder of await progress.race(this._allRecorders()))
      recorder.resume();
  }
  kill() {
    (0, import_processLauncher.gracefullyProcessExitDoNotHang)(0);
  }
  _emitSnapshot(initial) {
    const pageCount = this._playwright.allPages().length;
    if (initial && !pageCount)
      return;
    this.emit(DebugController.Events.StateChanged, { pageCount });
  }
  async _allRecorders() {
    const contexts = /* @__PURE__ */ new Set();
    for (const page of this._playwright.allPages())
      contexts.add(page.browserContext);
    const recorders = await Promise.all([...contexts].map((c) => import_recorder.Recorder.forContext(c, { omitCallTracking: true })));
    const nonNullRecorders = recorders.filter(Boolean);
    for (const recorder of recorders)
      wireListeners(recorder, this);
    return nonNullRecorders;
  }
  async _closeBrowsersWithoutPages() {
    for (const browser of this._playwright.allBrowsers()) {
      for (const context of browser.contexts()) {
        if (!context.pages().length)
          await context.close({ reason: "Browser collected" });
      }
      if (!browser.contexts())
        await browser.close({ reason: "Browser collected" });
    }
  }
}
const wiredSymbol = Symbol("wired");
function wireListeners(recorder, debugController) {
  if (recorder[wiredSymbol])
    return;
  recorder[wiredSymbol] = true;
  const actions = [];
  const languageGenerator = new import_javascript.JavaScriptLanguageGenerator(
    /* isPlaywrightTest */
    true
  );
  const actionsChanged = () => {
    const aa = (0, import_recorderUtils.collapseActions)(actions);
    const { header, footer, text, actionTexts } = (0, import_language.generateCode)(aa, languageGenerator, {
      browserName: "chromium",
      launchOptions: {},
      contextOptions: {},
      generateAutoExpect: debugController._generateAutoExpect
    });
    debugController.emit(DebugController.Events.SourceChanged, { text, header, footer, actions: actionTexts });
  };
  recorder.on(import_recorder.RecorderEvent.ElementPicked, (elementInfo) => {
    const locator = (0, import_utils.asLocator)(debugController._sdkLanguage, elementInfo.selector);
    debugController.emit(DebugController.Events.InspectRequested, { selector: elementInfo.selector, locator, ariaSnapshot: elementInfo.ariaSnapshot });
  });
  recorder.on(import_recorder.RecorderEvent.PausedStateChanged, (paused) => {
    debugController.emit(DebugController.Events.Paused, { paused });
  });
  recorder.on(import_recorder.RecorderEvent.ModeChanged, (mode) => {
    debugController.emit(DebugController.Events.SetModeRequested, { mode });
  });
  recorder.on(import_recorder.RecorderEvent.ActionAdded, (action) => {
    actions.push(action);
    actionsChanged();
  });
  recorder.on(import_recorder.RecorderEvent.SignalAdded, (signal) => {
    const lastAction = actions.findLast((a) => a.frame.pageGuid === signal.frame.pageGuid);
    if (lastAction)
      lastAction.action.signals.push(signal.signal);
    actionsChanged();
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DebugController
});
