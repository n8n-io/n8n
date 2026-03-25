'use strict'

const fs = require('graceful-fs')
const path = require('path')
const glob = require('glob')
const log = require('npmlog')
const which = require('which')
const win = process.platform === 'win32'

function build (gyp, argv, callback) {
  var platformMake = 'make'
  if (process.platform === 'aix') {
    platformMake = 'gmake'
  } else if (process.platform.indexOf('bsd') !== -1) {
    platformMake = 'gmake'
  } else if (win && argv.length > 0) {
    argv = argv.map(function (target) {
      return '/t:' + target
    })
  }

  var makeCommand = gyp.opts.make || process.env.MAKE || platformMake
  var command = win ? 'msbuild' : makeCommand
  var jobs = gyp.opts.jobs || process.env.JOBS
  var buildType
  var config
  var arch
  var nodeDir
  var guessedSolution

  loadConfigGypi()

  /**
   * Load the "config.gypi" file that was generated during "configure".
   */

  function loadConfigGypi () {
    var configPath = path.resolve('build', 'config.gypi')

    fs.readFile(configPath, 'utf8', function (err, data) {
      if (err) {
        if (err.code === 'ENOENT') {
          callback(new Error('You must run `node-gyp configure` first!'))
        } else {
          callback(err)
        }
        return
      }
      config = JSON.parse(data.replace(/#.+\n/, ''))

      // get the 'arch', 'buildType', and 'nodeDir' vars from the config
      buildType = config.target_defaults.default_configuration
      arch = config.variables.target_arch
      nodeDir = config.variables.nodedir

      if ('debug' in gyp.opts) {
        buildType = gyp.opts.debug ? 'Debug' : 'Release'
      }
      if (!buildType) {
        buildType = 'Release'
      }

      log.verbose('build type', buildType)
      log.verbose('architecture', arch)
      log.verbose('node dev dir', nodeDir)

      if (win) {
        findSolutionFile()
      } else {
        doWhich()
      }
    })
  }

  /**
   * On Windows, find the first build/*.sln file.
   */

  function findSolutionFile () {
    glob('build/*.sln', function (err, files) {
      if (err) {
        return callback(err)
      }
      if (files.length === 0) {
        return callback(new Error('Could not find *.sln file. Did you run "configure"?'))
      }
      guessedSolution = files[0]
      log.verbose('found first Solution file', guessedSolution)
      doWhich()
    })
  }

  /**
   * Uses node-which to locate the msbuild / make executable.
   */

  function doWhich () {
    // On Windows use msbuild provided by node-gyp configure
    if (win) {
      if (!config.variables.msbuild_path) {
        return callback(new Error(
          'MSBuild is not set, please run `node-gyp configure`.'))
      }
      command = config.variables.msbuild_path
      log.verbose('using MSBuild:', command)
      doBuild()
      return
    }
    // First make sure we have the build command in the PATH
    which(command, function (err, execPath) {
      if (err) {
        // Some other error or 'make' not found on Unix, report that to the user
        callback(err)
        return
      }
      log.verbose('`which` succeeded for `' + command + '`', execPath)
      doBuild()
    })
  }

  /**
   * Actually spawn the process and compile the module.
   */

  function doBuild () {
    // Enable Verbose build
    var verbose = log.levels[log.level] <= log.levels.verbose
    var j

    if (!win && verbose) {
      argv.push('V=1')
    }

    if (win && !verbose) {
      argv.push('/clp:Verbosity=minimal')
    }

    if (win) {
      // Turn off the Microsoft logo on Windows
      argv.push('/nologo')
    }

    // Specify the build type, Release by default
    if (win) {
      // Convert .gypi config target_arch to MSBuild /Platform
      // Since there are many ways to state '32-bit Intel', default to it.
      // N.B. msbuild's Condition string equality tests are case-insensitive.
      var archLower = arch.toLowerCase()
      var p = archLower === 'x64' ? 'x64'
        : (archLower === 'arm' ? 'ARM'
          : (archLower === 'arm64' ? 'ARM64' : 'Win32'))
      argv.push('/p:Configuration=' + buildType + ';Platform=' + p)
      if (jobs) {
        j = parseInt(jobs, 10)
        if (!isNaN(j) && j > 0) {
          argv.push('/m:' + j)
        } else if (jobs.toUpperCase() === 'MAX') {
          argv.push('/m:' + require('os').cpus().length)
        }
      }
    } else {
      argv.push('BUILDTYPE=' + buildType)
      // Invoke the Makefile in the 'build' dir.
      argv.push('-C')
      argv.push('build')
      if (jobs) {
        j = parseInt(jobs, 10)
        if (!isNaN(j) && j > 0) {
          argv.push('--jobs')
          argv.push(j)
        } else if (jobs.toUpperCase() === 'MAX') {
          argv.push('--jobs')
          argv.push(require('os').cpus().length)
        }
      }
    }

    if (win) {
      // did the user specify their own .sln file?
      var hasSln = argv.some(function (arg) {
        return path.extname(arg) === '.sln'
      })
      if (!hasSln) {
        argv.unshift(gyp.opts.solution || guessedSolution)
      }
    }

    var proc = gyp.spawn(command, argv)
    proc.on('exit', onExit)
  }

  function onExit (code, signal) {
    if (code !== 0) {
      return callback(new Error('`' + command + '` failed with exit code: ' + code))
    }
    if (signal) {
      return callback(new Error('`' + command + '` got signal: ' + signal))
    }
    callback()
  }
}

module.exports = build
module.exports.usage = 'Invokes `' + (win ? 'msbuild' : 'make') + '` and builds the module'
