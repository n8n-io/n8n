'use strict'

const path = require('path')
const nopt = require('nopt')
const log = require('npmlog')
const childProcess = require('child_process')
const EE = require('events').EventEmitter
const inherits = require('util').inherits
const commands = [
  // Module build commands
  'build',
  'clean',
  'configure',
  'rebuild',
  // Development Header File management commands
  'install',
  'list',
  'remove'
]
const aliases = {
  ls: 'list',
  rm: 'remove'
}

// differentiate node-gyp's logs from npm's
log.heading = 'gyp'

function gyp () {
  return new Gyp()
}

function Gyp () {
  var self = this

  this.devDir = ''
  this.commands = {}

  commands.forEach(function (command) {
    self.commands[command] = function (argv, callback) {
      log.verbose('command', command, argv)
      return require('./' + command)(self, argv, callback)
    }
  })
}
inherits(Gyp, EE)
exports.Gyp = Gyp
var proto = Gyp.prototype

/**
 * Export the contents of the package.json.
 */

proto.package = require('../package.json')

/**
 * nopt configuration definitions
 */

proto.configDefs = {
  help: Boolean, // everywhere
  arch: String, // 'configure'
  cafile: String, // 'install'
  debug: Boolean, // 'build'
  directory: String, // bin
  make: String, // 'build'
  msvs_version: String, // 'configure'
  ensure: Boolean, // 'install'
  solution: String, // 'build' (windows only)
  proxy: String, // 'install'
  noproxy: String, // 'install'
  devdir: String, // everywhere
  nodedir: String, // 'configure'
  loglevel: String, // everywhere
  python: String, // 'configure'
  'dist-url': String, // 'install'
  tarball: String, // 'install'
  jobs: String, // 'build'
  thin: String, // 'configure'
  'force-process-config': Boolean // 'configure'
}

/**
 * nopt shorthands
 */

proto.shorthands = {
  release: '--no-debug',
  C: '--directory',
  debug: '--debug',
  j: '--jobs',
  silly: '--loglevel=silly',
  verbose: '--loglevel=verbose',
  silent: '--loglevel=silent'
}

/**
 * expose the command aliases for the bin file to use.
 */

proto.aliases = aliases

/**
 * Parses the given argv array and sets the 'opts',
 * 'argv' and 'command' properties.
 */

proto.parseArgv = function parseOpts (argv) {
  this.opts = nopt(this.configDefs, this.shorthands, argv)
  this.argv = this.opts.argv.remain.slice()

  var commands = this.todo = []

  // create a copy of the argv array with aliases mapped
  argv = this.argv.map(function (arg) {
    // is this an alias?
    if (arg in this.aliases) {
      arg = this.aliases[arg]
    }
    return arg
  }, this)

  // process the mapped args into "command" objects ("name" and "args" props)
  argv.slice().forEach(function (arg) {
    if (arg in this.commands) {
      var args = argv.splice(0, argv.indexOf(arg))
      argv.shift()
      if (commands.length > 0) {
        commands[commands.length - 1].args = args
      }
      commands.push({ name: arg, args: [] })
    }
  }, this)
  if (commands.length > 0) {
    commands[commands.length - 1].args = argv.splice(0)
  }

  // support for inheriting config env variables from npm
  var npmConfigPrefix = 'npm_config_'
  Object.keys(process.env).forEach(function (name) {
    if (name.indexOf(npmConfigPrefix) !== 0) {
      return
    }
    var val = process.env[name]
    if (name === npmConfigPrefix + 'loglevel') {
      log.level = val
    } else {
      // add the user-defined options to the config
      name = name.substring(npmConfigPrefix.length)
      // gyp@741b7f1 enters an infinite loop when it encounters
      // zero-length options so ensure those don't get through.
      if (name) {
        this.opts[name] = val
      }
    }
  }, this)

  if (this.opts.loglevel) {
    log.level = this.opts.loglevel
  }
  log.resume()
}

/**
 * Spawns a child process and emits a 'spawn' event.
 */

proto.spawn = function spawn (command, args, opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts.silent && !opts.stdio) {
    opts.stdio = [0, 1, 2]
  }
  var cp = childProcess.spawn(command, args, opts)
  log.info('spawn', command)
  log.info('spawn args', args)
  return cp
}

/**
 * Returns the usage instructions for node-gyp.
 */

proto.usage = function usage () {
  var str = [
    '',
    '  Usage: node-gyp <command> [options]',
    '',
    '  where <command> is one of:',
    commands.map(function (c) {
      return '    - ' + c + ' - ' + require('./' + c).usage
    }).join('\n'),
    '',
    'node-gyp@' + this.version + '  ' + path.resolve(__dirname, '..'),
    'node@' + process.versions.node
  ].join('\n')
  return str
}

/**
 * Version number getter.
 */

Object.defineProperty(proto, 'version', {
  get: function () {
    return this.package.version
  },
  enumerable: true
})

module.exports = exports = gyp
