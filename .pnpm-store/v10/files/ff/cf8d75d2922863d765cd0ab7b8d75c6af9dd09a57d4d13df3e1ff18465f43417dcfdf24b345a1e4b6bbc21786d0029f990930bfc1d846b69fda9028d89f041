'use strict';

var $TypeError = require('es-errors/type');

var inspect = require('object-inspect');

var IsPropertyKey = require('./IsPropertyKey');
// var ToObject = require('./ToObject');

// https://262.ecma-international.org/6.0/#sec-getv

module.exports = function GetV(V, P) {
	// 7.3.2.1
	if (!IsPropertyKey(P)) {
		throw new $TypeError('Assertion failed: IsPropertyKey(P) is not true, got ' + inspect(P));
	}

	// 7.3.2.2-3
	// var O = ToObject(V);

	// 7.3.2.4
	return V[P];
};
