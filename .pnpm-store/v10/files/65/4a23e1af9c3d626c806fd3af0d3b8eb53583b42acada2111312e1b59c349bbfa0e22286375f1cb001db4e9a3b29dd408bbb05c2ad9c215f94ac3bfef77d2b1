'use strict';

var $TypeError = require('es-errors/type');

var Invoke = require('./Invoke');
var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-iteratornext

module.exports = function IteratorNext(iterator, value) {
	var result = Invoke(iterator, 'next', arguments.length < 2 ? [] : [value]);
	if (Type(result) !== 'Object') {
		throw new $TypeError('iterator next must return an object');
	}
	return result;
};
