"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  cleanup: true,
  render: true,
  fireEvent: true
};
Object.defineProperty(exports, "cleanup", {
  enumerable: true,
  get: function get() {
    return _render.cleanup;
  }
});
Object.defineProperty(exports, "fireEvent", {
  enumerable: true,
  get: function get() {
    return _fireEvent.fireEvent;
  }
});
Object.defineProperty(exports, "render", {
  enumerable: true,
  get: function get() {
    return _render.render;
  }
});
var _render = require("./render");
var _dom = require("@testing-library/dom");
Object.keys(_dom).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _dom[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _dom[key];
    }
  });
});
var _fireEvent = require("./fire-event");
// If we're running in a test runner that supports afterEach then we'll
// automatically run cleanup after each test.
// This ensures that tests run in isolation from each other.
// If you don't like this, set the VTL_SKIP_AUTO_CLEANUP variable to 'true'.
if (typeof afterEach === 'function' && !process.env.VTL_SKIP_AUTO_CLEANUP) {
  afterEach(() => {
    (0, _render.cleanup)();
  });
}