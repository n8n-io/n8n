'use strict'

const path = require('path')
const log = require('npmlog')

function findNodeDirectory (scriptLocation, processObj) {
  // set dirname and process if not passed in
  // this facilitates regression tests
  if (scriptLocation === undefined) {
    scriptLocation = __dirname
  }
  if (processObj === undefined) {
    processObj = process
  }

  // Have a look to see what is above us, to try and work out where we are
  var npmParentDirectory = path.join(scriptLocation, '../../../..')
  log.verbose('node-gyp root', 'npm_parent_directory is ' +
              path.basename(npmParentDirectory))
  var nodeRootDir = ''

  log.verbose('node-gyp root', 'Finding node root directory')
  if (path.basename(npmParentDirectory) === 'deps') {
    // We are in a build directory where this script lives in
    // deps/npm/node_modules/node-gyp/lib
    nodeRootDir = path.join(npmParentDirectory, '..')
    log.verbose('node-gyp root', 'in build directory, root = ' +
                nodeRootDir)
  } else if (path.basename(npmParentDirectory) === 'node_modules') {
    // We are in a node install directory where this script lives in
    // lib/node_modules/npm/node_modules/node-gyp/lib or
    // node_modules/npm/node_modules/node-gyp/lib depending on the
    // platform
    if (processObj.platform === 'win32') {
      nodeRootDir = path.join(npmParentDirectory, '..')
    } else {
      nodeRootDir = path.join(npmParentDirectory, '../..')
    }
    log.verbose('node-gyp root', 'in install directory, root = ' +
                nodeRootDir)
  } else {
    // We don't know where we are, try working it out from the location
    // of the node binary
    var nodeDir = path.dirname(processObj.execPath)
    var directoryUp = path.basename(nodeDir)
    if (directoryUp === 'bin') {
      nodeRootDir = path.join(nodeDir, '..')
    } else if (directoryUp === 'Release' || directoryUp === 'Debug') {
      // If we are a recently built node, and the directory structure
      // is that of a repository. If we are on Windows then we only need
      // to go one level up, everything else, two
      if (processObj.platform === 'win32') {
        nodeRootDir = path.join(nodeDir, '..')
      } else {
        nodeRootDir = path.join(nodeDir, '../..')
      }
    }
    // Else return the default blank, "".
  }
  return nodeRootDir
}

module.exports = findNodeDirectory
