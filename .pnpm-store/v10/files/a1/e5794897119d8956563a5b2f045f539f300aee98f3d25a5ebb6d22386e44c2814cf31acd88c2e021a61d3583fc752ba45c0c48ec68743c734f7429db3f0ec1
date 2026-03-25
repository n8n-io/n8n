'use strict'
const Minipass = require('minipass')
const TYPE = Symbol('type')
const BUFFER = Symbol('buffer')

class Blob {
  constructor (blobParts, options) {
    this[TYPE] = ''

    const buffers = []
    let size = 0

    if (blobParts) {
      const a = blobParts
      const length = Number(a.length)
      for (let i = 0; i < length; i++) {
        const element = a[i]
        const buffer = element instanceof Buffer ? element
          : ArrayBuffer.isView(element)
            ? Buffer.from(element.buffer, element.byteOffset, element.byteLength)
          : element instanceof ArrayBuffer ? Buffer.from(element)
          : element instanceof Blob ? element[BUFFER]
          : typeof element === 'string' ? Buffer.from(element)
          : Buffer.from(String(element))
        size += buffer.length
        buffers.push(buffer)
      }
    }

    this[BUFFER] = Buffer.concat(buffers, size)

    const type = options && options.type !== undefined
      && String(options.type).toLowerCase()
    if (type && !/[^\u0020-\u007E]/.test(type)) {
      this[TYPE] = type
    }
  }

  get size () {
    return this[BUFFER].length
  }

  get type () {
    return this[TYPE]
  }

  text () {
    return Promise.resolve(this[BUFFER].toString())
  }

  arrayBuffer () {
    const buf = this[BUFFER]
    const off = buf.byteOffset
    const len = buf.byteLength
    const ab = buf.buffer.slice(off, off + len)
    return Promise.resolve(ab)
  }

  stream () {
    return new Minipass().end(this[BUFFER])
  }

  slice (start, end, type) {
    const size = this.size
    const relativeStart = start === undefined ? 0
      : start < 0 ? Math.max(size + start, 0)
      : Math.min(start, size)
    const relativeEnd = end === undefined ? size
      : end < 0 ? Math.max(size + end, 0)
      : Math.min(end, size)
    const span = Math.max(relativeEnd - relativeStart, 0)

    const buffer = this[BUFFER]
    const slicedBuffer = buffer.slice(
      relativeStart,
      relativeStart + span
    )
    const blob = new Blob([], { type })
    blob[BUFFER] = slicedBuffer
    return blob
  }

  get [Symbol.toStringTag] () {
    return 'Blob'
  }

  static get BUFFER () {
    return BUFFER
  }
}

Object.defineProperties(Blob.prototype, {
  size: { enumerable: true },
  type: { enumerable: true },
})

module.exports = Blob
