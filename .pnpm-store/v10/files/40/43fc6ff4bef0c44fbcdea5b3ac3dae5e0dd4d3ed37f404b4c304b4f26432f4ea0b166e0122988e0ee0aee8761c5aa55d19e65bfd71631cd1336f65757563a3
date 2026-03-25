'use strict'

const util = require('util')

const pMap = require('p-map')
const contentPath = require('./content/path')
const fixOwner = require('./util/fix-owner')
const fs = require('fs')
const fsm = require('fs-minipass')
const glob = util.promisify(require('glob'))
const index = require('./entry-index')
const path = require('path')
const rimraf = util.promisify(require('rimraf'))
const ssri = require('ssri')

const hasOwnProperty = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key)

const stat = util.promisify(fs.stat)
const truncate = util.promisify(fs.truncate)
const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

const verifyOpts = (opts) => ({
  concurrency: 20,
  log: { silly () {} },
  ...opts,
})

module.exports = verify

function verify (cache, opts) {
  opts = verifyOpts(opts)
  opts.log.silly('verify', 'verifying cache at', cache)

  const steps = [
    markStartTime,
    fixPerms,
    garbageCollect,
    rebuildIndex,
    cleanTmp,
    writeVerifile,
    markEndTime,
  ]

  return steps
    .reduce((promise, step, i) => {
      const label = step.name
      const start = new Date()
      return promise.then((stats) => {
        return step(cache, opts).then((s) => {
          s &&
            Object.keys(s).forEach((k) => {
              stats[k] = s[k]
            })
          const end = new Date()
          if (!stats.runTime)
            stats.runTime = {}

          stats.runTime[label] = end - start
          return Promise.resolve(stats)
        })
      })
    }, Promise.resolve({}))
    .then((stats) => {
      stats.runTime.total = stats.endTime - stats.startTime
      opts.log.silly(
        'verify',
        'verification finished for',
        cache,
        'in',
        `${stats.runTime.total}ms`
      )
      return stats
    })
}

function markStartTime (cache, opts) {
  return Promise.resolve({ startTime: new Date() })
}

function markEndTime (cache, opts) {
  return Promise.resolve({ endTime: new Date() })
}

function fixPerms (cache, opts) {
  opts.log.silly('verify', 'fixing cache permissions')
  return fixOwner
    .mkdirfix(cache, cache)
    .then(() => {
      // TODO - fix file permissions too
      return fixOwner.chownr(cache, cache)
    })
    .then(() => null)
}

// Implements a naive mark-and-sweep tracing garbage collector.
//
// The algorithm is basically as follows:
// 1. Read (and filter) all index entries ("pointers")
// 2. Mark each integrity value as "live"
// 3. Read entire filesystem tree in `content-vX/` dir
// 4. If content is live, verify its checksum and delete it if it fails
// 5. If content is not marked as live, rimraf it.
//
function garbageCollect (cache, opts) {
  opts.log.silly('verify', 'garbage collecting content')
  const indexStream = index.lsStream(cache)
  const liveContent = new Set()
  indexStream.on('data', (entry) => {
    if (opts.filter && !opts.filter(entry))
      return

    liveContent.add(entry.integrity.toString())
  })
  return new Promise((resolve, reject) => {
    indexStream.on('end', resolve).on('error', reject)
  }).then(() => {
    const contentDir = contentPath.contentDir(cache)
    return glob(path.join(contentDir, '**'), {
      follow: false,
      nodir: true,
      nosort: true,
    }).then((files) => {
      return Promise.resolve({
        verifiedContent: 0,
        reclaimedCount: 0,
        reclaimedSize: 0,
        badContentCount: 0,
        keptSize: 0,
      }).then((stats) =>
        pMap(
          files,
          (f) => {
            const split = f.split(/[/\\]/)
            const digest = split.slice(split.length - 3).join('')
            const algo = split[split.length - 4]
            const integrity = ssri.fromHex(digest, algo)
            if (liveContent.has(integrity.toString())) {
              return verifyContent(f, integrity).then((info) => {
                if (!info.valid) {
                  stats.reclaimedCount++
                  stats.badContentCount++
                  stats.reclaimedSize += info.size
                } else {
                  stats.verifiedContent++
                  stats.keptSize += info.size
                }
                return stats
              })
            } else {
              // No entries refer to this content. We can delete.
              stats.reclaimedCount++
              return stat(f).then((s) => {
                return rimraf(f).then(() => {
                  stats.reclaimedSize += s.size
                  return stats
                })
              })
            }
          },
          { concurrency: opts.concurrency }
        ).then(() => stats)
      )
    })
  })
}

function verifyContent (filepath, sri) {
  return stat(filepath)
    .then((s) => {
      const contentInfo = {
        size: s.size,
        valid: true,
      }
      return ssri
        .checkStream(new fsm.ReadStream(filepath), sri)
        .catch((err) => {
          if (err.code !== 'EINTEGRITY')
            throw err

          return rimraf(filepath).then(() => {
            contentInfo.valid = false
          })
        })
        .then(() => contentInfo)
    })
    .catch((err) => {
      if (err.code === 'ENOENT')
        return { size: 0, valid: false }

      throw err
    })
}

function rebuildIndex (cache, opts) {
  opts.log.silly('verify', 'rebuilding index')
  return index.ls(cache).then((entries) => {
    const stats = {
      missingContent: 0,
      rejectedEntries: 0,
      totalEntries: 0,
    }
    const buckets = {}
    for (const k in entries) {
      /* istanbul ignore else */
      if (hasOwnProperty(entries, k)) {
        const hashed = index.hashKey(k)
        const entry = entries[k]
        const excluded = opts.filter && !opts.filter(entry)
        excluded && stats.rejectedEntries++
        if (buckets[hashed] && !excluded)
          buckets[hashed].push(entry)
        else if (buckets[hashed] && excluded) {
          // skip
        } else if (excluded) {
          buckets[hashed] = []
          buckets[hashed]._path = index.bucketPath(cache, k)
        } else {
          buckets[hashed] = [entry]
          buckets[hashed]._path = index.bucketPath(cache, k)
        }
      }
    }
    return pMap(
      Object.keys(buckets),
      (key) => {
        return rebuildBucket(cache, buckets[key], stats, opts)
      },
      { concurrency: opts.concurrency }
    ).then(() => stats)
  })
}

function rebuildBucket (cache, bucket, stats, opts) {
  return truncate(bucket._path).then(() => {
    // This needs to be serialized because cacache explicitly
    // lets very racy bucket conflicts clobber each other.
    return bucket.reduce((promise, entry) => {
      return promise.then(() => {
        const content = contentPath(cache, entry.integrity)
        return stat(content)
          .then(() => {
            return index
              .insert(cache, entry.key, entry.integrity, {
                metadata: entry.metadata,
                size: entry.size,
              })
              .then(() => {
                stats.totalEntries++
              })
          })
          .catch((err) => {
            if (err.code === 'ENOENT') {
              stats.rejectedEntries++
              stats.missingContent++
              return
            }
            throw err
          })
      })
    }, Promise.resolve())
  })
}

function cleanTmp (cache, opts) {
  opts.log.silly('verify', 'cleaning tmp directory')
  return rimraf(path.join(cache, 'tmp'))
}

function writeVerifile (cache, opts) {
  const verifile = path.join(cache, '_lastverified')
  opts.log.silly('verify', 'writing verifile to ' + verifile)
  try {
    return writeFile(verifile, '' + +new Date())
  } finally {
    fixOwner.chownr.sync(cache, verifile)
  }
}

module.exports.lastRun = lastRun

function lastRun (cache) {
  return readFile(path.join(cache, '_lastverified'), 'utf8').then(
    (data) => new Date(+data)
  )
}
