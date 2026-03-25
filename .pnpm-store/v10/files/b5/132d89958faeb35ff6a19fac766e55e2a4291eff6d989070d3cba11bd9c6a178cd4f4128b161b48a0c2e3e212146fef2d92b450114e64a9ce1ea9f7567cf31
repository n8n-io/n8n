const { EventEmitter } = require("events");

class AbortSignal {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.onabort = null;
    this.aborted = false;
    this.reason = undefined;
  }
  toString() {
    return "[object AbortSignal]";
  }
  get [Symbol.toStringTag]() {
    return "AbortSignal";
  }
  removeEventListener(name, handler) {
    this.eventEmitter.removeListener(name, handler);
  }
  addEventListener(name, handler) {
    this.eventEmitter.on(name, handler);
  }
  dispatchEvent(type) {
    const event = { type, target: this };
    const handlerName = `on${type}`;

    if (typeof this[handlerName] === "function") this[handlerName](event);

    this.eventEmitter.emit(type, event);
  }
  throwIfAborted() {
    if (this.aborted) {
      throw this.reason;
    }
  }
  static abort(reason) {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }
  static timeout(time) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("TimeoutError")), time);
    return controller.signal;
  }
}
class AbortController {
  constructor() {
    this.signal = new AbortSignal();
  }
  abort(reason) {
    if (this.signal.aborted) return;

    this.signal.aborted = true;

    if (reason) this.signal.reason = reason;
    else this.signal.reason = new Error("AbortError");

    this.signal.dispatchEvent("abort");
  }
  toString() {
    return "[object AbortController]";
  }
  get [Symbol.toStringTag]() {
    return "AbortController";
  }
}

module.exports = { AbortController, AbortSignal };
