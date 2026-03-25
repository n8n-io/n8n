// this file is a modified version of the code in node core >=14.14.0
// which is, in turn, a modified version of the rimraf module on npm
// node core changes:
// - Use of the assert module has been replaced with core's error system.
// - All code related to the glob dependency has been removed.
// - Bring your own custom fs module is not currently supported.
// - Some basic code cleanup.
// changes here:
// - remove all callback related code
// - drop sync support
// - change assertions back to non-internal methods (see options.js)
// - throws ENOTDIR when rmdir gets an ENOENT for a path that exists in Windows
const errnos = require('os').constants.errno
const { join } = require('path')
const fs = require('../fs.js')

// error codes that mean we need to remove contents
const notEmptyCodes = new Set([
  'ENOTEMPTY',
  'EEXIST',
  'EPERM',
])

// error codes we can retry later
const retryCodes = new Set([
  'EBUSY',
  'EMFILE',
  'ENFILE',
  'ENOTEMPTY',
  'EPERM',
])

const isWindows = process.platform === 'win32'

const defaultOptions = {
  retryDelay: 100,
  maxRetries: 0,
  recursive: false,
  force: false,
}

// this is drastically simplified, but should be roughly equivalent to what
// node core throws
class ERR_FS_EISDIR extends Error {
  constructor (path) {
    super()
    this.info = {
      code: 'EISDIR',
      message: 'is a directory',
      path,
      syscall: 'rm',
      errno: errnos.EISDIR,
    }
    this.name = 'SystemError'
    this.code = 'ERR_FS_EISDIR'
    this.errno = errnos.EISDIR
    this.syscall = 'rm'
    this.path = path
    this.message = `Path is a directory: ${this.syscall} returned ` +
      `${this.info.code} (is a directory) ${path}`
  }

  toString () {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

class ENOTDIR extends Error {
  constructor (path) {
    super()
    this.name = 'Error'
    this.code = 'ENOTDIR'
    this.errno = errnos.ENOTDIR
    this.syscall = 'rmdir'
    this.path = path
    this.message = `not a directory, ${this.syscall} '${this.path}'`
  }

  toString () {
    return `${this.name}: ${this.code}: ${this.message}`
  }
}

// force is passed separately here because we respect it for the first entry
// into rimraf only, any further calls that are spawned as a result (i.e. to
// delete content within the target) will ignore ENOENT errors
const rimraf = async (path, options, isTop = false) => {
  const force = isTop ? options.force : true
  const stat = await fs.lstat(path)
    .catch((err) => {
      // we only ignore ENOENT if we're forcing this call
      if (err.code === 'ENOENT' && force) {
        return
      }

      if (isWindows && err.code === 'EPERM') {
        return fixEPERM(path, options, err, isTop)
      }

      throw err
    })

  // no stat object here means either lstat threw an ENOENT, or lstat threw
  // an EPERM and the fixPERM function took care of things. either way, we're
  // already done, so return early
  if (!stat) {
    return
  }

  if (stat.isDirectory()) {
    return rmdir(path, options, null, isTop)
  }

  return fs.unlink(path)
    .catch((err) => {
      if (err.code === 'ENOENT' && force) {
        return
      }

      if (err.code === 'EISDIR') {
        return rmdir(path, options, err, isTop)
      }

      if (err.code === 'EPERM') {
        // in windows, we handle this through fixEPERM which will also try to
        // delete things again. everywhere else since deleting the target as a
        // file didn't work we go ahead and try to delete it as a directory
        return isWindows
          ? fixEPERM(path, options, err, isTop)
          : rmdir(path, options, err, isTop)
      }

      throw err
    })
}

const fixEPERM = async (path, options, originalErr, isTop) => {
  const force = isTop ? options.force : true
  const targetMissing = await fs.chmod(path, 0o666)
    .catch((err) => {
      if (err.code === 'ENOENT' && force) {
        return true
      }

      throw originalErr
    })

  // got an ENOENT above, return now. no file = no problem
  if (targetMissing) {
    return
  }

  // this function does its own lstat rather than calling rimraf again to avoid
  // infinite recursion for a repeating EPERM
  const stat = await fs.lstat(path)
    .catch((err) => {
      if (err.code === 'ENOENT' && force) {
        return
      }

      throw originalErr
    })

  if (!stat) {
    return
  }

  if (stat.isDirectory()) {
    return rmdir(path, options, originalErr, isTop)
  }

  return fs.unlink(path)
}

const rmdir = async (path, options, originalErr, isTop) => {
  if (!options.recursive && isTop) {
    throw originalErr || new ERR_FS_EISDIR(path)
  }
  const force = isTop ? options.force : true

  return fs.rmdir(path)
    .catch(async (err) => {
      // in Windows, calling rmdir on a file path will fail with ENOENT rather
      // than ENOTDIR. to determine if that's what happened, we have to do
      // another lstat on the path. if the path isn't actually gone, we throw
      // away the ENOENT and replace it with our own ENOTDIR
      if (isWindows && err.code === 'ENOENT') {
        const stillExists = await fs.lstat(path).then(() => true, () => false)
        if (stillExists) {
          err = new ENOTDIR(path)
        }
      }

      // not there, not a problem
      if (err.code === 'ENOENT' && force) {
        return
      }

      // we may not have originalErr if lstat tells us our target is a
      // directory but that changes before we actually remove it, so
      // only throw it here if it's set
      if (originalErr && err.code === 'ENOTDIR') {
        throw originalErr
      }

      // the directory isn't empty, remove the contents and try again
      if (notEmptyCodes.has(err.code)) {
        const files = await fs.readdir(path)
        await Promise.all(files.map((file) => {
          const target = join(path, file)
          return rimraf(target, options)
        }))
        return fs.rmdir(path)
      }

      throw err
    })
}

const rm = async (path, opts) => {
  const options = { ...defaultOptions, ...opts }
  let retries = 0

  const errHandler = async (err) => {
    if (retryCodes.has(err.code) && ++retries < options.maxRetries) {
      const delay = retries * options.retryDelay
      await promiseTimeout(delay)
      return rimraf(path, options, true).catch(errHandler)
    }

    throw err
  }

  return rimraf(path, options, true).catch(errHandler)
}

const promiseTimeout = (ms) => new Promise((r) => setTimeout(r, ms))

module.exports = rm
