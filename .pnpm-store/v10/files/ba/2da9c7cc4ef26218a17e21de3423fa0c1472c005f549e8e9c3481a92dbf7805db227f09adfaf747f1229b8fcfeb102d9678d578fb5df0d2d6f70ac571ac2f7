/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var path = require('path');
var dirname = path.dirname;
var basename = path.basename;
var fs = require('fs');

/**
 * Inherit `Command` from `EventEmitter.prototype`.
 */

require('util').inherits(Command, EventEmitter);

/**
 * Expose the root command.
 */

exports = module.exports = new Command();

/**
 * Expose `Command`.
 */

exports.Command = Command;

/**
 * Expose `Option`.
 */

exports.Option = Option;

/**
 * Initialize a new `Option` with the given `flags` and `description`.
 *
 * @param {String} flags
 * @param {String} description
 * @api public
 */

function Option(flags, description) {
  this.flags = flags;
  this.required = flags.indexOf('<') >= 0; // A value must be supplied when the option is specified.
  this.optional = flags.indexOf('[') >= 0; // A value is optional when the option is specified.
  this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
  this.negate = flags.indexOf('-no-') !== -1;
  flags = flags.split(/[ ,|]+/);
  if (flags.length > 1 && !/^[[<]/.test(flags[1])) this.short = flags.shift();
  this.long = flags.shift();
  this.description = description || '';
}

/**
 * Return option name.
 *
 * @return {String}
 * @api private
 */

Option.prototype.name = function() {
  return this.long.replace(/^--/, '');
};

/**
 * Return option name, in a camelcase format that can be used
 * as a object attribute key.
 *
 * @return {String}
 * @api private
 */

Option.prototype.attributeName = function() {
  return camelcase(this.name().replace(/^no-/, ''));
};

/**
 * Check if `arg` matches the short or long flag.
 *
 * @param {String} arg
 * @return {Boolean}
 * @api private
 */

Option.prototype.is = function(arg) {
  return this.short === arg || this.long === arg;
};

/**
 * CommanderError class
 * @class
 */
class CommanderError extends Error {
  /**
   * Constructs the CommanderError class
   * @param {Number} exitCode suggested exit code which could be used with process.exit
   * @param {String} code an id string representing the error
   * @param {String} message human-readable description of the error
   * @constructor
   */
  constructor(exitCode, code, message) {
    super(message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
  }
}

exports.CommanderError = CommanderError;

/**
 * Initialize a new `Command`.
 *
 * @param {String} [name]
 * @api public
 */

function Command(name) {
  this.commands = [];
  this.options = [];
  this._execs = new Set();
  this._allowUnknownOption = false;
  this._args = [];
  this._name = name || '';
  this._optionValues = {};
  this._storeOptionsAsProperties = true; // backwards compatible by default
  this._passCommandToAction = true; // backwards compatible by default
  this._actionResults = [];

  this._helpFlags = '-h, --help';
  this._helpDescription = 'output usage information';
  this._helpShortFlag = '-h';
  this._helpLongFlag = '--help';
}

/**
 * Define a command.
 *
 * There are two styles of command: pay attention to where to put the description.
 *
 * Examples:
 *
 *      // Command implemented using action handler (description is supplied separately to `.command`)
 *      program
 *        .command('clone <source> [destination]')
 *        .description('clone a repository into a newly created directory')
 *        .action((source, destination) => {
 *          console.log('clone command called');
 *        });
 *
 *      // Command implemented using separate executable file (description is second parameter to `.command`)
 *      program
 *        .command('start <service>', 'start named service')
 *        .command('stop [service]', 'stop named service, or all if no name supplied');
 *
 * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
 * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
 * @param {Object} [execOpts] - configuration options (for executable)
 * @return {Command} returns new command for action handler, or top-level command for executable command
 * @api public
 */

Command.prototype.command = function(nameAndArgs, actionOptsOrExecDesc, execOpts) {
  var desc = actionOptsOrExecDesc;
  var opts = execOpts;
  if (typeof desc === 'object' && desc !== null) {
    opts = desc;
    desc = null;
  }
  opts = opts || {};
  var args = nameAndArgs.split(/ +/);
  var cmd = new Command(args.shift());

  if (desc) {
    cmd.description(desc);
    this.executables = true;
    this._execs.add(cmd._name);
    if (opts.isDefault) this.defaultExecutable = cmd._name;
  }
  cmd._noHelp = !!opts.noHelp;
  cmd._helpFlags = this._helpFlags;
  cmd._helpDescription = this._helpDescription;
  cmd._helpShortFlag = this._helpShortFlag;
  cmd._helpLongFlag = this._helpLongFlag;
  cmd._exitCallback = this._exitCallback;
  cmd._storeOptionsAsProperties = this._storeOptionsAsProperties;
  cmd._passCommandToAction = this._passCommandToAction;

  cmd._executableFile = opts.executableFile; // Custom name for executable file
  this.commands.push(cmd);
  cmd.parseExpectedArgs(args);
  cmd.parent = this;

  if (desc) return this;
  return cmd;
};

/**
 * Define argument syntax for the top-level command.
 *
 * @api public
 */

Command.prototype.arguments = function(desc) {
  return this.parseExpectedArgs(desc.split(/ +/));
};

/**
 * Add an implicit `help [cmd]` subcommand
 * which invokes `--help` for the given command.
 *
 * @api private
 */

Command.prototype.addImplicitHelpCommand = function() {
  this.command('help [cmd]', 'display help for [cmd]');
};

/**
 * Parse expected `args`.
 *
 * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
 *
 * @param {Array} args
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.parseExpectedArgs = function(args) {
  if (!args.length) return;
  var self = this;
  args.forEach(function(arg) {
    var argDetails = {
      required: false,
      name: '',
      variadic: false
    };

    switch (arg[0]) {
      case '<':
        argDetails.required = true;
        argDetails.name = arg.slice(1, -1);
        break;
      case '[':
        argDetails.name = arg.slice(1, -1);
        break;
    }

    if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
      argDetails.variadic = true;
      argDetails.name = argDetails.name.slice(0, -3);
    }
    if (argDetails.name) {
      self._args.push(argDetails);
    }
  });
  return this;
};

/**
 * Register callback to use as replacement for calling process.exit.
 *
 * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.exitOverride = function(fn) {
  if (fn) {
    this._exitCallback = fn;
  } else {
    this._exitCallback = function(err) {
      if (err.code !== 'commander.executeSubCommandAsync') {
        throw err;
      } else {
        // Async callback from spawn events, not useful to throw.
      }
    };
  }
  return this;
};

/**
 * Call process.exit, and _exitCallback if defined.
 *
 * @param {Number} exitCode exit code for using with process.exit
 * @param {String} code an id string representing the error
 * @param {String} message human-readable description of the error
 * @return never
 * @api private
 */

Command.prototype._exit = function(exitCode, code, message) {
  if (this._exitCallback) {
    this._exitCallback(new CommanderError(exitCode, code, message));
    // Expecting this line is not reached.
  }
  process.exit(exitCode);
};

/**
 * Register callback `fn` for the command.
 *
 * Examples:
 *
 *      program
 *        .command('help')
 *        .description('display verbose help')
 *        .action(function() {
 *           // output help here
 *        });
 *
 * @param {Function} fn
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.action = function(fn) {
  var self = this;
  var listener = function(args, unknown) {
    // Parse any so-far unknown options
    args = args || [];
    unknown = unknown || [];

    var parsed = self.parseOptions(unknown);

    // Output help if necessary
    outputHelpIfRequested(self, parsed.unknown);
    self._checkForMissingMandatoryOptions();

    // If there are still any unknown options, then we simply
    // die, unless someone asked for help, in which case we give it
    // to them, and then we die.
    if (parsed.unknown.length > 0) {
      self.unknownOption(parsed.unknown[0]);
    }

    // Leftover arguments need to be pushed back. Fixes issue #56
    if (parsed.args.length) args = parsed.args.concat(args);

    self._args.forEach(function(arg, i) {
      if (arg.required && args[i] == null) {
        self.missingArgument(arg.name);
      } else if (arg.variadic) {
        if (i !== self._args.length - 1) {
          self.variadicArgNotLast(arg.name);
        }

        args[i] = args.splice(i);
      }
    });

    // The .action callback takes an extra parameter which is the command itself.
    var expectedArgsCount = self._args.length;
    var actionArgs = args.slice(0, expectedArgsCount);
    if (self._passCommandToAction) {
      actionArgs[expectedArgsCount] = self;
    } else {
      actionArgs[expectedArgsCount] = self.opts();
    }
    // Add the extra arguments so available too.
    if (args.length > expectedArgsCount) {
      actionArgs.push(args.slice(expectedArgsCount));
    }

    const actionResult = fn.apply(self, actionArgs);
    // Remember result in case it is async. Assume parseAsync getting called on root.
    let rootCommand = self;
    while (rootCommand.parent) {
      rootCommand = rootCommand.parent;
    }
    rootCommand._actionResults.push(actionResult);
  };
  var parent = this.parent || this;
  var name = parent === this ? '*' : this._name;
  parent.on('command:' + name, listener);
  if (this._alias) parent.on('command:' + this._alias, listener);
  return this;
};

/**
 * Internal implementation shared by .option() and .requiredOption()
 *
 * @param {Object} config
 * @param {String} flags
 * @param {String} description
 * @param {Function|*} [fn] - custom option processing function or default vaue
 * @param {*} [defaultValue]
 * @return {Command} for chaining
 * @api private
 */

Command.prototype._optionEx = function(config, flags, description, fn, defaultValue) {
  var self = this,
    option = new Option(flags, description),
    oname = option.name(),
    name = option.attributeName();
  option.mandatory = !!config.mandatory;

  // default as 3rd arg
  if (typeof fn !== 'function') {
    if (fn instanceof RegExp) {
      // This is a bit simplistic (especially no error messages), and probably better handled by caller using custom option processing.
      // No longer documented in README, but still present for backwards compatibility.
      var regex = fn;
      fn = function(val, def) {
        var m = regex.exec(val);
        return m ? m[0] : def;
      };
    } else {
      defaultValue = fn;
      fn = null;
    }
  }

  // preassign default value for --no-*, [optional], <required>, or plain flag if boolean value
  if (option.negate || option.optional || option.required || typeof defaultValue === 'boolean') {
    // when --no-foo we make sure default is true, unless a --foo option is already defined
    if (option.negate) {
      const positiveLongFlag = option.long.replace(/^--no-/, '--');
      defaultValue = self.optionFor(positiveLongFlag) ? self._getOptionValue(name) : true;
    }
    // preassign only if we have a default
    if (defaultValue !== undefined) {
      self._setOptionValue(name, defaultValue);
      option.defaultValue = defaultValue;
    }
  }

  // register the option
  this.options.push(option);

  // when it's passed assign the value
  // and conditionally invoke the callback
  this.on('option:' + oname, function(val) {
    // coercion
    if (val !== null && fn) {
      val = fn(val, self._getOptionValue(name) === undefined ? defaultValue : self._getOptionValue(name));
    }

    // unassigned or boolean value
    if (typeof self._getOptionValue(name) === 'boolean' || typeof self._getOptionValue(name) === 'undefined') {
      // if no value, negate false, and we have a default, then use it!
      if (val == null) {
        self._setOptionValue(name, option.negate
          ? false
          : defaultValue || true);
      } else {
        self._setOptionValue(name, val);
      }
    } else if (val !== null) {
      // reassign
      self._setOptionValue(name, option.negate ? false : val);
    }
  });

  return this;
};

/**
 * Define option with `flags`, `description` and optional
 * coercion `fn`.
 *
 * The `flags` string should contain both the short and long flags,
 * separated by comma, a pipe or space. The following are all valid
 * all will output this way when `--help` is used.
 *
 *    "-p, --pepper"
 *    "-p|--pepper"
 *    "-p --pepper"
 *
 * Examples:
 *
 *     // simple boolean defaulting to undefined
 *     program.option('-p, --pepper', 'add pepper');
 *
 *     program.pepper
 *     // => undefined
 *
 *     --pepper
 *     program.pepper
 *     // => true
 *
 *     // simple boolean defaulting to true (unless non-negated option is also defined)
 *     program.option('-C, --no-cheese', 'remove cheese');
 *
 *     program.cheese
 *     // => true
 *
 *     --no-cheese
 *     program.cheese
 *     // => false
 *
 *     // required argument
 *     program.option('-C, --chdir <path>', 'change the working directory');
 *
 *     --chdir /tmp
 *     program.chdir
 *     // => "/tmp"
 *
 *     // optional argument
 *     program.option('-c, --cheese [type]', 'add cheese [marble]');
 *
 * @param {String} flags
 * @param {String} description
 * @param {Function|*} [fn] - custom option processing function or default vaue
 * @param {*} [defaultValue]
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.option = function(flags, description, fn, defaultValue) {
  return this._optionEx({}, flags, description, fn, defaultValue);
};

/*
 * Add a required option which must have a value after parsing. This usually means
 * the option must be specified on the command line. (Otherwise the same as .option().)
 *
 * The `flags` string should contain both the short and long flags, separated by comma, a pipe or space.
 *
 * @param {String} flags
 * @param {String} description
 * @param {Function|*} [fn] - custom option processing function or default vaue
 * @param {*} [defaultValue]
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.requiredOption = function(flags, description, fn, defaultValue) {
  return this._optionEx({ mandatory: true }, flags, description, fn, defaultValue);
};

/**
 * Allow unknown options on the command line.
 *
 * @param {Boolean} arg if `true` or omitted, no error will be thrown
 * for unknown options.
 * @api public
 */
Command.prototype.allowUnknownOption = function(arg) {
  this._allowUnknownOption = arguments.length === 0 || arg;
  return this;
};

/**
  * Whether to store option values as properties on command object,
  * or store separately (specify false). In both cases the option values can be accessed using .opts().
  *
  * @param {boolean} value
  * @return {Command} Command for chaining
  * @api public
  */

Command.prototype.storeOptionsAsProperties = function(value) {
  this._storeOptionsAsProperties = (value === undefined) || value;
  if (this.options.length) {
    // This is for programmer, not end user.
    console.error('Commander usage error: call storeOptionsAsProperties before adding options');
  }
  return this;
};

/**
  * Whether to pass command to action handler,
  * or just the options (specify false).
  *
  * @param {boolean} value
  * @return {Command} Command for chaining
  * @api public
  */

Command.prototype.passCommandToAction = function(value) {
  this._passCommandToAction = (value === undefined) || value;
  return this;
};

/**
 * Store option value
 *
 * @param {String} key
 * @param {Object} value
 * @api private
 */

Command.prototype._setOptionValue = function(key, value) {
  if (this._storeOptionsAsProperties) {
    this[key] = value;
  } else {
    this._optionValues[key] = value;
  }
};

/**
 * Retrieve option value
 *
 * @param {String} key
 * @return {Object} value
 * @api private
 */

Command.prototype._getOptionValue = function(key) {
  if (this._storeOptionsAsProperties) {
    return this[key];
  }
  return this._optionValues[key];
};

/**
 * Parse `argv`, setting options and invoking commands when defined.
 *
 * @param {Array} argv
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.parse = function(argv) {
  // implicit help
  if (this.executables) this.addImplicitHelpCommand();

  // store raw args
  this.rawArgs = argv;

  // guess name
  this._name = this._name || basename(argv[1], '.js');

  // github-style sub-commands with no sub-command
  if (this.executables && argv.length < 3 && !this.defaultExecutable) {
    // this user needs help
    argv.push(this._helpLongFlag);
  }

  // process argv
  var normalized = this.normalize(argv.slice(2));
  var parsed = this.parseOptions(normalized);
  var args = this.args = parsed.args;

  var result = this.parseArgs(this.args, parsed.unknown);

  if (args[0] === 'help' && args.length === 1) this.help();

  // Note for future: we could return early if we found an action handler in parseArgs, as none of following code needed?

  // <cmd> --help
  if (args[0] === 'help') {
    args[0] = args[1];
    args[1] = this._helpLongFlag;
  } else {
    // If calling through to executable subcommand we could check for help flags before failing,
    // but a somewhat unlikely case since program options not passed to executable subcommands.
    // Wait for reports to see if check needed and what usage pattern is.
    this._checkForMissingMandatoryOptions();
  }

  // executable sub-commands
  // (Debugging note for future: args[0] is not right if an action has been called)
  var name = result.args[0];
  var subCommand = null;

  // Look for subcommand
  if (name) {
    subCommand = this.commands.find(function(command) {
      return command._name === name;
    });
  }

  // Look for alias
  if (!subCommand && name) {
    subCommand = this.commands.find(function(command) {
      return command.alias() === name;
    });
    if (subCommand) {
      name = subCommand._name;
      args[0] = name;
    }
  }

  // Look for default subcommand
  if (!subCommand && this.defaultExecutable) {
    name = this.defaultExecutable;
    args.unshift(name);
    subCommand = this.commands.find(function(command) {
      return command._name === name;
    });
  }

  if (this._execs.has(name)) {
    return this.executeSubCommand(argv, args, parsed.unknown, subCommand ? subCommand._executableFile : undefined);
  }

  return result;
};

/**
 * Parse `argv`, setting options and invoking commands when defined.
 *
 * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
 *
 * @param {Array} argv
 * @return {Promise}
 * @api public
 */
Command.prototype.parseAsync = function(argv) {
  this.parse(argv);
  return Promise.all(this._actionResults);
};

/**
 * Execute a sub-command executable.
 *
 * @param {Array} argv
 * @param {Array} args
 * @param {Array} unknown
 * @param {String} executableFile
 * @api private
 */

Command.prototype.executeSubCommand = function(argv, args, unknown, executableFile) {
  args = args.concat(unknown);

  if (!args.length) this.help();

  var isExplicitJS = false; // Whether to use node to launch "executable"

  // executable
  var pm = argv[1];
  // name of the subcommand, like `pm-install`
  var bin = basename(pm, path.extname(pm)) + '-' + args[0];
  if (executableFile != null) {
    bin = executableFile;
    // Check for same extensions as we scan for below so get consistent launch behaviour.
    var executableExt = path.extname(executableFile);
    isExplicitJS = executableExt === '.js' || executableExt === '.ts' || executableExt === '.mjs';
  }

  // In case of globally installed, get the base dir where executable
  //  subcommand file should be located at
  var baseDir;

  var resolvedLink = fs.realpathSync(pm);

  baseDir = dirname(resolvedLink);

  // prefer local `./<bin>` to bin in the $PATH
  var localBin = path.join(baseDir, bin);

  // whether bin file is a js script with explicit `.js` or `.ts` extension
  if (exists(localBin + '.js')) {
    bin = localBin + '.js';
    isExplicitJS = true;
  } else if (exists(localBin + '.ts')) {
    bin = localBin + '.ts';
    isExplicitJS = true;
  } else if (exists(localBin + '.mjs')) {
    bin = localBin + '.mjs';
    isExplicitJS = true;
  } else if (exists(localBin)) {
    bin = localBin;
  }

  args = args.slice(1);

  var proc;
  if (process.platform !== 'win32') {
    if (isExplicitJS) {
      args.unshift(bin);
      // add executable arguments to spawn
      args = incrementNodeInspectorPort(process.execArgv).concat(args);

      proc = spawn(process.argv[0], args, { stdio: 'inherit' });
    } else {
      proc = spawn(bin, args, { stdio: 'inherit' });
    }
  } else {
    args.unshift(bin);
    // add executable arguments to spawn
    args = incrementNodeInspectorPort(process.execArgv).concat(args);
    proc = spawn(process.execPath, args, { stdio: 'inherit' });
  }

  var signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
  signals.forEach(function(signal) {
    process.on(signal, function() {
      if (proc.killed === false && proc.exitCode === null) {
        proc.kill(signal);
      }
    });
  });

  // By default terminate process when spawned process terminates.
  // Suppressing the exit if exitCallback defined is a bit messy and of limited use, but does allow process to stay running!
  const exitCallback = this._exitCallback;
  if (!exitCallback) {
    proc.on('close', process.exit.bind(process));
  } else {
    proc.on('close', () => {
      exitCallback(new CommanderError(process.exitCode || 0, 'commander.executeSubCommandAsync', '(close)'));
    });
  }
  proc.on('error', function(err) {
    if (err.code === 'ENOENT') {
      console.error('error: %s(1) does not exist, try --help', bin);
    } else if (err.code === 'EACCES') {
      console.error('error: %s(1) not executable. try chmod or run with root', bin);
    }
    if (!exitCallback) {
      process.exit(1);
    } else {
      const wrappedError = new CommanderError(1, 'commander.executeSubCommandAsync', '(error)');
      wrappedError.nestedError = err;
      exitCallback(wrappedError);
    }
  });

  // Store the reference to the child process
  this.runningCommand = proc;
};

/**
 * Normalize `args`, splitting joined short flags. For example
 * the arg "-abc" is equivalent to "-a -b -c".
 * This also normalizes equal sign and splits "--abc=def" into "--abc def".
 *
 * @param {Array} args
 * @return {Array}
 * @api private
 */

Command.prototype.normalize = function(args) {
  var ret = [],
    arg,
    lastOpt,
    index,
    short,
    opt;

  for (var i = 0, len = args.length; i < len; ++i) {
    arg = args[i];
    if (i > 0) {
      lastOpt = this.optionFor(args[i - 1]);
    }

    if (arg === '--') {
      // Honor option terminator
      ret = ret.concat(args.slice(i));
      break;
    } else if (lastOpt && lastOpt.required) {
      ret.push(arg);
    } else if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
      short = arg.slice(0, 2);
      opt = this.optionFor(short);
      if (opt && (opt.required || opt.optional)) {
        ret.push(short);
        ret.push(arg.slice(2));
      } else {
        arg.slice(1).split('').forEach(function(c) {
          ret.push('-' + c);
        });
      }
    } else if (/^--/.test(arg) && ~(index = arg.indexOf('='))) {
      ret.push(arg.slice(0, index), arg.slice(index + 1));
    } else {
      ret.push(arg);
    }
  }

  return ret;
};

/**
 * Parse command `args`.
 *
 * When listener(s) are available those
 * callbacks are invoked, otherwise the "*"
 * event is emitted and those actions are invoked.
 *
 * @param {Array} args
 * @return {Command} for chaining
 * @api private
 */

Command.prototype.parseArgs = function(args, unknown) {
  var name;

  if (args.length) {
    name = args[0];
    if (this.listeners('command:' + name).length) {
      this.emit('command:' + args.shift(), args, unknown);
    } else {
      this.emit('command:*', args, unknown);
    }
  } else {
    outputHelpIfRequested(this, unknown);

    // If there were no args and we have unknown options,
    // then they are extraneous and we need to error.
    if (unknown.length > 0 && !this.defaultExecutable) {
      this.unknownOption(unknown[0]);
    }
    if (this.commands.length === 0 &&
        this._args.filter(function(a) { return a.required; }).length === 0) {
      this.emit('command:*');
    }
  }

  return this;
};

/**
 * Return an option matching `arg` if any.
 *
 * @param {String} arg
 * @return {Option}
 * @api private
 */

Command.prototype.optionFor = function(arg) {
  for (var i = 0, len = this.options.length; i < len; ++i) {
    if (this.options[i].is(arg)) {
      return this.options[i];
    }
  }
};

/**
 * Display an error message if a mandatory option does not have a value.
 *
 * @api private
 */

Command.prototype._checkForMissingMandatoryOptions = function() {
  // Walk up hierarchy so can call from action handler after checking for displaying help.
  for (var cmd = this; cmd; cmd = cmd.parent) {
    cmd.options.forEach((anOption) => {
      if (anOption.mandatory && (cmd._getOptionValue(anOption.attributeName()) === undefined)) {
        cmd.missingMandatoryOptionValue(anOption);
      }
    });
  }
};

/**
 * Parse options from `argv` returning `argv`
 * void of these options.
 *
 * @param {Array} argv
 * @return {{args: Array, unknown: Array}}
 * @api public
 */

Command.prototype.parseOptions = function(argv) {
  var args = [],
    len = argv.length,
    literal,
    option,
    arg;

  var unknownOptions = [];

  // parse options
  for (var i = 0; i < len; ++i) {
    arg = argv[i];

    // literal args after --
    if (literal) {
      args.push(arg);
      continue;
    }

    if (arg === '--') {
      literal = true;
      continue;
    }

    // find matching Option
    option = this.optionFor(arg);

    // option is defined
    if (option) {
      // requires arg
      if (option.required) {
        arg = argv[++i];
        if (arg == null) return this.optionMissingArgument(option);
        this.emit('option:' + option.name(), arg);
      // optional arg
      } else if (option.optional) {
        arg = argv[i + 1];
        if (arg == null || (arg[0] === '-' && arg !== '-')) {
          arg = null;
        } else {
          ++i;
        }
        this.emit('option:' + option.name(), arg);
      // flag
      } else {
        this.emit('option:' + option.name());
      }
      continue;
    }

    // looks like an option
    if (arg.length > 1 && arg[0] === '-') {
      unknownOptions.push(arg);

      // If the next argument looks like it might be
      // an argument for this option, we pass it on.
      // If it isn't, then it'll simply be ignored
      if ((i + 1) < argv.length && (argv[i + 1][0] !== '-' || argv[i + 1] === '-')) {
        unknownOptions.push(argv[++i]);
      }
      continue;
    }

    // arg
    args.push(arg);
  }

  return { args: args, unknown: unknownOptions };
};

/**
 * Return an object containing options as key-value pairs
 *
 * @return {Object}
 * @api public
 */
Command.prototype.opts = function() {
  if (this._storeOptionsAsProperties) {
    // Preserve original behaviour so backwards compatible when still using properties
    var result = {},
      len = this.options.length;

    for (var i = 0; i < len; i++) {
      var key = this.options[i].attributeName();
      result[key] = key === this._versionOptionName ? this._version : this[key];
    }
    return result;
  }

  return this._optionValues;
};

/**
 * Argument `name` is missing.
 *
 * @param {String} name
 * @api private
 */

Command.prototype.missingArgument = function(name) {
  const message = `error: missing required argument '${name}'`;
  console.error(message);
  this._exit(1, 'commander.missingArgument', message);
};

/**
 * `Option` is missing an argument, but received `flag` or nothing.
 *
 * @param {Option} option
 * @param {String} [flag]
 * @api private
 */

Command.prototype.optionMissingArgument = function(option, flag) {
  let message;
  if (flag) {
    message = `error: option '${option.flags}' argument missing, got '${flag}'`;
  } else {
    message = `error: option '${option.flags}' argument missing`;
  }
  console.error(message);
  this._exit(1, 'commander.optionMissingArgument', message);
};

/**
 * `Option` does not have a value, and is a mandatory option.
 *
 * @param {Option} option
 * @api private
 */

Command.prototype.missingMandatoryOptionValue = function(option) {
  const message = `error: required option '${option.flags}' not specified`;
  console.error(message);
  this._exit(1, 'commander.missingMandatoryOptionValue', message);
};

/**
 * Unknown option `flag`.
 *
 * @param {String} flag
 * @api private
 */

Command.prototype.unknownOption = function(flag) {
  if (this._allowUnknownOption) return;
  const message = `error: unknown option '${flag}'`;
  console.error(message);
  this._exit(1, 'commander.unknownOption', message);
};

/**
 * Variadic argument with `name` is not the last argument as required.
 *
 * @param {String} name
 * @api private
 */

Command.prototype.variadicArgNotLast = function(name) {
  const message = `error: variadic arguments must be last '${name}'`;
  console.error(message);
  this._exit(1, 'commander.variadicArgNotLast', message);
};

/**
 * Set the program version to `str`.
 *
 * This method auto-registers the "-V, --version" flag
 * which will print the version number when passed.
 *
 * You can optionally supply the  flags and description to override the defaults.
 *
 * @param {String} str
 * @param {String} [flags]
 * @param {String} [description]
 * @return {Command} for chaining
 * @api public
 */

Command.prototype.version = function(str, flags, description) {
  if (arguments.length === 0) return this._version;
  this._version = str;
  flags = flags || '-V, --version';
  description = description || 'output the version number';
  var versionOption = new Option(flags, description);
  this._versionOptionName = versionOption.long.substr(2) || 'version';
  this.options.push(versionOption);
  var self = this;
  this.on('option:' + this._versionOptionName, function() {
    process.stdout.write(str + '\n');
    self._exit(0, 'commander.version', str);
  });
  return this;
};

/**
 * Set the description to `str`.
 *
 * @param {String} str
 * @param {Object} [argsDescription]
 * @return {String|Command}
 * @api public
 */

Command.prototype.description = function(str, argsDescription) {
  if (arguments.length === 0) return this._description;
  this._description = str;
  this._argsDescription = argsDescription;
  return this;
};

/**
 * Set an alias for the command
 *
 * @param {String} alias
 * @return {String|Command}
 * @api public
 */

Command.prototype.alias = function(alias) {
  var command = this;
  if (this.commands.length !== 0) {
    command = this.commands[this.commands.length - 1];
  }

  if (arguments.length === 0) return command._alias;

  if (alias === command._name) throw new Error('Command alias can\'t be the same as its name');

  command._alias = alias;
  return this;
};

/**
 * Set / get the command usage `str`.
 *
 * @param {String} [str]
 * @return {String|Command}
 * @api public
 */

Command.prototype.usage = function(str) {
  var args = this._args.map(function(arg) {
    return humanReadableArgName(arg);
  });

  var usage = '[options]' +
    (this.commands.length ? ' [command]' : '') +
    (this._args.length ? ' ' + args.join(' ') : '');

  if (arguments.length === 0) return this._usage || usage;
  this._usage = str;

  return this;
};

/**
 * Get or set the name of the command
 *
 * @param {String} [str]
 * @return {String|Command}
 * @api public
 */

Command.prototype.name = function(str) {
  if (arguments.length === 0) return this._name;
  this._name = str;
  return this;
};

/**
 * Return prepared commands.
 *
 * @return {Array}
 * @api private
 */

Command.prototype.prepareCommands = function() {
  return this.commands.filter(function(cmd) {
    return !cmd._noHelp;
  }).map(function(cmd) {
    var args = cmd._args.map(function(arg) {
      return humanReadableArgName(arg);
    }).join(' ');

    return [
      cmd._name +
        (cmd._alias ? '|' + cmd._alias : '') +
        (cmd.options.length ? ' [options]' : '') +
        (args ? ' ' + args : ''),
      cmd._description
    ];
  });
};

/**
 * Return the largest command length.
 *
 * @return {Number}
 * @api private
 */

Command.prototype.largestCommandLength = function() {
  var commands = this.prepareCommands();
  return commands.reduce(function(max, command) {
    return Math.max(max, command[0].length);
  }, 0);
};

/**
 * Return the largest option length.
 *
 * @return {Number}
 * @api private
 */

Command.prototype.largestOptionLength = function() {
  var options = [].slice.call(this.options);
  options.push({
    flags: this._helpFlags
  });

  return options.reduce(function(max, option) {
    return Math.max(max, option.flags.length);
  }, 0);
};

/**
 * Return the largest arg length.
 *
 * @return {Number}
 * @api private
 */

Command.prototype.largestArgLength = function() {
  return this._args.reduce(function(max, arg) {
    return Math.max(max, arg.name.length);
  }, 0);
};

/**
 * Return the pad width.
 *
 * @return {Number}
 * @api private
 */

Command.prototype.padWidth = function() {
  var width = this.largestOptionLength();
  if (this._argsDescription && this._args.length) {
    if (this.largestArgLength() > width) {
      width = this.largestArgLength();
    }
  }

  if (this.commands && this.commands.length) {
    if (this.largestCommandLength() > width) {
      width = this.largestCommandLength();
    }
  }

  return width;
};

/**
 * Return help for options.
 *
 * @return {String}
 * @api private
 */

Command.prototype.optionHelp = function() {
  var width = this.padWidth();

  var columns = process.stdout.columns || 80;
  var descriptionWidth = columns - width - 4;

  // Append the help information
  return this.options.map(function(option) {
    const fullDesc = option.description +
      ((!option.negate && option.defaultValue !== undefined) ? ' (default: ' + JSON.stringify(option.defaultValue) + ')' : '');
    return pad(option.flags, width) + '  ' + optionalWrap(fullDesc, descriptionWidth, width + 2);
  }).concat([pad(this._helpFlags, width) + '  ' + optionalWrap(this._helpDescription, descriptionWidth, width + 2)])
    .join('\n');
};

/**
 * Return command help documentation.
 *
 * @return {String}
 * @api private
 */

Command.prototype.commandHelp = function() {
  if (!this.commands.length) return '';

  var commands = this.prepareCommands();
  var width = this.padWidth();

  var columns = process.stdout.columns || 80;
  var descriptionWidth = columns - width - 4;

  return [
    'Commands:',
    commands.map(function(cmd) {
      var desc = cmd[1] ? '  ' + cmd[1] : '';
      return (desc ? pad(cmd[0], width) : cmd[0]) + optionalWrap(desc, descriptionWidth, width + 2);
    }).join('\n').replace(/^/gm, '  '),
    ''
  ].join('\n');
};

/**
 * Return program help documentation.
 *
 * @return {String}
 * @api private
 */

Command.prototype.helpInformation = function() {
  var desc = [];
  if (this._description) {
    desc = [
      this._description,
      ''
    ];

    var argsDescription = this._argsDescription;
    if (argsDescription && this._args.length) {
      var width = this.padWidth();
      var columns = process.stdout.columns || 80;
      var descriptionWidth = columns - width - 5;
      desc.push('Arguments:');
      desc.push('');
      this._args.forEach(function(arg) {
        desc.push('  ' + pad(arg.name, width) + '  ' + wrap(argsDescription[arg.name], descriptionWidth, width + 4));
      });
      desc.push('');
    }
  }

  var cmdName = this._name;
  if (this._alias) {
    cmdName = cmdName + '|' + this._alias;
  }
  var parentCmdNames = '';
  for (var parentCmd = this.parent; parentCmd; parentCmd = parentCmd.parent) {
    parentCmdNames = parentCmd.name() + ' ' + parentCmdNames;
  }
  var usage = [
    'Usage: ' + parentCmdNames + cmdName + ' ' + this.usage(),
    ''
  ];

  var cmds = [];
  var commandHelp = this.commandHelp();
  if (commandHelp) cmds = [commandHelp];

  var options = [
    'Options:',
    '' + this.optionHelp().replace(/^/gm, '  '),
    ''
  ];

  return usage
    .concat(desc)
    .concat(options)
    .concat(cmds)
    .join('\n');
};

/**
 * Output help information for this command.
 *
 * When listener(s) are available for the helpLongFlag
 * those callbacks are invoked.
 *
 * @api public
 */

Command.prototype.outputHelp = function(cb) {
  if (!cb) {
    cb = function(passthru) {
      return passthru;
    };
  }
  const cbOutput = cb(this.helpInformation());
  if (typeof cbOutput !== 'string' && !Buffer.isBuffer(cbOutput)) {
    throw new Error('outputHelp callback must return a string or a Buffer');
  }
  process.stdout.write(cbOutput);
  this.emit(this._helpLongFlag);
};

/**
 * You can pass in flags and a description to override the help
 * flags and help description for your command.
 *
 * @param {String} [flags]
 * @param {String} [description]
 * @return {Command}
 * @api public
 */

Command.prototype.helpOption = function(flags, description) {
  this._helpFlags = flags || this._helpFlags;
  this._helpDescription = description || this._helpDescription;

  var splitFlags = this._helpFlags.split(/[ ,|]+/);

  if (splitFlags.length > 1) this._helpShortFlag = splitFlags.shift();

  this._helpLongFlag = splitFlags.shift();

  return this;
};

/**
 * Output help information and exit.
 *
 * @param {Function} [cb]
 * @api public
 */

Command.prototype.help = function(cb) {
  this.outputHelp(cb);
  // exitCode: preserving original behaviour which was calling process.exit()
  // message: do not have all displayed text available so only passing placeholder.
  this._exit(process.exitCode || 0, 'commander.help', '(outputHelp)');
};

/**
 * Camel-case the given `flag`
 *
 * @param {String} flag
 * @return {String}
 * @api private
 */

function camelcase(flag) {
  return flag.split('-').reduce(function(str, word) {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Pad `str` to `width`.
 *
 * @param {String} str
 * @param {Number} width
 * @return {String}
 * @api private
 */

function pad(str, width) {
  var len = Math.max(0, width - str.length);
  return str + Array(len + 1).join(' ');
}

/**
 * Wraps the given string with line breaks at the specified width while breaking
 * words and indenting every but the first line on the left.
 *
 * @param {String} str
 * @param {Number} width
 * @param {Number} indent
 * @return {String}
 * @api private
 */
function wrap(str, width, indent) {
  var regex = new RegExp('.{1,' + (width - 1) + '}([\\s\u200B]|$)|[^\\s\u200B]+?([\\s\u200B]|$)', 'g');
  var lines = str.match(regex) || [];
  return lines.map(function(line, i) {
    if (line.slice(-1) === '\n') {
      line = line.slice(0, line.length - 1);
    }
    return ((i > 0 && indent) ? Array(indent + 1).join(' ') : '') + line.trimRight();
  }).join('\n');
}

/**
 * Optionally wrap the given str to a max width of width characters per line
 * while indenting with indent spaces. Do not wrap if insufficient width or
 * string is manually formatted.
 *
 * @param {String} str
 * @param {Number} width
 * @param {Number} indent
 * @return {String}
 * @api private
 */
function optionalWrap(str, width, indent) {
  // Detect manually wrapped and indented strings by searching for line breaks
  // followed by multiple spaces/tabs.
  if (str.match(/[\n]\s+/)) return str;
  // Do not wrap to narrow columns (or can end up with a word per line).
  const minWidth = 40;
  if (width < minWidth) return str;

  return wrap(str, width, indent);
}

/**
 * Output help information if help flags specified
 *
 * @param {Command} cmd - command to output help for
 * @param {Array} options - array of options to search for -h or --help
 * @api private
 */

function outputHelpIfRequested(cmd, options) {
  options = options || [];

  for (var i = 0; i < options.length; i++) {
    if (options[i] === cmd._helpLongFlag || options[i] === cmd._helpShortFlag) {
      cmd.outputHelp();
      // (Do not have all displayed text available so only passing placeholder.)
      cmd._exit(0, 'commander.helpDisplayed', '(outputHelp)');
    }
  }
}

/**
 * Takes an argument and returns its human readable equivalent for help usage.
 *
 * @param {Object} arg
 * @return {String}
 * @api private
 */

function humanReadableArgName(arg) {
  var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

  return arg.required
    ? '<' + nameOutput + '>'
    : '[' + nameOutput + ']';
}

// for versions before node v0.8 when there weren't `fs.existsSync`
function exists(file) {
  try {
    if (fs.statSync(file).isFile()) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

/**
 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
 *
 * @param {string[]} args - array of arguments from node.execArgv
 * @returns {string[]}
 * @api private
 */

function incrementNodeInspectorPort(args) {
  // Testing for these options:
  //  --inspect[=[host:]port]
  //  --inspect-brk[=[host:]port]
  //  --inspect-port=[host:]port
  return args.map((arg) => {
    var result = arg;
    if (arg.indexOf('--inspect') === 0) {
      var debugOption;
      var debugHost = '127.0.0.1';
      var debugPort = '9229';
      var match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        // e.g. --inspect
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          // e.g. --inspect=1234
          debugPort = match[3];
        } else {
          // e.g. --inspect=localhost
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        // e.g. --inspect=localhost:1234
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }

      if (debugOption && debugPort !== '0') {
        result = `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
    }
    return result;
  });
}
