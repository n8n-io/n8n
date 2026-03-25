var util = require('./util');
var EncodingTable = require('./encoding-table');

// Fallback character when a character can't be represented
exports.FALLBACK_CHARACTER = 63; // '?'

var HAS_TYPED = exports.HAS_TYPED = typeof Uint8Array !== 'undefined' && typeof Uint16Array !== 'undefined';

// Test for String.fromCharCode.apply
var CAN_CHARCODE_APPLY = false;
var CAN_CHARCODE_APPLY_TYPED = false;

try {
  if (String.fromCharCode.apply(null, [0x61]) === 'a') {
    CAN_CHARCODE_APPLY = true;
  }
} catch (e) {}

if (HAS_TYPED) {
  try {
    if (String.fromCharCode.apply(null, new Uint8Array([0x61])) === 'a') {
      CAN_CHARCODE_APPLY_TYPED = true;
    }
  } catch (e) {}
}

exports.CAN_CHARCODE_APPLY = CAN_CHARCODE_APPLY;
exports.CAN_CHARCODE_APPLY_TYPED = CAN_CHARCODE_APPLY_TYPED;

// Function.prototype.apply stack max range
exports.APPLY_BUFFER_SIZE = 65533;
exports.APPLY_BUFFER_SIZE_OK = null;

var EncodingNames = exports.EncodingNames = {
  UTF32: {
    order: 0
  },
  UTF32BE: {
    alias: ['UCS4']
  },
  UTF32LE: null,
  UTF16: {
    order: 1
  },
  UTF16BE: {
    alias: ['UCS2']
  },
  UTF16LE: null,
  BINARY: {
    order: 2
  },
  ASCII: {
    order: 3,
    alias: ['ISO646', 'CP367']
  },
  JIS: {
    order: 4,
    alias: ['ISO2022JP']
  },
  UTF8: {
    order: 5
  },
  EUCJP: {
    order: 6
  },
  SJIS: {
    order: 7,
    alias: ['CP932', 'MSKANJI', 'WINDOWS31J']
  },
  UNICODE: {
    order: 8
  }
};

var EncodingAliases = {};
exports.EncodingAliases = EncodingAliases;

exports.EncodingOrders = (function() {
  var aliases = EncodingAliases;

  var names = util.objectKeys(EncodingNames);
  var orders = [];
  var name, encoding, j, l;

  for (var i = 0, len = names.length; i < len; i++) {
    name = names[i];
    aliases[name] = name;

    encoding = EncodingNames[name];
    if (encoding != null) {
      if (encoding.order != null) {
        orders[orders.length] = name;
      }

      if (encoding.alias) {
        // Create encoding aliases
        for (j = 0, l = encoding.alias.length; j < l; j++) {
          aliases[encoding.alias[j]] = name;
        }
      }
    }
  }

  orders.sort(function(a, b) {
    return EncodingNames[a].order - EncodingNames[b].order;
  });

  return orders;
}());

function init_JIS_TO_UTF8_TABLE() {
  if (EncodingTable.JIS_TO_UTF8_TABLE === null) {
    EncodingTable.JIS_TO_UTF8_TABLE = {};

    var keys = util.objectKeys(EncodingTable.UTF8_TO_JIS_TABLE);
    var i = 0;
    var len = keys.length;
    var key, value;

    for (; i < len; i++) {
      key = keys[i];
      value = EncodingTable.UTF8_TO_JIS_TABLE[key];
      if (value > 0x5F) {
        EncodingTable.JIS_TO_UTF8_TABLE[value] = key | 0;
      }
    }

    EncodingTable.JISX0212_TO_UTF8_TABLE = {};
    keys = util.objectKeys(EncodingTable.UTF8_TO_JISX0212_TABLE);
    len = keys.length;

    for (i = 0; i < len; i++) {
      key = keys[i];
      value = EncodingTable.UTF8_TO_JISX0212_TABLE[key];
      EncodingTable.JISX0212_TO_UTF8_TABLE[value] = key | 0;
    }
  }
}
exports.init_JIS_TO_UTF8_TABLE = init_JIS_TO_UTF8_TABLE;
