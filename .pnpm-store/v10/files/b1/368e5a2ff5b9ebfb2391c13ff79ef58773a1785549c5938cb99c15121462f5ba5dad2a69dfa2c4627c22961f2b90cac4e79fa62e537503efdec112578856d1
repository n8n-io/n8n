'use strict'

const ls = require('./ls.js')
const get = require('./get.js')
const put = require('./put.js')
const rm = require('./rm.js')
const verify = require('./verify.js')
const { clearMemoized } = require('./lib/memoization.js')
const tmp = require('./lib/util/tmp.js')
const index = require('./lib/entry-index.js')

module.exports.index = {}
module.exports.index.compact = index.compact
module.exports.index.insert = index.insert

module.exports.ls = ls
module.exports.ls.stream = ls.stream

module.exports.get = get
module.exports.get.byDigest = get.byDigest
module.exports.get.sync = get.sync
module.exports.get.sync.byDigest = get.sync.byDigest
module.exports.get.stream = get.stream
module.exports.get.stream.byDigest = get.stream.byDigest
module.exports.get.copy = get.copy
module.exports.get.copy.byDigest = get.copy.byDigest
module.exports.get.info = get.info
module.exports.get.hasContent = get.hasContent
module.exports.get.hasContent.sync = get.hasContent.sync

module.exports.put = put
module.exports.put.stream = put.stream

module.exports.rm = rm.entry
module.exports.rm.all = rm.all
module.exports.rm.entry = module.exports.rm
module.exports.rm.content = rm.content

module.exports.clearMemoized = clearMemoized

module.exports.tmp = {}
module.exports.tmp.mkdir = tmp.mkdir
module.exports.tmp.withTmp = tmp.withTmp

module.exports.verify = verify
module.exports.verify.lastRun = verify.lastRun
