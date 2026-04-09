"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _errors = require("./errors.js");
const stopped = (event, listener) => {
  return event.immediatePropagationStopped || event.eventPhase === event.CAPTURING_PHASE && listener.capture === false || event.eventPhase === event.BUBBLING_PHASE && listener.capture === true;
};

// http://www.w3.org/TR/dom/#concept-event-listener-invoke
const invokeEventListeners = (event, obj) => {
  event.currentTarget = obj;
  const errors = [];
  const invoke = callbackOrObject => {
    try {
      const callback = typeof callbackOrObject === "function" ? callbackOrObject : callbackOrObject.handleEvent;
      // @ts-expect-error EventCallback's types are not quite right here
      callback.call(event.currentTarget, event);
    } catch (err) {
      errors.push(err);
    }
  };

  // The callback might cause obj.listeners to mutate as we traverse it.
  // Take a copy of the array so that nothing sneaks in and we don't lose
  // our place.
  for (const listener of obj.listeners.slice()) {
    if (event.type !== listener.type || stopped(event, listener)) {
      continue;
    }
    invoke(listener.callback);
  }
  const typeToProp = {
    abort: "onabort",
    blocked: "onblocked",
    close: "onclose",
    complete: "oncomplete",
    error: "onerror",
    success: "onsuccess",
    upgradeneeded: "onupgradeneeded",
    versionchange: "onversionchange"
  };
  const prop = typeToProp[event.type];
  if (prop === undefined) {
    throw new Error(`Unknown event type: "${event.type}"`);
  }
  const callback = event.currentTarget[prop];
  if (callback) {
    const listener = {
      callback,
      capture: false,
      type: event.type
    };
    if (!stopped(event, listener)) {
      invoke(listener.callback);
    }
  }

  // we want to execute all listeners before deciding if we want to throw, because there could be an error thrown by
  // the first listener, but the second should still be invoked
  if (errors.length) {
    throw new AggregateError(errors);
  }
};
class FakeEventTarget {
  listeners = [];

  // These will be overridden in individual subclasses and made not readonly

  addEventListener(type, callback, options) {
    const capture = !!(typeof options === "object" && options ? options.capture : options);
    this.listeners.push({
      callback,
      capture,
      type
    });
  }
  removeEventListener(type, callback, options) {
    const capture = !!(typeof options === "object" && options ? options.capture : options);
    const i = this.listeners.findIndex(listener => {
      return listener.type === type && listener.callback === callback && listener.capture === capture;
    });
    this.listeners.splice(i, 1);
  }

  // http://www.w3.org/TR/dom/#dispatching-events
  dispatchEvent(event) {
    if (event.dispatched || !event.initialized) {
      throw new _errors.InvalidStateError("The object is in an invalid state.");
    }
    event.isTrusted = false;
    event.dispatched = true;
    event.target = this;
    // NOT SURE WHEN THIS SHOULD BE SET        event.eventPath = [];

    event.eventPhase = event.CAPTURING_PHASE;
    for (const obj of event.eventPath) {
      if (!event.propagationStopped) {
        invokeEventListeners(event, obj);
      }
    }
    event.eventPhase = event.AT_TARGET;
    if (!event.propagationStopped) {
      invokeEventListeners(event, event.target);
    }
    if (event.bubbles) {
      event.eventPath.reverse();
      event.eventPhase = event.BUBBLING_PHASE;
      for (const obj of event.eventPath) {
        if (!event.propagationStopped) {
          invokeEventListeners(event, obj);
        }
      }
    }
    event.dispatched = false;
    event.eventPhase = event.NONE;
    event.currentTarget = null;
    if (event.canceled) {
      return false;
    }
    return true;
  }
}
var _default = exports.default = FakeEventTarget;
module.exports = exports.default;