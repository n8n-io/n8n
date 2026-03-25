'use strict'
var path = require('path')

var uniqueSlug = require('unique-slug')

module.exports = function (filepath, prefix, uniq) {
  return path.join(filepath, (prefix ? prefix + '-' : '') + uniqueSlug(uniq))
}
