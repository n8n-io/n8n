'use strict';
var $ = require('../internals/export');
var map = require('../internals/iterator-map');
var IS_PURE = require('../internals/is-pure');

// `Iterator.prototype.map` method
// https://github.com/tc39/proposal-iterator-helpers
$({ target: 'Iterator', proto: true, real: true, forced: IS_PURE }, {
  map: map
});
