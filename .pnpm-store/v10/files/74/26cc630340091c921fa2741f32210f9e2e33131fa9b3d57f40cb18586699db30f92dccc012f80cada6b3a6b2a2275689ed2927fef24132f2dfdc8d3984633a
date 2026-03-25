'use strict'

const util = require('util')

const chownr = util.promisify(require('chownr'))
const mkdirp = require('mkdirp')
const inflight = require('promise-inflight')
const inferOwner = require('infer-owner')

// Memoize getuid()/getgid() calls.
// patch process.setuid/setgid to invalidate cached value on change
const self = { uid: null, gid: null }
const getSelf = () => {
  if (typeof self.uid !== 'number') {
    self.uid = process.getuid()
    const setuid = process.setuid
    process.setuid = (uid) => {
      self.uid = null
      process.setuid = setuid
      return process.setuid(uid)
    }
  }
  if (typeof self.gid !== 'number') {
    self.gid = process.getgid()
    const setgid = process.setgid
    process.setgid = (gid) => {
      self.gid = null
      process.setgid = setgid
      return process.setgid(gid)
    }
  }
}

module.exports.chownr = fixOwner

function fixOwner (cache, filepath) {
  if (!process.getuid) {
    // This platform doesn't need ownership fixing
    return Promise.resolve()
  }

  getSelf()
  if (self.uid !== 0) {
    // almost certainly can't chown anyway
    return Promise.resolve()
  }

  return Promise.resolve(inferOwner(cache)).then((owner) => {
    const { uid, gid } = owner

    // No need to override if it's already what we used.
    if (self.uid === uid && self.gid === gid)
      return

    return inflight('fixOwner: fixing ownership on ' + filepath, () =>
      chownr(
        filepath,
        typeof uid === 'number' ? uid : self.uid,
        typeof gid === 'number' ? gid : self.gid
      ).catch((err) => {
        if (err.code === 'ENOENT')
          return null

        throw err
      })
    )
  })
}

module.exports.chownr.sync = fixOwnerSync

function fixOwnerSync (cache, filepath) {
  if (!process.getuid) {
    // This platform doesn't need ownership fixing
    return
  }
  const { uid, gid } = inferOwner.sync(cache)
  getSelf()
  if (self.uid !== 0) {
    // almost certainly can't chown anyway
    return
  }

  if (self.uid === uid && self.gid === gid) {
    // No need to override if it's already what we used.
    return
  }
  try {
    chownr.sync(
      filepath,
      typeof uid === 'number' ? uid : self.uid,
      typeof gid === 'number' ? gid : self.gid
    )
  } catch (err) {
    // only catch ENOENT, any other error is a problem.
    if (err.code === 'ENOENT')
      return null

    throw err
  }
}

module.exports.mkdirfix = mkdirfix

function mkdirfix (cache, p, cb) {
  // we have to infer the owner _before_ making the directory, even though
  // we aren't going to use the results, since the cache itself might not
  // exist yet.  If we mkdirp it, then our current uid/gid will be assumed
  // to be correct if it creates the cache folder in the process.
  return Promise.resolve(inferOwner(cache)).then(() => {
    return mkdirp(p)
      .then((made) => {
        if (made)
          return fixOwner(cache, made).then(() => made)
      })
      .catch((err) => {
        if (err.code === 'EEXIST')
          return fixOwner(cache, p).then(() => null)

        throw err
      })
  })
}

module.exports.mkdirfix.sync = mkdirfixSync

function mkdirfixSync (cache, p) {
  try {
    inferOwner.sync(cache)
    const made = mkdirp.sync(p)
    if (made) {
      fixOwnerSync(cache, made)
      return made
    }
  } catch (err) {
    if (err.code === 'EEXIST') {
      fixOwnerSync(cache, p)
      return null
    } else
      throw err
  }
}
