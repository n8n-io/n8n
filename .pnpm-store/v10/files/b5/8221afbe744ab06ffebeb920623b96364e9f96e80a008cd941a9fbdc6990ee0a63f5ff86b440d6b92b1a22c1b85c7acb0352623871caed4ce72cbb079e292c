var debug = require('debug')('nodemon:run');
const statSync = require('fs').statSync;
var utils = require('../utils');
var bus = utils.bus;
var childProcess = require('child_process');
var spawn = childProcess.spawn;
var exec = childProcess.exec;
var execSync = childProcess.execSync;
var fork = childProcess.fork;
var watch = require('./watch').watch;
var config = require('../config');
var child = null; // the actual child process we spawn
var killedAfterChange = false;
var noop = () => {};
var restart = null;
var psTree = require('pstree.remy');
var path = require('path');
var signals = require('./signals');
const undefsafe = require('undefsafe');
const osRelease = parseInt(require('os').release().split('.')[0], 10);

function run(options) {
  var cmd = config.command.raw;
  // moved up
  // we need restart function below in the global scope for run.kill
  /*jshint validthis:true*/
  restart = run.bind(this, options);
  run.restart = restart;

  // binding options with instance of run
  // so that we can use it in run.kill
  run.options = options;

  var runCmd = !options.runOnChangeOnly || config.lastStarted !== 0;
  if (runCmd) {
    utils.log.status('starting `' + config.command.string + '`');
  } else {
    // should just watch file if command is not to be run
    // had another alternate approach
    // to stop process being forked/spawned in the below code
    // but this approach does early exit and makes code cleaner
    debug('start watch on: %s', config.options.watch);
    if (config.options.watch !== false) {
      watch();
      return;
    }
  }

  config.lastStarted = Date.now();

  var stdio = ['pipe', 'pipe', 'pipe'];

  if (config.options.stdout) {
    stdio = ['pipe', process.stdout, process.stderr];
  }

  if (config.options.stdin === false) {
    stdio = [process.stdin, process.stdout, process.stderr];
  }

  var sh = 'sh';
  var shFlag = '-c';

  const binPath = process.cwd() + '/node_modules/.bin';

  const spawnOptions = {
    env: Object.assign({}, options.execOptions.env, process.env, {
      PATH:
        binPath +
        path.delimiter +
        (undefsafe(options, '.execOptions.env.PATH') || process.env.PATH),
    }),
    stdio: stdio,
  };

  var executable = cmd.executable;

  if (utils.isWindows) {
    // if the exec includes a forward slash, reverse it for windows compat
    // but *only* apply to the first command, and none of the arguments.
    // ref #1251 and #1236
    if (executable.indexOf('/') !== -1) {
      executable = executable
        .split(' ')
        .map((e, i) => {
          if (i === 0) {
            return path.normalize(e);
          }
          return e;
        })
        .join(' ');
    }
    // taken from npm's cli: https://git.io/vNFD4
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
    spawnOptions.windowsVerbatimArguments = true;
    spawnOptions.windowsHide = true;
  }

  var args = runCmd ? utils.stringify(executable, cmd.args) : ':';
  var spawnArgs = [sh, [shFlag, args], spawnOptions];

  const firstArg = cmd.args[0] || '';

  var inBinPath = false;
  try {
    inBinPath = statSync(`${binPath}/${executable}`).isFile();
  } catch (e) {}

  // hasStdio allows us to correctly handle stdin piping
  // see: https://git.io/vNtX3
  const hasStdio = utils.satisfies('>= 6.4.0 || < 5');

  // forking helps with sub-process handling and tends to clean up better
  // than spawning, but it should only be used under specific conditions
  const shouldFork =
    !config.options.spawn &&
    !inBinPath &&
    !(firstArg.indexOf('-') === 0) && // don't fork if there's a node exec arg
    firstArg !== 'inspect' && // don't fork it's `inspect` debugger
    executable === 'node' && // only fork if node
    utils.version.major > 4; // only fork if node version > 4

  if (shouldFork) {
    // this assumes the first argument is the script and slices it out, since
    // we're forking
    var forkArgs = cmd.args.slice(1);
    var env = utils.merge(options.execOptions.env, process.env);
    stdio.push('ipc');
    const forkOptions = {
      env: env,
      stdio: stdio,
      silent: !hasStdio,
    };
    if (utils.isWindows) {
      forkOptions.windowsHide = true;
    }
    child = fork(options.execOptions.script, forkArgs, forkOptions);
    utils.log.detail('forking');
    debug('fork', sh, shFlag, args);
  } else {
    utils.log.detail('spawning');
    child = spawn.apply(null, spawnArgs);
    debug('spawn', sh, shFlag, args);
  }

  if (config.required) {
    var emit = {
      stdout: function (data) {
        bus.emit('stdout', data);
      },
      stderr: function (data) {
        bus.emit('stderr', data);
      },
    };

    // now work out what to bind to...
    if (config.options.stdout) {
      child.on('stdout', emit.stdout).on('stderr', emit.stderr);
    } else {
      child.stdout.on('data', emit.stdout);
      child.stderr.on('data', emit.stderr);

      bus.stdout = child.stdout;
      bus.stderr = child.stderr;
    }

    if (shouldFork) {
      child.on('message', function (message, sendHandle) {
        bus.emit('message', message, sendHandle);
      });
    }
  }

  bus.emit('start');

  utils.log.detail('child pid: ' + child.pid);

  child.on('error', function (error) {
    bus.emit('error', error);
    if (error.code === 'ENOENT') {
      utils.log.error('unable to run executable: "' + cmd.executable + '"');
      process.exit(1);
    } else {
      utils.log.error('failed to start child process: ' + error.code);
      throw error;
    }
  });

  child.on('exit', function (code, signal) {
    if (child && child.stdin) {
      process.stdin.unpipe(child.stdin);
    }

    if (code === 127) {
      utils.log.error(
        'failed to start process, "' + cmd.executable + '" exec not found'
      );
      bus.emit('error', code);
      process.exit();
    }

    // If the command failed with code 2, it may or may not be a syntax error
    // See: http://git.io/fNOAR
    // We will only assume a parse error, if the child failed quickly
    if (code === 2 && Date.now() < config.lastStarted + 500) {
      utils.log.error('process failed, unhandled exit code (2)');
      utils.log.error('');
      utils.log.error('Either the command has a syntax error,');
      utils.log.error('or it is exiting with reserved code 2.');
      utils.log.error('');
      utils.log.error('To keep nodemon running even after a code 2,');
      utils.log.error('add this to the end of your command: || exit 1');
      utils.log.error('');
      utils.log.error('Read more here: https://git.io/fNOAG');
      utils.log.error('');
      utils.log.error('nodemon will stop now so that you can fix the command.');
      utils.log.error('');
      bus.emit('error', code);
      process.exit();
    }

    // In case we killed the app ourselves, set the signal thusly
    if (killedAfterChange) {
      killedAfterChange = false;
      signal = config.signal;
    }
    // this is nasty, but it gives it windows support
    if (utils.isWindows && signal === 'SIGTERM') {
      signal = config.signal;
    }

    if (signal === config.signal || code === 0) {
      // this was a clean exit, so emit exit, rather than crash
      debug('bus.emit(exit) via ' + config.signal);
      bus.emit('exit', signal);

      // exit the monitor, but do it gracefully
      if (signal === config.signal) {
        return restart();
      }

      if (code === 0) {
        // clean exit - wait until file change to restart
        if (runCmd) {
          utils.log.status('clean exit - waiting for changes before restart');
        }
        child = null;
      }
    } else {
      bus.emit('crash');

      // support the old syntax of `exitcrash` - 2024-12-13
      if (options.exitcrash) {
        options.exitCrash = true;
        delete options.exitcrash;
      }

      if (options.exitCrash) {
        utils.log.fail('app crashed');
        if (!config.required) {
          process.exit(1);
        }
      } else {
        utils.log.fail(
          'app crashed - waiting for file changes before' + ' starting...'
        );
        child = null;
      }
    }

    if (config.options.restartable) {
      // stdin needs to kick in again to be able to listen to the
      // restart command
      process.stdin.resume();
    }
  });

  // moved the run.kill outside to handle both the cases
  // intial start
  // no start

  // connect stdin to the child process (options.stdin is on by default)
  if (options.stdin) {
    process.stdin.resume();
    // FIXME decide whether or not we need to decide the encoding
    // process.stdin.setEncoding('utf8');

    // swallow the stdin error if it happens
    // ref: https://github.com/remy/nodemon/issues/1195
    if (hasStdio) {
      child.stdin.on('error', () => {});
      process.stdin.pipe(child.stdin);
    } else {
      if (child.stdout) {
        child.stdout.pipe(process.stdout);
      } else {
        utils.log.error(
          'running an unsupported version of node ' + process.version
        );
        utils.log.error(
          'nodemon may not work as expected - ' +
            'please consider upgrading to LTS'
        );
      }
    }

    bus.once('exit', function () {
      if (child && process.stdin.unpipe) {
        // node > 0.8
        process.stdin.unpipe(child.stdin);
      }
    });
  }

  debug('start watch on: %s', config.options.watch);
  if (config.options.watch !== false) {
    watch();
  }
}

function waitForSubProcesses(pid, callback) {
  debug('checking ps tree for pids of ' + pid);
  psTree(pid, (err, pids) => {
    if (!pids.length) {
      return callback();
    }

    utils.log.status(
      `still waiting for ${pids.length} sub-process${
        pids.length > 2 ? 'es' : ''
      } to finish...`
    );
    setTimeout(() => waitForSubProcesses(pid, callback), 1000);
  });
}

function kill(child, signal, callback) {
  if (!callback) {
    callback = noop;
  }

  if (utils.isWindows) {
    const taskKill = () => {
      try {
        exec('taskkill /pid ' + child.pid + ' /T /F');
      } catch (e) {
        utils.log.error('Could not shutdown sub process cleanly');
      }
    };

    // We are handling a 'SIGKILL' , 'SIGUSR2' and 'SIGUSR1' POSIX signal under Windows the
    // same way it is handled on a UNIX system: We are performing
    // a hard shutdown without waiting for the process to clean-up.
    if (
      signal === 'SIGKILL' ||
      osRelease < 10 ||
      signal === 'SIGUSR2' ||
      signal === 'SIGUSR1'
    ) {
      debug('terminating process group by force: %s', child.pid);

      // We are using the taskkill utility to terminate the whole
      // process group ('/t') of the child ('/pid') by force ('/f').
      // We need to end all sub processes, because the 'child'
      // process in this context is actually a cmd.exe wrapper.
      taskKill();
      callback();
      return;
    }

    try {
      // We are using the Windows Management Instrumentation Command-line
      // (wmic.exe) to resolve the sub-child process identifier, because the
      // 'child' process in this context is actually a cmd.exe wrapper.
      // We want to send the termination signal directly to the node process.
      // The '2> nul' silences the no process found error message.
      const resultBuffer = execSync(
        `wmic process where (ParentProcessId=${child.pid}) get ProcessId 2> nul`
      );
      const result = resultBuffer.toString().match(/^[0-9]+/m);

      // If there is no sub-child process we fall back to the child process.
      const processId = Array.isArray(result) ? result[0] : child.pid;

      debug('sending kill signal SIGINT to process: %s', processId);

      // We are using the standalone 'windows-kill' executable to send the
      // standard POSIX signal 'SIGINT' to the node process. This fixes #1720.
      const windowsKill = path.normalize(
        `${__dirname}/../../bin/windows-kill.exe`
      );

      // We have to detach the 'windows-kill' execution completely from this
      // process group to avoid terminating the nodemon process itself.
      // See: https://github.com/alirdn/windows-kill#how-it-works--limitations
      //
      // Therefore we are using 'start' to create a new cmd.exe context.
      // The '/min' option hides the new terminal window and the '/wait'
      // option lets the process wait for the command to finish.

      execSync(
        `start "windows-kill" /min /wait "${windowsKill}" -SIGINT ${processId}`
      );
    } catch (e) {
      taskKill();
    }
    callback();
  } else {
    // we use psTree to kill the full subtree of nodemon, because when
    // spawning processes like `coffee` under the `--debug` flag, it'll spawn
    // it's own child, and that can't be killed by nodemon, so psTree gives us
    // an array of PIDs that have spawned under nodemon, and we send each the
    // configured signal (default: SIGUSR2) signal, which fixes #335
    // note that psTree also works if `ps` is missing by looking in /proc
    let sig = signal.replace('SIG', '');

    psTree(child.pid, function (err, pids) {
      // if ps isn't native to the OS, then we need to send the numeric value
      // for the signal during the kill, `signals` is a lookup table for that.
      if (!psTree.hasPS) {
        sig = signals[signal];
      }

      // the sub processes need to be killed from smallest to largest
      debug('sending kill signal to ' + pids.join(', '));

      child.kill(signal);

      pids.sort().forEach((pid) => exec(`kill -${sig} ${pid}`, noop));

      waitForSubProcesses(child.pid, () => {
        // finally kill the main user process
        exec(`kill -${sig} ${child.pid}`, callback);
      });
    });
  }
}

run.kill = function (noRestart, callback) {
  // I hate code like this :(  - Remy (author of said code)
  if (typeof noRestart === 'function') {
    callback = noRestart;
    noRestart = false;
  }

  if (!callback) {
    callback = noop;
  }

  if (child !== null) {
    // if the stdin piping is on, we need to unpipe, but also close stdin on
    // the child, otherwise linux can throw EPIPE or ECONNRESET errors.
    if (run.options.stdin) {
      process.stdin.unpipe(child.stdin);
    }

    // For the on('exit', ...) handler above the following looks like a
    // crash, so we set the killedAfterChange flag if a restart is planned
    if (!noRestart) {
      killedAfterChange = true;
    }

    /* Now kill the entire subtree of processes belonging to nodemon */
    var oldPid = child.pid;
    if (child) {
      kill(child, config.signal, function () {
        // this seems to fix the 0.11.x issue with the "rs" restart command,
        // though I'm unsure why. it seems like more data is streamed in to
        // stdin after we close.
        if (child && run.options.stdin && child.stdin && oldPid === child.pid) {
          child.stdin.end();
        }
        callback();
      });
    }
  } else if (!noRestart) {
    // if there's no child, then we need to manually start the process
    // this is because as there was no child, the child.on('exit') event
    // handler doesn't exist which would normally trigger the restart.
    bus.once('start', callback);
    run.restart();
  } else {
    callback();
  }
};

run.restart = noop;

bus.on('quit', function onQuit(code) {
  if (code === undefined) {
    code = 0;
  }

  // remove event listener
  var exitTimer = null;
  var exit = function () {
    clearTimeout(exitTimer);
    exit = noop; // null out in case of race condition
    child = null;
    if (!config.required) {
      // Execute all other quit listeners.
      bus.listeners('quit').forEach(function (listener) {
        if (listener !== onQuit) {
          listener();
        }
      });
      process.exit(code);
    } else {
      bus.emit('exit');
    }
  };

  // if we're not running already, don't bother with trying to kill
  if (config.run === false) {
    return exit();
  }

  // immediately try to stop any polling
  config.run = false;

  if (child) {
    // give up waiting for the kids after 10 seconds
    exitTimer = setTimeout(exit, 10 * 1000);
    child.removeAllListeners('exit');
    child.once('exit', exit);

    kill(child, 'SIGINT');
  } else {
    exit();
  }
});

bus.on('restart', function () {
  // run.kill will send a SIGINT to the child process, which will cause it
  // to terminate, which in turn uses the 'exit' event handler to restart
  run.kill();
});

// remove the child file on exit
process.on('exit', function () {
  utils.log.detail('exiting');
  if (child) {
    child.kill();
  }
});

// because windows borks when listening for the SIG* events
if (!utils.isWindows) {
  bus.once('boot', () => {
    // usual suspect: ctrl+c exit
    process.once('SIGINT', () => bus.emit('quit', 130));
    process.once('SIGTERM', () => {
      bus.emit('quit', 143);
      if (child) {
        child.kill('SIGTERM');
      }
    });
  });
}

module.exports = run;
