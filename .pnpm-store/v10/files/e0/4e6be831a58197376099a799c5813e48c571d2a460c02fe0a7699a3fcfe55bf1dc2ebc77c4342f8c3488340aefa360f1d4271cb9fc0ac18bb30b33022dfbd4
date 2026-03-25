'use strict';

var $TypeError = require('es-errors/type');

var Get = require('./Get');
var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-iteratorvalue

module.exports = function IteratorValue(iterResult) {
	if (Type(iterResult) !== 'Object') {
		throw new $TypeError('Assertion failed: Type(iterResult) is not Object');
	}
	return Get(iterResult, 'value');
};

