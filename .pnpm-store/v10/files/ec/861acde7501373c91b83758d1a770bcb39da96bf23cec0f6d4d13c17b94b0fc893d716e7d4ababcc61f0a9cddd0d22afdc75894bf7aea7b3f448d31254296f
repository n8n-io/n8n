'use strict'

const { writeFile, readFile, mkdir } = require('node:fs/promises')
const { dirname, resolve } = require('node:path')
const { setTimeout, clearTimeout } = require('node:timers')
const { InvalidArgumentError, UndiciError } = require('../core/errors')
const { hashId, isUrlExcludedFactory, normalizeHeaders, createHeaderFilters } = require('./snapshot-utils')

/**
 * @typedef {Object} SnapshotRequestOptions
 * @property {string} method - HTTP method (e.g. 'GET', 'POST', etc.)
 * @property {string} path - Request path
 * @property {string} origin - Request origin (base URL)
 * @property {import('./snapshot-utils').Headers|import('./snapshot-utils').UndiciHeaders} headers - Request headers
 * @property {import('./snapshot-utils').NormalizedHeaders} _normalizedHeaders - Request headers as a lowercase object
 * @property {string|Buffer} [body] - Request body (optional)
 */

/**
 * @typedef {Object} SnapshotEntryRequest
 * @property {string} method - HTTP method (e.g. 'GET', 'POST', etc.)
 * @property {string} url - Full URL of the request
 * @property {import('./snapshot-utils').NormalizedHeaders} headers - Normalized headers as a lowercase object
 * @property {string|Buffer} [body] - Request body (optional)
 */

/**
 * @typedef {Object} SnapshotEntryResponse
 * @property {number} statusCode - HTTP status code of the response
 * @property {import('./snapshot-utils').NormalizedHeaders} headers - Normalized response headers as a lowercase object
 * @property {string} body - Response body as a base64url encoded string
 * @property {Object} [trailers] - Optional response trailers
 */

/**
 * @typedef {Object} SnapshotEntry
 * @property {SnapshotEntryRequest} request - The request object
 * @property {Array<SnapshotEntryResponse>} responses - Array of response objects
 * @property {number} callCount - Number of times this snapshot has been called
 * @property {string} timestamp - ISO timestamp of when the snapshot was created
 */

/**
 * @typedef {Object} SnapshotRecorderMatchOptions
 * @property {Array<string>} [matchHeaders=[]] - Headers to match (empty array means match all headers)
 * @property {Array<string>} [ignoreHeaders=[]] - Headers to ignore for matching
 * @property {Array<string>} [excludeHeaders=[]] - Headers to exclude from matching
 * @property {boolean} [matchBody=true] - Whether to match request body
 * @property {boolean} [matchQuery=true] - Whether to match query properties
 * @property {boolean} [caseSensitive=false] - Whether header matching is case-sensitive
 */

/**
 * @typedef {Object} SnapshotRecorderOptions
 * @property {string} [snapshotPath] - Path to save/load snapshots
 * @property {import('./snapshot-utils').SnapshotMode} [mode='record'] - Mode: 'record' or 'playback'
 * @property {number} [maxSnapshots=Infinity] - Maximum number of snapshots to keep
 * @property {boolean} [autoFlush=false] - Whether to automatically flush snapshots to disk
 * @property {number} [flushInterval=30000] - Auto-flush interval in milliseconds (default: 30 seconds)
 * @property {Array<string|RegExp>} [excludeUrls=[]] - URLs to exclude from recording
 * @property {function} [shouldRecord=null] - Function to filter requests for recording
 * @property {function} [shouldPlayback=null] - Function to filter requests
 */

/**
 * @typedef {Object} SnapshotFormattedRequest
 * @property {string} method - HTTP method (e.g. 'GET', 'POST', etc.)
 * @property {string} url - Full URL of the request (with query parameters if matchQuery is true)
 * @property {import('./snapshot-utils').NormalizedHeaders} headers - Normalized headers as a lowercase object
 * @property {string} body - Request body (optional, only if matchBody is true)
 */

/**
 * @typedef {Object} SnapshotInfo
 * @property {string} hash - Hash key for the snapshot
 * @property {SnapshotEntryRequest} request - The request object
 * @property {number} responseCount - Number of responses recorded for this request
 * @property {number} callCount - Number of times this snapshot has been called
 * @property {string} timestamp - ISO timestamp of when the snapshot was created
 */

/**
 * Formats a request for consistent snapshot storage
 * Caches normalized headers to avoid repeated processing
 *
 * @param {SnapshotRequestOptions} opts - Request options
 * @param {import('./snapshot-utils').HeaderFilters} headerFilters - Cached header sets for performance
 * @param {SnapshotRecorderMatchOptions} [matchOptions] - Matching options for headers and body
 * @returns {SnapshotFormattedRequest} - Formatted request object
 */
function formatRequestKey (opts, headerFilters, matchOptions = {}) {
  const url = new URL(opts.path, opts.origin)

  // Cache normalized headers if not already done
  const normalized = opts._normalizedHeaders || normalizeHeaders(opts.headers)
  if (!opts._normalizedHeaders) {
    opts._normalizedHeaders = normalized
  }

  return {
    method: opts.method || 'GET',
    url: matchOptions.matchQuery !== false ? url.toString() : `${url.origin}${url.pathname}`,
    headers: filterHeadersForMatching(normalized, headerFilters, matchOptions),
    body: matchOptions.matchBody !== false && opts.body ? String(opts.body) : ''
  }
}

/**
 * Filters headers based on matching configuration
 *
 * @param {import('./snapshot-utils').Headers} headers - Headers to filter
 * @param {import('./snapshot-utils').HeaderFilters} headerFilters - Cached sets for ignore, exclude, and match headers
 * @param {SnapshotRecorderMatchOptions} [matchOptions] - Matching options for headers
 */
function filterHeadersForMatching (headers, headerFilters, matchOptions = {}) {
  if (!headers || typeof headers !== 'object') return {}

  const {
    caseSensitive = false
  } = matchOptions

  const filtered = {}
  const { ignore, exclude, match } = headerFilters

  for (const [key, value] of Object.entries(headers)) {
    const headerKey = caseSensitive ? key : key.toLowerCase()

    // Skip if in exclude list (for security)
    if (exclude.has(headerKey)) continue

    // Skip if in ignore list (for matching)
    if (ignore.has(headerKey)) continue

    // If matchHeaders is specified, only include those headers
    if (match.size !== 0) {
      if (!match.has(headerKey)) continue
    }

    filtered[headerKey] = value
  }

  return filtered
}

/**
 * Filters headers for storage (only excludes sensitive headers)
 *
 * @param {import('./snapshot-utils').Headers} headers - Headers to filter
 * @param {import('./snapshot-utils').HeaderFilters} headerFilters - Cached sets for ignore, exclude, and match headers
 * @param {SnapshotRecorderMatchOptions} [matchOptions] - Matching options for headers
 */
function filterHeadersForStorage (headers, headerFilters, matchOptions = {}) {
  if (!headers || typeof headers !== 'object') return {}

  const {
    caseSensitive = false
  } = matchOptions

  const filtered = {}
  const { exclude: excludeSet } = headerFilters

  for (const [key, value] of Object.entries(headers)) {
    const headerKey = caseSensitive ? key : key.toLowerCase()

    // Skip if in exclude list (for security)
    if (excludeSet.has(headerKey)) continue

    filtered[headerKey] = value
  }

  return filtered
}

/**
 * Creates a hash key for request matching
 * Properly orders headers to avoid conflicts and uses crypto hashing when available
 *
 * @param {SnapshotFormattedRequest} formattedRequest - Request object
 * @returns {string} - Base64url encoded hash of the request
 */
function createRequestHash (formattedRequest) {
  const parts = [
    formattedRequest.method,
    formattedRequest.url
  ]

  // Process headers in a deterministic way to avoid conflicts
  if (formattedRequest.headers && typeof formattedRequest.headers === 'object') {
    const headerKeys = Object.keys(formattedRequest.headers).sort()
    for (const key of headerKeys) {
      const values = Array.isArray(formattedRequest.headers[key])
        ? formattedRequest.headers[key]
        : [formattedRequest.headers[key]]

      // Add header name
      parts.push(key)

      // Add all values for this header, sorted for consistency
      for (const value of values.sort()) {
        parts.push(String(value))
      }
    }
  }

  // Add body
  parts.push(formattedRequest.body)

  const content = parts.join('|')

  return hashId(content)
}

class SnapshotRecorder {
  /** @type {NodeJS.Timeout | null} */
  #flushTimeout

  /** @type {import('./snapshot-utils').IsUrlExcluded} */
  #isUrlExcluded

  /** @type {Map<string, SnapshotEntry>} */
  #snapshots = new Map()

  /** @type {string|undefined} */
  #snapshotPath

  /** @type {number} */
  #maxSnapshots = Infinity

  /** @type {boolean} */
  #autoFlush = false

  /** @type {import('./snapshot-utils').HeaderFilters} */
  #headerFilters

  /**
   * Creates a new SnapshotRecorder instance
   * @param {SnapshotRecorderOptions&SnapshotRecorderMatchOptions} [options={}] - Configuration options for the recorder
   */
  constructor (options = {}) {
    this.#snapshotPath = options.snapshotPath
    this.#maxSnapshots = options.maxSnapshots || Infinity
    this.#autoFlush = options.autoFlush || false
    this.flushInterval = options.flushInterval || 30000 // 30 seconds default
    this._flushTimer = null

    // Matching configuration
    /** @type {Required<SnapshotRecorderMatchOptions>} */
    this.matchOptions = {
      matchHeaders: options.matchHeaders || [], // empty means match all headers
      ignoreHeaders: options.ignoreHeaders || [],
      excludeHeaders: options.excludeHeaders || [],
      matchBody: options.matchBody !== false, // default: true
      matchQuery: options.matchQuery !== false, // default: true
      caseSensitive: options.caseSensitive || false
    }

    // Cache processed header sets to avoid recreating them on every request
    this.#headerFilters = createHeaderFilters(this.matchOptions)

    // Request filtering callbacks
    this.shouldRecord = options.shouldRecord || (() => true) // function(requestOpts) -> boolean
    this.shouldPlayback = options.shouldPlayback || (() => true) // function(requestOpts) -> boolean

    // URL pattern filtering
    this.#isUrlExcluded = isUrlExcludedFactory(options.excludeUrls) // Array of regex patterns or strings

    // Start auto-flush timer if enabled
    if (this.#autoFlush && this.#snapshotPath) {
      this.#startAutoFlush()
    }
  }

  /**
   * Records a request-response interaction
   * @param {SnapshotRequestOptions} requestOpts - Request options
   * @param {SnapshotEntryResponse} response - Response data to record
   * @return {Promise<void>} - Resolves when the recording is complete
   */
  async record (requestOpts, response) {
    // Check if recording should be filtered out
    if (!this.shouldRecord(requestOpts)) {
      return // Skip recording
    }

    // Check URL exclusion patterns
    if (this.isUrlExcluded(requestOpts)) {
      return // Skip recording
    }

    const request = formatRequestKey(requestOpts, this.#headerFilters, this.matchOptions)
    const hash = createRequestHash(request)

    // Extract response data - always store body as base64
    const normalizedHeaders = normalizeHeaders(response.headers)

    /** @type {SnapshotEntryResponse} */
    const responseData = {
      statusCode: response.statusCode,
      headers: filterHeadersForStorage(normalizedHeaders, this.#headerFilters, this.matchOptions),
      body: Buffer.isBuffer(response.body)
        ? response.body.toString('base64')
        : Buffer.from(String(response.body || '')).toString('base64'),
      trailers: response.trailers
    }

    // Remove oldest snapshot if we exceed maxSnapshots limit
    if (this.#snapshots.size >= this.#maxSnapshots && !this.#snapshots.has(hash)) {
      const oldestKey = this.#snapshots.keys().next().value
      this.#snapshots.delete(oldestKey)
    }

    // Support sequential responses - if snapshot exists, add to responses array
    const existingSnapshot = this.#snapshots.get(hash)
    if (existingSnapshot && existingSnapshot.responses) {
      existingSnapshot.responses.push(responseData)
      existingSnapshot.timestamp = new Date().toISOString()
    } else {
      this.#snapshots.set(hash, {
        request,
        responses: [responseData], // Always store as array for consistency
        callCount: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Auto-flush if enabled
    if (this.#autoFlush && this.#snapshotPath) {
      this.#scheduleFlush()
    }
  }

  /**
   * Checks if a URL should be excluded from recording/playback
   * @param {SnapshotRequestOptions} requestOpts - Request options to check
   * @returns {boolean} - True if URL is excluded
   */
  isUrlExcluded (requestOpts) {
    const url = new URL(requestOpts.path, requestOpts.origin).toString()
    return this.#isUrlExcluded(url)
  }

  /**
   * Finds a matching snapshot for the given request
   * Returns the appropriate response based on call count for sequential responses
   *
   * @param {SnapshotRequestOptions} requestOpts - Request options to match
   * @returns {SnapshotEntry&Record<'response', SnapshotEntryResponse>|undefined} - Matching snapshot response or undefined if not found
   */
  findSnapshot (requestOpts) {
    // Check if playback should be filtered out
    if (!this.shouldPlayback(requestOpts)) {
      return undefined // Skip playback
    }

    // Check URL exclusion patterns
    if (this.isUrlExcluded(requestOpts)) {
      return undefined // Skip playback
    }

    const request = formatRequestKey(requestOpts, this.#headerFilters, this.matchOptions)
    const hash = createRequestHash(request)
    const snapshot = this.#snapshots.get(hash)

    if (!snapshot) return undefined

    // Handle sequential responses
    const currentCallCount = snapshot.callCount || 0
    const responseIndex = Math.min(currentCallCount, snapshot.responses.length - 1)
    snapshot.callCount = currentCallCount + 1

    return {
      ...snapshot,
      response: snapshot.responses[responseIndex]
    }
  }

  /**
   * Loads snapshots from file
   * @param {string} [filePath] - Optional file path to load snapshots from
   * @return {Promise<void>} - Resolves when snapshots are loaded
   */
  async loadSnapshots (filePath) {
    const path = filePath || this.#snapshotPath
    if (!path) {
      throw new InvalidArgumentError('Snapshot path is required')
    }

    try {
      const data = await readFile(resolve(path), 'utf8')
      const parsed = JSON.parse(data)

      // Convert array format back to Map
      if (Array.isArray(parsed)) {
        this.#snapshots.clear()
        for (const { hash, snapshot } of parsed) {
          this.#snapshots.set(hash, snapshot)
        }
      } else {
        // Legacy object format
        this.#snapshots = new Map(Object.entries(parsed))
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet - that's ok for recording mode
        this.#snapshots.clear()
      } else {
        throw new UndiciError(`Failed to load snapshots from ${path}`, { cause: error })
      }
    }
  }

  /**
   * Saves snapshots to file
   *
   * @param {string} [filePath] - Optional file path to save snapshots
   * @returns {Promise<void>} - Resolves when snapshots are saved
   */
  async saveSnapshots (filePath) {
    const path = filePath || this.#snapshotPath
    if (!path) {
      throw new InvalidArgumentError('Snapshot path is required')
    }

    const resolvedPath = resolve(path)

    // Ensure directory exists
    await mkdir(dirname(resolvedPath), { recursive: true })

    // Convert Map to serializable format
    const data = Array.from(this.#snapshots.entries()).map(([hash, snapshot]) => ({
      hash,
      snapshot
    }))

    await writeFile(resolvedPath, JSON.stringify(data, null, 2), { flush: true })
  }

  /**
   * Clears all recorded snapshots
   * @returns {void}
   */
  clear () {
    this.#snapshots.clear()
  }

  /**
   * Gets all recorded snapshots
   * @return {Array<SnapshotEntry>} - Array of all recorded snapshots
   */
  getSnapshots () {
    return Array.from(this.#snapshots.values())
  }

  /**
   * Gets snapshot count
   * @return {number} - Number of recorded snapshots
   */
  size () {
    return this.#snapshots.size
  }

  /**
   * Resets call counts for all snapshots (useful for test cleanup)
   * @returns {void}
   */
  resetCallCounts () {
    for (const snapshot of this.#snapshots.values()) {
      snapshot.callCount = 0
    }
  }

  /**
   * Deletes a specific snapshot by request options
   * @param {SnapshotRequestOptions} requestOpts - Request options to match
   * @returns {boolean} - True if snapshot was deleted, false if not found
   */
  deleteSnapshot (requestOpts) {
    const request = formatRequestKey(requestOpts, this.#headerFilters, this.matchOptions)
    const hash = createRequestHash(request)
    return this.#snapshots.delete(hash)
  }

  /**
   * Gets information about a specific snapshot
   * @param {SnapshotRequestOptions} requestOpts - Request options to match
   * @returns {SnapshotInfo|null} - Snapshot information or null if not found
   */
  getSnapshotInfo (requestOpts) {
    const request = formatRequestKey(requestOpts, this.#headerFilters, this.matchOptions)
    const hash = createRequestHash(request)
    const snapshot = this.#snapshots.get(hash)

    if (!snapshot) return null

    return {
      hash,
      request: snapshot.request,
      responseCount: snapshot.responses ? snapshot.responses.length : (snapshot.response ? 1 : 0), // .response for legacy snapshots
      callCount: snapshot.callCount || 0,
      timestamp: snapshot.timestamp
    }
  }

  /**
   * Replaces all snapshots with new data (full replacement)
   * @param {Array<{hash: string; snapshot: SnapshotEntry}>|Record<string, SnapshotEntry>} snapshotData - New snapshot data to replace existing ones
   * @returns {void}
   */
  replaceSnapshots (snapshotData) {
    this.#snapshots.clear()

    if (Array.isArray(snapshotData)) {
      for (const { hash, snapshot } of snapshotData) {
        this.#snapshots.set(hash, snapshot)
      }
    } else if (snapshotData && typeof snapshotData === 'object') {
      // Legacy object format
      this.#snapshots = new Map(Object.entries(snapshotData))
    }
  }

  /**
   * Starts the auto-flush timer
   * @returns {void}
   */
  #startAutoFlush () {
    return this.#scheduleFlush()
  }

  /**
   * Stops the auto-flush timer
   * @returns {void}
   */
  #stopAutoFlush () {
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout)
      // Ensure any pending flush is completed
      this.saveSnapshots().catch(() => {
      // Ignore flush errors
      })
      this.#flushTimeout = null
    }
  }

  /**
   * Schedules a flush (debounced to avoid excessive writes)
   */
  #scheduleFlush () {
    this.#flushTimeout = setTimeout(() => {
      this.saveSnapshots().catch(() => {
        // Ignore flush errors
      })
      if (this.#autoFlush) {
        this.#flushTimeout?.refresh()
      } else {
        this.#flushTimeout = null
      }
    }, 1000) // 1 second debounce
  }

  /**
   * Cleanup method to stop timers
   * @returns {void}
   */
  destroy () {
    this.#stopAutoFlush()
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout)
      this.#flushTimeout = null
    }
  }

  /**
   * Async close method that saves all recordings and performs cleanup
   * @returns {Promise<void>}
   */
  async close () {
    // Save any pending recordings if we have a snapshot path
    if (this.#snapshotPath && this.#snapshots.size !== 0) {
      await this.saveSnapshots()
    }

    // Perform cleanup
    this.destroy()
  }
}

module.exports = { SnapshotRecorder, formatRequestKey, createRequestHash, filterHeadersForMatching, filterHeadersForStorage, createHeaderFilters }
