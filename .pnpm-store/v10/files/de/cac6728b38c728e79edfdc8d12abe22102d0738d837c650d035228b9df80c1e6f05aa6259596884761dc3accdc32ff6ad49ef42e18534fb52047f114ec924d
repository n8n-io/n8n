'use strict';

var $TypeError = require('es-errors/type');

var callBound = require('call-bind/callBound');

var $indexOf = callBound('String.prototype.indexOf');

var IsArray = require('./IsArray');
var WordCharacters = require('./WordCharacters');

var every = require('../helpers/every');
var isInteger = require('../helpers/isInteger');
var isRegExpRecord = require('../helpers/records/regexp-record');

var isChar = function isChar(c) {
	return typeof c === 'string';
};

// https://262.ecma-international.org/14.0/#sec-runtime-semantics-iswordchar-abstract-operation

// note: prior to ES2023, this AO erroneously omitted the latter of its arguments.
module.exports = function IsWordChar(rer, Input, e) {
	if (!isRegExpRecord(rer)) {
		throw new $TypeError('Assertion failed: `rer` must be a RegExp Record');
	}
	if (!IsArray(Input) || !every(Input, isChar)) {
		throw new $TypeError('Assertion failed: `Input` must be a List of characters');
	}

	if (!isInteger(e)) {
		throw new $TypeError('Assertion failed: `e` must be an integer');
	}

	var InputLength = Input.length; // step 1

	if (e === -1 || e === InputLength) {
		return false; // step 2
	}

	var c = Input[e]; // step 3

	return $indexOf(WordCharacters(rer), c) > -1; // steps 4-5
};
