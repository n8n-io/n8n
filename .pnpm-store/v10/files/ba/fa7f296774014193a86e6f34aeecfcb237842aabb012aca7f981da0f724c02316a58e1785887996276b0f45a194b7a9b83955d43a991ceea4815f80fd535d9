var csv_parse = (function (exports) {
            'use strict';

            var global$1 = (typeof global !== "undefined" ? global :
                        typeof self !== "undefined" ? self :
                        typeof window !== "undefined" ? window : {});

            var lookup = [];
            var revLookup = [];
            var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
            var inited = false;
            function init () {
              inited = true;
              var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
              for (var i = 0, len = code.length; i < len; ++i) {
                lookup[i] = code[i];
                revLookup[code.charCodeAt(i)] = i;
              }

              revLookup['-'.charCodeAt(0)] = 62;
              revLookup['_'.charCodeAt(0)] = 63;
            }

            function toByteArray (b64) {
              if (!inited) {
                init();
              }
              var i, j, l, tmp, placeHolders, arr;
              var len = b64.length;

              if (len % 4 > 0) {
                throw new Error('Invalid string. Length must be a multiple of 4')
              }

              // the number of equal signs (place holders)
              // if there are two placeholders, than the two characters before it
              // represent one byte
              // if there is only one, then the three characters before it represent 2 bytes
              // this is just a cheap hack to not do indexOf twice
              placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

              // base64 is 4/3 + up to two characters of the original data
              arr = new Arr(len * 3 / 4 - placeHolders);

              // if there are placeholders, only get up to the last complete 4 chars
              l = placeHolders > 0 ? len - 4 : len;

              var L = 0;

              for (i = 0, j = 0; i < l; i += 4, j += 3) {
                tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
                arr[L++] = (tmp >> 16) & 0xFF;
                arr[L++] = (tmp >> 8) & 0xFF;
                arr[L++] = tmp & 0xFF;
              }

              if (placeHolders === 2) {
                tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
                arr[L++] = tmp & 0xFF;
              } else if (placeHolders === 1) {
                tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
                arr[L++] = (tmp >> 8) & 0xFF;
                arr[L++] = tmp & 0xFF;
              }

              return arr
            }

            function tripletToBase64 (num) {
              return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
            }

            function encodeChunk (uint8, start, end) {
              var tmp;
              var output = [];
              for (var i = start; i < end; i += 3) {
                tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
                output.push(tripletToBase64(tmp));
              }
              return output.join('')
            }

            function fromByteArray (uint8) {
              if (!inited) {
                init();
              }
              var tmp;
              var len = uint8.length;
              var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
              var output = '';
              var parts = [];
              var maxChunkLength = 16383; // must be multiple of 3

              // go through the array every three bytes, we'll deal with trailing stuff later
              for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
                parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
              }

              // pad the end with zeros, but make sure to not forget the extra bytes
              if (extraBytes === 1) {
                tmp = uint8[len - 1];
                output += lookup[tmp >> 2];
                output += lookup[(tmp << 4) & 0x3F];
                output += '==';
              } else if (extraBytes === 2) {
                tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
                output += lookup[tmp >> 10];
                output += lookup[(tmp >> 4) & 0x3F];
                output += lookup[(tmp << 2) & 0x3F];
                output += '=';
              }

              parts.push(output);

              return parts.join('')
            }

            function read (buffer, offset, isLE, mLen, nBytes) {
              var e, m;
              var eLen = nBytes * 8 - mLen - 1;
              var eMax = (1 << eLen) - 1;
              var eBias = eMax >> 1;
              var nBits = -7;
              var i = isLE ? (nBytes - 1) : 0;
              var d = isLE ? -1 : 1;
              var s = buffer[offset + i];

              i += d;

              e = s & ((1 << (-nBits)) - 1);
              s >>= (-nBits);
              nBits += eLen;
              for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

              m = e & ((1 << (-nBits)) - 1);
              e >>= (-nBits);
              nBits += mLen;
              for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

              if (e === 0) {
                e = 1 - eBias;
              } else if (e === eMax) {
                return m ? NaN : ((s ? -1 : 1) * Infinity)
              } else {
                m = m + Math.pow(2, mLen);
                e = e - eBias;
              }
              return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
            }

            function write (buffer, value, offset, isLE, mLen, nBytes) {
              var e, m, c;
              var eLen = nBytes * 8 - mLen - 1;
              var eMax = (1 << eLen) - 1;
              var eBias = eMax >> 1;
              var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
              var i = isLE ? 0 : (nBytes - 1);
              var d = isLE ? 1 : -1;
              var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

              value = Math.abs(value);

              if (isNaN(value) || value === Infinity) {
                m = isNaN(value) ? 1 : 0;
                e = eMax;
              } else {
                e = Math.floor(Math.log(value) / Math.LN2);
                if (value * (c = Math.pow(2, -e)) < 1) {
                  e--;
                  c *= 2;
                }
                if (e + eBias >= 1) {
                  value += rt / c;
                } else {
                  value += rt * Math.pow(2, 1 - eBias);
                }
                if (value * c >= 2) {
                  e++;
                  c /= 2;
                }

                if (e + eBias >= eMax) {
                  m = 0;
                  e = eMax;
                } else if (e + eBias >= 1) {
                  m = (value * c - 1) * Math.pow(2, mLen);
                  e = e + eBias;
                } else {
                  m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
                  e = 0;
                }
              }

              for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

              e = (e << mLen) | m;
              eLen += mLen;
              for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

              buffer[offset + i - d] |= s * 128;
            }

            var toString = {}.toString;

            var isArray$1 = Array.isArray || function (arr) {
              return toString.call(arr) == '[object Array]';
            };

            var INSPECT_MAX_BYTES = 50;

            /**
             * If `Buffer.TYPED_ARRAY_SUPPORT`:
             *   === true    Use Uint8Array implementation (fastest)
             *   === false   Use Object implementation (most compatible, even IE6)
             *
             * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
             * Opera 11.6+, iOS 4.2+.
             *
             * Due to various browser bugs, sometimes the Object implementation will be used even
             * when the browser supports typed arrays.
             *
             * Note:
             *
             *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
             *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
             *
             *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
             *
             *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
             *     incorrect length in some situations.

             * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
             * get the Object implementation, which is slower but behaves correctly.
             */
            Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
              ? global$1.TYPED_ARRAY_SUPPORT
              : true;

            /*
             * Export kMaxLength after typed array support is determined.
             */
            kMaxLength();

            function kMaxLength () {
              return Buffer.TYPED_ARRAY_SUPPORT
                ? 0x7fffffff
                : 0x3fffffff
            }

            function createBuffer (that, length) {
              if (kMaxLength() < length) {
                throw new RangeError('Invalid typed array length')
              }
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                // Return an augmented `Uint8Array` instance, for best performance
                that = new Uint8Array(length);
                that.__proto__ = Buffer.prototype;
              } else {
                // Fallback: Return an object instance of the Buffer class
                if (that === null) {
                  that = new Buffer(length);
                }
                that.length = length;
              }

              return that
            }

            /**
             * The Buffer constructor returns instances of `Uint8Array` that have their
             * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
             * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
             * and the `Uint8Array` methods. Square bracket notation works as expected -- it
             * returns a single octet.
             *
             * The `Uint8Array` prototype remains unmodified.
             */

            function Buffer (arg, encodingOrOffset, length) {
              if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
                return new Buffer(arg, encodingOrOffset, length)
              }

              // Common case.
              if (typeof arg === 'number') {
                if (typeof encodingOrOffset === 'string') {
                  throw new Error(
                    'If encoding is specified then the first argument must be a string'
                  )
                }
                return allocUnsafe(this, arg)
              }
              return from(this, arg, encodingOrOffset, length)
            }

            Buffer.poolSize = 8192; // not used by this implementation

            // TODO: Legacy, not needed anymore. Remove in next major version.
            Buffer._augment = function (arr) {
              arr.__proto__ = Buffer.prototype;
              return arr
            };

            function from (that, value, encodingOrOffset, length) {
              if (typeof value === 'number') {
                throw new TypeError('"value" argument must not be a number')
              }

              if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
                return fromArrayBuffer(that, value, encodingOrOffset, length)
              }

              if (typeof value === 'string') {
                return fromString(that, value, encodingOrOffset)
              }

              return fromObject(that, value)
            }

            /**
             * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
             * if value is a number.
             * Buffer.from(str[, encoding])
             * Buffer.from(array)
             * Buffer.from(buffer)
             * Buffer.from(arrayBuffer[, byteOffset[, length]])
             **/
            Buffer.from = function (value, encodingOrOffset, length) {
              return from(null, value, encodingOrOffset, length)
            };

            if (Buffer.TYPED_ARRAY_SUPPORT) {
              Buffer.prototype.__proto__ = Uint8Array.prototype;
              Buffer.__proto__ = Uint8Array;
              if (typeof Symbol !== 'undefined' && Symbol.species &&
                  Buffer[Symbol.species] === Buffer) ;
            }

            function assertSize (size) {
              if (typeof size !== 'number') {
                throw new TypeError('"size" argument must be a number')
              } else if (size < 0) {
                throw new RangeError('"size" argument must not be negative')
              }
            }

            function alloc (that, size, fill, encoding) {
              assertSize(size);
              if (size <= 0) {
                return createBuffer(that, size)
              }
              if (fill !== undefined) {
                // Only pay attention to encoding if it's a string. This
                // prevents accidentally sending in a number that would
                // be interpretted as a start offset.
                return typeof encoding === 'string'
                  ? createBuffer(that, size).fill(fill, encoding)
                  : createBuffer(that, size).fill(fill)
              }
              return createBuffer(that, size)
            }

            /**
             * Creates a new filled Buffer instance.
             * alloc(size[, fill[, encoding]])
             **/
            Buffer.alloc = function (size, fill, encoding) {
              return alloc(null, size, fill, encoding)
            };

            function allocUnsafe (that, size) {
              assertSize(size);
              that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
              if (!Buffer.TYPED_ARRAY_SUPPORT) {
                for (var i = 0; i < size; ++i) {
                  that[i] = 0;
                }
              }
              return that
            }

            /**
             * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
             * */
            Buffer.allocUnsafe = function (size) {
              return allocUnsafe(null, size)
            };
            /**
             * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
             */
            Buffer.allocUnsafeSlow = function (size) {
              return allocUnsafe(null, size)
            };

            function fromString (that, string, encoding) {
              if (typeof encoding !== 'string' || encoding === '') {
                encoding = 'utf8';
              }

              if (!Buffer.isEncoding(encoding)) {
                throw new TypeError('"encoding" must be a valid string encoding')
              }

              var length = byteLength(string, encoding) | 0;
              that = createBuffer(that, length);

              var actual = that.write(string, encoding);

              if (actual !== length) {
                // Writing a hex string, for example, that contains invalid characters will
                // cause everything after the first invalid character to be ignored. (e.g.
                // 'abxxcd' will be treated as 'ab')
                that = that.slice(0, actual);
              }

              return that
            }

            function fromArrayLike (that, array) {
              var length = array.length < 0 ? 0 : checked(array.length) | 0;
              that = createBuffer(that, length);
              for (var i = 0; i < length; i += 1) {
                that[i] = array[i] & 255;
              }
              return that
            }

            function fromArrayBuffer (that, array, byteOffset, length) {
              array.byteLength; // this throws if `array` is not a valid ArrayBuffer

              if (byteOffset < 0 || array.byteLength < byteOffset) {
                throw new RangeError('\'offset\' is out of bounds')
              }

              if (array.byteLength < byteOffset + (length || 0)) {
                throw new RangeError('\'length\' is out of bounds')
              }

              if (byteOffset === undefined && length === undefined) {
                array = new Uint8Array(array);
              } else if (length === undefined) {
                array = new Uint8Array(array, byteOffset);
              } else {
                array = new Uint8Array(array, byteOffset, length);
              }

              if (Buffer.TYPED_ARRAY_SUPPORT) {
                // Return an augmented `Uint8Array` instance, for best performance
                that = array;
                that.__proto__ = Buffer.prototype;
              } else {
                // Fallback: Return an object instance of the Buffer class
                that = fromArrayLike(that, array);
              }
              return that
            }

            function fromObject (that, obj) {
              if (internalIsBuffer(obj)) {
                var len = checked(obj.length) | 0;
                that = createBuffer(that, len);

                if (that.length === 0) {
                  return that
                }

                obj.copy(that, 0, 0, len);
                return that
              }

              if (obj) {
                if ((typeof ArrayBuffer !== 'undefined' &&
                    obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
                  if (typeof obj.length !== 'number' || isnan(obj.length)) {
                    return createBuffer(that, 0)
                  }
                  return fromArrayLike(that, obj)
                }

                if (obj.type === 'Buffer' && isArray$1(obj.data)) {
                  return fromArrayLike(that, obj.data)
                }
              }

              throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
            }

            function checked (length) {
              // Note: cannot use `length < kMaxLength()` here because that fails when
              // length is NaN (which is otherwise coerced to zero.)
              if (length >= kMaxLength()) {
                throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                                     'size: 0x' + kMaxLength().toString(16) + ' bytes')
              }
              return length | 0
            }
            Buffer.isBuffer = isBuffer;
            function internalIsBuffer (b) {
              return !!(b != null && b._isBuffer)
            }

            Buffer.compare = function compare (a, b) {
              if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
                throw new TypeError('Arguments must be Buffers')
              }

              if (a === b) return 0

              var x = a.length;
              var y = b.length;

              for (var i = 0, len = Math.min(x, y); i < len; ++i) {
                if (a[i] !== b[i]) {
                  x = a[i];
                  y = b[i];
                  break
                }
              }

              if (x < y) return -1
              if (y < x) return 1
              return 0
            };

            Buffer.isEncoding = function isEncoding (encoding) {
              switch (String(encoding).toLowerCase()) {
                case 'hex':
                case 'utf8':
                case 'utf-8':
                case 'ascii':
                case 'latin1':
                case 'binary':
                case 'base64':
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                  return true
                default:
                  return false
              }
            };

            Buffer.concat = function concat (list, length) {
              if (!isArray$1(list)) {
                throw new TypeError('"list" argument must be an Array of Buffers')
              }

              if (list.length === 0) {
                return Buffer.alloc(0)
              }

              var i;
              if (length === undefined) {
                length = 0;
                for (i = 0; i < list.length; ++i) {
                  length += list[i].length;
                }
              }

              var buffer = Buffer.allocUnsafe(length);
              var pos = 0;
              for (i = 0; i < list.length; ++i) {
                var buf = list[i];
                if (!internalIsBuffer(buf)) {
                  throw new TypeError('"list" argument must be an Array of Buffers')
                }
                buf.copy(buffer, pos);
                pos += buf.length;
              }
              return buffer
            };

            function byteLength (string, encoding) {
              if (internalIsBuffer(string)) {
                return string.length
              }
              if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
                  (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
                return string.byteLength
              }
              if (typeof string !== 'string') {
                string = '' + string;
              }

              var len = string.length;
              if (len === 0) return 0

              // Use a for loop to avoid recursion
              var loweredCase = false;
              for (;;) {
                switch (encoding) {
                  case 'ascii':
                  case 'latin1':
                  case 'binary':
                    return len
                  case 'utf8':
                  case 'utf-8':
                  case undefined:
                    return utf8ToBytes(string).length
                  case 'ucs2':
                  case 'ucs-2':
                  case 'utf16le':
                  case 'utf-16le':
                    return len * 2
                  case 'hex':
                    return len >>> 1
                  case 'base64':
                    return base64ToBytes(string).length
                  default:
                    if (loweredCase) return utf8ToBytes(string).length // assume utf8
                    encoding = ('' + encoding).toLowerCase();
                    loweredCase = true;
                }
              }
            }
            Buffer.byteLength = byteLength;

            function slowToString (encoding, start, end) {
              var loweredCase = false;

              // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
              // property of a typed array.

              // This behaves neither like String nor Uint8Array in that we set start/end
              // to their upper/lower bounds if the value passed is out of range.
              // undefined is handled specially as per ECMA-262 6th Edition,
              // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
              if (start === undefined || start < 0) {
                start = 0;
              }
              // Return early if start > this.length. Done here to prevent potential uint32
              // coercion fail below.
              if (start > this.length) {
                return ''
              }

              if (end === undefined || end > this.length) {
                end = this.length;
              }

              if (end <= 0) {
                return ''
              }

              // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
              end >>>= 0;
              start >>>= 0;

              if (end <= start) {
                return ''
              }

              if (!encoding) encoding = 'utf8';

              while (true) {
                switch (encoding) {
                  case 'hex':
                    return hexSlice(this, start, end)

                  case 'utf8':
                  case 'utf-8':
                    return utf8Slice(this, start, end)

                  case 'ascii':
                    return asciiSlice(this, start, end)

                  case 'latin1':
                  case 'binary':
                    return latin1Slice(this, start, end)

                  case 'base64':
                    return base64Slice(this, start, end)

                  case 'ucs2':
                  case 'ucs-2':
                  case 'utf16le':
                  case 'utf-16le':
                    return utf16leSlice(this, start, end)

                  default:
                    if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                    encoding = (encoding + '').toLowerCase();
                    loweredCase = true;
                }
              }
            }

            // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
            // Buffer instances.
            Buffer.prototype._isBuffer = true;

            function swap (b, n, m) {
              var i = b[n];
              b[n] = b[m];
              b[m] = i;
            }

            Buffer.prototype.swap16 = function swap16 () {
              var len = this.length;
              if (len % 2 !== 0) {
                throw new RangeError('Buffer size must be a multiple of 16-bits')
              }
              for (var i = 0; i < len; i += 2) {
                swap(this, i, i + 1);
              }
              return this
            };

            Buffer.prototype.swap32 = function swap32 () {
              var len = this.length;
              if (len % 4 !== 0) {
                throw new RangeError('Buffer size must be a multiple of 32-bits')
              }
              for (var i = 0; i < len; i += 4) {
                swap(this, i, i + 3);
                swap(this, i + 1, i + 2);
              }
              return this
            };

            Buffer.prototype.swap64 = function swap64 () {
              var len = this.length;
              if (len % 8 !== 0) {
                throw new RangeError('Buffer size must be a multiple of 64-bits')
              }
              for (var i = 0; i < len; i += 8) {
                swap(this, i, i + 7);
                swap(this, i + 1, i + 6);
                swap(this, i + 2, i + 5);
                swap(this, i + 3, i + 4);
              }
              return this
            };

            Buffer.prototype.toString = function toString () {
              var length = this.length | 0;
              if (length === 0) return ''
              if (arguments.length === 0) return utf8Slice(this, 0, length)
              return slowToString.apply(this, arguments)
            };

            Buffer.prototype.equals = function equals (b) {
              if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
              if (this === b) return true
              return Buffer.compare(this, b) === 0
            };

            Buffer.prototype.inspect = function inspect () {
              var str = '';
              var max = INSPECT_MAX_BYTES;
              if (this.length > 0) {
                str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
                if (this.length > max) str += ' ... ';
              }
              return '<Buffer ' + str + '>'
            };

            Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
              if (!internalIsBuffer(target)) {
                throw new TypeError('Argument must be a Buffer')
              }

              if (start === undefined) {
                start = 0;
              }
              if (end === undefined) {
                end = target ? target.length : 0;
              }
              if (thisStart === undefined) {
                thisStart = 0;
              }
              if (thisEnd === undefined) {
                thisEnd = this.length;
              }

              if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
                throw new RangeError('out of range index')
              }

              if (thisStart >= thisEnd && start >= end) {
                return 0
              }
              if (thisStart >= thisEnd) {
                return -1
              }
              if (start >= end) {
                return 1
              }

              start >>>= 0;
              end >>>= 0;
              thisStart >>>= 0;
              thisEnd >>>= 0;

              if (this === target) return 0

              var x = thisEnd - thisStart;
              var y = end - start;
              var len = Math.min(x, y);

              var thisCopy = this.slice(thisStart, thisEnd);
              var targetCopy = target.slice(start, end);

              for (var i = 0; i < len; ++i) {
                if (thisCopy[i] !== targetCopy[i]) {
                  x = thisCopy[i];
                  y = targetCopy[i];
                  break
                }
              }

              if (x < y) return -1
              if (y < x) return 1
              return 0
            };

            // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
            // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
            //
            // Arguments:
            // - buffer - a Buffer to search
            // - val - a string, Buffer, or number
            // - byteOffset - an index into `buffer`; will be clamped to an int32
            // - encoding - an optional encoding, relevant is val is a string
            // - dir - true for indexOf, false for lastIndexOf
            function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
              // Empty buffer means no match
              if (buffer.length === 0) return -1

              // Normalize byteOffset
              if (typeof byteOffset === 'string') {
                encoding = byteOffset;
                byteOffset = 0;
              } else if (byteOffset > 0x7fffffff) {
                byteOffset = 0x7fffffff;
              } else if (byteOffset < -0x80000000) {
                byteOffset = -0x80000000;
              }
              byteOffset = +byteOffset;  // Coerce to Number.
              if (isNaN(byteOffset)) {
                // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
                byteOffset = dir ? 0 : (buffer.length - 1);
              }

              // Normalize byteOffset: negative offsets start from the end of the buffer
              if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
              if (byteOffset >= buffer.length) {
                if (dir) return -1
                else byteOffset = buffer.length - 1;
              } else if (byteOffset < 0) {
                if (dir) byteOffset = 0;
                else return -1
              }

              // Normalize val
              if (typeof val === 'string') {
                val = Buffer.from(val, encoding);
              }

              // Finally, search either indexOf (if dir is true) or lastIndexOf
              if (internalIsBuffer(val)) {
                // Special case: looking for empty string/buffer always fails
                if (val.length === 0) {
                  return -1
                }
                return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
              } else if (typeof val === 'number') {
                val = val & 0xFF; // Search for a byte value [0-255]
                if (Buffer.TYPED_ARRAY_SUPPORT &&
                    typeof Uint8Array.prototype.indexOf === 'function') {
                  if (dir) {
                    return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
                  } else {
                    return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
                  }
                }
                return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
              }

              throw new TypeError('val must be string, number or Buffer')
            }

            function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
              var indexSize = 1;
              var arrLength = arr.length;
              var valLength = val.length;

              if (encoding !== undefined) {
                encoding = String(encoding).toLowerCase();
                if (encoding === 'ucs2' || encoding === 'ucs-2' ||
                    encoding === 'utf16le' || encoding === 'utf-16le') {
                  if (arr.length < 2 || val.length < 2) {
                    return -1
                  }
                  indexSize = 2;
                  arrLength /= 2;
                  valLength /= 2;
                  byteOffset /= 2;
                }
              }

              function read (buf, i) {
                if (indexSize === 1) {
                  return buf[i]
                } else {
                  return buf.readUInt16BE(i * indexSize)
                }
              }

              var i;
              if (dir) {
                var foundIndex = -1;
                for (i = byteOffset; i < arrLength; i++) {
                  if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                    if (foundIndex === -1) foundIndex = i;
                    if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
                  } else {
                    if (foundIndex !== -1) i -= i - foundIndex;
                    foundIndex = -1;
                  }
                }
              } else {
                if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
                for (i = byteOffset; i >= 0; i--) {
                  var found = true;
                  for (var j = 0; j < valLength; j++) {
                    if (read(arr, i + j) !== read(val, j)) {
                      found = false;
                      break
                    }
                  }
                  if (found) return i
                }
              }

              return -1
            }

            Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
              return this.indexOf(val, byteOffset, encoding) !== -1
            };

            Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
              return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
            };

            Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
              return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
            };

            function hexWrite (buf, string, offset, length) {
              offset = Number(offset) || 0;
              var remaining = buf.length - offset;
              if (!length) {
                length = remaining;
              } else {
                length = Number(length);
                if (length > remaining) {
                  length = remaining;
                }
              }

              // must be an even number of digits
              var strLen = string.length;
              if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

              if (length > strLen / 2) {
                length = strLen / 2;
              }
              for (var i = 0; i < length; ++i) {
                var parsed = parseInt(string.substr(i * 2, 2), 16);
                if (isNaN(parsed)) return i
                buf[offset + i] = parsed;
              }
              return i
            }

            function utf8Write (buf, string, offset, length) {
              return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
            }

            function asciiWrite (buf, string, offset, length) {
              return blitBuffer(asciiToBytes(string), buf, offset, length)
            }

            function latin1Write (buf, string, offset, length) {
              return asciiWrite(buf, string, offset, length)
            }

            function base64Write (buf, string, offset, length) {
              return blitBuffer(base64ToBytes(string), buf, offset, length)
            }

            function ucs2Write (buf, string, offset, length) {
              return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
            }

            Buffer.prototype.write = function write (string, offset, length, encoding) {
              // Buffer#write(string)
              if (offset === undefined) {
                encoding = 'utf8';
                length = this.length;
                offset = 0;
              // Buffer#write(string, encoding)
              } else if (length === undefined && typeof offset === 'string') {
                encoding = offset;
                length = this.length;
                offset = 0;
              // Buffer#write(string, offset[, length][, encoding])
              } else if (isFinite(offset)) {
                offset = offset | 0;
                if (isFinite(length)) {
                  length = length | 0;
                  if (encoding === undefined) encoding = 'utf8';
                } else {
                  encoding = length;
                  length = undefined;
                }
              // legacy write(string, encoding, offset, length) - remove in v0.13
              } else {
                throw new Error(
                  'Buffer.write(string, encoding, offset[, length]) is no longer supported'
                )
              }

              var remaining = this.length - offset;
              if (length === undefined || length > remaining) length = remaining;

              if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
                throw new RangeError('Attempt to write outside buffer bounds')
              }

              if (!encoding) encoding = 'utf8';

              var loweredCase = false;
              for (;;) {
                switch (encoding) {
                  case 'hex':
                    return hexWrite(this, string, offset, length)

                  case 'utf8':
                  case 'utf-8':
                    return utf8Write(this, string, offset, length)

                  case 'ascii':
                    return asciiWrite(this, string, offset, length)

                  case 'latin1':
                  case 'binary':
                    return latin1Write(this, string, offset, length)

                  case 'base64':
                    // Warning: maxLength not taken into account in base64Write
                    return base64Write(this, string, offset, length)

                  case 'ucs2':
                  case 'ucs-2':
                  case 'utf16le':
                  case 'utf-16le':
                    return ucs2Write(this, string, offset, length)

                  default:
                    if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                    encoding = ('' + encoding).toLowerCase();
                    loweredCase = true;
                }
              }
            };

            Buffer.prototype.toJSON = function toJSON () {
              return {
                type: 'Buffer',
                data: Array.prototype.slice.call(this._arr || this, 0)
              }
            };

            function base64Slice (buf, start, end) {
              if (start === 0 && end === buf.length) {
                return fromByteArray(buf)
              } else {
                return fromByteArray(buf.slice(start, end))
              }
            }

            function utf8Slice (buf, start, end) {
              end = Math.min(buf.length, end);
              var res = [];

              var i = start;
              while (i < end) {
                var firstByte = buf[i];
                var codePoint = null;
                var bytesPerSequence = (firstByte > 0xEF) ? 4
                  : (firstByte > 0xDF) ? 3
                  : (firstByte > 0xBF) ? 2
                  : 1;

                if (i + bytesPerSequence <= end) {
                  var secondByte, thirdByte, fourthByte, tempCodePoint;

                  switch (bytesPerSequence) {
                    case 1:
                      if (firstByte < 0x80) {
                        codePoint = firstByte;
                      }
                      break
                    case 2:
                      secondByte = buf[i + 1];
                      if ((secondByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                        if (tempCodePoint > 0x7F) {
                          codePoint = tempCodePoint;
                        }
                      }
                      break
                    case 3:
                      secondByte = buf[i + 1];
                      thirdByte = buf[i + 2];
                      if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                        if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                          codePoint = tempCodePoint;
                        }
                      }
                      break
                    case 4:
                      secondByte = buf[i + 1];
                      thirdByte = buf[i + 2];
                      fourthByte = buf[i + 3];
                      if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                        tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                        if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                          codePoint = tempCodePoint;
                        }
                      }
                  }
                }

                if (codePoint === null) {
                  // we did not generate a valid codePoint so insert a
                  // replacement char (U+FFFD) and advance only 1 byte
                  codePoint = 0xFFFD;
                  bytesPerSequence = 1;
                } else if (codePoint > 0xFFFF) {
                  // encode to utf16 (surrogate pair dance)
                  codePoint -= 0x10000;
                  res.push(codePoint >>> 10 & 0x3FF | 0xD800);
                  codePoint = 0xDC00 | codePoint & 0x3FF;
                }

                res.push(codePoint);
                i += bytesPerSequence;
              }

              return decodeCodePointsArray(res)
            }

            // Based on http://stackoverflow.com/a/22747272/680742, the browser with
            // the lowest limit is Chrome, with 0x10000 args.
            // We go 1 magnitude less, for safety
            var MAX_ARGUMENTS_LENGTH = 0x1000;

            function decodeCodePointsArray (codePoints) {
              var len = codePoints.length;
              if (len <= MAX_ARGUMENTS_LENGTH) {
                return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
              }

              // Decode in chunks to avoid "call stack size exceeded".
              var res = '';
              var i = 0;
              while (i < len) {
                res += String.fromCharCode.apply(
                  String,
                  codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
                );
              }
              return res
            }

            function asciiSlice (buf, start, end) {
              var ret = '';
              end = Math.min(buf.length, end);

              for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i] & 0x7F);
              }
              return ret
            }

            function latin1Slice (buf, start, end) {
              var ret = '';
              end = Math.min(buf.length, end);

              for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i]);
              }
              return ret
            }

            function hexSlice (buf, start, end) {
              var len = buf.length;

              if (!start || start < 0) start = 0;
              if (!end || end < 0 || end > len) end = len;

              var out = '';
              for (var i = start; i < end; ++i) {
                out += toHex(buf[i]);
              }
              return out
            }

            function utf16leSlice (buf, start, end) {
              var bytes = buf.slice(start, end);
              var res = '';
              for (var i = 0; i < bytes.length; i += 2) {
                res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
              }
              return res
            }

            Buffer.prototype.slice = function slice (start, end) {
              var len = this.length;
              start = ~~start;
              end = end === undefined ? len : ~~end;

              if (start < 0) {
                start += len;
                if (start < 0) start = 0;
              } else if (start > len) {
                start = len;
              }

              if (end < 0) {
                end += len;
                if (end < 0) end = 0;
              } else if (end > len) {
                end = len;
              }

              if (end < start) end = start;

              var newBuf;
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                newBuf = this.subarray(start, end);
                newBuf.__proto__ = Buffer.prototype;
              } else {
                var sliceLen = end - start;
                newBuf = new Buffer(sliceLen, undefined);
                for (var i = 0; i < sliceLen; ++i) {
                  newBuf[i] = this[i + start];
                }
              }

              return newBuf
            };

            /*
             * Need to make sure that buffer isn't trying to write out of bounds.
             */
            function checkOffset (offset, ext, length) {
              if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
              if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
            }

            Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) checkOffset(offset, byteLength, this.length);

              var val = this[offset];
              var mul = 1;
              var i = 0;
              while (++i < byteLength && (mul *= 0x100)) {
                val += this[offset + i] * mul;
              }

              return val
            };

            Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) {
                checkOffset(offset, byteLength, this.length);
              }

              var val = this[offset + --byteLength];
              var mul = 1;
              while (byteLength > 0 && (mul *= 0x100)) {
                val += this[offset + --byteLength] * mul;
              }

              return val
            };

            Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 1, this.length);
              return this[offset]
            };

            Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 2, this.length);
              return this[offset] | (this[offset + 1] << 8)
            };

            Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 2, this.length);
              return (this[offset] << 8) | this[offset + 1]
            };

            Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);

              return ((this[offset]) |
                  (this[offset + 1] << 8) |
                  (this[offset + 2] << 16)) +
                  (this[offset + 3] * 0x1000000)
            };

            Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);

              return (this[offset] * 0x1000000) +
                ((this[offset + 1] << 16) |
                (this[offset + 2] << 8) |
                this[offset + 3])
            };

            Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) checkOffset(offset, byteLength, this.length);

              var val = this[offset];
              var mul = 1;
              var i = 0;
              while (++i < byteLength && (mul *= 0x100)) {
                val += this[offset + i] * mul;
              }
              mul *= 0x80;

              if (val >= mul) val -= Math.pow(2, 8 * byteLength);

              return val
            };

            Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) checkOffset(offset, byteLength, this.length);

              var i = byteLength;
              var mul = 1;
              var val = this[offset + --i];
              while (i > 0 && (mul *= 0x100)) {
                val += this[offset + --i] * mul;
              }
              mul *= 0x80;

              if (val >= mul) val -= Math.pow(2, 8 * byteLength);

              return val
            };

            Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 1, this.length);
              if (!(this[offset] & 0x80)) return (this[offset])
              return ((0xff - this[offset] + 1) * -1)
            };

            Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 2, this.length);
              var val = this[offset] | (this[offset + 1] << 8);
              return (val & 0x8000) ? val | 0xFFFF0000 : val
            };

            Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 2, this.length);
              var val = this[offset + 1] | (this[offset] << 8);
              return (val & 0x8000) ? val | 0xFFFF0000 : val
            };

            Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);

              return (this[offset]) |
                (this[offset + 1] << 8) |
                (this[offset + 2] << 16) |
                (this[offset + 3] << 24)
            };

            Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);

              return (this[offset] << 24) |
                (this[offset + 1] << 16) |
                (this[offset + 2] << 8) |
                (this[offset + 3])
            };

            Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);
              return read(this, offset, true, 23, 4)
            };

            Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 4, this.length);
              return read(this, offset, false, 23, 4)
            };

            Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 8, this.length);
              return read(this, offset, true, 52, 8)
            };

            Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
              if (!noAssert) checkOffset(offset, 8, this.length);
              return read(this, offset, false, 52, 8)
            };

            function checkInt (buf, value, offset, ext, max, min) {
              if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
              if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
              if (offset + ext > buf.length) throw new RangeError('Index out of range')
            }

            Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) {
                var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                checkInt(this, value, offset, byteLength, maxBytes, 0);
              }

              var mul = 1;
              var i = 0;
              this[offset] = value & 0xFF;
              while (++i < byteLength && (mul *= 0x100)) {
                this[offset + i] = (value / mul) & 0xFF;
              }

              return offset + byteLength
            };

            Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset | 0;
              byteLength = byteLength | 0;
              if (!noAssert) {
                var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                checkInt(this, value, offset, byteLength, maxBytes, 0);
              }

              var i = byteLength - 1;
              var mul = 1;
              this[offset + i] = value & 0xFF;
              while (--i >= 0 && (mul *= 0x100)) {
                this[offset + i] = (value / mul) & 0xFF;
              }

              return offset + byteLength
            };

            Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
              if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
              this[offset] = (value & 0xff);
              return offset + 1
            };

            function objectWriteUInt16 (buf, value, offset, littleEndian) {
              if (value < 0) value = 0xffff + value + 1;
              for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
                buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
                  (littleEndian ? i : 1 - i) * 8;
              }
            }

            Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value & 0xff);
                this[offset + 1] = (value >>> 8);
              } else {
                objectWriteUInt16(this, value, offset, true);
              }
              return offset + 2
            };

            Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value >>> 8);
                this[offset + 1] = (value & 0xff);
              } else {
                objectWriteUInt16(this, value, offset, false);
              }
              return offset + 2
            };

            function objectWriteUInt32 (buf, value, offset, littleEndian) {
              if (value < 0) value = 0xffffffff + value + 1;
              for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
                buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
              }
            }

            Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset + 3] = (value >>> 24);
                this[offset + 2] = (value >>> 16);
                this[offset + 1] = (value >>> 8);
                this[offset] = (value & 0xff);
              } else {
                objectWriteUInt32(this, value, offset, true);
              }
              return offset + 4
            };

            Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value >>> 24);
                this[offset + 1] = (value >>> 16);
                this[offset + 2] = (value >>> 8);
                this[offset + 3] = (value & 0xff);
              } else {
                objectWriteUInt32(this, value, offset, false);
              }
              return offset + 4
            };

            Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) {
                var limit = Math.pow(2, 8 * byteLength - 1);

                checkInt(this, value, offset, byteLength, limit - 1, -limit);
              }

              var i = 0;
              var mul = 1;
              var sub = 0;
              this[offset] = value & 0xFF;
              while (++i < byteLength && (mul *= 0x100)) {
                if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
                  sub = 1;
                }
                this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
              }

              return offset + byteLength
            };

            Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) {
                var limit = Math.pow(2, 8 * byteLength - 1);

                checkInt(this, value, offset, byteLength, limit - 1, -limit);
              }

              var i = byteLength - 1;
              var mul = 1;
              var sub = 0;
              this[offset + i] = value & 0xFF;
              while (--i >= 0 && (mul *= 0x100)) {
                if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
                  sub = 1;
                }
                this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
              }

              return offset + byteLength
            };

            Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
              if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
              if (value < 0) value = 0xff + value + 1;
              this[offset] = (value & 0xff);
              return offset + 1
            };

            Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value & 0xff);
                this[offset + 1] = (value >>> 8);
              } else {
                objectWriteUInt16(this, value, offset, true);
              }
              return offset + 2
            };

            Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value >>> 8);
                this[offset + 1] = (value & 0xff);
              } else {
                objectWriteUInt16(this, value, offset, false);
              }
              return offset + 2
            };

            Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value & 0xff);
                this[offset + 1] = (value >>> 8);
                this[offset + 2] = (value >>> 16);
                this[offset + 3] = (value >>> 24);
              } else {
                objectWriteUInt32(this, value, offset, true);
              }
              return offset + 4
            };

            Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
              value = +value;
              offset = offset | 0;
              if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
              if (value < 0) value = 0xffffffff + value + 1;
              if (Buffer.TYPED_ARRAY_SUPPORT) {
                this[offset] = (value >>> 24);
                this[offset + 1] = (value >>> 16);
                this[offset + 2] = (value >>> 8);
                this[offset + 3] = (value & 0xff);
              } else {
                objectWriteUInt32(this, value, offset, false);
              }
              return offset + 4
            };

            function checkIEEE754 (buf, value, offset, ext, max, min) {
              if (offset + ext > buf.length) throw new RangeError('Index out of range')
              if (offset < 0) throw new RangeError('Index out of range')
            }

            function writeFloat (buf, value, offset, littleEndian, noAssert) {
              if (!noAssert) {
                checkIEEE754(buf, value, offset, 4);
              }
              write(buf, value, offset, littleEndian, 23, 4);
              return offset + 4
            }

            Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
              return writeFloat(this, value, offset, true, noAssert)
            };

            Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
              return writeFloat(this, value, offset, false, noAssert)
            };

            function writeDouble (buf, value, offset, littleEndian, noAssert) {
              if (!noAssert) {
                checkIEEE754(buf, value, offset, 8);
              }
              write(buf, value, offset, littleEndian, 52, 8);
              return offset + 8
            }

            Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
              return writeDouble(this, value, offset, true, noAssert)
            };

            Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
              return writeDouble(this, value, offset, false, noAssert)
            };

            // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
            Buffer.prototype.copy = function copy (target, targetStart, start, end) {
              if (!start) start = 0;
              if (!end && end !== 0) end = this.length;
              if (targetStart >= target.length) targetStart = target.length;
              if (!targetStart) targetStart = 0;
              if (end > 0 && end < start) end = start;

              // Copy 0 bytes; we're done
              if (end === start) return 0
              if (target.length === 0 || this.length === 0) return 0

              // Fatal error conditions
              if (targetStart < 0) {
                throw new RangeError('targetStart out of bounds')
              }
              if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
              if (end < 0) throw new RangeError('sourceEnd out of bounds')

              // Are we oob?
              if (end > this.length) end = this.length;
              if (target.length - targetStart < end - start) {
                end = target.length - targetStart + start;
              }

              var len = end - start;
              var i;

              if (this === target && start < targetStart && targetStart < end) {
                // descending copy from end
                for (i = len - 1; i >= 0; --i) {
                  target[i + targetStart] = this[i + start];
                }
              } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
                // ascending copy from start
                for (i = 0; i < len; ++i) {
                  target[i + targetStart] = this[i + start];
                }
              } else {
                Uint8Array.prototype.set.call(
                  target,
                  this.subarray(start, start + len),
                  targetStart
                );
              }

              return len
            };

            // Usage:
            //    buffer.fill(number[, offset[, end]])
            //    buffer.fill(buffer[, offset[, end]])
            //    buffer.fill(string[, offset[, end]][, encoding])
            Buffer.prototype.fill = function fill (val, start, end, encoding) {
              // Handle string cases:
              if (typeof val === 'string') {
                if (typeof start === 'string') {
                  encoding = start;
                  start = 0;
                  end = this.length;
                } else if (typeof end === 'string') {
                  encoding = end;
                  end = this.length;
                }
                if (val.length === 1) {
                  var code = val.charCodeAt(0);
                  if (code < 256) {
                    val = code;
                  }
                }
                if (encoding !== undefined && typeof encoding !== 'string') {
                  throw new TypeError('encoding must be a string')
                }
                if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
                  throw new TypeError('Unknown encoding: ' + encoding)
                }
              } else if (typeof val === 'number') {
                val = val & 255;
              }

              // Invalid ranges are not set to a default, so can range check early.
              if (start < 0 || this.length < start || this.length < end) {
                throw new RangeError('Out of range index')
              }

              if (end <= start) {
                return this
              }

              start = start >>> 0;
              end = end === undefined ? this.length : end >>> 0;

              if (!val) val = 0;

              var i;
              if (typeof val === 'number') {
                for (i = start; i < end; ++i) {
                  this[i] = val;
                }
              } else {
                var bytes = internalIsBuffer(val)
                  ? val
                  : utf8ToBytes(new Buffer(val, encoding).toString());
                var len = bytes.length;
                for (i = 0; i < end - start; ++i) {
                  this[i + start] = bytes[i % len];
                }
              }

              return this
            };

            // HELPER FUNCTIONS
            // ================

            var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

            function base64clean (str) {
              // Node strips out invalid characters like \n and \t from the string, base64-js does not
              str = stringtrim(str).replace(INVALID_BASE64_RE, '');
              // Node converts strings with length < 2 to ''
              if (str.length < 2) return ''
              // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
              while (str.length % 4 !== 0) {
                str = str + '=';
              }
              return str
            }

            function stringtrim (str) {
              if (str.trim) return str.trim()
              return str.replace(/^\s+|\s+$/g, '')
            }

            function toHex (n) {
              if (n < 16) return '0' + n.toString(16)
              return n.toString(16)
            }

            function utf8ToBytes (string, units) {
              units = units || Infinity;
              var codePoint;
              var length = string.length;
              var leadSurrogate = null;
              var bytes = [];

              for (var i = 0; i < length; ++i) {
                codePoint = string.charCodeAt(i);

                // is surrogate component
                if (codePoint > 0xD7FF && codePoint < 0xE000) {
                  // last char was a lead
                  if (!leadSurrogate) {
                    // no lead yet
                    if (codePoint > 0xDBFF) {
                      // unexpected trail
                      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                      continue
                    } else if (i + 1 === length) {
                      // unpaired lead
                      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                      continue
                    }

                    // valid lead
                    leadSurrogate = codePoint;

                    continue
                  }

                  // 2 leads in a row
                  if (codePoint < 0xDC00) {
                    if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                    leadSurrogate = codePoint;
                    continue
                  }

                  // valid surrogate pair
                  codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
                } else if (leadSurrogate) {
                  // valid bmp char, but last char was a lead
                  if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                }

                leadSurrogate = null;

                // encode utf8
                if (codePoint < 0x80) {
                  if ((units -= 1) < 0) break
                  bytes.push(codePoint);
                } else if (codePoint < 0x800) {
                  if ((units -= 2) < 0) break
                  bytes.push(
                    codePoint >> 0x6 | 0xC0,
                    codePoint & 0x3F | 0x80
                  );
                } else if (codePoint < 0x10000) {
                  if ((units -= 3) < 0) break
                  bytes.push(
                    codePoint >> 0xC | 0xE0,
                    codePoint >> 0x6 & 0x3F | 0x80,
                    codePoint & 0x3F | 0x80
                  );
                } else if (codePoint < 0x110000) {
                  if ((units -= 4) < 0) break
                  bytes.push(
                    codePoint >> 0x12 | 0xF0,
                    codePoint >> 0xC & 0x3F | 0x80,
                    codePoint >> 0x6 & 0x3F | 0x80,
                    codePoint & 0x3F | 0x80
                  );
                } else {
                  throw new Error('Invalid code point')
                }
              }

              return bytes
            }

            function asciiToBytes (str) {
              var byteArray = [];
              for (var i = 0; i < str.length; ++i) {
                // Node's code seems to be doing this and not & 0x7F..
                byteArray.push(str.charCodeAt(i) & 0xFF);
              }
              return byteArray
            }

            function utf16leToBytes (str, units) {
              var c, hi, lo;
              var byteArray = [];
              for (var i = 0; i < str.length; ++i) {
                if ((units -= 2) < 0) break

                c = str.charCodeAt(i);
                hi = c >> 8;
                lo = c % 256;
                byteArray.push(lo);
                byteArray.push(hi);
              }

              return byteArray
            }


            function base64ToBytes (str) {
              return toByteArray(base64clean(str))
            }

            function blitBuffer (src, dst, offset, length) {
              for (var i = 0; i < length; ++i) {
                if ((i + offset >= dst.length) || (i >= src.length)) break
                dst[i + offset] = src[i];
              }
              return i
            }

            function isnan (val) {
              return val !== val // eslint-disable-line no-self-compare
            }


            // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
            // The _isBuffer check is for Safari 5-7 support, because it's missing
            // Object.prototype.constructor. Remove this eventually
            function isBuffer(obj) {
              return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
            }

            function isFastBuffer (obj) {
              return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
            }

            // For Node v0.10 support. Remove this eventually.
            function isSlowBuffer (obj) {
              return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
            }

            var domain;

            // This constructor is used to store event handlers. Instantiating this is
            // faster than explicitly calling `Object.create(null)` to get a "clean" empty
            // object (tested with v8 v4.9).
            function EventHandlers() {}
            EventHandlers.prototype = Object.create(null);

            function EventEmitter() {
              EventEmitter.init.call(this);
            }

            // nodejs oddity
            // require('events') === require('events').EventEmitter
            EventEmitter.EventEmitter = EventEmitter;

            EventEmitter.usingDomains = false;

            EventEmitter.prototype.domain = undefined;
            EventEmitter.prototype._events = undefined;
            EventEmitter.prototype._maxListeners = undefined;

            // By default EventEmitters will print a warning if more than 10 listeners are
            // added to it. This is a useful default which helps finding memory leaks.
            EventEmitter.defaultMaxListeners = 10;

            EventEmitter.init = function() {
              this.domain = null;
              if (EventEmitter.usingDomains) {
                // if there is an active domain, then attach to it.
                if (domain.active ) ;
              }

              if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
                this._events = new EventHandlers();
                this._eventsCount = 0;
              }

              this._maxListeners = this._maxListeners || undefined;
            };

            // Obviously not all Emitters should be limited to 10. This function allows
            // that to be increased. Set to zero for unlimited.
            EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
              if (typeof n !== 'number' || n < 0 || isNaN(n))
                throw new TypeError('"n" argument must be a positive number');
              this._maxListeners = n;
              return this;
            };

            function $getMaxListeners(that) {
              if (that._maxListeners === undefined)
                return EventEmitter.defaultMaxListeners;
              return that._maxListeners;
            }

            EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
              return $getMaxListeners(this);
            };

            // These standalone emit* functions are used to optimize calling of event
            // handlers for fast cases because emit() itself often has a variable number of
            // arguments and can be deoptimized because of that. These functions always have
            // the same number of arguments and thus do not get deoptimized, so the code
            // inside them can execute faster.
            function emitNone(handler, isFn, self) {
              if (isFn)
                handler.call(self);
              else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                  listeners[i].call(self);
              }
            }
            function emitOne(handler, isFn, self, arg1) {
              if (isFn)
                handler.call(self, arg1);
              else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                  listeners[i].call(self, arg1);
              }
            }
            function emitTwo(handler, isFn, self, arg1, arg2) {
              if (isFn)
                handler.call(self, arg1, arg2);
              else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                  listeners[i].call(self, arg1, arg2);
              }
            }
            function emitThree(handler, isFn, self, arg1, arg2, arg3) {
              if (isFn)
                handler.call(self, arg1, arg2, arg3);
              else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                  listeners[i].call(self, arg1, arg2, arg3);
              }
            }

            function emitMany(handler, isFn, self, args) {
              if (isFn)
                handler.apply(self, args);
              else {
                var len = handler.length;
                var listeners = arrayClone(handler, len);
                for (var i = 0; i < len; ++i)
                  listeners[i].apply(self, args);
              }
            }

            EventEmitter.prototype.emit = function emit(type) {
              var er, handler, len, args, i, events, domain;
              var doError = (type === 'error');

              events = this._events;
              if (events)
                doError = (doError && events.error == null);
              else if (!doError)
                return false;

              domain = this.domain;

              // If there is no 'error' event listener then throw.
              if (doError) {
                er = arguments[1];
                if (domain) {
                  if (!er)
                    er = new Error('Uncaught, unspecified "error" event');
                  er.domainEmitter = this;
                  er.domain = domain;
                  er.domainThrown = false;
                  domain.emit('error', er);
                } else if (er instanceof Error) {
                  throw er; // Unhandled 'error' event
                } else {
                  // At least give some kind of context to the user
                  var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
                  err.context = er;
                  throw err;
                }
                return false;
              }

              handler = events[type];

              if (!handler)
                return false;

              var isFn = typeof handler === 'function';
              len = arguments.length;
              switch (len) {
                // fast cases
                case 1:
                  emitNone(handler, isFn, this);
                  break;
                case 2:
                  emitOne(handler, isFn, this, arguments[1]);
                  break;
                case 3:
                  emitTwo(handler, isFn, this, arguments[1], arguments[2]);
                  break;
                case 4:
                  emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
                  break;
                // slower
                default:
                  args = new Array(len - 1);
                  for (i = 1; i < len; i++)
                    args[i - 1] = arguments[i];
                  emitMany(handler, isFn, this, args);
              }

              return true;
            };

            function _addListener(target, type, listener, prepend) {
              var m;
              var events;
              var existing;

              if (typeof listener !== 'function')
                throw new TypeError('"listener" argument must be a function');

              events = target._events;
              if (!events) {
                events = target._events = new EventHandlers();
                target._eventsCount = 0;
              } else {
                // To avoid recursion in the case that type === "newListener"! Before
                // adding it to the listeners, first emit "newListener".
                if (events.newListener) {
                  target.emit('newListener', type,
                              listener.listener ? listener.listener : listener);

                  // Re-assign `events` because a newListener handler could have caused the
                  // this._events to be assigned to a new object
                  events = target._events;
                }
                existing = events[type];
              }

              if (!existing) {
                // Optimize the case of one listener. Don't need the extra array object.
                existing = events[type] = listener;
                ++target._eventsCount;
              } else {
                if (typeof existing === 'function') {
                  // Adding the second element, need to change to array.
                  existing = events[type] = prepend ? [listener, existing] :
                                                      [existing, listener];
                } else {
                  // If we've already got an array, just append.
                  if (prepend) {
                    existing.unshift(listener);
                  } else {
                    existing.push(listener);
                  }
                }

                // Check for listener leak
                if (!existing.warned) {
                  m = $getMaxListeners(target);
                  if (m && m > 0 && existing.length > m) {
                    existing.warned = true;
                    var w = new Error('Possible EventEmitter memory leak detected. ' +
                                        existing.length + ' ' + type + ' listeners added. ' +
                                        'Use emitter.setMaxListeners() to increase limit');
                    w.name = 'MaxListenersExceededWarning';
                    w.emitter = target;
                    w.type = type;
                    w.count = existing.length;
                    emitWarning(w);
                  }
                }
              }

              return target;
            }
            function emitWarning(e) {
              typeof console.warn === 'function' ? console.warn(e) : console.log(e);
            }
            EventEmitter.prototype.addListener = function addListener(type, listener) {
              return _addListener(this, type, listener, false);
            };

            EventEmitter.prototype.on = EventEmitter.prototype.addListener;

            EventEmitter.prototype.prependListener =
                function prependListener(type, listener) {
                  return _addListener(this, type, listener, true);
                };

            function _onceWrap(target, type, listener) {
              var fired = false;
              function g() {
                target.removeListener(type, g);
                if (!fired) {
                  fired = true;
                  listener.apply(target, arguments);
                }
              }
              g.listener = listener;
              return g;
            }

            EventEmitter.prototype.once = function once(type, listener) {
              if (typeof listener !== 'function')
                throw new TypeError('"listener" argument must be a function');
              this.on(type, _onceWrap(this, type, listener));
              return this;
            };

            EventEmitter.prototype.prependOnceListener =
                function prependOnceListener(type, listener) {
                  if (typeof listener !== 'function')
                    throw new TypeError('"listener" argument must be a function');
                  this.prependListener(type, _onceWrap(this, type, listener));
                  return this;
                };

            // emits a 'removeListener' event iff the listener was removed
            EventEmitter.prototype.removeListener =
                function removeListener(type, listener) {
                  var list, events, position, i, originalListener;

                  if (typeof listener !== 'function')
                    throw new TypeError('"listener" argument must be a function');

                  events = this._events;
                  if (!events)
                    return this;

                  list = events[type];
                  if (!list)
                    return this;

                  if (list === listener || (list.listener && list.listener === listener)) {
                    if (--this._eventsCount === 0)
                      this._events = new EventHandlers();
                    else {
                      delete events[type];
                      if (events.removeListener)
                        this.emit('removeListener', type, list.listener || listener);
                    }
                  } else if (typeof list !== 'function') {
                    position = -1;

                    for (i = list.length; i-- > 0;) {
                      if (list[i] === listener ||
                          (list[i].listener && list[i].listener === listener)) {
                        originalListener = list[i].listener;
                        position = i;
                        break;
                      }
                    }

                    if (position < 0)
                      return this;

                    if (list.length === 1) {
                      list[0] = undefined;
                      if (--this._eventsCount === 0) {
                        this._events = new EventHandlers();
                        return this;
                      } else {
                        delete events[type];
                      }
                    } else {
                      spliceOne(list, position);
                    }

                    if (events.removeListener)
                      this.emit('removeListener', type, originalListener || listener);
                  }

                  return this;
                };

            EventEmitter.prototype.removeAllListeners =
                function removeAllListeners(type) {
                  var listeners, events;

                  events = this._events;
                  if (!events)
                    return this;

                  // not listening for removeListener, no need to emit
                  if (!events.removeListener) {
                    if (arguments.length === 0) {
                      this._events = new EventHandlers();
                      this._eventsCount = 0;
                    } else if (events[type]) {
                      if (--this._eventsCount === 0)
                        this._events = new EventHandlers();
                      else
                        delete events[type];
                    }
                    return this;
                  }

                  // emit removeListener for all listeners on all events
                  if (arguments.length === 0) {
                    var keys = Object.keys(events);
                    for (var i = 0, key; i < keys.length; ++i) {
                      key = keys[i];
                      if (key === 'removeListener') continue;
                      this.removeAllListeners(key);
                    }
                    this.removeAllListeners('removeListener');
                    this._events = new EventHandlers();
                    this._eventsCount = 0;
                    return this;
                  }

                  listeners = events[type];

                  if (typeof listeners === 'function') {
                    this.removeListener(type, listeners);
                  } else if (listeners) {
                    // LIFO order
                    do {
                      this.removeListener(type, listeners[listeners.length - 1]);
                    } while (listeners[0]);
                  }

                  return this;
                };

            EventEmitter.prototype.listeners = function listeners(type) {
              var evlistener;
              var ret;
              var events = this._events;

              if (!events)
                ret = [];
              else {
                evlistener = events[type];
                if (!evlistener)
                  ret = [];
                else if (typeof evlistener === 'function')
                  ret = [evlistener.listener || evlistener];
                else
                  ret = unwrapListeners(evlistener);
              }

              return ret;
            };

            EventEmitter.listenerCount = function(emitter, type) {
              if (typeof emitter.listenerCount === 'function') {
                return emitter.listenerCount(type);
              } else {
                return listenerCount$1.call(emitter, type);
              }
            };

            EventEmitter.prototype.listenerCount = listenerCount$1;
            function listenerCount$1(type) {
              var events = this._events;

              if (events) {
                var evlistener = events[type];

                if (typeof evlistener === 'function') {
                  return 1;
                } else if (evlistener) {
                  return evlistener.length;
                }
              }

              return 0;
            }

            EventEmitter.prototype.eventNames = function eventNames() {
              return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
            };

            // About 1.5x faster than the two-arg version of Array#splice().
            function spliceOne(list, index) {
              for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
                list[i] = list[k];
              list.pop();
            }

            function arrayClone(arr, i) {
              var copy = new Array(i);
              while (i--)
                copy[i] = arr[i];
              return copy;
            }

            function unwrapListeners(arr) {
              var ret = new Array(arr.length);
              for (var i = 0; i < ret.length; ++i) {
                ret[i] = arr[i].listener || arr[i];
              }
              return ret;
            }

            // shim for using process in browser
            // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

            function defaultSetTimout() {
                throw new Error('setTimeout has not been defined');
            }
            function defaultClearTimeout () {
                throw new Error('clearTimeout has not been defined');
            }
            var cachedSetTimeout = defaultSetTimout;
            var cachedClearTimeout = defaultClearTimeout;
            if (typeof global$1.setTimeout === 'function') {
                cachedSetTimeout = setTimeout;
            }
            if (typeof global$1.clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout;
            }

            function runTimeout(fun) {
                if (cachedSetTimeout === setTimeout) {
                    //normal enviroments in sane situations
                    return setTimeout(fun, 0);
                }
                // if setTimeout wasn't available but was latter defined
                if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                    cachedSetTimeout = setTimeout;
                    return setTimeout(fun, 0);
                }
                try {
                    // when when somebody has screwed with setTimeout but no I.E. maddness
                    return cachedSetTimeout(fun, 0);
                } catch(e){
                    try {
                        // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                        return cachedSetTimeout.call(null, fun, 0);
                    } catch(e){
                        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                        return cachedSetTimeout.call(this, fun, 0);
                    }
                }


            }
            function runClearTimeout(marker) {
                if (cachedClearTimeout === clearTimeout) {
                    //normal enviroments in sane situations
                    return clearTimeout(marker);
                }
                // if clearTimeout wasn't available but was latter defined
                if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                    cachedClearTimeout = clearTimeout;
                    return clearTimeout(marker);
                }
                try {
                    // when when somebody has screwed with setTimeout but no I.E. maddness
                    return cachedClearTimeout(marker);
                } catch (e){
                    try {
                        // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                        return cachedClearTimeout.call(null, marker);
                    } catch (e){
                        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                        // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                        return cachedClearTimeout.call(this, marker);
                    }
                }



            }
            var queue = [];
            var draining = false;
            var currentQueue;
            var queueIndex = -1;

            function cleanUpNextTick() {
                if (!draining || !currentQueue) {
                    return;
                }
                draining = false;
                if (currentQueue.length) {
                    queue = currentQueue.concat(queue);
                } else {
                    queueIndex = -1;
                }
                if (queue.length) {
                    drainQueue();
                }
            }

            function drainQueue() {
                if (draining) {
                    return;
                }
                var timeout = runTimeout(cleanUpNextTick);
                draining = true;

                var len = queue.length;
                while(len) {
                    currentQueue = queue;
                    queue = [];
                    while (++queueIndex < len) {
                        if (currentQueue) {
                            currentQueue[queueIndex].run();
                        }
                    }
                    queueIndex = -1;
                    len = queue.length;
                }
                currentQueue = null;
                draining = false;
                runClearTimeout(timeout);
            }
            function nextTick(fun) {
                var args = new Array(arguments.length - 1);
                if (arguments.length > 1) {
                    for (var i = 1; i < arguments.length; i++) {
                        args[i - 1] = arguments[i];
                    }
                }
                queue.push(new Item(fun, args));
                if (queue.length === 1 && !draining) {
                    runTimeout(drainQueue);
                }
            }
            // v8 likes predictible objects
            function Item(fun, array) {
                this.fun = fun;
                this.array = array;
            }
            Item.prototype.run = function () {
                this.fun.apply(null, this.array);
            };
            var title = 'browser';
            var platform = 'browser';
            var browser = true;
            var env = {};
            var argv = [];
            var version = ''; // empty string to avoid regexp issues
            var versions = {};
            var release = {};
            var config = {};

            function noop() {}

            var on = noop;
            var addListener = noop;
            var once = noop;
            var off = noop;
            var removeListener = noop;
            var removeAllListeners = noop;
            var emit = noop;

            function binding(name) {
                throw new Error('process.binding is not supported');
            }

            function cwd () { return '/' }
            function chdir (dir) {
                throw new Error('process.chdir is not supported');
            }function umask() { return 0; }

            // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
            var performance = global$1.performance || {};
            var performanceNow =
              performance.now        ||
              performance.mozNow     ||
              performance.msNow      ||
              performance.oNow       ||
              performance.webkitNow  ||
              function(){ return (new Date()).getTime() };

            // generate timestamp or delta
            // see http://nodejs.org/api/process.html#process_process_hrtime
            function hrtime(previousTimestamp){
              var clocktime = performanceNow.call(performance)*1e-3;
              var seconds = Math.floor(clocktime);
              var nanoseconds = Math.floor((clocktime%1)*1e9);
              if (previousTimestamp) {
                seconds = seconds - previousTimestamp[0];
                nanoseconds = nanoseconds - previousTimestamp[1];
                if (nanoseconds<0) {
                  seconds--;
                  nanoseconds += 1e9;
                }
              }
              return [seconds,nanoseconds]
            }

            var startTime = new Date();
            function uptime() {
              var currentTime = new Date();
              var dif = currentTime - startTime;
              return dif / 1000;
            }

            var process = {
              nextTick: nextTick,
              title: title,
              browser: browser,
              env: env,
              argv: argv,
              version: version,
              versions: versions,
              on: on,
              addListener: addListener,
              once: once,
              off: off,
              removeListener: removeListener,
              removeAllListeners: removeAllListeners,
              emit: emit,
              binding: binding,
              cwd: cwd,
              chdir: chdir,
              umask: umask,
              hrtime: hrtime,
              platform: platform,
              release: release,
              config: config,
              uptime: uptime
            };

            var inherits;
            if (typeof Object.create === 'function'){
              inherits = function inherits(ctor, superCtor) {
                // implementation from standard node.js 'util' module
                ctor.super_ = superCtor;
                ctor.prototype = Object.create(superCtor.prototype, {
                  constructor: {
                    value: ctor,
                    enumerable: false,
                    writable: true,
                    configurable: true
                  }
                });
              };
            } else {
              inherits = function inherits(ctor, superCtor) {
                ctor.super_ = superCtor;
                var TempCtor = function () {};
                TempCtor.prototype = superCtor.prototype;
                ctor.prototype = new TempCtor();
                ctor.prototype.constructor = ctor;
              };
            }
            var inherits$1 = inherits;

            var formatRegExp = /%[sdj%]/g;
            function format(f) {
              if (!isString(f)) {
                var objects = [];
                for (var i = 0; i < arguments.length; i++) {
                  objects.push(inspect(arguments[i]));
                }
                return objects.join(' ');
              }

              var i = 1;
              var args = arguments;
              var len = args.length;
              var str = String(f).replace(formatRegExp, function(x) {
                if (x === '%%') return '%';
                if (i >= len) return x;
                switch (x) {
                  case '%s': return String(args[i++]);
                  case '%d': return Number(args[i++]);
                  case '%j':
                    try {
                      return JSON.stringify(args[i++]);
                    } catch (_) {
                      return '[Circular]';
                    }
                  default:
                    return x;
                }
              });
              for (var x = args[i]; i < len; x = args[++i]) {
                if (isNull(x) || !isObject(x)) {
                  str += ' ' + x;
                } else {
                  str += ' ' + inspect(x);
                }
              }
              return str;
            }

            // Mark that a method should not be used.
            // Returns a modified function which warns once by default.
            // If --no-deprecation is set, then it is a no-op.
            function deprecate(fn, msg) {
              // Allow for deprecating things in the process of starting up.
              if (isUndefined(global$1.process)) {
                return function() {
                  return deprecate(fn, msg).apply(this, arguments);
                };
              }

              if (process.noDeprecation === true) {
                return fn;
              }

              var warned = false;
              function deprecated() {
                if (!warned) {
                  if (process.throwDeprecation) {
                    throw new Error(msg);
                  } else if (process.traceDeprecation) {
                    console.trace(msg);
                  } else {
                    console.error(msg);
                  }
                  warned = true;
                }
                return fn.apply(this, arguments);
              }

              return deprecated;
            }

            var debugs = {};
            var debugEnviron;
            function debuglog(set) {
              if (isUndefined(debugEnviron))
                debugEnviron = process.env.NODE_DEBUG || '';
              set = set.toUpperCase();
              if (!debugs[set]) {
                if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
                  var pid = 0;
                  debugs[set] = function() {
                    var msg = format.apply(null, arguments);
                    console.error('%s %d: %s', set, pid, msg);
                  };
                } else {
                  debugs[set] = function() {};
                }
              }
              return debugs[set];
            }

            /**
             * Echos the value of a value. Trys to print the value out
             * in the best way possible given the different types.
             *
             * @param {Object} obj The object to print out.
             * @param {Object} opts Optional options object that alters the output.
             */
            /* legacy: obj, showHidden, depth, colors*/
            function inspect(obj, opts) {
              // default options
              var ctx = {
                seen: [],
                stylize: stylizeNoColor
              };
              // legacy...
              if (arguments.length >= 3) ctx.depth = arguments[2];
              if (arguments.length >= 4) ctx.colors = arguments[3];
              if (isBoolean(opts)) {
                // legacy...
                ctx.showHidden = opts;
              } else if (opts) {
                // got an "options" object
                _extend(ctx, opts);
              }
              // set default options
              if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
              if (isUndefined(ctx.depth)) ctx.depth = 2;
              if (isUndefined(ctx.colors)) ctx.colors = false;
              if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
              if (ctx.colors) ctx.stylize = stylizeWithColor;
              return formatValue(ctx, obj, ctx.depth);
            }

            // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
            inspect.colors = {
              'bold' : [1, 22],
              'italic' : [3, 23],
              'underline' : [4, 24],
              'inverse' : [7, 27],
              'white' : [37, 39],
              'grey' : [90, 39],
              'black' : [30, 39],
              'blue' : [34, 39],
              'cyan' : [36, 39],
              'green' : [32, 39],
              'magenta' : [35, 39],
              'red' : [31, 39],
              'yellow' : [33, 39]
            };

            // Don't use 'blue' not visible on cmd.exe
            inspect.styles = {
              'special': 'cyan',
              'number': 'yellow',
              'boolean': 'yellow',
              'undefined': 'grey',
              'null': 'bold',
              'string': 'green',
              'date': 'magenta',
              // "name": intentionally not styling
              'regexp': 'red'
            };


            function stylizeWithColor(str, styleType) {
              var style = inspect.styles[styleType];

              if (style) {
                return '\u001b[' + inspect.colors[style][0] + 'm' + str +
                       '\u001b[' + inspect.colors[style][1] + 'm';
              } else {
                return str;
              }
            }


            function stylizeNoColor(str, styleType) {
              return str;
            }


            function arrayToHash(array) {
              var hash = {};

              array.forEach(function(val, idx) {
                hash[val] = true;
              });

              return hash;
            }


            function formatValue(ctx, value, recurseTimes) {
              // Provide a hook for user-specified inspect functions.
              // Check that value is an object with an inspect function on it
              if (ctx.customInspect &&
                  value &&
                  isFunction(value.inspect) &&
                  // Filter out the util module, it's inspect function is special
                  value.inspect !== inspect &&
                  // Also filter out any prototype objects using the circular check.
                  !(value.constructor && value.constructor.prototype === value)) {
                var ret = value.inspect(recurseTimes, ctx);
                if (!isString(ret)) {
                  ret = formatValue(ctx, ret, recurseTimes);
                }
                return ret;
              }

              // Primitive types cannot have properties
              var primitive = formatPrimitive(ctx, value);
              if (primitive) {
                return primitive;
              }

              // Look up the keys of the object.
              var keys = Object.keys(value);
              var visibleKeys = arrayToHash(keys);

              if (ctx.showHidden) {
                keys = Object.getOwnPropertyNames(value);
              }

              // IE doesn't make error fields non-enumerable
              // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
              if (isError(value)
                  && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
                return formatError(value);
              }

              // Some type of object without properties can be shortcutted.
              if (keys.length === 0) {
                if (isFunction(value)) {
                  var name = value.name ? ': ' + value.name : '';
                  return ctx.stylize('[Function' + name + ']', 'special');
                }
                if (isRegExp(value)) {
                  return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                }
                if (isDate(value)) {
                  return ctx.stylize(Date.prototype.toString.call(value), 'date');
                }
                if (isError(value)) {
                  return formatError(value);
                }
              }

              var base = '', array = false, braces = ['{', '}'];

              // Make Array say that they are Array
              if (isArray(value)) {
                array = true;
                braces = ['[', ']'];
              }

              // Make functions say that they are functions
              if (isFunction(value)) {
                var n = value.name ? ': ' + value.name : '';
                base = ' [Function' + n + ']';
              }

              // Make RegExps say that they are RegExps
              if (isRegExp(value)) {
                base = ' ' + RegExp.prototype.toString.call(value);
              }

              // Make dates with properties first say the date
              if (isDate(value)) {
                base = ' ' + Date.prototype.toUTCString.call(value);
              }

              // Make error with message first say the error
              if (isError(value)) {
                base = ' ' + formatError(value);
              }

              if (keys.length === 0 && (!array || value.length == 0)) {
                return braces[0] + base + braces[1];
              }

              if (recurseTimes < 0) {
                if (isRegExp(value)) {
                  return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                } else {
                  return ctx.stylize('[Object]', 'special');
                }
              }

              ctx.seen.push(value);

              var output;
              if (array) {
                output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
              } else {
                output = keys.map(function(key) {
                  return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
                });
              }

              ctx.seen.pop();

              return reduceToSingleString(output, base, braces);
            }


            function formatPrimitive(ctx, value) {
              if (isUndefined(value))
                return ctx.stylize('undefined', 'undefined');
              if (isString(value)) {
                var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                         .replace(/'/g, "\\'")
                                                         .replace(/\\"/g, '"') + '\'';
                return ctx.stylize(simple, 'string');
              }
              if (isNumber(value))
                return ctx.stylize('' + value, 'number');
              if (isBoolean(value))
                return ctx.stylize('' + value, 'boolean');
              // For some reason typeof null is "object", so special case here.
              if (isNull(value))
                return ctx.stylize('null', 'null');
            }


            function formatError(value) {
              return '[' + Error.prototype.toString.call(value) + ']';
            }


            function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
              var output = [];
              for (var i = 0, l = value.length; i < l; ++i) {
                if (hasOwnProperty(value, String(i))) {
                  output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                      String(i), true));
                } else {
                  output.push('');
                }
              }
              keys.forEach(function(key) {
                if (!key.match(/^\d+$/)) {
                  output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                      key, true));
                }
              });
              return output;
            }


            function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
              var name, str, desc;
              desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
              if (desc.get) {
                if (desc.set) {
                  str = ctx.stylize('[Getter/Setter]', 'special');
                } else {
                  str = ctx.stylize('[Getter]', 'special');
                }
              } else {
                if (desc.set) {
                  str = ctx.stylize('[Setter]', 'special');
                }
              }
              if (!hasOwnProperty(visibleKeys, key)) {
                name = '[' + key + ']';
              }
              if (!str) {
                if (ctx.seen.indexOf(desc.value) < 0) {
                  if (isNull(recurseTimes)) {
                    str = formatValue(ctx, desc.value, null);
                  } else {
                    str = formatValue(ctx, desc.value, recurseTimes - 1);
                  }
                  if (str.indexOf('\n') > -1) {
                    if (array) {
                      str = str.split('\n').map(function(line) {
                        return '  ' + line;
                      }).join('\n').substr(2);
                    } else {
                      str = '\n' + str.split('\n').map(function(line) {
                        return '   ' + line;
                      }).join('\n');
                    }
                  }
                } else {
                  str = ctx.stylize('[Circular]', 'special');
                }
              }
              if (isUndefined(name)) {
                if (array && key.match(/^\d+$/)) {
                  return str;
                }
                name = JSON.stringify('' + key);
                if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                  name = name.substr(1, name.length - 2);
                  name = ctx.stylize(name, 'name');
                } else {
                  name = name.replace(/'/g, "\\'")
                             .replace(/\\"/g, '"')
                             .replace(/(^"|"$)/g, "'");
                  name = ctx.stylize(name, 'string');
                }
              }

              return name + ': ' + str;
            }


            function reduceToSingleString(output, base, braces) {
              var length = output.reduce(function(prev, cur) {
                if (cur.indexOf('\n') >= 0) ;
                return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
              }, 0);

              if (length > 60) {
                return braces[0] +
                       (base === '' ? '' : base + '\n ') +
                       ' ' +
                       output.join(',\n  ') +
                       ' ' +
                       braces[1];
              }

              return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
            }


            // NOTE: These type checking functions intentionally don't use `instanceof`
            // because it is fragile and can be easily faked with `Object.create()`.
            function isArray(ar) {
              return Array.isArray(ar);
            }

            function isBoolean(arg) {
              return typeof arg === 'boolean';
            }

            function isNull(arg) {
              return arg === null;
            }

            function isNumber(arg) {
              return typeof arg === 'number';
            }

            function isString(arg) {
              return typeof arg === 'string';
            }

            function isUndefined(arg) {
              return arg === void 0;
            }

            function isRegExp(re) {
              return isObject(re) && objectToString(re) === '[object RegExp]';
            }

            function isObject(arg) {
              return typeof arg === 'object' && arg !== null;
            }

            function isDate(d) {
              return isObject(d) && objectToString(d) === '[object Date]';
            }

            function isError(e) {
              return isObject(e) &&
                  (objectToString(e) === '[object Error]' || e instanceof Error);
            }

            function isFunction(arg) {
              return typeof arg === 'function';
            }

            function objectToString(o) {
              return Object.prototype.toString.call(o);
            }

            function _extend(origin, add) {
              // Don't do anything if add isn't an object
              if (!add || !isObject(add)) return origin;

              var keys = Object.keys(add);
              var i = keys.length;
              while (i--) {
                origin[keys[i]] = add[keys[i]];
              }
              return origin;
            }
            function hasOwnProperty(obj, prop) {
              return Object.prototype.hasOwnProperty.call(obj, prop);
            }

            function BufferList() {
              this.head = null;
              this.tail = null;
              this.length = 0;
            }

            BufferList.prototype.push = function (v) {
              var entry = { data: v, next: null };
              if (this.length > 0) this.tail.next = entry;else this.head = entry;
              this.tail = entry;
              ++this.length;
            };

            BufferList.prototype.unshift = function (v) {
              var entry = { data: v, next: this.head };
              if (this.length === 0) this.tail = entry;
              this.head = entry;
              ++this.length;
            };

            BufferList.prototype.shift = function () {
              if (this.length === 0) return;
              var ret = this.head.data;
              if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
              --this.length;
              return ret;
            };

            BufferList.prototype.clear = function () {
              this.head = this.tail = null;
              this.length = 0;
            };

            BufferList.prototype.join = function (s) {
              if (this.length === 0) return '';
              var p = this.head;
              var ret = '' + p.data;
              while (p = p.next) {
                ret += s + p.data;
              }return ret;
            };

            BufferList.prototype.concat = function (n) {
              if (this.length === 0) return Buffer.alloc(0);
              if (this.length === 1) return this.head.data;
              var ret = Buffer.allocUnsafe(n >>> 0);
              var p = this.head;
              var i = 0;
              while (p) {
                p.data.copy(ret, i);
                i += p.data.length;
                p = p.next;
              }
              return ret;
            };

            // Copyright Joyent, Inc. and other Node contributors.
            //
            // Permission is hereby granted, free of charge, to any person obtaining a
            // copy of this software and associated documentation files (the
            // "Software"), to deal in the Software without restriction, including
            // without limitation the rights to use, copy, modify, merge, publish,
            // distribute, sublicense, and/or sell copies of the Software, and to permit
            // persons to whom the Software is furnished to do so, subject to the
            // following conditions:
            //
            // The above copyright notice and this permission notice shall be included
            // in all copies or substantial portions of the Software.
            //
            // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
            // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
            // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
            // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
            // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
            // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
            // USE OR OTHER DEALINGS IN THE SOFTWARE.

            var isBufferEncoding = Buffer.isEncoding
              || function(encoding) {
                   switch (encoding && encoding.toLowerCase()) {
                     case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
                     default: return false;
                   }
                 };


            function assertEncoding(encoding) {
              if (encoding && !isBufferEncoding(encoding)) {
                throw new Error('Unknown encoding: ' + encoding);
              }
            }

            // StringDecoder provides an interface for efficiently splitting a series of
            // buffers into a series of JS strings without breaking apart multi-byte
            // characters. CESU-8 is handled as part of the UTF-8 encoding.
            //
            // @TODO Handling all encodings inside a single object makes it very difficult
            // to reason about this code, so it should be split up in the future.
            // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
            // points as used by CESU-8.
            function StringDecoder(encoding) {
              this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
              assertEncoding(encoding);
              switch (this.encoding) {
                case 'utf8':
                  // CESU-8 represents each of Surrogate Pair by 3-bytes
                  this.surrogateSize = 3;
                  break;
                case 'ucs2':
                case 'utf16le':
                  // UTF-16 represents each of Surrogate Pair by 2-bytes
                  this.surrogateSize = 2;
                  this.detectIncompleteChar = utf16DetectIncompleteChar;
                  break;
                case 'base64':
                  // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
                  this.surrogateSize = 3;
                  this.detectIncompleteChar = base64DetectIncompleteChar;
                  break;
                default:
                  this.write = passThroughWrite;
                  return;
              }

              // Enough space to store all bytes of a single character. UTF-8 needs 4
              // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
              this.charBuffer = new Buffer(6);
              // Number of bytes received for the current incomplete multi-byte character.
              this.charReceived = 0;
              // Number of bytes expected for the current incomplete multi-byte character.
              this.charLength = 0;
            }

            // write decodes the given buffer and returns it as JS string that is
            // guaranteed to not contain any partial multi-byte characters. Any partial
            // character found at the end of the buffer is buffered up, and will be
            // returned when calling write again with the remaining bytes.
            //
            // Note: Converting a Buffer containing an orphan surrogate to a String
            // currently works, but converting a String to a Buffer (via `new Buffer`, or
            // Buffer#write) will replace incomplete surrogates with the unicode
            // replacement character. See https://codereview.chromium.org/121173009/ .
            StringDecoder.prototype.write = function(buffer) {
              var charStr = '';
              // if our last write ended with an incomplete multibyte character
              while (this.charLength) {
                // determine how many remaining bytes this buffer has to offer for this char
                var available = (buffer.length >= this.charLength - this.charReceived) ?
                    this.charLength - this.charReceived :
                    buffer.length;

                // add the new bytes to the char buffer
                buffer.copy(this.charBuffer, this.charReceived, 0, available);
                this.charReceived += available;

                if (this.charReceived < this.charLength) {
                  // still not enough chars in this buffer? wait for more ...
                  return '';
                }

                // remove bytes belonging to the current character from the buffer
                buffer = buffer.slice(available, buffer.length);

                // get the character that was split
                charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

                // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
                var charCode = charStr.charCodeAt(charStr.length - 1);
                if (charCode >= 0xD800 && charCode <= 0xDBFF) {
                  this.charLength += this.surrogateSize;
                  charStr = '';
                  continue;
                }
                this.charReceived = this.charLength = 0;

                // if there are no more bytes in this buffer, just emit our char
                if (buffer.length === 0) {
                  return charStr;
                }
                break;
              }

              // determine and set charLength / charReceived
              this.detectIncompleteChar(buffer);

              var end = buffer.length;
              if (this.charLength) {
                // buffer the incomplete character bytes we got
                buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
                end -= this.charReceived;
              }

              charStr += buffer.toString(this.encoding, 0, end);

              var end = charStr.length - 1;
              var charCode = charStr.charCodeAt(end);
              // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
              if (charCode >= 0xD800 && charCode <= 0xDBFF) {
                var size = this.surrogateSize;
                this.charLength += size;
                this.charReceived += size;
                this.charBuffer.copy(this.charBuffer, size, 0, size);
                buffer.copy(this.charBuffer, 0, 0, size);
                return charStr.substring(0, end);
              }

              // or just emit the charStr
              return charStr;
            };

            // detectIncompleteChar determines if there is an incomplete UTF-8 character at
            // the end of the given buffer. If so, it sets this.charLength to the byte
            // length that character, and sets this.charReceived to the number of bytes
            // that are available for this character.
            StringDecoder.prototype.detectIncompleteChar = function(buffer) {
              // determine how many bytes we have to check at the end of this buffer
              var i = (buffer.length >= 3) ? 3 : buffer.length;

              // Figure out if one of the last i bytes of our buffer announces an
              // incomplete char.
              for (; i > 0; i--) {
                var c = buffer[buffer.length - i];

                // See http://en.wikipedia.org/wiki/UTF-8#Description

                // 110XXXXX
                if (i == 1 && c >> 5 == 0x06) {
                  this.charLength = 2;
                  break;
                }

                // 1110XXXX
                if (i <= 2 && c >> 4 == 0x0E) {
                  this.charLength = 3;
                  break;
                }

                // 11110XXX
                if (i <= 3 && c >> 3 == 0x1E) {
                  this.charLength = 4;
                  break;
                }
              }
              this.charReceived = i;
            };

            StringDecoder.prototype.end = function(buffer) {
              var res = '';
              if (buffer && buffer.length)
                res = this.write(buffer);

              if (this.charReceived) {
                var cr = this.charReceived;
                var buf = this.charBuffer;
                var enc = this.encoding;
                res += buf.slice(0, cr).toString(enc);
              }

              return res;
            };

            function passThroughWrite(buffer) {
              return buffer.toString(this.encoding);
            }

            function utf16DetectIncompleteChar(buffer) {
              this.charReceived = buffer.length % 2;
              this.charLength = this.charReceived ? 2 : 0;
            }

            function base64DetectIncompleteChar(buffer) {
              this.charReceived = buffer.length % 3;
              this.charLength = this.charReceived ? 3 : 0;
            }

            Readable.ReadableState = ReadableState;

            var debug = debuglog('stream');
            inherits$1(Readable, EventEmitter);

            function prependListener(emitter, event, fn) {
              // Sadly this is not cacheable as some libraries bundle their own
              // event emitter implementation with them.
              if (typeof emitter.prependListener === 'function') {
                return emitter.prependListener(event, fn);
              } else {
                // This is a hack to make sure that our error handler is attached before any
                // userland ones.  NEVER DO THIS. This is here only because this code needs
                // to continue to work with older versions of Node.js that do not include
                // the prependListener() method. The goal is to eventually remove this hack.
                if (!emitter._events || !emitter._events[event])
                  emitter.on(event, fn);
                else if (Array.isArray(emitter._events[event]))
                  emitter._events[event].unshift(fn);
                else
                  emitter._events[event] = [fn, emitter._events[event]];
              }
            }
            function listenerCount (emitter, type) {
              return emitter.listeners(type).length;
            }
            function ReadableState(options, stream) {

              options = options || {};

              // object stream flag. Used to make read(n) ignore n and to
              // make all the buffer merging and length checks go away
              this.objectMode = !!options.objectMode;

              if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

              // the point at which it stops calling _read() to fill the buffer
              // Note: 0 is a valid value, means "don't call _read preemptively ever"
              var hwm = options.highWaterMark;
              var defaultHwm = this.objectMode ? 16 : 16 * 1024;
              this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

              // cast to ints.
              this.highWaterMark = ~ ~this.highWaterMark;

              // A linked list is used to store data chunks instead of an array because the
              // linked list can remove elements from the beginning faster than
              // array.shift()
              this.buffer = new BufferList();
              this.length = 0;
              this.pipes = null;
              this.pipesCount = 0;
              this.flowing = null;
              this.ended = false;
              this.endEmitted = false;
              this.reading = false;

              // a flag to be able to tell if the onwrite cb is called immediately,
              // or on a later tick.  We set this to true at first, because any
              // actions that shouldn't happen until "later" should generally also
              // not happen before the first write call.
              this.sync = true;

              // whenever we return null, then we set a flag to say
              // that we're awaiting a 'readable' event emission.
              this.needReadable = false;
              this.emittedReadable = false;
              this.readableListening = false;
              this.resumeScheduled = false;

              // Crypto is kind of old and crusty.  Historically, its default string
              // encoding is 'binary' so we have to make this configurable.
              // Everything else in the universe uses 'utf8', though.
              this.defaultEncoding = options.defaultEncoding || 'utf8';

              // when piping, we only care about 'readable' events that happen
              // after read()ing all the bytes and not getting any pushback.
              this.ranOut = false;

              // the number of writers that are awaiting a drain event in .pipe()s
              this.awaitDrain = 0;

              // if true, a maybeReadMore has been scheduled
              this.readingMore = false;

              this.decoder = null;
              this.encoding = null;
              if (options.encoding) {
                this.decoder = new StringDecoder(options.encoding);
                this.encoding = options.encoding;
              }
            }
            function Readable(options) {

              if (!(this instanceof Readable)) return new Readable(options);

              this._readableState = new ReadableState(options, this);

              // legacy
              this.readable = true;

              if (options && typeof options.read === 'function') this._read = options.read;

              EventEmitter.call(this);
            }

            // Manually shove something into the read() buffer.
            // This returns true if the highWaterMark has not been hit yet,
            // similar to how Writable.write() returns true if you should
            // write() some more.
            Readable.prototype.push = function (chunk, encoding) {
              var state = this._readableState;

              if (!state.objectMode && typeof chunk === 'string') {
                encoding = encoding || state.defaultEncoding;
                if (encoding !== state.encoding) {
                  chunk = Buffer.from(chunk, encoding);
                  encoding = '';
                }
              }

              return readableAddChunk(this, state, chunk, encoding, false);
            };

            // Unshift should *always* be something directly out of read()
            Readable.prototype.unshift = function (chunk) {
              var state = this._readableState;
              return readableAddChunk(this, state, chunk, '', true);
            };

            Readable.prototype.isPaused = function () {
              return this._readableState.flowing === false;
            };

            function readableAddChunk(stream, state, chunk, encoding, addToFront) {
              var er = chunkInvalid(state, chunk);
              if (er) {
                stream.emit('error', er);
              } else if (chunk === null) {
                state.reading = false;
                onEofChunk(stream, state);
              } else if (state.objectMode || chunk && chunk.length > 0) {
                if (state.ended && !addToFront) {
                  var e = new Error('stream.push() after EOF');
                  stream.emit('error', e);
                } else if (state.endEmitted && addToFront) {
                  var _e = new Error('stream.unshift() after end event');
                  stream.emit('error', _e);
                } else {
                  var skipAdd;
                  if (state.decoder && !addToFront && !encoding) {
                    chunk = state.decoder.write(chunk);
                    skipAdd = !state.objectMode && chunk.length === 0;
                  }

                  if (!addToFront) state.reading = false;

                  // Don't add to the buffer if we've decoded to an empty string chunk and
                  // we're not in object mode
                  if (!skipAdd) {
                    // if we want the data now, just emit it.
                    if (state.flowing && state.length === 0 && !state.sync) {
                      stream.emit('data', chunk);
                      stream.read(0);
                    } else {
                      // update the buffer info.
                      state.length += state.objectMode ? 1 : chunk.length;
                      if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

                      if (state.needReadable) emitReadable(stream);
                    }
                  }

                  maybeReadMore(stream, state);
                }
              } else if (!addToFront) {
                state.reading = false;
              }

              return needMoreData(state);
            }

            // if it's past the high water mark, we can push in some more.
            // Also, if we have no data yet, we can stand some
            // more bytes.  This is to work around cases where hwm=0,
            // such as the repl.  Also, if the push() triggered a
            // readable event, and the user called read(largeNumber) such that
            // needReadable was set, then we ought to push more, so that another
            // 'readable' event will be triggered.
            function needMoreData(state) {
              return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
            }

            // backwards compatibility.
            Readable.prototype.setEncoding = function (enc) {
              this._readableState.decoder = new StringDecoder(enc);
              this._readableState.encoding = enc;
              return this;
            };

            // Don't raise the hwm > 8MB
            var MAX_HWM = 0x800000;
            function computeNewHighWaterMark(n) {
              if (n >= MAX_HWM) {
                n = MAX_HWM;
              } else {
                // Get the next highest power of 2 to prevent increasing hwm excessively in
                // tiny amounts
                n--;
                n |= n >>> 1;
                n |= n >>> 2;
                n |= n >>> 4;
                n |= n >>> 8;
                n |= n >>> 16;
                n++;
              }
              return n;
            }

            // This function is designed to be inlinable, so please take care when making
            // changes to the function body.
            function howMuchToRead(n, state) {
              if (n <= 0 || state.length === 0 && state.ended) return 0;
              if (state.objectMode) return 1;
              if (n !== n) {
                // Only flow one buffer at a time
                if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
              }
              // If we're asking for more than the current hwm, then raise the hwm.
              if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
              if (n <= state.length) return n;
              // Don't have enough
              if (!state.ended) {
                state.needReadable = true;
                return 0;
              }
              return state.length;
            }

            // you can override either this method, or the async _read(n) below.
            Readable.prototype.read = function (n) {
              debug('read', n);
              n = parseInt(n, 10);
              var state = this._readableState;
              var nOrig = n;

              if (n !== 0) state.emittedReadable = false;

              // if we're doing read(0) to trigger a readable event, but we
              // already have a bunch of data in the buffer, then just trigger
              // the 'readable' event and move on.
              if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
                debug('read: emitReadable', state.length, state.ended);
                if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
                return null;
              }

              n = howMuchToRead(n, state);

              // if we've ended, and we're now clear, then finish it up.
              if (n === 0 && state.ended) {
                if (state.length === 0) endReadable(this);
                return null;
              }

              // All the actual chunk generation logic needs to be
              // *below* the call to _read.  The reason is that in certain
              // synthetic stream cases, such as passthrough streams, _read
              // may be a completely synchronous operation which may change
              // the state of the read buffer, providing enough data when
              // before there was *not* enough.
              //
              // So, the steps are:
              // 1. Figure out what the state of things will be after we do
              // a read from the buffer.
              //
              // 2. If that resulting state will trigger a _read, then call _read.
              // Note that this may be asynchronous, or synchronous.  Yes, it is
              // deeply ugly to write APIs this way, but that still doesn't mean
              // that the Readable class should behave improperly, as streams are
              // designed to be sync/async agnostic.
              // Take note if the _read call is sync or async (ie, if the read call
              // has returned yet), so that we know whether or not it's safe to emit
              // 'readable' etc.
              //
              // 3. Actually pull the requested chunks out of the buffer and return.

              // if we need a readable event, then we need to do some reading.
              var doRead = state.needReadable;
              debug('need readable', doRead);

              // if we currently have less than the highWaterMark, then also read some
              if (state.length === 0 || state.length - n < state.highWaterMark) {
                doRead = true;
                debug('length less than watermark', doRead);
              }

              // however, if we've ended, then there's no point, and if we're already
              // reading, then it's unnecessary.
              if (state.ended || state.reading) {
                doRead = false;
                debug('reading or ended', doRead);
              } else if (doRead) {
                debug('do read');
                state.reading = true;
                state.sync = true;
                // if the length is currently zero, then we *need* a readable event.
                if (state.length === 0) state.needReadable = true;
                // call internal read method
                this._read(state.highWaterMark);
                state.sync = false;
                // If _read pushed data synchronously, then `reading` will be false,
                // and we need to re-evaluate how much data we can return to the user.
                if (!state.reading) n = howMuchToRead(nOrig, state);
              }

              var ret;
              if (n > 0) ret = fromList(n, state);else ret = null;

              if (ret === null) {
                state.needReadable = true;
                n = 0;
              } else {
                state.length -= n;
              }

              if (state.length === 0) {
                // If we have nothing in the buffer, then we want to know
                // as soon as we *do* get something into the buffer.
                if (!state.ended) state.needReadable = true;

                // If we tried to read() past the EOF, then emit end on the next tick.
                if (nOrig !== n && state.ended) endReadable(this);
              }

              if (ret !== null) this.emit('data', ret);

              return ret;
            };

            function chunkInvalid(state, chunk) {
              var er = null;
              if (!isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
                er = new TypeError('Invalid non-string/buffer chunk');
              }
              return er;
            }

            function onEofChunk(stream, state) {
              if (state.ended) return;
              if (state.decoder) {
                var chunk = state.decoder.end();
                if (chunk && chunk.length) {
                  state.buffer.push(chunk);
                  state.length += state.objectMode ? 1 : chunk.length;
                }
              }
              state.ended = true;

              // emit 'readable' now to make sure it gets picked up.
              emitReadable(stream);
            }

            // Don't emit readable right away in sync mode, because this can trigger
            // another read() call => stack overflow.  This way, it might trigger
            // a nextTick recursion warning, but that's not so bad.
            function emitReadable(stream) {
              var state = stream._readableState;
              state.needReadable = false;
              if (!state.emittedReadable) {
                debug('emitReadable', state.flowing);
                state.emittedReadable = true;
                if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
              }
            }

            function emitReadable_(stream) {
              debug('emit readable');
              stream.emit('readable');
              flow(stream);
            }

            // at this point, the user has presumably seen the 'readable' event,
            // and called read() to consume some data.  that may have triggered
            // in turn another _read(n) call, in which case reading = true if
            // it's in progress.
            // However, if we're not ended, or reading, and the length < hwm,
            // then go ahead and try to read some more preemptively.
            function maybeReadMore(stream, state) {
              if (!state.readingMore) {
                state.readingMore = true;
                nextTick(maybeReadMore_, stream, state);
              }
            }

            function maybeReadMore_(stream, state) {
              var len = state.length;
              while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
                debug('maybeReadMore read 0');
                stream.read(0);
                if (len === state.length)
                  // didn't get any data, stop spinning.
                  break;else len = state.length;
              }
              state.readingMore = false;
            }

            // abstract method.  to be overridden in specific implementation classes.
            // call cb(er, data) where data is <= n in length.
            // for virtual (non-string, non-buffer) streams, "length" is somewhat
            // arbitrary, and perhaps not very meaningful.
            Readable.prototype._read = function (n) {
              this.emit('error', new Error('not implemented'));
            };

            Readable.prototype.pipe = function (dest, pipeOpts) {
              var src = this;
              var state = this._readableState;

              switch (state.pipesCount) {
                case 0:
                  state.pipes = dest;
                  break;
                case 1:
                  state.pipes = [state.pipes, dest];
                  break;
                default:
                  state.pipes.push(dest);
                  break;
              }
              state.pipesCount += 1;
              debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

              var doEnd = (!pipeOpts || pipeOpts.end !== false);

              var endFn = doEnd ? onend : cleanup;
              if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);

              dest.on('unpipe', onunpipe);
              function onunpipe(readable) {
                debug('onunpipe');
                if (readable === src) {
                  cleanup();
                }
              }

              function onend() {
                debug('onend');
                dest.end();
              }

              // when the dest drains, it reduces the awaitDrain counter
              // on the source.  This would be more elegant with a .once()
              // handler in flow(), but adding and removing repeatedly is
              // too slow.
              var ondrain = pipeOnDrain(src);
              dest.on('drain', ondrain);

              var cleanedUp = false;
              function cleanup() {
                debug('cleanup');
                // cleanup event handlers once the pipe is broken
                dest.removeListener('close', onclose);
                dest.removeListener('finish', onfinish);
                dest.removeListener('drain', ondrain);
                dest.removeListener('error', onerror);
                dest.removeListener('unpipe', onunpipe);
                src.removeListener('end', onend);
                src.removeListener('end', cleanup);
                src.removeListener('data', ondata);

                cleanedUp = true;

                // if the reader is waiting for a drain event from this
                // specific writer, then it would cause it to never start
                // flowing again.
                // So, if this is awaiting a drain, then we just call it now.
                // If we don't know, then assume that we are waiting for one.
                if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
              }

              // If the user pushes more data while we're writing to dest then we'll end up
              // in ondata again. However, we only want to increase awaitDrain once because
              // dest will only emit one 'drain' event for the multiple writes.
              // => Introduce a guard on increasing awaitDrain.
              var increasedAwaitDrain = false;
              src.on('data', ondata);
              function ondata(chunk) {
                debug('ondata');
                increasedAwaitDrain = false;
                var ret = dest.write(chunk);
                if (false === ret && !increasedAwaitDrain) {
                  // If the user unpiped during `dest.write()`, it is possible
                  // to get stuck in a permanently paused state if that write
                  // also returned false.
                  // => Check whether `dest` is still a piping destination.
                  if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
                    debug('false write response, pause', src._readableState.awaitDrain);
                    src._readableState.awaitDrain++;
                    increasedAwaitDrain = true;
                  }
                  src.pause();
                }
              }

              // if the dest has an error, then stop piping into it.
              // however, don't suppress the throwing behavior for this.
              function onerror(er) {
                debug('onerror', er);
                unpipe();
                dest.removeListener('error', onerror);
                if (listenerCount(dest, 'error') === 0) dest.emit('error', er);
              }

              // Make sure our error handler is attached before userland ones.
              prependListener(dest, 'error', onerror);

              // Both close and finish should trigger unpipe, but only once.
              function onclose() {
                dest.removeListener('finish', onfinish);
                unpipe();
              }
              dest.once('close', onclose);
              function onfinish() {
                debug('onfinish');
                dest.removeListener('close', onclose);
                unpipe();
              }
              dest.once('finish', onfinish);

              function unpipe() {
                debug('unpipe');
                src.unpipe(dest);
              }

              // tell the dest that it's being piped to
              dest.emit('pipe', src);

              // start the flow if it hasn't been started already.
              if (!state.flowing) {
                debug('pipe resume');
                src.resume();
              }

              return dest;
            };

            function pipeOnDrain(src) {
              return function () {
                var state = src._readableState;
                debug('pipeOnDrain', state.awaitDrain);
                if (state.awaitDrain) state.awaitDrain--;
                if (state.awaitDrain === 0 && src.listeners('data').length) {
                  state.flowing = true;
                  flow(src);
                }
              };
            }

            Readable.prototype.unpipe = function (dest) {
              var state = this._readableState;

              // if we're not piping anywhere, then do nothing.
              if (state.pipesCount === 0) return this;

              // just one destination.  most common case.
              if (state.pipesCount === 1) {
                // passed in one, but it's not the right one.
                if (dest && dest !== state.pipes) return this;

                if (!dest) dest = state.pipes;

                // got a match.
                state.pipes = null;
                state.pipesCount = 0;
                state.flowing = false;
                if (dest) dest.emit('unpipe', this);
                return this;
              }

              // slow case. multiple pipe destinations.

              if (!dest) {
                // remove all.
                var dests = state.pipes;
                var len = state.pipesCount;
                state.pipes = null;
                state.pipesCount = 0;
                state.flowing = false;

                for (var _i = 0; _i < len; _i++) {
                  dests[_i].emit('unpipe', this);
                }return this;
              }

              // try to find the right one.
              var i = indexOf(state.pipes, dest);
              if (i === -1) return this;

              state.pipes.splice(i, 1);
              state.pipesCount -= 1;
              if (state.pipesCount === 1) state.pipes = state.pipes[0];

              dest.emit('unpipe', this);

              return this;
            };

            // set up data events if they are asked for
            // Ensure readable listeners eventually get something
            Readable.prototype.on = function (ev, fn) {
              var res = EventEmitter.prototype.on.call(this, ev, fn);

              if (ev === 'data') {
                // Start flowing on next tick if stream isn't explicitly paused
                if (this._readableState.flowing !== false) this.resume();
              } else if (ev === 'readable') {
                var state = this._readableState;
                if (!state.endEmitted && !state.readableListening) {
                  state.readableListening = state.needReadable = true;
                  state.emittedReadable = false;
                  if (!state.reading) {
                    nextTick(nReadingNextTick, this);
                  } else if (state.length) {
                    emitReadable(this);
                  }
                }
              }

              return res;
            };
            Readable.prototype.addListener = Readable.prototype.on;

            function nReadingNextTick(self) {
              debug('readable nexttick read 0');
              self.read(0);
            }

            // pause() and resume() are remnants of the legacy readable stream API
            // If the user uses them, then switch into old mode.
            Readable.prototype.resume = function () {
              var state = this._readableState;
              if (!state.flowing) {
                debug('resume');
                state.flowing = true;
                resume(this, state);
              }
              return this;
            };

            function resume(stream, state) {
              if (!state.resumeScheduled) {
                state.resumeScheduled = true;
                nextTick(resume_, stream, state);
              }
            }

            function resume_(stream, state) {
              if (!state.reading) {
                debug('resume read 0');
                stream.read(0);
              }

              state.resumeScheduled = false;
              state.awaitDrain = 0;
              stream.emit('resume');
              flow(stream);
              if (state.flowing && !state.reading) stream.read(0);
            }

            Readable.prototype.pause = function () {
              debug('call pause flowing=%j', this._readableState.flowing);
              if (false !== this._readableState.flowing) {
                debug('pause');
                this._readableState.flowing = false;
                this.emit('pause');
              }
              return this;
            };

            function flow(stream) {
              var state = stream._readableState;
              debug('flow', state.flowing);
              while (state.flowing && stream.read() !== null) {}
            }

            // wrap an old-style stream as the async data source.
            // This is *not* part of the readable stream interface.
            // It is an ugly unfortunate mess of history.
            Readable.prototype.wrap = function (stream) {
              var state = this._readableState;
              var paused = false;

              var self = this;
              stream.on('end', function () {
                debug('wrapped end');
                if (state.decoder && !state.ended) {
                  var chunk = state.decoder.end();
                  if (chunk && chunk.length) self.push(chunk);
                }

                self.push(null);
              });

              stream.on('data', function (chunk) {
                debug('wrapped data');
                if (state.decoder) chunk = state.decoder.write(chunk);

                // don't skip over falsy values in objectMode
                if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

                var ret = self.push(chunk);
                if (!ret) {
                  paused = true;
                  stream.pause();
                }
              });

              // proxy all the other methods.
              // important when wrapping filters and duplexes.
              for (var i in stream) {
                if (this[i] === undefined && typeof stream[i] === 'function') {
                  this[i] = function (method) {
                    return function () {
                      return stream[method].apply(stream, arguments);
                    };
                  }(i);
                }
              }

              // proxy certain important events.
              var events = ['error', 'close', 'destroy', 'pause', 'resume'];
              forEach(events, function (ev) {
                stream.on(ev, self.emit.bind(self, ev));
              });

              // when we try to consume some more bytes, simply unpause the
              // underlying stream.
              self._read = function (n) {
                debug('wrapped _read', n);
                if (paused) {
                  paused = false;
                  stream.resume();
                }
              };

              return self;
            };

            // exposed for testing purposes only.
            Readable._fromList = fromList;

            // Pluck off n bytes from an array of buffers.
            // Length is the combined lengths of all the buffers in the list.
            // This function is designed to be inlinable, so please take care when making
            // changes to the function body.
            function fromList(n, state) {
              // nothing buffered
              if (state.length === 0) return null;

              var ret;
              if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
                // read it all, truncate the list
                if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
                state.buffer.clear();
              } else {
                // read part of list
                ret = fromListPartial(n, state.buffer, state.decoder);
              }

              return ret;
            }

            // Extracts only enough buffered data to satisfy the amount requested.
            // This function is designed to be inlinable, so please take care when making
            // changes to the function body.
            function fromListPartial(n, list, hasStrings) {
              var ret;
              if (n < list.head.data.length) {
                // slice is the same for buffers and strings
                ret = list.head.data.slice(0, n);
                list.head.data = list.head.data.slice(n);
              } else if (n === list.head.data.length) {
                // first chunk is a perfect match
                ret = list.shift();
              } else {
                // result spans more than one buffer
                ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
              }
              return ret;
            }

            // Copies a specified amount of characters from the list of buffered data
            // chunks.
            // This function is designed to be inlinable, so please take care when making
            // changes to the function body.
            function copyFromBufferString(n, list) {
              var p = list.head;
              var c = 1;
              var ret = p.data;
              n -= ret.length;
              while (p = p.next) {
                var str = p.data;
                var nb = n > str.length ? str.length : n;
                if (nb === str.length) ret += str;else ret += str.slice(0, n);
                n -= nb;
                if (n === 0) {
                  if (nb === str.length) {
                    ++c;
                    if (p.next) list.head = p.next;else list.head = list.tail = null;
                  } else {
                    list.head = p;
                    p.data = str.slice(nb);
                  }
                  break;
                }
                ++c;
              }
              list.length -= c;
              return ret;
            }

            // Copies a specified amount of bytes from the list of buffered data chunks.
            // This function is designed to be inlinable, so please take care when making
            // changes to the function body.
            function copyFromBuffer(n, list) {
              var ret = Buffer.allocUnsafe(n);
              var p = list.head;
              var c = 1;
              p.data.copy(ret);
              n -= p.data.length;
              while (p = p.next) {
                var buf = p.data;
                var nb = n > buf.length ? buf.length : n;
                buf.copy(ret, ret.length - n, 0, nb);
                n -= nb;
                if (n === 0) {
                  if (nb === buf.length) {
                    ++c;
                    if (p.next) list.head = p.next;else list.head = list.tail = null;
                  } else {
                    list.head = p;
                    p.data = buf.slice(nb);
                  }
                  break;
                }
                ++c;
              }
              list.length -= c;
              return ret;
            }

            function endReadable(stream) {
              var state = stream._readableState;

              // If we get here before consuming all the bytes, then that is a
              // bug in node.  Should never happen.
              if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

              if (!state.endEmitted) {
                state.ended = true;
                nextTick(endReadableNT, state, stream);
              }
            }

            function endReadableNT(state, stream) {
              // Check that we didn't get one last unshift.
              if (!state.endEmitted && state.length === 0) {
                state.endEmitted = true;
                stream.readable = false;
                stream.emit('end');
              }
            }

            function forEach(xs, f) {
              for (var i = 0, l = xs.length; i < l; i++) {
                f(xs[i], i);
              }
            }

            function indexOf(xs, x) {
              for (var i = 0, l = xs.length; i < l; i++) {
                if (xs[i] === x) return i;
              }
              return -1;
            }

            // A bit simpler than readable streams.
            // Implement an async ._write(chunk, encoding, cb), and it'll handle all
            // the drain event emission and buffering.

            Writable.WritableState = WritableState;
            inherits$1(Writable, EventEmitter);

            function nop() {}

            function WriteReq(chunk, encoding, cb) {
              this.chunk = chunk;
              this.encoding = encoding;
              this.callback = cb;
              this.next = null;
            }

            function WritableState(options, stream) {
              Object.defineProperty(this, 'buffer', {
                get: deprecate(function () {
                  return this.getBuffer();
                }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
              });
              options = options || {};

              // object stream flag to indicate whether or not this stream
              // contains buffers or objects.
              this.objectMode = !!options.objectMode;

              if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

              // the point at which write() starts returning false
              // Note: 0 is a valid value, means that we always return false if
              // the entire buffer is not flushed immediately on write()
              var hwm = options.highWaterMark;
              var defaultHwm = this.objectMode ? 16 : 16 * 1024;
              this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

              // cast to ints.
              this.highWaterMark = ~ ~this.highWaterMark;

              this.needDrain = false;
              // at the start of calling end()
              this.ending = false;
              // when end() has been called, and returned
              this.ended = false;
              // when 'finish' is emitted
              this.finished = false;

              // should we decode strings into buffers before passing to _write?
              // this is here so that some node-core streams can optimize string
              // handling at a lower level.
              var noDecode = options.decodeStrings === false;
              this.decodeStrings = !noDecode;

              // Crypto is kind of old and crusty.  Historically, its default string
              // encoding is 'binary' so we have to make this configurable.
              // Everything else in the universe uses 'utf8', though.
              this.defaultEncoding = options.defaultEncoding || 'utf8';

              // not an actual buffer we keep track of, but a measurement
              // of how much we're waiting to get pushed to some underlying
              // socket or file.
              this.length = 0;

              // a flag to see when we're in the middle of a write.
              this.writing = false;

              // when true all writes will be buffered until .uncork() call
              this.corked = 0;

              // a flag to be able to tell if the onwrite cb is called immediately,
              // or on a later tick.  We set this to true at first, because any
              // actions that shouldn't happen until "later" should generally also
              // not happen before the first write call.
              this.sync = true;

              // a flag to know if we're processing previously buffered items, which
              // may call the _write() callback in the same tick, so that we don't
              // end up in an overlapped onwrite situation.
              this.bufferProcessing = false;

              // the callback that's passed to _write(chunk,cb)
              this.onwrite = function (er) {
                onwrite(stream, er);
              };

              // the callback that the user supplies to write(chunk,encoding,cb)
              this.writecb = null;

              // the amount that is being written when _write is called.
              this.writelen = 0;

              this.bufferedRequest = null;
              this.lastBufferedRequest = null;

              // number of pending user-supplied write callbacks
              // this must be 0 before 'finish' can be emitted
              this.pendingcb = 0;

              // emit prefinish if the only thing we're waiting for is _write cbs
              // This is relevant for synchronous Transform streams
              this.prefinished = false;

              // True if the error was already emitted and should not be thrown again
              this.errorEmitted = false;

              // count buffered requests
              this.bufferedRequestCount = 0;

              // allocate the first CorkedRequest, there is always
              // one allocated and free to use, and we maintain at most two
              this.corkedRequestsFree = new CorkedRequest(this);
            }

            WritableState.prototype.getBuffer = function writableStateGetBuffer() {
              var current = this.bufferedRequest;
              var out = [];
              while (current) {
                out.push(current);
                current = current.next;
              }
              return out;
            };
            function Writable(options) {

              // Writable ctor is applied to Duplexes, though they're not
              // instanceof Writable, they're instanceof Readable.
              if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

              this._writableState = new WritableState(options, this);

              // legacy.
              this.writable = true;

              if (options) {
                if (typeof options.write === 'function') this._write = options.write;

                if (typeof options.writev === 'function') this._writev = options.writev;
              }

              EventEmitter.call(this);
            }

            // Otherwise people can pipe Writable streams, which is just wrong.
            Writable.prototype.pipe = function () {
              this.emit('error', new Error('Cannot pipe, not readable'));
            };

            function writeAfterEnd(stream, cb) {
              var er = new Error('write after end');
              // TODO: defer error events consistently everywhere, not just the cb
              stream.emit('error', er);
              nextTick(cb, er);
            }

            // If we get something that is not a buffer, string, null, or undefined,
            // and we're not in objectMode, then that's an error.
            // Otherwise stream chunks are all considered to be of length=1, and the
            // watermarks determine how many objects to keep in the buffer, rather than
            // how many bytes or characters.
            function validChunk(stream, state, chunk, cb) {
              var valid = true;
              var er = false;
              // Always throw error if a null is written
              // if we are not in object mode then throw
              // if it is not a buffer, string, or undefined.
              if (chunk === null) {
                er = new TypeError('May not write null values to stream');
              } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
                er = new TypeError('Invalid non-string/buffer chunk');
              }
              if (er) {
                stream.emit('error', er);
                nextTick(cb, er);
                valid = false;
              }
              return valid;
            }

            Writable.prototype.write = function (chunk, encoding, cb) {
              var state = this._writableState;
              var ret = false;

              if (typeof encoding === 'function') {
                cb = encoding;
                encoding = null;
              }

              if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

              if (typeof cb !== 'function') cb = nop;

              if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
                state.pendingcb++;
                ret = writeOrBuffer(this, state, chunk, encoding, cb);
              }

              return ret;
            };

            Writable.prototype.cork = function () {
              var state = this._writableState;

              state.corked++;
            };

            Writable.prototype.uncork = function () {
              var state = this._writableState;

              if (state.corked) {
                state.corked--;

                if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
              }
            };

            Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
              // node::ParseEncoding() requires lower case.
              if (typeof encoding === 'string') encoding = encoding.toLowerCase();
              if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
              this._writableState.defaultEncoding = encoding;
              return this;
            };

            function decodeChunk(state, chunk, encoding) {
              if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
                chunk = Buffer.from(chunk, encoding);
              }
              return chunk;
            }

            // if we're already writing something, then just put this
            // in the queue, and wait our turn.  Otherwise, call _write
            // If we return false, then we need a drain event, so set that flag.
            function writeOrBuffer(stream, state, chunk, encoding, cb) {
              chunk = decodeChunk(state, chunk, encoding);

              if (Buffer.isBuffer(chunk)) encoding = 'buffer';
              var len = state.objectMode ? 1 : chunk.length;

              state.length += len;

              var ret = state.length < state.highWaterMark;
              // we must ensure that previous needDrain will not be reset to false.
              if (!ret) state.needDrain = true;

              if (state.writing || state.corked) {
                var last = state.lastBufferedRequest;
                state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
                if (last) {
                  last.next = state.lastBufferedRequest;
                } else {
                  state.bufferedRequest = state.lastBufferedRequest;
                }
                state.bufferedRequestCount += 1;
              } else {
                doWrite(stream, state, false, len, chunk, encoding, cb);
              }

              return ret;
            }

            function doWrite(stream, state, writev, len, chunk, encoding, cb) {
              state.writelen = len;
              state.writecb = cb;
              state.writing = true;
              state.sync = true;
              if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
              state.sync = false;
            }

            function onwriteError(stream, state, sync, er, cb) {
              --state.pendingcb;
              if (sync) nextTick(cb, er);else cb(er);

              stream._writableState.errorEmitted = true;
              stream.emit('error', er);
            }

            function onwriteStateUpdate(state) {
              state.writing = false;
              state.writecb = null;
              state.length -= state.writelen;
              state.writelen = 0;
            }

            function onwrite(stream, er) {
              var state = stream._writableState;
              var sync = state.sync;
              var cb = state.writecb;

              onwriteStateUpdate(state);

              if (er) onwriteError(stream, state, sync, er, cb);else {
                // Check if we're actually ready to finish, but don't emit yet
                var finished = needFinish(state);

                if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
                  clearBuffer(stream, state);
                }

                if (sync) {
                  /*<replacement>*/
                    nextTick(afterWrite, stream, state, finished, cb);
                  /*</replacement>*/
                } else {
                    afterWrite(stream, state, finished, cb);
                  }
              }
            }

            function afterWrite(stream, state, finished, cb) {
              if (!finished) onwriteDrain(stream, state);
              state.pendingcb--;
              cb();
              finishMaybe(stream, state);
            }

            // Must force callback to be called on nextTick, so that we don't
            // emit 'drain' before the write() consumer gets the 'false' return
            // value, and has a chance to attach a 'drain' listener.
            function onwriteDrain(stream, state) {
              if (state.length === 0 && state.needDrain) {
                state.needDrain = false;
                stream.emit('drain');
              }
            }

            // if there's something in the buffer waiting, then process it
            function clearBuffer(stream, state) {
              state.bufferProcessing = true;
              var entry = state.bufferedRequest;

              if (stream._writev && entry && entry.next) {
                // Fast case, write everything using _writev()
                var l = state.bufferedRequestCount;
                var buffer = new Array(l);
                var holder = state.corkedRequestsFree;
                holder.entry = entry;

                var count = 0;
                while (entry) {
                  buffer[count] = entry;
                  entry = entry.next;
                  count += 1;
                }

                doWrite(stream, state, true, state.length, buffer, '', holder.finish);

                // doWrite is almost always async, defer these to save a bit of time
                // as the hot path ends with doWrite
                state.pendingcb++;
                state.lastBufferedRequest = null;
                if (holder.next) {
                  state.corkedRequestsFree = holder.next;
                  holder.next = null;
                } else {
                  state.corkedRequestsFree = new CorkedRequest(state);
                }
              } else {
                // Slow case, write chunks one-by-one
                while (entry) {
                  var chunk = entry.chunk;
                  var encoding = entry.encoding;
                  var cb = entry.callback;
                  var len = state.objectMode ? 1 : chunk.length;

                  doWrite(stream, state, false, len, chunk, encoding, cb);
                  entry = entry.next;
                  // if we didn't call the onwrite immediately, then
                  // it means that we need to wait until it does.
                  // also, that means that the chunk and cb are currently
                  // being processed, so move the buffer counter past them.
                  if (state.writing) {
                    break;
                  }
                }

                if (entry === null) state.lastBufferedRequest = null;
              }

              state.bufferedRequestCount = 0;
              state.bufferedRequest = entry;
              state.bufferProcessing = false;
            }

            Writable.prototype._write = function (chunk, encoding, cb) {
              cb(new Error('not implemented'));
            };

            Writable.prototype._writev = null;

            Writable.prototype.end = function (chunk, encoding, cb) {
              var state = this._writableState;

              if (typeof chunk === 'function') {
                cb = chunk;
                chunk = null;
                encoding = null;
              } else if (typeof encoding === 'function') {
                cb = encoding;
                encoding = null;
              }

              if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

              // .end() fully uncorks
              if (state.corked) {
                state.corked = 1;
                this.uncork();
              }

              // ignore unnecessary end() calls.
              if (!state.ending && !state.finished) endWritable(this, state, cb);
            };

            function needFinish(state) {
              return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
            }

            function prefinish(stream, state) {
              if (!state.prefinished) {
                state.prefinished = true;
                stream.emit('prefinish');
              }
            }

            function finishMaybe(stream, state) {
              var need = needFinish(state);
              if (need) {
                if (state.pendingcb === 0) {
                  prefinish(stream, state);
                  state.finished = true;
                  stream.emit('finish');
                } else {
                  prefinish(stream, state);
                }
              }
              return need;
            }

            function endWritable(stream, state, cb) {
              state.ending = true;
              finishMaybe(stream, state);
              if (cb) {
                if (state.finished) nextTick(cb);else stream.once('finish', cb);
              }
              state.ended = true;
              stream.writable = false;
            }

            // It seems a linked list but it is not
            // there will be only 2 of these for each stream
            function CorkedRequest(state) {
              var _this = this;

              this.next = null;
              this.entry = null;

              this.finish = function (err) {
                var entry = _this.entry;
                _this.entry = null;
                while (entry) {
                  var cb = entry.callback;
                  state.pendingcb--;
                  cb(err);
                  entry = entry.next;
                }
                if (state.corkedRequestsFree) {
                  state.corkedRequestsFree.next = _this;
                } else {
                  state.corkedRequestsFree = _this;
                }
              };
            }

            inherits$1(Duplex, Readable);

            var keys = Object.keys(Writable.prototype);
            for (var v = 0; v < keys.length; v++) {
              var method = keys[v];
              if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
            }
            function Duplex(options) {
              if (!(this instanceof Duplex)) return new Duplex(options);

              Readable.call(this, options);
              Writable.call(this, options);

              if (options && options.readable === false) this.readable = false;

              if (options && options.writable === false) this.writable = false;

              this.allowHalfOpen = true;
              if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

              this.once('end', onend);
            }

            // the no-half-open enforcer
            function onend() {
              // if we allow half-open state, or if the writable side ended,
              // then we're ok.
              if (this.allowHalfOpen || this._writableState.ended) return;

              // no more data can be written.
              // But allow more writes to happen in this tick.
              nextTick(onEndNT, this);
            }

            function onEndNT(self) {
              self.end();
            }

            // a transform stream is a readable/writable stream where you do
            // something with the data.  Sometimes it's called a "filter",
            // but that's not a great name for it, since that implies a thing where
            // some bits pass through, and others are simply ignored.  (That would
            // be a valid example of a transform, of course.)
            //
            // While the output is causally related to the input, it's not a
            // necessarily symmetric or synchronous transformation.  For example,
            // a zlib stream might take multiple plain-text writes(), and then
            // emit a single compressed chunk some time in the future.
            //
            // Here's how this works:
            //
            // The Transform stream has all the aspects of the readable and writable
            // stream classes.  When you write(chunk), that calls _write(chunk,cb)
            // internally, and returns false if there's a lot of pending writes
            // buffered up.  When you call read(), that calls _read(n) until
            // there's enough pending readable data buffered up.
            //
            // In a transform stream, the written data is placed in a buffer.  When
            // _read(n) is called, it transforms the queued up data, calling the
            // buffered _write cb's as it consumes chunks.  If consuming a single
            // written chunk would result in multiple output chunks, then the first
            // outputted bit calls the readcb, and subsequent chunks just go into
            // the read buffer, and will cause it to emit 'readable' if necessary.
            //
            // This way, back-pressure is actually determined by the reading side,
            // since _read has to be called to start processing a new chunk.  However,
            // a pathological inflate type of transform can cause excessive buffering
            // here.  For example, imagine a stream where every byte of input is
            // interpreted as an integer from 0-255, and then results in that many
            // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
            // 1kb of data being output.  In this case, you could write a very small
            // amount of input, and end up with a very large amount of output.  In
            // such a pathological inflating mechanism, there'd be no way to tell
            // the system to stop doing the transform.  A single 4MB write could
            // cause the system to run out of memory.
            //
            // However, even in such a pathological case, only a single written chunk
            // would be consumed, and then the rest would wait (un-transformed) until
            // the results of the previous transformed chunk were consumed.

            inherits$1(Transform, Duplex);

            function TransformState(stream) {
              this.afterTransform = function (er, data) {
                return afterTransform(stream, er, data);
              };

              this.needTransform = false;
              this.transforming = false;
              this.writecb = null;
              this.writechunk = null;
              this.writeencoding = null;
            }

            function afterTransform(stream, er, data) {
              var ts = stream._transformState;
              ts.transforming = false;

              var cb = ts.writecb;

              if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

              ts.writechunk = null;
              ts.writecb = null;

              if (data !== null && data !== undefined) stream.push(data);

              cb(er);

              var rs = stream._readableState;
              rs.reading = false;
              if (rs.needReadable || rs.length < rs.highWaterMark) {
                stream._read(rs.highWaterMark);
              }
            }
            function Transform(options) {
              if (!(this instanceof Transform)) return new Transform(options);

              Duplex.call(this, options);

              this._transformState = new TransformState(this);

              // when the writable side finishes, then flush out anything remaining.
              var stream = this;

              // start out asking for a readable event once data is transformed.
              this._readableState.needReadable = true;

              // we have implemented the _read method, and done the other things
              // that Readable wants before the first _read call, so unset the
              // sync guard flag.
              this._readableState.sync = false;

              if (options) {
                if (typeof options.transform === 'function') this._transform = options.transform;

                if (typeof options.flush === 'function') this._flush = options.flush;
              }

              this.once('prefinish', function () {
                if (typeof this._flush === 'function') this._flush(function (er) {
                  done(stream, er);
                });else done(stream);
              });
            }

            Transform.prototype.push = function (chunk, encoding) {
              this._transformState.needTransform = false;
              return Duplex.prototype.push.call(this, chunk, encoding);
            };

            // This is the part where you do stuff!
            // override this function in implementation classes.
            // 'chunk' is an input chunk.
            //
            // Call `push(newChunk)` to pass along transformed output
            // to the readable side.  You may call 'push' zero or more times.
            //
            // Call `cb(err)` when you are done with this chunk.  If you pass
            // an error, then that'll put the hurt on the whole operation.  If you
            // never call cb(), then you'll never get another chunk.
            Transform.prototype._transform = function (chunk, encoding, cb) {
              throw new Error('Not implemented');
            };

            Transform.prototype._write = function (chunk, encoding, cb) {
              var ts = this._transformState;
              ts.writecb = cb;
              ts.writechunk = chunk;
              ts.writeencoding = encoding;
              if (!ts.transforming) {
                var rs = this._readableState;
                if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
              }
            };

            // Doesn't matter what the args are here.
            // _transform does all the work.
            // That we got here means that the readable side wants more data.
            Transform.prototype._read = function (n) {
              var ts = this._transformState;

              if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
                ts.transforming = true;
                this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
              } else {
                // mark that we need a transform, so that any data that comes in
                // will get processed, now that we've asked for it.
                ts.needTransform = true;
              }
            };

            function done(stream, er) {
              if (er) return stream.emit('error', er);

              // if there's nothing in the write buffer, then that means
              // that nothing more will ever be provided
              var ws = stream._writableState;
              var ts = stream._transformState;

              if (ws.length) throw new Error('Calling transform done when ws.length != 0');

              if (ts.transforming) throw new Error('Calling transform done when still transforming');

              return stream.push(null);
            }

            inherits$1(PassThrough, Transform);
            function PassThrough(options) {
              if (!(this instanceof PassThrough)) return new PassThrough(options);

              Transform.call(this, options);
            }

            PassThrough.prototype._transform = function (chunk, encoding, cb) {
              cb(null, chunk);
            };

            inherits$1(Stream, EventEmitter);
            Stream.Readable = Readable;
            Stream.Writable = Writable;
            Stream.Duplex = Duplex;
            Stream.Transform = Transform;
            Stream.PassThrough = PassThrough;

            // Backwards-compat with node 0.4.x
            Stream.Stream = Stream;

            // old-style streams.  Note that the pipe method (the only relevant
            // part of this class) is overridden in the Readable class.

            function Stream() {
              EventEmitter.call(this);
            }

            Stream.prototype.pipe = function(dest, options) {
              var source = this;

              function ondata(chunk) {
                if (dest.writable) {
                  if (false === dest.write(chunk) && source.pause) {
                    source.pause();
                  }
                }
              }

              source.on('data', ondata);

              function ondrain() {
                if (source.readable && source.resume) {
                  source.resume();
                }
              }

              dest.on('drain', ondrain);

              // If the 'end' option is not supplied, dest.end() will be called when
              // source gets the 'end' or 'close' events.  Only dest.end() once.
              if (!dest._isStdio && (!options || options.end !== false)) {
                source.on('end', onend);
                source.on('close', onclose);
              }

              var didOnEnd = false;
              function onend() {
                if (didOnEnd) return;
                didOnEnd = true;

                dest.end();
              }


              function onclose() {
                if (didOnEnd) return;
                didOnEnd = true;

                if (typeof dest.destroy === 'function') dest.destroy();
              }

              // don't leave dangling pipes when there are errors.
              function onerror(er) {
                cleanup();
                if (EventEmitter.listenerCount(this, 'error') === 0) {
                  throw er; // Unhandled stream error in pipe.
                }
              }

              source.on('error', onerror);
              dest.on('error', onerror);

              // remove all the event listeners that were added.
              function cleanup() {
                source.removeListener('data', ondata);
                dest.removeListener('drain', ondrain);

                source.removeListener('end', onend);
                source.removeListener('close', onclose);

                source.removeListener('error', onerror);
                dest.removeListener('error', onerror);

                source.removeListener('end', cleanup);
                source.removeListener('close', cleanup);

                dest.removeListener('close', cleanup);
              }

              source.on('end', cleanup);
              source.on('close', cleanup);

              dest.on('close', cleanup);

              dest.emit('pipe', source);

              // Allow for unix-like usage: A.pipe(B).pipe(C)
              return dest;
            };

            const is_object = function(obj){
              return (typeof obj === 'object' && obj !== null && !Array.isArray(obj));
            };

            class CsvError extends Error {
              constructor(code, message, options, ...contexts) {
                if(Array.isArray(message)) message = message.join(' ').trim();
                super(message);
                if(Error.captureStackTrace !== undefined){
                  Error.captureStackTrace(this, CsvError);
                }
                this.code = code;
                for(const context of contexts){
                  for(const key in context){
                    const value = context[key];
                    this[key] = isBuffer(value) ? value.toString(options.encoding) : value == null ? value : JSON.parse(JSON.stringify(value));
                  }
                }
              }
            }

            const normalize_columns_array = function(columns){
              const normalizedColumns = [];
              for(let i = 0, l = columns.length; i < l; i++){
                const column = columns[i];
                if(column === undefined || column === null || column === false){
                  normalizedColumns[i] = { disabled: true };
                }else if(typeof column === 'string'){
                  normalizedColumns[i] = { name: column };
                }else if(is_object(column)){
                  if(typeof column.name !== 'string'){
                    throw new CsvError('CSV_OPTION_COLUMNS_MISSING_NAME', [
                      'Option columns missing name:',
                      `property "name" is required at position ${i}`,
                      'when column is an object literal'
                    ]);
                  }
                  normalizedColumns[i] = column;
                }else {
                  throw new CsvError('CSV_INVALID_COLUMN_DEFINITION', [
                    'Invalid column definition:',
                    'expect a string or a literal object,',
                    `got ${JSON.stringify(column)} at position ${i}`
                  ]);
                }
              }
              return normalizedColumns;
            };

            class ResizeableBuffer{
              constructor(size=100){
                this.size = size;
                this.length = 0;
                this.buf = Buffer.allocUnsafe(size);
              }
              prepend(val){
                if(isBuffer(val)){
                  const length = this.length + val.length;
                  if(length >= this.size){
                    this.resize();
                    if(length >= this.size){
                      throw Error('INVALID_BUFFER_STATE');
                    }
                  }
                  const buf = this.buf;
                  this.buf = Buffer.allocUnsafe(this.size);
                  val.copy(this.buf, 0);
                  buf.copy(this.buf, val.length);
                  this.length += val.length;
                }else {
                  const length = this.length++;
                  if(length === this.size){
                    this.resize();
                  }
                  const buf = this.clone();
                  this.buf[0] = val;
                  buf.copy(this.buf,1, 0, length);
                }
              }
              append(val){
                const length = this.length++;
                if(length === this.size){
                  this.resize();
                }
                this.buf[length] = val;
              }
              clone(){
                return Buffer.from(this.buf.slice(0, this.length));
              }
              resize(){
                const length = this.length;
                this.size = this.size * 2;
                const buf = Buffer.allocUnsafe(this.size);
                this.buf.copy(buf,0, 0, length);
                this.buf = buf;
              }
              toString(encoding){
                if(encoding){
                  return this.buf.slice(0, this.length).toString(encoding);
                }else {
                  return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
                }
              }
              toJSON(){
                return this.toString('utf8');
              }
              reset(){
                this.length = 0;
              }
            }

            // white space characters
            // https://en.wikipedia.org/wiki/Whitespace_character
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes#Types
            // \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff
            const np = 12;
            const cr$1 = 13; // `\r`, carriage return, 0x0D in hexadécimal, 13 in decimal
            const nl$1 = 10; // `\n`, newline, 0x0A in hexadecimal, 10 in decimal
            const space = 32;
            const tab = 9;

            const init_state = function(options){
              return {
                bomSkipped: false,
                bufBytesStart: 0,
                castField: options.cast_function,
                commenting: false,
                // Current error encountered by a record
                error: undefined,
                enabled: options.from_line === 1,
                escaping: false,
                escapeIsQuote: isBuffer(options.escape) && isBuffer(options.quote) && Buffer.compare(options.escape, options.quote) === 0,
                // columns can be `false`, `true`, `Array`
                expectedRecordLength: Array.isArray(options.columns) ? options.columns.length : undefined,
                field: new ResizeableBuffer(20),
                firstLineToHeaders: options.cast_first_line_to_header,
                needMoreDataSize: Math.max(
                  // Skip if the remaining buffer smaller than comment
                  options.comment !== null ? options.comment.length : 0,
                  // Skip if the remaining buffer can be delimiter
                  ...options.delimiter.map((delimiter) => delimiter.length),
                  // Skip if the remaining buffer can be escape sequence
                  options.quote !== null ? options.quote.length : 0,
                ),
                previousBuf: undefined,
                quoting: false,
                stop: false,
                rawBuffer: new ResizeableBuffer(100),
                record: [],
                recordHasError: false,
                record_length: 0,
                recordDelimiterMaxLength: options.record_delimiter.length === 0 ? 0 : Math.max(...options.record_delimiter.map((v) => v.length)),
                trimChars: [Buffer.from(' ', options.encoding)[0], Buffer.from('\t', options.encoding)[0]],
                wasQuoting: false,
                wasRowDelimiter: false,
                timchars: [
                  Buffer.from(Buffer.from([cr$1], 'utf8').toString(), options.encoding),
                  Buffer.from(Buffer.from([nl$1], 'utf8').toString(), options.encoding),
                  Buffer.from(Buffer.from([np], 'utf8').toString(), options.encoding),
                  Buffer.from(Buffer.from([space], 'utf8').toString(), options.encoding),
                  Buffer.from(Buffer.from([tab], 'utf8').toString(), options.encoding),
                ]
              };
            };

            const underscore = function(str){
              return str.replace(/([A-Z])/g, function(_, match){
                return '_' + match.toLowerCase();
              });
            };

            const normalize_options = function(opts){
              const options = {};
              // Merge with user options
              for(const opt in opts){
                options[underscore(opt)] = opts[opt];
              }
              // Normalize option `encoding`
              // Note: defined first because other options depends on it
              // to convert chars/strings into buffers.
              if(options.encoding === undefined || options.encoding === true){
                options.encoding = 'utf8';
              }else if(options.encoding === null || options.encoding === false){
                options.encoding = null;
              }else if(typeof options.encoding !== 'string' && options.encoding !== null){
                throw new CsvError('CSV_INVALID_OPTION_ENCODING', [
                  'Invalid option encoding:',
                  'encoding must be a string or null to return a buffer,',
                  `got ${JSON.stringify(options.encoding)}`
                ], options);
              }
              // Normalize option `bom`
              if(options.bom === undefined || options.bom === null || options.bom === false){
                options.bom = false;
              }else if(options.bom !== true){
                throw new CsvError('CSV_INVALID_OPTION_BOM', [
                  'Invalid option bom:', 'bom must be true,',
                  `got ${JSON.stringify(options.bom)}`
                ], options);
              }
              // Normalize option `cast`
              options.cast_function = null;
              if(options.cast === undefined || options.cast === null || options.cast === false || options.cast === ''){
                options.cast = undefined;
              }else if(typeof options.cast === 'function'){
                options.cast_function = options.cast;
                options.cast = true;
              }else if(options.cast !== true){
                throw new CsvError('CSV_INVALID_OPTION_CAST', [
                  'Invalid option cast:', 'cast must be true or a function,',
                  `got ${JSON.stringify(options.cast)}`
                ], options);
              }
              // Normalize option `cast_date`
              if(options.cast_date === undefined || options.cast_date === null || options.cast_date === false || options.cast_date === ''){
                options.cast_date = false;
              }else if(options.cast_date === true){
                options.cast_date = function(value){
                  const date = Date.parse(value);
                  return !isNaN(date) ? new Date(date) : value;
                };
              }else if (typeof options.cast_date !== 'function'){
                throw new CsvError('CSV_INVALID_OPTION_CAST_DATE', [
                  'Invalid option cast_date:', 'cast_date must be true or a function,',
                  `got ${JSON.stringify(options.cast_date)}`
                ], options);
              }
              // Normalize option `columns`
              options.cast_first_line_to_header = null;
              if(options.columns === true){
                // Fields in the first line are converted as-is to columns
                options.cast_first_line_to_header = undefined;
              }else if(typeof options.columns === 'function'){
                options.cast_first_line_to_header = options.columns;
                options.columns = true;
              }else if(Array.isArray(options.columns)){
                options.columns = normalize_columns_array(options.columns);
              }else if(options.columns === undefined || options.columns === null || options.columns === false){
                options.columns = false;
              }else {
                throw new CsvError('CSV_INVALID_OPTION_COLUMNS', [
                  'Invalid option columns:',
                  'expect an array, a function or true,',
                  `got ${JSON.stringify(options.columns)}`
                ], options);
              }
              // Normalize option `group_columns_by_name`
              if(options.group_columns_by_name === undefined || options.group_columns_by_name === null || options.group_columns_by_name === false){
                options.group_columns_by_name = false;
              }else if(options.group_columns_by_name !== true){
                throw new CsvError('CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME', [
                  'Invalid option group_columns_by_name:',
                  'expect an boolean,',
                  `got ${JSON.stringify(options.group_columns_by_name)}`
                ], options);
              }else if(options.columns === false){
                throw new CsvError('CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME', [
                  'Invalid option group_columns_by_name:',
                  'the `columns` mode must be activated.'
                ], options);
              }
              // Normalize option `comment`
              if(options.comment === undefined || options.comment === null || options.comment === false || options.comment === ''){
                options.comment = null;
              }else {
                if(typeof options.comment === 'string'){
                  options.comment = Buffer.from(options.comment, options.encoding);
                }
                if(!isBuffer(options.comment)){
                  throw new CsvError('CSV_INVALID_OPTION_COMMENT', [
                    'Invalid option comment:',
                    'comment must be a buffer or a string,',
                    `got ${JSON.stringify(options.comment)}`
                  ], options);
                }
              }
              // Normalize option `comment_no_infix`
              if(options.comment_no_infix === undefined || options.comment_no_infix === null || options.comment_no_infix === false){
                options.comment_no_infix = false;
              }else if(options.comment_no_infix !== true){
                throw new CsvError('CSV_INVALID_OPTION_COMMENT', [
                  'Invalid option comment_no_infix:',
                  'value must be a boolean,',
                  `got ${JSON.stringify(options.comment_no_infix)}`
                ], options);
              }
              // Normalize option `delimiter`
              const delimiter_json = JSON.stringify(options.delimiter);
              if(!Array.isArray(options.delimiter)) options.delimiter = [options.delimiter];
              if(options.delimiter.length === 0){
                throw new CsvError('CSV_INVALID_OPTION_DELIMITER', [
                  'Invalid option delimiter:',
                  'delimiter must be a non empty string or buffer or array of string|buffer,',
                  `got ${delimiter_json}`
                ], options);
              }
              options.delimiter = options.delimiter.map(function(delimiter){
                if(delimiter === undefined || delimiter === null || delimiter === false){
                  return Buffer.from(',', options.encoding);
                }
                if(typeof delimiter === 'string'){
                  delimiter = Buffer.from(delimiter, options.encoding);
                }
                if(!isBuffer(delimiter) || delimiter.length === 0){
                  throw new CsvError('CSV_INVALID_OPTION_DELIMITER', [
                    'Invalid option delimiter:',
                    'delimiter must be a non empty string or buffer or array of string|buffer,',
                    `got ${delimiter_json}`
                  ], options);
                }
                return delimiter;
              });
              // Normalize option `escape`
              if(options.escape === undefined || options.escape === true){
                options.escape = Buffer.from('"', options.encoding);
              }else if(typeof options.escape === 'string'){
                options.escape = Buffer.from(options.escape, options.encoding);
              }else if (options.escape === null || options.escape === false){
                options.escape = null;
              }
              if(options.escape !== null){
                if(!isBuffer(options.escape)){
                  throw new Error(`Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`);
                }
              }
              // Normalize option `from`
              if(options.from === undefined || options.from === null){
                options.from = 1;
              }else {
                if(typeof options.from === 'string' && /\d+/.test(options.from)){
                  options.from = parseInt(options.from);
                }
                if(Number.isInteger(options.from)){
                  if(options.from < 0){
                    throw new Error(`Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`);
                  }
                }else {
                  throw new Error(`Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`);
                }
              }
              // Normalize option `from_line`
              if(options.from_line === undefined || options.from_line === null){
                options.from_line = 1;
              }else {
                if(typeof options.from_line === 'string' && /\d+/.test(options.from_line)){
                  options.from_line = parseInt(options.from_line);
                }
                if(Number.isInteger(options.from_line)){
                  if(options.from_line <= 0){
                    throw new Error(`Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`);
                  }
                }else {
                  throw new Error(`Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`);
                }
              }
              // Normalize options `ignore_last_delimiters`
              if(options.ignore_last_delimiters === undefined || options.ignore_last_delimiters === null){
                options.ignore_last_delimiters = false;
              }else if(typeof options.ignore_last_delimiters === 'number'){
                options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
                if(options.ignore_last_delimiters === 0){
                  options.ignore_last_delimiters = false;
                }
              }else if(typeof options.ignore_last_delimiters !== 'boolean'){
                throw new CsvError('CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS', [
                  'Invalid option `ignore_last_delimiters`:',
                  'the value must be a boolean value or an integer,',
                  `got ${JSON.stringify(options.ignore_last_delimiters)}`
                ], options);
              }
              if(options.ignore_last_delimiters === true && options.columns === false){
                throw new CsvError('CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS', [
                  'The option `ignore_last_delimiters`',
                  'requires the activation of the `columns` option'
                ], options);
              }
              // Normalize option `info`
              if(options.info === undefined || options.info === null || options.info === false){
                options.info = false;
              }else if(options.info !== true){
                throw new Error(`Invalid Option: info must be true, got ${JSON.stringify(options.info)}`);
              }
              // Normalize option `max_record_size`
              if(options.max_record_size === undefined || options.max_record_size === null || options.max_record_size === false){
                options.max_record_size = 0;
              }else if(Number.isInteger(options.max_record_size) && options.max_record_size >= 0);else if(typeof options.max_record_size === 'string' && /\d+/.test(options.max_record_size)){
                options.max_record_size = parseInt(options.max_record_size);
              }else {
                throw new Error(`Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`);
              }
              // Normalize option `objname`
              if(options.objname === undefined || options.objname === null || options.objname === false){
                options.objname = undefined;
              }else if(isBuffer(options.objname)){
                if(options.objname.length === 0){
                  throw new Error(`Invalid Option: objname must be a non empty buffer`);
                }
                if(options.encoding === null);else {
                  options.objname = options.objname.toString(options.encoding);
                }
              }else if(typeof options.objname === 'string'){
                if(options.objname.length === 0){
                  throw new Error(`Invalid Option: objname must be a non empty string`);
                }
                // Great, nothing to do
              }else if(typeof options.objname === 'number');else {
                throw new Error(`Invalid Option: objname must be a string or a buffer, got ${options.objname}`);
              }
              if(options.objname !== undefined){
                if(typeof options.objname === 'number'){
                  if(options.columns !== false){
                    throw Error('Invalid Option: objname index cannot be combined with columns or be defined as a field');
                  }
                }else { // A string or a buffer
                  if(options.columns === false){
                    throw Error('Invalid Option: objname field must be combined with columns or be defined as an index');
                  }
                }
              }
              // Normalize option `on_record`
              if(options.on_record === undefined || options.on_record === null){
                options.on_record = undefined;
              }else if(typeof options.on_record !== 'function'){
                throw new CsvError('CSV_INVALID_OPTION_ON_RECORD', [
                  'Invalid option `on_record`:',
                  'expect a function,',
                  `got ${JSON.stringify(options.on_record)}`
                ], options);
              }
              // Normalize option `quote`
              if(options.quote === null || options.quote === false || options.quote === ''){
                options.quote = null;
              }else {
                if(options.quote === undefined || options.quote === true){
                  options.quote = Buffer.from('"', options.encoding);
                }else if(typeof options.quote === 'string'){
                  options.quote = Buffer.from(options.quote, options.encoding);
                }
                if(!isBuffer(options.quote)){
                  throw new Error(`Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`);
                }
              }
              // Normalize option `raw`
              if(options.raw === undefined || options.raw === null || options.raw === false){
                options.raw = false;
              }else if(options.raw !== true){
                throw new Error(`Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`);
              }
              // Normalize option `record_delimiter`
              if(options.record_delimiter === undefined){
                options.record_delimiter = [];
              }else if(typeof options.record_delimiter === 'string' || isBuffer(options.record_delimiter)){
                if(options.record_delimiter.length === 0){
                  throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
                    'Invalid option `record_delimiter`:',
                    'value must be a non empty string or buffer,',
                    `got ${JSON.stringify(options.record_delimiter)}`
                  ], options);
                }
                options.record_delimiter = [options.record_delimiter];
              }else if(!Array.isArray(options.record_delimiter)){
                throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
                  'Invalid option `record_delimiter`:',
                  'value must be a string, a buffer or array of string|buffer,',
                  `got ${JSON.stringify(options.record_delimiter)}`
                ], options);
              }
              options.record_delimiter = options.record_delimiter.map(function(rd, i){
                if(typeof rd !== 'string' && ! isBuffer(rd)){
                  throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
                    'Invalid option `record_delimiter`:',
                    'value must be a string, a buffer or array of string|buffer',
                    `at index ${i},`,
                    `got ${JSON.stringify(rd)}`
                  ], options);
                }else if(rd.length === 0){
                  throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
                    'Invalid option `record_delimiter`:',
                    'value must be a non empty string or buffer',
                    `at index ${i},`,
                    `got ${JSON.stringify(rd)}`
                  ], options);
                }
                if(typeof rd === 'string'){
                  rd = Buffer.from(rd, options.encoding);
                }
                return rd;
              });
              // Normalize option `relax_column_count`
              if(typeof options.relax_column_count === 'boolean');else if(options.relax_column_count === undefined || options.relax_column_count === null){
                options.relax_column_count = false;
              }else {
                throw new Error(`Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`);
              }
              if(typeof options.relax_column_count_less === 'boolean');else if(options.relax_column_count_less === undefined || options.relax_column_count_less === null){
                options.relax_column_count_less = false;
              }else {
                throw new Error(`Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`);
              }
              if(typeof options.relax_column_count_more === 'boolean');else if(options.relax_column_count_more === undefined || options.relax_column_count_more === null){
                options.relax_column_count_more = false;
              }else {
                throw new Error(`Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`);
              }
              // Normalize option `relax_quotes`
              if(typeof options.relax_quotes === 'boolean');else if(options.relax_quotes === undefined || options.relax_quotes === null){
                options.relax_quotes = false;
              }else {
                throw new Error(`Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`);
              }
              // Normalize option `skip_empty_lines`
              if(typeof options.skip_empty_lines === 'boolean');else if(options.skip_empty_lines === undefined || options.skip_empty_lines === null){
                options.skip_empty_lines = false;
              }else {
                throw new Error(`Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`);
              }
              // Normalize option `skip_records_with_empty_values`
              if(typeof options.skip_records_with_empty_values === 'boolean');else if(options.skip_records_with_empty_values === undefined || options.skip_records_with_empty_values === null){
                options.skip_records_with_empty_values = false;
              }else {
                throw new Error(`Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`);
              }
              // Normalize option `skip_records_with_error`
              if(typeof options.skip_records_with_error === 'boolean');else if(options.skip_records_with_error === undefined || options.skip_records_with_error === null){
                options.skip_records_with_error = false;
              }else {
                throw new Error(`Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`);
              }
              // Normalize option `rtrim`
              if(options.rtrim === undefined || options.rtrim === null || options.rtrim === false){
                options.rtrim = false;
              }else if(options.rtrim !== true){
                throw new Error(`Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`);
              }
              // Normalize option `ltrim`
              if(options.ltrim === undefined || options.ltrim === null || options.ltrim === false){
                options.ltrim = false;
              }else if(options.ltrim !== true){
                throw new Error(`Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`);
              }
              // Normalize option `trim`
              if(options.trim === undefined || options.trim === null || options.trim === false){
                options.trim = false;
              }else if(options.trim !== true){
                throw new Error(`Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`);
              }
              // Normalize options `trim`, `ltrim` and `rtrim`
              if(options.trim === true && opts.ltrim !== false){
                options.ltrim = true;
              }else if(options.ltrim !== true){
                options.ltrim = false;
              }
              if(options.trim === true && opts.rtrim !== false){
                options.rtrim = true;
              }else if(options.rtrim !== true){
                options.rtrim = false;
              }
              // Normalize option `to`
              if(options.to === undefined || options.to === null){
                options.to = -1;
              }else {
                if(typeof options.to === 'string' && /\d+/.test(options.to)){
                  options.to = parseInt(options.to);
                }
                if(Number.isInteger(options.to)){
                  if(options.to <= 0){
                    throw new Error(`Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`);
                  }
                }else {
                  throw new Error(`Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`);
                }
              }
              // Normalize option `to_line`
              if(options.to_line === undefined || options.to_line === null){
                options.to_line = -1;
              }else {
                if(typeof options.to_line === 'string' && /\d+/.test(options.to_line)){
                  options.to_line = parseInt(options.to_line);
                }
                if(Number.isInteger(options.to_line)){
                  if(options.to_line <= 0){
                    throw new Error(`Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`);
                  }
                }else {
                  throw new Error(`Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`);
                }
              }
              return options;
            };

            const isRecordEmpty = function(record){
              return record.every((field) => field == null || field.toString && field.toString().trim() === '');
            };

            const cr = 13; // `\r`, carriage return, 0x0D in hexadécimal, 13 in decimal
            const nl = 10; // `\n`, newline, 0x0A in hexadecimal, 10 in decimal

            const boms = {
              // Note, the following are equals:
              // Buffer.from("\ufeff")
              // Buffer.from([239, 187, 191])
              // Buffer.from('EFBBBF', 'hex')
              'utf8': Buffer.from([239, 187, 191]),
              // Note, the following are equals:
              // Buffer.from "\ufeff", 'utf16le
              // Buffer.from([255, 254])
              'utf16le': Buffer.from([255, 254])
            };

            const transform = function(original_options = {}) {
              const info = {
                bytes: 0,
                comment_lines: 0,
                empty_lines: 0,
                invalid_field_length: 0,
                lines: 1,
                records: 0
              };
              const options = normalize_options(original_options);
              return {
                info: info,
                original_options: original_options,
                options: options,
                state: init_state(options),
                __needMoreData: function(i, bufLen, end){
                  if(end) return false;
                  const {encoding, escape, quote} = this.options;
                  const {quoting, needMoreDataSize, recordDelimiterMaxLength} = this.state;
                  const numOfCharLeft = bufLen - i - 1;
                  const requiredLength = Math.max(
                    needMoreDataSize,
                    // Skip if the remaining buffer smaller than record delimiter
                    // If "record_delimiter" is yet to be discovered:
                    // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
                    // 2. We set the length to windows line ending in the current encoding
                    // Note, that encoding is known from user or bom discovery at that point
                    // recordDelimiterMaxLength,
                    recordDelimiterMaxLength === 0 ? Buffer.from('\r\n', encoding).length : recordDelimiterMaxLength,
                    // Skip if remaining buffer can be an escaped quote
                    quoting ? ((escape === null ? 0 : escape.length) + quote.length) : 0,
                    // Skip if remaining buffer can be record delimiter following the closing quote
                    quoting ? (quote.length + recordDelimiterMaxLength) : 0,
                  );
                  return numOfCharLeft < requiredLength;
                },
                // Central parser implementation
                parse: function(nextBuf, end, push, close){
                  const {bom, comment_no_infix, encoding, from_line, ltrim, max_record_size,raw, relax_quotes, rtrim, skip_empty_lines, to, to_line} = this.options;
                  let {comment, escape, quote, record_delimiter} = this.options;
                  const {bomSkipped, previousBuf, rawBuffer, escapeIsQuote} = this.state;
                  let buf;
                  if(previousBuf === undefined){
                    if(nextBuf === undefined){
                      // Handle empty string
                      close();
                      return;
                    }else {
                      buf = nextBuf;
                    }
                  }else if(previousBuf !== undefined && nextBuf === undefined){
                    buf = previousBuf;
                  }else {
                    buf = Buffer.concat([previousBuf, nextBuf]);
                  }
                  // Handle UTF BOM
                  if(bomSkipped === false){
                    if(bom === false){
                      this.state.bomSkipped = true;
                    }else if(buf.length < 3){
                      // No enough data
                      if(end === false){
                        // Wait for more data
                        this.state.previousBuf = buf;
                        return;
                      }
                    }else {
                      for(const encoding in boms){
                        if(boms[encoding].compare(buf, 0, boms[encoding].length) === 0){
                          // Skip BOM
                          const bomLength = boms[encoding].length;
                          this.state.bufBytesStart += bomLength;
                          buf = buf.slice(bomLength);
                          // Renormalize original options with the new encoding
                          this.options = normalize_options({...this.original_options, encoding: encoding});
                          // Options will re-evaluate the Buffer with the new encoding
                          ({comment, escape, quote } = this.options);
                          break;
                        }
                      }
                      this.state.bomSkipped = true;
                    }
                  }
                  const bufLen = buf.length;
                  let pos;
                  for(pos = 0; pos < bufLen; pos++){
                    // Ensure we get enough space to look ahead
                    // There should be a way to move this out of the loop
                    if(this.__needMoreData(pos, bufLen, end)){
                      break;
                    }
                    if(this.state.wasRowDelimiter === true){
                      this.info.lines++;
                      this.state.wasRowDelimiter = false;
                    }
                    if(to_line !== -1 && this.info.lines > to_line){
                      this.state.stop = true;
                      close();
                      return;
                    }
                    // Auto discovery of record_delimiter, unix, mac and windows supported
                    if(this.state.quoting === false && record_delimiter.length === 0){
                      const record_delimiterCount = this.__autoDiscoverRecordDelimiter(buf, pos);
                      if(record_delimiterCount){
                        record_delimiter = this.options.record_delimiter;
                      }
                    }
                    const chr = buf[pos];
                    if(raw === true){
                      rawBuffer.append(chr);
                    }
                    if((chr === cr || chr === nl) && this.state.wasRowDelimiter === false){
                      this.state.wasRowDelimiter = true;
                    }
                    // Previous char was a valid escape char
                    // treat the current char as a regular char
                    if(this.state.escaping === true){
                      this.state.escaping = false;
                    }else {
                      // Escape is only active inside quoted fields
                      // We are quoting, the char is an escape chr and there is a chr to escape
                      // if(escape !== null && this.state.quoting === true && chr === escape && pos + 1 < bufLen){
                      if(escape !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape.length < bufLen){
                        if(escapeIsQuote){
                          if(this.__isQuote(buf, pos+escape.length)){
                            this.state.escaping = true;
                            pos += escape.length - 1;
                            continue;
                          }
                        }else {
                          this.state.escaping = true;
                          pos += escape.length - 1;
                          continue;
                        }
                      }
                      // Not currently escaping and chr is a quote
                      // TODO: need to compare bytes instead of single char
                      if(this.state.commenting === false && this.__isQuote(buf, pos)){
                        if(this.state.quoting === true){
                          const nextChr = buf[pos+quote.length];
                          const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos+quote.length);
                          const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos+quote.length, nextChr);
                          const isNextChrDelimiter = this.__isDelimiter(buf, pos+quote.length, nextChr);
                          const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos+quote.length) : this.__isRecordDelimiter(nextChr, buf, pos+quote.length);
                          // Escape a quote
                          // Treat next char as a regular character
                          if(escape !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape.length)){
                            pos += escape.length - 1;
                          }else if(!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable){
                            this.state.quoting = false;
                            this.state.wasQuoting = true;
                            pos += quote.length - 1;
                            continue;
                          }else if(relax_quotes === false){
                            const err = this.__error(
                              new CsvError('CSV_INVALID_CLOSING_QUOTE', [
                                'Invalid Closing Quote:',
                                `got "${String.fromCharCode(nextChr)}"`,
                                `at line ${this.info.lines}`,
                                'instead of delimiter, record delimiter, trimable character',
                                '(if activated) or comment',
                              ], this.options, this.__infoField())
                            );
                            if(err !== undefined) return err;
                          }else {
                            this.state.quoting = false;
                            this.state.wasQuoting = true;
                            this.state.field.prepend(quote);
                            pos += quote.length - 1;
                          }
                        }else {
                          if(this.state.field.length !== 0){
                            // In relax_quotes mode, treat opening quote preceded by chrs as regular
                            if(relax_quotes === false){
                              const info = this.__infoField();
                              const bom = Object.keys(boms).map(b => boms[b].equals(this.state.field.toString()) ? b : false).filter(Boolean)[0];
                              const err = this.__error(
                                new CsvError('INVALID_OPENING_QUOTE', [
                                  'Invalid Opening Quote:',
                                  `a quote is found on field ${JSON.stringify(info.column)} at line ${info.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                                  bom ? `(${bom} bom)` : undefined
                                ], this.options, info, {
                                  field: this.state.field,
                                })
                              );
                              if(err !== undefined) return err;
                            }
                          }else {
                            this.state.quoting = true;
                            pos += quote.length - 1;
                            continue;
                          }
                        }
                      }
                      if(this.state.quoting === false){
                        const recordDelimiterLength = this.__isRecordDelimiter(chr, buf, pos);
                        if(recordDelimiterLength !== 0){
                          // Do not emit comments which take a full line
                          const skipCommentLine = this.state.commenting && (this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0);
                          if(skipCommentLine){
                            this.info.comment_lines++;
                            // Skip full comment line
                          }else {
                            // Activate records emition if above from_line
                            if(this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1: 0) >= from_line){
                              this.state.enabled = true;
                              this.__resetField();
                              this.__resetRecord();
                              pos += recordDelimiterLength - 1;
                              continue;
                            }
                            // Skip if line is empty and skip_empty_lines activated
                            if(skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0){
                              this.info.empty_lines++;
                              pos += recordDelimiterLength - 1;
                              continue;
                            }
                            this.info.bytes = this.state.bufBytesStart + pos;
                            const errField = this.__onField();
                            if(errField !== undefined) return errField;
                            this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                            const errRecord = this.__onRecord(push);
                            if(errRecord !== undefined) return errRecord;
                            if(to !== -1 && this.info.records >= to){
                              this.state.stop = true;
                              close();
                              return;
                            }
                          }
                          this.state.commenting = false;
                          pos += recordDelimiterLength - 1;
                          continue;
                        }
                        if(this.state.commenting){
                          continue;
                        }
                        const commentCount = comment === null ? 0 : this.__compareBytes(comment, buf, pos, chr);
                        if(commentCount !== 0 && (comment_no_infix === false || this.state.field.length === 0)){
                          this.state.commenting = true;
                          continue;
                        }
                        const delimiterLength = this.__isDelimiter(buf, pos, chr);
                        if(delimiterLength !== 0){
                          this.info.bytes = this.state.bufBytesStart + pos;
                          const errField = this.__onField();
                          if(errField !== undefined) return errField;
                          pos += delimiterLength - 1;
                          continue;
                        }
                      }
                    }
                    if(this.state.commenting === false){
                      if(max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size){
                        return this.__error(
                          new CsvError('CSV_MAX_RECORD_SIZE', [
                            'Max Record Size:',
                            'record exceed the maximum number of tolerated bytes',
                            `of ${max_record_size}`,
                            `at line ${this.info.lines}`,
                          ], this.options, this.__infoField())
                        );
                      }
                    }
                    const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
                    // rtrim in non quoting is handle in __onField
                    const rappend = rtrim === false || this.state.wasQuoting === false;
                    if(lappend === true && rappend === true){
                      this.state.field.append(chr);
                    }else if(rtrim === true && !this.__isCharTrimable(buf, pos)){
                      return this.__error(
                        new CsvError('CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE', [
                          'Invalid Closing Quote:',
                          'found non trimable byte after quote',
                          `at line ${this.info.lines}`,
                        ], this.options, this.__infoField())
                      );
                    }else {
                      if(lappend === false){
                        pos += this.__isCharTrimable(buf, pos) - 1;
                      }
                      continue;
                    }
                  }
                  if(end === true){
                    // Ensure we are not ending in a quoting state
                    if(this.state.quoting === true){
                      const err = this.__error(
                        new CsvError('CSV_QUOTE_NOT_CLOSED', [
                          'Quote Not Closed:',
                          `the parsing is finished with an opening quote at line ${this.info.lines}`,
                        ], this.options, this.__infoField())
                      );
                      if(err !== undefined) return err;
                    }else {
                      // Skip last line if it has no characters
                      if(this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0){
                        this.info.bytes = this.state.bufBytesStart + pos;
                        const errField = this.__onField();
                        if(errField !== undefined) return errField;
                        const errRecord = this.__onRecord(push);
                        if(errRecord !== undefined) return errRecord;
                      }else if(this.state.wasRowDelimiter === true){
                        this.info.empty_lines++;
                      }else if(this.state.commenting === true){
                        this.info.comment_lines++;
                      }
                    }
                  }else {
                    this.state.bufBytesStart += pos;
                    this.state.previousBuf = buf.slice(pos);
                  }
                  if(this.state.wasRowDelimiter === true){
                    this.info.lines++;
                    this.state.wasRowDelimiter = false;
                  }
                },
                __onRecord: function(push){
                  const {columns, group_columns_by_name, encoding, info, from, relax_column_count, relax_column_count_less, relax_column_count_more, raw, skip_records_with_empty_values} = this.options;
                  const {enabled, record} = this.state;
                  if(enabled === false){
                    return this.__resetRecord();
                  }
                  // Convert the first line into column names
                  const recordLength = record.length;
                  if(columns === true){
                    if(skip_records_with_empty_values === true && isRecordEmpty(record)){
                      this.__resetRecord();
                      return;
                    }
                    return this.__firstLineToColumns(record);
                  }
                  if(columns === false && this.info.records === 0){
                    this.state.expectedRecordLength = recordLength;
                  }
                  if(recordLength !== this.state.expectedRecordLength){
                    const err = columns === false ?
                      new CsvError('CSV_RECORD_INCONSISTENT_FIELDS_LENGTH', [
                        'Invalid Record Length:',
                        `expect ${this.state.expectedRecordLength},`,
                        `got ${recordLength} on line ${this.info.lines}`,
                      ], this.options, this.__infoField(), {
                        record: record,
                      })
                      :
                      new CsvError('CSV_RECORD_INCONSISTENT_COLUMNS', [
                        'Invalid Record Length:',
                        `columns length is ${columns.length},`, // rename columns
                        `got ${recordLength} on line ${this.info.lines}`,
                      ], this.options, this.__infoField(), {
                        record: record,
                      });
                    if(relax_column_count === true ||
                      (relax_column_count_less === true && recordLength < this.state.expectedRecordLength) ||
                      (relax_column_count_more === true && recordLength > this.state.expectedRecordLength)){
                      this.info.invalid_field_length++;
                      this.state.error = err;
                    // Error is undefined with skip_records_with_error
                    }else {
                      const finalErr = this.__error(err);
                      if(finalErr) return finalErr;
                    }
                  }
                  if(skip_records_with_empty_values === true && isRecordEmpty(record)){
                    this.__resetRecord();
                    return;
                  }
                  if(this.state.recordHasError === true){
                    this.__resetRecord();
                    this.state.recordHasError = false;
                    return;
                  }
                  this.info.records++;
                  if(from === 1 || this.info.records >= from){
                    const {objname} = this.options;
                    // With columns, records are object
                    if(columns !== false){
                      const obj = {};
                      // Transform record array to an object
                      for(let i = 0, l = record.length; i < l; i++){
                        if(columns[i] === undefined || columns[i].disabled) continue;
                        // Turn duplicate columns into an array
                        if (group_columns_by_name === true && obj[columns[i].name] !== undefined) {
                          if (Array.isArray(obj[columns[i].name])) {
                            obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
                          } else {
                            obj[columns[i].name] = [obj[columns[i].name], record[i]];
                          }
                        } else {
                          obj[columns[i].name] = record[i];
                        }
                      }
                      // Without objname (default)
                      if(raw === true || info === true){
                        const extRecord = Object.assign(
                          {record: obj},
                          (raw === true ? {raw: this.state.rawBuffer.toString(encoding)}: {}),
                          (info === true ? {info: this.__infoRecord()}: {})
                        );
                        const err = this.__push(
                          objname === undefined ? extRecord : [obj[objname], extRecord]
                          , push);
                        if(err){
                          return err;
                        }
                      }else {
                        const err = this.__push(
                          objname === undefined ? obj : [obj[objname], obj]
                          , push);
                        if(err){
                          return err;
                        }
                      }
                    // Without columns, records are array
                    }else {
                      if(raw === true || info === true){
                        const extRecord = Object.assign(
                          {record: record},
                          raw === true ? {raw: this.state.rawBuffer.toString(encoding)}: {},
                          info === true ? {info: this.__infoRecord()}: {}
                        );
                        const err = this.__push(
                          objname === undefined ? extRecord : [record[objname], extRecord]
                          , push);
                        if(err){
                          return err;
                        }
                      }else {
                        const err = this.__push(
                          objname === undefined ? record : [record[objname], record]
                          , push);
                        if(err){
                          return err;
                        }
                      }
                    }
                  }
                  this.__resetRecord();
                },
                __firstLineToColumns: function(record){
                  const {firstLineToHeaders} = this.state;
                  try{
                    const headers = firstLineToHeaders === undefined ? record : firstLineToHeaders.call(null, record);
                    if(!Array.isArray(headers)){
                      return this.__error(
                        new CsvError('CSV_INVALID_COLUMN_MAPPING', [
                          'Invalid Column Mapping:',
                          'expect an array from column function,',
                          `got ${JSON.stringify(headers)}`
                        ], this.options, this.__infoField(), {
                          headers: headers,
                        })
                      );
                    }
                    const normalizedHeaders = normalize_columns_array(headers);
                    this.state.expectedRecordLength = normalizedHeaders.length;
                    this.options.columns = normalizedHeaders;
                    this.__resetRecord();
                    return;
                  }catch(err){
                    return err;
                  }
                },
                __resetRecord: function(){
                  if(this.options.raw === true){
                    this.state.rawBuffer.reset();
                  }
                  this.state.error = undefined;
                  this.state.record = [];
                  this.state.record_length = 0;
                },
                __onField: function(){
                  const {cast, encoding, rtrim, max_record_size} = this.options;
                  const {enabled, wasQuoting} = this.state;
                  // Short circuit for the from_line options
                  if(enabled === false){
                    return this.__resetField();
                  }
                  let field = this.state.field.toString(encoding);
                  if(rtrim === true && wasQuoting === false){
                    field = field.trimRight();
                  }
                  if(cast === true){
                    const [err, f] = this.__cast(field);
                    if(err !== undefined) return err;
                    field = f;
                  }
                  this.state.record.push(field);
                  // Increment record length if record size must not exceed a limit
                  if(max_record_size !== 0 && typeof field === 'string'){
                    this.state.record_length += field.length;
                  }
                  this.__resetField();
                },
                __resetField: function(){
                  this.state.field.reset();
                  this.state.wasQuoting = false;
                },
                __push: function(record, push){
                  const {on_record} = this.options;
                  if(on_record !== undefined){
                    const info = this.__infoRecord();
                    try{
                      record = on_record.call(null, record, info);
                    }catch(err){
                      return err;
                    }
                    if(record === undefined || record === null){ return; }
                  }
                  push(record);
                },
                // Return a tuple with the error and the casted value
                __cast: function(field){
                  const {columns, relax_column_count} = this.options;
                  const isColumns = Array.isArray(columns);
                  // Dont loose time calling cast
                  // because the final record is an object
                  // and this field can't be associated to a key present in columns
                  if(isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length){
                    return [undefined, undefined];
                  }
                  if(this.state.castField !== null){
                    try{
                      const info = this.__infoField();
                      return [undefined, this.state.castField.call(null, field, info)];
                    }catch(err){
                      return [err];
                    }
                  }
                  if(this.__isFloat(field)){
                    return [undefined, parseFloat(field)];
                  }else if(this.options.cast_date !== false){
                    const info = this.__infoField();
                    return [undefined, this.options.cast_date.call(null, field, info)];
                  }
                  return [undefined, field];
                },
                // Helper to test if a character is a space or a line delimiter
                __isCharTrimable: function(buf, pos){
                  const isTrim = (buf, pos) => {
                    const {timchars} = this.state;
                    loop1: for(let i = 0; i < timchars.length; i++){
                      const timchar = timchars[i];
                      for(let j = 0; j < timchar.length; j++){
                        if(timchar[j] !== buf[pos+j]) continue loop1;
                      }
                      return timchar.length;
                    }
                    return 0;
                  };
                  return isTrim(buf, pos);
                },
                // Keep it in case we implement the `cast_int` option
                // __isInt(value){
                //   // return Number.isInteger(parseInt(value))
                //   // return !isNaN( parseInt( obj ) );
                //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
                // }
                __isFloat: function(value){
                  return (value - parseFloat(value) + 1) >= 0; // Borrowed from jquery
                },
                __compareBytes: function(sourceBuf, targetBuf, targetPos, firstByte){
                  if(sourceBuf[0] !== firstByte) return 0;
                  const sourceLength = sourceBuf.length;
                  for(let i = 1; i < sourceLength; i++){
                    if(sourceBuf[i] !== targetBuf[targetPos+i]) return 0;
                  }
                  return sourceLength;
                },
                __isDelimiter: function(buf, pos, chr){
                  const {delimiter, ignore_last_delimiters} = this.options;
                  if(ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1){
                    return 0;
                  }else if(ignore_last_delimiters !== false && typeof ignore_last_delimiters === 'number' && this.state.record.length === ignore_last_delimiters - 1){
                    return 0;
                  }
                  loop1: for(let i = 0; i < delimiter.length; i++){
                    const del = delimiter[i];
                    if(del[0] === chr){
                      for(let j = 1; j < del.length; j++){
                        if(del[j] !== buf[pos+j]) continue loop1;
                      }
                      return del.length;
                    }
                  }
                  return 0;
                },
                __isRecordDelimiter: function(chr, buf, pos){
                  const {record_delimiter} = this.options;
                  const recordDelimiterLength = record_delimiter.length;
                  loop1: for(let i = 0; i < recordDelimiterLength; i++){
                    const rd = record_delimiter[i];
                    const rdLength = rd.length;
                    if(rd[0] !== chr){
                      continue;
                    }
                    for(let j = 1; j < rdLength; j++){
                      if(rd[j] !== buf[pos+j]){
                        continue loop1;
                      }
                    }
                    return rd.length;
                  }
                  return 0;
                },
                __isEscape: function(buf, pos, chr){
                  const {escape} = this.options;
                  if(escape === null) return false;
                  const l = escape.length;
                  if(escape[0] === chr){
                    for(let i = 0; i < l; i++){
                      if(escape[i] !== buf[pos+i]){
                        return false;
                      }
                    }
                    return true;
                  }
                  return false;
                },
                __isQuote: function(buf, pos){
                  const {quote} = this.options;
                  if(quote === null) return false;
                  const l = quote.length;
                  for(let i = 0; i < l; i++){
                    if(quote[i] !== buf[pos+i]){
                      return false;
                    }
                  }
                  return true;
                },
                __autoDiscoverRecordDelimiter: function(buf, pos){
                  const { encoding } = this.options;
                  // Note, we don't need to cache this information in state,
                  // It is only called on the first line until we find out a suitable
                  // record delimiter.
                  const rds = [
                    // Important, the windows line ending must be before mac os 9
                    Buffer.from('\r\n', encoding),
                    Buffer.from('\n', encoding),
                    Buffer.from('\r', encoding),
                  ];
                  loop: for(let i = 0; i < rds.length; i++){
                    const l = rds[i].length;
                    for(let j = 0; j < l; j++){
                      if(rds[i][j] !== buf[pos + j]){
                        continue loop;
                      }
                    }
                    this.options.record_delimiter.push(rds[i]);
                    this.state.recordDelimiterMaxLength = rds[i].length;
                    return rds[i].length;
                  }
                  return 0;
                },
                __error: function(msg){
                  const {encoding, raw, skip_records_with_error} = this.options;
                  const err = typeof msg === 'string' ? new Error(msg) : msg;
                  if(skip_records_with_error){
                    this.state.recordHasError = true;
                    if(this.options.on_skip !== undefined){
                      this.options.on_skip(err, raw ? this.state.rawBuffer.toString(encoding) : undefined);
                    }
                    // this.emit('skip', err, raw ? this.state.rawBuffer.toString(encoding) : undefined);
                    return undefined;
                  }else {
                    return err;
                  }
                },
                __infoDataSet: function(){
                  return {
                    ...this.info,
                    columns: this.options.columns
                  };
                },
                __infoRecord: function(){
                  const {columns, raw, encoding} = this.options;
                  return {
                    ...this.__infoDataSet(),
                    error: this.state.error,
                    header: columns === true,
                    index: this.state.record.length,
                    raw: raw ? this.state.rawBuffer.toString(encoding) : undefined
                  };
                },
                __infoField: function(){
                  const {columns} = this.options;
                  const isColumns = Array.isArray(columns);
                  return {
                    ...this.__infoRecord(),
                    column: isColumns === true ?
                      (columns.length > this.state.record.length ?
                        columns[this.state.record.length].name :
                        null
                      ) :
                      this.state.record.length,
                    quoting: this.state.wasQuoting,
                  };
                }
              };
            };

            class Parser extends Transform {
              constructor(opts = {}){
                super({...{readableObjectMode: true}, ...opts, encoding: null});
                this.api = transform(opts);
                this.api.options.on_skip = (err, chunk) => {
                  this.emit('skip', err, chunk);
                };
                // Backward compatibility
                this.state = this.api.state;
                this.options = this.api.options;
                this.info = this.api.info;
              }
              // Implementation of `Transform._transform`
              _transform(buf, encoding, callback){
                if(this.state.stop === true){
                  return;
                }
                const err = this.api.parse(buf, false, (record) => {
                  this.push(record);
                }, () => {
                  this.push(null);
                  this.on('end', this.destroy);
                });
                if(err !== undefined){
                  this.state.stop = true;
                }
                callback(err);
              }
              // Implementation of `Transform._flush`
              _flush(callback){
                if(this.state.stop === true){
                  return;
                }
                const err = this.api.parse(undefined, true, (record) => {
                  this.push(record);
                }, () => {
                  this.push(null);
                  this.on('end', this.destroy);
                });
                callback(err);
              }
            }

            const parse = function(){
              let data, options, callback;
              for(const i in arguments){
                const argument = arguments[i];
                const type = typeof argument;
                if(data === undefined && (typeof argument === 'string' || isBuffer(argument))){
                  data = argument;
                }else if(options === undefined && is_object(argument)){
                  options = argument;
                }else if(callback === undefined && type === 'function'){
                  callback = argument;
                }else {
                  throw new CsvError('CSV_INVALID_ARGUMENT', [
                    'Invalid argument:',
                    `got ${JSON.stringify(argument)} at index ${i}`
                  ], options || {});
                }
              }
              const parser = new Parser(options);
              if(callback){
                const records = options === undefined || options.objname === undefined ? [] : {};
                parser.on('readable', function(){
                  let record;
                  while((record = this.read()) !== null){
                    if(options === undefined || options.objname === undefined){
                      records.push(record);
                    }else {
                      records[record[0]] = record[1];
                    }
                  }
                });
                parser.on('error', function(err){
                  callback(err, undefined, parser.api.__infoDataSet());
                });
                parser.on('end', function(){
                  callback(undefined, records, parser.api.__infoDataSet());
                });
              }
              if(data !== undefined){
                const writer = function(){
                  parser.write(data);
                  parser.end();
                };
                // Support Deno, Rollup doesnt provide a shim for setImmediate
                if(typeof setImmediate === 'function'){
                  setImmediate(writer);
                }else {
                  setTimeout(writer, 0);
                }
              }
              return parser;
            };

            exports.CsvError = CsvError;
            exports.Parser = Parser;
            exports.parse = parse;

            return exports;

})({});
