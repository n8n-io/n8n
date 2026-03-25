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
var recorderSignalProcessor_exports = {};
__export(recorderSignalProcessor_exports, {
  RecorderSignalProcessor: () => RecorderSignalProcessor
});
module.exports = __toCommonJS(recorderSignalProcessor_exports);
var import_debug = require("../utils/debug");
var import_time = require("../../utils/isomorphic/time");
var import_recorderUtils = require("./recorderUtils");
class RecorderSignalProcessor {
  constructor(actionSink) {
    this._lastAction = null;
    this._delegate = actionSink;
  }
  addAction(actionInContext) {
    this._lastAction = actionInContext;
    this._delegate.addAction(actionInContext);
  }
  signal(pageAlias, frame, signal) {
    const timestamp = (0, import_time.monotonicTime)();
    if (signal.name === "navigation" && frame._page.mainFrame() === frame) {
      const lastAction = this._lastAction;
      const signalThreshold = (0, import_debug.isUnderTest)() ? 500 : 5e3;
      let generateGoto = false;
      if (!lastAction)
        generateGoto = true;
      else if (lastAction.action.name !== "click" && lastAction.action.name !== "press" && lastAction.action.name !== "fill")
        generateGoto = true;
      else if (timestamp - lastAction.startTime > signalThreshold)
        generateGoto = true;
      if (generateGoto) {
        this.addAction({
          frame: {
            pageGuid: frame._page.guid,
            pageAlias,
            framePath: []
          },
          action: {
            name: "navigate",
            url: frame.url(),
            signals: []
          },
          startTime: timestamp,
          endTime: timestamp
        });
      }
      return;
    }
    (0, import_recorderUtils.generateFrameSelector)(frame).then((framePath) => {
      const signalInContext = {
        frame: {
          pageGuid: frame._page.guid,
          pageAlias,
          framePath
        },
        signal,
        timestamp
      };
      this._delegate.addSignal(signalInContext);
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RecorderSignalProcessor
});
