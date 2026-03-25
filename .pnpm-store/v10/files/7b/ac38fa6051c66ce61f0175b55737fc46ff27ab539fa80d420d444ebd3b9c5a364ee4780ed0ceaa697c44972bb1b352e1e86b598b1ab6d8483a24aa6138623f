'use strict';
var $ = require('../internals/export');
var map = require('../internals/async-iterator-map');
var IS_PURE = require('../internals/is-pure');

// `AsyncIterator.prototype.map` method
// https://github.com/tc39/proposal-async-iterator-helpers
$({ target: 'AsyncIterator', proto: true, real: true, forced: IS_PURE }, {
  map: map
});

