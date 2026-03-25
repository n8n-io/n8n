'use strict'

const { InvalidArgumentError } = require('../core/errors')
const { runtimeFeatures } = require('../util/runtime-features.js')

/**
 * @typedef {Object} HeaderFilters
 * @property {Set<string>} ignore - Set of headers to ignore for matching
 * @property {Set<string>} exclude - Set of headers to exclude from matching
 * @property {Set<string>} match - Set of headers to match (empty means match
 */

/**
 * Creates cached header sets for performance
 *
 * @param {import('./snapshot-recorder').SnapshotRecorderMatchOptions} matchOptions - Matching options for headers
 * @returns {HeaderFilters} - Cached sets for ignore, exclude, and match headers
 */
function createHeaderFilters (matchOptions = {}) {
  const { ignoreHeaders = [], excludeHeaders = [], matchHeaders = [], caseSensitive = false } = matchOptions

  return {
    ignore: new Set(ignoreHeaders.map(header => caseSensitive ? header : header.toLowerCase())),
    exclude: new Set(excludeHeaders.map(header => caseSensitive ? header : header.toLowerCase())),
    match: new Set(matchHeaders.map(header => caseSensitive ? header : header.toLowerCase()))
  }
}

const crypto = runtimeFeatures.has('crypto')
  ? require('node:crypto')
  : null

/**
 * @callback HashIdFunction
 * @param {string} value - The value to hash
 * @returns {string} - The base64url encoded hash of the value
 */

/**
 * Generates a hash for a given value
 * @type {HashIdFunction}
 */
const hashId = crypto?.hash
  ? (value) => crypto.hash('sha256', value, 'base64url')
  : (value) => Buffer.from(value).toString('base64url')

/**
 * @typedef {(url: string) => boolean} IsUrlExcluded Checks if a URL matches any of the exclude patterns
 */

/** @typedef {{[key: Lowercase<string>]: string}} NormalizedHeaders */
/** @typedef {Array<string>} UndiciHeaders */
/** @typedef {Record<string, string|string[]>} Headers */

/**
 * @param {*} headers
 * @returns {headers is UndiciHeaders}
 */
function isUndiciHeaders (headers) {
  return Array.isArray(headers) && (headers.length & 1) === 0
}

/**
 * Factory function to create a URL exclusion checker
 * @param {Array<string| RegExp>} [excludePatterns=[]] - Array of patterns to exclude
 * @returns {IsUrlExcluded} - A function that checks if a URL matches any of the exclude patterns
 */
function isUrlExcludedFactory (excludePatterns = []) {
  if (excludePatterns.length === 0) {
    return () => false
  }

  return function isUrlExcluded (url) {
    let urlLowerCased

    for (const pattern of excludePatterns) {
      if (typeof pattern === 'string') {
        if (!urlLowerCased) {
          // Convert URL to lowercase only once
          urlLowerCased = url.toLowerCase()
        }
        // Simple string match (case-insensitive)
        if (urlLowerCased.includes(pattern.toLowerCase())) {
          return true
        }
      } else if (pattern instanceof RegExp) {
        // Regex pattern match
        if (pattern.test(url)) {
          return true
        }
      }
    }

    return false
  }
}

/**
 * Normalizes headers for consistent comparison
 *
 * @param {Object|UndiciHeaders} headers - Headers to normalize
 * @returns {NormalizedHeaders} - Normalized headers as a lowercase object
 */
function normalizeHeaders (headers) {
  /** @type {NormalizedHeaders} */
  const normalizedHeaders = {}

  if (!headers) return normalizedHeaders

  // Handle array format (undici internal format: [name, value, name, value, ...])
  if (isUndiciHeaders(headers)) {
    for (let i = 0; i < headers.length; i += 2) {
      const key = headers[i]
      const value = headers[i + 1]
      if (key && value !== undefined) {
        // Convert Buffers to strings if needed
        const keyStr = Buffer.isBuffer(key) ? key.toString() : key
        const valueStr = Buffer.isBuffer(value) ? value.toString() : value
        normalizedHeaders[keyStr.toLowerCase()] = valueStr
      }
    }
    return normalizedHeaders
  }

  // Handle object format
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (key && typeof key === 'string') {
        normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value)
      }
    }
  }

  return normalizedHeaders
}

const validSnapshotModes = /** @type {const} */ (['record', 'playback', 'update'])

/** @typedef {typeof validSnapshotModes[number]} SnapshotMode */

/**
 * @param {*} mode - The snapshot mode to validate
 * @returns {asserts mode is SnapshotMode}
 */
function validateSnapshotMode (mode) {
  if (!validSnapshotModes.includes(mode)) {
    throw new InvalidArgumentError(`Invalid snapshot mode: ${mode}. Must be one of: ${validSnapshotModes.join(', ')}`)
  }
}

module.exports = {
  createHeaderFilters,
  hashId,
  isUndiciHeaders,
  normalizeHeaders,
  isUrlExcludedFactory,
  validateSnapshotMode
}
