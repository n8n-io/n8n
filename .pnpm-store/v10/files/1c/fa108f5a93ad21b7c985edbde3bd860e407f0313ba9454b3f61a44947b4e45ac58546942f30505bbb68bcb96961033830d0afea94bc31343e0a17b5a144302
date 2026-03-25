/*
   Modifications for better node.js integration:
    Copyright 2013 Brian White. All rights reserved.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to
    deal in the Software without restriction, including without limitation the
    rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
    sell copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
    IN THE SOFTWARE.
*/
/*
   Original source code:
    Copyright 2012 Joshua Bell

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

//
// Utilities
//

/**
 * @param {number} a The number to test.
 * @param {number} min The minimum value in the range, inclusive.
 * @param {number} max The maximum value in the range, inclusive.
 * @return {boolean} True if a >= min and a <= max.
 */
function inRange(a, min, max) {
  return min <= a && a <= max;
}

/**
 * @param {number} n The numerator.
 * @param {number} d The denominator.
 * @return {number} The result of the integer division of n by d.
 */
function div(n, d) {
  return Math.floor(n / d);
}


//
// Implementation of Encoding specification
// http://dvcs.w3.org/hg/encoding/raw-file/tip/Overview.html
//

//
// 3. Terminology
//

//
// 4. Encodings
//

/** @const */ var EOF_byte = -1;
/** @const */ var EOF_code_point = -1;

/**
 * @constructor
 * @param {Buffer} bytes Array of bytes that provide the stream.
 */
function ByteInputStream(bytes) {
  /** @type {number} */
  var pos = 0;

  /** @return {number} Get the next byte from the stream. */
  this.get = function() {
    return (pos >= bytes.length) ? EOF_byte : Number(bytes[pos]);
  };

  /** @param {number} n Number (positive or negative) by which to
   *      offset the byte pointer. */
  this.offset = function(n) {
    pos += n;
    if (pos < 0) {
      throw new Error('Seeking past start of the buffer');
    }
    if (pos > bytes.length) {
      throw new Error('Seeking past EOF');
    }
  };

  /**
   * @param {Array.<number>} test Array of bytes to compare against.
   * @return {boolean} True if the start of the stream matches the test
   *     bytes.
   */
  this.match = function(test) {
    if (test.length > pos + bytes.length) {
      return false;
    }
    var i;
    for (i = 0; i < test.length; i += 1) {
      if (Number(bytes[pos + i]) !== test[i]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * @constructor
 * @param {Array.<number>} bytes The array to write bytes into.
 */
function ByteOutputStream(bytes) {
  /** @type {number} */
  var pos = 0;

  /**
   * @param {...number} var_args The byte or bytes to emit into the stream.
   * @return {number} The last byte emitted.
   */
  this.emit = function(var_args) {
    /** @type {number} */
    var last = EOF_byte;
    var i;
    for (i = 0; i < arguments.length; ++i) {
      last = Number(arguments[i]);
      bytes[pos++] = last;
    }
    return last;
  };
}

/**
 * @constructor
 * @param {string} string The source of code units for the stream.
 */
function CodePointInputStream(string) {
  /**
   * @param {string} string Input string of UTF-16 code units.
   * @return {Array.<number>} Code points.
   */
  function stringToCodePoints(string) {
    /** @type {Array.<number>} */
    var cps = [];
    // Based on http://www.w3.org/TR/WebIDL/#idl-DOMString
    var i = 0, n = string.length;
    while (i < string.length) {
      var c = string.charCodeAt(i);
      if (!inRange(c, 0xD800, 0xDFFF)) {
        cps.push(c);
      } else if (inRange(c, 0xDC00, 0xDFFF)) {
        cps.push(0xFFFD);
      } else { // (inRange(cu, 0xD800, 0xDBFF))
        if (i === n - 1) {
          cps.push(0xFFFD);
        } else {
          var d = string.charCodeAt(i + 1);
          if (inRange(d, 0xDC00, 0xDFFF)) {
            var a = c & 0x3FF;
            var b = d & 0x3FF;
            i += 1;
            cps.push(0x10000 + (a << 10) + b);
          } else {
            cps.push(0xFFFD);
          }
        }
      }
      i += 1;
    }
    return cps;
  }

  /** @type {number} */
  var pos = 0;
  /** @type {Array.<number>} */
  var cps = stringToCodePoints(string);

  /** @param {number} n The number of bytes (positive or negative)
   *      to advance the code point pointer by.*/
  this.offset = function(n) {
    pos += n;
    if (pos < 0) {
      throw new Error('Seeking past start of the buffer');
    }
    if (pos > cps.length) {
      throw new Error('Seeking past EOF');
    }
  };


  /** @return {number} Get the next code point from the stream. */
  this.get = function() {
    if (pos >= cps.length) {
      return EOF_code_point;
    }
    return cps[pos];
  };
}

/**
 * @constructor
 */
function CodePointOutputStream() {
  /** @type {string} */
  var string = '';

  /** @return {string} The accumulated string. */
  this.string = function() {
    return string;
  };

  /** @param {number} c The code point to encode into the stream. */
  this.emit = function(c) {
    if (c <= 0xFFFF) {
      string += String.fromCharCode(c);
    } else {
      c -= 0x10000;
      string += String.fromCharCode(0xD800 + ((c >> 10) & 0x3ff));
      string += String.fromCharCode(0xDC00 + (c & 0x3ff));
    }
  };
}

/**
 * @constructor
 * @param {string} message Description of the error.
 */
function EncodingError(message) {
  this.name = 'EncodingError';
  this.message = message;
  this.code = 0;
}
EncodingError.prototype = Error.prototype;

/**
 * @param {boolean} fatal If true, decoding errors raise an exception.
 * @param {number=} opt_code_point Override the standard fallback code point.
 * @return {number} The code point to insert on a decoding error.
 */
function decoderError(fatal, opt_code_point) {
  if (fatal) {
    throw new EncodingError('Decoder error');
  }
  return opt_code_point || 0xFFFD;
}

/**
 * @param {number} code_point The code point that could not be encoded.
 */
function encoderError(code_point) {
  throw new EncodingError('The code point ' + code_point +
                          ' could not be encoded.');
}

/**
 * @param {string} label The encoding label.
 * @return {?{name:string,labels:Array.<string>}}
 */
function getEncoding(label) {
  label = String(label).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(label_to_encoding, label)) {
    return label_to_encoding[label];
  }
  return null;
}

/** @type {Array.<{encodings: Array.<{name:string,labels:Array.<string>}>,
 *      heading: string}>} */
var encodings = [
  {
    "encodings": [
      {
        "labels": [
          "unicode-1-1-utf-8",
          "utf-8",
          "utf8"
        ],
        "name": "utf-8"
      }
    ],
    "heading": "The Encoding"
  },
  {
    "encodings": [
      {
        "labels": [
          "864",
          "cp864",
          "csibm864",
          "ibm864"
        ],
        "name": "ibm864"
      },
      {
        "labels": [
          "866",
          "cp866",
          "csibm866",
          "ibm866"
        ],
        "name": "ibm866"
      },
      {
        "labels": [
          "csisolatin2",
          "iso-8859-2",
          "iso-ir-101",
          "iso8859-2",
          "iso88592",
          "iso_8859-2",
          "iso_8859-2:1987",
          "l2",
          "latin2"
        ],
        "name": "iso-8859-2"
      },
      {
        "labels": [
          "csisolatin3",
          "iso-8859-3",
          "iso-ir-109",
          "iso8859-3",
          "iso88593",
          "iso_8859-3",
          "iso_8859-3:1988",
          "l3",
          "latin3"
        ],
        "name": "iso-8859-3"
      },
      {
        "labels": [
          "csisolatin4",
          "iso-8859-4",
          "iso-ir-110",
          "iso8859-4",
          "iso88594",
          "iso_8859-4",
          "iso_8859-4:1988",
          "l4",
          "latin4"
        ],
        "name": "iso-8859-4"
      },
      {
        "labels": [
          "csisolatincyrillic",
          "cyrillic",
          "iso-8859-5",
          "iso-ir-144",
          "iso8859-5",
          "iso88595",
          "iso_8859-5",
          "iso_8859-5:1988"
        ],
        "name": "iso-8859-5"
      },
      {
        "labels": [
          "arabic",
          "asmo-708",
          "csiso88596e",
          "csiso88596i",
          "csisolatinarabic",
          "ecma-114",
          "iso-8859-6",
          "iso-8859-6-e",
          "iso-8859-6-i",
          "iso-ir-127",
          "iso8859-6",
          "iso88596",
          "iso_8859-6",
          "iso_8859-6:1987"
        ],
        "name": "iso-8859-6"
      },
      {
        "labels": [
          "csisolatingreek",
          "ecma-118",
          "elot_928",
          "greek",
          "greek8",
          "iso-8859-7",
          "iso-ir-126",
          "iso8859-7",
          "iso88597",
          "iso_8859-7",
          "iso_8859-7:1987",
          "sun_eu_greek"
        ],
        "name": "iso-8859-7"
      },
      {
        "labels": [
          "csiso88598e",
          "csisolatinhebrew",
          "hebrew",
          "iso-8859-8",
          "iso-8859-8-e",
          "iso-ir-138",
          "iso8859-8",
          "iso88598",
          "iso_8859-8",
          "iso_8859-8:1988",
          "visual"
        ],
        "name": "iso-8859-8"
      },
      {
        "labels": [
          "csiso88598i",
          "iso-8859-8-i",
          "logical"
        ],
        "name": "iso-8859-8-i"
      },
      {
        "labels": [
          "csisolatin6",
          "iso-8859-10",
          "iso-ir-157",
          "iso8859-10",
          "iso885910",
          "l6",
          "latin6"
        ],
        "name": "iso-8859-10"
      },
      {
        "labels": [
          "iso-8859-13",
          "iso8859-13",
          "iso885913"
        ],
        "name": "iso-8859-13"
      },
      {
        "labels": [
          "iso-8859-14",
          "iso8859-14",
          "iso885914"
        ],
        "name": "iso-8859-14"
      },
      {
        "labels": [
          "csisolatin9",
          "iso-8859-15",
          "iso8859-15",
          "iso885915",
          "iso_8859-15",
          "l9"
        ],
        "name": "iso-8859-15"
      },
      {
        "labels": [
          "iso-8859-16"
        ],
        "name": "iso-8859-16"
      },
      {
        "labels": [
          "cskoi8r",
          "koi",
          "koi8",
          "koi8-r",
          "koi8_r"
        ],
        "name": "koi8-r"
      },
      {
        "labels": [
          "koi8-u"
        ],
        "name": "koi8-u"
      },
      {
        "labels": [
          "csmacintosh",
          "mac",
          "macintosh",
          "x-mac-roman"
        ],
        "name": "macintosh"
      },
      {
        "labels": [
          "dos-874",
          "iso-8859-11",
          "iso8859-11",
          "iso885911",
          "tis-620",
          "windows-874"
        ],
        "name": "windows-874"
      },
      {
        "labels": [
          "cp1250",
          "windows-1250",
          "x-cp1250"
        ],
        "name": "windows-1250"
      },
      {
        "labels": [
          "cp1251",
          "windows-1251",
          "x-cp1251"
        ],
        "name": "windows-1251"
      },
      {
        "labels": [
          "ansi_x3.4-1968",
          "ascii",
          "cp1252",
          "cp819",
          "csisolatin1",
          "ibm819",
          "iso-8859-1",
          "iso-ir-100",
          "iso8859-1",
          "iso88591",
          "iso_8859-1",
          "iso_8859-1:1987",
          "l1",
          "latin1",
          "us-ascii",
          "windows-1252",
          "x-cp1252"
        ],
        "name": "windows-1252"
      },
      {
        "labels": [
          "cp1253",
          "windows-1253",
          "x-cp1253"
        ],
        "name": "windows-1253"
      },
      {
        "labels": [
          "cp1254",
          "csisolatin5",
          "iso-8859-9",
          "iso-ir-148",
          "iso8859-9",
          "iso88599",
          "iso_8859-9",
          "iso_8859-9:1989",
          "l5",
          "latin5",
          "windows-1254",
          "x-cp1254"
        ],
        "name": "windows-1254"
      },
      {
        "labels": [
          "cp1255",
          "windows-1255",
          "x-cp1255"
        ],
        "name": "windows-1255"
      },
      {
        "labels": [
          "cp1256",
          "windows-1256",
          "x-cp1256"
        ],
        "name": "windows-1256"
      },
      {
        "labels": [
          "cp1257",
          "windows-1257",
          "x-cp1257"
        ],
        "name": "windows-1257"
      },
      {
        "labels": [
          "cp1258",
          "windows-1258",
          "x-cp1258"
        ],
        "name": "windows-1258"
      },
      {
        "labels": [
          "x-mac-cyrillic",
          "x-mac-ukrainian"
        ],
        "name": "x-mac-cyrillic"
      }
    ],
    "heading": "Legacy single-byte encodings"
  },
  {
    "encodings": [
      {
        "labels": [
          "chinese",
          "csgb2312",
          "csiso58gb231280",
          "gb2312",
          "gb_2312",
          "gb_2312-80",
          "gbk",
          "iso-ir-58",
          "x-gbk"
        ],
        "name": "gbk"
      },
      {
        "labels": [
          "gb18030"
        ],
        "name": "gb18030"
      },
      {
        "labels": [
          "hz-gb-2312"
        ],
        "name": "hz-gb-2312"
      }
    ],
    "heading": "Legacy multi-byte Chinese (simplified) encodings"
  },
  {
    "encodings": [
      {
        "labels": [
          "big5",
          "big5-hkscs",
          "cn-big5",
          "csbig5",
          "x-x-big5"
        ],
        "name": "big5"
      }
    ],
    "heading": "Legacy multi-byte Chinese (traditional) encodings"
  },
  {
    "encodings": [
      {
        "labels": [
          "cseucpkdfmtjapanese",
          "euc-jp",
          "x-euc-jp"
        ],
        "name": "euc-jp"
      },
      {
        "labels": [
          "csiso2022jp",
          "iso-2022-jp"
        ],
        "name": "iso-2022-jp"
      },
      {
        "labels": [
          "csshiftjis",
          "ms_kanji",
          "shift-jis",
          "shift_jis",
          "sjis",
          "windows-31j",
          "x-sjis"
        ],
        "name": "shift_jis"
      }
    ],
    "heading": "Legacy multi-byte Japanese encodings"
  },
  {
    "encodings": [
      {
        "labels": [
          "cseuckr",
          "csksc56011987",
          "euc-kr",
          "iso-ir-149",
          "korean",
          "ks_c_5601-1987",
          "ks_c_5601-1989",
          "ksc5601",
          "ksc_5601",
          "windows-949"
        ],
        "name": "euc-kr"
      }
    ],
    "heading": "Legacy multi-byte Korean encodings"
  },
  {
    "encodings": [
      {
        "labels": [
          "csiso2022kr",
          "iso-2022-kr",
          "iso-2022-cn",
          "iso-2022-cn-ext"
        ],
        "name": "replacement"
      },
      {
        "labels": [
          "utf-16be"
        ],
        "name": "utf-16be"
      },
      {
        "labels": [
          "utf-16",
          "utf-16le"
        ],
        "name": "utf-16le"
      },
      {
        "labels": [
          "x-user-defined"
        ],
        "name": "x-user-defined"
      }
    ],
    "heading": "Legacy miscellaneous encodings"
  }
];

var name_to_encoding = {};
var label_to_encoding = {};
encodings.forEach(function(category) {
  category.encodings.forEach(function(encoding) {
    name_to_encoding[encoding.name] = encoding;
    encoding.labels.forEach(function(label) {
      label_to_encoding[label] = encoding;
    });
  });
});

//
// 5. Indexes
//

/**
 * @param {number} pointer The |pointer| to search for.
 * @param {Array.<?number>} index The |index| to search within.
 * @return {?number} The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in |index|.
 */
function indexCodePointFor(pointer, index) {
  return (index || [])[pointer] || null;
}

/**
 * @param {number} code_point The |code point| to search for.
 * @param {Array.<?number>} index The |index| to search within.
 * @return {?number} The first pointer corresponding to |code point| in
 *     |index|, or null if |code point| is not in |index|.
 */
function indexPointerFor(code_point, index) {
  var pointer = index.indexOf(code_point);
  return pointer === -1 ? null : pointer;
}

/** @type {Object.<string, (Array.<number>|Array.<Array.<number>>)>} */
var indexes = require('./encoding-indexes');

/**
 * @param {number} pointer The |pointer| to search for in the gb18030 index.
 * @return {?number} The code point corresponding to |pointer| in |index|,
 *     or null if |code point| is not in the gb18030 index.
 */
function indexGB18030CodePointFor(pointer) {
  if ((pointer > 39419 && pointer < 189000) || (pointer > 1237575)) {
    return null;
  }
  var /** @type {number} */ offset = 0,
      /** @type {number} */ code_point_offset = 0,
      /** @type {Array.<Array.<number>>} */ index = indexes['gb18030'];
  var i;
  for (i = 0; i < index.length; ++i) {
    var entry = index[i];
    if (entry[0] <= pointer) {
      offset = entry[0];
      code_point_offset = entry[1];
    } else {
      break;
    }
  }
  return code_point_offset + pointer - offset;
}

/**
 * @param {number} code_point The |code point| to locate in the gb18030 index.
 * @return {number} The first pointer corresponding to |code point| in the
 *     gb18030 index.
 */
function indexGB18030PointerFor(code_point) {
  var /** @type {number} */ offset = 0,
      /** @type {number} */ pointer_offset = 0,
      /** @type {Array.<Array.<number>>} */ index = indexes['gb18030'];
  var i;
  for (i = 0; i < index.length; ++i) {
    var entry = index[i];
    if (entry[1] <= code_point) {
      offset = entry[1];
      pointer_offset = entry[0];
    } else {
      break;
    }
  }
  return pointer_offset + code_point - offset;
}

//
// 7. The encoding
//

// 7.1 utf-8

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function UTF8Decoder(options) {
  var fatal = options.fatal;
  var /** @type {number} */ utf8_code_point = 0,
      /** @type {number} */ utf8_bytes_needed = 0,
      /** @type {number} */ utf8_bytes_seen = 0,
      /** @type {number} */ utf8_lower_boundary = 0;

  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte) {
      if (utf8_bytes_needed !== 0) {
        return decoderError(fatal);
      }
      return EOF_code_point;
    }
    byte_pointer.offset(1);

    if (utf8_bytes_needed === 0) {
      if (inRange(bite, 0x00, 0x7F)) {
        return bite;
      }
      if (inRange(bite, 0xC2, 0xDF)) {
        utf8_bytes_needed = 1;
        utf8_lower_boundary = 0x80;
        utf8_code_point = bite - 0xC0;
      } else if (inRange(bite, 0xE0, 0xEF)) {
        utf8_bytes_needed = 2;
        utf8_lower_boundary = 0x800;
        utf8_code_point = bite - 0xE0;
      } else if (inRange(bite, 0xF0, 0xF4)) {
        utf8_bytes_needed = 3;
        utf8_lower_boundary = 0x10000;
        utf8_code_point = bite - 0xF0;
      } else {
        return decoderError(fatal);
      }
      utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
      return null;
    }
    if (!inRange(bite, 0x80, 0xBF)) {
      utf8_code_point = 0;
      utf8_bytes_needed = 0;
      utf8_bytes_seen = 0;
      utf8_lower_boundary = 0;
      byte_pointer.offset(-1);
      return decoderError(fatal);
    }
    utf8_bytes_seen += 1;
    utf8_code_point = utf8_code_point + (bite - 0x80) *
        Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);
    if (utf8_bytes_seen !== utf8_bytes_needed) {
      return null;
    }
    var code_point = utf8_code_point;
    var lower_boundary = utf8_lower_boundary;
    utf8_code_point = 0;
    utf8_bytes_needed = 0;
    utf8_bytes_seen = 0;
    utf8_lower_boundary = 0;
    if (inRange(code_point, lower_boundary, 0x10FFFF) &&
        !inRange(code_point, 0xD800, 0xDFFF)) {
      return code_point;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function UTF8Encoder(options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0xD800, 0xDFFF)) {
      return encoderError(code_point);
    }
    if (inRange(code_point, 0x0000, 0x007f)) {
      return output_byte_stream.emit(code_point);
    }
    var count, offset;
    if (inRange(code_point, 0x0080, 0x07FF)) {
      count = 1;
      offset = 0xC0;
    } else if (inRange(code_point, 0x0800, 0xFFFF)) {
      count = 2;
      offset = 0xE0;
    } else if (inRange(code_point, 0x10000, 0x10FFFF)) {
      count = 3;
      offset = 0xF0;
    }
    var result = output_byte_stream.emit(
        div(code_point, Math.pow(64, count)) + offset);
    while (count > 0) {
      var temp = div(code_point, Math.pow(64, count - 1));
      result = output_byte_stream.emit(0x80 + (temp % 64));
      count -= 1;
    }
    return result;
  };
}

name_to_encoding['utf-8'].getEncoder = function(options) {
  return new UTF8Encoder(options);
};
name_to_encoding['utf-8'].getDecoder = function(options) {
  return new UTF8Decoder(options);
};

//
// 8. Legacy single-byte encodings
//

/**
 * @constructor
 * @param {Array.<number>} index The encoding index.
 * @param {{fatal: boolean}} options
 */
function SingleByteDecoder(index, options) {
  var fatal = options.fatal;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte) {
      return EOF_code_point;
    }
    byte_pointer.offset(1);
    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }
    var code_point = index[bite - 0x80];
    if (code_point === null) {
      return decoderError(fatal);
    }
    return code_point;
  };
}

/**
 * @constructor
 * @param {Array.<?number>} index The encoding index.
 * @param {{fatal: boolean}} options
 */
function SingleByteEncoder(index, options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    var pointer = indexPointerFor(code_point, index);
    if (pointer === null) {
      encoderError(code_point);
    }
    return output_byte_stream.emit(pointer + 0x80);
  };
}

(function() {
  encodings.forEach(function(category) {
    if (category.heading !== 'Legacy single-byte encodings')
      return;
    category.encodings.forEach(function(encoding) {
      var index = indexes[encoding.name];
      encoding.getDecoder = function(options) {
        return new SingleByteDecoder(index, options);
      };
      encoding.getEncoder = function(options) {
        return new SingleByteEncoder(index, options);
      };
    });
  });
}());

//
// 9. Legacy multi-byte Chinese (simplified) encodings
//

// 9.1 gbk

/**
 * @constructor
 * @param {boolean} gb18030 True if decoding gb18030, false otherwise.
 * @param {{fatal: boolean}} options
 */
function GBKDecoder(gb18030, options) {
  var fatal = options.fatal;
  var /** @type {number} */ gbk_first = 0x00,
      /** @type {number} */ gbk_second = 0x00,
      /** @type {number} */ gbk_third = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte && gbk_first === 0x00 &&
        gbk_second === 0x00 && gbk_third === 0x00) {
      return EOF_code_point;
    }
    if (bite === EOF_byte &&
        (gbk_first !== 0x00 || gbk_second !== 0x00 || gbk_third !== 0x00)) {
      gbk_first = 0x00;
      gbk_second = 0x00;
      gbk_third = 0x00;
      decoderError(fatal);
    }
    byte_pointer.offset(1);
    var code_point;
    if (gbk_third !== 0x00) {
      code_point = null;
      if (inRange(bite, 0x30, 0x39)) {
        code_point = indexGB18030CodePointFor(
            (((gbk_first - 0x81) * 10 + (gbk_second - 0x30)) * 126 +
             (gbk_third - 0x81)) * 10 + bite - 0x30);
      }
      gbk_first = 0x00;
      gbk_second = 0x00;
      gbk_third = 0x00;
      if (code_point === null) {
        byte_pointer.offset(-3);
        return decoderError(fatal);
      }
      return code_point;
    }
    if (gbk_second !== 0x00) {
      if (inRange(bite, 0x81, 0xFE)) {
        gbk_third = bite;
        return null;
      }
      byte_pointer.offset(-2);
      gbk_first = 0x00;
      gbk_second = 0x00;
      return decoderError(fatal);
    }
    if (gbk_first !== 0x00) {
      if (inRange(bite, 0x30, 0x39) && gb18030) {
        gbk_second = bite;
        return null;
      }
      var lead = gbk_first;
      var pointer = null;
      gbk_first = 0x00;
      var offset = bite < 0x7F ? 0x40 : 0x41;
      if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFE)) {
        pointer = (lead - 0x81) * 190 + (bite - offset);
      }
      code_point = pointer === null ? null :
          indexCodePointFor(pointer, indexes['gbk']);
      if (pointer === null) {
        byte_pointer.offset(-1);
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }
    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }
    if (bite === 0x80) {
      return 0x20AC;
    }
    if (inRange(bite, 0x81, 0xFE)) {
      gbk_first = bite;
      return null;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {boolean} gb18030 True if decoding gb18030, false otherwise.
 * @param {{fatal: boolean}} options
 */
function GBKEncoder(gb18030, options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    var pointer = indexPointerFor(code_point, indexes['gbk']);
    if (pointer !== null) {
      var lead = div(pointer, 190) + 0x81;
      var trail = pointer % 190;
      var offset = trail < 0x3F ? 0x40 : 0x41;
      return output_byte_stream.emit(lead, trail + offset);
    }
    if (pointer === null && !gb18030) {
      return encoderError(code_point);
    }
    pointer = indexGB18030PointerFor(code_point);
    var byte1 = div(div(div(pointer, 10), 126), 10);
    pointer = pointer - byte1 * 10 * 126 * 10;
    var byte2 = div(div(pointer, 10), 126);
    pointer = pointer - byte2 * 10 * 126;
    var byte3 = div(pointer, 10);
    var byte4 = pointer - byte3 * 10;
    return output_byte_stream.emit(byte1 + 0x81,
                                   byte2 + 0x30,
                                   byte3 + 0x81,
                                   byte4 + 0x30);
  };
}

name_to_encoding['gbk'].getEncoder = function(options) {
  return new GBKEncoder(false, options);
};
name_to_encoding['gbk'].getDecoder = function(options) {
  return new GBKDecoder(false, options);
};

// 9.2 gb18030
name_to_encoding['gb18030'].getEncoder = function(options) {
  return new GBKEncoder(true, options);
};
name_to_encoding['gb18030'].getDecoder = function(options) {
  return new GBKDecoder(true, options);
};

// 9.3 hz-gb-2312

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function HZGB2312Decoder(options) {
  var fatal = options.fatal;
  var /** @type {boolean} */ hzgb2312 = false,
      /** @type {number} */ hzgb2312_lead = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte && hzgb2312_lead === 0x00) {
      return EOF_code_point;
    }
    if (bite === EOF_byte && hzgb2312_lead !== 0x00) {
      hzgb2312_lead = 0x00;
      return decoderError(fatal);
    }
    byte_pointer.offset(1);
    if (hzgb2312_lead === 0x7E) {
      hzgb2312_lead = 0x00;
      if (bite === 0x7B) {
        hzgb2312 = true;
        return null;
      }
      if (bite === 0x7D) {
        hzgb2312 = false;
        return null;
      }
      if (bite === 0x7E) {
        return 0x007E;
      }
      if (bite === 0x0A) {
        return null;
      }
      byte_pointer.offset(-1);
      return decoderError(fatal);
    }
    if (hzgb2312_lead !== 0x00) {
      var lead = hzgb2312_lead;
      hzgb2312_lead = 0x00;
      var code_point = null;
      if (inRange(bite, 0x21, 0x7E)) {
        code_point = indexCodePointFor((lead - 1) * 190 +
                                       (bite + 0x3F), indexes['gbk']);
      }
      if (bite === 0x0A) {
        hzgb2312 = false;
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }
    if (bite === 0x7E) {
      hzgb2312_lead = 0x7E;
      return null;
    }
    if (hzgb2312) {
      if (inRange(bite, 0x20, 0x7F)) {
        hzgb2312_lead = bite;
        return null;
      }
      if (bite === 0x0A) {
        hzgb2312 = false;
      }
      return decoderError(fatal);
    }
    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function HZGB2312Encoder(options) {
  var fatal = options.fatal;
  var hzgb2312 = false;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F) && hzgb2312) {
      code_point_pointer.offset(-1);
      hzgb2312 = false;
      return output_byte_stream.emit(0x7E, 0x7D);
    }
    if (code_point === 0x007E) {
      return output_byte_stream.emit(0x7E, 0x7E);
    }
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    if (!hzgb2312) {
      code_point_pointer.offset(-1);
      hzgb2312 = true;
      return output_byte_stream.emit(0x7E, 0x7B);
    }
    var pointer = indexPointerFor(code_point, indexes['gbk']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead = div(pointer, 190) + 1;
    var trail = pointer % 190 - 0x3F;
    if (!inRange(lead, 0x21, 0x7E) || !inRange(trail, 0x21, 0x7E)) {
      return encoderError(code_point);
    }
    return output_byte_stream.emit(lead, trail);
  };
}

name_to_encoding['hz-gb-2312'].getEncoder = function(options) {
  return new HZGB2312Encoder(options);
};
name_to_encoding['hz-gb-2312'].getDecoder = function(options) {
  return new HZGB2312Decoder(options);
};

//
// 10. Legacy multi-byte Chinese (traditional) encodings
//

// 10.1 big5

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function Big5Decoder(options) {
  var fatal = options.fatal;
  var /** @type {number} */ big5_lead = 0x00,
      /** @type {?number} */ big5_pending = null;

  /**
   * @param {ByteInputStream} byte_pointer The byte steram to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    // NOTE: Hack to support emitting two code points
    if (big5_pending !== null) {
      var pending = big5_pending;
      big5_pending = null;
      return pending;
    }
    var bite = byte_pointer.get();
    if (bite === EOF_byte && big5_lead === 0x00) {
      return EOF_code_point;
    }
    if (bite === EOF_byte && big5_lead !== 0x00) {
      big5_lead = 0x00;
      return decoderError(fatal);
    }
    byte_pointer.offset(1);
    if (big5_lead !== 0x00) {
      var lead = big5_lead;
      var pointer = null;
      big5_lead = 0x00;
      var offset = bite < 0x7F ? 0x40 : 0x62;
      if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0xA1, 0xFE)) {
        pointer = (lead - 0x81) * 157 + (bite - offset);
      }
      if (pointer === 1133) {
        big5_pending = 0x0304;
        return 0x00CA;
      }
      if (pointer === 1135) {
        big5_pending = 0x030C;
        return 0x00CA;
      }
      if (pointer === 1164) {
        big5_pending = 0x0304;
        return 0x00EA;
      }
      if (pointer === 1166) {
        big5_pending = 0x030C;
        return 0x00EA;
      }
      var code_point = (pointer === null) ? null :
          indexCodePointFor(pointer, indexes['big5']);
      if (pointer === null) {
        byte_pointer.offset(-1);
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }
    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }
    if (inRange(bite, 0x81, 0xFE)) {
      big5_lead = bite;
      return null;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function Big5Encoder(options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    var pointer = indexPointerFor(code_point, indexes['big5']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead = div(pointer, 157) + 0x81;
    //if (lead < 0xA1) {
    //  return encoderError(code_point);
    //}
    var trail = pointer % 157;
    var offset = trail < 0x3F ? 0x40 : 0x62;
    return output_byte_stream.emit(lead, trail + offset);
  };
}

name_to_encoding['big5'].getEncoder = function(options) {
  return new Big5Encoder(options);
};
name_to_encoding['big5'].getDecoder = function(options) {
  return new Big5Decoder(options);
};


//
// 11. Legacy multi-byte Japanese encodings
//

// 11.1 euc.jp

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function EUCJPDecoder(options) {
  var fatal = options.fatal;
  var /** @type {number} */ eucjp_first = 0x00,
      /** @type {number} */ eucjp_second = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte) {
      if (eucjp_first === 0x00 && eucjp_second === 0x00) {
        return EOF_code_point;
      }
      eucjp_first = 0x00;
      eucjp_second = 0x00;
      return decoderError(fatal);
    }
    byte_pointer.offset(1);

    var lead, code_point;
    if (eucjp_second !== 0x00) {
      lead = eucjp_second;
      eucjp_second = 0x00;
      code_point = null;
      if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
        code_point = indexCodePointFor((lead - 0xA1) * 94 + bite - 0xA1,
                                       indexes['jis0212']);
      }
      if (!inRange(bite, 0xA1, 0xFE)) {
        byte_pointer.offset(-1);
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }
    if (eucjp_first === 0x8E && inRange(bite, 0xA1, 0xDF)) {
      eucjp_first = 0x00;
      return 0xFF61 + bite - 0xA1;
    }
    if (eucjp_first === 0x8F && inRange(bite, 0xA1, 0xFE)) {
      eucjp_first = 0x00;
      eucjp_second = bite;
      return null;
    }
    if (eucjp_first !== 0x00) {
      lead = eucjp_first;
      eucjp_first = 0x00;
      code_point = null;
      if (inRange(lead, 0xA1, 0xFE) && inRange(bite, 0xA1, 0xFE)) {
        code_point = indexCodePointFor((lead - 0xA1) * 94 + bite - 0xA1,
                                       indexes['jis0208']);
      }
      if (!inRange(bite, 0xA1, 0xFE)) {
        byte_pointer.offset(-1);
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }
    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }
    if (bite === 0x8E || bite === 0x8F || (inRange(bite, 0xA1, 0xFE))) {
      eucjp_first = bite;
      return null;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function EUCJPEncoder(options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    if (code_point === 0x00A5) {
      return output_byte_stream.emit(0x5C);
    }
    if (code_point === 0x203E) {
      return output_byte_stream.emit(0x7E);
    }
    if (inRange(code_point, 0xFF61, 0xFF9F)) {
      return output_byte_stream.emit(0x8E, code_point - 0xFF61 + 0xA1);
    }

    var pointer = indexPointerFor(code_point, indexes['jis0208']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead = div(pointer, 94) + 0xA1;
    var trail = pointer % 94 + 0xA1;
    return output_byte_stream.emit(lead, trail);
  };
}

name_to_encoding['euc-jp'].getEncoder = function(options) {
  return new EUCJPEncoder(options);
};
name_to_encoding['euc-jp'].getDecoder = function(options) {
  return new EUCJPDecoder(options);
};

// 11.2 iso-2022-jp

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function ISO2022JPDecoder(options) {
  var fatal = options.fatal;
  /** @enum */
  var state = {
    ASCII: 0,
    escape_start: 1,
    escape_middle: 2,
    escape_final: 3,
    lead: 4,
    trail: 5,
    Katakana: 6
  };
  var /** @type {number} */ iso2022jp_state = state.ASCII,
      /** @type {boolean} */ iso2022jp_jis0212 = false,
      /** @type {number} */ iso2022jp_lead = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite !== EOF_byte) {
      byte_pointer.offset(1);
    }
    switch (iso2022jp_state) {
      default:
      case state.ASCII:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (inRange(bite, 0x00, 0x7F)) {
          return bite;
        }
        if (bite === EOF_byte) {
          return EOF_code_point;
        }
        return decoderError(fatal);

      case state.escape_start:
        if (bite === 0x24 || bite === 0x28) {
          iso2022jp_lead = bite;
          iso2022jp_state = state.escape_middle;
          return null;
        }
        if (bite !== EOF_byte) {
          byte_pointer.offset(-1);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.escape_middle:
        var lead = iso2022jp_lead;
        iso2022jp_lead = 0x00;
        if (lead === 0x24 && (bite === 0x40 || bite === 0x42)) {
          iso2022jp_jis0212 = false;
          iso2022jp_state = state.lead;
          return null;
        }
        if (lead === 0x24 && bite === 0x28) {
          iso2022jp_state = state.escape_final;
          return null;
        }
        if (lead === 0x28 && (bite === 0x42 || bite === 0x4A)) {
          iso2022jp_state = state.ASCII;
          return null;
        }
        if (lead === 0x28 && bite === 0x49) {
          iso2022jp_state = state.Katakana;
          return null;
        }
        if (bite === EOF_byte) {
          byte_pointer.offset(-1);
        } else {
          byte_pointer.offset(-2);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.escape_final:
        if (bite === 0x44) {
          iso2022jp_jis0212 = true;
          iso2022jp_state = state.lead;
          return null;
        }
        if (bite === EOF_byte) {
          byte_pointer.offset(-2);
        } else {
          byte_pointer.offset(-3);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(fatal);

      case state.lead:
        if (bite === 0x0A) {
          iso2022jp_state = state.ASCII;
          return decoderError(fatal, 0x000A);
        }
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (bite === EOF_byte) {
          return EOF_code_point;
        }
        iso2022jp_lead = bite;
        iso2022jp_state = state.trail;
        return null;

      case state.trail:
        iso2022jp_state = state.lead;
        if (bite === EOF_byte) {
          return decoderError(fatal);
        }
        var code_point = null;
        var pointer = (iso2022jp_lead - 0x21) * 94 + bite - 0x21;
        if (inRange(iso2022jp_lead, 0x21, 0x7E) &&
            inRange(bite, 0x21, 0x7E)) {
          code_point = (iso2022jp_jis0212 === false) ?
              indexCodePointFor(pointer, indexes['jis0208']) :
              indexCodePointFor(pointer, indexes['jis0212']);
        }
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;

      case state.Katakana:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (inRange(bite, 0x21, 0x5F)) {
          return 0xFF61 + bite - 0x21;
        }
        if (bite === EOF_byte) {
          return EOF_code_point;
        }
        return decoderError(fatal);
    }
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function ISO2022JPEncoder(options) {
  var fatal = options.fatal;
  /** @enum */
  var state = {
    ASCII: 0,
    lead: 1,
    Katakana: 2
  };
  var /** @type {number} */ iso2022jp_state = state.ASCII;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if ((inRange(code_point, 0x0000, 0x007F) ||
         code_point === 0x00A5 || code_point === 0x203E) &&
        iso2022jp_state !== state.ASCII) {
      code_point_pointer.offset(-1);
      iso2022jp_state = state.ASCII;
      return output_byte_stream.emit(0x1B, 0x28, 0x42);
    }
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    if (code_point === 0x00A5) {
      return output_byte_stream.emit(0x5C);
    }
    if (code_point === 0x203E) {
      return output_byte_stream.emit(0x7E);
    }
    if (inRange(code_point, 0xFF61, 0xFF9F) &&
        iso2022jp_state !== state.Katakana) {
      code_point_pointer.offset(-1);
      iso2022jp_state = state.Katakana;
      return output_byte_stream.emit(0x1B, 0x28, 0x49);
    }
    if (inRange(code_point, 0xFF61, 0xFF9F)) {
      return output_byte_stream.emit(code_point - 0xFF61 - 0x21);
    }
    if (iso2022jp_state !== state.lead) {
      code_point_pointer.offset(-1);
      iso2022jp_state = state.lead;
      return output_byte_stream.emit(0x1B, 0x24, 0x42);
    }
    var pointer = indexPointerFor(code_point, indexes['jis0208']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead = div(pointer, 94) + 0x21;
    var trail = pointer % 94 + 0x21;
    return output_byte_stream.emit(lead, trail);
  };
}

name_to_encoding['iso-2022-jp'].getEncoder = function(options) {
  return new ISO2022JPEncoder(options);
};
name_to_encoding['iso-2022-jp'].getDecoder = function(options) {
  return new ISO2022JPDecoder(options);
};

// 11.3 shift_jis

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function ShiftJISDecoder(options) {
  var fatal = options.fatal;
  var /** @type {number} */ shiftjis_lead = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte && shiftjis_lead === 0x00) {
      return EOF_code_point;
    }
    if (bite === EOF_byte && shiftjis_lead !== 0x00) {
      shiftjis_lead = 0x00;
      return decoderError(fatal);
    }
    byte_pointer.offset(1);
    if (shiftjis_lead !== 0x00) {
      var lead = shiftjis_lead;
      shiftjis_lead = 0x00;
      if (inRange(bite, 0x40, 0x7E) || inRange(bite, 0x80, 0xFC)) {
        var offset = (bite < 0x7F) ? 0x40 : 0x41;
        var lead_offset = (lead < 0xA0) ? 0x81 : 0xC1;
        var code_point = indexCodePointFor((lead - lead_offset) * 188 +
                                           bite - offset, indexes['jis0208']);
        if (code_point === null) {
          return decoderError(fatal);
        }
        return code_point;
      }
      byte_pointer.offset(-1);
      return decoderError(fatal);
    }
    if (inRange(bite, 0x00, 0x80)) {
      return bite;
    }
    if (inRange(bite, 0xA1, 0xDF)) {
      return 0xFF61 + bite - 0xA1;
    }
    if (inRange(bite, 0x81, 0x9F) || inRange(bite, 0xE0, 0xFC)) {
      shiftjis_lead = bite;
      return null;
    }
    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function ShiftJISEncoder(options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x0080)) {
      return output_byte_stream.emit(code_point);
    }
    if (code_point === 0x00A5) {
      return output_byte_stream.emit(0x5C);
    }
    if (code_point === 0x203E) {
      return output_byte_stream.emit(0x7E);
    }
    if (inRange(code_point, 0xFF61, 0xFF9F)) {
      return output_byte_stream.emit(code_point - 0xFF61 + 0xA1);
    }
    var pointer = indexPointerFor(code_point, indexes['jis0208']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead = div(pointer, 188);
    var lead_offset = lead < 0x1F ? 0x81 : 0xC1;
    var trail = pointer % 188;
    var offset = trail < 0x3F ? 0x40 : 0x41;
    return output_byte_stream.emit(lead + lead_offset, trail + offset);
  };
}

name_to_encoding['shift_jis'].getEncoder = function(options) {
  return new ShiftJISEncoder(options);
};
name_to_encoding['shift_jis'].getDecoder = function(options) {
  return new ShiftJISDecoder(options);
};

//
// 12. Legacy multi-byte Korean encodings
//

// 12.1 euc-kr

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function EUCKRDecoder(options) {
  var fatal = options.fatal;
  var /** @type {number} */ euckr_lead = 0x00;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte && euckr_lead === 0) {
      return EOF_code_point;
    }
    if (bite === EOF_byte && euckr_lead !== 0) {
      euckr_lead = 0x00;
      return decoderError(fatal);
    }
    byte_pointer.offset(1);
    if (euckr_lead !== 0x00) {
      var lead = euckr_lead;
      var pointer = null;
      euckr_lead = 0x00;

      if (inRange(lead, 0x81, 0xC6)) {
        var temp = (26 + 26 + 126) * (lead - 0x81);
        if (inRange(bite, 0x41, 0x5A)) {
          pointer = temp + bite - 0x41;
        } else if (inRange(bite, 0x61, 0x7A)) {
          pointer = temp + 26 + bite - 0x61;
        } else if (inRange(bite, 0x81, 0xFE)) {
          pointer = temp + 26 + 26 + bite - 0x81;
        }
      }

      if (inRange(lead, 0xC7, 0xFD) && inRange(bite, 0xA1, 0xFE)) {
        pointer = (26 + 26 + 126) * (0xC7 - 0x81) + (lead - 0xC7) * 94 +
            (bite - 0xA1);
      }

      var code_point = (pointer === null) ? null :
          indexCodePointFor(pointer, indexes['euc-kr']);
      if (pointer === null) {
        byte_pointer.offset(-1);
      }
      if (code_point === null) {
        return decoderError(fatal);
      }
      return code_point;
    }

    if (inRange(bite, 0x00, 0x7F)) {
      return bite;
    }

    if (inRange(bite, 0x81, 0xFD)) {
      euckr_lead = bite;
      return null;
    }

    return decoderError(fatal);
  };
}

/**
 * @constructor
 * @param {{fatal: boolean}} options
 */
function EUCKREncoder(options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0x0000, 0x007F)) {
      return output_byte_stream.emit(code_point);
    }
    var pointer = indexPointerFor(code_point, indexes['euc-kr']);
    if (pointer === null) {
      return encoderError(code_point);
    }
    var lead, trail;
    if (pointer < ((26 + 26 + 126) * (0xC7 - 0x81))) {
      lead = div(pointer, (26 + 26 + 126)) + 0x81;
      trail = pointer % (26 + 26 + 126);
      var offset = trail < 26 ? 0x41 : trail < 26 + 26 ? 0x47 : 0x4D;
      return output_byte_stream.emit(lead, trail + offset);
    }
    pointer = pointer - (26 + 26 + 126) * (0xC7 - 0x81);
    lead = div(pointer, 94) + 0xC7;
    trail = pointer % 94 + 0xA1;
    return output_byte_stream.emit(lead, trail);
  };
}

name_to_encoding['euc-kr'].getEncoder = function(options) {
  return new EUCKREncoder(options);
};
name_to_encoding['euc-kr'].getDecoder = function(options) {
  return new EUCKRDecoder(options);
};


//
// 13. Legacy utf-16 encodings
//

// 13.1 utf-16

/**
 * @constructor
 * @param {boolean} utf16_be True if big-endian, false if little-endian.
 * @param {{fatal: boolean}} options
 */
function UTF16Decoder(utf16_be, options) {
  var fatal = options.fatal;
  var /** @type {?number} */ utf16_lead_byte = null,
      /** @type {?number} */ utf16_lead_surrogate = null;
  /**
   * @param {ByteInputStream} byte_pointer The byte stream to decode.
   * @return {?number} The next code point decoded, or null if not enough
   *     data exists in the input stream to decode a complete code point.
   */
  this.decode = function(byte_pointer) {
    var bite = byte_pointer.get();
    if (bite === EOF_byte && utf16_lead_byte === null &&
        utf16_lead_surrogate === null) {
      return EOF_code_point;
    }
    if (bite === EOF_byte && (utf16_lead_byte !== null ||
                              utf16_lead_surrogate !== null)) {
      return decoderError(fatal);
    }
    byte_pointer.offset(1);
    if (utf16_lead_byte === null) {
      utf16_lead_byte = bite;
      return null;
    }
    var code_point;
    if (utf16_be) {
      code_point = (utf16_lead_byte << 8) + bite;
    } else {
      code_point = (bite << 8) + utf16_lead_byte;
    }
    utf16_lead_byte = null;
    if (utf16_lead_surrogate !== null) {
      var lead_surrogate = utf16_lead_surrogate;
      utf16_lead_surrogate = null;
      if (inRange(code_point, 0xDC00, 0xDFFF)) {
        return 0x10000 + (lead_surrogate - 0xD800) * 0x400 +
            (code_point - 0xDC00);
      }
      byte_pointer.offset(-2);
      return decoderError(fatal);
    }
    if (inRange(code_point, 0xD800, 0xDBFF)) {
      utf16_lead_surrogate = code_point;
      return null;
    }
    if (inRange(code_point, 0xDC00, 0xDFFF)) {
      return decoderError(fatal);
    }
    return code_point;
  };
}

/**
 * @constructor
 * @param {boolean} utf16_be True if big-endian, false if little-endian.
 * @param {{fatal: boolean}} options
 */
function UTF16Encoder(utf16_be, options) {
  var fatal = options.fatal;
  /**
   * @param {ByteOutputStream} output_byte_stream Output byte stream.
   * @param {CodePointInputStream} code_point_pointer Input stream.
   * @return {number} The last byte emitted.
   */
  this.encode = function(output_byte_stream, code_point_pointer) {
    function convert_to_bytes(code_unit) {
      var byte1 = code_unit >> 8;
      var byte2 = code_unit & 0x00FF;
      if (utf16_be) {
        return output_byte_stream.emit(byte1, byte2);
      }
      return output_byte_stream.emit(byte2, byte1);
    }
    var code_point = code_point_pointer.get();
    if (code_point === EOF_code_point) {
      return EOF_byte;
    }
    code_point_pointer.offset(1);
    if (inRange(code_point, 0xD800, 0xDFFF)) {
      encoderError(code_point);
    }
    if (code_point <= 0xFFFF) {
      return convert_to_bytes(code_point);
    }
    var lead = div((code_point - 0x10000), 0x400) + 0xD800;
    var trail = ((code_point - 0x10000) % 0x400) + 0xDC00;
    convert_to_bytes(lead);
    return convert_to_bytes(trail);
  };
}

name_to_encoding['utf-16le'].getEncoder = function(options) {
  return new UTF16Encoder(false, options);
};
name_to_encoding['utf-16le'].getDecoder = function(options) {
  return new UTF16Decoder(false, options);
};

// 13.2 utf-16be
name_to_encoding['utf-16be'].getEncoder = function(options) {
  return new UTF16Encoder(true, options);
};
name_to_encoding['utf-16be'].getDecoder = function(options) {
  return new UTF16Decoder(true, options);
};


// NOTE: currently unused
/**
 * @param {string} label The encoding label.
 * @param {ByteInputStream} input_stream The byte stream to test.
 */
function detectEncoding(label, input_stream) {
  if (input_stream.match([0xFF, 0xFE])) {
    input_stream.offset(2);
    return 'utf-16le';
  }
  if (input_stream.match([0xFE, 0xFF])) {
    input_stream.offset(2);
    return 'utf-16be';
  }
  if (input_stream.match([0xEF, 0xBB, 0xBF])) {
    input_stream.offset(3);
    return 'utf-8';
  }
  return label;
}

//
// Implementation of Text Encoding Web API
//

/** @const */ var DEFAULT_ENCODING = 'utf-8';

/**
 * @constructor
 * @param {string=} opt_encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {{fatal: boolean}=} options
 */
function TextEncoder(opt_encoding, options) {
  if (!(this instanceof TextEncoder)) {
    return new TextEncoder(opt_encoding, options);
  }
  opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
  options = Object(options);
  /** @private */
  this._encoding = getEncoding(opt_encoding);
  if (this._encoding === null || (this._encoding.name !== 'utf-8' &&
                                  this._encoding.name !== 'utf-16le' &&
                                  this._encoding.name !== 'utf-16be'))
    throw new TypeError('Unknown encoding: ' + opt_encoding);
  /** @private @type {boolean} */
  this._streaming = false;
  /** @private */
  this._encoder = null;
  /** @private @type {{fatal: boolean}=} */
  this._options = { fatal: Boolean(options.fatal) };

  if (Object.defineProperty) {
    Object.defineProperty(
        this, 'encoding',
        { get: function() { return this._encoding.name; } });
  } else {
    this.encoding = this._encoding.name;
  }

  return this;
}

TextEncoder.prototype = {
  /**
   * @param {string=} opt_string The string to encode.
   * @param {{stream: boolean}=} options
   */
  encode: function encode(opt_string, options) {
    opt_string = opt_string ? String(opt_string) : '';
    options = Object(options);
    // TODO: any options?
    if (!this._streaming) {
      this._encoder = this._encoding.getEncoder(this._options);
    }
    this._streaming = Boolean(options.stream);

    var bytes = [];
    var output_stream = new ByteOutputStream(bytes);
    var input_stream = new CodePointInputStream(opt_string);
    while (input_stream.get() !== EOF_code_point) {
      this._encoder.encode(output_stream, input_stream);
    }
    if (!this._streaming) {
      var last_byte;
      do {
        last_byte = this._encoder.encode(output_stream, input_stream);
      } while (last_byte !== EOF_byte);
      this._encoder = null;
    }
    return new Buffer(bytes);
  }
};


/**
 * @constructor
 * @param {string=} opt_encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {{fatal: boolean}=} options
 */
function TextDecoder(opt_encoding, options) {
  if (!(this instanceof TextDecoder)) {
    return new TextDecoder(opt_encoding, options);
  }
  opt_encoding = opt_encoding ? String(opt_encoding) : DEFAULT_ENCODING;
  options = Object(options);
  /** @private */
  this._encoding = getEncoding(opt_encoding);
  if (this._encoding === null)
    throw new TypeError('Unknown encoding: ' + opt_encoding);

  /** @private @type {boolean} */
  this._streaming = false;
  /** @private */
  this._decoder = null;
  /** @private @type {{fatal: boolean}=} */
  this._options = { fatal: Boolean(options.fatal) };

  if (Object.defineProperty) {
    Object.defineProperty(
        this, 'encoding',
        { get: function() { return this._encoding.name; } });
  } else {
    this.encoding = this._encoding.name;
  }

  return this;
}

// TODO: Issue if input byte stream is offset by decoder
// TODO: BOM detection will not work if stream header spans multiple calls
// (last N bytes of previous stream may need to be retained?)
TextDecoder.prototype = {
  /**
   * @param {Buffer=} buf The buffer of bytes to decode.
   * @param {{stream: boolean}=} options
   */
  decode: function decode(buf, options) {
    options = Object(options);

    if (!this._streaming) {
      this._decoder = this._encoding.getDecoder(this._options);
      this._BOMseen = false;
    }
    this._streaming = Boolean(options.stream);

    var input_stream = new ByteInputStream(buf);

    var output_stream = new CodePointOutputStream(), code_point;
    while (input_stream.get() !== EOF_byte) {
      code_point = this._decoder.decode(input_stream);
      if (code_point !== null && code_point !== EOF_code_point) {
        output_stream.emit(code_point);
      }
    }
    if (!this._streaming) {
      do {
        code_point = this._decoder.decode(input_stream);
        if (code_point !== null && code_point !== EOF_code_point) {
          output_stream.emit(code_point);
        }
      } while (code_point !== EOF_code_point &&
               input_stream.get() != EOF_byte);
      this._decoder = null;
    }

    var result = output_stream.string();
    if (!this._BOMseen && result.length) {
      this._BOMseen = true;
      if (UTFs.indexOf(this.encoding) !== -1 &&
         result.charCodeAt(0) === 0xFEFF) {
        result = result.substring(1);
      }
    }

    return result;
  }
};

var UTFs = ['utf-8', 'utf-16le', 'utf-16be'];
exports.TextEncoder = TextEncoder;
exports.TextDecoder = TextDecoder;
exports.encodingExists = getEncoding;
