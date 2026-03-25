#!/usr/bin/env node

'use strict'

process.title = 'node-gyp'

const envPaths = require('env-paths')
const gyp = require('../')
const log = require('npmlog')
const os = require('os')

/**
 * Process and execute the selected commands.
 */

const prog = gyp()
var completed = false
prog.parseArgv(process.argv)
prog.devDir = prog.opts.devdir

var homeDir = os.homedir()
if (prog.devDir) {
  prog.devDir = prog.devDir.replace(/^~/, homeDir)
} else if (homeDir) {
  prog.devDir = envPaths('node-gyp', { suffix: '' }).cache
} else {
  throw new Error(
    "node-gyp requires that the user's home directory is specified " +
    'in either of the environmental variables HOME or USERPROFILE. ' +
    'Overide with: --devdir /path/to/.node-gyp')
}

if (prog.todo.length === 0) {
  if (~process.argv.indexOf('-v') || ~process.argv.indexOf('--version')) {
    console.log('v%s', prog.version)
  } else {
    console.log('%s', prog.usage())
  }
  process.exit(0)
}

log.info('it worked if it ends with', 'ok')
log.verbose('cli', process.argv)
log.info('using', 'node-gyp@%s', prog.version)
log.info('using', 'node@%s | %s | %s', process.versions.node, process.platform, process.arch)

/**
 * Change dir if -C/--directory was passed.
 */

var dir = prog.opts.directory
if (dir) {
  var fs = require('fs')
  try {
    var stat = fs.statSync(dir)
    if (stat.isDirectory()) {
      log.info('chdir', dir)
      process.chdir(dir)
    } else {
      log.warn('chdir', dir + ' is not a directory')
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      log.warn('chdir', dir + ' is not a directory')
    } else {
      log.warn('chdir', 'error during chdir() "%s"', e.message)
    }
  }
}

function run () {
  var command = prog.todo.shift()
  if (!command) {
    // done!
    completed = true
    log.info('ok')
    return
  }

  prog.commands[command.name](command.args, function (err) {
    if (err) {
      log.error(command.name + ' error')
      log.error('stack', err.stack)
      errorMessage()
      log.error('not ok')
      return process.exit(1)
    }
    if (command.name === 'list') {
      var versions = arguments[1]
      if (versions.length > 0) {
        versions.forEach(function (version) {
          console.log(version)
        })
      } else {
        console.log('No node development files installed. Use `node-gyp install` to install a version.')
      }
    } else if (arguments.length >= 2) {
      console.log.apply(console, [].slice.call(arguments, 1))
    }

    // now run the next command in the queue
    process.nextTick(run)
  })
}

process.on('exit', function (code) {
  if (!completed && !code) {
    log.error('Completion callback never invoked!')
    issueMessage()
    process.exit(6)
  }
})

process.on('uncaughtException', function (err) {
  log.error('UNCAUGHT EXCEPTION')
  log.error('stack', err.stack)
  issueMessage()
  process.exit(7)
})

function errorMessage () {
  // copied from npm's lib/utils/error-handler.js
  var os = require('os')
  log.error('System', os.type() + ' ' + os.release())
  log.error('command', process.argv
    .map(JSON.stringify).join(' '))
  log.error('cwd', process.cwd())
  log.error('node -v', process.version)
  log.error('node-gyp -v', 'v' + prog.package.version)
}

function issueMessage () {
  errorMessage()
  log.error('', ['Node-gyp failed to build your package.',
    'Try to update npm and/or node-gyp and if it does not help file an issue with the package author.'
  ].join('\n'))
}

// start running the given commands!
run()
