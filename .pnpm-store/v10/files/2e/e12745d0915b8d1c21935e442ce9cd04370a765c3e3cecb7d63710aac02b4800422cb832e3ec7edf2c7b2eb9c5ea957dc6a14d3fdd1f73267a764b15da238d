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
var sigIntWatcher_exports = {};
__export(sigIntWatcher_exports, {
  SigIntWatcher: () => SigIntWatcher
});
module.exports = __toCommonJS(sigIntWatcher_exports);
class SigIntWatcher {
  constructor() {
    this._hadSignal = false;
    let sigintCallback;
    this._sigintPromise = new Promise((f) => sigintCallback = f);
    this._sigintHandler = () => {
      FixedNodeSIGINTHandler.off(this._sigintHandler);
      this._hadSignal = true;
      sigintCallback();
    };
    FixedNodeSIGINTHandler.on(this._sigintHandler);
  }
  promise() {
    return this._sigintPromise;
  }
  hadSignal() {
    return this._hadSignal;
  }
  disarm() {
    FixedNodeSIGINTHandler.off(this._sigintHandler);
  }
}
class FixedNodeSIGINTHandler {
  static {
    this._handlers = [];
  }
  static {
    this._ignoreNextSIGINTs = false;
  }
  static {
    this._handlerInstalled = false;
  }
  static {
    this._dispatch = () => {
      if (this._ignoreNextSIGINTs)
        return;
      this._ignoreNextSIGINTs = true;
      setTimeout(() => {
        this._ignoreNextSIGINTs = false;
        if (!this._handlers.length)
          this._uninstall();
      }, 1e3);
      for (const handler of this._handlers)
        handler();
    };
  }
  static _install() {
    if (!this._handlerInstalled) {
      this._handlerInstalled = true;
      process.on("SIGINT", this._dispatch);
    }
  }
  static _uninstall() {
    if (this._handlerInstalled) {
      this._handlerInstalled = false;
      process.off("SIGINT", this._dispatch);
    }
  }
  static on(handler) {
    this._handlers.push(handler);
    if (this._handlers.length === 1)
      this._install();
  }
  static off(handler) {
    this._handlers = this._handlers.filter((h) => h !== handler);
    if (!this._ignoreNextSIGINTs && !this._handlers.length)
      this._uninstall();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SigIntWatcher
});
