'use strict'
const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/

const validateName = name => {
  name = `${name}`
  if (invalidTokenRegex.test(name) || name === '')
    throw new TypeError(`${name} is not a legal HTTP header name`)
}

const validateValue = value => {
  value = `${value}`
  if (invalidHeaderCharRegex.test(value))
    throw new TypeError(`${value} is not a legal HTTP header value`)
}

const find = (map, name) => {
  name = name.toLowerCase()
  for (const key in map) {
    if (key.toLowerCase() === name)
      return key
  }
  return undefined
}

const MAP = Symbol('map')
class Headers {
  constructor (init = undefined) {
    this[MAP] = Object.create(null)
    if (init instanceof Headers) {
      const rawHeaders = init.raw()
      const headerNames = Object.keys(rawHeaders)
      for (const headerName of headerNames) {
        for (const value of rawHeaders[headerName]) {
          this.append(headerName, value)
        }
      }
      return
    }

    // no-op
    if (init === undefined || init === null)
      return

    if (typeof init === 'object') {
      const method = init[Symbol.iterator]
      if (method !== null && method !== undefined) {
        if (typeof method !== 'function')
          throw new TypeError('Header pairs must be iterable')

        // sequence<sequence<ByteString>>
        // Note: per spec we have to first exhaust the lists then process them
        const pairs = []
        for (const pair of init) {
          if (typeof pair !== 'object' ||
              typeof pair[Symbol.iterator] !== 'function')
            throw new TypeError('Each header pair must be iterable')
          const arrPair = Array.from(pair)
          if (arrPair.length !== 2)
            throw new TypeError('Each header pair must be a name/value tuple')
          pairs.push(arrPair)
        }

        for (const pair of pairs) {
          this.append(pair[0], pair[1])
        }
      } else {
        // record<ByteString, ByteString>
        for (const key of Object.keys(init)) {
          this.append(key, init[key])
        }
      }
    } else
      throw new TypeError('Provided initializer must be an object')
  }

  get (name) {
    name = `${name}`
    validateName(name)
    const key = find(this[MAP], name)
    if (key === undefined)
      return null

    return this[MAP][key].join(', ')
  }

  forEach (callback, thisArg = undefined) {
    let pairs = getHeaders(this)
    for (let i = 0; i < pairs.length; i++) {
      const [name, value] = pairs[i]
      callback.call(thisArg, value, name, this)
      // refresh in case the callback added more headers
      pairs = getHeaders(this)
    }
  }

  set (name, value) {
    name = `${name}`
    value = `${value}`
    validateName(name)
    validateValue(value)
    const key = find(this[MAP], name)
    this[MAP][key !== undefined ? key : name] = [value]
  }

  append (name, value) {
    name = `${name}`
    value = `${value}`
    validateName(name)
    validateValue(value)
    const key = find(this[MAP], name)
    if (key !== undefined)
      this[MAP][key].push(value)
    else
      this[MAP][name] = [value]
  }

  has (name) {
    name = `${name}`
    validateName(name)
    return find(this[MAP], name) !== undefined
  }

  delete (name) {
    name = `${name}`
    validateName(name)
    const key = find(this[MAP], name)
    if (key !== undefined)
      delete this[MAP][key]
  }

  raw () {
    return this[MAP]
  }

  keys () {
    return new HeadersIterator(this, 'key')
  }

  values () {
    return new HeadersIterator(this, 'value')
  }

  [Symbol.iterator]() {
    return new HeadersIterator(this, 'key+value')
  }

  entries () {
    return new HeadersIterator(this, 'key+value')
  }

  get [Symbol.toStringTag] () {
    return 'Headers'
  }

  static exportNodeCompatibleHeaders (headers) {
    const obj = Object.assign(Object.create(null), headers[MAP])

    // http.request() only supports string as Host header. This hack makes
    // specifying custom Host header possible.
    const hostHeaderKey = find(headers[MAP], 'Host')
    if (hostHeaderKey !== undefined)
      obj[hostHeaderKey] = obj[hostHeaderKey][0]

    return obj
  }

  static createHeadersLenient (obj) {
    const headers = new Headers()
    for (const name of Object.keys(obj)) {
      if (invalidTokenRegex.test(name))
        continue

      if (Array.isArray(obj[name])) {
        for (const val of obj[name]) {
          if (invalidHeaderCharRegex.test(val))
            continue

          if (headers[MAP][name] === undefined)
            headers[MAP][name] = [val]
          else
            headers[MAP][name].push(val)
        }
      } else if (!invalidHeaderCharRegex.test(obj[name]))
        headers[MAP][name] = [obj[name]]
    }
    return headers
  }
}

Object.defineProperties(Headers.prototype, {
  get: { enumerable: true },
  forEach: { enumerable: true },
  set: { enumerable: true },
  append: { enumerable: true },
  has: { enumerable: true },
  delete: { enumerable: true },
  keys: { enumerable: true },
  values: { enumerable: true },
  entries: { enumerable: true },
})

const getHeaders = (headers, kind = 'key+value') =>
  Object.keys(headers[MAP]).sort().map(
    kind === 'key' ? k => k.toLowerCase()
    : kind === 'value' ? k => headers[MAP][k].join(', ')
    : k => [k.toLowerCase(), headers[MAP][k].join(', ')]
  )

const INTERNAL = Symbol('internal')

class HeadersIterator {
  constructor (target, kind) {
    this[INTERNAL] = {
      target,
      kind,
      index: 0,
    }
  }

  get [Symbol.toStringTag] () {
    return 'HeadersIterator'
  }

  next () {
    /* istanbul ignore if: should be impossible */
    if (!this || Object.getPrototypeOf(this) !== HeadersIterator.prototype)
      throw new TypeError('Value of `this` is not a HeadersIterator')

    const { target, kind, index } = this[INTERNAL]
    const values = getHeaders(target, kind)
    const len = values.length
    if (index >= len) {
      return {
        value: undefined,
        done: true,
      }
    }

    this[INTERNAL].index++

    return { value: values[index], done: false }
  }
}

// manually extend because 'extends' requires a ctor
Object.setPrototypeOf(HeadersIterator.prototype,
  Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())))

module.exports = Headers
