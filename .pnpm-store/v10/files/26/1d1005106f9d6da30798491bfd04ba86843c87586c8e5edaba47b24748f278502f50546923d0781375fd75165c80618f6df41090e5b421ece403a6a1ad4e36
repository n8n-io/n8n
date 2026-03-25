'use strict';

var $TypeError = require('es-errors/type');

var keys = require('object-keys');

var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-enumerableownnames

module.exports = function EnumerableOwnNames(O) {
	if (Type(O) !== 'Object') {
		throw new $TypeError('Assertion failed: Type(O) is not Object');
	}

	return keys(O);
};
