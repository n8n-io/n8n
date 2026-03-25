const os = require('os')
const path = require('path')

function resolveHome (filepath) {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1))
  }

  return filepath
}

module.exports = resolveHome
