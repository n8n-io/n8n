'use strict';

var MAX_SAFE_INTEGER = require('../helpers/maxSafeInteger');

var ToIntegerOrInfinity = require('./ToIntegerOrInfinity');

module.exports = function ToLength(argument) {
	var len = ToIntegerOrInfinity(argument);
	if (len <= 0) { return 0; } // includes converting -0 to +0
	if (len > MAX_SAFE_INTEGER) { return MAX_SAFE_INTEGER; }
	return len;
};
