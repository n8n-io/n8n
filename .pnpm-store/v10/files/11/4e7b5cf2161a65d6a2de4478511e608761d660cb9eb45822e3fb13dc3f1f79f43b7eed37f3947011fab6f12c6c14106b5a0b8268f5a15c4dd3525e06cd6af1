// this file is a modified version of the code in node 17.2.0
// which is, in turn, a modified version of the fs-extra module on npm
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
'use strict'

const {
  ERR_FS_CP_DIR_TO_NON_DIR,
  ERR_FS_CP_EEXIST,
  ERR_FS_CP_EINVAL,
  ERR_FS_CP_FIFO_PIPE,
  ERR_FS_CP_NON_DIR_TO_DIR,
  ERR_FS_CP_SOCKET,
  ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY,
  ERR_FS_CP_UNKNOWN,
  ERR_FS_EISDIR,
  ERR_INVALID_ARG_TYPE,
} = require('../errors.js')
const {
  constants: {
    errno: {
      EEXIST,
      EISDIR,
      EINVAL,
      ENOTDIR,
    },
  },
} = require('os')
const {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readdir,
  readlink,
  stat,
  symlink,
  unlink,
  utimes,
} = require('../fs.js')
const {
  dirname,
  isAbsolute,
  join,
  parse,
  resolve,
  sep,
  toNamespacedPath,
} = require('path')
const { fileURLToPath } = require('url')

const defaultOptions = {
  dereference: false,
  errorOnExist: false,
  filter: undefined,
  force: true,
  preserveTimestamps: false,
  recursive: false,
}

async function cp (src, dest, opts) {
  if (opts != null && typeof opts !== 'object') {
    throw new ERR_INVALID_ARG_TYPE('options', ['Object'], opts)
  }
  return cpFn(
    toNamespacedPath(getValidatedPath(src)),
    toNamespacedPath(getValidatedPath(dest)),
    { ...defaultOptions, ...opts })
}

function getValidatedPath (fileURLOrPath) {
  const path = fileURLOrPath != null && fileURLOrPath.href
      && fileURLOrPath.origin
    ? fileURLToPath(fileURLOrPath)
    : fileURLOrPath
  return path
}

async function cpFn (src, dest, opts) {
  // Warn about using preserveTimestamps on 32-bit node
  // istanbul ignore next
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    const warning = 'Using the preserveTimestamps option in 32-bit ' +
      'node is not recommended'
    process.emitWarning(warning, 'TimestampPrecisionWarning')
  }
  const stats = await checkPaths(src, dest, opts)
  const { srcStat, destStat } = stats
  await checkParentPaths(src, srcStat, dest)
  if (opts.filter) {
    return handleFilter(checkParentDir, destStat, src, dest, opts)
  }
  return checkParentDir(destStat, src, dest, opts)
}

async function checkPaths (src, dest, opts) {
  const { 0: srcStat, 1: destStat } = await getStats(src, dest, opts)
  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      throw new ERR_FS_CP_EINVAL({
        message: 'src and dest cannot be the same',
        path: dest,
        syscall: 'cp',
        errno: EINVAL,
      })
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new ERR_FS_CP_DIR_TO_NON_DIR({
        message: `cannot overwrite directory ${src} ` +
            `with non-directory ${dest}`,
        path: dest,
        syscall: 'cp',
        errno: EISDIR,
      })
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new ERR_FS_CP_NON_DIR_TO_DIR({
        message: `cannot overwrite non-directory ${src} ` +
            `with directory ${dest}`,
        path: dest,
        syscall: 'cp',
        errno: ENOTDIR,
      })
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new ERR_FS_CP_EINVAL({
      message: `cannot copy ${src} to a subdirectory of self ${dest}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  }
  return { srcStat, destStat }
}

function areIdentical (srcStat, destStat) {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino &&
    destStat.dev === srcStat.dev
}

function getStats (src, dest, opts) {
  const statFunc = opts.dereference ?
    (file) => stat(file, { bigint: true }) :
    (file) => lstat(file, { bigint: true })
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch((err) => {
      // istanbul ignore next: unsure how to cover.
      if (err.code === 'ENOENT') {
        return null
      }
      // istanbul ignore next: unsure how to cover.
      throw err
    }),
  ])
}

async function checkParentDir (destStat, src, dest, opts) {
  const destParent = dirname(dest)
  const dirExists = await pathExists(destParent)
  if (dirExists) {
    return getStatsForCopy(destStat, src, dest, opts)
  }
  await mkdir(destParent, { recursive: true })
  return getStatsForCopy(destStat, src, dest, opts)
}

function pathExists (dest) {
  return stat(dest).then(
    () => true,
    // istanbul ignore next: not sure when this would occur
    (err) => (err.code === 'ENOENT' ? false : Promise.reject(err)))
}

// Recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
async function checkParentPaths (src, srcStat, dest) {
  const srcParent = resolve(dirname(src))
  const destParent = resolve(dirname(dest))
  if (destParent === srcParent || destParent === parse(destParent).root) {
    return
  }
  let destStat
  try {
    destStat = await stat(destParent, { bigint: true })
  } catch (err) {
    // istanbul ignore else: not sure when this would occur
    if (err.code === 'ENOENT') {
      return
    }
    // istanbul ignore next: not sure when this would occur
    throw err
  }
  if (areIdentical(srcStat, destStat)) {
    throw new ERR_FS_CP_EINVAL({
      message: `cannot copy ${src} to a subdirectory of self ${dest}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  }
  return checkParentPaths(src, srcStat, destParent)
}

const normalizePathToArray = (path) =>
  resolve(path).split(sep).filter(Boolean)

// Return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = normalizePathToArray(src)
  const destArr = normalizePathToArray(dest)
  return srcArr.every((cur, i) => destArr[i] === cur)
}

async function handleFilter (onInclude, destStat, src, dest, opts, cb) {
  const include = await opts.filter(src, dest)
  if (include) {
    return onInclude(destStat, src, dest, opts, cb)
  }
}

function startCopy (destStat, src, dest, opts) {
  if (opts.filter) {
    return handleFilter(getStatsForCopy, destStat, src, dest, opts)
  }
  return getStatsForCopy(destStat, src, dest, opts)
}

async function getStatsForCopy (destStat, src, dest, opts) {
  const statFn = opts.dereference ? stat : lstat
  const srcStat = await statFn(src)
  // istanbul ignore else: can't portably test FIFO
  if (srcStat.isDirectory() && opts.recursive) {
    return onDir(srcStat, destStat, src, dest, opts)
  } else if (srcStat.isDirectory()) {
    throw new ERR_FS_EISDIR({
      message: `${src} is a directory (not copied)`,
      path: src,
      syscall: 'cp',
      errno: EINVAL,
    })
  } else if (srcStat.isFile() ||
            srcStat.isCharacterDevice() ||
            srcStat.isBlockDevice()) {
    return onFile(srcStat, destStat, src, dest, opts)
  } else if (srcStat.isSymbolicLink()) {
    return onLink(destStat, src, dest)
  } else if (srcStat.isSocket()) {
    throw new ERR_FS_CP_SOCKET({
      message: `cannot copy a socket file: ${dest}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  } else if (srcStat.isFIFO()) {
    throw new ERR_FS_CP_FIFO_PIPE({
      message: `cannot copy a FIFO pipe: ${dest}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  }
  // istanbul ignore next: should be unreachable
  throw new ERR_FS_CP_UNKNOWN({
    message: `cannot copy an unknown file type: ${dest}`,
    path: dest,
    syscall: 'cp',
    errno: EINVAL,
  })
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) {
    return _copyFile(srcStat, src, dest, opts)
  }
  return mayCopyFile(srcStat, src, dest, opts)
}

async function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.force) {
    await unlink(dest)
    return _copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new ERR_FS_CP_EEXIST({
      message: `${dest} already exists`,
      path: dest,
      syscall: 'cp',
      errno: EEXIST,
    })
  }
}

async function _copyFile (srcStat, src, dest, opts) {
  await copyFile(src, dest)
  if (opts.preserveTimestamps) {
    return handleTimestampsAndMode(srcStat.mode, src, dest)
  }
  return setDestMode(dest, srcStat.mode)
}

async function handleTimestampsAndMode (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) {
    await makeFileWritable(dest, srcMode)
    return setDestTimestampsAndMode(srcMode, src, dest)
  }
  return setDestTimestampsAndMode(srcMode, src, dest)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return setDestMode(dest, srcMode | 0o200)
}

async function setDestTimestampsAndMode (srcMode, src, dest) {
  await setDestTimestamps(src, dest)
  return setDestMode(dest, srcMode)
}

function setDestMode (dest, srcMode) {
  return chmod(dest, srcMode)
}

async function setDestTimestamps (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = await stat(src)
  return utimes(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) {
    return mkDirAndCopy(srcStat.mode, src, dest, opts)
  }
  return copyDir(src, dest, opts)
}

async function mkDirAndCopy (srcMode, src, dest, opts) {
  await mkdir(dest)
  await copyDir(src, dest, opts)
  return setDestMode(dest, srcMode)
}

async function copyDir (src, dest, opts) {
  const dir = await readdir(src)
  for (let i = 0; i < dir.length; i++) {
    const item = dir[i]
    const srcItem = join(src, item)
    const destItem = join(dest, item)
    const { destStat } = await checkPaths(srcItem, destItem, opts)
    await startCopy(destStat, srcItem, destItem, opts)
  }
}

async function onLink (destStat, src, dest) {
  let resolvedSrc = await readlink(src)
  if (!isAbsolute(resolvedSrc)) {
    resolvedSrc = resolve(dirname(src), resolvedSrc)
  }
  if (!destStat) {
    return symlink(resolvedSrc, dest)
  }
  let resolvedDest
  try {
    resolvedDest = await readlink(dest)
  } catch (err) {
    // Dest exists and is a regular file or directory,
    // Windows may throw UNKNOWN error. If dest already exists,
    // fs throws error anyway, so no need to guard against it here.
    // istanbul ignore next: can only test on windows
    if (err.code === 'EINVAL' || err.code === 'UNKNOWN') {
      return symlink(resolvedSrc, dest)
    }
    // istanbul ignore next: should not be possible
    throw err
  }
  if (!isAbsolute(resolvedDest)) {
    resolvedDest = resolve(dirname(dest), resolvedDest)
  }
  if (isSrcSubdir(resolvedSrc, resolvedDest)) {
    throw new ERR_FS_CP_EINVAL({
      message: `cannot copy ${resolvedSrc} to a subdirectory of self ` +
            `${resolvedDest}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  }
  // Do not copy if src is a subdir of dest since unlinking
  // dest in this case would result in removing src contents
  // and therefore a broken symlink would be created.
  const srcStat = await stat(src)
  if (srcStat.isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc)) {
    throw new ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY({
      message: `cannot overwrite ${resolvedDest} with ${resolvedSrc}`,
      path: dest,
      syscall: 'cp',
      errno: EINVAL,
    })
  }
  return copyLink(resolvedSrc, dest)
}

async function copyLink (resolvedSrc, dest) {
  await unlink(dest)
  return symlink(resolvedSrc, dest)
}

module.exports = cp
