'use strict'

const util = require('util')

const index = require('./lib/entry-index')
const memo = require('./lib/memoization')
const path = require('path')
const rimraf = util.promisify(require('rimraf'))
const rmContent = require('./lib/content/rm')

module.exports = entry
module.exports.entry = entry

function entry (cache, key, opts) {
  memo.clearMemoized()
  return index.delete(cache, key, opts)
}

module.exports.content = content

function content (cache, integrity) {
  memo.clearMemoized()
  return rmContent(cache, integrity)
}

module.exports.all = all

function all (cache) {
  memo.clearMemoized()
  return rimraf(path.join(cache, '*(content-*|index-*)'))
}
