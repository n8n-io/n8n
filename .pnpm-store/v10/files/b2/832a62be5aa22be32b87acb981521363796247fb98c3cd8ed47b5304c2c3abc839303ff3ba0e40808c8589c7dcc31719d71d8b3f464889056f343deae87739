'use strict';

var GetIntrinsic = require('get-intrinsic');

var $TypeError = require('es-errors/type');
var max = GetIntrinsic('%Math.max%');
var min = GetIntrinsic('%Math.min%');

// https://262.ecma-international.org/12.0/#clamping

module.exports = function clamp(x, lower, upper) {
	if (typeof x !== 'number' || typeof lower !== 'number' || typeof upper !== 'number' || !(lower <= upper)) {
		throw new $TypeError('Assertion failed: all three arguments must be MVs, and `lower` must be `<= upper`');
	}
	return min(max(lower, x), upper);
};
