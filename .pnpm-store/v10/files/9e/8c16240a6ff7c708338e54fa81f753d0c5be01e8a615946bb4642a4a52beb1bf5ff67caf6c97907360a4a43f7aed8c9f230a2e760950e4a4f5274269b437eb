const { dirname, resolve } = require('path')

const fileURLToPath = require('./file-url-to-path/index.js')
const fs = require('../fs.js')

// given a path, find the owner of the nearest parent
const find = async (path) => {
  // if we have no getuid, permissions are irrelevant on this platform
  if (!process.getuid) {
    return {}
  }

  // fs methods accept URL objects with a scheme of file: so we need to unwrap
  // those into an actual path string before we can resolve it
  const resolved = path != null && path.href && path.origin
    ? resolve(fileURLToPath(path))
    : resolve(path)

  let stat

  try {
    stat = await fs.lstat(resolved)
  } finally {
    // if we got a stat, return its contents
    if (stat) {
      return { uid: stat.uid, gid: stat.gid }
    }

    // try the parent directory
    if (resolved !== dirname(resolved)) {
      return find(dirname(resolved))
    }

    // no more parents, never got a stat, just return an empty object
    return {}
  }
}

// given a path, uid, and gid update the ownership of the path if necessary
const update = async (path, uid, gid) => {
  // nothing to update, just exit
  if (uid === undefined && gid === undefined) {
    return
  }

  try {
    // see if the permissions are already the same, if they are we don't
    // need to do anything, so return early
    const stat = await fs.stat(path)
    if (uid === stat.uid && gid === stat.gid) {
      return
    }
  } catch (err) {}

  try {
    await fs.chown(path, uid, gid)
  } catch (err) {}
}

// accepts a `path` and the `owner` property of an options object and normalizes
// it into an object with numerical `uid` and `gid`
const validate = async (path, input) => {
  let uid
  let gid

  if (typeof input === 'string' || typeof input === 'number') {
    uid = input
    gid = input
  } else if (input && typeof input === 'object') {
    uid = input.uid
    gid = input.gid
  }

  if (uid === 'inherit' || gid === 'inherit') {
    const owner = await find(path)
    if (uid === 'inherit') {
      uid = owner.uid
    }

    if (gid === 'inherit') {
      gid = owner.gid
    }
  }

  return { uid, gid }
}

module.exports = {
  find,
  update,
  validate,
}
