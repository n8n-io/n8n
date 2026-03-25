'use strict';

var StrictEqualityComparison = require('./StrictEqualityComparison');
var StringToBigInt = require('./StringToBigInt');
var ToNumber = require('./ToNumber');
var ToPrimitive = require('./ToPrimitive');
var Type = require('./Type');

var isNaN = require('../helpers/isNaN');

// https://262.ecma-international.org/11.0/#sec-abstract-equality-comparison

module.exports = function AbstractEqualityComparison(x, y) {
	var xType = Type(x);
	var yType = Type(y);
	if (xType === yType) {
		return StrictEqualityComparison(x, y);
	}
	if (x == null && y == null) {
		return true;
	}
	if (xType === 'Number' && yType === 'String') {
		return AbstractEqualityComparison(x, ToNumber(y));
	}
	if (xType === 'String' && yType === 'Number') {
		return AbstractEqualityComparison(ToNumber(x), y);
	}
	if (xType === 'BigInt' && yType === 'String') {
		var n = StringToBigInt(y);
		if (isNaN(n)) {
			return false;
		}
		return AbstractEqualityComparison(x, n);
	}
	if (xType === 'String' && yType === 'BigInt') {
		return AbstractEqualityComparison(y, x);
	}
	if (xType === 'Boolean') {
		return AbstractEqualityComparison(ToNumber(x), y);
	}
	if (yType === 'Boolean') {
		return AbstractEqualityComparison(x, ToNumber(y));
	}
	if ((xType === 'String' || xType === 'Number' || xType === 'BigInt' || xType === 'Symbol') && yType === 'Object') {
		return AbstractEqualityComparison(x, ToPrimitive(y));
	}
	if (xType === 'Object' && (yType === 'String' || yType === 'Number' || yType === 'BigInt' || yType === 'Symbol')) {
		return AbstractEqualityComparison(ToPrimitive(x), y);
	}
	if ((xType === 'BigInt' && yType === 'Number') || (xType === 'Number' && yType === 'BigInt')) {
		if (isNaN(x) || isNaN(y) || x === Infinity || y === Infinity || x === -Infinity || y === -Infinity) {
			return false;
		}
		return x == y; // eslint-disable-line eqeqeq
	}
	return false;
};
