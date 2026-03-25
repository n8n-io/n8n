'use strict';
var $ = require('../internals/export');
var globalThis = require('../internals/global-this');
var arrayFromConstructorAndList = require('../internals/array-from-constructor-and-list');
var $fromBase64 = require('../internals/uint8-from-base64');

var Uint8Array = globalThis.Uint8Array;

// `Uint8Array.fromBase64` method
// https://github.com/tc39/proposal-arraybuffer-base64
if (Uint8Array) $({ target: 'Uint8Array', stat: true }, {
  fromBase64: function fromBase64(string /* , options */) {
    var result = $fromBase64(string, arguments.length > 1 ? arguments[1] : undefined, null, 0x1FFFFFFFFFFFFF);
    return arrayFromConstructorAndList(Uint8Array, result.bytes);
  }
});
