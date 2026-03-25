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
var eventEmitter_exports = {};
__export(eventEmitter_exports, {
  EventEmitter: () => EventEmitter
});
module.exports = __toCommonJS(eventEmitter_exports);
class EventEmitter {
  constructor(platform) {
    this._events = void 0;
    this._eventsCount = 0;
    this._maxListeners = void 0;
    this._pendingHandlers = /* @__PURE__ */ new Map();
    this._platform = platform;
    if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || void 0;
    this.on = this.addListener;
    this.off = this.removeListener;
  }
  setMaxListeners(n) {
    if (typeof n !== "number" || n < 0 || Number.isNaN(n))
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
    this._maxListeners = n;
    return this;
  }
  getMaxListeners() {
    return this._maxListeners === void 0 ? this._platform.defaultMaxListeners() : this._maxListeners;
  }
  emit(type, ...args) {
    const events = this._events;
    if (events === void 0)
      return false;
    const handler = events?.[type];
    if (handler === void 0)
      return false;
    if (typeof handler === "function") {
      this._callHandler(type, handler, args);
    } else {
      const len = handler.length;
      const listeners = handler.slice();
      for (let i = 0; i < len; ++i)
        this._callHandler(type, listeners[i], args);
    }
    return true;
  }
  _callHandler(type, handler, args) {
    const promise = Reflect.apply(handler, this, args);
    if (!(promise instanceof Promise))
      return;
    let set = this._pendingHandlers.get(type);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this._pendingHandlers.set(type, set);
    }
    set.add(promise);
    promise.catch((e) => {
      if (this._rejectionHandler)
        this._rejectionHandler(e);
      else
        throw e;
    }).finally(() => set.delete(promise));
  }
  addListener(type, listener) {
    return this._addListener(type, listener, false);
  }
  on(type, listener) {
    return this._addListener(type, listener, false);
  }
  _addListener(type, listener, prepend) {
    checkListener(listener);
    let events = this._events;
    let existing;
    if (events === void 0) {
      events = this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    } else {
      if (events.newListener !== void 0) {
        this.emit("newListener", type, unwrapListener(listener));
        events = this._events;
      }
      existing = events[type];
    }
    if (existing === void 0) {
      existing = events[type] = listener;
      ++this._eventsCount;
    } else {
      if (typeof existing === "function") {
        existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      } else if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
      const m = this.getMaxListeners();
      if (m > 0 && existing.length > m && !existing.warned) {
        existing.warned = true;
        const w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        w.name = "MaxListenersExceededWarning";
        w.emitter = this;
        w.type = type;
        w.count = existing.length;
        if (!this._platform.isUnderTest()) {
          console.warn(w);
        }
      }
    }
    return this;
  }
  prependListener(type, listener) {
    return this._addListener(type, listener, true);
  }
  once(type, listener) {
    checkListener(listener);
    this.on(type, new OnceWrapper(this, type, listener).wrapperFunction);
    return this;
  }
  prependOnceListener(type, listener) {
    checkListener(listener);
    this.prependListener(type, new OnceWrapper(this, type, listener).wrapperFunction);
    return this;
  }
  removeListener(type, listener) {
    checkListener(listener);
    const events = this._events;
    if (events === void 0)
      return this;
    const list = events[type];
    if (list === void 0)
      return this;
    if (list === listener || list.listener === listener) {
      if (--this._eventsCount === 0) {
        this._events = /* @__PURE__ */ Object.create(null);
      } else {
        delete events[type];
        if (events.removeListener)
          this.emit("removeListener", type, list.listener ?? listener);
      }
    } else if (typeof list !== "function") {
      let position = -1;
      let originalListener;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i] === listener || wrappedListener(list[i]) === listener) {
          originalListener = wrappedListener(list[i]);
          position = i;
          break;
        }
      }
      if (position < 0)
        return this;
      if (position === 0)
        list.shift();
      else
        list.splice(position, 1);
      if (list.length === 1)
        events[type] = list[0];
      if (events.removeListener !== void 0)
        this.emit("removeListener", type, originalListener || listener);
    }
    return this;
  }
  off(type, listener) {
    return this.removeListener(type, listener);
  }
  removeAllListeners(type, options) {
    this._removeAllListeners(type);
    if (!options)
      return this;
    if (options.behavior === "wait") {
      const errors = [];
      this._rejectionHandler = (error) => errors.push(error);
      return this._waitFor(type).then(() => {
        if (errors.length)
          throw errors[0];
      });
    }
    if (options.behavior === "ignoreErrors")
      this._rejectionHandler = () => {
      };
    return Promise.resolve();
  }
  _removeAllListeners(type) {
    const events = this._events;
    if (!events)
      return;
    if (!events.removeListener) {
      if (type === void 0) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      } else if (events[type] !== void 0) {
        if (--this._eventsCount === 0)
          this._events = /* @__PURE__ */ Object.create(null);
        else
          delete events[type];
      }
      return;
    }
    if (type === void 0) {
      const keys = Object.keys(events);
      let key;
      for (let i = 0; i < keys.length; ++i) {
        key = keys[i];
        if (key === "removeListener")
          continue;
        this._removeAllListeners(key);
      }
      this._removeAllListeners("removeListener");
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
      return;
    }
    const listeners = events[type];
    if (typeof listeners === "function") {
      this.removeListener(type, listeners);
    } else if (listeners !== void 0) {
      for (let i = listeners.length - 1; i >= 0; i--)
        this.removeListener(type, listeners[i]);
    }
  }
  listeners(type) {
    return this._listeners(this, type, true);
  }
  rawListeners(type) {
    return this._listeners(this, type, false);
  }
  listenerCount(type) {
    const events = this._events;
    if (events !== void 0) {
      const listener = events[type];
      if (typeof listener === "function")
        return 1;
      if (listener !== void 0)
        return listener.length;
    }
    return 0;
  }
  eventNames() {
    return this._eventsCount > 0 && this._events ? Reflect.ownKeys(this._events) : [];
  }
  async _waitFor(type) {
    let promises = [];
    if (type) {
      promises = [...this._pendingHandlers.get(type) || []];
    } else {
      promises = [];
      for (const [, pending] of this._pendingHandlers)
        promises.push(...pending);
    }
    await Promise.all(promises);
  }
  _listeners(target, type, unwrap) {
    const events = target._events;
    if (events === void 0)
      return [];
    const listener = events[type];
    if (listener === void 0)
      return [];
    if (typeof listener === "function")
      return unwrap ? [unwrapListener(listener)] : [listener];
    return unwrap ? unwrapListeners(listener) : listener.slice();
  }
}
function checkListener(listener) {
  if (typeof listener !== "function")
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
}
class OnceWrapper {
  constructor(eventEmitter, eventType, listener) {
    this._fired = false;
    this._eventEmitter = eventEmitter;
    this._eventType = eventType;
    this._listener = listener;
    this.wrapperFunction = this._handle.bind(this);
    this.wrapperFunction.listener = listener;
  }
  _handle(...args) {
    if (this._fired)
      return;
    this._fired = true;
    this._eventEmitter.removeListener(this._eventType, this.wrapperFunction);
    return this._listener.apply(this._eventEmitter, args);
  }
}
function unwrapListener(l) {
  return wrappedListener(l) ?? l;
}
function unwrapListeners(arr) {
  return arr.map((l) => wrappedListener(l) ?? l);
}
function wrappedListener(l) {
  return l.listener;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EventEmitter
});
