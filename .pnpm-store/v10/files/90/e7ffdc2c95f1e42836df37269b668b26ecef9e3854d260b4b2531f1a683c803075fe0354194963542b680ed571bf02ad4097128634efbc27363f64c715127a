'use strict';
var $ = require('../internals/export');
var map = require('../internals/iterator-map');
var IS_PURE = require('../internals/is-pure');

// `Iterator.prototype.map` method
// https://tc39.es/ecma262/#sec-iterator.prototype.map
$({ target: 'Iterator', proto: true, real: true, forced: IS_PURE }, {
  map: map
});
