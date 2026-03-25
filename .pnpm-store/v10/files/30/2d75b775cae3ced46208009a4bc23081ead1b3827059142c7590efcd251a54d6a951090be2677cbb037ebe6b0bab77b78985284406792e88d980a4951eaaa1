'use strict'

const Errors = process.version.charCodeAt(1) < 55 && process.version.charCodeAt(2) === 46
  ? require('./lib/old') // Node.js < 7
  : require('./lib/modern')

module.exports = Errors
