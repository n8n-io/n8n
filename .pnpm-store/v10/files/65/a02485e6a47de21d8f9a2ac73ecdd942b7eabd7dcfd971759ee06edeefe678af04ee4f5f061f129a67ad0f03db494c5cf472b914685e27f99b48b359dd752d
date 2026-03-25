'use strict';

var $TypeError = require('es-errors/type');

var hasOwn = require('hasown');

var IsPropertyKey = require('./IsPropertyKey');
var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-hasownproperty

module.exports = function HasOwnProperty(O, P) {
	if (Type(O) !== 'Object') {
		throw new $TypeError('Assertion failed: `O` must be an Object');
	}
	if (!IsPropertyKey(P)) {
		throw new $TypeError('Assertion failed: `P` must be a Property Key');
	}
	return hasOwn(O, P);
};
