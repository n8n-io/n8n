'use strict';

var callBound = require('call-bind/callBound');

var $SyntaxError = require('es-errors/syntax');
var $bigIntValueOf = callBound('BigInt.prototype.valueOf', true);

var Type = require('./Type');

// https://262.ecma-international.org/11.0/#sec-thisbigintvalue

module.exports = function thisBigIntValue(value) {
	var type = Type(value);
	if (type === 'BigInt') {
		return value;
	}
	if (!$bigIntValueOf) {
		throw new $SyntaxError('BigInt is not supported');
	}
	return $bigIntValueOf(value);
};
