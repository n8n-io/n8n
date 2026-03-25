'use strict'

const fs = require('fs')
const rm = require('rimraf')
const path = require('path')
const log = require('npmlog')
const semver = require('semver')

function remove (gyp, argv, callback) {
  var devDir = gyp.devDir
  log.verbose('remove', 'using node-gyp dir:', devDir)

  // get the user-specified version to remove
  var version = argv[0] || gyp.opts.target
  log.verbose('remove', 'removing target version:', version)

  if (!version) {
    return callback(new Error('You must specify a version number to remove. Ex: "' + process.version + '"'))
  }

  var versionSemver = semver.parse(version)
  if (versionSemver) {
    // flatten the version Array into a String
    version = versionSemver.version
  }

  var versionPath = path.resolve(gyp.devDir, version)
  log.verbose('remove', 'removing development files for version:', version)

  // first check if its even installed
  fs.stat(versionPath, function (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        callback(null, 'version was already uninstalled: ' + version)
      } else {
        callback(err)
      }
      return
    }
    // Go ahead and delete the dir
    rm(versionPath, callback)
  })
}

module.exports = exports = remove
module.exports.usage = 'Removes the node development files for the specified version'
