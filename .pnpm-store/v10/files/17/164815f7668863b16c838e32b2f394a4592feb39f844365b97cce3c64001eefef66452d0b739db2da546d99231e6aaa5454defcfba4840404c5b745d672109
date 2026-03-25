"use strict";
var Event = require('./Event');

module.exports = UIEvent;

function UIEvent() {
  // Just use the superclass constructor to initialize
  Event.call(this);
  this.view = null; // FF uses the current window
  this.detail = 0;
}
UIEvent.prototype = Object.create(Event.prototype, {
  constructor: { value: UIEvent },
  initUIEvent: { value: function(type, bubbles, cancelable, view, detail) {
    this.initEvent(type, bubbles, cancelable);
    this.view = view;
    this.detail = detail;
  }}
});
