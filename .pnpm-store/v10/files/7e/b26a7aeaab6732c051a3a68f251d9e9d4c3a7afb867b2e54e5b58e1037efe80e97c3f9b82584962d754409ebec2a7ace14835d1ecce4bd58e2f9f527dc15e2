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
var tracing_exports = {};
__export(tracing_exports, {
  Tracing: () => Tracing
});
module.exports = __toCommonJS(tracing_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_snapshotter = require("./snapshotter");
var import_protocolMetainfo = require("../../../utils/isomorphic/protocolMetainfo");
var import_assert = require("../../../utils/isomorphic/assert");
var import_time = require("../../../utils/isomorphic/time");
var import_eventsHelper = require("../../utils/eventsHelper");
var import_crypto = require("../../utils/crypto");
var import_userAgent = require("../../utils/userAgent");
var import_artifact = require("../../artifact");
var import_browserContext = require("../../browserContext");
var import_dispatcher = require("../../dispatchers/dispatcher");
var import_errors = require("../../errors");
var import_fileUtils = require("../../utils/fileUtils");
var import_harTracer = require("../../har/harTracer");
var import_instrumentation = require("../../instrumentation");
var import_page = require("../../page");
var import_progress = require("../../progress");
const version = 8;
const kScreencastOptions = { width: 800, height: 600, quality: 90 };
class Tracing extends import_instrumentation.SdkObject {
  constructor(context, tracesDir) {
    super(context, "tracing");
    this._fs = new import_fileUtils.SerializedFS();
    this._screencastListeners = [];
    this._eventListeners = [];
    this._isStopping = false;
    this._allResources = /* @__PURE__ */ new Set();
    this._pendingHarEntries = /* @__PURE__ */ new Set();
    this._context = context;
    this._precreatedTracesDir = tracesDir;
    this._harTracer = new import_harTracer.HarTracer(context, null, this, {
      content: "attach",
      includeTraceInfo: true,
      recordRequestOverrides: false,
      waitForContentOnStop: false
    });
    const testIdAttributeName = "selectors" in context ? context.selectors().testIdAttributeName() : void 0;
    this._contextCreatedEvent = {
      version,
      type: "context-options",
      origin: "library",
      browserName: "",
      playwrightVersion: (0, import_userAgent.getPlaywrightVersion)(),
      options: {},
      platform: process.platform,
      wallTime: 0,
      monotonicTime: 0,
      sdkLanguage: this._sdkLanguage(),
      testIdAttributeName,
      contextId: context.guid
    };
    if (context instanceof import_browserContext.BrowserContext) {
      this._snapshotter = new import_snapshotter.Snapshotter(context, this);
      (0, import_assert.assert)(tracesDir, "tracesDir must be specified for BrowserContext");
      this._contextCreatedEvent.browserName = context._browser.options.name;
      this._contextCreatedEvent.channel = context._browser.options.channel;
      this._contextCreatedEvent.options = context._options;
    }
  }
  _sdkLanguage() {
    return this._context instanceof import_browserContext.BrowserContext ? this._context._browser.sdkLanguage() : this._context.attribution.playwright.options.sdkLanguage;
  }
  async resetForReuse(progress) {
    await this.stopChunk(progress, { mode: "discard" }).catch(() => {
    });
    await this.stop(progress);
    if (this._snapshotter)
      await progress.race(this._snapshotter.resetForReuse());
  }
  start(options) {
    if (this._isStopping)
      throw new Error("Cannot start tracing while stopping");
    if (this._state)
      throw new Error("Tracing has been already started");
    this._contextCreatedEvent.sdkLanguage = this._sdkLanguage();
    const traceName = options.name || (0, import_crypto.createGuid)();
    const tracesDir = this._createTracesDirIfNeeded();
    this._state = {
      options,
      traceName,
      tracesDir,
      traceFile: import_path.default.join(tracesDir, traceName + ".trace"),
      networkFile: import_path.default.join(tracesDir, traceName + ".network"),
      resourcesDir: import_path.default.join(tracesDir, "resources"),
      chunkOrdinal: 0,
      traceSha1s: /* @__PURE__ */ new Set(),
      networkSha1s: /* @__PURE__ */ new Set(),
      recording: false,
      callIds: /* @__PURE__ */ new Set(),
      groupStack: []
    };
    this._fs.mkdir(this._state.resourcesDir);
    this._fs.writeFile(this._state.networkFile, "");
    if (options.snapshots)
      this._harTracer.start({ omitScripts: !options.live });
  }
  async startChunk(progress, options = {}) {
    if (this._state && this._state.recording)
      await this.stopChunk(progress, { mode: "discard" });
    if (!this._state)
      throw new Error("Must start tracing before starting a new chunk");
    if (this._isStopping)
      throw new Error("Cannot start a trace chunk while stopping");
    this._state.recording = true;
    this._state.callIds.clear();
    const preserveNetworkResources = this._context instanceof import_browserContext.BrowserContext;
    if (options.name && options.name !== this._state.traceName)
      this._changeTraceName(this._state, options.name, preserveNetworkResources);
    else
      this._allocateNewTraceFile(this._state);
    if (!preserveNetworkResources)
      this._fs.writeFile(this._state.networkFile, "");
    this._fs.mkdir(import_path.default.dirname(this._state.traceFile));
    const event = {
      ...this._contextCreatedEvent,
      title: options.title,
      wallTime: Date.now(),
      monotonicTime: (0, import_time.monotonicTime)()
    };
    this._appendTraceEvent(event);
    this._context.instrumentation.addListener(this, this._context);
    this._eventListeners.push(
      import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Console, this._onConsoleMessage.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.PageError, this._onPageError.bind(this))
    );
    if (this._state.options.screenshots)
      this._startScreencast();
    if (this._state.options.snapshots)
      await this._snapshotter?.start();
    return { traceName: this._state.traceName };
  }
  _currentGroupId() {
    return this._state?.groupStack.length ? this._state.groupStack[this._state.groupStack.length - 1] : void 0;
  }
  group(name, location, metadata) {
    if (!this._state)
      return;
    const stackFrames = [];
    const { file, line, column } = location ?? metadata.location ?? {};
    if (file) {
      stackFrames.push({
        file,
        line: line ?? 0,
        column: column ?? 0
      });
    }
    const event = {
      type: "before",
      callId: metadata.id,
      startTime: metadata.startTime,
      title: name,
      class: "Tracing",
      method: "tracingGroup",
      params: {},
      stepId: metadata.stepId,
      stack: stackFrames
    };
    if (this._currentGroupId())
      event.parentId = this._currentGroupId();
    this._state.groupStack.push(event.callId);
    this._appendTraceEvent(event);
  }
  groupEnd() {
    if (!this._state)
      return;
    const callId = this._state.groupStack.pop();
    if (!callId)
      return;
    const event = {
      type: "after",
      callId,
      endTime: (0, import_time.monotonicTime)()
    };
    this._appendTraceEvent(event);
  }
  _startScreencast() {
    if (!(this._context instanceof import_browserContext.BrowserContext))
      return;
    for (const page of this._context.pages())
      this._startScreencastInPage(page);
    this._screencastListeners.push(
      import_eventsHelper.eventsHelper.addEventListener(this._context, import_browserContext.BrowserContext.Events.Page, this._startScreencastInPage.bind(this))
    );
  }
  _stopScreencast() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._screencastListeners);
    if (!(this._context instanceof import_browserContext.BrowserContext))
      return;
    for (const page of this._context.pages())
      page.screencast.setOptions(null);
  }
  _allocateNewTraceFile(state) {
    const suffix = state.chunkOrdinal ? `-chunk${state.chunkOrdinal}` : ``;
    state.chunkOrdinal++;
    state.traceFile = import_path.default.join(state.tracesDir, `${state.traceName}${suffix}.trace`);
  }
  _changeTraceName(state, name, preserveNetworkResources) {
    state.traceName = name;
    state.chunkOrdinal = 0;
    this._allocateNewTraceFile(state);
    const newNetworkFile = import_path.default.join(state.tracesDir, name + ".network");
    if (preserveNetworkResources)
      this._fs.copyFile(state.networkFile, newNetworkFile);
    state.networkFile = newNetworkFile;
  }
  async stop(progress) {
    if (!this._state)
      return;
    if (this._isStopping)
      throw new Error(`Tracing is already stopping`);
    if (this._state.recording)
      throw new Error(`Must stop trace file before stopping tracing`);
    this._closeAllGroups();
    this._harTracer.stop();
    this.flushHarEntries();
    const promise = progress ? progress.race(this._fs.syncAndGetError()) : this._fs.syncAndGetError();
    await promise.finally(() => {
      this._state = void 0;
    });
  }
  async deleteTmpTracesDir() {
    if (this._tracesTmpDir)
      await (0, import_fileUtils.removeFolders)([this._tracesTmpDir]);
  }
  _createTracesDirIfNeeded() {
    if (this._precreatedTracesDir)
      return this._precreatedTracesDir;
    this._tracesTmpDir = import_fs.default.mkdtempSync(import_path.default.join(import_os.default.tmpdir(), "playwright-tracing-"));
    return this._tracesTmpDir;
  }
  abort() {
    this._snapshotter?.dispose();
    this._harTracer.stop();
  }
  async flush() {
    this.abort();
    await this._fs.syncAndGetError();
  }
  _closeAllGroups() {
    while (this._currentGroupId())
      this.groupEnd();
  }
  async stopChunk(progress, params) {
    if (this._isStopping)
      throw new Error(`Tracing is already stopping`);
    this._isStopping = true;
    if (!this._state || !this._state.recording) {
      this._isStopping = false;
      if (params.mode !== "discard")
        throw new Error(`Must start tracing before stopping`);
      return {};
    }
    this._closeAllGroups();
    this._context.instrumentation.removeListener(this);
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    if (this._state.options.screenshots)
      this._stopScreencast();
    if (this._state.options.snapshots)
      this._snapshotter?.stop();
    this.flushHarEntries();
    const newNetworkFile = import_path.default.join(this._state.tracesDir, this._state.traceName + `-pwnetcopy-${this._state.chunkOrdinal}.network`);
    const entries = [];
    entries.push({ name: "trace.trace", value: this._state.traceFile });
    entries.push({ name: "trace.network", value: newNetworkFile });
    for (const sha1 of /* @__PURE__ */ new Set([...this._state.traceSha1s, ...this._state.networkSha1s]))
      entries.push({ name: import_path.default.join("resources", sha1), value: import_path.default.join(this._state.resourcesDir, sha1) });
    this._state.traceSha1s = /* @__PURE__ */ new Set();
    if (params.mode === "discard") {
      this._isStopping = false;
      this._state.recording = false;
      return {};
    }
    this._fs.copyFile(this._state.networkFile, newNetworkFile);
    const zipFileName = this._state.traceFile + ".zip";
    if (params.mode === "archive")
      this._fs.zip(entries, zipFileName);
    const promise = progress ? progress.race(this._fs.syncAndGetError()) : this._fs.syncAndGetError();
    const error = await promise.catch((e) => e);
    this._isStopping = false;
    if (this._state)
      this._state.recording = false;
    if (error) {
      if (!(0, import_progress.isAbortError)(error) && this._context instanceof import_browserContext.BrowserContext && !this._context._browser.isConnected())
        return {};
      throw error;
    }
    if (params.mode === "entries")
      return { entries };
    const artifact = new import_artifact.Artifact(this._context, zipFileName);
    artifact.reportFinished();
    return { artifact };
  }
  async _captureSnapshot(snapshotName, sdkObject, metadata) {
    if (!snapshotName || !sdkObject.attribution.page)
      return;
    await this._snapshotter?.captureSnapshot(sdkObject.attribution.page, metadata.id, snapshotName).catch(() => {
    });
  }
  _shouldCaptureSnapshot(sdkObject, metadata) {
    return !!this._snapshotter?.started() && shouldCaptureSnapshot(metadata) && !!sdkObject.attribution.page;
  }
  onBeforeCall(sdkObject, metadata, parentId) {
    const event = createBeforeActionTraceEvent(metadata, parentId ?? this._currentGroupId());
    if (!event)
      return Promise.resolve();
    sdkObject.attribution.page?.screencast.temporarilyDisableThrottling();
    if (this._shouldCaptureSnapshot(sdkObject, metadata))
      event.beforeSnapshot = `before@${metadata.id}`;
    this._state?.callIds.add(metadata.id);
    this._appendTraceEvent(event);
    return this._captureSnapshot(event.beforeSnapshot, sdkObject, metadata);
  }
  onBeforeInputAction(sdkObject, metadata) {
    if (!this._state?.callIds.has(metadata.id))
      return Promise.resolve();
    const event = createInputActionTraceEvent(metadata);
    if (!event)
      return Promise.resolve();
    sdkObject.attribution.page?.screencast.temporarilyDisableThrottling();
    if (this._shouldCaptureSnapshot(sdkObject, metadata))
      event.inputSnapshot = `input@${metadata.id}`;
    this._appendTraceEvent(event);
    return this._captureSnapshot(event.inputSnapshot, sdkObject, metadata);
  }
  onCallLog(sdkObject, metadata, logName, message) {
    if (!this._state?.callIds.has(metadata.id))
      return;
    if (metadata.internal)
      return;
    if (logName !== "api")
      return;
    const event = createActionLogTraceEvent(metadata, message);
    if (event)
      this._appendTraceEvent(event);
  }
  onAfterCall(sdkObject, metadata) {
    if (!this._state?.callIds.has(metadata.id))
      return Promise.resolve();
    this._state?.callIds.delete(metadata.id);
    const event = createAfterActionTraceEvent(metadata);
    if (!event)
      return Promise.resolve();
    sdkObject.attribution.page?.screencast.temporarilyDisableThrottling();
    if (this._shouldCaptureSnapshot(sdkObject, metadata))
      event.afterSnapshot = `after@${metadata.id}`;
    this._appendTraceEvent(event);
    return this._captureSnapshot(event.afterSnapshot, sdkObject, metadata);
  }
  onEntryStarted(entry) {
    this._pendingHarEntries.add(entry);
  }
  onEntryFinished(entry) {
    this._pendingHarEntries.delete(entry);
    const event = { type: "resource-snapshot", snapshot: entry };
    const visited = visitTraceEvent(event, this._state.networkSha1s);
    this._fs.appendFile(
      this._state.networkFile,
      JSON.stringify(visited) + "\n",
      true
      /* flush */
    );
  }
  flushHarEntries() {
    const harLines = [];
    for (const entry of this._pendingHarEntries) {
      const event = { type: "resource-snapshot", snapshot: entry };
      const visited = visitTraceEvent(event, this._state.networkSha1s);
      harLines.push(JSON.stringify(visited));
    }
    this._pendingHarEntries.clear();
    if (harLines.length)
      this._fs.appendFile(
        this._state.networkFile,
        harLines.join("\n") + "\n",
        true
        /* flush */
      );
  }
  onContentBlob(sha1, buffer) {
    this._appendResource(sha1, buffer);
  }
  onSnapshotterBlob(blob) {
    this._appendResource(blob.sha1, blob.buffer);
  }
  onFrameSnapshot(snapshot) {
    this._appendTraceEvent({ type: "frame-snapshot", snapshot });
  }
  _onConsoleMessage(message) {
    const event = {
      type: "console",
      messageType: message.type(),
      text: message.text(),
      args: message.args().map((a) => ({ preview: a.toString(), value: a.rawValue() })),
      location: message.location(),
      time: (0, import_time.monotonicTime)(),
      pageId: message.page()?.guid
    };
    this._appendTraceEvent(event);
  }
  onDialog(dialog) {
    const event = {
      type: "event",
      time: (0, import_time.monotonicTime)(),
      class: "BrowserContext",
      method: "dialog",
      params: { pageId: dialog.page().guid, type: dialog.type(), message: dialog.message(), defaultValue: dialog.defaultValue() }
    };
    this._appendTraceEvent(event);
  }
  onDownload(page, download) {
    const event = {
      type: "event",
      time: (0, import_time.monotonicTime)(),
      class: "BrowserContext",
      method: "download",
      params: { pageId: page.guid, url: download.url, suggestedFilename: download.suggestedFilename() }
    };
    this._appendTraceEvent(event);
  }
  onPageOpen(page) {
    const event = {
      type: "event",
      time: (0, import_time.monotonicTime)(),
      class: "BrowserContext",
      method: "page",
      params: { pageId: page.guid, openerPageId: page.opener()?.guid }
    };
    this._appendTraceEvent(event);
  }
  onPageClose(page) {
    const event = {
      type: "event",
      time: (0, import_time.monotonicTime)(),
      class: "BrowserContext",
      method: "pageClosed",
      params: { pageId: page.guid }
    };
    this._appendTraceEvent(event);
  }
  _onPageError(error, page) {
    const event = {
      type: "event",
      time: (0, import_time.monotonicTime)(),
      class: "BrowserContext",
      method: "pageError",
      params: { error: (0, import_errors.serializeError)(error) },
      pageId: page.guid
    };
    this._appendTraceEvent(event);
  }
  _startScreencastInPage(page) {
    page.screencast.setOptions(kScreencastOptions);
    const prefix = page.guid;
    this._screencastListeners.push(
      import_eventsHelper.eventsHelper.addEventListener(page, import_page.Page.Events.ScreencastFrame, (params) => {
        const suffix = params.timestamp || Date.now();
        const sha1 = `${prefix}-${suffix}.jpeg`;
        const event = {
          type: "screencast-frame",
          pageId: page.guid,
          sha1,
          width: params.width,
          height: params.height,
          timestamp: (0, import_time.monotonicTime)(),
          frameSwapWallTime: params.frameSwapWallTime
        };
        this._appendResource(sha1, params.buffer);
        this._appendTraceEvent(event);
      })
    );
  }
  _appendTraceEvent(event) {
    const visited = visitTraceEvent(event, this._state.traceSha1s);
    const flush = this._state.options.live || event.type !== "event" && event.type !== "console" && event.type !== "log";
    this._fs.appendFile(this._state.traceFile, JSON.stringify(visited) + "\n", flush);
  }
  _appendResource(sha1, buffer) {
    if (this._allResources.has(sha1))
      return;
    this._allResources.add(sha1);
    const resourcePath = import_path.default.join(this._state.resourcesDir, sha1);
    this._fs.writeFile(
      resourcePath,
      buffer,
      true
      /* skipIfExists */
    );
  }
}
function visitTraceEvent(object, sha1s) {
  if (Array.isArray(object))
    return object.map((o) => visitTraceEvent(o, sha1s));
  if (object instanceof import_dispatcher.Dispatcher)
    return `<${object._type}>`;
  if (object instanceof Buffer)
    return `<Buffer>`;
  if (object instanceof Date)
    return object;
  if (typeof object === "object") {
    const result = {};
    for (const key in object) {
      if (key === "sha1" || key === "_sha1" || key.endsWith("Sha1")) {
        const sha1 = object[key];
        if (sha1)
          sha1s.add(sha1);
      }
      result[key] = visitTraceEvent(object[key], sha1s);
    }
    return result;
  }
  return object;
}
function shouldCaptureSnapshot(metadata) {
  const metainfo = import_protocolMetainfo.methodMetainfo.get(metadata.type + "." + metadata.method);
  return !!metainfo?.snapshot;
}
function createBeforeActionTraceEvent(metadata, parentId) {
  if (metadata.internal || metadata.method.startsWith("tracing"))
    return null;
  const event = {
    type: "before",
    callId: metadata.id,
    startTime: metadata.startTime,
    title: metadata.title,
    class: metadata.type,
    method: metadata.method,
    params: metadata.params,
    stepId: metadata.stepId,
    pageId: metadata.pageId
  };
  if (parentId)
    event.parentId = parentId;
  return event;
}
function createInputActionTraceEvent(metadata) {
  if (metadata.internal || metadata.method.startsWith("tracing"))
    return null;
  return {
    type: "input",
    callId: metadata.id,
    point: metadata.point
  };
}
function createActionLogTraceEvent(metadata, message) {
  if (metadata.internal || metadata.method.startsWith("tracing"))
    return null;
  return {
    type: "log",
    callId: metadata.id,
    time: (0, import_time.monotonicTime)(),
    message
  };
}
function createAfterActionTraceEvent(metadata) {
  if (metadata.internal || metadata.method.startsWith("tracing"))
    return null;
  return {
    type: "after",
    callId: metadata.id,
    endTime: metadata.endTime,
    error: metadata.error?.error,
    result: metadata.result,
    point: metadata.point
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Tracing
});
