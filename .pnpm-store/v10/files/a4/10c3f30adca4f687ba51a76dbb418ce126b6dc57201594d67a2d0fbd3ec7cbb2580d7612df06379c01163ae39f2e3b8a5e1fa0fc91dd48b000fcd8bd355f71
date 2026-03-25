'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);

/* globals unknown */
function noop() {}
/**
 * @param {unknown[]} arguments_
 */
function nextTick() {
  for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
    arguments_[_key] = arguments[_key];
  }
  var function_ = arguments_[0];
  arguments_.shift();
  setTimeout(function () {
    if (typeof function_ === 'function') {
      function_.apply(null, arguments_);
    }
  }, 0);
}

/**
 * @param {unknown} name
 */
function binding(name) {
  throw new Error('No such module. (Possibly not yet loaded)');
}
var features = {};
var platformName = 'browser';
var pid = 1;
var browser = true;
var environment = {};
/** @type {string[]} */
var argv = [];
var cwd = '/';
function getCwd() {
  return cwd;
}
/**
 * @param {string} dir
 */
function getChdir(dir) {
  cwd = path__default["default"].resolve(dir, cwd);
}

exports.arch = platformName;
exports.argv = argv;
exports.binding = binding;
exports.browser = browser;
exports.chdir = getChdir;
exports.cwd = getCwd;
exports.dlopen = noop;
exports.env = environment;
exports.execPath = platformName;
exports.exit = noop;
exports.features = features;
exports.kill = noop;
exports.memoryUsage = noop;
exports.nextTick = nextTick;
exports.pid = pid;
exports.platform = platformName;
exports.title = platformName;
exports.umask = noop;
exports.uptime = noop;
exports.uvCounters = noop;
//# sourceMappingURL=process.js.map
