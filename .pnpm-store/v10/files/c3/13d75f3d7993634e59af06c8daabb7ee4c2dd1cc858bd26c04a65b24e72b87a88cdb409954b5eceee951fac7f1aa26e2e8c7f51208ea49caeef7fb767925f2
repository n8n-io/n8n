'use strict'

const util = require('util')

const contentPath = require('./path')
const fixOwner = require('../util/fix-owner')
const fs = require('fs')
const moveFile = require('../util/move-file')
const Minipass = require('minipass')
const Pipeline = require('minipass-pipeline')
const Flush = require('minipass-flush')
const path = require('path')
const rimraf = util.promisify(require('rimraf'))
const ssri = require('ssri')
const uniqueFilename = require('unique-filename')
const { disposer } = require('./../util/disposer')
const fsm = require('fs-minipass')

const writeFile = util.promisify(fs.writeFile)

module.exports = write

function write (cache, data, opts = {}) {
  const { algorithms, size, integrity } = opts
  if (algorithms && algorithms.length > 1)
    throw new Error('opts.algorithms only supports a single algorithm for now')

  if (typeof size === 'number' && data.length !== size)
    return Promise.reject(sizeError(size, data.length))

  const sri = ssri.fromData(data, algorithms ? { algorithms } : {})
  if (integrity && !ssri.checkData(data, integrity, opts))
    return Promise.reject(checksumError(integrity, sri))

  return disposer(makeTmp(cache, opts), makeTmpDisposer,
    (tmp) => {
      return writeFile(tmp.target, data, { flag: 'wx' })
        .then(() => moveToDestination(tmp, cache, sri, opts))
    })
    .then(() => ({ integrity: sri, size: data.length }))
}

module.exports.stream = writeStream

// writes proxied to the 'inputStream' that is passed to the Promise
// 'end' is deferred until content is handled.
class CacacheWriteStream extends Flush {
  constructor (cache, opts) {
    super()
    this.opts = opts
    this.cache = cache
    this.inputStream = new Minipass()
    this.inputStream.on('error', er => this.emit('error', er))
    this.inputStream.on('drain', () => this.emit('drain'))
    this.handleContentP = null
  }

  write (chunk, encoding, cb) {
    if (!this.handleContentP) {
      this.handleContentP = handleContent(
        this.inputStream,
        this.cache,
        this.opts
      )
    }
    return this.inputStream.write(chunk, encoding, cb)
  }

  flush (cb) {
    this.inputStream.end(() => {
      if (!this.handleContentP) {
        const e = new Error('Cache input stream was empty')
        e.code = 'ENODATA'
        // empty streams are probably emitting end right away.
        // defer this one tick by rejecting a promise on it.
        return Promise.reject(e).catch(cb)
      }
      this.handleContentP.then(
        (res) => {
          res.integrity && this.emit('integrity', res.integrity)
          res.size !== null && this.emit('size', res.size)
          cb()
        },
        (er) => cb(er)
      )
    })
  }
}

function writeStream (cache, opts = {}) {
  return new CacacheWriteStream(cache, opts)
}

function handleContent (inputStream, cache, opts) {
  return disposer(makeTmp(cache, opts), makeTmpDisposer, (tmp) => {
    return pipeToTmp(inputStream, cache, tmp.target, opts)
      .then((res) => {
        return moveToDestination(
          tmp,
          cache,
          res.integrity,
          opts
        ).then(() => res)
      })
  })
}

function pipeToTmp (inputStream, cache, tmpTarget, opts) {
  let integrity
  let size
  const hashStream = ssri.integrityStream({
    integrity: opts.integrity,
    algorithms: opts.algorithms,
    size: opts.size,
  })
  hashStream.on('integrity', i => {
    integrity = i
  })
  hashStream.on('size', s => {
    size = s
  })

  const outStream = new fsm.WriteStream(tmpTarget, {
    flags: 'wx',
  })

  // NB: this can throw if the hashStream has a problem with
  // it, and the data is fully written.  but pipeToTmp is only
  // called in promisory contexts where that is handled.
  const pipeline = new Pipeline(
    inputStream,
    hashStream,
    outStream
  )

  return pipeline.promise()
    .then(() => ({ integrity, size }))
    .catch(er => rimraf(tmpTarget).then(() => {
      throw er
    }))
}

function makeTmp (cache, opts) {
  const tmpTarget = uniqueFilename(path.join(cache, 'tmp'), opts.tmpPrefix)
  return fixOwner.mkdirfix(cache, path.dirname(tmpTarget)).then(() => ({
    target: tmpTarget,
    moved: false,
  }))
}

function makeTmpDisposer (tmp) {
  if (tmp.moved)
    return Promise.resolve()

  return rimraf(tmp.target)
}

function moveToDestination (tmp, cache, sri, opts) {
  const destination = contentPath(cache, sri)
  const destDir = path.dirname(destination)

  return fixOwner
    .mkdirfix(cache, destDir)
    .then(() => {
      return moveFile(tmp.target, destination)
    })
    .then(() => {
      tmp.moved = true
      return fixOwner.chownr(cache, destination)
    })
}

function sizeError (expected, found) {
  const err = new Error(`Bad data size: expected inserted data to be ${expected} bytes, but got ${found} instead`)
  err.expected = expected
  err.found = found
  err.code = 'EBADSIZE'
  return err
}

function checksumError (expected, found) {
  const err = new Error(`Integrity check failed:
  Wanted: ${expected}
   Found: ${found}`)
  err.code = 'EINTEGRITY'
  err.expected = expected
  err.found = found
  return err
}
