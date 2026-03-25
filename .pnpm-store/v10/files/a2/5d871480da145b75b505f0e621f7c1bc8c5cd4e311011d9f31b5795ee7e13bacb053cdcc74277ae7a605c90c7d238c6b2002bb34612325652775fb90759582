'use strict';

var binary = require('./binary-ac8e39e2.cjs');
var math = require('./math-96d5e8c4.cjs');
var number = require('./number-1fb57bba.cjs');
var string = require('./string-fddc5f8b.cjs');
var error = require('./error-0c1f634f.cjs');
var encoding = require('./encoding-1a745c43.cjs');

/**
 * Efficient schema-less binary decoding with support for variable length encoding.
 *
 * Use [lib0/decoding] with [lib0/encoding]. Every encoding function has a corresponding decoding function.
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
 * @module decoding
 */

const errorUnexpectedEndOfArray = error.create('Unexpected end of array');
const errorIntegerOutOfRange = error.create('Integer out of Range');

/**
 * A Decoder handles the decoding of an Uint8Array.
 * @template {ArrayBufferLike} [Buf=ArrayBufferLike]
 */
class Decoder {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor (uint8Array) {
    /**
     * Decoding target.
     *
     * @type {Uint8Array<Buf>}
     */
    this.arr = uint8Array;
    /**
     * Current decoding position.
     *
     * @type {number}
     */
    this.pos = 0;
  }
}

/**
 * @function
 * @template {ArrayBufferLike} Buf
 * @param {Uint8Array<Buf>} uint8Array
 * @return {Decoder<Buf>}
 */
const createDecoder = uint8Array => new Decoder(uint8Array);

/**
 * @function
 * @param {Decoder} decoder
 * @return {boolean}
 */
const hasContent = decoder => decoder.pos !== decoder.arr.length;

/**
 * Clone a decoder instance.
 * Optionally set a new position parameter.
 *
 * @function
 * @param {Decoder} decoder The decoder instance
 * @param {number} [newPos] Defaults to current position
 * @return {Decoder} A clone of `decoder`
 */
const clone = (decoder, newPos = decoder.pos) => {
  const _decoder = createDecoder(decoder.arr);
  _decoder.pos = newPos;
  return _decoder
};

/**
 * Create an Uint8Array view of the next `len` bytes and advance the position by `len`.
 *
 * Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
 *            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
 *
 * @function
 * @template {ArrayBufferLike} Buf
 * @param {Decoder<Buf>} decoder The decoder instance
 * @param {number} len The length of bytes to read
 * @return {Uint8Array<Buf>}
 */
const readUint8Array = (decoder, len) => {
  const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
  decoder.pos += len;
  return view
};

/**
 * Read variable length Uint8Array.
 *
 * Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
 *            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
 *
 * @function
 * @template {ArrayBufferLike} Buf
 * @param {Decoder<Buf>} decoder
 * @return {Uint8Array<Buf>}
 */
const readVarUint8Array = decoder => readUint8Array(decoder, readVarUint(decoder));

/**
 * Read the rest of the content as an ArrayBuffer
 * @function
 * @param {Decoder} decoder
 * @return {Uint8Array}
 */
const readTailAsUint8Array = decoder => readUint8Array(decoder, decoder.arr.length - decoder.pos);

/**
 * Skip one byte, jump to the next position.
 * @function
 * @param {Decoder} decoder The decoder instance
 * @return {number} The next position
 */
const skip8 = decoder => decoder.pos++;

/**
 * Read one byte as unsigned integer.
 * @function
 * @param {Decoder} decoder The decoder instance
 * @return {number} Unsigned 8-bit integer
 */
const readUint8 = decoder => decoder.arr[decoder.pos++];

/**
 * Read 2 bytes as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const readUint16 = decoder => {
  const uint =
    decoder.arr[decoder.pos] +
    (decoder.arr[decoder.pos + 1] << 8);
  decoder.pos += 2;
  return uint
};

/**
 * Read 4 bytes as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const readUint32 = decoder => {
  const uint =
    (decoder.arr[decoder.pos] +
    (decoder.arr[decoder.pos + 1] << 8) +
    (decoder.arr[decoder.pos + 2] << 16) +
    (decoder.arr[decoder.pos + 3] << 24)) >>> 0;
  decoder.pos += 4;
  return uint
};

/**
 * Read 4 bytes as unsigned integer in big endian order.
 * (most significant byte first)
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const readUint32BigEndian = decoder => {
  const uint =
    (decoder.arr[decoder.pos + 3] +
    (decoder.arr[decoder.pos + 2] << 8) +
    (decoder.arr[decoder.pos + 1] << 16) +
    (decoder.arr[decoder.pos] << 24)) >>> 0;
  decoder.pos += 4;
  return uint
};

/**
 * Look ahead without incrementing the position
 * to the next byte and read it as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const peekUint8 = decoder => decoder.arr[decoder.pos];

/**
 * Look ahead without incrementing the position
 * to the next byte and read it as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const peekUint16 = decoder =>
  decoder.arr[decoder.pos] +
  (decoder.arr[decoder.pos + 1] << 8);

/**
 * Look ahead without incrementing the position
 * to the next byte and read it as unsigned integer.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.
 */
const peekUint32 = decoder => (
  decoder.arr[decoder.pos] +
  (decoder.arr[decoder.pos + 1] << 8) +
  (decoder.arr[decoder.pos + 2] << 16) +
  (decoder.arr[decoder.pos + 3] << 24)
) >>> 0;

/**
 * Read unsigned integer (32bit) with variable length.
 * 1/8th of the storage is used as encoding overhead.
 *  * numbers < 2^7 is stored in one bytlength
 *  * numbers < 2^14 is stored in two bylength
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.length
 */
const readVarUint = decoder => {
  let num = 0;
  let mult = 1;
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    const r = decoder.arr[decoder.pos++];
    // num = num | ((r & binary.BITS7) << len)
    num = num + (r & binary.BITS7) * mult; // shift $r << (7*#iterations) and add it to num
    mult *= 128; // next iteration, shift 7 "more" to the left
    if (r < binary.BIT8) {
      return num
    }
    /* c8 ignore start */
    if (num > number.MAX_SAFE_INTEGER) {
      throw errorIntegerOutOfRange
    }
    /* c8 ignore stop */
  }
  throw errorUnexpectedEndOfArray
};

/**
 * Read signed integer (32bit) with variable length.
 * 1/8th of the storage is used as encoding overhead.
 *  * numbers < 2^7 is stored in one bytlength
 *  * numbers < 2^14 is stored in two bylength
 * @todo This should probably create the inverse ~num if number is negative - but this would be a breaking change.
 *
 * @function
 * @param {Decoder} decoder
 * @return {number} An unsigned integer.length
 */
const readVarInt = decoder => {
  let r = decoder.arr[decoder.pos++];
  let num = r & binary.BITS6;
  let mult = 64;
  const sign = (r & binary.BIT7) > 0 ? -1 : 1;
  if ((r & binary.BIT8) === 0) {
    // don't continue reading
    return sign * num
  }
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    r = decoder.arr[decoder.pos++];
    // num = num | ((r & binary.BITS7) << len)
    num = num + (r & binary.BITS7) * mult;
    mult *= 128;
    if (r < binary.BIT8) {
      return sign * num
    }
    /* c8 ignore start */
    if (num > number.MAX_SAFE_INTEGER) {
      throw errorIntegerOutOfRange
    }
    /* c8 ignore stop */
  }
  throw errorUnexpectedEndOfArray
};

/**
 * Look ahead and read varUint without incrementing position
 *
 * @function
 * @param {Decoder} decoder
 * @return {number}
 */
const peekVarUint = decoder => {
  const pos = decoder.pos;
  const s = readVarUint(decoder);
  decoder.pos = pos;
  return s
};

/**
 * Look ahead and read varUint without incrementing position
 *
 * @function
 * @param {Decoder} decoder
 * @return {number}
 */
const peekVarInt = decoder => {
  const pos = decoder.pos;
  const s = readVarInt(decoder);
  decoder.pos = pos;
  return s
};

/**
 * We don't test this function anymore as we use native decoding/encoding by default now.
 * Better not modify this anymore..
 *
 * Transforming utf8 to a string is pretty expensive. The code performs 10x better
 * when String.fromCodePoint is fed with all characters as arguments.
 * But most environments have a maximum number of arguments per functions.
 * For effiency reasons we apply a maximum of 10000 characters at once.
 *
 * @function
 * @param {Decoder} decoder
 * @return {String} The read String.
 */
/* c8 ignore start */
const _readVarStringPolyfill = decoder => {
  let remainingLen = readVarUint(decoder);
  if (remainingLen === 0) {
    return ''
  } else {
    let encodedString = String.fromCodePoint(readUint8(decoder)); // remember to decrease remainingLen
    if (--remainingLen < 100) { // do not create a Uint8Array for small strings
      while (remainingLen--) {
        encodedString += String.fromCodePoint(readUint8(decoder));
      }
    } else {
      while (remainingLen > 0) {
        const nextLen = remainingLen < 10000 ? remainingLen : 10000;
        // this is dangerous, we create a fresh array view from the existing buffer
        const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
        decoder.pos += nextLen;
        // Starting with ES5.1 we can supply a generic array-like object as arguments
        encodedString += String.fromCodePoint.apply(null, /** @type {any} */ (bytes));
        remainingLen -= nextLen;
      }
    }
    return decodeURIComponent(escape(encodedString))
  }
};
/* c8 ignore stop */

/**
 * @function
 * @param {Decoder} decoder
 * @return {String} The read String
 */
const _readVarStringNative = decoder =>
  /** @type any */ (string.utf8TextDecoder).decode(readVarUint8Array(decoder));

/**
 * Read string of variable length
 * * varUint is used to store the length of the string
 *
 * @function
 * @param {Decoder} decoder
 * @return {String} The read String
 *
 */
/* c8 ignore next */
const readVarString = string.utf8TextDecoder ? _readVarStringNative : _readVarStringPolyfill;

/**
 * @param {Decoder} decoder
 * @return {Uint8Array}
 */
const readTerminatedUint8Array = decoder => {
  const encoder = encoding.createEncoder();
  let b;
  while (true) {
    b = readUint8(decoder);
    if (b === 0) {
      return encoding.toUint8Array(encoder)
    }
    if (b === 1) {
      b = readUint8(decoder);
    }
    encoding.write(encoder, b);
  }
};

/**
 * @param {Decoder} decoder
 * @return {string}
 */
const readTerminatedString = decoder => string.decodeUtf8(readTerminatedUint8Array(decoder));

/**
 * Look ahead and read varString without incrementing position
 *
 * @function
 * @param {Decoder} decoder
 * @return {string}
 */
const peekVarString = decoder => {
  const pos = decoder.pos;
  const s = readVarString(decoder);
  decoder.pos = pos;
  return s
};

/**
 * @param {Decoder} decoder
 * @param {number} len
 * @return {DataView}
 */
const readFromDataView = (decoder, len) => {
  const dv = new DataView(decoder.arr.buffer, decoder.arr.byteOffset + decoder.pos, len);
  decoder.pos += len;
  return dv
};

/**
 * @param {Decoder} decoder
 */
const readFloat32 = decoder => readFromDataView(decoder, 4).getFloat32(0, false);

/**
 * @param {Decoder} decoder
 */
const readFloat64 = decoder => readFromDataView(decoder, 8).getFloat64(0, false);

/**
 * @param {Decoder} decoder
 */
const readBigInt64 = decoder => /** @type {any} */ (readFromDataView(decoder, 8)).getBigInt64(0, false);

/**
 * @param {Decoder} decoder
 */
const readBigUint64 = decoder => /** @type {any} */ (readFromDataView(decoder, 8)).getBigUint64(0, false);

/**
 * @type {Array<function(Decoder):any>}
 */
const readAnyLookupTable = [
  decoder => undefined, // CASE 127: undefined
  decoder => null, // CASE 126: null
  readVarInt, // CASE 125: integer
  readFloat32, // CASE 124: float32
  readFloat64, // CASE 123: float64
  readBigInt64, // CASE 122: bigint
  decoder => false, // CASE 121: boolean (false)
  decoder => true, // CASE 120: boolean (true)
  readVarString, // CASE 119: string
  decoder => { // CASE 118: object<string,any>
    const len = readVarUint(decoder);
    /**
     * @type {Object<string,any>}
     */
    const obj = {};
    for (let i = 0; i < len; i++) {
      const key = readVarString(decoder);
      obj[key] = readAny(decoder);
    }
    return obj
  },
  decoder => { // CASE 117: array<any>
    const len = readVarUint(decoder);
    const arr = [];
    for (let i = 0; i < len; i++) {
      arr.push(readAny(decoder));
    }
    return arr
  },
  readVarUint8Array // CASE 116: Uint8Array
];

/**
 * @param {Decoder} decoder
 */
const readAny = decoder => readAnyLookupTable[127 - readUint8(decoder)](decoder);

/**
 * T must not be null.
 *
 * @template T
 */
class RleDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   * @param {function(Decoder):T} reader
   */
  constructor (uint8Array, reader) {
    super(uint8Array);
    /**
     * The reader
     */
    this.reader = reader;
    /**
     * Current state
     * @type {T|null}
     */
    this.s = null;
    this.count = 0;
  }

  read () {
    if (this.count === 0) {
      this.s = this.reader(this);
      if (hasContent(this)) {
        this.count = readVarUint(this) + 1; // see encoder implementation for the reason why this is incremented
      } else {
        this.count = -1; // read the current value forever
      }
    }
    this.count--;
    return /** @type {T} */ (this.s)
  }
}

class IntDiffDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   * @param {number} start
   */
  constructor (uint8Array, start) {
    super(uint8Array);
    /**
     * Current state
     * @type {number}
     */
    this.s = start;
  }

  /**
   * @return {number}
   */
  read () {
    this.s += readVarInt(this);
    return this.s
  }
}

class RleIntDiffDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   * @param {number} start
   */
  constructor (uint8Array, start) {
    super(uint8Array);
    /**
     * Current state
     * @type {number}
     */
    this.s = start;
    this.count = 0;
  }

  /**
   * @return {number}
   */
  read () {
    if (this.count === 0) {
      this.s += readVarInt(this);
      if (hasContent(this)) {
        this.count = readVarUint(this) + 1; // see encoder implementation for the reason why this is incremented
      } else {
        this.count = -1; // read the current value forever
      }
    }
    this.count--;
    return /** @type {number} */ (this.s)
  }
}

class UintOptRleDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor (uint8Array) {
    super(uint8Array);
    /**
     * @type {number}
     */
    this.s = 0;
    this.count = 0;
  }

  read () {
    if (this.count === 0) {
      this.s = readVarInt(this);
      // if the sign is negative, we read the count too, otherwise count is 1
      const isNegative = math.isNegativeZero(this.s);
      this.count = 1;
      if (isNegative) {
        this.s = -this.s;
        this.count = readVarUint(this) + 2;
      }
    }
    this.count--;
    return /** @type {number} */ (this.s)
  }
}

class IncUintOptRleDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor (uint8Array) {
    super(uint8Array);
    /**
     * @type {number}
     */
    this.s = 0;
    this.count = 0;
  }

  read () {
    if (this.count === 0) {
      this.s = readVarInt(this);
      // if the sign is negative, we read the count too, otherwise count is 1
      const isNegative = math.isNegativeZero(this.s);
      this.count = 1;
      if (isNegative) {
        this.s = -this.s;
        this.count = readVarUint(this) + 2;
      }
    }
    this.count--;
    return /** @type {number} */ (this.s++)
  }
}

class IntDiffOptRleDecoder extends Decoder {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor (uint8Array) {
    super(uint8Array);
    /**
     * @type {number}
     */
    this.s = 0;
    this.count = 0;
    this.diff = 0;
  }

  /**
   * @return {number}
   */
  read () {
    if (this.count === 0) {
      const diff = readVarInt(this);
      // if the first bit is set, we read more data
      const hasCount = diff & 1;
      this.diff = math.floor(diff / 2); // shift >> 1
      this.count = 1;
      if (hasCount) {
        this.count = readVarUint(this) + 2;
      }
    }
    this.s += this.diff;
    this.count--;
    return this.s
  }
}

class StringDecoder {
  /**
   * @param {Uint8Array} uint8Array
   */
  constructor (uint8Array) {
    this.decoder = new UintOptRleDecoder(uint8Array);
    this.str = readVarString(this.decoder);
    /**
     * @type {number}
     */
    this.spos = 0;
  }

  /**
   * @return {string}
   */
  read () {
    const end = this.spos + this.decoder.read();
    const res = this.str.slice(this.spos, end);
    this.spos = end;
    return res
  }
}

var decoding = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Decoder: Decoder,
  createDecoder: createDecoder,
  hasContent: hasContent,
  clone: clone,
  readUint8Array: readUint8Array,
  readVarUint8Array: readVarUint8Array,
  readTailAsUint8Array: readTailAsUint8Array,
  skip8: skip8,
  readUint8: readUint8,
  readUint16: readUint16,
  readUint32: readUint32,
  readUint32BigEndian: readUint32BigEndian,
  peekUint8: peekUint8,
  peekUint16: peekUint16,
  peekUint32: peekUint32,
  readVarUint: readVarUint,
  readVarInt: readVarInt,
  peekVarUint: peekVarUint,
  peekVarInt: peekVarInt,
  _readVarStringPolyfill: _readVarStringPolyfill,
  _readVarStringNative: _readVarStringNative,
  readVarString: readVarString,
  readTerminatedUint8Array: readTerminatedUint8Array,
  readTerminatedString: readTerminatedString,
  peekVarString: peekVarString,
  readFromDataView: readFromDataView,
  readFloat32: readFloat32,
  readFloat64: readFloat64,
  readBigInt64: readBigInt64,
  readBigUint64: readBigUint64,
  readAny: readAny,
  RleDecoder: RleDecoder,
  IntDiffDecoder: IntDiffDecoder,
  RleIntDiffDecoder: RleIntDiffDecoder,
  UintOptRleDecoder: UintOptRleDecoder,
  IncUintOptRleDecoder: IncUintOptRleDecoder,
  IntDiffOptRleDecoder: IntDiffOptRleDecoder,
  StringDecoder: StringDecoder
});

exports.Decoder = Decoder;
exports.IncUintOptRleDecoder = IncUintOptRleDecoder;
exports.IntDiffDecoder = IntDiffDecoder;
exports.IntDiffOptRleDecoder = IntDiffOptRleDecoder;
exports.RleDecoder = RleDecoder;
exports.RleIntDiffDecoder = RleIntDiffDecoder;
exports.StringDecoder = StringDecoder;
exports.UintOptRleDecoder = UintOptRleDecoder;
exports._readVarStringNative = _readVarStringNative;
exports._readVarStringPolyfill = _readVarStringPolyfill;
exports.clone = clone;
exports.createDecoder = createDecoder;
exports.decoding = decoding;
exports.hasContent = hasContent;
exports.peekUint16 = peekUint16;
exports.peekUint32 = peekUint32;
exports.peekUint8 = peekUint8;
exports.peekVarInt = peekVarInt;
exports.peekVarString = peekVarString;
exports.peekVarUint = peekVarUint;
exports.readAny = readAny;
exports.readBigInt64 = readBigInt64;
exports.readBigUint64 = readBigUint64;
exports.readFloat32 = readFloat32;
exports.readFloat64 = readFloat64;
exports.readFromDataView = readFromDataView;
exports.readTailAsUint8Array = readTailAsUint8Array;
exports.readTerminatedString = readTerminatedString;
exports.readTerminatedUint8Array = readTerminatedUint8Array;
exports.readUint16 = readUint16;
exports.readUint32 = readUint32;
exports.readUint32BigEndian = readUint32BigEndian;
exports.readUint8 = readUint8;
exports.readUint8Array = readUint8Array;
exports.readVarInt = readVarInt;
exports.readVarString = readVarString;
exports.readVarUint = readVarUint;
exports.readVarUint8Array = readVarUint8Array;
exports.skip8 = skip8;
//# sourceMappingURL=decoding-76e75827.cjs.map
