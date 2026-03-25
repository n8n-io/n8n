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
var snapshotter_exports = {};
__export(snapshotter_exports, {
  Snapshotter: () => Snapshotter
});
module.exports = __toCommonJS(snapshotter_exports);
var import_snapshotterInjected = require("./snapshotterInjected");
var import_time = require("../../../utils/isomorphic/time");
var import_crypto = require("../../utils/crypto");
var import_debugLogger = require("../../utils/debugLogger");
var import_eventsHelper = require("../../utils/eventsHelper");
var import_utilsBundle = require("../../../utilsBundle");
var import_browserContext = require("../../browserContext");
var import_page = require("../../page");
class Snapshotter {
  constructor(context, delegate) {
    this._eventListeners = [];
    this._started = false;
    this._context = context;
    this._delegate = delegate;
    const guid = (0, import_crypto.createGuid)();
    this._snapshotStreamer = "__playwright_snapshot_streamer_" + guid;
  }
  started() {
    return this._started;
  }
  async start() {
    this._started = true;
    if (!this._initScript)
      await this._initialize();
    await this.reset();
  }
  async reset() {
    if (this._started)
      await this._context.safeNonStallingEvaluateInAllFrames(`window["${this._snapshotStreamer}"].reset()`, "main");
  }
  stop() {
    this._started = false;
  }
  async resetForReuse() {
    if (this._initScript) {
      import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
      await this._context.removeInitScripts([this._initScript]);
      this._initScript = void 0;
    }
  }
  async _initialize() {
    for (const page of this._context.pages())
      this._onPage(page);
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Page, this._onPage.bind(this))
    ];
    const { javaScriptEnabled } = this._context._options;
    const initScriptSource = `(${import_snapshotterInjected.frameSnapshotStreamer})("${this._snapshotStreamer}", ${javaScriptEnabled || javaScriptEnabled === void 0})`;
    this._initScript = await this._context.addInitScript(void 0, initScriptSource);
    await this._context.safeNonStallingEvaluateInAllFrames(initScriptSource, "main");
  }
  dispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
  }
  async _captureFrameSnapshot(frame) {
    const needsReset = !!frame[kNeedsResetSymbol];
    frame[kNeedsResetSymbol] = false;
    const expression = `window["${this._snapshotStreamer}"].captureSnapshot(${needsReset ? "true" : "false"})`;
    try {
      return await frame.nonStallingRawEvaluateInExistingMainContext(expression);
    } catch (e) {
      frame[kNeedsResetSymbol] = true;
      import_debugLogger.debugLogger.log("error", e);
    }
  }
  async captureSnapshot(page, callId, snapshotName) {
    const snapshots = page.frames().map(async (frame) => {
      const data = await this._captureFrameSnapshot(frame);
      if (!data || !this._started)
        return;
      const snapshot = {
        callId,
        snapshotName,
        pageId: page.guid,
        frameId: frame.guid,
        frameUrl: data.url,
        doctype: data.doctype,
        html: data.html,
        viewport: data.viewport,
        timestamp: (0, import_time.monotonicTime)(),
        wallTime: data.wallTime,
        collectionTime: data.collectionTime,
        resourceOverrides: [],
        isMainFrame: page.mainFrame() === frame
      };
      for (const { url, content, contentType } of data.resourceOverrides) {
        if (typeof content === "string") {
          const buffer = Buffer.from(content);
          const sha1 = (0, import_crypto.calculateSha1)(buffer) + "." + (import_utilsBundle.mime.getExtension(contentType) || "dat");
          this._delegate.onSnapshotterBlob({ sha1, buffer });
          snapshot.resourceOverrides.push({ url, sha1 });
        } else {
          snapshot.resourceOverrides.push({ url, ref: content });
        }
      }
      this._delegate.onFrameSnapshot(snapshot);
    });
    await Promise.all(snapshots);
  }
  _onPage(page) {
    for (const frame of page.frames())
      this._annotateFrameHierarchy(frame);
    this._eventListeners.push(import_eventsHelper.eventsHelper.addEventListener(page, import_page.Page.Events.FrameAttached, (frame) => this._annotateFrameHierarchy(frame)));
  }
  async _annotateFrameHierarchy(frame) {
    try {
      const frameElement = await frame.frameElement();
      const parent = frame.parentFrame();
      if (!parent)
        return;
      const context = await parent._mainContext();
      await context?.evaluate(({ snapshotStreamer, frameElement: frameElement2, frameId }) => {
        window[snapshotStreamer].markIframe(frameElement2, frameId);
      }, { snapshotStreamer: this._snapshotStreamer, frameElement, frameId: frame.guid });
      frameElement.dispose();
    } catch (e) {
    }
  }
}
const kNeedsResetSymbol = Symbol("kNeedsReset");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Snapshotter
});
