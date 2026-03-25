/*
  @license
	Rollup.js v2.79.2
	Thu, 26 Sep 2024 18:44:14 GMT - commit 48aef33cf2f2a6dfb175afb3bcd6a977c81f1d5c

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const require$$0$2 = require('fs');
const process$2 = require('process');
const index = require('./index.js');
const cli = require('../bin/rollup');
const rollup = require('./rollup.js');
const require$$0 = require('assert');
const require$$0$1 = require('events');
const loadConfigFile_js = require('./loadConfigFile.js');
const child_process = require('child_process');
require('util');
require('stream');
require('path');
require('os');
require('./mergeOptions.js');
require('perf_hooks');
require('crypto');
require('url');
require('tty');

function timeZone(date = new Date()) {
	const offset = date.getTimezoneOffset();
	const absOffset = Math.abs(offset);
	const hours = Math.floor(absOffset / 60);
	const minutes = absOffset % 60;
	const minutesOut = minutes > 0 ? ':' + ('0' + minutes).slice(-2) : '';
	return (offset < 0 ? '+' : '-') + hours + minutesOut;
}

function dateTime(options = {}) {
	let {
		date = new Date(),
		local = true,
		showTimeZone = false,
		showMilliseconds = false
	} = options;

	if (local) {
		// Offset the date so it will return the correct value when getting the ISO string.
		date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
	}

	let end = '';

	if (showTimeZone) {
		end = ' UTC' + (local ? timeZone(date) : '');
	}

	if (showMilliseconds && date.getUTCMilliseconds() > 0) {
		end = ` ${date.getUTCMilliseconds()}ms${end}`;
	}

	return date
		.toISOString()
		.replace(/T/, ' ')
		.replace(/\..+/, end);
}

var signalExit = {exports: {}};

var signals$1 = {exports: {}};

var hasRequiredSignals;

function requireSignals () {
	if (hasRequiredSignals) return signals$1.exports;
	hasRequiredSignals = 1;
	(function (module) {
		// This is not the set of all possible signals.
		//
		// It IS, however, the set of all signals that trigger
		// an exit on either Linux or BSD systems.  Linux is a
		// superset of the signal names supported on BSD, and
		// the unknown signals just fail to register, so we can
		// catch that easily enough.
		//
		// Don't bother with SIGKILL.  It's uncatchable, which
		// means that we can't fire any callbacks anyway.
		//
		// If a user does happen to register a handler on a non-
		// fatal signal like SIGWINCH or something, and then
		// exit, it'll end up firing `process.emit('exit')`, so
		// the handler will be fired anyway.
		//
		// SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
		// artificially, inherently leave the process in a
		// state from which it is not safe to try and enter JS
		// listeners.
		module.exports = [
		  'SIGABRT',
		  'SIGALRM',
		  'SIGHUP',
		  'SIGINT',
		  'SIGTERM'
		];

		if (process.platform !== 'win32') {
		  module.exports.push(
		    'SIGVTALRM',
		    'SIGXCPU',
		    'SIGXFSZ',
		    'SIGUSR2',
		    'SIGTRAP',
		    'SIGSYS',
		    'SIGQUIT',
		    'SIGIOT'
		    // should detect profiler and enable/disable accordingly.
		    // see #21
		    // 'SIGPROF'
		  );
		}

		if (process.platform === 'linux') {
		  module.exports.push(
		    'SIGIO',
		    'SIGPOLL',
		    'SIGPWR',
		    'SIGSTKFLT',
		    'SIGUNUSED'
		  );
		}
} (signals$1));
	return signals$1.exports;
}

// Note: since nyc uses this module to output coverage, any lines
// that are in the direct sync flow of nyc's outputCoverage are
// ignored, since we can never get coverage for them.
// grab a reference to node's real process object right away
var process$1 = rollup.commonjsGlobal.process;

const processOk = function (process) {
  return process &&
    typeof process === 'object' &&
    typeof process.removeListener === 'function' &&
    typeof process.emit === 'function' &&
    typeof process.reallyExit === 'function' &&
    typeof process.listeners === 'function' &&
    typeof process.kill === 'function' &&
    typeof process.pid === 'number' &&
    typeof process.on === 'function'
};

// some kind of non-node environment, just no-op
/* istanbul ignore if */
if (!processOk(process$1)) {
  signalExit.exports = function () {
    return function () {}
  };
} else {
  var assert = require$$0;
  var signals = requireSignals();
  var isWin = /^win/i.test(process$1.platform);

  var EE = require$$0$1;
  /* istanbul ignore if */
  if (typeof EE !== 'function') {
    EE = EE.EventEmitter;
  }

  var emitter;
  if (process$1.__signal_exit_emitter__) {
    emitter = process$1.__signal_exit_emitter__;
  } else {
    emitter = process$1.__signal_exit_emitter__ = new EE();
    emitter.count = 0;
    emitter.emitted = {};
  }

  // Because this emitter is a global, we have to check to see if a
  // previous version of this library failed to enable infinite listeners.
  // I know what you're about to say.  But literally everything about
  // signal-exit is a compromise with evil.  Get used to it.
  if (!emitter.infinite) {
    emitter.setMaxListeners(Infinity);
    emitter.infinite = true;
  }

  signalExit.exports = function (cb, opts) {
    /* istanbul ignore if */
    if (!processOk(rollup.commonjsGlobal.process)) {
      return function () {}
    }
    assert.equal(typeof cb, 'function', 'a callback must be provided for exit handler');

    if (loaded === false) {
      load();
    }

    var ev = 'exit';
    if (opts && opts.alwaysLast) {
      ev = 'afterexit';
    }

    var remove = function () {
      emitter.removeListener(ev, cb);
      if (emitter.listeners('exit').length === 0 &&
          emitter.listeners('afterexit').length === 0) {
        unload();
      }
    };
    emitter.on(ev, cb);

    return remove
  };

  var unload = function unload () {
    if (!loaded || !processOk(rollup.commonjsGlobal.process)) {
      return
    }
    loaded = false;

    signals.forEach(function (sig) {
      try {
        process$1.removeListener(sig, sigListeners[sig]);
      } catch (er) {}
    });
    process$1.emit = originalProcessEmit;
    process$1.reallyExit = originalProcessReallyExit;
    emitter.count -= 1;
  };
  signalExit.exports.unload = unload;

  var emit = function emit (event, code, signal) {
    /* istanbul ignore if */
    if (emitter.emitted[event]) {
      return
    }
    emitter.emitted[event] = true;
    emitter.emit(event, code, signal);
  };

  // { <signal>: <listener fn>, ... }
  var sigListeners = {};
  signals.forEach(function (sig) {
    sigListeners[sig] = function listener () {
      /* istanbul ignore if */
      if (!processOk(rollup.commonjsGlobal.process)) {
        return
      }
      // If there are no other listeners, an exit is coming!
      // Simplest way: remove us and then re-send the signal.
      // We know that this will kill the process, so we can
      // safely emit now.
      var listeners = process$1.listeners(sig);
      if (listeners.length === emitter.count) {
        unload();
        emit('exit', null, sig);
        /* istanbul ignore next */
        emit('afterexit', null, sig);
        /* istanbul ignore next */
        if (isWin && sig === 'SIGHUP') {
          // "SIGHUP" throws an `ENOSYS` error on Windows,
          // so use a supported signal instead
          sig = 'SIGINT';
        }
        /* istanbul ignore next */
        process$1.kill(process$1.pid, sig);
      }
    };
  });

  signalExit.exports.signals = function () {
    return signals
  };

  var loaded = false;

  var load = function load () {
    if (loaded || !processOk(rollup.commonjsGlobal.process)) {
      return
    }
    loaded = true;

    // This is the number of onSignalExit's that are in play.
    // It's important so that we can count the correct number of
    // listeners on signals, and don't wait for the other one to
    // handle it instead of us.
    emitter.count += 1;

    signals = signals.filter(function (sig) {
      try {
        process$1.on(sig, sigListeners[sig]);
        return true
      } catch (er) {
        return false
      }
    });

    process$1.emit = processEmit;
    process$1.reallyExit = processReallyExit;
  };
  signalExit.exports.load = load;

  var originalProcessReallyExit = process$1.reallyExit;
  var processReallyExit = function processReallyExit (code) {
    /* istanbul ignore if */
    if (!processOk(rollup.commonjsGlobal.process)) {
      return
    }
    process$1.exitCode = code || /* istanbul ignore next */ 0;
    emit('exit', process$1.exitCode, null);
    /* istanbul ignore next */
    emit('afterexit', process$1.exitCode, null);
    /* istanbul ignore next */
    originalProcessReallyExit.call(process$1, process$1.exitCode);
  };

  var originalProcessEmit = process$1.emit;
  var processEmit = function processEmit (ev, arg) {
    if (ev === 'exit' && processOk(rollup.commonjsGlobal.process)) {
      /* istanbul ignore else */
      if (arg !== undefined) {
        process$1.exitCode = arg;
      }
      var ret = originalProcessEmit.apply(this, arguments);
      /* istanbul ignore next */
      emit('exit', process$1.exitCode, null);
      /* istanbul ignore next */
      emit('afterexit', process$1.exitCode, null);
      /* istanbul ignore next */
      return ret
    } else {
      return originalProcessEmit.apply(this, arguments)
    }
  };
}

const CLEAR_SCREEN = '\u001Bc';
function getResetScreen(configs, allowClearScreen) {
    let clearScreen = allowClearScreen;
    for (const config of configs) {
        if (config.watch && config.watch.clearScreen === false) {
            clearScreen = false;
        }
    }
    if (clearScreen) {
        return (heading) => loadConfigFile_js.stderr(CLEAR_SCREEN + heading);
    }
    let firstRun = true;
    return (heading) => {
        if (firstRun) {
            loadConfigFile_js.stderr(heading);
            firstRun = false;
        }
    };
}

function extractWatchHooks(command) {
    if (!Array.isArray(command.watch))
        return {};
    return command.watch
        .filter(value => typeof value === 'object')
        .reduce((acc, keyValueOption) => ({ ...acc, ...keyValueOption }), {});
}
function createWatchHooks(command) {
    const watchHooks = extractWatchHooks(command);
    return function (hook) {
        if (watchHooks[hook]) {
            const cmd = watchHooks[hook];
            if (!command.silent) {
                loadConfigFile_js.stderr(loadConfigFile_js.cyan(`watch.${hook} ${loadConfigFile_js.bold(`$ ${cmd}`)}`));
            }
            try {
                // !! important - use stderr for all writes from execSync
                const stdio = [process.stdin, process.stderr, process.stderr];
                child_process.execSync(cmd, { stdio: command.silent ? 'ignore' : stdio });
            }
            catch (e) {
                loadConfigFile_js.stderr(e.message);
            }
        }
    };
}

async function watch(command) {
    process$2.env.ROLLUP_WATCH = 'true';
    const isTTY = process$2.stderr.isTTY;
    const silent = command.silent;
    let watcher;
    let configWatcher;
    let resetScreen;
    const configFile = command.config ? await cli.getConfigPath(command.config) : null;
    const runWatchHook = createWatchHooks(command);
    signalExit.exports(close);
    process$2.on('uncaughtException', close);
    if (!process$2.stdin.isTTY) {
        process$2.stdin.on('end', close);
        process$2.stdin.resume();
    }
    async function loadConfigFromFileAndTrack(configFile) {
        let configFileData = null;
        let configFileRevision = 0;
        configWatcher = index.chokidar.watch(configFile).on('change', reloadConfigFile);
        await reloadConfigFile();
        async function reloadConfigFile() {
            try {
                const newConfigFileData = await require$$0$2.promises.readFile(configFile, 'utf8');
                if (newConfigFileData === configFileData) {
                    return;
                }
                configFileRevision++;
                const currentConfigFileRevision = configFileRevision;
                if (configFileData) {
                    loadConfigFile_js.stderr(`\nReloading updated config...`);
                }
                configFileData = newConfigFileData;
                const { options, warnings } = await loadConfigFile_js.loadAndParseConfigFile(configFile, command);
                if (currentConfigFileRevision !== configFileRevision) {
                    return;
                }
                if (watcher) {
                    await watcher.close();
                }
                start(options, warnings);
            }
            catch (err) {
                loadConfigFile_js.handleError(err, true);
            }
        }
    }
    if (configFile) {
        await loadConfigFromFileAndTrack(configFile);
    }
    else {
        const { options, warnings } = await cli.loadConfigFromCommand(command);
        start(options, warnings);
    }
    function start(configs, warnings) {
        try {
            watcher = rollup.watch(configs);
        }
        catch (err) {
            return loadConfigFile_js.handleError(err);
        }
        watcher.on('event', event => {
            switch (event.code) {
                case 'ERROR':
                    warnings.flush();
                    loadConfigFile_js.handleError(event.error, true);
                    runWatchHook('onError');
                    break;
                case 'START':
                    if (!silent) {
                        if (!resetScreen) {
                            resetScreen = getResetScreen(configs, isTTY);
                        }
                        resetScreen(loadConfigFile_js.underline(`rollup v${rollup.version}`));
                    }
                    runWatchHook('onStart');
                    break;
                case 'BUNDLE_START':
                    if (!silent) {
                        let input = event.input;
                        if (typeof input !== 'string') {
                            input = Array.isArray(input)
                                ? input.join(', ')
                                : Object.values(input).join(', ');
                        }
                        loadConfigFile_js.stderr(loadConfigFile_js.cyan(`bundles ${loadConfigFile_js.bold(input)} → ${loadConfigFile_js.bold(event.output.map(rollup.relativeId).join(', '))}...`));
                    }
                    runWatchHook('onBundleStart');
                    break;
                case 'BUNDLE_END':
                    warnings.flush();
                    if (!silent)
                        loadConfigFile_js.stderr(loadConfigFile_js.green(`created ${loadConfigFile_js.bold(event.output.map(rollup.relativeId).join(', '))} in ${loadConfigFile_js.bold(cli.ms(event.duration))}`));
                    runWatchHook('onBundleEnd');
                    if (event.result && event.result.getTimings) {
                        cli.printTimings(event.result.getTimings());
                    }
                    break;
                case 'END':
                    runWatchHook('onEnd');
                    if (!silent && isTTY) {
                        loadConfigFile_js.stderr(`\n[${dateTime()}] waiting for changes...`);
                    }
            }
            if ('result' in event && event.result) {
                event.result.close().catch(error => loadConfigFile_js.handleError(error, true));
            }
        });
    }
    async function close(code) {
        process$2.removeListener('uncaughtException', close);
        // removing a non-existent listener is a no-op
        process$2.stdin.removeListener('end', close);
        if (watcher)
            await watcher.close();
        if (configWatcher)
            configWatcher.close();
        if (code) {
            process$2.exit(code);
        }
    }
}

exports.watch = watch;
//# sourceMappingURL=watch-cli.js.map
