'use strict';

var $TypeError = require('es-errors/type');

var $getProto = require('../helpers/getProto');

var Type = require('./Type');

// https://262.ecma-international.org/7.0/#sec-ordinarygetprototypeof

module.exports = function OrdinaryGetPrototypeOf(O) {
	if (Type(O) !== 'Object') {
		throw new $TypeError('Assertion failed: O must be an Object');
	}
	if (!$getProto) {
		throw new $TypeError('This environment does not support fetching prototypes.');
	}
	return $getProto(O);
};
