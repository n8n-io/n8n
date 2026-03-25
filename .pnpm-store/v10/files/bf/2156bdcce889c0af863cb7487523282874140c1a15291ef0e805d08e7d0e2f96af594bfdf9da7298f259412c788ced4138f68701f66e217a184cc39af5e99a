'use strict';

var _globalThis$console;
var _globalThis = function (Object) {
  function get() {
    var _global = this || self;
    delete Object.prototype.__magic__;
    return _global;
  }
  if (typeof globalThis === "object") {
    return globalThis;
  }
  if (this) {
    return get();
  } else {
    Object.defineProperty(Object.prototype, "__magic__", {
      configurable: true,
      get: get
    });
    var _global = __magic__;
    return _global;
  }
}(Object);
var _console = (_globalThis$console = _globalThis.console) != null ? _globalThis$console : {};
var consoleApi = {
  log: 1,
  info: 1,
  error: 1,
  warn: 1,
  dir: 1,
  trace: 1,
  assert: 1,
  time: 1,
  timeEnd: 1
};

/** @typedef {keyof consoleApi} ConsoleApi */

for (var property in consoleApi) {
  if (!_console[(/** @type {ConsoleApi} */property)]) {
    _console[(/** @type {ConsoleApi} */property)] = function () {};
  }
}

module.exports = _console;
//# sourceMappingURL=console.js.map
