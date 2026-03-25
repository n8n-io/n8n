'use strict'

const Collect = require('minipass-collect')
const Minipass = require('minipass')
const Pipeline = require('minipass-pipeline')
const fs = require('fs')
const util = require('util')

const index = require('./lib/entry-index')
const memo = require('./lib/memoization')
const read = require('./lib/content/read')

const writeFile = util.promisify(fs.writeFile)

function getData (cache, key, opts = {}) {
  const { integrity, memoize, size } = opts
  const memoized = memo.get(cache, key, opts)
  if (memoized && memoize !== false) {
    return Promise.resolve({
      metadata: memoized.entry.metadata,
      data: memoized.data,
      integrity: memoized.entry.integrity,
      size: memoized.entry.size,
    })
  }

  return index.find(cache, key, opts).then((entry) => {
    if (!entry)
      throw new index.NotFoundError(cache, key)

    return read(cache, entry.integrity, { integrity, size }).then((data) => {
      if (memoize)
        memo.put(cache, entry, data, opts)

      return {
        data,
        metadata: entry.metadata,
        size: entry.size,
        integrity: entry.integrity,
      }
    })
  })
}
module.exports = getData

function getDataByDigest (cache, key, opts = {}) {
  const { integrity, memoize, size } = opts
  const memoized = memo.get.byDigest(cache, key, opts)
  if (memoized && memoize !== false)
    return Promise.resolve(memoized)

  return read(cache, key, { integrity, size }).then((res) => {
    if (memoize)
      memo.put.byDigest(cache, key, res, opts)
    return res
  })
}
module.exports.byDigest = getDataByDigest

function getDataSync (cache, key, opts = {}) {
  const { integrity, memoize, size } = opts
  const memoized = memo.get(cache, key, opts)

  if (memoized && memoize !== false) {
    return {
      metadata: memoized.entry.metadata,
      data: memoized.data,
      integrity: memoized.entry.integrity,
      size: memoized.entry.size,
    }
  }
  const entry = index.find.sync(cache, key, opts)
  if (!entry)
    throw new index.NotFoundError(cache, key)
  const data = read.sync(cache, entry.integrity, {
    integrity: integrity,
    size: size,
  })
  const res = {
    metadata: entry.metadata,
    data: data,
    size: entry.size,
    integrity: entry.integrity,
  }
  if (memoize)
    memo.put(cache, entry, res.data, opts)

  return res
}

module.exports.sync = getDataSync

function getDataByDigestSync (cache, digest, opts = {}) {
  const { integrity, memoize, size } = opts
  const memoized = memo.get.byDigest(cache, digest, opts)

  if (memoized && memoize !== false)
    return memoized

  const res = read.sync(cache, digest, {
    integrity: integrity,
    size: size,
  })
  if (memoize)
    memo.put.byDigest(cache, digest, res, opts)

  return res
}
module.exports.sync.byDigest = getDataByDigestSync

const getMemoizedStream = (memoized) => {
  const stream = new Minipass()
  stream.on('newListener', function (ev, cb) {
    ev === 'metadata' && cb(memoized.entry.metadata)
    ev === 'integrity' && cb(memoized.entry.integrity)
    ev === 'size' && cb(memoized.entry.size)
  })
  stream.end(memoized.data)
  return stream
}

function getStream (cache, key, opts = {}) {
  const { memoize, size } = opts
  const memoized = memo.get(cache, key, opts)
  if (memoized && memoize !== false)
    return getMemoizedStream(memoized)

  const stream = new Pipeline()
  index
    .find(cache, key)
    .then((entry) => {
      if (!entry)
        throw new index.NotFoundError(cache, key)

      stream.emit('metadata', entry.metadata)
      stream.emit('integrity', entry.integrity)
      stream.emit('size', entry.size)
      stream.on('newListener', function (ev, cb) {
        ev === 'metadata' && cb(entry.metadata)
        ev === 'integrity' && cb(entry.integrity)
        ev === 'size' && cb(entry.size)
      })

      const src = read.readStream(
        cache,
        entry.integrity,
        { ...opts, size: typeof size !== 'number' ? entry.size : size }
      )

      if (memoize) {
        const memoStream = new Collect.PassThrough()
        memoStream.on('collect', data => memo.put(cache, entry, data, opts))
        stream.unshift(memoStream)
      }
      stream.unshift(src)
    })
    .catch((err) => stream.emit('error', err))

  return stream
}

module.exports.stream = getStream

function getStreamDigest (cache, integrity, opts = {}) {
  const { memoize } = opts
  const memoized = memo.get.byDigest(cache, integrity, opts)
  if (memoized && memoize !== false) {
    const stream = new Minipass()
    stream.end(memoized)
    return stream
  } else {
    const stream = read.readStream(cache, integrity, opts)
    if (!memoize)
      return stream

    const memoStream = new Collect.PassThrough()
    memoStream.on('collect', data => memo.put.byDigest(
      cache,
      integrity,
      data,
      opts
    ))
    return new Pipeline(stream, memoStream)
  }
}

module.exports.stream.byDigest = getStreamDigest

function info (cache, key, opts = {}) {
  const { memoize } = opts
  const memoized = memo.get(cache, key, opts)
  if (memoized && memoize !== false)
    return Promise.resolve(memoized.entry)
  else
    return index.find(cache, key)
}
module.exports.info = info

function copy (cache, key, dest, opts = {}) {
  if (read.copy) {
    return index.find(cache, key, opts).then((entry) => {
      if (!entry)
        throw new index.NotFoundError(cache, key)
      return read.copy(cache, entry.integrity, dest, opts)
        .then(() => {
          return {
            metadata: entry.metadata,
            size: entry.size,
            integrity: entry.integrity,
          }
        })
    })
  }

  return getData(cache, key, opts).then((res) => {
    return writeFile(dest, res.data).then(() => {
      return {
        metadata: res.metadata,
        size: res.size,
        integrity: res.integrity,
      }
    })
  })
}
module.exports.copy = copy

function copyByDigest (cache, key, dest, opts = {}) {
  if (read.copy)
    return read.copy(cache, key, dest, opts).then(() => key)

  return getDataByDigest(cache, key, opts).then((res) => {
    return writeFile(dest, res).then(() => key)
  })
}
module.exports.copy.byDigest = copyByDigest

module.exports.hasContent = read.hasContent
