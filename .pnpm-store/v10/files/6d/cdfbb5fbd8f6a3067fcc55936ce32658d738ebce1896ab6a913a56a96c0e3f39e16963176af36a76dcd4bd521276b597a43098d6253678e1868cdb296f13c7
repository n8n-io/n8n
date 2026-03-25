'use strict';
var $ = require('../internals/export');
var arrayWith = require('../internals/array-with');
var toIndexedObject = require('../internals/to-indexed-object');

var $Array = Array;

// `Array.prototype.with` method
// https://tc39.es/ecma262/#sec-array.prototype.with
$({ target: 'Array', proto: true }, {
  'with': function (index, value) {
    return arrayWith(toIndexedObject(this), $Array, index, value);
  }
});
