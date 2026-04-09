'use strict';
var $ = require('../internals/export');
var uncurryThis = require('../internals/function-uncurry-this');
var unpackIEEE754 = require('../internals/ieee754').unpack;

// eslint-disable-next-line es/no-typed-arrays -- safe
var getUint16 = uncurryThis(DataView.prototype.getUint16);

// `DataView.prototype.getFloat16` method
// https://github.com/tc39/proposal-float16array
$({ target: 'DataView', proto: true }, {
  getFloat16: function getFloat16(byteOffset /* , littleEndian */) {
    var uint16 = getUint16(this, byteOffset, arguments.length > 1 ? arguments[1] : false);
    return unpackIEEE754([uint16 & 0xFF, uint16 >> 8 & 0xFF], 10);
  }
});
