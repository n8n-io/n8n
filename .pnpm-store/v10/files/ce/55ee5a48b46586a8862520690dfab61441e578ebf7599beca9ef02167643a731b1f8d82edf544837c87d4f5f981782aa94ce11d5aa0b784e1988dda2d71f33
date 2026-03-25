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
var crCoverage_exports = {};
__export(crCoverage_exports, {
  CRCoverage: () => CRCoverage
});
module.exports = __toCommonJS(crCoverage_exports);
var import_utils = require("../../utils");
var import_eventsHelper = require("../utils/eventsHelper");
var import_progress = require("../progress");
class CRCoverage {
  constructor(client) {
    this._jsCoverage = new JSCoverage(client);
    this._cssCoverage = new CSSCoverage(client);
  }
  async startJSCoverage(progress, options) {
    await (0, import_progress.raceUncancellableOperationWithCleanup)(progress, () => this._jsCoverage.start(options), () => this._jsCoverage.stop());
  }
  async stopJSCoverage() {
    return await this._jsCoverage.stop();
  }
  async startCSSCoverage(progress, options) {
    await (0, import_progress.raceUncancellableOperationWithCleanup)(progress, () => this._cssCoverage.start(options), () => this._cssCoverage.stop());
  }
  async stopCSSCoverage() {
    return await this._cssCoverage.stop();
  }
}
class JSCoverage {
  constructor(client) {
    this._reportAnonymousScripts = false;
    this._client = client;
    this._enabled = false;
    this._scriptIds = /* @__PURE__ */ new Set();
    this._scriptSources = /* @__PURE__ */ new Map();
    this._eventListeners = [];
    this._resetOnNavigation = false;
  }
  async start(options) {
    (0, import_utils.assert)(!this._enabled, "JSCoverage is already enabled");
    const {
      resetOnNavigation = true,
      reportAnonymousScripts = false
    } = options;
    this._resetOnNavigation = resetOnNavigation;
    this._reportAnonymousScripts = reportAnonymousScripts;
    this._enabled = true;
    this._scriptIds.clear();
    this._scriptSources.clear();
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Debugger.scriptParsed", this._onScriptParsed.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.executionContextsCleared", this._onExecutionContextsCleared.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Debugger.paused", this._onDebuggerPaused.bind(this))
    ];
    await Promise.all([
      this._client.send("Profiler.enable"),
      this._client.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true }),
      this._client.send("Debugger.enable"),
      this._client.send("Debugger.setSkipAllPauses", { skip: true })
    ]);
  }
  _onDebuggerPaused() {
    this._client.send("Debugger.resume");
  }
  _onExecutionContextsCleared() {
    if (!this._resetOnNavigation)
      return;
    this._scriptIds.clear();
    this._scriptSources.clear();
  }
  async _onScriptParsed(event) {
    this._scriptIds.add(event.scriptId);
    if (!event.url && !this._reportAnonymousScripts)
      return;
    const response = await this._client._sendMayFail("Debugger.getScriptSource", { scriptId: event.scriptId });
    if (response)
      this._scriptSources.set(event.scriptId, response.scriptSource);
  }
  async stop() {
    if (!this._enabled)
      return { entries: [] };
    const [profileResponse] = await Promise.all([
      this._client.send("Profiler.takePreciseCoverage"),
      this._client.send("Profiler.stopPreciseCoverage"),
      this._client.send("Profiler.disable"),
      this._client.send("Debugger.disable")
    ]);
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._enabled = false;
    const coverage = { entries: [] };
    for (const entry of profileResponse.result) {
      if (!this._scriptIds.has(entry.scriptId))
        continue;
      if (!entry.url && !this._reportAnonymousScripts)
        continue;
      const source = this._scriptSources.get(entry.scriptId);
      if (source)
        coverage.entries.push({ ...entry, source });
      else
        coverage.entries.push(entry);
    }
    return coverage;
  }
}
class CSSCoverage {
  constructor(client) {
    this._client = client;
    this._enabled = false;
    this._stylesheetURLs = /* @__PURE__ */ new Map();
    this._stylesheetSources = /* @__PURE__ */ new Map();
    this._eventListeners = [];
    this._resetOnNavigation = false;
  }
  async start(options) {
    (0, import_utils.assert)(!this._enabled, "CSSCoverage is already enabled");
    const { resetOnNavigation = true } = options;
    this._resetOnNavigation = resetOnNavigation;
    this._enabled = true;
    this._stylesheetURLs.clear();
    this._stylesheetSources.clear();
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._client, "CSS.styleSheetAdded", this._onStyleSheet.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._client, "Runtime.executionContextsCleared", this._onExecutionContextsCleared.bind(this))
    ];
    await Promise.all([
      this._client.send("DOM.enable"),
      this._client.send("CSS.enable"),
      this._client.send("CSS.startRuleUsageTracking")
    ]);
  }
  _onExecutionContextsCleared() {
    if (!this._resetOnNavigation)
      return;
    this._stylesheetURLs.clear();
    this._stylesheetSources.clear();
  }
  async _onStyleSheet(event) {
    const header = event.header;
    if (!header.sourceURL)
      return;
    const response = await this._client._sendMayFail("CSS.getStyleSheetText", { styleSheetId: header.styleSheetId });
    if (response) {
      this._stylesheetURLs.set(header.styleSheetId, header.sourceURL);
      this._stylesheetSources.set(header.styleSheetId, response.text);
    }
  }
  async stop() {
    if (!this._enabled)
      return { entries: [] };
    const ruleTrackingResponse = await this._client.send("CSS.stopRuleUsageTracking");
    await Promise.all([
      this._client.send("CSS.disable"),
      this._client.send("DOM.disable")
    ]);
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._enabled = false;
    const styleSheetIdToCoverage = /* @__PURE__ */ new Map();
    for (const entry of ruleTrackingResponse.ruleUsage) {
      let ranges = styleSheetIdToCoverage.get(entry.styleSheetId);
      if (!ranges) {
        ranges = [];
        styleSheetIdToCoverage.set(entry.styleSheetId, ranges);
      }
      ranges.push({
        startOffset: entry.startOffset,
        endOffset: entry.endOffset,
        count: entry.used ? 1 : 0
      });
    }
    const coverage = { entries: [] };
    for (const styleSheetId of this._stylesheetURLs.keys()) {
      const url = this._stylesheetURLs.get(styleSheetId);
      const text = this._stylesheetSources.get(styleSheetId);
      const ranges = convertToDisjointRanges(styleSheetIdToCoverage.get(styleSheetId) || []);
      coverage.entries.push({ url, ranges, text });
    }
    return coverage;
  }
}
function convertToDisjointRanges(nestedRanges) {
  const points = [];
  for (const range of nestedRanges) {
    points.push({ offset: range.startOffset, type: 0, range });
    points.push({ offset: range.endOffset, type: 1, range });
  }
  points.sort((a, b) => {
    if (a.offset !== b.offset)
      return a.offset - b.offset;
    if (a.type !== b.type)
      return b.type - a.type;
    const aLength = a.range.endOffset - a.range.startOffset;
    const bLength = b.range.endOffset - b.range.startOffset;
    if (a.type === 0)
      return bLength - aLength;
    return aLength - bLength;
  });
  const hitCountStack = [];
  const results = [];
  let lastOffset = 0;
  for (const point of points) {
    if (hitCountStack.length && lastOffset < point.offset && hitCountStack[hitCountStack.length - 1] > 0) {
      const lastResult = results.length ? results[results.length - 1] : null;
      if (lastResult && lastResult.end === lastOffset)
        lastResult.end = point.offset;
      else
        results.push({ start: lastOffset, end: point.offset });
    }
    lastOffset = point.offset;
    if (point.type === 0)
      hitCountStack.push(point.range.count);
    else
      hitCountStack.pop();
  }
  return results.filter((range) => range.end - range.start > 1);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRCoverage
});
