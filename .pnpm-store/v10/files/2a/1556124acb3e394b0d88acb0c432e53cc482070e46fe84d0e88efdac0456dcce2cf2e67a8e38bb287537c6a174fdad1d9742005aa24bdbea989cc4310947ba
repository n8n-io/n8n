'use strict';

var callBound = require('call-bind/callBound');

var $PromiseThen = callBound('Promise.prototype.then', true);

var Type = require('./Type');

// https://262.ecma-international.org/6.0/#sec-ispromise

module.exports = function IsPromise(x) {
	if (Type(x) !== 'Object') {
		return false;
	}
	if (!$PromiseThen) { // Promises are not supported
		return false;
	}
	try {
		$PromiseThen(x); // throws if not a promise
	} catch (e) {
		return false;
	}
	return true;
};
