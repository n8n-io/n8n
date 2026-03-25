'use strict'

const util = require('util')

const contentPath = require('./path')
const { hasContent } = require('./read')
const rimraf = util.promisify(require('rimraf'))

module.exports = rm

function rm (cache, integrity) {
  return hasContent(cache, integrity).then((content) => {
    // ~pretty~ sure we can't end up with a content lacking sri, but be safe
    if (content && content.sri)
      return rimraf(contentPath(cache, content.sri)).then(() => true)
    else
      return false
  })
}
