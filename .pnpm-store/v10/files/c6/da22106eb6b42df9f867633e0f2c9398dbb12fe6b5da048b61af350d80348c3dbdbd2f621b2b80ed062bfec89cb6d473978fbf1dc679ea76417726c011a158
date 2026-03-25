/**
 * Utility module to work with urls.
 *
 * @module url
 */

import * as object from './object.js'

/**
 * Parse query parameters from an url.
 *
 * @param {string} url
 * @return {Object<string,string>}
 */
export const decodeQueryParams = url => {
  /**
   * @type {Object<string,string>}
   */
  const query = {}
  const urlQuerySplit = url.split('?')
  const pairs = urlQuerySplit[urlQuerySplit.length - 1].split('&')
  for (let i = 0; i < pairs.length; i++) {
    const item = pairs[i]
    if (item.length > 0) {
      const pair = item.split('=')
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
    }
  }
  return query
}

/**
 * @param {Object<string,string>} params
 * @return {string}
 */
export const encodeQueryParams = params =>
  object.map(params, (val, key) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join('&')
