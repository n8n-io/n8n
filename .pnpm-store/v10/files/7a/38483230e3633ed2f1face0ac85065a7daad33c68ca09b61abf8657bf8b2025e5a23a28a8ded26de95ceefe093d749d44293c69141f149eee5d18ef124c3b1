'use strict'

const log = require('npmlog')
const semver = require('semver')
const cp = require('child_process')
const extend = require('util')._extend // eslint-disable-line
const win = process.platform === 'win32'
const logWithPrefix = require('./util').logWithPrefix

const systemDrive = process.env.SystemDrive || 'C:'
const username = process.env.USERNAME || process.env.USER || getOsUserInfo()
const localAppData = process.env.LOCALAPPDATA || `${systemDrive}\\${username}\\AppData\\Local`
const foundLocalAppData = process.env.LOCALAPPDATA || username
const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles || `${systemDrive}\\Program Files`
const programFilesX86 = process.env['ProgramFiles(x86)'] || `${programFiles} (x86)`

const winDefaultLocationsArray = []
for (const majorMinor of ['39', '38', '37', '36']) {
  if (foundLocalAppData) {
    winDefaultLocationsArray.push(
      `${localAppData}\\Programs\\Python\\Python${majorMinor}\\python.exe`,
      `${programFiles}\\Python${majorMinor}\\python.exe`,
      `${localAppData}\\Programs\\Python\\Python${majorMinor}-32\\python.exe`,
      `${programFiles}\\Python${majorMinor}-32\\python.exe`,
      `${programFilesX86}\\Python${majorMinor}-32\\python.exe`
    )
  } else {
    winDefaultLocationsArray.push(
      `${programFiles}\\Python${majorMinor}\\python.exe`,
      `${programFiles}\\Python${majorMinor}-32\\python.exe`,
      `${programFilesX86}\\Python${majorMinor}-32\\python.exe`
    )
  }
}

function getOsUserInfo () {
  try {
    return require('os').userInfo().username
  } catch (e) {}
}

function PythonFinder (configPython, callback) {
  this.callback = callback
  this.configPython = configPython
  this.errorLog = []
}

PythonFinder.prototype = {
  log: logWithPrefix(log, 'find Python'),
  argsExecutable: ['-c', 'import sys; print(sys.executable);'],
  argsVersion: ['-c', 'import sys; print("%s.%s.%s" % sys.version_info[:3]);'],
  semverRange: '>=3.6.0',

  // These can be overridden for testing:
  execFile: cp.execFile,
  env: process.env,
  win: win,
  pyLauncher: 'py.exe',
  winDefaultLocations: winDefaultLocationsArray,

  // Logs a message at verbose level, but also saves it to be displayed later
  // at error level if an error occurs. This should help diagnose the problem.
  addLog: function addLog (message) {
    this.log.verbose(message)
    this.errorLog.push(message)
  },

  // Find Python by trying a sequence of possibilities.
  // Ignore errors, keep trying until Python is found.
  findPython: function findPython () {
    const SKIP = 0; const FAIL = 1
    var toCheck = getChecks.apply(this)

    function getChecks () {
      if (this.env.NODE_GYP_FORCE_PYTHON) {
        return [{
          before: () => {
            this.addLog(
              'checking Python explicitly set from NODE_GYP_FORCE_PYTHON')
            this.addLog('- process.env.NODE_GYP_FORCE_PYTHON is ' +
              `"${this.env.NODE_GYP_FORCE_PYTHON}"`)
          },
          check: this.checkCommand,
          arg: this.env.NODE_GYP_FORCE_PYTHON
        }]
      }

      var checks = [
        {
          before: () => {
            if (!this.configPython) {
              this.addLog(
                'Python is not set from command line or npm configuration')
              return SKIP
            }
            this.addLog('checking Python explicitly set from command line or ' +
              'npm configuration')
            this.addLog('- "--python=" or "npm config get python" is ' +
              `"${this.configPython}"`)
          },
          check: this.checkCommand,
          arg: this.configPython
        },
        {
          before: () => {
            if (!this.env.PYTHON) {
              this.addLog('Python is not set from environment variable ' +
                'PYTHON')
              return SKIP
            }
            this.addLog('checking Python explicitly set from environment ' +
              'variable PYTHON')
            this.addLog(`- process.env.PYTHON is "${this.env.PYTHON}"`)
          },
          check: this.checkCommand,
          arg: this.env.PYTHON
        },
        {
          before: () => { this.addLog('checking if "python3" can be used') },
          check: this.checkCommand,
          arg: 'python3'
        },
        {
          before: () => { this.addLog('checking if "python" can be used') },
          check: this.checkCommand,
          arg: 'python'
        }
      ]

      if (this.win) {
        for (var i = 0; i < this.winDefaultLocations.length; ++i) {
          const location = this.winDefaultLocations[i]
          checks.push({
            before: () => {
              this.addLog('checking if Python is ' +
                `${location}`)
            },
            check: this.checkExecPath,
            arg: location
          })
        }
        checks.push({
          before: () => {
            this.addLog(
              'checking if the py launcher can be used to find Python 3')
          },
          check: this.checkPyLauncher
        })
      }

      return checks
    }

    function runChecks (err) {
      this.log.silly('runChecks: err = %j', (err && err.stack) || err)

      const check = toCheck.shift()
      if (!check) {
        return this.fail()
      }

      const before = check.before.apply(this)
      if (before === SKIP) {
        return runChecks.apply(this)
      }
      if (before === FAIL) {
        return this.fail()
      }

      const args = [runChecks.bind(this)]
      if (check.arg) {
        args.unshift(check.arg)
      }
      check.check.apply(this, args)
    }

    runChecks.apply(this)
  },

  // Check if command is a valid Python to use.
  // Will exit the Python finder on success.
  // If on Windows, run in a CMD shell to support BAT/CMD launchers.
  checkCommand: function checkCommand (command, errorCallback) {
    var exec = command
    var args = this.argsExecutable
    var shell = false
    if (this.win) {
      // Arguments have to be manually quoted
      exec = `"${exec}"`
      args = args.map(a => `"${a}"`)
      shell = true
    }

    this.log.verbose(`- executing "${command}" to get executable path`)
    this.run(exec, args, shell, function (err, execPath) {
      // Possible outcomes:
      // - Error: not in PATH, not executable or execution fails
      // - Gibberish: the next command to check version will fail
      // - Absolute path to executable
      if (err) {
        this.addLog(`- "${command}" is not in PATH or produced an error`)
        return errorCallback(err)
      }
      this.addLog(`- executable path is "${execPath}"`)
      this.checkExecPath(execPath, errorCallback)
    }.bind(this))
  },

  // Check if the py launcher can find a valid Python to use.
  // Will exit the Python finder on success.
  // Distributions of Python on Windows by default install with the "py.exe"
  // Python launcher which is more likely to exist than the Python executable
  // being in the $PATH.
  // Because the Python launcher supports Python 2 and Python 3, we should
  // explicitly request a Python 3 version. This is done by supplying "-3" as
  // the first command line argument. Since "py.exe -3" would be an invalid
  // executable for "execFile", we have to use the launcher to figure out
  // where the actual "python.exe" executable is located.
  checkPyLauncher: function checkPyLauncher (errorCallback) {
    this.log.verbose(
      `- executing "${this.pyLauncher}" to get Python 3 executable path`)
    this.run(this.pyLauncher, ['-3', ...this.argsExecutable], false,
      function (err, execPath) {
      // Possible outcomes: same as checkCommand
        if (err) {
          this.addLog(
            `- "${this.pyLauncher}" is not in PATH or produced an error`)
          return errorCallback(err)
        }
        this.addLog(`- executable path is "${execPath}"`)
        this.checkExecPath(execPath, errorCallback)
      }.bind(this))
  },

  // Check if a Python executable is the correct version to use.
  // Will exit the Python finder on success.
  checkExecPath: function checkExecPath (execPath, errorCallback) {
    this.log.verbose(`- executing "${execPath}" to get version`)
    this.run(execPath, this.argsVersion, false, function (err, version) {
      // Possible outcomes:
      // - Error: executable can not be run (likely meaning the command wasn't
      //   a Python executable and the previous command produced gibberish)
      // - Gibberish: somehow the last command produced an executable path,
      //   this will fail when verifying the version
      // - Version of the Python executable
      if (err) {
        this.addLog(`- "${execPath}" could not be run`)
        return errorCallback(err)
      }
      this.addLog(`- version is "${version}"`)

      const range = new semver.Range(this.semverRange)
      var valid = false
      try {
        valid = range.test(version)
      } catch (err) {
        this.log.silly('range.test() threw:\n%s', err.stack)
        this.addLog(`- "${execPath}" does not have a valid version`)
        this.addLog('- is it a Python executable?')
        return errorCallback(err)
      }

      if (!valid) {
        this.addLog(`- version is ${version} - should be ${this.semverRange}`)
        this.addLog('- THIS VERSION OF PYTHON IS NOT SUPPORTED')
        return errorCallback(new Error(
          `Found unsupported Python version ${version}`))
      }
      this.succeed(execPath, version)
    }.bind(this))
  },

  // Run an executable or shell command, trimming the output.
  run: function run (exec, args, shell, callback) {
    var env = extend({}, this.env)
    env.TERM = 'dumb'
    const opts = { env: env, shell: shell }

    this.log.silly('execFile: exec = %j', exec)
    this.log.silly('execFile: args = %j', args)
    this.log.silly('execFile: opts = %j', opts)
    try {
      this.execFile(exec, args, opts, execFileCallback.bind(this))
    } catch (err) {
      this.log.silly('execFile: threw:\n%s', err.stack)
      return callback(err)
    }

    function execFileCallback (err, stdout, stderr) {
      this.log.silly('execFile result: err = %j', (err && err.stack) || err)
      this.log.silly('execFile result: stdout = %j', stdout)
      this.log.silly('execFile result: stderr = %j', stderr)
      if (err) {
        return callback(err)
      }
      const execPath = stdout.trim()
      callback(null, execPath)
    }
  },

  succeed: function succeed (execPath, version) {
    this.log.info(`using Python version ${version} found at "${execPath}"`)
    process.nextTick(this.callback.bind(null, null, execPath))
  },

  fail: function fail () {
    const errorLog = this.errorLog.join('\n')

    const pathExample = this.win ? 'C:\\Path\\To\\python.exe'
      : '/path/to/pythonexecutable'
    // For Windows 80 col console, use up to the column before the one marked
    // with X (total 79 chars including logger prefix, 58 chars usable here):
    //                                                           X
    const info = [
      '**********************************************************',
      'You need to install the latest version of Python.',
      'Node-gyp should be able to find and use Python. If not,',
      'you can try one of the following options:',
      `- Use the switch --python="${pathExample}"`,
      '  (accepted by both node-gyp and npm)',
      '- Set the environment variable PYTHON',
      '- Set the npm configuration variable python:',
      `  npm config set python "${pathExample}"`,
      'For more information consult the documentation at:',
      'https://github.com/nodejs/node-gyp#installation',
      '**********************************************************'
    ].join('\n')

    this.log.error(`\n${errorLog}\n\n${info}\n`)
    process.nextTick(this.callback.bind(null, new Error(
      'Could not find any Python installation to use')))
  }
}

function findPython (configPython, callback) {
  var finder = new PythonFinder(configPython, callback)
  finder.findPython()
}

module.exports = findPython
module.exports.test = {
  PythonFinder: PythonFinder,
  findPython: findPython
}
