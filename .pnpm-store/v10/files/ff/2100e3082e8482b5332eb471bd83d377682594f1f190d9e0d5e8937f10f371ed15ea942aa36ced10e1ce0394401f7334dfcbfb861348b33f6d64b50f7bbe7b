'use strict';

var SameValueNonNumeric = require('./SameValueNonNumeric');
var Type = require('./Type');
var BigIntEqual = require('./BigInt/equal');
var NumberEqual = require('./Number/equal');

// https://262.ecma-international.org/13.0/#sec-isstrictlyequal

module.exports = function IsStrictlyEqual(x, y) {
	var xType = Type(x);
	var yType = Type(y);
	if (xType !== yType) {
		return false;
	}
	if (xType === 'Number' || xType === 'BigInt') {
		return xType === 'Number' ? NumberEqual(x, y) : BigIntEqual(x, y);
	}
	return SameValueNonNumeric(x, y);
};
