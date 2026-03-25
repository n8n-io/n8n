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
var wkWorkers_exports = {};
__export(wkWorkers_exports, {
  WKWorkers: () => WKWorkers
});
module.exports = __toCommonJS(wkWorkers_exports);
var import_eventsHelper = require("../utils/eventsHelper");
var import_page = require("../page");
var import_wkConnection = require("./wkConnection");
var import_wkExecutionContext = require("./wkExecutionContext");
class WKWorkers {
  constructor(page) {
    this._sessionListeners = [];
    this._workerSessions = /* @__PURE__ */ new Map();
    this._page = page;
  }
  setSession(session) {
    import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
    this.clear();
    this._sessionListeners = [
      import_eventsHelper.eventsHelper.addEventListener(session, "Worker.workerCreated", (event) => {
        const worker = new import_page.Worker(this._page, event.url);
        const workerSession = new import_wkConnection.WKSession(session.connection, event.workerId, (message) => {
          session.send("Worker.sendMessageToWorker", {
            workerId: event.workerId,
            message: JSON.stringify(message)
          }).catch((e) => {
            workerSession.dispatchMessage({ id: message.id, error: { message: e.message } });
          });
        });
        this._workerSessions.set(event.workerId, workerSession);
        worker.createExecutionContext(new import_wkExecutionContext.WKExecutionContext(workerSession, void 0));
        worker.workerScriptLoaded();
        this._page.addWorker(event.workerId, worker);
        workerSession.on("Console.messageAdded", (event2) => this._onConsoleMessage(worker, event2));
        Promise.all([
          workerSession.send("Runtime.enable"),
          workerSession.send("Console.enable"),
          session.send("Worker.initialized", { workerId: event.workerId })
        ]).catch((e) => {
          this._page.removeWorker(event.workerId);
        });
      }),
      import_eventsHelper.eventsHelper.addEventListener(session, "Worker.dispatchMessageFromWorker", (event) => {
        const workerSession = this._workerSessions.get(event.workerId);
        if (!workerSession)
          return;
        workerSession.dispatchMessage(JSON.parse(event.message));
      }),
      import_eventsHelper.eventsHelper.addEventListener(session, "Worker.workerTerminated", (event) => {
        const workerSession = this._workerSessions.get(event.workerId);
        if (!workerSession)
          return;
        workerSession.dispose();
        this._workerSessions.delete(event.workerId);
        this._page.removeWorker(event.workerId);
      })
    ];
  }
  clear() {
    this._page.clearWorkers();
    this._workerSessions.clear();
  }
  async initializeSession(session) {
    await session.send("Worker.enable");
  }
  async _onConsoleMessage(worker, event) {
    const { type, level, text, parameters, url, line: lineNumber, column: columnNumber } = event.message;
    let derivedType = type || "";
    if (type === "log")
      derivedType = level;
    else if (type === "timing")
      derivedType = "timeEnd";
    const handles = (parameters || []).map((p) => {
      return (0, import_wkExecutionContext.createHandle)(worker.existingExecutionContext, p);
    });
    const location = {
      url: url || "",
      lineNumber: (lineNumber || 1) - 1,
      columnNumber: (columnNumber || 1) - 1
    };
    this._page.addConsoleMessage(worker, derivedType, handles, location, handles.length ? void 0 : text);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKWorkers
});
