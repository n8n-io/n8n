// https://github.com/Ethan-Arrowood/undici-fetch

'use strict'

const { kHeadersList, kConstruct } = require('../core/symbols')
const { kGuard } = require('./symbols')
const { kEnumerableProperty } = require('../core/util')
const {
  makeIterator,
  isValidHeaderName,
  isValidHeaderValue
} = require('./util')
const util = require('util')
const { webidl } = require('./webidl')
const assert = require('assert')

const kHeadersMap = Symbol('headers map')
const kHeadersSortedMap = Symbol('headers map sorted')

/**
 * @param {number} code
 */
function isHTTPWhiteSpaceCharCode (code) {
  return code === 0x00a || code === 0x00d || code === 0x009 || code === 0x020
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-header-value-normalize
 * @param {string} potentialValue
 */
function headerValueNormalize (potentialValue) {
  //  To normalize a byte sequence potentialValue, remove
  //  any leading and trailing HTTP whitespace bytes from
  //  potentialValue.
  let i = 0; let j = potentialValue.length

  while (j > i && isHTTPWhiteSpaceCharCode(potentialValue.charCodeAt(j - 1))) --j
  while (j > i && isHTTPWhiteSpaceCharCode(potentialValue.charCodeAt(i))) ++i

  return i === 0 && j === potentialValue.length ? potentialValue : potentialValue.substring(i, j)
}

function fill (headers, object) {
  // To fill a Headers object headers with a given object object, run these steps:

  // 1. If object is a sequence, then for each header in object:
  // Note: webidl conversion to array has already been done.
  if (Array.isArray(object)) {
    for (let i = 0; i < object.length; ++i) {
      const header = object[i]
      // 1. If header does not contain exactly two items, then throw a TypeError.
      if (header.length !== 2) {
        throw webidl.errors.exception({
          header: 'Headers constructor',
          message: `expected name/value pair to be length 2, found ${header.length}.`
        })
      }

      // 2. Append (header’s first item, header’s second item) to headers.
      appendHeader(headers, header[0], header[1])
    }
  } else if (typeof object === 'object' && object !== null) {
    // Note: null should throw

    // 2. Otherwise, object is a record, then for each key → value in object,
    //    append (key, value) to headers
    const keys = Object.keys(object)
    for (let i = 0; i < keys.length; ++i) {
      appendHeader(headers, keys[i], object[keys[i]])
    }
  } else {
    throw webidl.errors.conversionFailed({
      prefix: 'Headers constructor',
      argument: 'Argument 1',
      types: ['sequence<sequence<ByteString>>', 'record<ByteString, ByteString>']
    })
  }
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-headers-append
 */
function appendHeader (headers, name, value) {
  // 1. Normalize value.
  value = headerValueNormalize(value)

  // 2. If name is not a header name or value is not a
  //    header value, then throw a TypeError.
  if (!isValidHeaderName(name)) {
    throw webidl.errors.invalidArgument({
      prefix: 'Headers.append',
      value: name,
      type: 'header name'
    })
  } else if (!isValidHeaderValue(value)) {
    throw webidl.errors.invalidArgument({
      prefix: 'Headers.append',
      value,
      type: 'header value'
    })
  }

  // 3. If headers’s guard is "immutable", then throw a TypeError.
  // 4. Otherwise, if headers’s guard is "request" and name is a
  //    forbidden header name, return.
  // Note: undici does not implement forbidden header names
  if (headers[kGuard] === 'immutable') {
    throw new TypeError('immutable')
  } else if (headers[kGuard] === 'request-no-cors') {
    // 5. Otherwise, if headers’s guard is "request-no-cors":
    // TODO
  }

  // 6. Otherwise, if headers’s guard is "response" and name is a
  //    forbidden response-header name, return.

  // 7. Append (name, value) to headers’s header list.
  return headers[kHeadersList].append(name, value)

  // 8. If headers’s guard is "request-no-cors", then remove
  //    privileged no-CORS request headers from headers
}

class HeadersList {
  /** @type {[string, string][]|null} */
  cookies = null

  constructor (init) {
    if (init instanceof HeadersList) {
      this[kHeadersMap] = new Map(init[kHeadersMap])
      this[kHeadersSortedMap] = init[kHeadersSortedMap]
      this.cookies = init.cookies === null ? null : [...init.cookies]
    } else {
      this[kHeadersMap] = new Map(init)
      this[kHeadersSortedMap] = null
    }
  }

  // https://fetch.spec.whatwg.org/#header-list-contains
  contains (name) {
    // A header list list contains a header name name if list
    // contains a header whose name is a byte-case-insensitive
    // match for name.
    name = name.toLowerCase()

    return this[kHeadersMap].has(name)
  }

  clear () {
    this[kHeadersMap].clear()
    this[kHeadersSortedMap] = null
    this.cookies = null
  }

  // https://fetch.spec.whatwg.org/#concept-header-list-append
  append (name, value) {
    this[kHeadersSortedMap] = null

    // 1. If list contains name, then set name to the first such
    //    header’s name.
    const lowercaseName = name.toLowerCase()
    const exists = this[kHeadersMap].get(lowercaseName)

    // 2. Append (name, value) to list.
    if (exists) {
      const delimiter = lowercaseName === 'cookie' ? '; ' : ', '
      this[kHeadersMap].set(lowercaseName, {
        name: exists.name,
        value: `${exists.value}${delimiter}${value}`
      })
    } else {
      this[kHeadersMap].set(lowercaseName, { name, value })
    }

    if (lowercaseName === 'set-cookie') {
      this.cookies ??= []
      this.cookies.push(value)
    }
  }

  // https://fetch.spec.whatwg.org/#concept-header-list-set
  set (name, value) {
    this[kHeadersSortedMap] = null
    const lowercaseName = name.toLowerCase()

    if (lowercaseName === 'set-cookie') {
      this.cookies = [value]
    }

    // 1. If list contains name, then set the value of
    //    the first such header to value and remove the
    //    others.
    // 2. Otherwise, append header (name, value) to list.
    this[kHeadersMap].set(lowercaseName, { name, value })
  }

  // https://fetch.spec.whatwg.org/#concept-header-list-delete
  delete (name) {
    this[kHeadersSortedMap] = null

    name = name.toLowerCase()

    if (name === 'set-cookie') {
      this.cookies = null
    }

    this[kHeadersMap].delete(name)
  }

  // https://fetch.spec.whatwg.org/#concept-header-list-get
  get (name) {
    const value = this[kHeadersMap].get(name.toLowerCase())

    // 1. If list does not contain name, then return null.
    // 2. Return the values of all headers in list whose name
    //    is a byte-case-insensitive match for name,
    //    separated from each other by 0x2C 0x20, in order.
    return value === undefined ? null : value.value
  }

  * [Symbol.iterator] () {
    // use the lowercased name
    for (const [name, { value }] of this[kHeadersMap]) {
      yield [name, value]
    }
  }

  get entries () {
    const headers = {}

    if (this[kHeadersMap].size) {
      for (const { name, value } of this[kHeadersMap].values()) {
        headers[name] = value
      }
    }

    return headers
  }
}

// https://fetch.spec.whatwg.org/#headers-class
class Headers {
  constructor (init = undefined) {
    if (init === kConstruct) {
      return
    }
    this[kHeadersList] = new HeadersList()

    // The new Headers(init) constructor steps are:

    // 1. Set this’s guard to "none".
    this[kGuard] = 'none'

    // 2. If init is given, then fill this with init.
    if (init !== undefined) {
      init = webidl.converters.HeadersInit(init)
      fill(this, init)
    }
  }

  // https://fetch.spec.whatwg.org/#dom-headers-append
  append (name, value) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 2, { header: 'Headers.append' })

    name = webidl.converters.ByteString(name)
    value = webidl.converters.ByteString(value)

    return appendHeader(this, name, value)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-delete
  delete (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, { header: 'Headers.delete' })

    name = webidl.converters.ByteString(name)

    // 1. If name is not a header name, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix: 'Headers.delete',
        value: name,
        type: 'header name'
      })
    }

    // 2. If this’s guard is "immutable", then throw a TypeError.
    // 3. Otherwise, if this’s guard is "request" and name is a
    //    forbidden header name, return.
    // 4. Otherwise, if this’s guard is "request-no-cors", name
    //    is not a no-CORS-safelisted request-header name, and
    //    name is not a privileged no-CORS request-header name,
    //    return.
    // 5. Otherwise, if this’s guard is "response" and name is
    //    a forbidden response-header name, return.
    // Note: undici does not implement forbidden header names
    if (this[kGuard] === 'immutable') {
      throw new TypeError('immutable')
    } else if (this[kGuard] === 'request-no-cors') {
      // TODO
    }

    // 6. If this’s header list does not contain name, then
    //    return.
    if (!this[kHeadersList].contains(name)) {
      return
    }

    // 7. Delete name from this’s header list.
    // 8. If this’s guard is "request-no-cors", then remove
    //    privileged no-CORS request headers from this.
    this[kHeadersList].delete(name)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-get
  get (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, { header: 'Headers.get' })

    name = webidl.converters.ByteString(name)

    // 1. If name is not a header name, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix: 'Headers.get',
        value: name,
        type: 'header name'
      })
    }

    // 2. Return the result of getting name from this’s header
    //    list.
    return this[kHeadersList].get(name)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-has
  has (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, { header: 'Headers.has' })

    name = webidl.converters.ByteString(name)

    // 1. If name is not a header name, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix: 'Headers.has',
        value: name,
        type: 'header name'
      })
    }

    // 2. Return true if this’s header list contains name;
    //    otherwise false.
    return this[kHeadersList].contains(name)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-set
  set (name, value) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 2, { header: 'Headers.set' })

    name = webidl.converters.ByteString(name)
    value = webidl.converters.ByteString(value)

    // 1. Normalize value.
    value = headerValueNormalize(value)

    // 2. If name is not a header name or value is not a
    //    header value, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix: 'Headers.set',
        value: name,
        type: 'header name'
      })
    } else if (!isValidHeaderValue(value)) {
      throw webidl.errors.invalidArgument({
        prefix: 'Headers.set',
        value,
        type: 'header value'
      })
    }

    // 3. If this’s guard is "immutable", then throw a TypeError.
    // 4. Otherwise, if this’s guard is "request" and name is a
    //    forbidden header name, return.
    // 5. Otherwise, if this’s guard is "request-no-cors" and
    //    name/value is not a no-CORS-safelisted request-header,
    //    return.
    // 6. Otherwise, if this’s guard is "response" and name is a
    //    forbidden response-header name, return.
    // Note: undici does not implement forbidden header names
    if (this[kGuard] === 'immutable') {
      throw new TypeError('immutable')
    } else if (this[kGuard] === 'request-no-cors') {
      // TODO
    }

    // 7. Set (name, value) in this’s header list.
    // 8. If this’s guard is "request-no-cors", then remove
    //    privileged no-CORS request headers from this
    this[kHeadersList].set(name, value)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-getsetcookie
  getSetCookie () {
    webidl.brandCheck(this, Headers)

    // 1. If this’s header list does not contain `Set-Cookie`, then return « ».
    // 2. Return the values of all headers in this’s header list whose name is
    //    a byte-case-insensitive match for `Set-Cookie`, in order.

    const list = this[kHeadersList].cookies

    if (list) {
      return [...list]
    }

    return []
  }

  // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
  get [kHeadersSortedMap] () {
    if (this[kHeadersList][kHeadersSortedMap]) {
      return this[kHeadersList][kHeadersSortedMap]
    }

    // 1. Let headers be an empty list of headers with the key being the name
    //    and value the value.
    const headers = []

    // 2. Let names be the result of convert header names to a sorted-lowercase
    //    set with all the names of the headers in list.
    const names = [...this[kHeadersList]].sort((a, b) => a[0] < b[0] ? -1 : 1)
    const cookies = this[kHeadersList].cookies

    // 3. For each name of names:
    for (let i = 0; i < names.length; ++i) {
      const [name, value] = names[i]
      // 1. If name is `set-cookie`, then:
      if (name === 'set-cookie') {
        // 1. Let values be a list of all values of headers in list whose name
        //    is a byte-case-insensitive match for name, in order.

        // 2. For each value of values:
        // 1. Append (name, value) to headers.
        for (let j = 0; j < cookies.length; ++j) {
          headers.push([name, cookies[j]])
        }
      } else {
        // 2. Otherwise:

        // 1. Let value be the result of getting name from list.

        // 2. Assert: value is non-null.
        assert(value !== null)

        // 3. Append (name, value) to headers.
        headers.push([name, value])
      }
    }

    this[kHeadersList][kHeadersSortedMap] = headers

    // 4. Return headers.
    return headers
  }

  keys () {
    webidl.brandCheck(this, Headers)

    if (this[kGuard] === 'immutable') {
      const value = this[kHeadersSortedMap]
      return makeIterator(() => value, 'Headers',
        'key')
    }

    return makeIterator(
      () => [...this[kHeadersSortedMap].values()],
      'Headers',
      'key'
    )
  }

  values () {
    webidl.brandCheck(this, Headers)

    if (this[kGuard] === 'immutable') {
      const value = this[kHeadersSortedMap]
      return makeIterator(() => value, 'Headers',
        'value')
    }

    return makeIterator(
      () => [...this[kHeadersSortedMap].values()],
      'Headers',
      'value'
    )
  }

  entries () {
    webidl.brandCheck(this, Headers)

    if (this[kGuard] === 'immutable') {
      const value = this[kHeadersSortedMap]
      return makeIterator(() => value, 'Headers',
        'key+value')
    }

    return makeIterator(
      () => [...this[kHeadersSortedMap].values()],
      'Headers',
      'key+value'
    )
  }

  /**
   * @param {(value: string, key: string, self: Headers) => void} callbackFn
   * @param {unknown} thisArg
   */
  forEach (callbackFn, thisArg = globalThis) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, { header: 'Headers.forEach' })

    if (typeof callbackFn !== 'function') {
      throw new TypeError(
        "Failed to execute 'forEach' on 'Headers': parameter 1 is not of type 'Function'."
      )
    }

    for (const [key, value] of this) {
      callbackFn.apply(thisArg, [value, key, this])
    }
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    webidl.brandCheck(this, Headers)

    return this[kHeadersList]
  }
}

Headers.prototype[Symbol.iterator] = Headers.prototype.entries

Object.defineProperties(Headers.prototype, {
  append: kEnumerableProperty,
  delete: kEnumerableProperty,
  get: kEnumerableProperty,
  has: kEnumerableProperty,
  set: kEnumerableProperty,
  getSetCookie: kEnumerableProperty,
  keys: kEnumerableProperty,
  values: kEnumerableProperty,
  entries: kEnumerableProperty,
  forEach: kEnumerableProperty,
  [Symbol.iterator]: { enumerable: false },
  [Symbol.toStringTag]: {
    value: 'Headers',
    configurable: true
  },
  [util.inspect.custom]: {
    enumerable: false
  }
})

webidl.converters.HeadersInit = function (V) {
  if (webidl.util.Type(V) === 'Object') {
    if (V[Symbol.iterator]) {
      return webidl.converters['sequence<sequence<ByteString>>'](V)
    }

    return webidl.converters['record<ByteString, ByteString>'](V)
  }

  throw webidl.errors.conversionFailed({
    prefix: 'Headers constructor',
    argument: 'Argument 1',
    types: ['sequence<sequence<ByteString>>', 'record<ByteString, ByteString>']
  })
}

module.exports = {
  fill,
  Headers,
  HeadersList
}
