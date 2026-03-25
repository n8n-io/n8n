'use strict';

var GetIntrinsic = require('get-intrinsic');

var $BigInt = GetIntrinsic('%BigInt%', true);
var $RangeError = require('es-errors/range');
var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');

var IsIntegralNumber = require('./IsIntegralNumber');

// https://262.ecma-international.org/12.0/#sec-numbertobigint

module.exports = function NumberToBigInt(number) {
	if (typeof number !== 'number') {
		throw new $TypeError('Assertion failed: `number` must be a String');
	}
	if (!IsIntegralNumber(number)) {
		throw new $RangeError('The number ' + number + ' cannot be converted to a BigInt because it is not an integer');
	}
	if (!$BigInt) {
		throw new $SyntaxError('BigInts are not supported in this environment');
	}
	return $BigInt(number);
};
