"use strict";

const { setupForSimpleEventAccessors } = require("../helpers/create-event-accessor");
const { fireAnEvent } = require("../helpers/events");
const EventTargetImpl = require("../events/EventTarget-impl").implementation;
const AbortSignal = require("../generated/AbortSignal");
const DOMException = require("domexception/webidl2js-wrapper");

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

  static abort(globalObject, reason) {
    const abortSignal = AbortSignal.createImpl(globalObject, []);
    if (reason !== undefined) {
      abortSignal.reason = reason;
    } else {
      abortSignal.reason = DOMException.create(globalObject, ["The operation was aborted.", "AbortError"]);
    }
    return abortSignal;
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
