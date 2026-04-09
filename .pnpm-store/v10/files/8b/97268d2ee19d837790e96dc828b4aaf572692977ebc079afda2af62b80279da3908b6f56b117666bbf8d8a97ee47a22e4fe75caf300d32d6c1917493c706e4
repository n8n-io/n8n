'use strict';
var $ = require('../internals/export');
var IEEE754 = require('../internals/ieee754');

var packIEEE754 = IEEE754.pack;
var unpackIEEE754 = IEEE754.unpack;
var $isFinite = isFinite;

// `Math.f16round` method
// https://github.com/tc39/proposal-float16array
$({ target: 'Math', stat: true }, {
  f16round: function f16round(x) {
    var n = +x;
    return $isFinite(n) && n !== 0 ? unpackIEEE754(packIEEE754(n, 10, 2), 10) : n;
  }
});
