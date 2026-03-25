/**
 * @module run-task
 * @author Toru Nagashima
 * @copyright 2015 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')

const ansiStylesPromise = import('ansi-styles')
const parseArgs = require('shell-quote').parse
const which = require('which')

const createHeader = require('./create-header')
const createPrefixTransform = require('./create-prefix-transform-stream')
const spawn = require('./spawn')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const colors = ['cyan', 'green', 'magenta', 'yellow', 'red']

let colorIndex = 0
const taskNamesToColors = new Map()

/**
 * Select a color from given task name.
 *
 * @param {string} taskName - The task name.
 * @returns {function} A colorize function that provided by `chalk`
 */
function selectColor (taskName) {
  let color = taskNamesToColors.get(taskName)
  if (!color) {
    color = colors[colorIndex]
    colorIndex = (colorIndex + 1) % colors.length
    taskNamesToColors.set(taskName, color)
  }
  return color
}

/**
 * Wraps stdout/stderr with a transform stream to add the task name as prefix.
 *
 * @param {string} taskName - The task name.
 * @param {stream.Writable} source - An output stream to be wrapped.
 * @param {object} labelState - An label state for the transform stream.
 * @returns {stream.Writable} `source` or the created wrapped stream.
 */
function wrapLabeling (taskName, source, labelState, ansiStyles) {
  if (source == null || !labelState.enabled) {
    return source
  }

  const label = taskName.padEnd(labelState.width)
  const color = source.isTTY ? ansiStyles[selectColor(taskName)] : { open: '', close: '' }
  const prefix = `${color.open}[${label}]${color.close} `
  const stream = createPrefixTransform(prefix, labelState)

  stream.pipe(source)

  return stream
}

/**
 * Converts a given stream to an option for `child_process.spawn`.
 *
 * @param {stream.Readable|stream.Writable|null} stream - An original stream to convert.
 * @param {process.stdin|process.stdout|process.stderr} std - A standard stream for this option.
 * @returns {string|stream.Readable|stream.Writable} An option for `child_process.spawn`.
 */
function detectStreamKind (stream, std) {
  return (
    stream == null
      ? 'ignore' // `|| !std.isTTY` is needed for the workaround of https://github.com/nodejs/node/issues/5620
      : stream !== std || !std.isTTY
        ? 'pipe'
        : stream
  )
}

/**
 * Ensure the output of shell-quote's `parse()` is acceptable input to npm-cli.
 *
 * The `parse()` method of shell-quote sometimes returns special objects in its
 * output array, e.g. if it thinks some elements should be globbed. But npm-cli
 * only accepts strings and will throw an error otherwise.
 *
 * See https://github.com/substack/node-shell-quote#parsecmd-env
 *
 * @param {object|string} arg - Item in the output of shell-quote's `parse()`.
 * @returns {string} A valid argument for npm-cli.
 */
function cleanTaskArg (arg) {
  return arg.pattern || arg.op || arg
}

// ------------------------------------------------------------------------------
// Interface
// ------------------------------------------------------------------------------

/**
 * Run a npm-script of a given name.
 * The return value is a promise which has an extra method: `abort()`.
 * The `abort()` kills the child process to run the npm-script.
 *
 * @param {string} task - A npm-script name to run.
 * @param {object} options - An option object.
 * @param {stream.Readable|null} options.stdin -
 *   A readable stream to send messages to stdin of child process.
 *   If this is `null`, ignores it.
 *   If this is `process.stdin`, inherits it.
 *   Otherwise, makes a pipe.
 * @param {stream.Writable|null} options.stdout -
 *   A writable stream to receive messages from stdout of child process.
 *   If this is `null`, cannot send.
 *   If this is `process.stdout`, inherits it.
 *   Otherwise, makes a pipe.
 * @param {stream.Writable|null} options.stderr -
 *   A writable stream to receive messages from stderr of child process.
 *   If this is `null`, cannot send.
 *   If this is `process.stderr`, inherits it.
 *   Otherwise, makes a pipe.
 * @param {string[]} options.prefixOptions -
 *   An array of options which are inserted before the task name.
 * @param {object} options.labelState - A state object for printing labels.
 * @param {boolean} options.printName - The flag to print task names before running each task.
 * @param {object} options.packageInfo - A package.json's information.
 * @param {object} options.packageInfo.body - A package.json's JSON object.
 * @param {string} options.packageInfo.path - A package.json's file path.
 * @returns {Promise}
 *   A promise object which becomes fullfilled when the npm-script is completed.
 *   This promise object has an extra method: `abort()`.
 * @private
 */
module.exports = function runTask (task, options) {
  let cp = null

  async function asyncRunTask () {
    const { default: ansiStyles } = await ansiStylesPromise

    const stdin = options.stdin
    const stdout = wrapLabeling(task, options.stdout, options.labelState, ansiStyles)
    const stderr = wrapLabeling(task, options.stderr, options.labelState, ansiStyles)
    const stdinKind = detectStreamKind(stdin, process.stdin)
    const stdoutKind = detectStreamKind(stdout, process.stdout)
    const stderrKind = detectStreamKind(stderr, process.stderr)
    const spawnOptions = { stdio: [stdinKind, stdoutKind, stderrKind] }

    // Print task name.
    if (options.printName && stdout != null) {
      stdout.write(createHeader(
        task,
        options.packageInfo,
        options.stdout.isTTY,
        ansiStyles
      ))
    }

    // Execute.
    let npmPath = options.npmPath
    if (!npmPath && process.env.npm_execpath) {
      const basename = path.basename(process.env.npm_execpath)
      let newBasename = basename
      if (basename.startsWith('npx')) {
        newBasename = basename.replace('npx', 'npm')
      } else if (basename.startsWith('pnpx')) {
        newBasename = basename.replace('pnpx', 'pnpm')
      }

      npmPath = newBasename !== basename
        ? path.join(path.dirname(process.env.npm_execpath), newBasename)
        : process.env.npm_execpath
    }

    const npmPathIsJs = typeof npmPath === 'string' && /\.(c|m)?js/.test(path.extname(npmPath))
    let execPath = (npmPathIsJs ? process.execPath : npmPath || 'npm')

    if (!npmPath && !process.env.npm_execpath) {
      // When a script is being run via pnpm, npmPath and npm_execpath will be null or undefined
      // Attempt to figure out whether we're running via pnpm
      const projectRoot = path.dirname(options.packageInfo.path)
      const hasPnpmLockfile = fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))
      const whichPnpmResults = await which('pnpm', { nothrow: true })
      const pnpmFound = whichPnpmResults?.status
      const pnpmWhichOutput = whichPnpmResults?.output
      if (hasPnpmLockfile && __dirname.split(path.delimiter).includes('.pnpm') && pnpmFound) {
        execPath = pnpmWhichOutput
      }
    }

    const isYarn = process.env.npm_config_user_agent && process.env.npm_config_user_agent.startsWith('yarn')
    const isPnpm = Boolean(process.env.PNPM_SCRIPT_SRC_DIR)
    const isNpm = !isYarn && !isPnpm

    const spawnArgs = ['run']

    if (npmPathIsJs) {
      spawnArgs.unshift(npmPath)
    }
    if (isNpm) {
      Array.prototype.push.apply(spawnArgs, options.prefixOptions)
    } else if (options.prefixOptions.indexOf('--silent') !== -1) {
      spawnArgs.push('--silent')
    }
    Array.prototype.push.apply(spawnArgs, parseArgs(task).map(cleanTaskArg))

    cp = spawn(execPath, spawnArgs, spawnOptions)

    // Piping stdio.
    if (stdinKind === 'pipe') {
      stdin.pipe(cp.stdin)
    }
    if (stdoutKind === 'pipe') {
      cp.stdout.pipe(stdout, { end: false })
    }
    if (stderrKind === 'pipe') {
      cp.stderr.pipe(stderr, { end: false })
    }

    return new Promise((resolve, reject) => {
      // Register
      cp.on('error', (err) => {
        cp = null
        reject(err)
      })
      cp.on('close', (code, signal) => {
        cp = null
        resolve({ task, code, signal })
      })
    })
  }

  const promise = asyncRunTask()

  promise.abort = function abort () {
    if (cp != null) {
      cp.kill()
      cp = null
    }
  }

  return promise
}
