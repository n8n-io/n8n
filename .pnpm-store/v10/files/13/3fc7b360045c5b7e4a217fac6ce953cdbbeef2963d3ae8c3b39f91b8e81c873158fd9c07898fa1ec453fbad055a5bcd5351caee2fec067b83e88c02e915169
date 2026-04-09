export type BufferListAcceptedTypes =
  | Buffer
  | BufferList
  | Uint8Array
  | BufferListAcceptedTypes[]
  | string
  | number;

export interface BufferListConstructor {
  new (initData?: BufferListAcceptedTypes): BufferList;
  (initData?: BufferListAcceptedTypes): BufferList;

  /**
   * Determines if the passed object is a BufferList. It will return true
   * if the passed object is an instance of BufferList or BufferListStream
   * and false otherwise.
   *
   * N.B. this won't return true for BufferList or BufferListStream instances
   * created by versions of this library before this static method was added.
   *
   * @param other
   */

  isBufferList(other: unknown): boolean;
}

interface BufferList {
  prototype: Object

  /**
   * Get the length of the list in bytes. This is the sum of the lengths
   * of all of the buffers contained in the list, minus any initial offset
   * for a semi-consumed buffer at the beginning. Should accurately
   * represent the total number of bytes that can be read from the list.
   */

  length: number;

  /**
   * Adds an additional buffer or BufferList to the internal list.
   * this is returned so it can be chained.
   *
   * @param buffer
   */

  append(buffer: BufferListAcceptedTypes): this;

  /**
   * Adds an additional buffer or BufferList at the beginning of the internal list.
   * this is returned so it can be chained.
   *
   * @param buffer
   */
  prepend(buffer: BufferListAcceptedTypes): this;

  /**
   * Will return the byte at the specified index.
   * @param index
   */

  get(index: number): number;

  /**
   * Returns a new Buffer object containing the bytes within the
   * range specified. Both start and end are optional and will
   * default to the beginning and end of the list respectively.
   *
   * If the requested range spans a single internal buffer then a
   * slice of that buffer will be returned which shares the original
   * memory range of that Buffer. If the range spans multiple buffers
   * then copy operations will likely occur to give you a uniform Buffer.
   *
   * @param start
   * @param end
   */

  slice(start?: number, end?: number): Buffer;

  /**
   * Returns a new BufferList object containing the bytes within the
   * range specified. Both start and end are optional and will default
   * to the beginning and end of the list respectively.
   *
   * No copies will be performed. All buffers in the result share
   * memory with the original list.
   *
   * @param start
   * @param end
   */

  shallowSlice(start?: number, end?: number): this;

  /**
   * Copies the content of the list in the `dest` buffer, starting from
   * `destStart` and containing the bytes within the range specified
   * with `srcStart` to `srcEnd`.
   *
   * `destStart`, `start` and `end` are optional and will default to the
   * beginning of the dest buffer, and the beginning and end of the
   * list respectively.
   *
   * @param dest
   * @param destStart
   * @param srcStart
   * @param srcEnd
   */

  copy(
    dest: Buffer,
    destStart?: number,
    srcStart?: number,
    srcEnd?: number
  ): Buffer;

  /**
   * Performs a shallow-copy of the list. The internal Buffers remains the
   * same, so if you change the underlying Buffers, the change will be
   * reflected in both the original and the duplicate.
   *
   * This method is needed if you want to call consume() or pipe() and
   * still keep the original list.
   *
   * @example
   *
   * ```js
   * var bl = new BufferListStream();
   * bl.append('hello');
   * bl.append(' world');
   * bl.append('\n');
   * bl.duplicate().pipe(process.stdout, { end: false });
   *
   * console.log(bl.toString())
   * ```
   */

  duplicate(): this;

  /**
   * Will shift bytes off the start of the list. The number of bytes
   * consumed don't need to line up with the sizes of the internal
   * Buffers—initial offsets will be calculated accordingly in order
   * to give you a consistent view of the data.
   *
   * @param bytes
   */

  consume(bytes?: number): void;

  /**
   * Will return a string representation of the buffer. The optional
   * `start` and `end` arguments are passed on to `slice()`, while
   * the encoding is passed on to `toString()` of the resulting Buffer.
   *
   * See the [`Buffer#toString()`](http://nodejs.org/docs/latest/api/buffer.html#buffer_buf_tostring_encoding_start_end)
   * documentation for more information.
   *
   * @param encoding
   * @param start
   * @param end
   */

  toString(encoding?: string, start?: number, end?: number): string;

  /**
   * Will return the byte at the specified index. indexOf() method
   * returns the first index at which a given element can be found
   * in the BufferList, or -1 if it is not present.
   *
   * @param value
   * @param byteOffset
   * @param encoding
   */

  indexOf(
    value: string | number | Uint8Array | BufferList | Buffer,
    byteOffset?: number,
    encoding?: string
  ): number;

  /**
   * Will return the internal list of buffers.
   */
  getBuffers(): Buffer[];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readDoubleBE: Buffer['readDoubleBE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readDoubleLE: Buffer['readDoubleLE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readFloatBE: Buffer['readFloatBE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readFloatLE: Buffer['readFloatLE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readBigInt64BE: Buffer['readBigInt64BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readBigInt64LE: Buffer['readBigInt64LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readBigUInt64BE: Buffer['readBigUInt64BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readBigUInt64LE: Buffer['readBigUInt64LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readInt32BE: Buffer['readInt32BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readInt32LE: Buffer['readInt32LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readUInt32BE: Buffer['readUInt32BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readUInt32LE: Buffer['readUInt32LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are implemented and will operate across internal Buffer boundaries transparently.
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html) documentation for how these work.
   *
   * @param offset
   */

  readInt16BE: Buffer['readInt16BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readInt16LE: Buffer['readInt16LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readUInt16BE: Buffer['readUInt16BE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readUInt16LE: Buffer['readUInt16LE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readInt8: Buffer['readInt8'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readUInt8: Buffer['readUInt8'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readIntBE: Buffer['readIntBE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readIntLE: Buffer['readIntLE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readUIntBE: Buffer['readUIntBE'];

  /**
   * All of the standard byte-reading methods of the Buffer interface are
   * implemented and will operate across internal Buffer boundaries transparently.
   *
   * See the [Buffer](http://nodejs.org/docs/latest/api/buffer.html)
   * documentation for how these work.
   *
   * @param offset
   */

  readUIntLE: Buffer['readUIntLE'];
}

/**
 * No arguments are required for the constructor, but you can initialise
 * the list by passing in a single Buffer object or an array of Buffer
 * objects.
 *
 * `new` is not strictly required, if you don't instantiate a new object,
 * it will be done automatically for you so you can create a new instance
 * simply with:
 *
 * ```js
 * const { BufferList } = require('bl')
 * const bl = BufferList()
 *
 * // equivalent to:
 *
 * const { BufferList } = require('bl')
 * const bl = new BufferList()
 * ```
 */

declare const BufferList: BufferListConstructor;
