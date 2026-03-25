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
var events_exports = {};
__export(events_exports, {
  Disposable: () => Disposable,
  EventEmitter: () => EventEmitter
});
module.exports = __toCommonJS(events_exports);
var Disposable;
((Disposable2) => {
  function disposeAll(disposables) {
    for (const disposable of disposables.splice(0))
      disposable.dispose();
  }
  Disposable2.disposeAll = disposeAll;
})(Disposable || (Disposable = {}));
class EventEmitter {
  constructor() {
    this._listeners = /* @__PURE__ */ new Set();
    this.event = (listener, disposables) => {
      this._listeners.add(listener);
      let disposed = false;
      const self = this;
      const result = {
        dispose() {
          if (!disposed) {
            disposed = true;
            self._listeners.delete(listener);
          }
        }
      };
      if (disposables)
        disposables.push(result);
      return result;
    };
  }
  fire(event) {
    const dispatch = !this._deliveryQueue;
    if (!this._deliveryQueue)
      this._deliveryQueue = [];
    for (const listener of this._listeners)
      this._deliveryQueue.push({ listener, event });
    if (!dispatch)
      return;
    for (let index = 0; index < this._deliveryQueue.length; index++) {
      const { listener, event: event2 } = this._deliveryQueue[index];
      listener.call(null, event2);
    }
    this._deliveryQueue = void 0;
  }
  dispose() {
    this._listeners.clear();
    if (this._deliveryQueue)
      this._deliveryQueue = [];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Disposable,
  EventEmitter
});
