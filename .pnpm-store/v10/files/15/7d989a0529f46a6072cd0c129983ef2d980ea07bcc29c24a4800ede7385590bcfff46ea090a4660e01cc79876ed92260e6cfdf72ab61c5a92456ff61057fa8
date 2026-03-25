'use strict'

const fs = require('@npmcli/fs')

const fixOwner = require('./fix-owner')
const path = require('path')

module.exports.mkdir = mktmpdir

function mktmpdir (cache, opts = {}) {
  const { tmpPrefix } = opts
  const tmpDir = path.join(cache, 'tmp')
  return fs.mkdir(tmpDir, { recursive: true, owner: 'inherit' })
    .then(() => {
      // do not use path.join(), it drops the trailing / if tmpPrefix is unset
      const target = `${tmpDir}${path.sep}${tmpPrefix || ''}`
      return fs.mkdtemp(target, { owner: 'inherit' })
    })
}

module.exports.withTmp = withTmp

function withTmp (cache, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  return fs.withTempDir(path.join(cache, 'tmp'), cb, opts)
}

module.exports.fix = fixtmpdir

function fixtmpdir (cache) {
  return fixOwner(cache, path.join(cache, 'tmp'))
}
