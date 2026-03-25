const { dirname } = require('path')

const fileURLToPath = require('../common/file-url-to-path/index.js')
const fs = require('../fs.js')

const defaultOptions = {
  mode: 0o777,
  recursive: false,
}

const mkdir = async (path, opts) => {
  const options = { ...defaultOptions, ...opts }

  // if we're not in recursive mode, just call the real mkdir with the path and
  // the mode option only
  if (!options.recursive) {
    return fs.mkdir(path, options.mode)
  }

  const makeDirectory = async (dir, mode) => {
    // we can't use dirname directly since these functions support URL
    // objects with the file: protocol as the path input, so first we get a
    // string path, then we can call dirname on that
    const parent = dir != null && dir.href && dir.origin
      ? dirname(fileURLToPath(dir))
      : dirname(dir)

    // if the parent is the dir itself, try to create it. anything but EISDIR
    // should be rethrown
    if (parent === dir) {
      try {
        await fs.mkdir(dir, opts)
      } catch (err) {
        if (err.code !== 'EISDIR') {
          throw err
        }
      }
      return undefined
    }

    try {
      await fs.mkdir(dir, mode)
      return dir
    } catch (err) {
      // ENOENT means the parent wasn't there, so create that
      if (err.code === 'ENOENT') {
        const made = await makeDirectory(parent, mode)
        await makeDirectory(dir, mode)
        // return the shallowest path we created, i.e. the result of creating
        // the parent
        return made
      }

      // an EEXIST means there's already something there
      // an EROFS means we have a read-only filesystem and can't create a dir
      // any other error is fatal and we should give up now
      if (err.code !== 'EEXIST' && err.code !== 'EROFS') {
        throw err
      }

      // stat the directory, if the result is a directory, then we successfully
      // created this one so return its path. otherwise, we reject with the
      // original error by ignoring the error in the catch
      try {
        const stat = await fs.stat(dir)
        if (stat.isDirectory()) {
          // if it already existed, we didn't create anything so return
          // undefined
          return undefined
        }
      } catch (_) {}

      // if the thing that's there isn't a directory, then just re-throw
      throw err
    }
  }

  return makeDirectory(path, options.mode)
}

module.exports = mkdir
