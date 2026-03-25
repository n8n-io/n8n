// A base64 implementation for the bcrypt algorithm. This is partly non-standard.

/**
 * bcrypt's own non-standard base64 dictionary.
 * @type {!Array.<string>}
 * @const
 * @inner
 **/
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');

/**
 * @type {!Array.<number>}
 * @const
 * @inner
 **/
var BASE64_INDEX = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0,
    1, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, -1, -1, -1, -1, -1, -1,
    -1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24, 25, 26, 27, -1, -1, -1, -1, -1, -1, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    48, 49, 50, 51, 52, 53, -1, -1, -1, -1, -1];

/**
 * @type {!function(...number):string}
 * @inner
 */
var stringFromCharCode = String.fromCharCode;

/**
 * Encodes a byte array to base64 with up to len bytes of input.
 * @param {!Array.<number>} b Byte array
 * @param {number} len Maximum input length
 * @returns {string}
 * @inner
 */
function base64_encode(b, len) {
    var off = 0,
        rs = [],
        c1, c2;
    if (len <= 0 || len > b.length)
        throw Error("Illegal len: "+len);
    while (off < len) {
        c1 = b[off++] & 0xff;
        rs.push(BASE64_CODE[(c1 >> 2) & 0x3f]);
        c1 = (c1 & 0x03) << 4;
        if (off >= len) {
            rs.push(BASE64_CODE[c1 & 0x3f]);
            break;
        }
        c2 = b[off++] & 0xff;
        c1 |= (c2 >> 4) & 0x0f;
        rs.push(BASE64_CODE[c1 & 0x3f]);
        c1 = (c2 & 0x0f) << 2;
        if (off >= len) {
            rs.push(BASE64_CODE[c1 & 0x3f]);
            break;
        }
        c2 = b[off++] & 0xff;
        c1 |= (c2 >> 6) & 0x03;
        rs.push(BASE64_CODE[c1 & 0x3f]);
        rs.push(BASE64_CODE[c2 & 0x3f]);
    }
    return rs.join('');
}

/**
 * Decodes a base64 encoded string to up to len bytes of output.
 * @param {string} s String to decode
 * @param {number} len Maximum output length
 * @returns {!Array.<number>}
 * @inner
 */
function base64_decode(s, len) {
    var off = 0,
        slen = s.length,
        olen = 0,
        rs = [],
        c1, c2, c3, c4, o, code;
    if (len <= 0)
        throw Error("Illegal len: "+len);
    while (off < slen - 1 && olen < len) {
        code = s.charCodeAt(off++);
        c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
        code = s.charCodeAt(off++);
        c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
        if (c1 == -1 || c2 == -1)
            break;
        o = (c1 << 2) >>> 0;
        o |= (c2 & 0x30) >> 4;
        rs.push(stringFromCharCode(o));
        if (++olen >= len || off >= slen)
            break;
        code = s.charCodeAt(off++);
        c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
        if (c3 == -1)
            break;
        o = ((c2 & 0x0f) << 4) >>> 0;
        o |= (c3 & 0x3c) >> 2;
        rs.push(stringFromCharCode(o));
        if (++olen >= len || off >= slen)
            break;
        code = s.charCodeAt(off++);
        c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
        o = ((c3 & 0x03) << 6) >>> 0;
        o |= c4;
        rs.push(stringFromCharCode(o));
        ++olen;
    }
    var res = [];
    for (off = 0; off<olen; off++)
        res.push(rs[off].charCodeAt(0));
    return res;
}
