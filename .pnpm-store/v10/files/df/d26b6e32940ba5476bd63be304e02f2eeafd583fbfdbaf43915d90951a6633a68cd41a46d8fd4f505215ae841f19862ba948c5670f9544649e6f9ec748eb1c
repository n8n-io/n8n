'use strict'

const fs = require('fs')
const util = require('util')
const chmod = util.promisify(fs.chmod)
const unlink = util.promisify(fs.unlink)
const stat = util.promisify(fs.stat)
const move = require('@npmcli/move-file')
const pinflight = require('promise-inflight')

module.exports = moveFile

function moveFile (src, dest) {
  const isWindows = global.__CACACHE_TEST_FAKE_WINDOWS__ ||
    process.platform === 'win32'

  // This isn't quite an fs.rename -- the assumption is that
  // if `dest` already exists, and we get certain errors while
  // trying to move it, we should just not bother.
  //
  // In the case of cache corruption, users will receive an
  // EINTEGRITY error elsewhere, and can remove the offending
  // content their own way.
  //
  // Note that, as the name suggests, this strictly only supports file moves.
  return new Promise((resolve, reject) => {
    fs.link(src, dest, (err) => {
      if (err) {
        if (isWindows && err.code === 'EPERM') {
          // XXX This is a really weird way to handle this situation, as it
          // results in the src file being deleted even though the dest
          // might not exist.  Since we pretty much always write files to
          // deterministic locations based on content hash, this is likely
          // ok (or at worst, just ends in a future cache miss).  But it would
          // be worth investigating at some time in the future if this is
          // really what we want to do here.
          return resolve()
        } else if (err.code === 'EEXIST' || err.code === 'EBUSY') {
          // file already exists, so whatever
          return resolve()
        } else
          return reject(err)
      } else
        return resolve()
    })
  })
    .then(() => {
      // content should never change for any reason, so make it read-only
      return Promise.all([
        unlink(src),
        !isWindows && chmod(dest, '0444'),
      ])
    })
    .catch(() => {
      return pinflight('cacache-move-file:' + dest, () => {
        return stat(dest).catch((err) => {
          if (err.code !== 'ENOENT') {
            // Something else is wrong here. Bail bail bail
            throw err
          }
          // file doesn't already exist! let's try a rename -> copy fallback
          // only delete if it successfully copies
          return move(src, dest)
        })
      })
    })
}
