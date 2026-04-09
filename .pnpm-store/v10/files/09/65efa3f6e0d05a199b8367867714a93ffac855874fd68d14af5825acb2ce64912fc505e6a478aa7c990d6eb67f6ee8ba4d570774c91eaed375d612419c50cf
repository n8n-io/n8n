'use strict';
var $ = require('../internals/export');
var uncurryThis = require('../internals/function-uncurry-this');
var classof = require('../internals/classof');
var toIndex = require('../internals/to-index');
var packIEEE754 = require('../internals/ieee754').pack;

var $TypeError = TypeError;
// eslint-disable-next-line es/no-typed-arrays -- safe
var setUint16 = uncurryThis(DataView.prototype.setUint16);

// `DataView.prototype.setFloat16` method
// https://github.com/tc39/proposal-float16array
$({ target: 'DataView', proto: true }, {
  setFloat16: function setFloat16(byteOffset, value /* , littleEndian */) {
    if (classof(this) !== 'DataView') throw $TypeError('Incorrect receiver');
    var offset = toIndex(byteOffset);
    var bytes = packIEEE754(+value, 10, 2);
    return setUint16(this, offset, bytes[1] << 8 | bytes[0], arguments.length > 2 ? arguments[2] : false);
  }
});
