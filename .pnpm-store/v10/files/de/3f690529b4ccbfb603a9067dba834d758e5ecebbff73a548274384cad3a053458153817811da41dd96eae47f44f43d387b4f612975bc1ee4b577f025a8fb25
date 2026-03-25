'use strict'
const { isIP } = require('node:net')
const { lookup } = require('node:dns')
const DecoratorHandler = require('../handler/decorator-handler')
const { InvalidArgumentError, InformationalError } = require('../core/errors')
const maxInt = Math.pow(2, 31) - 1

class DNSInstance {
  #maxTTL = 0
  #maxItems = 0
  #records = new Map()
  dualStack = true
  affinity = null
  lookup = null
  pick = null

  constructor (opts) {
    this.#maxTTL = opts.maxTTL
    this.#maxItems = opts.maxItems
    this.dualStack = opts.dualStack
    this.affinity = opts.affinity
    this.lookup = opts.lookup ?? this.#defaultLookup
    this.pick = opts.pick ?? this.#defaultPick
  }

  get full () {
    return this.#records.size === this.#maxItems
  }

  runLookup (origin, opts, cb) {
    const ips = this.#records.get(origin.hostname)

    // If full, we just return the origin
    if (ips == null && this.full) {
      cb(null, origin.origin)
      return
    }

    const newOpts = {
      affinity: this.affinity,
      dualStack: this.dualStack,
      lookup: this.lookup,
      pick: this.pick,
      ...opts.dns,
      maxTTL: this.#maxTTL,
      maxItems: this.#maxItems
    }

    // If no IPs we lookup
    if (ips == null) {
      this.lookup(origin, newOpts, (err, addresses) => {
        if (err || addresses == null || addresses.length === 0) {
          cb(err ?? new InformationalError('No DNS entries found'))
          return
        }

        this.setRecords(origin, addresses)
        const records = this.#records.get(origin.hostname)

        const ip = this.pick(
          origin,
          records,
          newOpts.affinity
        )

        let port
        if (typeof ip.port === 'number') {
          port = `:${ip.port}`
        } else if (origin.port !== '') {
          port = `:${origin.port}`
        } else {
          port = ''
        }

        cb(
          null,
          `${origin.protocol}//${
            ip.family === 6 ? `[${ip.address}]` : ip.address
          }${port}`
        )
      })
    } else {
      // If there's IPs we pick
      const ip = this.pick(
        origin,
        ips,
        newOpts.affinity
      )

      // If no IPs we lookup - deleting old records
      if (ip == null) {
        this.#records.delete(origin.hostname)
        this.runLookup(origin, opts, cb)
        return
      }

      let port
      if (typeof ip.port === 'number') {
        port = `:${ip.port}`
      } else if (origin.port !== '') {
        port = `:${origin.port}`
      } else {
        port = ''
      }

      cb(
        null,
        `${origin.protocol}//${
          ip.family === 6 ? `[${ip.address}]` : ip.address
        }${port}`
      )
    }
  }

  #defaultLookup (origin, opts, cb) {
    lookup(
      origin.hostname,
      {
        all: true,
        family: this.dualStack === false ? this.affinity : 0,
        order: 'ipv4first'
      },
      (err, addresses) => {
        if (err) {
          return cb(err)
        }

        const results = new Map()

        for (const addr of addresses) {
          // On linux we found duplicates, we attempt to remove them with
          // the latest record
          results.set(`${addr.address}:${addr.family}`, addr)
        }

        cb(null, results.values())
      }
    )
  }

  #defaultPick (origin, hostnameRecords, affinity) {
    let ip = null
    const { records, offset } = hostnameRecords

    let family
    if (this.dualStack) {
      if (affinity == null) {
        // Balance between ip families
        if (offset == null || offset === maxInt) {
          hostnameRecords.offset = 0
          affinity = 4
        } else {
          hostnameRecords.offset++
          affinity = (hostnameRecords.offset & 1) === 1 ? 6 : 4
        }
      }

      if (records[affinity] != null && records[affinity].ips.length > 0) {
        family = records[affinity]
      } else {
        family = records[affinity === 4 ? 6 : 4]
      }
    } else {
      family = records[affinity]
    }

    // If no IPs we return null
    if (family == null || family.ips.length === 0) {
      return ip
    }

    if (family.offset == null || family.offset === maxInt) {
      family.offset = 0
    } else {
      family.offset++
    }

    const position = family.offset % family.ips.length
    ip = family.ips[position] ?? null

    if (ip == null) {
      return ip
    }

    if (Date.now() - ip.timestamp > ip.ttl) { // record TTL is already in ms
      // We delete expired records
      // It is possible that they have different TTL, so we manage them individually
      family.ips.splice(position, 1)
      return this.pick(origin, hostnameRecords, affinity)
    }

    return ip
  }

  setRecords (origin, addresses) {
    const timestamp = Date.now()
    const records = { records: { 4: null, 6: null } }
    for (const record of addresses) {
      record.timestamp = timestamp
      if (typeof record.ttl === 'number') {
        // The record TTL is expected to be in ms
        record.ttl = Math.min(record.ttl, this.#maxTTL)
      } else {
        record.ttl = this.#maxTTL
      }

      const familyRecords = records.records[record.family] ?? { ips: [] }

      familyRecords.ips.push(record)
      records.records[record.family] = familyRecords
    }

    this.#records.set(origin.hostname, records)
  }

  getHandler (meta, opts) {
    return new DNSDispatchHandler(this, meta, opts)
  }
}

class DNSDispatchHandler extends DecoratorHandler {
  #state = null
  #opts = null
  #dispatch = null
  #handler = null
  #origin = null

  constructor (state, { origin, handler, dispatch }, opts) {
    super(handler)
    this.#origin = origin
    this.#handler = handler
    this.#opts = { ...opts }
    this.#state = state
    this.#dispatch = dispatch
  }

  onError (err) {
    switch (err.code) {
      case 'ETIMEDOUT':
      case 'ECONNREFUSED': {
        if (this.#state.dualStack) {
          // We delete the record and retry
          this.#state.runLookup(this.#origin, this.#opts, (err, newOrigin) => {
            if (err) {
              return this.#handler.onError(err)
            }

            const dispatchOpts = {
              ...this.#opts,
              origin: newOrigin
            }

            this.#dispatch(dispatchOpts, this)
          })

          // if dual-stack disabled, we error out
          return
        }

        this.#handler.onError(err)
        return
      }
      case 'ENOTFOUND':
        this.#state.deleteRecord(this.#origin)
      // eslint-disable-next-line no-fallthrough
      default:
        this.#handler.onError(err)
        break
    }
  }
}

module.exports = interceptorOpts => {
  if (
    interceptorOpts?.maxTTL != null &&
    (typeof interceptorOpts?.maxTTL !== 'number' || interceptorOpts?.maxTTL < 0)
  ) {
    throw new InvalidArgumentError('Invalid maxTTL. Must be a positive number')
  }

  if (
    interceptorOpts?.maxItems != null &&
    (typeof interceptorOpts?.maxItems !== 'number' ||
      interceptorOpts?.maxItems < 1)
  ) {
    throw new InvalidArgumentError(
      'Invalid maxItems. Must be a positive number and greater than zero'
    )
  }

  if (
    interceptorOpts?.affinity != null &&
    interceptorOpts?.affinity !== 4 &&
    interceptorOpts?.affinity !== 6
  ) {
    throw new InvalidArgumentError('Invalid affinity. Must be either 4 or 6')
  }

  if (
    interceptorOpts?.dualStack != null &&
    typeof interceptorOpts?.dualStack !== 'boolean'
  ) {
    throw new InvalidArgumentError('Invalid dualStack. Must be a boolean')
  }

  if (
    interceptorOpts?.lookup != null &&
    typeof interceptorOpts?.lookup !== 'function'
  ) {
    throw new InvalidArgumentError('Invalid lookup. Must be a function')
  }

  if (
    interceptorOpts?.pick != null &&
    typeof interceptorOpts?.pick !== 'function'
  ) {
    throw new InvalidArgumentError('Invalid pick. Must be a function')
  }

  const dualStack = interceptorOpts?.dualStack ?? true
  let affinity
  if (dualStack) {
    affinity = interceptorOpts?.affinity ?? null
  } else {
    affinity = interceptorOpts?.affinity ?? 4
  }

  const opts = {
    maxTTL: interceptorOpts?.maxTTL ?? 10e3, // Expressed in ms
    lookup: interceptorOpts?.lookup ?? null,
    pick: interceptorOpts?.pick ?? null,
    dualStack,
    affinity,
    maxItems: interceptorOpts?.maxItems ?? Infinity
  }

  const instance = new DNSInstance(opts)

  return dispatch => {
    return function dnsInterceptor (origDispatchOpts, handler) {
      const origin =
        origDispatchOpts.origin.constructor === URL
          ? origDispatchOpts.origin
          : new URL(origDispatchOpts.origin)

      if (isIP(origin.hostname) !== 0) {
        return dispatch(origDispatchOpts, handler)
      }

      instance.runLookup(origin, origDispatchOpts, (err, newOrigin) => {
        if (err) {
          return handler.onError(err)
        }

        let dispatchOpts = null
        dispatchOpts = {
          ...origDispatchOpts,
          servername: origin.hostname, // For SNI on TLS
          origin: newOrigin,
          headers: {
            host: origin.hostname,
            ...origDispatchOpts.headers
          }
        }

        dispatch(
          dispatchOpts,
          instance.getHandler({ origin, dispatch, handler }, origDispatchOpts)
        )
      })

      return true
    }
  }
}
