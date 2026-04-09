'use strict';
var uncurryThisAccessor = require('../internals/function-uncurry-this-accessor');
var classof = require('../internals/classof-raw');

var $TypeError = TypeError;

// Includes
// - Perform ? RequireInternalSlot(O, [[ArrayBufferData]]).
// - If IsSharedArrayBuffer(O) is true, throw a TypeError exception.
module.exports = uncurryThisAccessor(ArrayBuffer.prototype, 'byteLength', 'get') || function (O) {
  if (classof(O) !== 'ArrayBuffer') throw $TypeError('ArrayBuffer expected');
  return O.byteLength;
};
