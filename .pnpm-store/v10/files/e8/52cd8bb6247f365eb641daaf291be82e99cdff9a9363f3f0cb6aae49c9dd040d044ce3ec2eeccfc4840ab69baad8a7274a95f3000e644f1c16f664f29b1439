'use strict';

var callBound = require('call-bind/callBound');

var $SyntaxError = require('es-errors/syntax');
var $bigIntValueOf = callBound('BigInt.prototype.valueOf', true);

// https://262.ecma-international.org/15.0/#sec-thisbigintvalue

module.exports = function ThisBigIntValue(value) {
	if (typeof value === 'bigint') {
		return value; // step 1
	}
	if (!$bigIntValueOf) {
		throw new $SyntaxError('BigInt is not supported');
	}
	return $bigIntValueOf(value);
};
