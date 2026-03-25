/**
 * Binary (exe, images and so, etc.)
 *
 * Note:
 *   This function is not considered for Unicode
 */
function isBINARY(data) {
  var i = 0;
  var len = data && data.length;
  var c;

  for (; i < len; i++) {
    c = data[i];
    if (c > 0xFF) {
      return false;
    }

    if ((c >= 0x00 && c <= 0x07) || c === 0xFF) {
      return true;
    }
  }

  return false;
}
exports.isBINARY = isBINARY;

/**
 * ASCII (ISO-646)
 */
function isASCII(data) {
  var i = 0;
  var len = data && data.length;
  var b;

  for (; i < len; i++) {
    b = data[i];
    if (b > 0xFF ||
        (b >= 0x80 && b <= 0xFF) ||
        b === 0x1B) {
      return false;
    }
  }

  return true;
}
exports.isASCII = isASCII;

/**
 * ISO-2022-JP (JIS)
 *
 * RFC1468 Japanese Character Encoding for Internet Messages
 * RFC1554 ISO-2022-JP-2: Multilingual Extension of ISO-2022-JP
 * RFC2237 Japanese Character Encoding for Internet Messages
 */
function isJIS(data) {
  var i = 0;
  var len = data && data.length;
  var b, esc1, esc2;

  for (; i < len; i++) {
    b = data[i];
    if (b > 0xFF || (b >= 0x80 && b <= 0xFF)) {
      return false;
    }

    if (b === 0x1B) {
      if (i + 2 >= len) {
        return false;
      }

      esc1 = data[i + 1];
      esc2 = data[i + 2];
      if (esc1 === 0x24) {
        if (esc2 === 0x28 ||  // JIS X 0208-1990/2000/2004
            esc2 === 0x40 ||  // JIS X 0208-1978
            esc2 === 0x42) {  // JIS X 0208-1983
          return true;
        }
      } else if (esc1 === 0x26 && // JIS X 0208-1990
                 esc2 === 0x40) {
        return true;
      } else if (esc1 === 0x28) {
        if (esc2 === 0x42 || // ASCII
            esc2 === 0x49 || // JIS X 0201 Halfwidth Katakana
            esc2 === 0x4A) { // JIS X 0201-1976 Roman set
          return true;
        }
      }
    }
  }

  return false;
}
exports.isJIS = isJIS;

/**
 * EUC-JP
 */
function isEUCJP(data) {
  var i = 0;
  var len = data && data.length;
  var b;

  for (; i < len; i++) {
    b = data[i];
    if (b < 0x80) {
      continue;
    }

    if (b > 0xFF || b < 0x8E) {
      return false;
    }

    if (b === 0x8E) {
      if (i + 1 >= len) {
        return false;
      }

      b = data[++i];
      if (b < 0xA1 || 0xDF < b) {
        return false;
      }
    } else if (b === 0x8F) {
      if (i + 2 >= len) {
        return false;
      }

      b = data[++i];
      if (b < 0xA2 || 0xED < b) {
        return false;
      }

      b = data[++i];
      if (b < 0xA1 || 0xFE < b) {
        return false;
      }
    } else if (0xA1 <= b && b <= 0xFE) {
      if (i + 1 >= len) {
        return false;
      }

      b = data[++i];
      if (b < 0xA1 || 0xFE < b) {
        return false;
      }
    } else {
      return false;
    }
  }

  return true;
}
exports.isEUCJP = isEUCJP;

/**
 * Shift-JIS (SJIS)
 */
function isSJIS(data) {
  var i = 0;
  var len = data && data.length;
  var b;

  while (i < len && data[i] > 0x80) {
    if (data[i++] > 0xFF) {
      return false;
    }
  }

  for (; i < len; i++) {
    b = data[i];
    if (b <= 0x80 ||
        (0xA1 <= b && b <= 0xDF)) {
      continue;
    }

    if (b === 0xA0 || b > 0xEF || i + 1 >= len) {
      return false;
    }

    b = data[++i];
    if (b < 0x40 || b === 0x7F || b > 0xFC) {
      return false;
    }
  }

  return true;
}
exports.isSJIS = isSJIS;

/**
 * UTF-8
 */
function isUTF8(data) {
  var i = 0;
  var len = data && data.length;
  var b;

  for (; i < len; i++) {
    b = data[i];
    if (b > 0xFF) {
      return false;
    }

    if (b === 0x09 || b === 0x0A || b === 0x0D ||
        (b >= 0x20 && b <= 0x7E)) {
      continue;
    }

    if (b >= 0xC2 && b <= 0xDF) {
      if (i + 1 >= len || data[i + 1] < 0x80 || data[i + 1] > 0xBF) {
        return false;
      }
      i++;
    } else if (b === 0xE0) {
      if (i + 2 >= len ||
          data[i + 1] < 0xA0 || data[i + 1] > 0xBF ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF) {
        return false;
      }
      i += 2;
    } else if ((b >= 0xE1 && b <= 0xEC) ||
                b === 0xEE || b === 0xEF) {
      if (i + 2 >= len ||
          data[i + 1] < 0x80 || data[i + 1] > 0xBF ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF) {
        return false;
      }
      i += 2;
    } else if (b === 0xED) {
      if (i + 2 >= len ||
          data[i + 1] < 0x80 || data[i + 1] > 0x9F ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF) {
        return false;
      }
      i += 2;
    } else if (b === 0xF0) {
      if (i + 3 >= len ||
          data[i + 1] < 0x90 || data[i + 1] > 0xBF ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF ||
          data[i + 3] < 0x80 || data[i + 3] > 0xBF) {
        return false;
      }
      i += 3;
    } else if (b >= 0xF1 && b <= 0xF3) {
      if (i + 3 >= len ||
          data[i + 1] < 0x80 || data[i + 1] > 0xBF ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF ||
          data[i + 3] < 0x80 || data[i + 3] > 0xBF) {
        return false;
      }
      i += 3;
    } else if (b === 0xF4) {
      if (i + 3 >= len ||
          data[i + 1] < 0x80 || data[i + 1] > 0x8F ||
          data[i + 2] < 0x80 || data[i + 2] > 0xBF ||
          data[i + 3] < 0x80 || data[i + 3] > 0xBF) {
        return false;
      }
      i += 3;
    } else {
      return false;
    }
  }

  return true;
}
exports.isUTF8 = isUTF8;

/**
 * UTF-16 (LE or BE)
 *
 * RFC2781: UTF-16, an encoding of ISO 10646
 *
 * @link http://www.ietf.org/rfc/rfc2781.txt
 */
function isUTF16(data) {
  var i = 0;
  var len = data && data.length;
  var pos = null;
  var b1, b2, next, prev;

  if (len < 2) {
    if (data[0] > 0xFF) {
      return false;
    }
  } else {
    b1 = data[0];
    b2 = data[1];
    if (b1 === 0xFF && // BOM (little-endian)
        b2 === 0xFE) {
      return true;
    }
    if (b1 === 0xFE && // BOM (big-endian)
        b2 === 0xFF) {
      return true;
    }

    for (; i < len; i++) {
      if (data[i] === 0x00) {
        pos = i;
        break;
      } else if (data[i] > 0xFF) {
        return false;
      }
    }

    if (pos === null) {
      return false; // Non ASCII
    }

    next = data[pos + 1]; // BE
    if (next !== void 0 && next > 0x00 && next < 0x80) {
      return true;
    }

    prev = data[pos - 1]; // LE
    if (prev !== void 0 && prev > 0x00 && prev < 0x80) {
      return true;
    }
  }

  return false;
}
exports.isUTF16 = isUTF16;

/**
 * UTF-16BE (big-endian)
 *
 * RFC 2781 4.3 Interpreting text labelled as UTF-16
 * Text labelled "UTF-16BE" can always be interpreted as being big-endian
 *  when BOM does not founds (SHOULD)
 *
 * @link http://www.ietf.org/rfc/rfc2781.txt
 */
function isUTF16BE(data) {
  var i = 0;
  var len = data && data.length;
  var pos = null;
  var b1, b2;

  if (len < 2) {
    if (data[0] > 0xFF) {
      return false;
    }
  } else {
    b1 = data[0];
    b2 = data[1];
    if (b1 === 0xFE && // BOM
        b2 === 0xFF) {
      return true;
    }

    for (; i < len; i++) {
      if (data[i] === 0x00) {
        pos = i;
        break;
      } else if (data[i] > 0xFF) {
        return false;
      }
    }

    if (pos === null) {
      return false; // Non ASCII
    }

    if (pos % 2 === 0) {
      return true;
    }
  }

  return false;
}
exports.isUTF16BE = isUTF16BE;

/**
 * UTF-16LE (little-endian)
 */
function isUTF16LE(data) {
  var i = 0;
  var len = data && data.length;
  var pos = null;
  var b1, b2;

  if (len < 2) {
    if (data[0] > 0xFF) {
      return false;
    }
  } else {
    b1 = data[0];
    b2 = data[1];
    if (b1 === 0xFF && // BOM
        b2 === 0xFE) {
      return true;
    }

    for (; i < len; i++) {
      if (data[i] === 0x00) {
        pos = i;
        break;
      } else if (data[i] > 0xFF) {
        return false;
      }
    }

    if (pos === null) {
      return false; // Non ASCII
    }

    if (pos % 2 !== 0) {
      return true;
    }
  }

  return false;
}
exports.isUTF16LE = isUTF16LE;

/**
 * UTF-32
 *
 * Unicode 3.2.0: Unicode Standard Annex #19
 *
 * @link http://www.iana.org/assignments/charset-reg/UTF-32
 * @link http://www.unicode.org/reports/tr19/tr19-9.html
 */
function isUTF32(data) {
  var i = 0;
  var len = data && data.length;
  var pos = null;
  var b1, b2, b3, b4;
  var next, prev;

  if (len < 4) {
    for (; i < len; i++) {
      if (data[i] > 0xFF) {
        return false;
      }
    }
  } else {
    b1 = data[0];
    b2 = data[1];
    b3 = data[2];
    b4 = data[3];
    if (b1 === 0x00 && b2 === 0x00 && // BOM (big-endian)
        b3 === 0xFE && b4 === 0xFF) {
      return true;
    }

    if (b1 === 0xFF && b2 === 0xFE && // BOM (little-endian)
        b3 === 0x00 && b4 === 0x00) {
      return true;
    }

    for (; i < len; i++) {
      if (data[i] === 0x00 && data[i + 1] === 0x00 && data[i + 2] === 0x00) {
        pos = i;
        break;
      } else if (data[i] > 0xFF) {
        return false;
      }
    }

    if (pos === null) {
      return false;
    }

    // The byte order should be the big-endian when BOM is not detected.
    next = data[pos + 3];
    if (next !== void 0 && next > 0x00 && next <= 0x7F) {
      // big-endian
      return data[pos + 2] === 0x00 && data[pos + 1] === 0x00;
    }

    prev = data[pos - 1];
    if (prev !== void 0 && prev > 0x00 && prev <= 0x7F) {
      // little-endian
      return data[pos + 1] === 0x00 && data[pos + 2] === 0x00;
    }
  }

  return false;
}
exports.isUTF32 = isUTF32;

/**
 * JavaScript Unicode array
 */
function isUNICODE(data) {
  var i = 0;
  var len = data && data.length;
  var c;

  for (; i < len; i++) {
    c = data[i];
    if (c < 0 || c > 0x10FFFF) {
      return false;
    }
  }

  return true;
}
exports.isUNICODE = isUNICODE;
