'use strict'

const semver = require('semver')
const hasWorkerSupport = semver.gte(process.versions.node, '11.7.0')

function getPropertyCaseInsensitive (obj, key) {
  for (const objKey of Object.keys(obj)) {
    if (objKey.toLowerCase() === key.toLowerCase()) return obj[objKey]
  }
}

module.exports = { hasWorkerSupport, getPropertyCaseInsensitive }
