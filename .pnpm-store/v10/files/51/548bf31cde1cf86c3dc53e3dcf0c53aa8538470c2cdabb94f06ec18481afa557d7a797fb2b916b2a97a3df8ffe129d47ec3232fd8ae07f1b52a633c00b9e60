const execa = require('execa')
/* c8 ignore start */
const pkgArgs = process.pkg ? { PKG_EXECPATH: '' } : {}
/* c8 ignore stop */

const execute = {
  execa (command, args, options) {
    return execa(command, args, { ...options, env: { ...options.env, ...pkgArgs } })
  }
}

module.exports = execute
