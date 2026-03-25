'use strict';
var $ = require('../internals/export');
var floatRound = require('../internals/math-float-round');

var FLOAT16_EPSILON = 0.0009765625;
var FLOAT16_MAX_VALUE = 65504;
var FLOAT16_MIN_VALUE = 6.103515625e-05;

// `Math.f16round` method
// https://github.com/tc39/proposal-float16array
$({ target: 'Math', stat: true }, {
  f16round: function f16round(x) {
    return floatRound(x, FLOAT16_EPSILON, FLOAT16_MAX_VALUE, FLOAT16_MIN_VALUE);
  }
});
