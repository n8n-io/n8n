'use strict';
var $ = require('../internals/export');
var uncurryThis = require('../internals/function-uncurry-this');
var classof = require('../internals/classof');
var toIndex = require('../internals/to-index');
var toUint8Clamped = require('../internals/to-uint8-clamped');

var $TypeError = TypeError;
// eslint-disable-next-line es/no-typed-arrays -- safe
var setUint8 = uncurryThis(DataView.prototype.setUint8);

// `DataView.prototype.setUint8Clamped` method
// https://github.com/tc39/proposal-dataview-get-set-uint8c
$({ target: 'DataView', proto: true, forced: true }, {
  setUint8Clamped: function setUint8Clamped(byteOffset, value) {
    if (classof(this) !== 'DataView') throw $TypeError('Incorrect receiver');
    var offset = toIndex(byteOffset);
    return setUint8(this, offset, toUint8Clamped(value));
  }
});
