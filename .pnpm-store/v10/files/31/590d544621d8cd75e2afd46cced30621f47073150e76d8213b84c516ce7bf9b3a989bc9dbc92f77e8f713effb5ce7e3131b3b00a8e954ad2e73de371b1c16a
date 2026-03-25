'use strict';

var GetIntrinsic = require('get-intrinsic');
// var isNegativeZero = require('is-negative-zero');

var $pow = GetIntrinsic('%Math.pow%');

var $TypeError = require('es-errors/type');

/*
var abs = require('../../helpers/abs');
var isFinite = require('../../helpers/isFinite');
var isNaN = require('../../helpers/isNaN');

var IsInteger = require('../IsInteger');
*/

// https://262.ecma-international.org/11.0/#sec-numeric-types-number-exponentiate

/* eslint max-lines-per-function: 0, max-statements: 0 */

module.exports = function NumberExponentiate(base, exponent) {
	if (typeof base !== 'number' || typeof exponent !== 'number') {
		throw new $TypeError('Assertion failed: `base` and `exponent` arguments must be Numbers');
	}
	return $pow(base, exponent);
	/*
	if (isNaN(exponent)) {
		return NaN;
	}
	if (exponent === 0) {
		return 1;
	}
	if (isNaN(base)) {
		return NaN;
	}
	var aB = abs(base);
	if (aB > 1 && exponent === Infinity) {
		return Infinity;
	}
	if (aB > 1 && exponent === -Infinity) {
		return 0;
	}
	if (aB === 1 && (exponent === Infinity || exponent === -Infinity)) {
		return NaN;
	}
	if (aB < 1 && exponent === Infinity) {
		return +0;
	}
	if (aB < 1 && exponent === -Infinity) {
		return Infinity;
	}
	if (base === Infinity) {
		return exponent > 0 ? Infinity : 0;
	}
	if (base === -Infinity) {
		var isOdd = true;
		if (exponent > 0) {
			return isOdd ? -Infinity : Infinity;
		}
		return isOdd ? -0 : 0;
	}
	if (exponent > 0) {
		return isNegativeZero(base) ? Infinity : 0;
	}
	if (isNegativeZero(base)) {
		if (exponent > 0) {
			return isOdd ? -0 : 0;
		}
		return isOdd ? -Infinity : Infinity;
	}
	if (base < 0 && isFinite(base) && isFinite(exponent) && !IsInteger(exponent)) {
		return NaN;
	}
	*/
};
