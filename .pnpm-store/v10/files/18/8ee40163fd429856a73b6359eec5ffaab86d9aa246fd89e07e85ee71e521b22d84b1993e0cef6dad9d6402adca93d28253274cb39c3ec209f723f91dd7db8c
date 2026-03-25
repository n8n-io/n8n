'use strict';
var $ = require('../internals/export');
var arrayToReversed = require('../internals/array-to-reversed');
var toIndexedObject = require('../internals/to-indexed-object');
var addToUnscopables = require('../internals/add-to-unscopables');

var $Array = Array;

// `Array.prototype.toReversed` method
// https://tc39.es/ecma262/#sec-array.prototype.toreversed
$({ target: 'Array', proto: true }, {
  toReversed: function toReversed() {
    return arrayToReversed(toIndexedObject(this), $Array);
  }
});

addToUnscopables('toReversed');
