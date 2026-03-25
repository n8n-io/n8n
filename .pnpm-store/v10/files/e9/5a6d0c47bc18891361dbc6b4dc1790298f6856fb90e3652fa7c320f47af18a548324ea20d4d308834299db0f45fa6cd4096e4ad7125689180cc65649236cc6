'use strict'

const { Blob, File } = require('node:buffer')
const { kState } = require('./symbols')
const { webidl } = require('./webidl')

// TODO(@KhafraDev): remove
class FileLike {
  constructor (blobLike, fileName, options = {}) {
    // TODO: argument idl type check

    // The File constructor is invoked with two or three parameters, depending
    // on whether the optional dictionary parameter is used. When the File()
    // constructor is invoked, user agents must run the following steps:

    // 1. Let bytes be the result of processing blob parts given fileBits and
    // options.

    // 2. Let n be the fileName argument to the constructor.
    const n = fileName

    // 3. Process FilePropertyBag dictionary argument by running the following
    // substeps:

    //    1. If the type member is provided and is not the empty string, let t
    //    be set to the type dictionary member. If t contains any characters
    //    outside the range U+0020 to U+007E, then set t to the empty string
    //    and return from these substeps.
    //    TODO
    const t = options.type

    //    2. Convert every character in t to ASCII lowercase.
    //    TODO

    //    3. If the lastModified member is provided, let d be set to the
    //    lastModified dictionary member. If it is not provided, set d to the
    //    current date and time represented as the number of milliseconds since
    //    the Unix Epoch (which is the equivalent of Date.now() [ECMA-262]).
    const d = options.lastModified ?? Date.now()

    // 4. Return a new File object F such that:
    // F refers to the bytes byte sequence.
    // F.size is set to the number of total bytes in bytes.
    // F.name is set to n.
    // F.type is set to t.
    // F.lastModified is set to d.

    this[kState] = {
      blobLike,
      name: n,
      type: t,
      lastModified: d
    }
  }

  stream (...args) {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.stream(...args)
  }

  arrayBuffer (...args) {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.arrayBuffer(...args)
  }

  slice (...args) {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.slice(...args)
  }

  text (...args) {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.text(...args)
  }

  get size () {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.size
  }

  get type () {
    webidl.brandCheck(this, FileLike)

    return this[kState].blobLike.type
  }

  get name () {
    webidl.brandCheck(this, FileLike)

    return this[kState].name
  }

  get lastModified () {
    webidl.brandCheck(this, FileLike)

    return this[kState].lastModified
  }

  get [Symbol.toStringTag] () {
    return 'File'
  }
}

webidl.converters.Blob = webidl.interfaceConverter(Blob)

// If this function is moved to ./util.js, some tools (such as
// rollup) will warn about circular dependencies. See:
// https://github.com/nodejs/undici/issues/1629
function isFileLike (object) {
  return (
    (object instanceof File) ||
    (
      object &&
      (typeof object.stream === 'function' ||
      typeof object.arrayBuffer === 'function') &&
      object[Symbol.toStringTag] === 'File'
    )
  )
}

module.exports = { FileLike, isFileLike }
