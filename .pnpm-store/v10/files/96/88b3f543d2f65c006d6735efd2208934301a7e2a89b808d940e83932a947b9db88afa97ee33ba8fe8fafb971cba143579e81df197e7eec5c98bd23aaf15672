'use strict'

const util = require('util')
const crypto = require('crypto')
const fs = require('fs')
const Minipass = require('minipass')
const path = require('path')
const ssri = require('ssri')
const uniqueFilename = require('unique-filename')

const { disposer } = require('./util/disposer')
const contentPath = require('./content/path')
const fixOwner = require('./util/fix-owner')
const hashToSegments = require('./util/hash-to-segments')
const indexV = require('../package.json')['cache-version'].index
const moveFile = require('@npmcli/move-file')
const _rimraf = require('rimraf')
const rimraf = util.promisify(_rimraf)
rimraf.sync = _rimraf.sync

const appendFile = util.promisify(fs.appendFile)
const readFile = util.promisify(fs.readFile)
const readdir = util.promisify(fs.readdir)
const writeFile = util.promisify(fs.writeFile)

module.exports.NotFoundError = class NotFoundError extends Error {
  constructor (cache, key) {
    super(`No cache entry for ${key} found in ${cache}`)
    this.code = 'ENOENT'
    this.cache = cache
    this.key = key
  }
}

module.exports.compact = compact

async function compact (cache, key, matchFn, opts = {}) {
  const bucket = bucketPath(cache, key)
  const entries = await bucketEntries(bucket)
  const newEntries = []
  // we loop backwards because the bottom-most result is the newest
  // since we add new entries with appendFile
  for (let i = entries.length - 1; i >= 0; --i) {
    const entry = entries[i]
    // a null integrity could mean either a delete was appended
    // or the user has simply stored an index that does not map
    // to any content. we determine if the user wants to keep the
    // null integrity based on the validateEntry function passed in options.
    // if the integrity is null and no validateEntry is provided, we break
    // as we consider the null integrity to be a deletion of everything
    // that came before it.
    if (entry.integrity === null && !opts.validateEntry)
      break

    // if this entry is valid, and it is either the first entry or
    // the newEntries array doesn't already include an entry that
    // matches this one based on the provided matchFn, then we add
    // it to the beginning of our list
    if ((!opts.validateEntry || opts.validateEntry(entry) === true) &&
      (newEntries.length === 0 ||
        !newEntries.find((oldEntry) => matchFn(oldEntry, entry))))
      newEntries.unshift(entry)
  }

  const newIndex = '\n' + newEntries.map((entry) => {
    const stringified = JSON.stringify(entry)
    const hash = hashEntry(stringified)
    return `${hash}\t${stringified}`
  }).join('\n')

  const setup = async () => {
    const target = uniqueFilename(path.join(cache, 'tmp'), opts.tmpPrefix)
    await fixOwner.mkdirfix(cache, path.dirname(target))
    return {
      target,
      moved: false,
    }
  }

  const teardown = async (tmp) => {
    if (!tmp.moved)
      return rimraf(tmp.target)
  }

  const write = async (tmp) => {
    await writeFile(tmp.target, newIndex, { flag: 'wx' })
    await fixOwner.mkdirfix(cache, path.dirname(bucket))
    // we use @npmcli/move-file directly here because we
    // want to overwrite the existing file
    await moveFile(tmp.target, bucket)
    tmp.moved = true
    try {
      await fixOwner.chownr(cache, bucket)
    } catch (err) {
      if (err.code !== 'ENOENT')
        throw err
    }
  }

  // write the file atomically
  await disposer(setup(), teardown, write)

  // we reverse the list we generated such that the newest
  // entries come first in order to make looping through them easier
  // the true passed to formatEntry tells it to keep null
  // integrity values, if they made it this far it's because
  // validateEntry returned true, and as such we should return it
  return newEntries.reverse().map((entry) => formatEntry(cache, entry, true))
}

module.exports.insert = insert

function insert (cache, key, integrity, opts = {}) {
  const { metadata, size } = opts
  const bucket = bucketPath(cache, key)
  const entry = {
    key,
    integrity: integrity && ssri.stringify(integrity),
    time: Date.now(),
    size,
    metadata,
  }
  return fixOwner
    .mkdirfix(cache, path.dirname(bucket))
    .then(() => {
      const stringified = JSON.stringify(entry)
      // NOTE - Cleverness ahoy!
      //
      // This works because it's tremendously unlikely for an entry to corrupt
      // another while still preserving the string length of the JSON in
      // question. So, we just slap the length in there and verify it on read.
      //
      // Thanks to @isaacs for the whiteboarding session that ended up with
      // this.
      return appendFile(bucket, `\n${hashEntry(stringified)}\t${stringified}`)
    })
    .then(() => fixOwner.chownr(cache, bucket))
    .catch((err) => {
      if (err.code === 'ENOENT')
        return undefined

      throw err
      // There's a class of race conditions that happen when things get deleted
      // during fixOwner, or between the two mkdirfix/chownr calls.
      //
      // It's perfectly fine to just not bother in those cases and lie
      // that the index entry was written. Because it's a cache.
    })
    .then(() => {
      return formatEntry(cache, entry)
    })
}

module.exports.insert.sync = insertSync

function insertSync (cache, key, integrity, opts = {}) {
  const { metadata, size } = opts
  const bucket = bucketPath(cache, key)
  const entry = {
    key,
    integrity: integrity && ssri.stringify(integrity),
    time: Date.now(),
    size,
    metadata,
  }
  fixOwner.mkdirfix.sync(cache, path.dirname(bucket))
  const stringified = JSON.stringify(entry)
  fs.appendFileSync(bucket, `\n${hashEntry(stringified)}\t${stringified}`)
  try {
    fixOwner.chownr.sync(cache, bucket)
  } catch (err) {
    if (err.code !== 'ENOENT')
      throw err
  }
  return formatEntry(cache, entry)
}

module.exports.find = find

function find (cache, key) {
  const bucket = bucketPath(cache, key)
  return bucketEntries(bucket)
    .then((entries) => {
      return entries.reduce((latest, next) => {
        if (next && next.key === key)
          return formatEntry(cache, next)
        else
          return latest
      }, null)
    })
    .catch((err) => {
      if (err.code === 'ENOENT')
        return null
      else
        throw err
    })
}

module.exports.find.sync = findSync

function findSync (cache, key) {
  const bucket = bucketPath(cache, key)
  try {
    return bucketEntriesSync(bucket).reduce((latest, next) => {
      if (next && next.key === key)
        return formatEntry(cache, next)
      else
        return latest
    }, null)
  } catch (err) {
    if (err.code === 'ENOENT')
      return null
    else
      throw err
  }
}

module.exports.delete = del

function del (cache, key, opts = {}) {
  if (!opts.removeFully)
    return insert(cache, key, null, opts)

  const bucket = bucketPath(cache, key)
  return rimraf(bucket)
}

module.exports.delete.sync = delSync

function delSync (cache, key, opts = {}) {
  if (!opts.removeFully)
    return insertSync(cache, key, null, opts)

  const bucket = bucketPath(cache, key)
  return rimraf.sync(bucket)
}

module.exports.lsStream = lsStream

function lsStream (cache) {
  const indexDir = bucketDir(cache)
  const stream = new Minipass({ objectMode: true })

  readdirOrEmpty(indexDir).then(buckets => Promise.all(
    buckets.map(bucket => {
      const bucketPath = path.join(indexDir, bucket)
      return readdirOrEmpty(bucketPath).then(subbuckets => Promise.all(
        subbuckets.map(subbucket => {
          const subbucketPath = path.join(bucketPath, subbucket)

          // "/cachename/<bucket 0xFF>/<bucket 0xFF>./*"
          return readdirOrEmpty(subbucketPath).then(entries => Promise.all(
            entries.map(entry => {
              const entryPath = path.join(subbucketPath, entry)
              return bucketEntries(entryPath).then(entries =>
                // using a Map here prevents duplicate keys from
                // showing up twice, I guess?
                entries.reduce((acc, entry) => {
                  acc.set(entry.key, entry)
                  return acc
                }, new Map())
              ).then(reduced => {
                // reduced is a map of key => entry
                for (const entry of reduced.values()) {
                  const formatted = formatEntry(cache, entry)
                  if (formatted)
                    stream.write(formatted)
                }
              }).catch(err => {
                if (err.code === 'ENOENT')
                  return undefined
                throw err
              })
            })
          ))
        })
      ))
    })
  ))
    .then(
      () => stream.end(),
      err => stream.emit('error', err)
    )

  return stream
}

module.exports.ls = ls

function ls (cache) {
  return lsStream(cache).collect().then(entries =>
    entries.reduce((acc, xs) => {
      acc[xs.key] = xs
      return acc
    }, {})
  )
}

module.exports.bucketEntries = bucketEntries

function bucketEntries (bucket, filter) {
  return readFile(bucket, 'utf8').then((data) => _bucketEntries(data, filter))
}

module.exports.bucketEntries.sync = bucketEntriesSync

function bucketEntriesSync (bucket, filter) {
  const data = fs.readFileSync(bucket, 'utf8')
  return _bucketEntries(data, filter)
}

function _bucketEntries (data, filter) {
  const entries = []
  data.split('\n').forEach((entry) => {
    if (!entry)
      return

    const pieces = entry.split('\t')
    if (!pieces[1] || hashEntry(pieces[1]) !== pieces[0]) {
      // Hash is no good! Corruption or malice? Doesn't matter!
      // EJECT EJECT
      return
    }
    let obj
    try {
      obj = JSON.parse(pieces[1])
    } catch (e) {
      // Entry is corrupted!
      return
    }
    if (obj)
      entries.push(obj)
  })
  return entries
}

module.exports.bucketDir = bucketDir

function bucketDir (cache) {
  return path.join(cache, `index-v${indexV}`)
}

module.exports.bucketPath = bucketPath

function bucketPath (cache, key) {
  const hashed = hashKey(key)
  return path.join.apply(
    path,
    [bucketDir(cache)].concat(hashToSegments(hashed))
  )
}

module.exports.hashKey = hashKey

function hashKey (key) {
  return hash(key, 'sha256')
}

module.exports.hashEntry = hashEntry

function hashEntry (str) {
  return hash(str, 'sha1')
}

function hash (str, digest) {
  return crypto
    .createHash(digest)
    .update(str)
    .digest('hex')
}

function formatEntry (cache, entry, keepAll) {
  // Treat null digests as deletions. They'll shadow any previous entries.
  if (!entry.integrity && !keepAll)
    return null

  return {
    key: entry.key,
    integrity: entry.integrity,
    path: entry.integrity ? contentPath(cache, entry.integrity) : undefined,
    size: entry.size,
    time: entry.time,
    metadata: entry.metadata,
  }
}

function readdirOrEmpty (dir) {
  return readdir(dir).catch((err) => {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR')
      return []

    throw err
  })
}
