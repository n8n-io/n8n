const nativeModule = require('module')
const path = require('path')
const fs = require('fs')

function createRequire (filename) {
  // Fallback to process.cwd() if no filename passed
  if (!filename) {
    filename = process.cwd()
  }

  // If filename is dir, createRequire goes with parent directory, so we need fakepath
  if (isDir(filename)) {
    filename = path.join(filename, 'index.js')
  }

  // Added in Node v12.2.0
  if (nativeModule.createRequire) {
    return nativeModule.createRequire(filename)
  }

  // Added in Node v10.12.0 and deprecated since Node v12.2.0
  if (nativeModule.createRequireFromPath) {
    return nativeModule.createRequireFromPath(filename)
  }

  // Polyfill
  return _createRequire(filename)
}

// Polyfill
function _createRequire (filename) {
  const mod = new nativeModule.Module(filename, null)
  mod.filename = filename
  mod.paths = nativeModule.Module._nodeModulePaths(path.dirname(filename))
  mod._compile('module.exports = require;', filename)
  return mod.exports
}

function isDir (path) {
  try {
    const stat = fs.lstatSync(path)
    return stat.isDirectory()
  } catch (e) {
    // lstatSync throws an error if path doesn't exist
    return false
  }
}

module.exports = createRequire
