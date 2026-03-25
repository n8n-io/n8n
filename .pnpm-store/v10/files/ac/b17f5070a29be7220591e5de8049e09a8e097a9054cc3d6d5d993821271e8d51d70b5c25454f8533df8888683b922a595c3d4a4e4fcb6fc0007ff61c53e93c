import path from 'path';

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
  cwd = path.resolve(dir, cwd);
}

export { platformName as arch, argv, binding, browser, getChdir as chdir, getCwd as cwd, noop as dlopen, environment as env, platformName as execPath, noop as exit, features, noop as kill, noop as memoryUsage, nextTick, pid, platformName as platform, platformName as title, noop as umask, noop as uptime, noop as uvCounters };
//# sourceMappingURL=process.js.map
