'use strict';

var KeyForSymbol = require('./KeyForSymbol');
var Type = require('./Type');

// https://262.ecma-international.org/14.0/#sec-canbeheldweakly

module.exports = function CanBeHeldWeakly(v) {
	if (Type(v) === 'Object') {
		return true; // step 1
	}
	if (typeof v === 'symbol' && typeof KeyForSymbol(v) === 'undefined') {
		return true; // step 2
	}
	return false; // step 3
};
