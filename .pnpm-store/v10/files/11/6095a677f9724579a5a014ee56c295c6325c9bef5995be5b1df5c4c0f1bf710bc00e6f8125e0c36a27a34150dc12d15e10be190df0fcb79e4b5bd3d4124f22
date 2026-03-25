const url = require('url')

const node = require('../node.js')
const polyfill = require('./polyfill.js')

const useNative = node.satisfies('>=10.12.0')

const fileURLToPath = (path) => {
  // the polyfill is tested separately from this module, no need to hack
  // process.version to try to trigger it just for coverage
  // istanbul ignore next
  return useNative
    ? url.fileURLToPath(path)
    : polyfill(path)
}

module.exports = fileURLToPath
