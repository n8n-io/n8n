var config = require('./config');
var util = require('./util');
var EncodingDetect = require('./encoding-detect');
var EncodingConvert = require('./encoding-convert');
var KanaCaseTable = require('./kana-case-table');
var version = require('../package.json').version;

var hasOwnProperty = Object.prototype.hasOwnProperty;

var Encoding = {
  version: version,

  /**
   * Encoding orders
   */
  orders: config.EncodingOrders,

  /**
   * Detects character encoding
   *
   * If encodings is "AUTO", or the encoding-list as an array, or
   *   comma separated list string it will be detected automatically
   *
   * @param {Array.<number>|TypedArray|string} data The data being detected
   * @param {(Object|string|Array.<string>)=} [encodings] The encoding-list of
   *   character encoding
   * @return {string|boolean} The detected character encoding, or false
   */
  detect: function(data, encodings) {
    if (data == null || data.length === 0) {
      return false;
    }

    if (util.isObject(encodings) && !util.isArray(encodings)) {
      encodings = encodings.encoding;
    }

    if (util.isString(data)) {
      data = util.stringToBuffer(data);
    }

    if (encodings == null) {
      encodings = Encoding.orders;
    } else {
      if (util.isString(encodings)) {
        encodings = encodings.toUpperCase();
        if (encodings === 'AUTO') {
          encodings = Encoding.orders;
        } else if (~encodings.indexOf(',')) {
          encodings = encodings.split(/\s*,\s*/);
        } else {
          encodings = [encodings];
        }
      }
    }

    var len = encodings.length;
    var e, encoding, method;
    for (var i = 0; i < len; i++) {
      e = encodings[i];
      encoding = util.canonicalizeEncodingName(e);
      if (!encoding) {
        continue;
      }

      method = 'is' + encoding;
      if (!hasOwnProperty.call(EncodingDetect, method)) {
        throw new Error('Undefined encoding: ' + e);
      }

      if (EncodingDetect[method](data)) {
        return encoding;
      }
    }

    return false;
  },

  /**
   * Convert character encoding
   *
   * If `from` is "AUTO", or the encoding-list as an array, or
   *   comma separated list string it will be detected automatically
   *
   * @param {Array.<number>|TypedArray|string} data The data being converted
   * @param {(string|Object)} to The name of encoding to
   * @param {(string|Array.<string>)=} [from] The encoding-list of
   *   character encoding
   * @return {Array|TypedArray|string} The converted data
   */
  convert: function(data, to, from) {
    var result, type, options;

    if (!util.isObject(to)) {
      options = {};
    } else {
      options = to;
      from = options.from;
      to = options.to;

      if (options.type) {
        type = options.type;
      }
    }

    if (util.isString(data)) {
      type = type || 'string';
      data = util.stringToBuffer(data);
    } else if (data == null || data.length === 0) {
      data = [];
    }

    var encodingFrom;
    if (from != null && util.isString(from) &&
        from.toUpperCase() !== 'AUTO' && !~from.indexOf(',')) {
      encodingFrom = util.canonicalizeEncodingName(from);
    } else {
      encodingFrom = Encoding.detect(data);
    }

    var encodingTo = util.canonicalizeEncodingName(to);
    var method = encodingFrom + 'To' + encodingTo;

    if (hasOwnProperty.call(EncodingConvert, method)) {
      result = EncodingConvert[method](data, options);
    } else {
      // Returns the raw data if the method is undefined
      result = data;
    }

    switch (('' + type).toLowerCase()) {
      case 'string':
        return util.codeToString_fast(result);
      case 'arraybuffer':
        return util.codeToBuffer(result);
      default: // array
        return util.bufferToCode(result);
    }
  },

  /**
   * Encode a character code array to URL string like encodeURIComponent
   *
   * @param {Array.<number>|TypedArray} data The data being encoded
   * @return {string} The percent encoded string
   */
  urlEncode: function(data) {
    if (util.isString(data)) {
      data = util.stringToBuffer(data);
    }

    var alpha = util.stringToCode('0123456789ABCDEF');
    var results = [];
    var i = 0;
    var len = data && data.length;
    var b;

    for (; i < len; i++) {
      b = data[i];

      // urlEncode is for an array of numbers in the range 0-255 (Uint8Array), but if an array
      // of numbers greater than 255 is passed (Unicode code unit i.e. charCodeAt range),
      // it will be tentatively encoded as UTF-8 using encodeURIComponent.
      if (b > 0xFF) {
        return encodeURIComponent(util.codeToString_fast(data));
      }

      if ((b >= 0x61 /*a*/ && b <= 0x7A /*z*/) ||
          (b >= 0x41 /*A*/ && b <= 0x5A /*Z*/) ||
          (b >= 0x30 /*0*/ && b <= 0x39 /*9*/) ||
          b === 0x21 /*!*/ ||
          (b >= 0x27 /*'*/ && b <= 0x2A /***/) ||
          b === 0x2D /*-*/ || b === 0x2E /*.*/ ||
          b === 0x5F /*_*/ || b === 0x7E /*~*/
      ) {
        results[results.length] = b;
      } else {
        results[results.length] = 0x25; /*%*/
        if (b < 0x10) {
          results[results.length] = 0x30; /*0*/
          results[results.length] = alpha[b];
        } else {
          results[results.length] = alpha[b >> 4 & 0xF];
          results[results.length] = alpha[b & 0xF];
        }
      }
    }

    return util.codeToString_fast(results);
  },

  /**
   * Decode a percent encoded string to
   *  character code array like decodeURIComponent
   *
   * @param {string} string The data being decoded
   * @return {Array.<number>} The decoded array
   */
  urlDecode: function(string) {
    var results = [];
    var i = 0;
    var len = string && string.length;
    var c;

    while (i < len) {
      c = string.charCodeAt(i++);
      if (c === 0x25 /*%*/) {
        results[results.length] = parseInt(
          string.charAt(i++) + string.charAt(i++), 16);
      } else {
        results[results.length] = c;
      }
    }

    return results;
  },

  /**
   * Encode a character code array to Base64 encoded string
   *
   * @param {Array.<number>|TypedArray} data The data being encoded
   * @return {string} The Base64 encoded string
   */
  base64Encode: function(data) {
    if (util.isString(data)) {
      data = util.stringToBuffer(data);
    }
    return util.base64encode(data);
  },

  /**
   * Decode a Base64 encoded string to character code array
   *
   * @param {string} string The data being decoded
   * @return {Array.<number>} The decoded array
   */
  base64Decode: function(string) {
    return util.base64decode(string);
  },

  /**
   * Joins a character code array to string
   *
   * @param {Array.<number>|TypedArray} data The data being joined
   * @return {String} The joined string
   */
  codeToString: util.codeToString_fast,

  /**
   * Splits string to an array of character codes
   *
   * @param {string} string The input string
   * @return {Array.<number>} The character code array
   */
  stringToCode: util.stringToCode,

  /**
   * 全角英数記号文字を半角英数記号文字に変換
   *
   * Convert the ascii symbols and alphanumeric characters to
   *   the zenkaku symbols and alphanumeric characters
   *
   * @example
   *   console.log(Encoding.toHankakuCase('Ｈｅｌｌｏ Ｗｏｒｌｄ！ １２３４５'));
   *   // 'Hello World! 12345'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toHankakuCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c >= 0xFF01 && c <= 0xFF5E) {
        c -= 0xFEE0;
      }
      results[results.length] = c;
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 半角英数記号文字を全角英数記号文字に変換
   *
   * Convert to the zenkaku symbols and alphanumeric characters
   *  from the ascii symbols and alphanumeric characters
   *
   * @example
   *   console.log(Encoding.toZenkakuCase('Hello World! 12345'));
   *   // 'Ｈｅｌｌｏ Ｗｏｒｌｄ！ １２３４５'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toZenkakuCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c >= 0x21 && c <= 0x7E) {
        c += 0xFEE0;
      }
      results[results.length] = c;
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 全角カタカナを全角ひらがなに変換
   *
   * Convert to the zenkaku hiragana from the zenkaku katakana
   *
   * @example
   *   console.log(Encoding.toHiraganaCase('ボポヴァアィイゥウェエォオ'));
   *   // 'ぼぽう゛ぁあぃいぅうぇえぉお'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toHiraganaCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c >= 0x30A1 && c <= 0x30F6) {
        c -= 0x0060;
      // 「ワ゛」 => 「わ」 + 「゛」
      } else if (c === 0x30F7) {
        results[results.length] = 0x308F;
        c = 0x309B;
      // 「ヲ゛」 => 「を」 + 「゛」
      } else if (c === 0x30FA) {
        results[results.length] = 0x3092;
        c = 0x309B;
      }
      results[results.length] = c;
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 全角ひらがなを全角カタカナに変換
   *
   * Convert to the zenkaku katakana from the zenkaku hiragana
   *
   * @example
   *   console.log(Encoding.toKatakanaCase('ぼぽう゛ぁあぃいぅうぇえぉお'));
   *   // 'ボポヴァアィイゥウェエォオ'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toKatakanaCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c >= 0x3041 && c <= 0x3096) {
        if ((c === 0x308F || // 「わ」 + 「゛」 => 「ワ゛」
             c === 0x3092) && // 「を」 + 「゛」 => 「ヲ゛」
            i < len && data[i] === 0x309B) {
          c = c === 0x308F ? 0x30F7 : 0x30FA;
          i++;
        } else {
          c += 0x0060;
        }
      }
      results[results.length] = c;
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 全角カタカナを半角ｶﾀｶﾅに変換
   *
   * Convert to the hankaku katakana from the zenkaku katakana
   *
   * @example
   *   console.log(Encoding.toHankanaCase('ボポヴァアィイゥウェエォオ'));
   *   // 'ﾎﾞﾎﾟｳﾞｧｱｨｲｩｳｪｴｫｵ'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toHankanaCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c, d, t;

    while (i < len) {
      c = data[i++];

      if (c >= 0x3001 && c <= 0x30FC) {
        t = KanaCaseTable.HANKANA_TABLE[c];
        if (t !== void 0) {
          results[results.length] = t;
          continue;
        }
      }

      // 「ヴ」, 「ワ」+「゛」, 「ヲ」+「゛」
      if (c === 0x30F4 || c === 0x30F7 || c === 0x30FA) {
        results[results.length] = KanaCaseTable.HANKANA_SONANTS[c];
        results[results.length] = 0xFF9E;
        // 「カ」 - 「ド」
      } else if (c >= 0x30AB && c <= 0x30C9) {
        results[results.length] = KanaCaseTable.HANKANA_TABLE[c - 1];
        results[results.length] = 0xFF9E;
        // 「ハ」 - 「ポ」
      } else if (c >= 0x30CF && c <= 0x30DD) {
        d = c % 3;
        results[results.length] = KanaCaseTable.HANKANA_TABLE[c - d];
        results[results.length] = KanaCaseTable.HANKANA_MARKS[d - 1];
      } else {
        results[results.length] = c;
      }
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 半角ｶﾀｶﾅを全角カタカナに変換 (濁音含む)
   *
   * Convert to the zenkaku katakana from the hankaku katakana
   *
   * @example
   *   console.log(Encoding.toZenkanaCase('ﾎﾞﾎﾟｳﾞｧｱｨｲｩｳｪｴｫｵ'));
   *   // 'ボポヴァアィイゥウェエォオ'
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toZenkanaCase: function(data) {
    var asString = false;
    if (util.isString(data)) {
      asString = true;
      data = util.stringToBuffer(data);
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c, code, next;

    for (i = 0; i < len; i++) {
      c = data[i];
      // Hankaku katakana
      if (c > 0xFF60 && c < 0xFFA0) {
        code = KanaCaseTable.ZENKANA_TABLE[c - 0xFF61];
        if (i + 1 < len) {
          next = data[i + 1];
          // 「ﾞ」 + 「ヴ」
          if (next === 0xFF9E && c === 0xFF73) {
            code = 0x30F4;
            i++;
          // 「ﾞ」 + 「ワ゛」
          } else if (next === 0xFF9E && c === 0xFF9C) {
            code = 0x30F7;
            i++;
          // 「ﾞ」 + 「ｦ゛」
          } else if (next === 0xFF9E && c === 0xFF66) {
            code = 0x30FA;
            i++;
            // 「ﾞ」 + 「カ」 - 「コ」 or 「ハ」 - 「ホ」
          } else if (next === 0xFF9E &&
                     ((c > 0xFF75 && c < 0xFF85) ||
                      (c > 0xFF89 && c < 0xFF8F))) {
            code++;
            i++;
            // 「ﾟ」 + 「ハ」 - 「ホ」
          } else if (next === 0xFF9F &&
                     (c > 0xFF89 && c < 0xFF8F)) {
            code += 2;
            i++;
          }
        }
        c = code;
      }
      results[results.length] = c;
    }

    return asString ? util.codeToString_fast(results) : results;
  },

  /**
   * 全角スペースを半角スペースに変換
   *
   * Convert the em space(U+3000) to the single space(U+0020)
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toHankakuSpace: function(data) {
    if (util.isString(data)) {
      return data.replace(/\u3000/g, ' ');
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c === 0x3000) {
        c = 0x20;
      }
      results[results.length] = c;
    }

    return results;
  },

  /**
   * 半角スペースを全角スペースに変換
   *
   * Convert the single space(U+0020) to the em space(U+3000)
   *
   * @param {Array.<number>|TypedArray|string} data The input unicode data
   * @return {Array.<number>|string} The conveted data
   */
  toZenkakuSpace: function(data) {
    if (util.isString(data)) {
      return data.replace(/\u0020/g, '\u3000');
    }

    var results = [];
    var len = data && data.length;
    var i = 0;
    var c;

    while (i < len) {
      c = data[i++];
      if (c === 0x20) {
        c = 0x3000;
      }
      results[results.length] = c;
    }

    return results;
  }
};

module.exports = Encoding;
