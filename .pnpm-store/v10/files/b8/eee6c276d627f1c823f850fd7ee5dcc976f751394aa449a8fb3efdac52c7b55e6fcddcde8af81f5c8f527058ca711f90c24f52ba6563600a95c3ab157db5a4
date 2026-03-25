'use strict'

const useLegacyCrypto = parseInt(process.versions && process.versions.node && process.versions.node.split('.')[0]) < 15
if (useLegacyCrypto) {
  // We are on an old version of Node.js that requires legacy crypto utilities.
  module.exports = require('./utils-legacy')
} else {
  module.exports = require('./utils-webcrypto')
}
