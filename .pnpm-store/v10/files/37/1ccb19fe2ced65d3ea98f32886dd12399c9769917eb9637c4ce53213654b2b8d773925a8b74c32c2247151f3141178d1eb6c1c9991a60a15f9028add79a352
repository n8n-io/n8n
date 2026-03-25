"use strict";

const { setupForSimpleEventAccessors } = require("../helpers/create-event-accessor");
const { fireAnEvent } = require("../helpers/events");
const EventTargetImpl = require("../events/EventTarget-impl").implementation;
const AbortSignal = require("../generated/AbortSignal");
const DOMException = require("../generated/DOMException");

class AbortSignalImpl extends EventTargetImpl {
  constructor(globalObject, args, privateData) {
    super(globalObject, args, privateData);

    // make event firing possible
    this._ownerDocument = globalObject.document;

    this.reason = undefined;
    this.abortAlgorithms = new Set();
  }

  get aborted() {
    return this.reason !== undefined;
  }

  throwIfAborted() {
    if (this.aborted) {
      throw this.reason;
    }
  }

  static abort(globalObject, reason) {
    const abortSignal = AbortSignal.createImpl(globalObject, []);
    if (reason !== undefined) {
      abortSignal.reason = reason;
    } else {
      abortSignal.reason = DOMException.create(globalObject, ["The operation was aborted.", "AbortError"]);
    }
    return abortSignal;
  }

  static timeout(globalObject, milliseconds) {
    const signal = AbortSignal.createImpl(globalObject, []);
    globalObject.setTimeout(() => {
      signal._signalAbort(DOMException.create(globalObject, ["The operation timed out.", "TimeoutError"]));
    }, milliseconds);

    return signal;
  }

  _signalAbort(reason) {
    if (this.aborted) {
      return;
    }

    if (reason !== undefined) {
      this.reason = reason;
    } else {
      this.reason = DOMException.create(this._globalObject, ["The operation was aborted.", "AbortError"]);
    }

    for (const algorithm of this.abortAlgorithms) {
      algorithm();
    }
    this.abortAlgorithms.clear();

    fireAnEvent("abort", this);
  }

  _addAlgorithm(algorithm) {
    if (this.aborted) {
      return;
    }
    this.abortAlgorithms.add(algorithm);
  }

  _removeAlgorithm(algorithm) {
    this.abortAlgorithms.delete(algorithm);
  }
}

setupForSimpleEventAccessors(AbortSignalImpl.prototype, ["abort"]);

module.exports = {
  implementation: AbortSignalImpl
};
