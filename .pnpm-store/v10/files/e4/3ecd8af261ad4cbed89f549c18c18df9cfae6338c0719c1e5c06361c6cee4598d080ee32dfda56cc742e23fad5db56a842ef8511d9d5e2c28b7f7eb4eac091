const path = require('path');
const utils = require('./utils');
const merge = utils.merge;
const bus = utils.bus;
const spawn = require('child_process').spawn;

module.exports = function spawnCommand(command, config, eventArgs) {
  var stdio = ['pipe', 'pipe', 'pipe'];

  if (config.options.stdout) {
    stdio = ['pipe', process.stdout, process.stderr];
  }

  const env = merge(process.env, { FILENAME: eventArgs[0] });

  var sh = 'sh';
  var shFlag = '-c';
  var spawnOptions = {
    env: merge(config.options.execOptions.env, env),
    stdio: stdio,
  };

  if (!Array.isArray(command)) {
    command = [command];
  }

  if (utils.isWindows) {
    // if the exec includes a forward slash, reverse it for windows compat
    // but *only* apply to the first command, and none of the arguments.
    // ref #1251 and #1236
    command = command.map(executable => {
      if (executable.indexOf('/') === -1) {
        return executable;
      }

      return  executable.split(' ').map((e, i) => {
        if (i === 0) {
          return path.normalize(e);
        }
        return e;
      }).join(' ');
    });
    // taken from npm's cli: https://git.io/vNFD4
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
    spawnOptions.windowsVerbatimArguments = true;
    spawnOptions.windowsHide = true;
  }

  const args = command.join(' ');
  const child = spawn(sh, [shFlag, args], spawnOptions);

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
  }
};
