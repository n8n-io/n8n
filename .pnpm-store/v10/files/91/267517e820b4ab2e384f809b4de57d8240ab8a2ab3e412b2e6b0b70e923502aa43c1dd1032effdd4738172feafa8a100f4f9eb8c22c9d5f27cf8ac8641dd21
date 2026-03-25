'use strict'

const querystring = require('querystring')

const common = require('./common')

module.exports = function matchBody(options, spec, body) {
  if (spec instanceof RegExp) {
    return spec.test(body)
  }

  if (Buffer.isBuffer(spec)) {
    const encoding = common.isUtf8Representable(spec) ? 'utf8' : 'hex'
    spec = spec.toString(encoding)
  }

  const contentType = (
    (options.headers &&
      (options.headers['Content-Type'] || options.headers['content-type'])) ||
    ''
  ).toString()

  const isMultipart = contentType.includes('multipart')
  const isUrlencoded = contentType.includes('application/x-www-form-urlencoded')

  // try to transform body to json
  let json
  if (typeof spec === 'object' || typeof spec === 'function') {
    try {
      json = JSON.parse(body)
    } catch (err) {
      // not a valid JSON string
    }
    if (json !== undefined) {
      body = json
    } else if (isUrlencoded) {
      body = querystring.parse(body)
    }
  }

  if (typeof spec === 'function') {
    return spec.call(options, body)
  }

  // strip line endings from both so that we get a match no matter what OS we are running on
  // if Content-Type does not contain 'multipart'
  if (!isMultipart && typeof body === 'string') {
    body = body.replace(/\r?\n|\r/g, '')
  }

  if (!isMultipart && typeof spec === 'string') {
    spec = spec.replace(/\r?\n|\r/g, '')
  }

  // Because the nature of URL encoding, all the values in the body must be cast to strings.
  // dataEqual does strict checking, so we have to cast the non-regexp values in the spec too.
  if (isUrlencoded) {
    spec = mapValuesDeep(spec, val => (val instanceof RegExp ? val : `${val}`))
  }

  return common.dataEqual(spec, body)
}

function mapValues(object, cb) {
  const keys = Object.keys(object)
  const clonedObject = { ...object }
  for (const key of keys) {
    clonedObject[key] = cb(clonedObject[key], key, clonedObject)
  }
  return clonedObject
}

/**
 * Based on lodash issue discussion
 * https://github.com/lodash/lodash/issues/1244
 */
function mapValuesDeep(obj, cb) {
  if (Array.isArray(obj)) {
    return obj.map(v => mapValuesDeep(v, cb))
  }
  if (common.isPlainObject(obj)) {
    return mapValues(obj, v => mapValuesDeep(v, cb))
  }
  return cb(obj)
}
