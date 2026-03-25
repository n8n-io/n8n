"use strict";
module.exports = Event;

Event.CAPTURING_PHASE = 1;
Event.AT_TARGET = 2;
Event.BUBBLING_PHASE = 3;

function Event(type, dictionary) {
  // Initialize basic event properties
  this.type = '';
  this.target = null;
  this.currentTarget = null;
  this.eventPhase = Event.AT_TARGET;
  this.bubbles = false;
  this.cancelable = false;
  this.isTrusted = false;
  this.defaultPrevented = false;
  this.timeStamp = Date.now();

  // Initialize internal flags
  // XXX: Would it be better to inherit these defaults from the prototype?
  this._propagationStopped = false;
  this._immediatePropagationStopped = false;
  this._initialized = true;
  this._dispatching = false;

  // Now initialize based on the constructor arguments (if any)
  if (type) this.type = type;
  if (dictionary) {
    for(var p in dictionary) {
      this[p] = dictionary[p];
    }
  }
}

Event.prototype = Object.create(Object.prototype, {
  constructor: { value: Event },
  stopPropagation: { value: function stopPropagation() {
    this._propagationStopped = true;
  }},

  stopImmediatePropagation: { value: function stopImmediatePropagation() {
    this._propagationStopped = true;
    this._immediatePropagationStopped = true;
  }},

  preventDefault: { value: function preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }},

  initEvent: { value: function initEvent(type, bubbles, cancelable) {
    this._initialized = true;
    if (this._dispatching) return;

    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    this.defaultPrevented = false;
    this.isTrusted = false;

    this.target = null;
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
  }},

});
