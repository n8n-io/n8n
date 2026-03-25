'use strict'

/**
 * check the url is not an empty string or empty array
 * @param url
 */
function checkURL (url) {
  return (typeof url === 'string' && url) ||
    (Array.isArray(url) && url.length > 0)
}

/**
 *
 * @param url
 * @param asArray
 * @returns
 */
function ofURL (url, asArray) {
  if (Array.isArray(url)) return url

  if (typeof url === 'string') {
    return {
      map (fn) {
        if (asArray) return [fn(url)]
        return fn(url)
      }
    }
  }

  throw new Error('url should only be a string or an array of string')
}

exports.checkURL = checkURL
exports.ofURL = ofURL
