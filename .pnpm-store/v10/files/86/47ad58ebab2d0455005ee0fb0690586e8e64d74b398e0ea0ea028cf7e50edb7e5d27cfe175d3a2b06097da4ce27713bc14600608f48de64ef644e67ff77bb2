const Long = require('../utils/long')

const INT8_SIZE = 1
const INT16_SIZE = 2
const INT32_SIZE = 4
const INT64_SIZE = 8
const DOUBLE_SIZE = 8

const MOST_SIGNIFICANT_BIT = 0x80 // 128
const OTHER_BITS = 0x7f // 127
const UNSIGNED_INT32_MAX_NUMBER = 0xffffff80
const UNSIGNED_INT64_MAX_NUMBER = 0xffffffffffffff80n

module.exports = class Encoder {
  static encodeZigZag(value) {
    return (value << 1) ^ (value >> 31)
  }

  static encodeZigZag64(value) {
    const longValue = Long.fromValue(value)
    return longValue.shiftLeft(1).xor(longValue.shiftRight(63))
  }

  static sizeOfVarInt(value) {
    let encodedValue = this.encodeZigZag(value)
    let bytes = 1

    while ((encodedValue & UNSIGNED_INT32_MAX_NUMBER) !== 0) {
      bytes += 1
      encodedValue >>>= 7
    }

    return bytes
  }

  static sizeOfVarLong(value) {
    let longValue = Encoder.encodeZigZag64(value)
    let bytes = 1

    while (longValue.and(UNSIGNED_INT64_MAX_NUMBER).notEquals(Long.fromInt(0))) {
      bytes += 1
      longValue = longValue.shiftRightUnsigned(7)
    }

    return bytes
  }

  static sizeOfVarIntBytes(value) {
    const size = value == null ? -1 : Buffer.byteLength(value)

    if (size < 0) {
      return Encoder.sizeOfVarInt(-1)
    }

    return Encoder.sizeOfVarInt(size) + size
  }

  static nextPowerOfTwo(value) {
    return 1 << (31 - Math.clz32(value) + 1)
  }

  /**
   * Construct a new encoder with the given initial size
   *
   * @param {number} [initialSize] initial size
   */
  constructor(initialSize = 511) {
    this.buf = Buffer.alloc(Encoder.nextPowerOfTwo(initialSize))
    this.offset = 0
  }

  /**
   * @param {Buffer} buffer
   */
  writeBufferInternal(buffer) {
    const bufferLength = buffer.length
    this.ensureAvailable(bufferLength)
    buffer.copy(this.buf, this.offset, 0)
    this.offset += bufferLength
  }

  ensureAvailable(length) {
    if (this.offset + length > this.buf.length) {
      const newLength = Encoder.nextPowerOfTwo(this.offset + length)
      const newBuffer = Buffer.alloc(newLength)
      this.buf.copy(newBuffer, 0, 0, this.offset)
      this.buf = newBuffer
    }
  }

  get buffer() {
    return this.buf.slice(0, this.offset)
  }

  writeInt8(value) {
    this.ensureAvailable(INT8_SIZE)
    this.buf.writeInt8(value, this.offset)
    this.offset += INT8_SIZE
    return this
  }

  writeInt16(value) {
    this.ensureAvailable(INT16_SIZE)
    this.buf.writeInt16BE(value, this.offset)
    this.offset += INT16_SIZE
    return this
  }

  writeInt32(value) {
    this.ensureAvailable(INT32_SIZE)
    this.buf.writeInt32BE(value, this.offset)
    this.offset += INT32_SIZE
    return this
  }

  writeUInt32(value) {
    this.ensureAvailable(INT32_SIZE)
    this.buf.writeUInt32BE(value, this.offset)
    this.offset += INT32_SIZE
    return this
  }

  writeInt64(value) {
    this.ensureAvailable(INT64_SIZE)
    const longValue = Long.fromValue(value)
    this.buf.writeInt32BE(longValue.getHighBits(), this.offset)
    this.buf.writeInt32BE(longValue.getLowBits(), this.offset + INT32_SIZE)
    this.offset += INT64_SIZE
    return this
  }

  writeDouble(value) {
    this.ensureAvailable(DOUBLE_SIZE)
    this.buf.writeDoubleBE(value, this.offset)
    this.offset += DOUBLE_SIZE
    return this
  }

  writeBoolean(value) {
    value ? this.writeInt8(1) : this.writeInt8(0)
    return this
  }

  writeString(value) {
    if (value == null) {
      this.writeInt16(-1)
      return this
    }

    const byteLength = Buffer.byteLength(value, 'utf8')
    this.ensureAvailable(INT16_SIZE + byteLength)
    this.writeInt16(byteLength)
    this.buf.write(value, this.offset, byteLength, 'utf8')
    this.offset += byteLength
    return this
  }

  writeVarIntString(value) {
    if (value == null) {
      this.writeVarInt(-1)
      return this
    }

    const byteLength = Buffer.byteLength(value, 'utf8')
    this.writeVarInt(byteLength)
    this.ensureAvailable(byteLength)
    this.buf.write(value, this.offset, byteLength, 'utf8')
    this.offset += byteLength
    return this
  }

  writeUVarIntString(value) {
    if (value == null) {
      this.writeUVarInt(0)
      return this
    }

    const byteLength = Buffer.byteLength(value, 'utf8')
    this.writeUVarInt(byteLength + 1)
    this.ensureAvailable(byteLength)
    this.buf.write(value, this.offset, byteLength, 'utf8')
    this.offset += byteLength
    return this
  }

  writeBytes(value) {
    if (value == null) {
      this.writeInt32(-1)
      return this
    }

    if (Buffer.isBuffer(value)) {
      // raw bytes
      this.ensureAvailable(INT32_SIZE + value.length)
      this.writeInt32(value.length)
      this.writeBufferInternal(value)
    } else {
      const valueToWrite = String(value)
      const byteLength = Buffer.byteLength(valueToWrite, 'utf8')
      this.ensureAvailable(INT32_SIZE + byteLength)
      this.writeInt32(byteLength)
      this.buf.write(valueToWrite, this.offset, byteLength, 'utf8')
      this.offset += byteLength
    }

    return this
  }

  writeVarIntBytes(value) {
    if (value == null) {
      this.writeVarInt(-1)
      return this
    }

    if (Buffer.isBuffer(value)) {
      // raw bytes
      this.writeVarInt(value.length)
      this.writeBufferInternal(value)
    } else {
      const valueToWrite = String(value)
      const byteLength = Buffer.byteLength(valueToWrite, 'utf8')
      this.writeVarInt(byteLength)
      this.ensureAvailable(byteLength)
      this.buf.write(valueToWrite, this.offset, byteLength, 'utf8')
      this.offset += byteLength
    }

    return this
  }

  writeUVarIntBytes(value) {
    if (value == null) {
      this.writeVarInt(0)
      return this
    }

    if (Buffer.isBuffer(value)) {
      // raw bytes
      this.writeUVarInt(value.length + 1)
      this.writeBufferInternal(value)
    } else {
      const valueToWrite = String(value)
      const byteLength = Buffer.byteLength(valueToWrite, 'utf8')
      this.writeUVarInt(byteLength + 1)
      this.ensureAvailable(byteLength)
      this.buf.write(valueToWrite, this.offset, byteLength, 'utf8')
      this.offset += byteLength
    }

    return this
  }

  writeEncoder(value) {
    if (value == null || !Buffer.isBuffer(value.buf)) {
      throw new Error('value should be an instance of Encoder')
    }

    this.writeBufferInternal(value.buffer)
    return this
  }

  writeEncoderArray(value) {
    if (!Array.isArray(value) || value.some(v => v == null || !Buffer.isBuffer(v.buf))) {
      throw new Error('all values should be an instance of Encoder[]')
    }

    value.forEach(v => {
      this.writeBufferInternal(v.buffer)
    })
    return this
  }

  writeBuffer(value) {
    if (!Buffer.isBuffer(value)) {
      throw new Error('value should be an instance of Buffer')
    }

    this.writeBufferInternal(value)
    return this
  }

  /**
   * @param {any[]} array
   * @param {'int32'|'number'|'string'|'object'} [type]
   */
  writeNullableArray(array, type) {
    // A null value is encoded with length of -1 and there are no following bytes
    // On the context of this library, empty array and null are the same thing
    const length = array.length !== 0 ? array.length : -1
    this.writeArray(array, type, length)
    return this
  }

  /**
   * @param {any[]} array
   * @param {'int32'|'number'|'string'|'object'} [type]
   * @param {number} [length]
   */
  writeArray(array, type, length) {
    const arrayLength = length == null ? array.length : length
    this.writeInt32(arrayLength)
    if (type !== undefined) {
      switch (type) {
        case 'int32':
        case 'number':
          array.forEach(value => this.writeInt32(value))
          break
        case 'string':
          array.forEach(value => this.writeString(value))
          break
        case 'object':
          this.writeEncoderArray(array)
          break
      }
    } else {
      array.forEach(value => {
        switch (typeof value) {
          case 'number':
            this.writeInt32(value)
            break
          case 'string':
            this.writeString(value)
            break
          case 'object':
            this.writeEncoder(value)
            break
        }
      })
    }
    return this
  }

  writeVarIntArray(array, type) {
    if (type === 'object') {
      this.writeVarInt(array.length)
      this.writeEncoderArray(array)
    } else {
      const objectArray = array.filter(v => typeof v === 'object')
      this.writeVarInt(objectArray.length)
      this.writeEncoderArray(objectArray)
    }
    return this
  }

  writeUVarIntArray(array, type) {
    if (type === 'object') {
      this.writeUVarInt(array.length + 1)
      this.writeEncoderArray(array)
    } else if (array === null) {
      this.writeUVarInt(0)
    } else {
      const objectArray = array.filter(v => typeof v === 'object')
      this.writeUVarInt(objectArray.length + 1)
      this.writeEncoderArray(objectArray)
    }
    return this
  }

  // Based on:
  // https://en.wikipedia.org/wiki/LEB128 Using LEB128 format similar to VLQ.
  // https://github.com/addthis/stream-lib/blob/master/src/main/java/com/clearspring/analytics/util/Varint.java#L106
  writeVarInt(value) {
    return this.writeUVarInt(Encoder.encodeZigZag(value))
  }

  writeUVarInt(value) {
    const byteArray = []
    while ((value & UNSIGNED_INT32_MAX_NUMBER) !== 0) {
      byteArray.push((value & OTHER_BITS) | MOST_SIGNIFICANT_BIT)
      value >>>= 7
    }
    byteArray.push(value & OTHER_BITS)
    this.writeBufferInternal(Buffer.from(byteArray))
    return this
  }

  writeVarLong(value) {
    const byteArray = []
    let longValue = Encoder.encodeZigZag64(value)

    while (longValue.and(UNSIGNED_INT64_MAX_NUMBER).notEquals(Long.fromInt(0))) {
      byteArray.push(
        longValue
          .and(OTHER_BITS)
          .or(MOST_SIGNIFICANT_BIT)
          .toInt()
      )
      longValue = longValue.shiftRightUnsigned(7)
    }

    byteArray.push(longValue.toInt())

    this.writeBufferInternal(Buffer.from(byteArray))
    return this
  }

  size() {
    // We can use the offset here directly, because we anyways will not re-encode the buffer when writing
    return this.offset
  }

  toJSON() {
    return this.buffer.toJSON()
  }
}
