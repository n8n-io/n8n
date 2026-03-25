/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const cp = require('child_process')
const fs = require('fs')
const path = require('path')
const BufferStream = require('./buffer-stream')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

const FILE_NAME = 'test.txt'
const NPM_RUN_ALL = path.resolve(__dirname, '../../bin/npm-run-all/index.js')
const RUN_P = path.resolve(__dirname, '../../bin/run-p/index.js')
const RUN_S = path.resolve(__dirname, '../../bin/run-s/index.js')

/**
 * Spawns the given script with the given arguments.
 *
 * @param {string} filePath - The file path to be executed.
 * @param {string[]} args - The arguments to execute.
 * @param {Writable} [stdout] - The writable stream to receive stdout.
 * @param {Writable} [stderr] - The writable stream to receive stderr.
 * @returns {Promise<void>} The promise which becomes fulfilled if the child
 *  process finished.
 */
function spawn (filePath, args, stdout, stderr) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(
      process.execPath,
      [filePath].concat(args),
      { stdio: 'pipe' }
    )
    const out = new BufferStream()
    const error = new BufferStream()

    if (stdout != null) {
      child.stdout.pipe(stdout)
    }
    if (stderr != null) {
      child.stderr.pipe(stderr)
    } else {
      child.stderr.pipe(error)
    }
    child.stdout.pipe(out)
    child.on('close', (exitCode) => {
      if (exitCode) {
        reject(new Error(error.value || 'Exited with non-zero code.'))
      } else {
        resolve()
      }
    })
    child.on('error', reject)
  })
}

// ------------------------------------------------------------------------------
// Public Interface
// ------------------------------------------------------------------------------

/**
 * Gets the result text from `test.txt`.
 *
 * @returns {string|null} The result text.
 */
module.exports.result = function result () {
  try {
    return fs.readFileSync(FILE_NAME, { encoding: 'utf8' })
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

/**
 * Appends text to `test.txt`.
 *
 * @param {string} content - A text to append.
 * @returns {void}
 */
module.exports.appendResult = function appendResult (content) {
  fs.appendFileSync(FILE_NAME, content)
}

/**
 * Removes `test.txt`.
 *
 * @returns {void}
 */
module.exports.removeResult = function removeResult () {
  try {
    fs.unlinkSync(FILE_NAME)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return
    }
    throw err
  }
}

/**
 * Delay.
 *
 * @param {number} timeoutInMillis - The time to delay.
 * @returns {Promise<void>} The promise which fulfilled after the given time.
 */
module.exports.delay = function delay (timeoutInMillis) {
  return new Promise(resolve => {
    setTimeout(resolve, timeoutInMillis)
  })
}

/**
 * Executes `npm-run-all` with the given arguments.
 *
 * @param {string[]} args - The arguments to execute.
 * @param {Writable} [stdout] - The writable stream to receive stdout.
 * @param {Writable} [stderr] - The writable stream to receive stderr.
 * @returns {Promise<void>} The promise which becomes fulfilled if the child
 *  process finished.
 */
module.exports.runAll = function runAll (args, stdout, stderr) {
  return spawn(NPM_RUN_ALL, args, stdout, stderr)
}

/**
 * Executes `run-p` with the given arguments.
 *
 * @param {string[]} args - The arguments to execute.
 * @param {Writable} [stdout] - The writable stream to receive stdout.
 * @param {Writable} [stderr] - The writable stream to receive stderr.
 * @returns {Promise<void>} The promise which becomes fulfilled if the child
 *  process finished.
 */
module.exports.runPar = function runPar (args, stdout, stderr) {
  return spawn(RUN_P, args, stdout, stderr)
}

/**
 * Executes `run-s` with the given arguments.
 *
 * @param {string[]} args - The arguments to execute.
 * @param {Writable} [stdout] - The writable stream to receive stdout.
 * @param {Writable} [stderr] - The writable stream to receive stderr.
 * @returns {Promise<void>} The promise which becomes fulfilled if the child
 *  process finished.
 */
module.exports.runSeq = function runSeq (args, stdout, stderr) {
  return spawn(RUN_S, args, stdout, stderr)
}
