// https://github.com/Ethan-Arrowood/undici-fetch

'use strict'

const { kConstruct } = require('../../core/symbols')
const { kEnumerableProperty } = require('../../core/util')
const {
  iteratorMixin,
  isValidHeaderName,
  isValidHeaderValue
} = require('./util')
const { webidl } = require('../webidl')
const assert = require('node:assert')
const util = require('node:util')

/**
 * @param {number} code
 * @returns {code is (0x0a | 0x0d | 0x09 | 0x20)}
 */
function isHTTPWhiteSpaceCharCode (code) {
  return code === 0x0a || code === 0x0d || code === 0x09 || code === 0x20
}

/**
 * @see https://fetch.spec.whatwg.org/#concept-header-value-normalize
 * @param {string} potentialValue
 * @returns {string}
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

/**
 * @param {Headers} headers
 * @param {Array|Object} object
 */
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
 * @param {Headers} headers
 * @param {string} name
 * @param {string} value
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
  // 5. Otherwise, if headers’s guard is "request-no-cors":
  //    TODO
  // Note: undici does not implement forbidden header names
  if (getHeadersGuard(headers) === 'immutable') {
    throw new TypeError('immutable')
  }

  // 6. Otherwise, if headers’s guard is "response" and name is a
  //    forbidden response-header name, return.

  // 7. Append (name, value) to headers’s header list.
  return getHeadersList(headers).append(name, value, false)

  // 8. If headers’s guard is "request-no-cors", then remove
  //    privileged no-CORS request headers from headers
}

// https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
/**
 * @param {Headers} target
 */
function headersListSortAndCombine (target) {
  const headersList = getHeadersList(target)

  if (!headersList) {
    return []
  }

  if (headersList.sortedMap) {
    return headersList.sortedMap
  }

  // 1. Let headers be an empty list of headers with the key being the name
  //    and value the value.
  const headers = []

  // 2. Let names be the result of convert header names to a sorted-lowercase
  //    set with all the names of the headers in list.
  const names = headersList.toSortedArray()

  const cookies = headersList.cookies

  // fast-path
  if (cookies === null || cookies.length === 1) {
    // Note: The non-null assertion of value has already been done by `HeadersList#toSortedArray`
    return (headersList.sortedMap = names)
  }

  // 3. For each name of names:
  for (let i = 0; i < names.length; ++i) {
    const { 0: name, 1: value } = names[i]
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
      // Note: This operation was done by `HeadersList#toSortedArray`.

      // 3. Append (name, value) to headers.
      headers.push([name, value])
    }
  }

  // 4. Return headers.
  return (headersList.sortedMap = headers)
}

function compareHeaderName (a, b) {
  return a[0] < b[0] ? -1 : 1
}

class HeadersList {
  /** @type {[string, string][]|null} */
  cookies = null

  sortedMap
  headersMap

  constructor (init) {
    if (init instanceof HeadersList) {
      this.headersMap = new Map(init.headersMap)
      this.sortedMap = init.sortedMap
      this.cookies = init.cookies === null ? null : [...init.cookies]
    } else {
      this.headersMap = new Map(init)
      this.sortedMap = null
    }
  }

  /**
   * @see https://fetch.spec.whatwg.org/#header-list-contains
   * @param {string} name
   * @param {boolean} isLowerCase
   */
  contains (name, isLowerCase) {
    // A header list list contains a header name name if list
    // contains a header whose name is a byte-case-insensitive
    // match for name.

    return this.headersMap.has(isLowerCase ? name : name.toLowerCase())
  }

  clear () {
    this.headersMap.clear()
    this.sortedMap = null
    this.cookies = null
  }

  /**
   * @see https://fetch.spec.whatwg.org/#concept-header-list-append
   * @param {string} name
   * @param {string} value
   * @param {boolean} isLowerCase
   */
  append (name, value, isLowerCase) {
    this.sortedMap = null

    // 1. If list contains name, then set name to the first such
    //    header’s name.
    const lowercaseName = isLowerCase ? name : name.toLowerCase()
    const exists = this.headersMap.get(lowercaseName)

    // 2. Append (name, value) to list.
    if (exists) {
      const delimiter = lowercaseName === 'cookie' ? '; ' : ', '
      this.headersMap.set(lowercaseName, {
        name: exists.name,
        value: `${exists.value}${delimiter}${value}`
      })
    } else {
      this.headersMap.set(lowercaseName, { name, value })
    }

    if (lowercaseName === 'set-cookie') {
      (this.cookies ??= []).push(value)
    }
  }

  /**
   * @see https://fetch.spec.whatwg.org/#concept-header-list-set
   * @param {string} name
   * @param {string} value
   * @param {boolean} isLowerCase
   */
  set (name, value, isLowerCase) {
    this.sortedMap = null
    const lowercaseName = isLowerCase ? name : name.toLowerCase()

    if (lowercaseName === 'set-cookie') {
      this.cookies = [value]
    }

    // 1. If list contains name, then set the value of
    //    the first such header to value and remove the
    //    others.
    // 2. Otherwise, append header (name, value) to list.
    this.headersMap.set(lowercaseName, { name, value })
  }

  /**
   * @see https://fetch.spec.whatwg.org/#concept-header-list-delete
   * @param {string} name
   * @param {boolean} isLowerCase
   */
  delete (name, isLowerCase) {
    this.sortedMap = null
    if (!isLowerCase) name = name.toLowerCase()

    if (name === 'set-cookie') {
      this.cookies = null
    }

    this.headersMap.delete(name)
  }

  /**
   * @see https://fetch.spec.whatwg.org/#concept-header-list-get
   * @param {string} name
   * @param {boolean} isLowerCase
   * @returns {string | null}
   */
  get (name, isLowerCase) {
    // 1. If list does not contain name, then return null.
    // 2. Return the values of all headers in list whose name
    //    is a byte-case-insensitive match for name,
    //    separated from each other by 0x2C 0x20, in order.
    return this.headersMap.get(isLowerCase ? name : name.toLowerCase())?.value ?? null
  }

  * [Symbol.iterator] () {
    // use the lowercased name
    for (const { 0: name, 1: { value } } of this.headersMap) {
      yield [name, value]
    }
  }

  get entries () {
    const headers = {}

    if (this.headersMap.size !== 0) {
      for (const { name, value } of this.headersMap.values()) {
        headers[name] = value
      }
    }

    return headers
  }

  rawValues () {
    return this.headersMap.values()
  }

  get entriesList () {
    const headers = []

    if (this.headersMap.size !== 0) {
      for (const { 0: lowerName, 1: { name, value } } of this.headersMap) {
        if (lowerName === 'set-cookie') {
          for (const cookie of this.cookies) {
            headers.push([name, cookie])
          }
        } else {
          headers.push([name, value])
        }
      }
    }

    return headers
  }

  // https://fetch.spec.whatwg.org/#convert-header-names-to-a-sorted-lowercase-set
  toSortedArray () {
    const size = this.headersMap.size
    const array = new Array(size)
    // In most cases, you will use the fast-path.
    // fast-path: Use binary insertion sort for small arrays.
    if (size <= 32) {
      if (size === 0) {
        // If empty, it is an empty array. To avoid the first index assignment.
        return array
      }
      // Improve performance by unrolling loop and avoiding double-loop.
      // Double-loop-less version of the binary insertion sort.
      const iterator = this.headersMap[Symbol.iterator]()
      const firstValue = iterator.next().value
      // set [name, value] to first index.
      array[0] = [firstValue[0], firstValue[1].value]
      // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
      // 3.2.2. Assert: value is non-null.
      assert(firstValue[1].value !== null)
      for (
        let i = 1, j = 0, right = 0, left = 0, pivot = 0, x, value;
        i < size;
        ++i
      ) {
        // get next value
        value = iterator.next().value
        // set [name, value] to current index.
        x = array[i] = [value[0], value[1].value]
        // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
        // 3.2.2. Assert: value is non-null.
        assert(x[1] !== null)
        left = 0
        right = i
        // binary search
        while (left < right) {
          // middle index
          pivot = left + ((right - left) >> 1)
          // compare header name
          if (array[pivot][0] <= x[0]) {
            left = pivot + 1
          } else {
            right = pivot
          }
        }
        if (i !== pivot) {
          j = i
          while (j > left) {
            array[j] = array[--j]
          }
          array[left] = x
        }
      }
      /* c8 ignore next 4 */
      if (!iterator.next().done) {
        // This is for debugging and will never be called.
        throw new TypeError('Unreachable')
      }
      return array
    } else {
      // This case would be a rare occurrence.
      // slow-path: fallback
      let i = 0
      for (const { 0: name, 1: { value } } of this.headersMap) {
        array[i++] = [name, value]
        // https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
        // 3.2.2. Assert: value is non-null.
        assert(value !== null)
      }
      return array.sort(compareHeaderName)
    }
  }
}

// https://fetch.spec.whatwg.org/#headers-class
class Headers {
  #guard
  /**
   * @type {HeadersList}
   */
  #headersList

  /**
   * @param {HeadersInit|Symbol} [init]
   * @returns
   */
  constructor (init = undefined) {
    webidl.util.markAsUncloneable(this)

    if (init === kConstruct) {
      return
    }

    this.#headersList = new HeadersList()

    // The new Headers(init) constructor steps are:

    // 1. Set this’s guard to "none".
    this.#guard = 'none'

    // 2. If init is given, then fill this with init.
    if (init !== undefined) {
      init = webidl.converters.HeadersInit(init, 'Headers constructor', 'init')
      fill(this, init)
    }
  }

  // https://fetch.spec.whatwg.org/#dom-headers-append
  append (name, value) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 2, 'Headers.append')

    const prefix = 'Headers.append'
    name = webidl.converters.ByteString(name, prefix, 'name')
    value = webidl.converters.ByteString(value, prefix, 'value')

    return appendHeader(this, name, value)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-delete
  delete (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, 'Headers.delete')

    const prefix = 'Headers.delete'
    name = webidl.converters.ByteString(name, prefix, 'name')

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
    if (this.#guard === 'immutable') {
      throw new TypeError('immutable')
    }

    // 6. If this’s header list does not contain name, then
    //    return.
    if (!this.#headersList.contains(name, false)) {
      return
    }

    // 7. Delete name from this’s header list.
    // 8. If this’s guard is "request-no-cors", then remove
    //    privileged no-CORS request headers from this.
    this.#headersList.delete(name, false)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-get
  get (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, 'Headers.get')

    const prefix = 'Headers.get'
    name = webidl.converters.ByteString(name, prefix, 'name')

    // 1. If name is not a header name, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix,
        value: name,
        type: 'header name'
      })
    }

    // 2. Return the result of getting name from this’s header
    //    list.
    return this.#headersList.get(name, false)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-has
  has (name) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 1, 'Headers.has')

    const prefix = 'Headers.has'
    name = webidl.converters.ByteString(name, prefix, 'name')

    // 1. If name is not a header name, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix,
        value: name,
        type: 'header name'
      })
    }

    // 2. Return true if this’s header list contains name;
    //    otherwise false.
    return this.#headersList.contains(name, false)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-set
  set (name, value) {
    webidl.brandCheck(this, Headers)

    webidl.argumentLengthCheck(arguments, 2, 'Headers.set')

    const prefix = 'Headers.set'
    name = webidl.converters.ByteString(name, prefix, 'name')
    value = webidl.converters.ByteString(value, prefix, 'value')

    // 1. Normalize value.
    value = headerValueNormalize(value)

    // 2. If name is not a header name or value is not a
    //    header value, then throw a TypeError.
    if (!isValidHeaderName(name)) {
      throw webidl.errors.invalidArgument({
        prefix,
        value: name,
        type: 'header name'
      })
    } else if (!isValidHeaderValue(value)) {
      throw webidl.errors.invalidArgument({
        prefix,
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
    if (this.#guard === 'immutable') {
      throw new TypeError('immutable')
    }

    // 7. Set (name, value) in this’s header list.
    // 8. If this’s guard is "request-no-cors", then remove
    //    privileged no-CORS request headers from this
    this.#headersList.set(name, value, false)
  }

  // https://fetch.spec.whatwg.org/#dom-headers-getsetcookie
  getSetCookie () {
    webidl.brandCheck(this, Headers)

    // 1. If this’s header list does not contain `Set-Cookie`, then return « ».
    // 2. Return the values of all headers in this’s header list whose name is
    //    a byte-case-insensitive match for `Set-Cookie`, in order.

    const list = this.#headersList.cookies

    if (list) {
      return [...list]
    }

    return []
  }

  [util.inspect.custom] (depth, options) {
    options.depth ??= depth

    return `Headers ${util.formatWithOptions(options, this.#headersList.entries)}`
  }

  static getHeadersGuard (o) {
    return o.#guard
  }

  static setHeadersGuard (o, guard) {
    o.#guard = guard
  }

  /**
   * @param {Headers} o
   */
  static getHeadersList (o) {
    return o.#headersList
  }

  /**
   * @param {Headers} target
   * @param {HeadersList} list
   */
  static setHeadersList (target, list) {
    target.#headersList = list
  }
}

const { getHeadersGuard, setHeadersGuard, getHeadersList, setHeadersList } = Headers
Reflect.deleteProperty(Headers, 'getHeadersGuard')
Reflect.deleteProperty(Headers, 'setHeadersGuard')
Reflect.deleteProperty(Headers, 'getHeadersList')
Reflect.deleteProperty(Headers, 'setHeadersList')

iteratorMixin('Headers', Headers, headersListSortAndCombine, 0, 1)

Object.defineProperties(Headers.prototype, {
  append: kEnumerableProperty,
  delete: kEnumerableProperty,
  get: kEnumerableProperty,
  has: kEnumerableProperty,
  set: kEnumerableProperty,
  getSetCookie: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'Headers',
    configurable: true
  },
  [util.inspect.custom]: {
    enumerable: false
  }
})

webidl.converters.HeadersInit = function (V, prefix, argument) {
  if (webidl.util.Type(V) === webidl.util.Types.OBJECT) {
    const iterator = Reflect.get(V, Symbol.iterator)

    // A work-around to ensure we send the properly-cased Headers when V is a Headers object.
    // Read https://github.com/nodejs/undici/pull/3159#issuecomment-2075537226 before touching, please.
    if (!util.types.isProxy(V) && iterator === Headers.prototype.entries) { // Headers object
      try {
        return getHeadersList(V).entriesList
      } catch {
        // fall-through
      }
    }

    if (typeof iterator === 'function') {
      return webidl.converters['sequence<sequence<ByteString>>'](V, prefix, argument, iterator.bind(V))
    }

    return webidl.converters['record<ByteString, ByteString>'](V, prefix, argument)
  }

  throw webidl.errors.conversionFailed({
    prefix: 'Headers constructor',
    argument: 'Argument 1',
    types: ['sequence<sequence<ByteString>>', 'record<ByteString, ByteString>']
  })
}

module.exports = {
  fill,
  // for test.
  compareHeaderName,
  Headers,
  HeadersList,
  getHeadersGuard,
  setHeadersGuard,
  setHeadersList,
  getHeadersList
}
