/**
 * [js-md4]{@link https://github.com/emn178/js-md4}
 *
 * @namespace md4
 * @version 0.3.2
 * @author Yi-Cyuan Chen [emn178@gmail.com]
 * @copyright Yi-Cyuan Chen 2015-2027
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var root = typeof window === 'object' ? window : {};
  var NODE_JS = !root.JS_MD4_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  }
  var COMMON_JS = !root.JS_MD4_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_MD4_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [128, 32768, 8388608, -2147483648];
  var SHIFT = [0, 8, 16, 24];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'buffer', 'arrayBuffer'];

  var blocks = [], buffer8;
  if (ARRAY_BUFFER) {
    var buffer = new ArrayBuffer(68);
    buffer8 = new Uint8Array(buffer);
    blocks = new Uint32Array(buffer);
  }

  /**
   * @method hex
   * @memberof md4
   * @description Output hash as hex string
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {String} Hex string
   * @example
   * md4.hex('The quick brown fox jumps over the lazy dog');
   * // equal to
   * md4('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method digest
   * @memberof md4
   * @description Output hash as bytes array
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Array} Bytes array
   * @example
   * md4.digest('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method array
   * @memberof md4
   * @description Output hash as bytes array
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Array} Bytes array
   * @example
   * md4.array('The quick brown fox jumps over the lazy dog');
   */
  /**
   * @method buffer
   * @memberof md4
   * @description Output hash as ArrayBuffer
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {ArrayBuffer} ArrayBuffer
   * @example
   * md4.buffer('The quick brown fox jumps over the lazy dog');
   */
  var createOutputMethod = function (outputType) {
    return function(message) {
      return new Md4(true).update(message)[outputType]();
    }
  };

  /**
   * @method create
   * @memberof md4
   * @description Create Md4 object
   * @returns {Md4} MD4 object.
   * @example
   * var hash = md4.create();
   */
  /**
   * @method update
   * @memberof md4
   * @description Create and update Md4 object
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Md4} MD4 object.
   * @example
   * var hash = md4.update('The quick brown fox jumps over the lazy dog');
   * // equal to
   * var hash = md4.create();
   * hash.update('The quick brown fox jumps over the lazy dog');
   */
  var createMethod = function () {
    var method = createOutputMethod('hex');
    if (NODE_JS) {
      method = nodeWrap(method);
    }
    method.create = function () {
      return new Md4();
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type);
    }
    return method;
  };

  var nodeWrap = function (method) {
    var crypto = require('crypto');
    var Buffer = require('buffer').Buffer;
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash('md4').update(message, 'utf8').digest('hex');
      } else if (ARRAY_BUFFER && message instanceof ArrayBuffer) {
        message = new Uint8Array(message);
      } else if (message.length === undefined) {
        return method(message);
      }
      return crypto.createHash('md4').update(new Buffer(message)).digest('hex');
    };
    return nodeMethod;
  };

  /**
   * Md4 class
   * @class Md4
   * @description This is internal class.
   * @see {@link md4.create}
   */
  function Md4(sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
      this.buffer8 = buffer8;
    } else {
      if (ARRAY_BUFFER) {
        var buffer = new ArrayBuffer(68);
        this.buffer8 = new Uint8Array(buffer);
        this.blocks = new Uint32Array(buffer);
      } else {
        this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }
    }
    this.h0 = this.h1 = this.h2 = this.h3 = this.start = this.bytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
  }

  /**
   * @method update
   * @memberof Md4
   * @instance
   * @description Update hash
   * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
   * @returns {Md4} MD4 object.
   * @see {@link md4.update}
   */
  Md4.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString = typeof message !== 'string';
    if (notString && ARRAY_BUFFER && message instanceof ArrayBuffer) {
      message = new Uint8Array(message);
    }
    var code, index = 0, i, length = message.length || 0, blocks = this.blocks;
    var buffer8 = this.buffer8;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = blocks[16];
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        if (ARRAY_BUFFER) {
          for (i = this.start; index < length && i < 64; ++index) {
            buffer8[i++] = message[index];
          }
        } else {
          for (i = this.start; index < length && i < 64; ++index) {
            blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
          }
        }
      } else {
        if (ARRAY_BUFFER) {
          for (i = this.start; index < length && i < 64; ++index) {
            code = message.charCodeAt(index);
            if (code < 0x80) {
              buffer8[i++] = code;
            } else if (code < 0x800) {
              buffer8[i++] = 0xc0 | (code >> 6);
              buffer8[i++] = 0x80 | (code & 0x3f);
            } else if (code < 0xd800 || code >= 0xe000) {
              buffer8[i++] = 0xe0 | (code >> 12);
              buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
              buffer8[i++] = 0x80 | (code & 0x3f);
            } else {
              code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
              buffer8[i++] = 0xf0 | (code >> 18);
              buffer8[i++] = 0x80 | ((code >> 12) & 0x3f);
              buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
              buffer8[i++] = 0x80 | (code & 0x3f);
            }
          }
        } else {
          for (i = this.start; index < length && i < 64; ++index) {
            code = message.charCodeAt(index);
            if (code < 0x80) {
              blocks[i >> 2] |= code << SHIFT[i++ & 3];
            } else if (code < 0x800) {
              blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else if (code < 0xd800 || code >= 0xe000) {
              blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else {
              code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
              blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            }
          }
        }
      }
      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Md4.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[i >> 2] |= EXTRA[i & 3];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = blocks[16];
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.bytes << 3;
    this.hash();
  };

  Md4.prototype.hash = function () {
    var a, b, c, d, ab, bc, cd, da, blocks = this.blocks;

    if (this.first) {
      a = blocks[0] - 1;
      a = (a << 3) | (a >>> 29);
      d = ((a & 0xefcdab89) | (~a & 0x98badcfe)) + blocks[1] + 271733878;
      d = (d << 7) | (d >>> 25);
      c = ((d & a) | (~d & 0xefcdab89)) + blocks[2] - 1732584194;
      c = (c << 11) | (c >>> 21);
      b = ((c & d) | (~c & a)) + blocks[3] - 271733879;
      b = (b << 19) | (b >>> 13);
    } else {
      a = this.h0;
      b = this.h1;
      c = this.h2;
      d = this.h3;
      a += ((b & c) | (~b & d)) + blocks[0];
      a = (a << 3) | (a >>> 29);
      d += ((a & b) | (~a & c)) + blocks[1];
      d = (d << 7) | (d >>> 25);
      c += ((d & a) | (~d & b)) + blocks[2];
      c = (c << 11) | (c >>> 21);
      b += ((c & d) | (~c & a)) + blocks[3];
      b = (b << 19) | (b >>> 13);
    }
    a += ((b & c) | (~b & d)) + blocks[4];
    a = (a << 3) | (a >>> 29);
    d += ((a & b) | (~a & c)) + blocks[5];
    d = (d << 7) | (d >>> 25);
    c += ((d & a) | (~d & b)) + blocks[6];
    c = (c << 11) | (c >>> 21);
    b += ((c & d) | (~c & a)) + blocks[7];
    b = (b << 19) | (b >>> 13);
    a += ((b & c) | (~b & d)) + blocks[8];
    a = (a << 3) | (a >>> 29);
    d += ((a & b) | (~a & c)) + blocks[9];
    d = (d << 7) | (d >>> 25);
    c += ((d & a) | (~d & b)) + blocks[10];
    c = (c << 11) | (c >>> 21);
    b += ((c & d) | (~c & a)) + blocks[11];
    b = (b << 19) | (b >>> 13);
    a += ((b & c) | (~b & d)) + blocks[12];
    a = (a << 3) | (a >>> 29);
    d += ((a & b) | (~a & c)) + blocks[13];
    d = (d << 7) | (d >>> 25);
    c += ((d & a) | (~d & b)) + blocks[14];
    c = (c << 11) | (c >>> 21);
    b += ((c & d) | (~c & a)) + blocks[15];
    b = (b << 19) | (b >>> 13);

    bc = b & c;
    a += (bc | (b & d) | (c & d)) + blocks[0] + 1518500249;
    a = (a << 3) | (a >>> 29);
    ab = a & b;
    d += (ab | (a & c) | bc) + blocks[4] + 1518500249;
    d = (d << 5) | (d >>> 27);
    da = d & a;
    c += (da | (d & b) | ab) + blocks[8] + 1518500249;
    c = (c << 9) | (c >>> 23);
    cd = c & d;
    b += (cd | (c & a) | da) + blocks[12] + 1518500249;
    b = (b << 13) | (b >>> 19);
    bc = b & c;
    a += (bc | (b & d) | cd) + blocks[1] + 1518500249;
    a = (a << 3) | (a >>> 29);
    ab = a & b;
    d += (ab | (a & c) | bc) + blocks[5] + 1518500249;
    d = (d << 5) | (d >>> 27);
    da = d & a;
    c += (da | (d & b) | ab) + blocks[9] + 1518500249;
    c = (c << 9) | (c >>> 23);
    cd = c & d;
    b += (cd | (c & a) | da) + blocks[13] + 1518500249;
    b = (b << 13) | (b >>> 19);
    bc = b & c;
    a += (bc | (b & d) | cd) + blocks[2] + 1518500249;
    a = (a << 3) | (a >>> 29);
    ab = a & b;
    d += (ab | (a & c) | bc) + blocks[6] + 1518500249;
    d = (d << 5) | (d >>> 27);
    da = d & a;
    c += (da | (d & b) | ab) + blocks[10] + 1518500249;
    c = (c << 9) | (c >>> 23);
    cd = c & d;
    b += (cd | (c & a) | da) + blocks[14] + 1518500249;
    b = (b << 13) | (b >>> 19);
    bc = b & c;
    a += (bc | (b & d) | cd) + blocks[3] + 1518500249;
    a = (a << 3) | (a >>> 29);
    ab = a & b;
    d += (ab | (a & c) | bc) + blocks[7] + 1518500249;
    d = (d << 5) | (d >>> 27);
    da = d & a;
    c += (da | (d & b) | ab) + blocks[11] + 1518500249;
    c = (c << 9) | (c >>> 23);
    b += ((c & d) | (c & a) | da) + blocks[15] + 1518500249;
    b = (b << 13) | (b >>> 19);

    bc = b ^ c;
    a += (bc ^ d) + blocks[0] + 1859775393;
    a = (a << 3) | (a >>> 29);
    d += (bc ^ a) + blocks[8] + 1859775393;
    d = (d << 9) | (d >>> 23);
    da = d ^ a;
    c += (da ^ b) + blocks[4] + 1859775393;
    c = (c << 11) | (c >>> 21);
    b += (da ^ c) + blocks[12] + 1859775393;
    b = (b << 15) | (b >>> 17);
    bc = b ^ c;
    a += (bc ^ d) + blocks[2] + 1859775393;
    a = (a << 3) | (a >>> 29);
    d += (bc ^ a) + blocks[10] + 1859775393;
    d = (d << 9) | (d >>> 23);
    da = d ^ a;
    c += (da ^ b) + blocks[6] + 1859775393;
    c = (c << 11) | (c >>> 21);
    b += (da ^ c) + blocks[14] + 1859775393;
    b = (b << 15) | (b >>> 17);
    bc = b ^ c;
    a += (bc ^ d) + blocks[1] + 1859775393;
    a = (a << 3) | (a >>> 29);
    d += (bc ^ a) + blocks[9] + 1859775393;
    d = (d << 9) | (d >>> 23);
    da = d ^ a;
    c += (da ^ b) + blocks[5] + 1859775393;
    c = (c << 11) | (c >>> 21);
    b += (da ^ c) + blocks[13] + 1859775393;
    b = (b << 15) | (b >>> 17);
    bc = b ^ c;
    a += (bc ^ d) + blocks[3] + 1859775393;
    a = (a << 3) | (a >>> 29);
    d += (bc ^ a) + blocks[11] + 1859775393;
    d = (d << 9) | (d >>> 23);
    da = d ^ a;
    c += (da ^ b) + blocks[7] + 1859775393;
    c = (c << 11) | (c >>> 21);
    b += (da ^ c) + blocks[15] + 1859775393;
    b = (b << 15) | (b >>> 17);

    if (this.first) {
      this.h0 = a + 1732584193 << 0;
      this.h1 = b - 271733879 << 0;
      this.h2 = c - 1732584194 << 0;
      this.h3 = d + 271733878 << 0;
      this.first = false;
    } else {
      this.h0 = this.h0 + a << 0;
      this.h1 = this.h1 + b << 0;
      this.h2 = this.h2 + c << 0;
      this.h3 = this.h3 + d << 0;
    }
  };

  /**
   * @method hex
   * @memberof Md4
   * @instance
   * @description Output hash as hex string
   * @returns {String} Hex string
   * @see {@link md4.hex}
   * @example
   * hash.hex();
   */
  Md4.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;

    return HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
      HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
      HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
      HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
      HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
      HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
      HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
      HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
      HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
      HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
      HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
      HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
      HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
      HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
      HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
      HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F];
  };

  /**
   * @method toString
   * @memberof Md4
   * @instance
   * @description Output hash as hex string
   * @returns {String} Hex string
   * @see {@link md4.hex}
   * @example
   * hash.toString();
   */
  Md4.prototype.toString = Md4.prototype.hex;

  /**
   * @method digest
   * @memberof Md4
   * @instance
   * @description Output hash as bytes array
   * @returns {Array} Bytes array
   * @see {@link md4.digest}
   * @example
   * hash.digest();
   */
  Md4.prototype.digest = function() {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;
    return [
      h0 & 0xFF, (h0 >> 8) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 24) & 0xFF,
      h1 & 0xFF, (h1 >> 8) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 24) & 0xFF,
      h2 & 0xFF, (h2 >> 8) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 24) & 0xFF,
      h3 & 0xFF, (h3 >> 8) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 24) & 0xFF
    ];
  };

  /**
   * @method array
   * @memberof Md4
   * @instance
   * @description Output hash as bytes array
   * @returns {Array} Bytes array
   * @see {@link md4.array}
   * @example
   * hash.array();
   */
  Md4.prototype.array = Md4.prototype.digest;

  /**
   * @method arrayBuffer
   * @memberof Md4
   * @instance
   * @description Output hash as ArrayBuffer
   * @returns {ArrayBuffer} ArrayBuffer
   * @see {@link md4.arrayBuffer}
   * @example
   * hash.arrayBuffer();
   */
  Md4.prototype.arrayBuffer = function() {
    this.finalize();

    var buffer = new ArrayBuffer(16);
    var blocks = new Uint32Array(buffer);
    blocks[0] = this.h0;
    blocks[1] = this.h1;
    blocks[2] = this.h2;
    blocks[3] = this.h3;
    return buffer;
  };

  /**
   * @method buffer
   * @deprecated This maybe confuse with Buffer in node.js. Please use arrayBuffer instead.
   * @memberof Md4
   * @instance
   * @description Output hash as ArrayBuffer
   * @returns {ArrayBuffer} ArrayBuffer
   * @see {@link md4.buffer}
   * @example
   * hash.buffer();
   */
  Md4.prototype.buffer = Md4.prototype.arrayBuffer;

  var exports = createMethod();

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    /**
     * @method md4
     * @description MD4 hash function, export to global in browsers.
     * @param {String|Array|Uint8Array|ArrayBuffer} message message to hash
     * @returns {String} md4 hashes
     * @example
     * md4(''); // 31d6cfe0d16ae931b73c59d7e0c089c0
     * md4('The quick brown fox jumps over the lazy dog'); // 1bee69a46ba811185c194762abaeae90
     * md4('The quick brown fox jumps over the lazy dog.'); // 2812c6c7136898c51f6f6739ad08750e
     *
     * // It also supports UTF-8 encoding
     * md4('中文'); // 223088bf7bd45a16436b15360c5fc5a0
     *
     * // It also supports byte `Array`, `Uint8Array`, `ArrayBuffer`
     * md4([]); // 31d6cfe0d16ae931b73c59d7e0c089c0
     * md4(new Uint8Array([])); // 31d6cfe0d16ae931b73c59d7e0c089c0
     */
    root.md4 = exports;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();
