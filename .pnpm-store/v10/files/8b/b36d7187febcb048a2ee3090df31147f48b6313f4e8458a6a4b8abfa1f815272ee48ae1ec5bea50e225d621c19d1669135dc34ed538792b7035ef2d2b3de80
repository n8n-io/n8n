"use strict";
module.exports = CustomEvent;

var Event = require('./Event');

function CustomEvent(type, dictionary) {
  // Just use the superclass constructor to initialize
  Event.call(this, type, dictionary);
}
CustomEvent.prototype = Object.create(Event.prototype, {
  constructor: { value: CustomEvent }
});
