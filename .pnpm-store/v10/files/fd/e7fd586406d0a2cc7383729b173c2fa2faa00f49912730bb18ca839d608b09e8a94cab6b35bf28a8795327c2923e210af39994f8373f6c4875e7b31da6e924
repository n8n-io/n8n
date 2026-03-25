'use strict';

var SameValueNonNumber = require('./SameValueNonNumber');
var Type = require('./Type');
var NumberEqual = require('./Number/equal');

// https://262.ecma-international.org/14.0/#sec-isstrictlyequal

module.exports = function IsStrictlyEqual(x, y) {
	var xType = Type(x);
	var yType = Type(y);
	if (xType !== yType) {
		return false;
	}
	return xType === 'Number' ? NumberEqual(x, y) : SameValueNonNumber(x, y);
};
