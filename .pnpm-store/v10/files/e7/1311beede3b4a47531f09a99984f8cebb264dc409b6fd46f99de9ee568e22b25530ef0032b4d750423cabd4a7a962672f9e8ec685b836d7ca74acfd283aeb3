'use strict'

const fs = require('fs')

const { promisify } = require('util')

module.exports = { ...fs }

// Promisify all functions for consistency
const fns = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'lchmod',
  'lchown',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'read',
  'readdir',
  'readFile',
  'readlink',
  'realpath',
  'rename',
  'rmdir',
  'stat',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'write',
  'writeFile'
]
fns.forEach(fn => {
  /* istanbul ignore else: all functions exist on OSX */
  if (fs[fn]) {
    module.exports[fn] = promisify(fs[fn])
  }
})
