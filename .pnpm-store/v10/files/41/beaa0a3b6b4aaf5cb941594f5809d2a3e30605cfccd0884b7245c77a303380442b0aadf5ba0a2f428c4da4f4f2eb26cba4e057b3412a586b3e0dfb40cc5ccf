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
var traceModernizer_exports = {};
__export(traceModernizer_exports, {
  TraceModernizer: () => TraceModernizer,
  TraceVersionError: () => TraceVersionError
});
module.exports = __toCommonJS(traceModernizer_exports);
class TraceVersionError extends Error {
  constructor(message) {
    super(message);
    this.name = "TraceVersionError";
  }
}
const latestVersion = 8;
class TraceModernizer {
  constructor(contextEntry, snapshotStorage) {
    this._actionMap = /* @__PURE__ */ new Map();
    this._pageEntries = /* @__PURE__ */ new Map();
    this._jsHandles = /* @__PURE__ */ new Map();
    this._consoleObjects = /* @__PURE__ */ new Map();
    this._contextEntry = contextEntry;
    this._snapshotStorage = snapshotStorage;
  }
  appendTrace(trace) {
    for (const line of trace.split("\n"))
      this._appendEvent(line);
  }
  actions() {
    return [...this._actionMap.values()];
  }
  _pageEntry(pageId) {
    let pageEntry = this._pageEntries.get(pageId);
    if (!pageEntry) {
      pageEntry = {
        pageId,
        screencastFrames: []
      };
      this._pageEntries.set(pageId, pageEntry);
      this._contextEntry.pages.push(pageEntry);
    }
    return pageEntry;
  }
  _appendEvent(line) {
    if (!line)
      return;
    const events = this._modernize(JSON.parse(line));
    for (const event of events)
      this._innerAppendEvent(event);
  }
  _innerAppendEvent(event) {
    const contextEntry = this._contextEntry;
    switch (event.type) {
      case "context-options": {
        if (event.version > latestVersion)
          throw new TraceVersionError("The trace was created by a newer version of Playwright and is not supported by this version of the viewer. Please use latest Playwright to open the trace.");
        this._version = event.version;
        contextEntry.origin = event.origin;
        contextEntry.browserName = event.browserName;
        contextEntry.channel = event.channel;
        contextEntry.title = event.title;
        contextEntry.platform = event.platform;
        contextEntry.playwrightVersion = event.playwrightVersion;
        contextEntry.wallTime = event.wallTime;
        contextEntry.startTime = event.monotonicTime;
        contextEntry.sdkLanguage = event.sdkLanguage;
        contextEntry.options = event.options;
        contextEntry.testIdAttributeName = event.testIdAttributeName;
        contextEntry.contextId = event.contextId ?? "";
        break;
      }
      case "screencast-frame": {
        this._pageEntry(event.pageId).screencastFrames.push(event);
        break;
      }
      case "before": {
        this._actionMap.set(event.callId, { ...event, type: "action", endTime: 0, log: [] });
        break;
      }
      case "input": {
        const existing = this._actionMap.get(event.callId);
        existing.inputSnapshot = event.inputSnapshot;
        existing.point = event.point;
        break;
      }
      case "log": {
        const existing = this._actionMap.get(event.callId);
        if (!existing)
          return;
        existing.log.push({
          time: event.time,
          message: event.message
        });
        break;
      }
      case "after": {
        const existing = this._actionMap.get(event.callId);
        existing.afterSnapshot = event.afterSnapshot;
        existing.endTime = event.endTime;
        existing.result = event.result;
        existing.error = event.error;
        existing.attachments = event.attachments;
        existing.annotations = event.annotations;
        if (event.point)
          existing.point = event.point;
        break;
      }
      case "action": {
        this._actionMap.set(event.callId, { ...event, log: [] });
        break;
      }
      case "event": {
        contextEntry.events.push(event);
        break;
      }
      case "stdout": {
        contextEntry.stdio.push(event);
        break;
      }
      case "stderr": {
        contextEntry.stdio.push(event);
        break;
      }
      case "error": {
        contextEntry.errors.push(event);
        break;
      }
      case "console": {
        contextEntry.events.push(event);
        break;
      }
      case "resource-snapshot":
        this._snapshotStorage.addResource(this._contextEntry.contextId, event.snapshot);
        contextEntry.resources.push(event.snapshot);
        break;
      case "frame-snapshot":
        this._snapshotStorage.addFrameSnapshot(this._contextEntry.contextId, event.snapshot, this._pageEntry(event.snapshot.pageId).screencastFrames);
        break;
    }
    if ("pageId" in event && event.pageId)
      this._pageEntry(event.pageId);
    if (event.type === "action" || event.type === "before")
      contextEntry.startTime = Math.min(contextEntry.startTime, event.startTime);
    if (event.type === "action" || event.type === "after")
      contextEntry.endTime = Math.max(contextEntry.endTime, event.endTime);
    if (event.type === "event") {
      contextEntry.startTime = Math.min(contextEntry.startTime, event.time);
      contextEntry.endTime = Math.max(contextEntry.endTime, event.time);
    }
    if (event.type === "screencast-frame") {
      contextEntry.startTime = Math.min(contextEntry.startTime, event.timestamp);
      contextEntry.endTime = Math.max(contextEntry.endTime, event.timestamp);
    }
  }
  _processedContextCreatedEvent() {
    return this._version !== void 0;
  }
  _modernize(event) {
    let version = this._version ?? event.version ?? 6;
    let events = [event];
    for (; version < latestVersion; ++version)
      events = this[`_modernize_${version}_to_${version + 1}`].call(this, events);
    return events;
  }
  _modernize_0_to_1(events) {
    for (const event of events) {
      if (event.type !== "action")
        continue;
      if (typeof event.metadata.error === "string")
        event.metadata.error = { error: { name: "Error", message: event.metadata.error } };
    }
    return events;
  }
  _modernize_1_to_2(events) {
    for (const event of events) {
      if (event.type !== "frame-snapshot" || !event.snapshot.isMainFrame)
        continue;
      event.snapshot.viewport = this._contextEntry.options?.viewport || { width: 1280, height: 720 };
    }
    return events;
  }
  _modernize_2_to_3(events) {
    for (const event of events) {
      if (event.type !== "resource-snapshot" || event.snapshot.request)
        continue;
      const resource = event.snapshot;
      event.snapshot = {
        _frameref: resource.frameId,
        request: {
          url: resource.url,
          method: resource.method,
          headers: resource.requestHeaders,
          postData: resource.requestSha1 ? { _sha1: resource.requestSha1 } : void 0
        },
        response: {
          status: resource.status,
          headers: resource.responseHeaders,
          content: {
            mimeType: resource.contentType,
            _sha1: resource.responseSha1
          }
        },
        _monotonicTime: resource.timestamp
      };
    }
    return events;
  }
  _modernize_3_to_4(events) {
    const result = [];
    for (const event of events) {
      const e = this._modernize_event_3_to_4(event);
      if (e)
        result.push(e);
    }
    return result;
  }
  _modernize_event_3_to_4(event) {
    if (event.type !== "action" && event.type !== "event") {
      return event;
    }
    const metadata = event.metadata;
    if (metadata.internal || metadata.method.startsWith("tracing"))
      return null;
    if (event.type === "event") {
      if (metadata.method === "__create__" && metadata.type === "ConsoleMessage") {
        return {
          type: "object",
          class: metadata.type,
          guid: metadata.params.guid,
          initializer: metadata.params.initializer
        };
      }
      return {
        type: "event",
        time: metadata.startTime,
        class: metadata.type,
        method: metadata.method,
        params: metadata.params,
        pageId: metadata.pageId
      };
    }
    return {
      type: "action",
      callId: metadata.id,
      startTime: metadata.startTime,
      endTime: metadata.endTime,
      apiName: metadata.apiName || metadata.type + "." + metadata.method,
      class: metadata.type,
      method: metadata.method,
      params: metadata.params,
      // eslint-disable-next-line no-restricted-globals
      wallTime: metadata.wallTime || Date.now(),
      log: metadata.log,
      beforeSnapshot: metadata.snapshots.find((s) => s.title === "before")?.snapshotName,
      inputSnapshot: metadata.snapshots.find((s) => s.title === "input")?.snapshotName,
      afterSnapshot: metadata.snapshots.find((s) => s.title === "after")?.snapshotName,
      error: metadata.error?.error,
      result: metadata.result,
      point: metadata.point,
      pageId: metadata.pageId
    };
  }
  _modernize_4_to_5(events) {
    const result = [];
    for (const event of events) {
      const e = this._modernize_event_4_to_5(event);
      if (e)
        result.push(e);
    }
    return result;
  }
  _modernize_event_4_to_5(event) {
    if (event.type === "event" && event.method === "__create__" && event.class === "JSHandle")
      this._jsHandles.set(event.params.guid, event.params.initializer);
    if (event.type === "object") {
      if (event.class !== "ConsoleMessage")
        return null;
      const args = event.initializer.args?.map((arg) => {
        if (arg.guid) {
          const handle = this._jsHandles.get(arg.guid);
          return { preview: handle?.preview || "", value: "" };
        }
        return { preview: arg.preview || "", value: arg.value || "" };
      });
      this._consoleObjects.set(event.guid, {
        type: event.initializer.type,
        text: event.initializer.text,
        location: event.initializer.location,
        args
      });
      return null;
    }
    if (event.type === "event" && event.method === "console") {
      const consoleMessage = this._consoleObjects.get(event.params.message?.guid || "");
      if (!consoleMessage)
        return null;
      return {
        type: "console",
        time: event.time,
        pageId: event.pageId,
        messageType: consoleMessage.type,
        text: consoleMessage.text,
        args: consoleMessage.args,
        location: consoleMessage.location
      };
    }
    return event;
  }
  _modernize_5_to_6(events) {
    const result = [];
    for (const event of events) {
      result.push(event);
      if (event.type !== "after" || !event.log.length)
        continue;
      for (const log of event.log) {
        result.push({
          type: "log",
          callId: event.callId,
          message: log,
          time: -1
        });
      }
    }
    return result;
  }
  _modernize_6_to_7(events) {
    const result = [];
    if (!this._processedContextCreatedEvent() && events[0].type !== "context-options") {
      const event = {
        type: "context-options",
        origin: "testRunner",
        version: 6,
        browserName: "",
        options: {},
        platform: "unknown",
        wallTime: 0,
        monotonicTime: 0,
        sdkLanguage: "javascript",
        contextId: ""
      };
      result.push(event);
    }
    for (const event of events) {
      if (event.type === "context-options") {
        result.push({ ...event, monotonicTime: 0, origin: "library", contextId: "" });
        continue;
      }
      if (event.type === "before" || event.type === "action") {
        if (!this._contextEntry.wallTime)
          this._contextEntry.wallTime = event.wallTime;
        const eventAsV6 = event;
        const eventAsV7 = event;
        eventAsV7.stepId = `${eventAsV6.apiName}@${eventAsV6.wallTime}`;
        result.push(eventAsV7);
      } else {
        result.push(event);
      }
    }
    return result;
  }
  _modernize_7_to_8(events) {
    const result = [];
    for (const event of events) {
      if (event.type === "before" || event.type === "action") {
        const eventAsV7 = event;
        const eventAsV8 = event;
        if (eventAsV7.apiName) {
          eventAsV8.title = eventAsV7.apiName;
          delete eventAsV8.apiName;
        }
        eventAsV8.stepId = eventAsV7.stepId ?? eventAsV7.callId;
        result.push(eventAsV8);
      } else {
        result.push(event);
      }
    }
    return result;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TraceModernizer,
  TraceVersionError
});
