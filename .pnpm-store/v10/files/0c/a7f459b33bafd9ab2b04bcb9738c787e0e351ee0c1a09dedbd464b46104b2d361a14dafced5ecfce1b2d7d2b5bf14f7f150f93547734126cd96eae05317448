"use strict";
var URL = require('./URL');
var URLUtils = require('./URLUtils');

module.exports = Location;

function Location(window, href) {
  this._window = window;
  this._href = href;
}

Location.prototype = Object.create(URLUtils.prototype, {
  constructor: { value: Location },

  // Special behavior when href is set
  href: {
    get: function() { return this._href; },
    set: function(v) { this.assign(v); }
  },

  assign: { value: function(url) {
    // Resolve the new url against the current one
    // XXX:
    // This is not actually correct. It should be resolved against
    // the URL of the document of the script. For now, though, I only
    // support a single window and there is only one base url.
    // So this is good enough for now.
    var current = new URL(this._href);
    var newurl = current.resolve(url);

    // Save the new url
    this._href = newurl;

    // Start loading the new document!
    // XXX
    // This is just something hacked together.
    // The real algorithm is: http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#navigate
  }},

  replace: { value: function(url) {
    // XXX
    // Since we aren't tracking history yet, replace is the same as assign
    this.assign(url);
  }},

  reload: { value: function() {
    // XXX:
    // Actually, the spec is a lot more complicated than this
    this.assign(this.href);
  }},

  toString: { value: function() {
    return this.href;
  }}

});
