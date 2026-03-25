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
var tab_exports = {};
__export(tab_exports, {
  Tab: () => Tab,
  TabEvents: () => TabEvents,
  renderModalStates: () => renderModalStates,
  shouldIncludeMessage: () => shouldIncludeMessage
});
module.exports = __toCommonJS(tab_exports);
var import_events = require("events");
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("./tools/utils");
var import_log = require("../log");
var import_dialogs = require("./tools/dialogs");
var import_files = require("./tools/files");
var import_transform = require("../../transform/transform");
const TabEvents = {
  modalState: "modalState"
};
class Tab extends import_events.EventEmitter {
  constructor(context, page, onPageClose) {
    super();
    this._lastHeader = { title: "about:blank", url: "about:blank", current: false };
    this._consoleMessages = [];
    this._downloads = [];
    this._requests = /* @__PURE__ */ new Set();
    this._modalStates = [];
    this._needsFullSnapshot = false;
    this._eventEntries = [];
    this._recentEventEntries = [];
    this.context = context;
    this.page = page;
    this._onPageClose = onPageClose;
    page.on("console", (event) => this._handleConsoleMessage(messageToConsoleMessage(event)));
    page.on("pageerror", (error) => this._handleConsoleMessage(pageErrorToConsoleMessage(error)));
    page.on("request", (request) => this._handleRequest(request));
    page.on("close", () => this._onClose());
    page.on("filechooser", (chooser) => {
      this.setModalState({
        type: "fileChooser",
        description: "File chooser",
        fileChooser: chooser,
        clearedBy: import_files.uploadFile.schema.name
      });
    });
    page.on("dialog", (dialog) => this._dialogShown(dialog));
    page.on("download", (download) => {
      void this._downloadStarted(download);
    });
    page.setDefaultNavigationTimeout(this.context.config.timeouts.navigation);
    page.setDefaultTimeout(this.context.config.timeouts.action);
    page[tabSymbol] = this;
    this._initializedPromise = this._initialize();
  }
  static forPage(page) {
    return page[tabSymbol];
  }
  static async collectConsoleMessages(page) {
    const result = [];
    const messages = await page.consoleMessages().catch(() => []);
    for (const message of messages)
      result.push(messageToConsoleMessage(message));
    const errors = await page.pageErrors().catch(() => []);
    for (const error of errors)
      result.push(pageErrorToConsoleMessage(error));
    return result;
  }
  async _initialize() {
    for (const message of await Tab.collectConsoleMessages(this.page))
      this._handleConsoleMessage(message);
    const requests = await this.page.requests().catch(() => []);
    for (const request of requests)
      this._requests.add(request);
    for (const initPage of this.context.config.browser.initPage || []) {
      try {
        const { default: func } = await (0, import_transform.requireOrImport)(initPage);
        await func({ page: this.page });
      } catch (e) {
        (0, import_log.logUnhandledError)(e);
      }
    }
  }
  modalStates() {
    return this._modalStates;
  }
  setModalState(modalState) {
    this._modalStates.push(modalState);
    this.emit(TabEvents.modalState, modalState);
  }
  clearModalState(modalState) {
    this._modalStates = this._modalStates.filter((state) => state !== modalState);
  }
  _dialogShown(dialog) {
    this.setModalState({
      type: "dialog",
      description: `"${dialog.type()}" dialog with message "${dialog.message()}"`,
      dialog,
      clearedBy: import_dialogs.handleDialog.schema.name
    });
  }
  async _downloadStarted(download) {
    const entry = {
      download,
      finished: false,
      outputFile: await this.context.outputFile(download.suggestedFilename(), { origin: "web", title: "Saving download" })
    };
    this._downloads.push(entry);
    this._addLogEntry({ type: "download-start", wallTime: Date.now(), download: entry });
    await download.saveAs(entry.outputFile);
    entry.finished = true;
    this._addLogEntry({ type: "download-finish", wallTime: Date.now(), download: entry });
  }
  _clearCollectedArtifacts() {
    this._consoleMessages.length = 0;
    this._downloads.length = 0;
    this._requests.clear();
    this._eventEntries.length = 0;
    this._recentEventEntries.length = 0;
  }
  _handleRequest(request) {
    this._requests.add(request);
    this._addLogEntry({ type: "request", wallTime: Date.now(), request });
  }
  _handleConsoleMessage(message) {
    this._consoleMessages.push(message);
    this._addLogEntry({ type: "console", wallTime: Date.now(), message });
  }
  _addLogEntry(entry) {
    this._eventEntries.push(entry);
    this._recentEventEntries.push(entry);
  }
  _onClose() {
    this._clearCollectedArtifacts();
    this._onPageClose(this);
  }
  async headerSnapshot() {
    let title;
    await this._raceAgainstModalStates(async () => {
      title = await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => page.title());
    });
    if (this._lastHeader.title !== title || this._lastHeader.url !== this.page.url() || this._lastHeader.current !== this.isCurrentTab()) {
      this._lastHeader = { title: title ?? "", url: this.page.url(), current: this.isCurrentTab() };
      return { ...this._lastHeader, changed: true };
    }
    return { ...this._lastHeader, changed: false };
  }
  isCurrentTab() {
    return this === this.context.currentTab();
  }
  async waitForLoadState(state, options) {
    await this._initializedPromise;
    await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => page.waitForLoadState(state, options).catch(import_log.logUnhandledError));
  }
  async navigate(url) {
    await this._initializedPromise;
    this._clearCollectedArtifacts();
    const { promise: downloadEvent, abort: abortDownloadEvent } = (0, import_utils2.eventWaiter)(this.page, "download", 3e3);
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
      abortDownloadEvent();
    } catch (_e) {
      const e = _e;
      const mightBeDownload = e.message.includes("net::ERR_ABORTED") || e.message.includes("Download is starting");
      if (!mightBeDownload)
        throw e;
      const download = await downloadEvent;
      if (!download)
        throw e;
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }
    await this.waitForLoadState("load", { timeout: 5e3 });
  }
  async consoleMessages(level) {
    await this._initializedPromise;
    return this._consoleMessages.filter((message) => shouldIncludeMessage(level, message.type));
  }
  async requests() {
    await this._initializedPromise;
    return this._requests;
  }
  async captureSnapshot() {
    await this._initializedPromise;
    let tabSnapshot;
    const modalStates = await this._raceAgainstModalStates(async () => {
      const snapshot = await this.page._snapshotForAI({ track: "response" });
      tabSnapshot = {
        ariaSnapshot: snapshot.full,
        ariaSnapshotDiff: this._needsFullSnapshot ? void 0 : snapshot.incremental,
        modalStates: [],
        events: []
      };
    });
    if (tabSnapshot) {
      tabSnapshot.events = this._recentEventEntries;
      this._recentEventEntries = [];
    }
    this._needsFullSnapshot = !tabSnapshot;
    return tabSnapshot ?? {
      ariaSnapshot: "",
      ariaSnapshotDiff: "",
      modalStates,
      events: []
    };
  }
  _javaScriptBlocked() {
    return this._modalStates.some((state) => state.type === "dialog");
  }
  async _raceAgainstModalStates(action) {
    if (this.modalStates().length)
      return this.modalStates();
    const promise = new import_utils.ManualPromise();
    const listener = (modalState) => promise.resolve([modalState]);
    this.once(TabEvents.modalState, listener);
    return await Promise.race([
      action().then(() => {
        this.off(TabEvents.modalState, listener);
        return [];
      }),
      promise
    ]);
  }
  async waitForCompletion(callback) {
    await this._initializedPromise;
    await this._raceAgainstModalStates(() => (0, import_utils2.waitForCompletion)(this, callback));
  }
  async refLocator(params) {
    await this._initializedPromise;
    return (await this.refLocators([params]))[0];
  }
  async refLocators(params) {
    await this._initializedPromise;
    return Promise.all(params.map(async (param) => {
      try {
        let locator = this.page.locator(`aria-ref=${param.ref}`);
        if (param.element)
          locator = locator.describe(param.element);
        const { resolvedSelector } = await locator._resolveSelector();
        return { locator, resolved: (0, import_utils.asLocator)("javascript", resolvedSelector) };
      } catch (e) {
        throw new Error(`Ref ${param.ref} not found in the current page snapshot. Try capturing new snapshot.`);
      }
    }));
  }
  async waitForTimeout(time) {
    if (this._javaScriptBlocked()) {
      await new Promise((f) => setTimeout(f, time));
      return;
    }
    await (0, import_utils2.callOnPageNoTrace)(this.page, (page) => {
      return page.evaluate(() => new Promise((f) => setTimeout(f, 1e3))).catch(() => {
      });
    });
  }
}
function messageToConsoleMessage(message) {
  return {
    type: message.type(),
    text: message.text(),
    toString: () => `[${message.type().toUpperCase()}] ${message.text()} @ ${message.location().url}:${message.location().lineNumber}`
  };
}
function pageErrorToConsoleMessage(errorOrValue) {
  if (errorOrValue instanceof Error) {
    return {
      type: "error",
      text: errorOrValue.message,
      toString: () => errorOrValue.stack || errorOrValue.message
    };
  }
  return {
    type: "error",
    text: String(errorOrValue),
    toString: () => String(errorOrValue)
  };
}
function renderModalStates(modalStates) {
  const result = [];
  if (modalStates.length === 0)
    result.push("- There is no modal state present");
  for (const state of modalStates)
    result.push(`- [${state.description}]: can be handled by the "${state.clearedBy}" tool`);
  return result;
}
const consoleMessageLevels = ["error", "warning", "info", "debug"];
function shouldIncludeMessage(thresholdLevel, type) {
  const messageLevel = consoleLevelForMessageType(type);
  return consoleMessageLevels.indexOf(messageLevel) <= consoleMessageLevels.indexOf(thresholdLevel);
}
function consoleLevelForMessageType(type) {
  switch (type) {
    case "assert":
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "count":
    case "dir":
    case "dirxml":
    case "info":
    case "log":
    case "table":
    case "time":
    case "timeEnd":
      return "info";
    case "clear":
    case "debug":
    case "endGroup":
    case "profile":
    case "profileEnd":
    case "startGroup":
    case "startGroupCollapsed":
    case "trace":
      return "debug";
    default:
      return "info";
  }
}
const tabSymbol = Symbol("tabSymbol");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Tab,
  TabEvents,
  renderModalStates,
  shouldIncludeMessage
});
