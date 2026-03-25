'use strict';

var $gOPD = require('gopd');
var $TypeError = require('es-errors/type');

var every = require('../helpers/every');
var OwnPropertyKeys = require('../helpers/OwnPropertyKeys');

var IsDataDescriptor = require('./IsDataDescriptor');
var IsExtensible = require('./IsExtensible');
var ToPropertyDescriptor = require('./ToPropertyDescriptor');
var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-testintegritylevel

module.exports = function TestIntegrityLevel(O, level) {
	if (Type(O) !== 'Object') {
		throw new $TypeError('Assertion failed: Type(O) is not Object');
	}
	if (level !== 'sealed' && level !== 'frozen') {
		throw new $TypeError('Assertion failed: `level` must be `"sealed"` or `"frozen"`');
	}
	var status = IsExtensible(O);
	if (status) {
		return false;
	}
	var theKeys = OwnPropertyKeys(O);
	return theKeys.length === 0 || every(theKeys, function (k) {
		var currentDesc = $gOPD(O, k);
		if (typeof currentDesc !== 'undefined') {
			if (currentDesc.configurable) {
				return false;
			}
			if (level === 'frozen' && IsDataDescriptor(ToPropertyDescriptor(currentDesc)) && currentDesc.writable) {
				return false;
			}
		}
		return true;
	});
};
