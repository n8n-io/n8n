'use strict'

const { Writable } = require('node:stream')
const { assertCacheKey, assertCacheValue } = require('../util/cache.js')

let DatabaseSync

const VERSION = 3

// 2gb
const MAX_ENTRY_SIZE = 2 * 1000 * 1000 * 1000

/**
 * @typedef {import('../../types/cache-interceptor.d.ts').default.CacheStore} CacheStore
 * @implements {CacheStore}
 *
 * @typedef {{
 *  id: Readonly<number>,
 *  body?: Uint8Array
 *  statusCode: number
 *  statusMessage: string
 *  headers?: string
 *  vary?: string
 *  etag?: string
 *  cacheControlDirectives?: string
 *  cachedAt: number
 *  staleAt: number
 *  deleteAt: number
 * }} SqliteStoreValue
 */
module.exports = class SqliteCacheStore {
  #maxEntrySize = MAX_ENTRY_SIZE
  #maxCount = Infinity

  /**
   * @type {import('node:sqlite').DatabaseSync}
   */
  #db

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #getValuesQuery

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #updateValueQuery

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #insertValueQuery

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #deleteExpiredValuesQuery

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #deleteByUrlQuery

  /**
   * @type {import('node:sqlite').StatementSync}
   */
  #countEntriesQuery

  /**
   * @type {import('node:sqlite').StatementSync | null}
   */
  #deleteOldValuesQuery

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.SqliteCacheStoreOpts | undefined} opts
   */
  constructor (opts) {
    if (opts) {
      if (typeof opts !== 'object') {
        throw new TypeError('SqliteCacheStore options must be an object')
      }

      if (opts.maxEntrySize !== undefined) {
        if (
          typeof opts.maxEntrySize !== 'number' ||
          !Number.isInteger(opts.maxEntrySize) ||
          opts.maxEntrySize < 0
        ) {
          throw new TypeError('SqliteCacheStore options.maxEntrySize must be a non-negative integer')
        }

        if (opts.maxEntrySize > MAX_ENTRY_SIZE) {
          throw new TypeError('SqliteCacheStore options.maxEntrySize must be less than 2gb')
        }

        this.#maxEntrySize = opts.maxEntrySize
      }

      if (opts.maxCount !== undefined) {
        if (
          typeof opts.maxCount !== 'number' ||
          !Number.isInteger(opts.maxCount) ||
          opts.maxCount < 0
        ) {
          throw new TypeError('SqliteCacheStore options.maxCount must be a non-negative integer')
        }
        this.#maxCount = opts.maxCount
      }
    }

    if (!DatabaseSync) {
      DatabaseSync = require('node:sqlite').DatabaseSync
    }
    this.#db = new DatabaseSync(opts?.location ?? ':memory:')

    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = memory;
      PRAGMA optimize;

      CREATE TABLE IF NOT EXISTS cacheInterceptorV${VERSION} (
        -- Data specific to us
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        method TEXT NOT NULL,

        -- Data returned to the interceptor
        body BUF NULL,
        deleteAt INTEGER NOT NULL,
        statusCode INTEGER NOT NULL,
        statusMessage TEXT NOT NULL,
        headers TEXT NULL,
        cacheControlDirectives TEXT NULL,
        etag TEXT NULL,
        vary TEXT NULL,
        cachedAt INTEGER NOT NULL,
        staleAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cacheInterceptorV${VERSION}_getValuesQuery ON cacheInterceptorV${VERSION}(url, method, deleteAt);
      CREATE INDEX IF NOT EXISTS idx_cacheInterceptorV${VERSION}_deleteByUrlQuery ON cacheInterceptorV${VERSION}(deleteAt);
    `)

    this.#getValuesQuery = this.#db.prepare(`
      SELECT
        id,
        body,
        deleteAt,
        statusCode,
        statusMessage,
        headers,
        etag,
        cacheControlDirectives,
        vary,
        cachedAt,
        staleAt
      FROM cacheInterceptorV${VERSION}
      WHERE
        url = ?
        AND method = ?
      ORDER BY
        deleteAt ASC
    `)

    this.#updateValueQuery = this.#db.prepare(`
      UPDATE cacheInterceptorV${VERSION} SET
        body = ?,
        deleteAt = ?,
        statusCode = ?,
        statusMessage = ?,
        headers = ?,
        etag = ?,
        cacheControlDirectives = ?,
        cachedAt = ?,
        staleAt = ?
      WHERE
        id = ?
    `)

    this.#insertValueQuery = this.#db.prepare(`
      INSERT INTO cacheInterceptorV${VERSION} (
        url,
        method,
        body,
        deleteAt,
        statusCode,
        statusMessage,
        headers,
        etag,
        cacheControlDirectives,
        vary,
        cachedAt,
        staleAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.#deleteByUrlQuery = this.#db.prepare(
      `DELETE FROM cacheInterceptorV${VERSION} WHERE url = ?`
    )

    this.#countEntriesQuery = this.#db.prepare(
      `SELECT COUNT(*) AS total FROM cacheInterceptorV${VERSION}`
    )

    this.#deleteExpiredValuesQuery = this.#db.prepare(
      `DELETE FROM cacheInterceptorV${VERSION} WHERE deleteAt <= ?`
    )

    this.#deleteOldValuesQuery = this.#maxCount === Infinity
      ? null
      : this.#db.prepare(`
        DELETE FROM cacheInterceptorV${VERSION}
        WHERE id IN (
          SELECT
            id
          FROM cacheInterceptorV${VERSION}
          ORDER BY cachedAt DESC
          LIMIT ?
        )
      `)
  }

  close () {
    this.#db.close()
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @returns {(import('../../types/cache-interceptor.d.ts').default.GetResult & { body?: Buffer }) | undefined}
   */
  get (key) {
    assertCacheKey(key)

    const value = this.#findValue(key)
    return value
      ? {
          body: value.body ? Buffer.from(value.body.buffer, value.body.byteOffset, value.body.byteLength) : undefined,
          statusCode: value.statusCode,
          statusMessage: value.statusMessage,
          headers: value.headers ? JSON.parse(value.headers) : undefined,
          etag: value.etag ? value.etag : undefined,
          vary: value.vary ? JSON.parse(value.vary) : undefined,
          cacheControlDirectives: value.cacheControlDirectives
            ? JSON.parse(value.cacheControlDirectives)
            : undefined,
          cachedAt: value.cachedAt,
          staleAt: value.staleAt,
          deleteAt: value.deleteAt
        }
      : undefined
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheValue & { body: null | Buffer | Array<Buffer>}} value
   */
  set (key, value) {
    assertCacheKey(key)

    const url = this.#makeValueUrl(key)
    const body = Array.isArray(value.body) ? Buffer.concat(value.body) : value.body
    const size = body?.byteLength

    if (size && size > this.#maxEntrySize) {
      return
    }

    const existingValue = this.#findValue(key, true)
    if (existingValue) {
      // Updating an existing response, let's overwrite it
      this.#updateValueQuery.run(
        body,
        value.deleteAt,
        value.statusCode,
        value.statusMessage,
        value.headers ? JSON.stringify(value.headers) : null,
        value.etag ? value.etag : null,
        value.cacheControlDirectives ? JSON.stringify(value.cacheControlDirectives) : null,
        value.cachedAt,
        value.staleAt,
        existingValue.id
      )
    } else {
      this.#prune()
      // New response, let's insert it
      this.#insertValueQuery.run(
        url,
        key.method,
        body,
        value.deleteAt,
        value.statusCode,
        value.statusMessage,
        value.headers ? JSON.stringify(value.headers) : null,
        value.etag ? value.etag : null,
        value.cacheControlDirectives ? JSON.stringify(value.cacheControlDirectives) : null,
        value.vary ? JSON.stringify(value.vary) : null,
        value.cachedAt,
        value.staleAt
      )
    }
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheValue} value
   * @returns {Writable | undefined}
   */
  createWriteStream (key, value) {
    assertCacheKey(key)
    assertCacheValue(value)

    let size = 0
    /**
     * @type {Buffer[] | null}
     */
    const body = []
    const store = this

    return new Writable({
      decodeStrings: true,
      write (chunk, encoding, callback) {
        size += chunk.byteLength

        if (size < store.#maxEntrySize) {
          body.push(chunk)
        } else {
          this.destroy()
        }

        callback()
      },
      final (callback) {
        store.set(key, { ...value, body })
        callback()
      }
    })
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   */
  delete (key) {
    if (typeof key !== 'object') {
      throw new TypeError(`expected key to be object, got ${typeof key}`)
    }

    this.#deleteByUrlQuery.run(this.#makeValueUrl(key))
  }

  #prune () {
    if (Number.isFinite(this.#maxCount) && this.size <= this.#maxCount) {
      return 0
    }

    {
      const removed = this.#deleteExpiredValuesQuery.run(Date.now()).changes
      if (removed) {
        return removed
      }
    }

    {
      const removed = this.#deleteOldValuesQuery?.run(Math.max(Math.floor(this.#maxCount * 0.1), 1)).changes
      if (removed) {
        return removed
      }
    }

    return 0
  }

  /**
   * Counts the number of rows in the cache
   * @returns {Number}
   */
  get size () {
    const { total } = this.#countEntriesQuery.get()
    return total
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @returns {string}
   */
  #makeValueUrl (key) {
    return `${key.origin}/${key.path}`
  }

  /**
   * @param {import('../../types/cache-interceptor.d.ts').default.CacheKey} key
   * @param {boolean} [canBeExpired=false]
   * @returns {SqliteStoreValue | undefined}
   */
  #findValue (key, canBeExpired = false) {
    const url = this.#makeValueUrl(key)
    const { headers, method } = key

    /**
     * @type {SqliteStoreValue[]}
     */
    const values = this.#getValuesQuery.all(url, method)

    if (values.length === 0) {
      return undefined
    }

    const now = Date.now()
    for (const value of values) {
      if (now >= value.deleteAt && !canBeExpired) {
        return undefined
      }

      let matches = true

      if (value.vary) {
        const vary = JSON.parse(value.vary)

        for (const header in vary) {
          if (!headerValueEquals(headers[header], vary[header])) {
            matches = false
            break
          }
        }
      }

      if (matches) {
        return value
      }
    }

    return undefined
  }
}

/**
 * @param {string|string[]|null|undefined} lhs
 * @param {string|string[]|null|undefined} rhs
 * @returns {boolean}
 */
function headerValueEquals (lhs, rhs) {
  if (lhs == null && rhs == null) {
    return true
  }

  if ((lhs == null && rhs != null) ||
      (lhs != null && rhs == null)) {
    return false
  }

  if (Array.isArray(lhs) && Array.isArray(rhs)) {
    if (lhs.length !== rhs.length) {
      return false
    }

    return lhs.every((x, i) => x === rhs[i])
  }

  return lhs === rhs
}
