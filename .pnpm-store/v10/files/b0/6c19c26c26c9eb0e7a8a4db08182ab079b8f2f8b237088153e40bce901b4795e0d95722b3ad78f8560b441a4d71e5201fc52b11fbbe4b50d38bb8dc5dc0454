var config = require('./config');
var fromCharCode = String.fromCharCode;
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var nativeIsArray = Array.isArray;
var nativeObjectKeys = Object.keys;


function isObject(x) {
  var type = typeof x;
  return type === 'function' || type === 'object' && !!x;
}
exports.isObject = isObject;


function isArray(x) {
  return nativeIsArray ? nativeIsArray(x) : toString.call(x) === '[object Array]';
}
exports.isArray = isArray;


function isString(x) {
  return typeof x === 'string' || toString.call(x) === '[object String]';
}
exports.isString = isString;


function objectKeys(object) {
  if (nativeObjectKeys) {
    return nativeObjectKeys(object);
  }

  var keys = [];
  for (var key in object) {
    if (hasOwnProperty.call(object, key)) {
      keys[keys.length] = key;
    }
  }

  return keys;
}
exports.objectKeys = objectKeys;


function createBuffer(bits, size) {
  if (config.HAS_TYPED) {
    switch (bits) {
      case 8: return new Uint8Array(size);
      case 16: return new Uint16Array(size);
    }
  }
  return new Array(size);
}
exports.createBuffer = createBuffer;


function stringToBuffer(string) {
  var length = string.length;
  var buffer = createBuffer(16, length);

  for (var i = 0; i < length; i++) {
    buffer[i] = string.charCodeAt(i);
  }

  return buffer;
}
exports.stringToBuffer = stringToBuffer;


function codeToString_fast(code) {
  if (config.CAN_CHARCODE_APPLY && config.CAN_CHARCODE_APPLY_TYPED) {
    var len = code && code.length;
    if (len < config.APPLY_BUFFER_SIZE && config.APPLY_BUFFER_SIZE_OK) {
      return fromCharCode.apply(null, code);
    }

    if (config.APPLY_BUFFER_SIZE_OK === null) {
      try {
        var s = fromCharCode.apply(null, code);
        if (len > config.APPLY_BUFFER_SIZE) {
          config.APPLY_BUFFER_SIZE_OK = true;
        }
        return s;
      } catch (e) {
        // Ignore the RangeError "arguments too large"
        config.APPLY_BUFFER_SIZE_OK = false;
      }
    }
  }

  return codeToString_chunked(code);
}
exports.codeToString_fast = codeToString_fast;


function codeToString_chunked(code) {
  var string = '';
  var length = code && code.length;
  var i = 0;
  var sub;

  while (i < length) {
    if (code.subarray) {
      sub = code.subarray(i, i + config.APPLY_BUFFER_SIZE);
    } else {
      sub = code.slice(i, i + config.APPLY_BUFFER_SIZE);
    }
    i += config.APPLY_BUFFER_SIZE;

    if (config.APPLY_BUFFER_SIZE_OK) {
      string += fromCharCode.apply(null, sub);
      continue;
    }

    if (config.APPLY_BUFFER_SIZE_OK === null) {
      try {
        string += fromCharCode.apply(null, sub);
        if (sub.length > config.APPLY_BUFFER_SIZE) {
          config.APPLY_BUFFER_SIZE_OK = true;
        }
        continue;
      } catch (e) {
        config.APPLY_BUFFER_SIZE_OK = false;
      }
    }

    return codeToString_slow(code);
  }

  return string;
}
exports.codeToString_chunked = codeToString_chunked;


function codeToString_slow(code) {
  var string = '';
  var length = code && code.length;

  for (var i = 0; i < length; i++) {
    string += fromCharCode(code[i]);
  }

  return string;
}
exports.codeToString_slow = codeToString_slow;


function stringToCode(string) {
  var code = [];
  var len = string && string.length;

  for (var i = 0; i < len; i++) {
    code[i] = string.charCodeAt(i);
  }

  return code;
}
exports.stringToCode = stringToCode;


function codeToBuffer(code) {
  if (config.HAS_TYPED) {
    // Unicode code point (charCodeAt range) values have a range of 0-0xFFFF, so use Uint16Array
    return new Uint16Array(code);
  }

  if (isArray(code)) {
    return code;
  }

  var length = code && code.length;
  var buffer = [];

  for (var i = 0; i < length; i++) {
    buffer[i] = code[i];
  }

  return buffer;
}
exports.codeToBuffer = codeToBuffer;


function bufferToCode(buffer) {
  if (isArray(buffer)) {
    return buffer;
  }

  return slice.call(buffer);
}
exports.bufferToCode = bufferToCode;

/**
 * Canonicalize the passed encoding name to the internal encoding name
 */
function canonicalizeEncodingName(target) {
  var name = '';
  var expect = ('' + target).toUpperCase().replace(/[^A-Z0-9]+/g, '');
  var aliasNames = objectKeys(config.EncodingAliases);
  var len = aliasNames.length;
  var hit = 0;
  var encoding, encodingLen, j;

  for (var i = 0; i < len; i++) {
    encoding = aliasNames[i];
    if (encoding === expect) {
      name = encoding;
      break;
    }

    encodingLen = encoding.length;
    for (j = hit; j < encodingLen; j++) {
      if (encoding.slice(0, j) === expect.slice(0, j) ||
          encoding.slice(-j) === expect.slice(-j)) {
        name = encoding;
        hit = j;
      }
    }
  }

  if (hasOwnProperty.call(config.EncodingAliases, name)) {
    return config.EncodingAliases[name];
  }

  return name;
}
exports.canonicalizeEncodingName = canonicalizeEncodingName;

// Base64
/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
// -- Masanao Izumo Copyright 1999 "free"
// Added binary array support for the Encoding.js

var base64EncodeChars = [
  65,  66,  67,  68,  69,  70,  71,  72,  73,  74,  75,  76,  77,
  78,  79,  80,  81,  82,  83,  84,  85,  86,  87,  88,  89,  90,
  97,  98,  99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
  110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
  48,  49,  50,  51,  52,  53,  54,  55,  56,  57,  43,  47
];

var base64DecodeChars = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
  -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
  -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
];

var base64EncodePadding = '='.charCodeAt(0);


function base64encode(data) {
  var out, i, len;
  var c1, c2, c3;

  len = data && data.length;
  i = 0;
  out = [];

  while (i < len) {
    c1 = data[i++];
    if (i == len) {
      out[out.length] = base64EncodeChars[c1 >> 2];
      out[out.length] = base64EncodeChars[(c1 & 0x3) << 4];
      out[out.length] = base64EncodePadding;
      out[out.length] = base64EncodePadding;
      break;
    }

    c2 = data[i++];
    if (i == len) {
      out[out.length] = base64EncodeChars[c1 >> 2];
      out[out.length] = base64EncodeChars[((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4)];
      out[out.length] = base64EncodeChars[(c2 & 0xF) << 2];
      out[out.length] = base64EncodePadding;
      break;
    }

    c3 = data[i++];
    out[out.length] = base64EncodeChars[c1 >> 2];
    out[out.length] = base64EncodeChars[((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4)];
    out[out.length] = base64EncodeChars[((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6)];
    out[out.length] = base64EncodeChars[c3 & 0x3F];
  }

  return codeToString_fast(out);
}
exports.base64encode = base64encode;


function base64decode(str) {
  var c1, c2, c3, c4;
  var i, len, out;

  len = str && str.length;
  i = 0;
  out = [];

  while (i < len) {
    /* c1 */
    do {
      c1 = base64DecodeChars[str.charCodeAt(i++) & 0xFF];
    } while (i < len && c1 == -1);

    if (c1 == -1) {
      break;
    }

    /* c2 */
    do {
      c2 = base64DecodeChars[str.charCodeAt(i++) & 0xFF];
    } while (i < len && c2 == -1);

    if (c2 == -1) {
      break;
    }

    out[out.length] = (c1 << 2) | ((c2 & 0x30) >> 4);

    /* c3 */
    do {
      c3 = str.charCodeAt(i++) & 0xFF;
      if (c3 == 61) {
        return out;
      }
      c3 = base64DecodeChars[c3];
    } while (i < len && c3 == -1);

    if (c3 == -1) {
      break;
    }

    out[out.length] = ((c2 & 0xF) << 4) | ((c3 & 0x3C) >> 2);

    /* c4 */
    do {
      c4 = str.charCodeAt(i++) & 0xFF;
      if (c4 == 61) {
        return out;
      }
      c4 = base64DecodeChars[c4];
    } while (i < len && c4 == -1);

    if (c4 == -1) {
      break;
    }

    out[out.length] = ((c3 & 0x03) << 6) | c4;
  }

  return out;
}
exports.base64decode = base64decode;
