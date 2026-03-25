'use strict';

const util = require('util');
const fs = require('fs')

/**
 * Boolean indicating if debug mode is enabled.
 *
 * @type {boolean}
 */
const IS_DEBUG = process.env.SPAWN_WRAP_DEBUG === '1'

/**
 * If debug is enabled, write message to stderr.
 *
 * If debug is disabled, no message is written.
 */
function debug(...args) {
  if (!IS_DEBUG) {
    return;
  }

  const prefix = `SW ${process.pid}: `
  const data = util.format(...args).trim()
  const message = data.split('\n').map(line => `${prefix}${line}\n`).join('')
  fs.writeSync(2, message)
}

module.exports = {
  IS_DEBUG,
  debug,
}
