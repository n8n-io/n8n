'use strict';
var $ = require('../internals/export');
var arrayWith = require('../internals/array-with');
var toIndexedObject = require('../internals/to-indexed-object');

var $Array = Array;

// Firefox bug
var INCORRECT_EXCEPTION_ON_COERCION_FAIL = (function () {
  try {
    // eslint-disable-next-line es/no-array-prototype-with, no-throw-literal -- needed for testing
    []['with']({ valueOf: function () { throw 4; } }, null);
  } catch (error) {
    return error !== 4;
  }
})();

// `Array.prototype.with` method
// https://tc39.es/ecma262/#sec-array.prototype.with
$({ target: 'Array', proto: true, forced: INCORRECT_EXCEPTION_ON_COERCION_FAIL }, {
  'with': function (index, value) {
    return arrayWith(toIndexedObject(this), $Array, index, value);
  }
});
