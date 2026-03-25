/**
 * Efficient schema-less binary encoding with support for variable length encoding.
 *
 * Use [lib0/encoding] with [lib0/decoding]. Every encoding function has a corresponding decoding function.
 *
 * Encodes numbers in little-endian order (least to most significant byte order)
 * and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
 * which is also used in Protocol Buffers.
 *
 * ```js
 * // encoding step
 * const encoder = encoding.createEncoder()
 * encoding.writeVarUint(encoder, 256)
 * encoding.writeVarString(encoder, 'Hello world!')
 * const buf = encoding.toUint8Array(encoder)
 * ```
 *
 * ```js
 * // decoding step
 * const decoder = decoding.createDecoder(buf)
 * decoding.readVarUint(decoder) // => 256
 * decoding.readVarString(decoder) // => 'Hello world!'
 * decoding.hasContent(decoder) // => false - all data is read
 * ```
 *
 * @module encoding
 */

import * as math from './math.js'
import * as number from './number.js'
import * as binary from './binary.js'
import * as string from './string.js'
import * as array from './array.js'

/**
 * A BinaryEncoder handles the encoding to an Uint8Array.
 */
export class Encoder {
  constructor () {
    this.cpos = 0
    this.cbuf = new Uint8Array(100)
    /**
     * @type {Array<Uint8Array>}
     */
    this.bufs = []
  }
}

/**
 * @function
 * @return {Encoder}
 */
export const createEncoder = () => new Encoder()

/**
 * @param {function(Encoder):void} f
 */
export const encode = (f) => {
  const encoder = createEncoder()
  f(encoder)
  return toUint8Array(encoder)
}

/**
 * The current length of the encoded data.
 *
 * @function
 * @param {Encoder} encoder
 * @return {number}
 */
export const length = encoder => {
  let len = encoder.cpos
  for (let i = 0; i < encoder.bufs.length; i++) {
    len += encoder.bufs[i].length
  }
  return len
}

/**
 * Check whether encoder is empty.
 *
 * @function
 * @param {Encoder} encoder
 * @return {boolean}
 */
export const hasContent = encoder => encoder.cpos > 0 || encoder.bufs.length > 0

/**
 * Transform to Uint8Array.
 *
 * @function
 * @param {Encoder} encoder
 * @return {Uint8Array<ArrayBuffer>} The created ArrayBuffer.
 */
export const toUint8Array = encoder => {
  const uint8arr = new Uint8Array(length(encoder))
  let curPos = 0
  for (let i = 0; i < encoder.bufs.length; i++) {
    const d = encoder.bufs[i]
    uint8arr.set(d, curPos)
    curPos += d.length
  }
  uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos)
  return uint8arr
}

/**
 * Verify that it is possible to write `len` bytes wtihout checking. If
 * necessary, a new Buffer with the required length is attached.
 *
 * @param {Encoder} encoder
 * @param {number} len
 */
export const verifyLen = (encoder, len) => {
  const bufferLen = encoder.cbuf.length
  if (bufferLen - encoder.cpos < len) {
    encoder.bufs.push(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos))
    encoder.cbuf = new Uint8Array(math.max(bufferLen, len) * 2)
    encoder.cpos = 0
  }
}

/**
 * Write one byte to the encoder.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The byte that is to be encoded.
 */
export const write = (encoder, num) => {
  const bufferLen = encoder.cbuf.length
  if (encoder.cpos === bufferLen) {
    encoder.bufs.push(encoder.cbuf)
    encoder.cbuf = new Uint8Array(bufferLen * 2)
    encoder.cpos = 0
  }
  encoder.cbuf[encoder.cpos++] = num
}

/**
 * Write one byte at a specific position.
 * Position must already be written (i.e. encoder.length > pos)
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos Position to which to write data
 * @param {number} num Unsigned 8-bit integer
 */
export const set = (encoder, pos, num) => {
  let buffer = null
  // iterate all buffers and adjust position
  for (let i = 0; i < encoder.bufs.length && buffer === null; i++) {
    const b = encoder.bufs[i]
    if (pos < b.length) {
      buffer = b // found buffer
    } else {
      pos -= b.length
    }
  }
  if (buffer === null) {
    // use current buffer
    buffer = encoder.cbuf
  }
  buffer[pos] = num
}

/**
 * Write one byte as an unsigned integer.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeUint8 = write

/**
 * Write one byte as an unsigned Integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
export const setUint8 = set

/**
 * Write two bytes as an unsigned integer.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeUint16 = (encoder, num) => {
  write(encoder, num & binary.BITS8)
  write(encoder, (num >>> 8) & binary.BITS8)
}
/**
 * Write two bytes as an unsigned integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
export const setUint16 = (encoder, pos, num) => {
  set(encoder, pos, num & binary.BITS8)
  set(encoder, pos + 1, (num >>> 8) & binary.BITS8)
}

/**
 * Write two bytes as an unsigned integer
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeUint32 = (encoder, num) => {
  for (let i = 0; i < 4; i++) {
    write(encoder, num & binary.BITS8)
    num >>>= 8
  }
}

/**
 * Write two bytes as an unsigned integer in big endian order.
 * (most significant byte first)
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeUint32BigEndian = (encoder, num) => {
  for (let i = 3; i >= 0; i--) {
    write(encoder, (num >>> (8 * i)) & binary.BITS8)
  }
}

/**
 * Write two bytes as an unsigned integer at a specific location.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} pos The location where the data will be written.
 * @param {number} num The number that is to be encoded.
 */
export const setUint32 = (encoder, pos, num) => {
  for (let i = 0; i < 4; i++) {
    set(encoder, pos + i, num & binary.BITS8)
    num >>>= 8
  }
}

/**
 * Write a variable length unsigned integer. Max encodable integer is 2^53.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeVarUint = (encoder, num) => {
  while (num > binary.BITS7) {
    write(encoder, binary.BIT8 | (binary.BITS7 & num))
    num = math.floor(num / 128) // shift >>> 7
  }
  write(encoder, binary.BITS7 & num)
}

/**
 * Write a variable length integer.
 *
 * We use the 7th bit instead for signaling that this is a negative number.
 *
 * @function
 * @param {Encoder} encoder
 * @param {number} num The number that is to be encoded.
 */
export const writeVarInt = (encoder, num) => {
  const isNegative = math.isNegativeZero(num)
  if (isNegative) {
    num = -num
  }
  //             |- whether to continue reading         |- whether is negative     |- number
  write(encoder, (num > binary.BITS6 ? binary.BIT8 : 0) | (isNegative ? binary.BIT7 : 0) | (binary.BITS6 & num))
  num = math.floor(num / 64) // shift >>> 6
  // We don't need to consider the case of num === 0 so we can use a different
  // pattern here than above.
  while (num > 0) {
    write(encoder, (num > binary.BITS7 ? binary.BIT8 : 0) | (binary.BITS7 & num))
    num = math.floor(num / 128) // shift >>> 7
  }
}

/**
 * A cache to store strings temporarily
 */
const _strBuffer = new Uint8Array(30000)
const _maxStrBSize = _strBuffer.length / 3

/**
 * Write a variable length string.
 *
 * @function
 * @param {Encoder} encoder
 * @param {String} str The string that is to be encoded.
 */
export const _writeVarStringNative = (encoder, str) => {
  if (str.length < _maxStrBSize) {
    // We can encode the string into the existing buffer
    /* c8 ignore next */
    const written = string.utf8TextEncoder.encodeInto(str, _strBuffer).written || 0
    writeVarUint(encoder, written)
    for (let i = 0; i < written; i++) {
      write(encoder, _strBuffer[i])
    }
  } else {
    writeVarUint8Array(encoder, string.encodeUtf8(str))
  }
}

/**
 * Write a variable length string.
 *
 * @function
 * @param {Encoder} encoder
 * @param {String} str The string that is to be encoded.
 */
export const _writeVarStringPolyfill = (encoder, str) => {
  const encodedString = unescape(encodeURIComponent(str))
  const len = encodedString.length
  writeVarUint(encoder, len)
  for (let i = 0; i < len; i++) {
    write(encoder, /** @type {number} */ (encodedString.codePointAt(i)))
  }
}

/**
 * Write a variable length string.
 *
 * @function
 * @param {Encoder} encoder
 * @param {String} str The string that is to be encoded.
 */
/* c8 ignore next */
export const writeVarString = (string.utf8TextEncoder && /** @type {any} */ (string.utf8TextEncoder).encodeInto) ? _writeVarStringNative : _writeVarStringPolyfill

/**
 * Write a string terminated by a special byte sequence. This is not very performant and is
 * generally discouraged. However, the resulting byte arrays are lexiographically ordered which
 * makes this a nice feature for databases.
 *
 * The string will be encoded using utf8 and then terminated and escaped using writeTerminatingUint8Array.
 *
 * @function
 * @param {Encoder} encoder
 * @param {String} str The string that is to be encoded.
 */
export const writeTerminatedString = (encoder, str) =>
  writeTerminatedUint8Array(encoder, string.encodeUtf8(str))

/**
 * Write a terminating Uint8Array. Note that this is not performant and is generally
 * discouraged. There are few situations when this is needed.
 *
 * We use 0x0 as a terminating character. 0x1 serves as an escape character for 0x0 and 0x1.
 *
 * Example: [0,1,2] is encoded to [1,0,1,1,2,0]. 0x0, and 0x1 needed to be escaped using 0x1. Then
 * the result is terminated using the 0x0 character.
 *
 * This is basically how many systems implement null terminated strings. However, we use an escape
 * character 0x1 to avoid issues and potenial attacks on our database (if this is used as a key
 * encoder for NoSql databases).
 *
 * @function
 * @param {Encoder} encoder
 * @param {Uint8Array} buf The string that is to be encoded.
 */
export const writeTerminatedUint8Array = (encoder, buf) => {
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b === 0 || b === 1) {
      write(encoder, 1)
    }
    write(encoder, buf[i])
  }
  write(encoder, 0)
}

/**
 * Write the content of another Encoder.
 *
 * @TODO: can be improved!
 *        - Note: Should consider that when appending a lot of small Encoders, we should rather clone than referencing the old structure.
 *                Encoders start with a rather big initial buffer.
 *
 * @function
 * @param {Encoder} encoder The enUint8Arr
 * @param {Encoder} append The BinaryEncoder to be written.
 */
export const writeBinaryEncoder = (encoder, append) => writeUint8Array(encoder, toUint8Array(append))

/**
 * Append fixed-length Uint8Array to the encoder.
 *
 * @function
 * @param {Encoder} encoder
 * @param {Uint8Array} uint8Array
 */
export const writeUint8Array = (encoder, uint8Array) => {
  const bufferLen = encoder.cbuf.length
  const cpos = encoder.cpos
  const leftCopyLen = math.min(bufferLen - cpos, uint8Array.length)
  const rightCopyLen = uint8Array.length - leftCopyLen
  encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos)
  encoder.cpos += leftCopyLen
  if (rightCopyLen > 0) {
    // Still something to write, write right half..
    // Append new buffer
    encoder.bufs.push(encoder.cbuf)
    // must have at least size of remaining buffer
    encoder.cbuf = new Uint8Array(math.max(bufferLen * 2, rightCopyLen))
    // copy array
    encoder.cbuf.set(uint8Array.subarray(leftCopyLen))
    encoder.cpos = rightCopyLen
  }
}

/**
 * Append an Uint8Array to Encoder.
 *
 * @function
 * @param {Encoder} encoder
 * @param {Uint8Array} uint8Array
 */
export const writeVarUint8Array = (encoder, uint8Array) => {
  writeVarUint(encoder, uint8Array.byteLength)
  writeUint8Array(encoder, uint8Array)
}

/**
 * Create an DataView of the next `len` bytes. Use it to write data after
 * calling this function.
 *
 * ```js
 * // write float32 using DataView
 * const dv = writeOnDataView(encoder, 4)
 * dv.setFloat32(0, 1.1)
 * // read float32 using DataView
 * const dv = readFromDataView(encoder, 4)
 * dv.getFloat32(0) // => 1.100000023841858 (leaving it to the reader to find out why this is the correct result)
 * ```
 *
 * @param {Encoder} encoder
 * @param {number} len
 * @return {DataView}
 */
export const writeOnDataView = (encoder, len) => {
  verifyLen(encoder, len)
  const dview = new DataView(encoder.cbuf.buffer, encoder.cpos, len)
  encoder.cpos += len
  return dview
}

/**
 * @param {Encoder} encoder
 * @param {number} num
 */
export const writeFloat32 = (encoder, num) => writeOnDataView(encoder, 4).setFloat32(0, num, false)

/**
 * @param {Encoder} encoder
 * @param {number} num
 */
export const writeFloat64 = (encoder, num) => writeOnDataView(encoder, 8).setFloat64(0, num, false)

/**
 * @param {Encoder} encoder
 * @param {bigint} num
 */
export const writeBigInt64 = (encoder, num) => /** @type {any} */ (writeOnDataView(encoder, 8)).setBigInt64(0, num, false)

/**
 * @param {Encoder} encoder
 * @param {bigint} num
 */
export const writeBigUint64 = (encoder, num) => /** @type {any} */ (writeOnDataView(encoder, 8)).setBigUint64(0, num, false)

const floatTestBed = new DataView(new ArrayBuffer(4))
/**
 * Check if a number can be encoded as a 32 bit float.
 *
 * @param {number} num
 * @return {boolean}
 */
const isFloat32 = num => {
  floatTestBed.setFloat32(0, num)
  return floatTestBed.getFloat32(0) === num
}

/**
 * @typedef {Array<AnyEncodable>} AnyEncodableArray
 */

/**
 * @typedef {undefined|null|number|bigint|boolean|string|{[k:string]:AnyEncodable}|AnyEncodableArray|Uint8Array} AnyEncodable
 */

/**
 * Encode data with efficient binary format.
 *
 * Differences to JSON:
 * • Transforms data to a binary format (not to a string)
 * • Encodes undefined, NaN, and ArrayBuffer (these can't be represented in JSON)
 * • Numbers are efficiently encoded either as a variable length integer, as a
 *   32 bit float, as a 64 bit float, or as a 64 bit bigint.
 *
 * Encoding table:
 *
 * | Data Type           | Prefix   | Encoding Method    | Comment |
 * | ------------------- | -------- | ------------------ | ------- |
 * | undefined           | 127      |                    | Functions, symbol, and everything that cannot be identified is encoded as undefined |
 * | null                | 126      |                    | |
 * | integer             | 125      | writeVarInt        | Only encodes 32 bit signed integers |
 * | float32             | 124      | writeFloat32       | |
 * | float64             | 123      | writeFloat64       | |
 * | bigint              | 122      | writeBigInt64      | |
 * | boolean (false)     | 121      |                    | True and false are different data types so we save the following byte |
 * | boolean (true)      | 120      |                    | - 0b01111000 so the last bit determines whether true or false |
 * | string              | 119      | writeVarString     | |
 * | object<string,any>  | 118      | custom             | Writes {length} then {length} key-value pairs |
 * | array<any>          | 117      | custom             | Writes {length} then {length} json values |
 * | Uint8Array          | 116      | writeVarUint8Array | We use Uint8Array for any kind of binary data |
 *
 * Reasons for the decreasing prefix:
 * We need the first bit for extendability (later we may want to encode the
 * prefix with writeVarUint). The remaining 7 bits are divided as follows:
 * [0-30]   the beginning of the data range is used for custom purposes
 *          (defined by the function that uses this library)
 * [31-127] the end of the data range is used for data encoding by
 *          lib0/encoding.js
 *
 * @param {Encoder} encoder
 * @param {AnyEncodable} data
 */
export const writeAny = (encoder, data) => {
  switch (typeof data) {
    case 'string':
      // TYPE 119: STRING
      write(encoder, 119)
      writeVarString(encoder, data)
      break
    case 'number':
      if (number.isInteger(data) && math.abs(data) <= binary.BITS31) {
        // TYPE 125: INTEGER
        write(encoder, 125)
        writeVarInt(encoder, data)
      } else if (isFloat32(data)) {
        // TYPE 124: FLOAT32
        write(encoder, 124)
        writeFloat32(encoder, data)
      } else {
        // TYPE 123: FLOAT64
        write(encoder, 123)
        writeFloat64(encoder, data)
      }
      break
    case 'bigint':
      // TYPE 122: BigInt
      write(encoder, 122)
      writeBigInt64(encoder, data)
      break
    case 'object':
      if (data === null) {
        // TYPE 126: null
        write(encoder, 126)
      } else if (array.isArray(data)) {
        // TYPE 117: Array
        write(encoder, 117)
        writeVarUint(encoder, data.length)
        for (let i = 0; i < data.length; i++) {
          writeAny(encoder, data[i])
        }
      } else if (data instanceof Uint8Array) {
        // TYPE 116: ArrayBuffer
        write(encoder, 116)
        writeVarUint8Array(encoder, data)
      } else {
        // TYPE 118: Object
        write(encoder, 118)
        const keys = Object.keys(data)
        writeVarUint(encoder, keys.length)
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          writeVarString(encoder, key)
          writeAny(encoder, data[key])
        }
      }
      break
    case 'boolean':
      // TYPE 120/121: boolean (true/false)
      write(encoder, data ? 120 : 121)
      break
    default:
      // TYPE 127: undefined
      write(encoder, 127)
  }
}

/**
 * Now come a few stateful encoder that have their own classes.
 */

/**
 * Basic Run Length Encoder - a basic compression implementation.
 *
 * Encodes [1,1,1,7] to [1,3,7,1] (3 times 1, 1 time 7). This encoder might do more harm than good if there are a lot of values that are not repeated.
 *
 * It was originally used for image compression. Cool .. article http://csbruce.com/cbm/transactor/pdfs/trans_v7_i06.pdf
 *
 * @note T must not be null!
 *
 * @template T
 */
export class RleEncoder extends Encoder {
  /**
   * @param {function(Encoder, T):void} writer
   */
  constructor (writer) {
    super()
    /**
     * The writer
     */
    this.w = writer
    /**
     * Current state
     * @type {T|null}
     */
    this.s = null
    this.count = 0
  }

  /**
   * @param {T} v
   */
  write (v) {
    if (this.s === v) {
      this.count++
    } else {
      if (this.count > 0) {
        // flush counter, unless this is the first value (count = 0)
        writeVarUint(this, this.count - 1) // since count is always > 0, we can decrement by one. non-standard encoding ftw
      }
      this.count = 1
      // write first value
      this.w(this, v)
      this.s = v
    }
  }
}

/**
 * Basic diff decoder using variable length encoding.
 *
 * Encodes the values [3, 1100, 1101, 1050, 0] to [3, 1097, 1, -51, -1050] using writeVarInt.
 */
export class IntDiffEncoder extends Encoder {
  /**
   * @param {number} start
   */
  constructor (start) {
    super()
    /**
     * Current state
     * @type {number}
     */
    this.s = start
  }

  /**
   * @param {number} v
   */
  write (v) {
    writeVarInt(this, v - this.s)
    this.s = v
  }
}

/**
 * A combination of IntDiffEncoder and RleEncoder.
 *
 * Basically first writes the IntDiffEncoder and then counts duplicate diffs using RleEncoding.
 *
 * Encodes the values [1,1,1,2,3,4,5,6] as [1,1,0,2,1,5] (RLE([1,0,0,1,1,1,1,1]) ⇒ RleIntDiff[1,1,0,2,1,5])
 */
export class RleIntDiffEncoder extends Encoder {
  /**
   * @param {number} start
   */
  constructor (start) {
    super()
    /**
     * Current state
     * @type {number}
     */
    this.s = start
    this.count = 0
  }

  /**
   * @param {number} v
   */
  write (v) {
    if (this.s === v && this.count > 0) {
      this.count++
    } else {
      if (this.count > 0) {
        // flush counter, unless this is the first value (count = 0)
        writeVarUint(this, this.count - 1) // since count is always > 0, we can decrement by one. non-standard encoding ftw
      }
      this.count = 1
      // write first value
      writeVarInt(this, v - this.s)
      this.s = v
    }
  }
}

/**
 * @param {UintOptRleEncoder} encoder
 */
const flushUintOptRleEncoder = encoder => {
  if (encoder.count > 0) {
    // flush counter, unless this is the first value (count = 0)
    // case 1: just a single value. set sign to positive
    // case 2: write several values. set sign to negative to indicate that there is a length coming
    writeVarInt(encoder.encoder, encoder.count === 1 ? encoder.s : -encoder.s)
    if (encoder.count > 1) {
      writeVarUint(encoder.encoder, encoder.count - 2) // since count is always > 1, we can decrement by one. non-standard encoding ftw
    }
  }
}

/**
 * Optimized Rle encoder that does not suffer from the mentioned problem of the basic Rle encoder.
 *
 * Internally uses VarInt encoder to write unsigned integers. If the input occurs multiple times, we write
 * write it as a negative number. The UintOptRleDecoder then understands that it needs to read a count.
 *
 * Encodes [1,2,3,3,3] as [1,2,-3,3] (once 1, once 2, three times 3)
 */
export class UintOptRleEncoder {
  constructor () {
    this.encoder = new Encoder()
    /**
     * @type {number}
     */
    this.s = 0
    this.count = 0
  }

  /**
   * @param {number} v
   */
  write (v) {
    if (this.s === v) {
      this.count++
    } else {
      flushUintOptRleEncoder(this)
      this.count = 1
      this.s = v
    }
  }

  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array () {
    flushUintOptRleEncoder(this)
    return toUint8Array(this.encoder)
  }
}

/**
 * Increasing Uint Optimized RLE Encoder
 *
 * The RLE encoder counts the number of same occurences of the same value.
 * The IncUintOptRle encoder counts if the value increases.
 * I.e. 7, 8, 9, 10 will be encoded as [-7, 4]. 1, 3, 5 will be encoded
 * as [1, 3, 5].
 */
export class IncUintOptRleEncoder {
  constructor () {
    this.encoder = new Encoder()
    /**
     * @type {number}
     */
    this.s = 0
    this.count = 0
  }

  /**
   * @param {number} v
   */
  write (v) {
    if (this.s + this.count === v) {
      this.count++
    } else {
      flushUintOptRleEncoder(this)
      this.count = 1
      this.s = v
    }
  }

  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array () {
    flushUintOptRleEncoder(this)
    return toUint8Array(this.encoder)
  }
}

/**
 * @param {IntDiffOptRleEncoder} encoder
 */
const flushIntDiffOptRleEncoder = encoder => {
  if (encoder.count > 0) {
    //          31 bit making up the diff | wether to write the counter
    // const encodedDiff = encoder.diff << 1 | (encoder.count === 1 ? 0 : 1)
    const encodedDiff = encoder.diff * 2 + (encoder.count === 1 ? 0 : 1)
    // flush counter, unless this is the first value (count = 0)
    // case 1: just a single value. set first bit to positive
    // case 2: write several values. set first bit to negative to indicate that there is a length coming
    writeVarInt(encoder.encoder, encodedDiff)
    if (encoder.count > 1) {
      writeVarUint(encoder.encoder, encoder.count - 2) // since count is always > 1, we can decrement by one. non-standard encoding ftw
    }
  }
}

/**
 * A combination of the IntDiffEncoder and the UintOptRleEncoder.
 *
 * The count approach is similar to the UintDiffOptRleEncoder, but instead of using the negative bitflag, it encodes
 * in the LSB whether a count is to be read. Therefore this Encoder only supports 31 bit integers!
 *
 * Encodes [1, 2, 3, 2] as [3, 1, 6, -1] (more specifically [(1 << 1) | 1, (3 << 0) | 0, -1])
 *
 * Internally uses variable length encoding. Contrary to normal UintVar encoding, the first byte contains:
 * * 1 bit that denotes whether the next value is a count (LSB)
 * * 1 bit that denotes whether this value is negative (MSB - 1)
 * * 1 bit that denotes whether to continue reading the variable length integer (MSB)
 *
 * Therefore, only five bits remain to encode diff ranges.
 *
 * Use this Encoder only when appropriate. In most cases, this is probably a bad idea.
 */
export class IntDiffOptRleEncoder {
  constructor () {
    this.encoder = new Encoder()
    /**
     * @type {number}
     */
    this.s = 0
    this.count = 0
    this.diff = 0
  }

  /**
   * @param {number} v
   */
  write (v) {
    if (this.diff === v - this.s) {
      this.s = v
      this.count++
    } else {
      flushIntDiffOptRleEncoder(this)
      this.count = 1
      this.diff = v - this.s
      this.s = v
    }
  }

  /**
   * Flush the encoded state and transform this to a Uint8Array.
   *
   * Note that this should only be called once.
   */
  toUint8Array () {
    flushIntDiffOptRleEncoder(this)
    return toUint8Array(this.encoder)
  }
}

/**
 * Optimized String Encoder.
 *
 * Encoding many small strings in a simple Encoder is not very efficient. The function call to decode a string takes some time and creates references that must be eventually deleted.
 * In practice, when decoding several million small strings, the GC will kick in more and more often to collect orphaned string objects (or maybe there is another reason?).
 *
 * This string encoder solves the above problem. All strings are concatenated and written as a single string using a single encoding call.
 *
 * The lengths are encoded using a UintOptRleEncoder.
 */
export class StringEncoder {
  constructor () {
    /**
     * @type {Array<string>}
     */
    this.sarr = []
    this.s = ''
    this.lensE = new UintOptRleEncoder()
  }

  /**
   * @param {string} string
   */
  write (string) {
    this.s += string
    if (this.s.length > 19) {
      this.sarr.push(this.s)
      this.s = ''
    }
    this.lensE.write(string.length)
  }

  toUint8Array () {
    const encoder = new Encoder()
    this.sarr.push(this.s)
    this.s = ''
    writeVarString(encoder, this.sarr.join(''))
    writeUint8Array(encoder, this.lensE.toUint8Array())
    return toUint8Array(encoder)
  }
}
