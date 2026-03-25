'use strict';
var $ = require('../internals/export');
var anObject = require('../internals/an-object');
var iterate = require('../internals/iterate');
var getIteratorDirect = require('../internals/get-iterator-direct');

var push = [].push;

// `Iterator.prototype.toArray` method
// https://tc39.es/ecma262/#sec-iterator.prototype.toarray
$({ target: 'Iterator', proto: true, real: true }, {
  toArray: function toArray() {
    var result = [];
    iterate(getIteratorDirect(anObject(this)), push, { that: result, IS_RECORD: true });
    return result;
  }
});
