'use strict'

const { isBlobLike, iteratorMixin } = require('./util')
const { kState } = require('./symbols')
const { kEnumerableProperty } = require('../../core/util')
const { FileLike, isFileLike } = require('./file')
const { webidl } = require('./webidl')
const { File: NativeFile } = require('node:buffer')
const nodeUtil = require('node:util')

/** @type {globalThis['File']} */
const File = globalThis.File ?? NativeFile

// https://xhr.spec.whatwg.org/#formdata
class FormData {
  constructor (form) {
    webidl.util.markAsUncloneable(this)

    if (form !== undefined) {
      throw webidl.errors.conversionFailed({
        prefix: 'FormData constructor',
        argument: 'Argument 1',
        types: ['undefined']
      })
    }

    this[kState] = []
  }

  append (name, value, filename = undefined) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.append'
    webidl.argumentLengthCheck(arguments, 2, prefix)

    if (arguments.length === 3 && !isBlobLike(value)) {
      throw new TypeError(
        "Failed to execute 'append' on 'FormData': parameter 2 is not of type 'Blob'"
      )
    }

    // 1. Let value be value if given; otherwise blobValue.

    name = webidl.converters.USVString(name, prefix, 'name')
    value = isBlobLike(value)
      ? webidl.converters.Blob(value, prefix, 'value', { strict: false })
      : webidl.converters.USVString(value, prefix, 'value')
    filename = arguments.length === 3
      ? webidl.converters.USVString(filename, prefix, 'filename')
      : undefined

    // 2. Let entry be the result of creating an entry with
    // name, value, and filename if given.
    const entry = makeEntry(name, value, filename)

    // 3. Append entry to this’s entry list.
    this[kState].push(entry)
  }

  delete (name) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.delete'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    name = webidl.converters.USVString(name, prefix, 'name')

    // The delete(name) method steps are to remove all entries whose name
    // is name from this’s entry list.
    this[kState] = this[kState].filter(entry => entry.name !== name)
  }

  get (name) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.get'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    name = webidl.converters.USVString(name, prefix, 'name')

    // 1. If there is no entry whose name is name in this’s entry list,
    // then return null.
    const idx = this[kState].findIndex((entry) => entry.name === name)
    if (idx === -1) {
      return null
    }

    // 2. Return the value of the first entry whose name is name from
    // this’s entry list.
    return this[kState][idx].value
  }

  getAll (name) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.getAll'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    name = webidl.converters.USVString(name, prefix, 'name')

    // 1. If there is no entry whose name is name in this’s entry list,
    // then return the empty list.
    // 2. Return the values of all entries whose name is name, in order,
    // from this’s entry list.
    return this[kState]
      .filter((entry) => entry.name === name)
      .map((entry) => entry.value)
  }

  has (name) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.has'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    name = webidl.converters.USVString(name, prefix, 'name')

    // The has(name) method steps are to return true if there is an entry
    // whose name is name in this’s entry list; otherwise false.
    return this[kState].findIndex((entry) => entry.name === name) !== -1
  }

  set (name, value, filename = undefined) {
    webidl.brandCheck(this, FormData)

    const prefix = 'FormData.set'
    webidl.argumentLengthCheck(arguments, 2, prefix)

    if (arguments.length === 3 && !isBlobLike(value)) {
      throw new TypeError(
        "Failed to execute 'set' on 'FormData': parameter 2 is not of type 'Blob'"
      )
    }

    // The set(name, value) and set(name, blobValue, filename) method steps
    // are:

    // 1. Let value be value if given; otherwise blobValue.

    name = webidl.converters.USVString(name, prefix, 'name')
    value = isBlobLike(value)
      ? webidl.converters.Blob(value, prefix, 'name', { strict: false })
      : webidl.converters.USVString(value, prefix, 'name')
    filename = arguments.length === 3
      ? webidl.converters.USVString(filename, prefix, 'name')
      : undefined

    // 2. Let entry be the result of creating an entry with name, value, and
    // filename if given.
    const entry = makeEntry(name, value, filename)

    // 3. If there are entries in this’s entry list whose name is name, then
    // replace the first such entry with entry and remove the others.
    const idx = this[kState].findIndex((entry) => entry.name === name)
    if (idx !== -1) {
      this[kState] = [
        ...this[kState].slice(0, idx),
        entry,
        ...this[kState].slice(idx + 1).filter((entry) => entry.name !== name)
      ]
    } else {
      // 4. Otherwise, append entry to this’s entry list.
      this[kState].push(entry)
    }
  }

  [nodeUtil.inspect.custom] (depth, options) {
    const state = this[kState].reduce((a, b) => {
      if (a[b.name]) {
        if (Array.isArray(a[b.name])) {
          a[b.name].push(b.value)
        } else {
          a[b.name] = [a[b.name], b.value]
        }
      } else {
        a[b.name] = b.value
      }

      return a
    }, { __proto__: null })

    options.depth ??= depth
    options.colors ??= true

    const output = nodeUtil.formatWithOptions(options, state)

    // remove [Object null prototype]
    return `FormData ${output.slice(output.indexOf(']') + 2)}`
  }
}

iteratorMixin('FormData', FormData, kState, 'name', 'value')

Object.defineProperties(FormData.prototype, {
  append: kEnumerableProperty,
  delete: kEnumerableProperty,
  get: kEnumerableProperty,
  getAll: kEnumerableProperty,
  has: kEnumerableProperty,
  set: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'FormData',
    configurable: true
  }
})

/**
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#create-an-entry
 * @param {string} name
 * @param {string|Blob} value
 * @param {?string} filename
 * @returns
 */
function makeEntry (name, value, filename) {
  // 1. Set name to the result of converting name into a scalar value string.
  // Note: This operation was done by the webidl converter USVString.

  // 2. If value is a string, then set value to the result of converting
  //    value into a scalar value string.
  if (typeof value === 'string') {
    // Note: This operation was done by the webidl converter USVString.
  } else {
    // 3. Otherwise:

    // 1. If value is not a File object, then set value to a new File object,
    //    representing the same bytes, whose name attribute value is "blob"
    if (!isFileLike(value)) {
      value = value instanceof Blob
        ? new File([value], 'blob', { type: value.type })
        : new FileLike(value, 'blob', { type: value.type })
    }

    // 2. If filename is given, then set value to a new File object,
    //    representing the same bytes, whose name attribute is filename.
    if (filename !== undefined) {
      /** @type {FilePropertyBag} */
      const options = {
        type: value.type,
        lastModified: value.lastModified
      }

      value = value instanceof NativeFile
        ? new File([value], filename, options)
        : new FileLike(value, filename, options)
    }
  }

  // 4. Return an entry whose name is name and whose value is value.
  return { name, value }
}

module.exports = { FormData, makeEntry }
