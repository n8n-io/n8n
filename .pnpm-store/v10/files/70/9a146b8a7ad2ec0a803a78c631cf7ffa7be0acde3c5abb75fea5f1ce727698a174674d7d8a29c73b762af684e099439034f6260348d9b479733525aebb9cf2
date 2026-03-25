'use strict';

var isFinite = require('../helpers/isFinite');

var IsStrictlyEqual = require('./IsStrictlyEqual');
var StringToBigInt = require('./StringToBigInt');
var ToNumber = require('./ToNumber');
var ToPrimitive = require('./ToPrimitive');
var Type = require('./Type');

// https://262.ecma-international.org/13.0/#sec-islooselyequal

module.exports = function IsLooselyEqual(x, y) {
	var xType = Type(x);
	var yType = Type(y);
	if (xType === yType) {
		return IsStrictlyEqual(x, y);
	}
	if (x == null && y == null) {
		return true;
	}
	if (xType === 'Number' && yType === 'String') {
		return IsLooselyEqual(x, ToNumber(y));
	}
	if (xType === 'String' && yType === 'Number') {
		return IsLooselyEqual(ToNumber(x), y);
	}
	if (xType === 'BigInt' && yType === 'String') {
		var n = StringToBigInt(y);
		if (typeof n === 'undefined') {
			return false;
		}
		return IsLooselyEqual(x, n);
	}
	if (xType === 'String' && yType === 'BigInt') {
		return IsLooselyEqual(y, x);
	}
	if (xType === 'Boolean') {
		return IsLooselyEqual(ToNumber(x), y);
	}
	if (yType === 'Boolean') {
		return IsLooselyEqual(x, ToNumber(y));
	}
	if ((xType === 'String' || xType === 'Number' || xType === 'Symbol' || xType === 'BigInt') && yType === 'Object') {
		return IsLooselyEqual(x, ToPrimitive(y));
	}
	if (xType === 'Object' && (yType === 'String' || yType === 'Number' || yType === 'Symbol' || yType === 'BigInt')) {
		return IsLooselyEqual(ToPrimitive(x), y);
	}
	if ((xType === 'BigInt' && yType === 'Number') || (xType === 'Number' && yType === 'BigInt')) {
		if (!isFinite(x) || !isFinite(y)) {
			return false;
		}
		// eslint-disable-next-line eqeqeq
		return x == y; // shortcut for step 13.b.
	}
	return false;
};
