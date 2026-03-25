// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 *  This implementation is still in beta, and may change.
 *
 *  Wrapper for getting information from the Selenium Manager binaries
 */

const { platform } = require('node:process')
const path = require('node:path')
const fs = require('node:fs')
const spawnSync = require('node:child_process').spawnSync
const logging = require('../lib/logging')

const log_ = logging.getLogger(logging.Type.DRIVER)
let debugMessagePrinted = false

/**
 * Determines the path of the correct Selenium Manager binary
 * @returns {string}
 */
function getBinary() {
  const directory = {
    darwin: 'macos',
    win32: 'windows',
    cygwin: 'windows',
    linux: 'linux',
  }[platform]

  const file = directory === 'windows' ? 'selenium-manager.exe' : 'selenium-manager'

  let seleniumManagerBasePath = path.join(__dirname, '..', '/bin')

  const filePath = process.env.SE_MANAGER_PATH || path.join(seleniumManagerBasePath, directory, file)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Unable to obtain Selenium Manager at ${filePath}`)
  }

  if (!debugMessagePrinted) {
    log_.debug(`Selenium Manager binary found at ${filePath}`)
    debugMessagePrinted = true // Set the flag to true after printing the debug message
  }

  return filePath
}

/**
 * Determines the path of the correct driver
 * @param {string[]} args arguments to invoke Selenium Manager
 * @returns {{browserPath: string, driverPath: string}} path of the driver and
 * browser location
 */

function binaryPaths(args) {
  const smBinary = getBinary()
  const spawnResult = spawnSync(smBinary, args)
  let output
  if (spawnResult.status) {
    let errorMessage
    if (spawnResult.stderr.toString()) {
      errorMessage = spawnResult.stderr.toString()
    }
    if (spawnResult.stdout.toString()) {
      try {
        output = JSON.parse(spawnResult.stdout.toString())
        logOutput(output)
        errorMessage = output.result.message
      } catch (e) {
        errorMessage = e.toString()
      }
    }
    throw new Error(`Error executing command for ${smBinary} with ${args}: ${errorMessage}`)
  }
  try {
    output = JSON.parse(spawnResult.stdout.toString())
  } catch (e) {
    throw new Error(`Error executing command for ${smBinary} with ${args}: ${e.toString()}`)
  }

  logOutput(output)
  return {
    driverPath: output.result.driver_path,
    browserPath: output.result.browser_path,
  }
}

function logOutput(output) {
  for (const key in output.logs) {
    if (output.logs[key].level === 'WARN') {
      log_.warning(`${output.logs[key].message}`)
    }
    if (['DEBUG', 'INFO'].includes(output.logs[key].level)) {
      log_.debug(`${output.logs[key].message}`)
    }
  }
}

// PUBLIC API
module.exports = { binaryPaths }
