var browser$1 = {exports: {}};

// shim for using process in browser
var process = browser$1.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ());
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop$1() {}

process.on = noop$1;
process.addListener = noop$1;
process.once = noop$1;
process.off = noop$1;
process.removeListener = noop$1;
process.removeAllListeners = noop$1;
process.emit = noop$1;
process.prependListener = noop$1;
process.prependOnceListener = noop$1;

process.listeners = function (name) { return [] };

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

function noop() {}
var browser = /** @type {boolean} */browser$1.exports.browser;
var emitWarning = noop;
var binding = /** @type {Function} */browser$1.exports.binding;
var exit = noop;
var pid = 1;
var features = {};
var kill = noop;
var dlopen = noop;
var uptime = noop;
var memoryUsage = noop;
var uvCounters = noop;
var platform = 'browser';
var arch = 'browser';
var execPath = 'browser';
var execArgv = /** @type {string[]} */[];
var api = {
  nextTick: browser$1.exports.nextTick,
  title: browser$1.exports.title,
  browser: browser,
  env: browser$1.exports.env,
  argv: browser$1.exports.argv,
  version: browser$1.exports.version,
  versions: browser$1.exports.versions,
  on: browser$1.exports.on,
  addListener: browser$1.exports.addListener,
  once: browser$1.exports.once,
  off: browser$1.exports.off,
  removeListener: browser$1.exports.removeListener,
  removeAllListeners: browser$1.exports.removeAllListeners,
  emit: browser$1.exports.emit,
  emitWarning: emitWarning,
  prependListener: browser$1.exports.prependListener,
  prependOnceListener: browser$1.exports.prependOnceListener,
  listeners: browser$1.exports.listeners,
  binding: binding,
  cwd: browser$1.exports.cwd,
  chdir: browser$1.exports.chdir,
  umask: browser$1.exports.umask,
  exit: exit,
  pid: pid,
  features: features,
  kill: kill,
  dlopen: dlopen,
  uptime: uptime,
  memoryUsage: memoryUsage,
  uvCounters: uvCounters,
  platform: platform,
  arch: arch,
  execPath: execPath,
  execArgv: execArgv
};

var addListener = browser$1.exports.addListener;
var argv = browser$1.exports.argv;
var chdir = browser$1.exports.chdir;
var cwd = browser$1.exports.cwd;
var emit = browser$1.exports.emit;
var env = browser$1.exports.env;
var listeners = browser$1.exports.listeners;
var nextTick = browser$1.exports.nextTick;
var off = browser$1.exports.off;
var on = browser$1.exports.on;
var once = browser$1.exports.once;
var prependListener = browser$1.exports.prependListener;
var prependOnceListener = browser$1.exports.prependOnceListener;
var removeAllListeners = browser$1.exports.removeAllListeners;
var removeListener = browser$1.exports.removeListener;
var title = browser$1.exports.title;
var umask = browser$1.exports.umask;
var version = browser$1.exports.version;
var versions = browser$1.exports.versions;
export { addListener, arch, argv, binding, browser, chdir, cwd, api as default, dlopen, emit, emitWarning, env, execArgv, execPath, exit, features, kill, listeners, memoryUsage, nextTick, off, on, once, pid, platform, prependListener, prependOnceListener, removeAllListeners, removeListener, title, umask, uptime, uvCounters, version, versions };
//# sourceMappingURL=browser.js.map
