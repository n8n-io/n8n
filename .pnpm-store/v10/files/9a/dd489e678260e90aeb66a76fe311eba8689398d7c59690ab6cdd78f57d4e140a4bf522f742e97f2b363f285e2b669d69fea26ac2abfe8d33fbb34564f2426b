'use strict'

const rm = require('rimraf')
const log = require('npmlog')

function clean (gyp, argv, callback) {
  // Remove the 'build' dir
  var buildDir = 'build'

  log.verbose('clean', 'removing "%s" directory', buildDir)
  rm(buildDir, callback)
}

module.exports = clean
module.exports.usage = 'Removes any generated build files and the "out" dir'
