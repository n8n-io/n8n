'use strict';

var EncodeForRegExpEscape = require('./aos/EncodeForRegExpEscape');
var NumberToString = require('es-abstract/2024/Number/toString');
var StringToCodePoints = require('es-abstract/2024/StringToCodePoints');

var regexTester = require('safe-regex-test');
var forEach = require('for-each');

var $TypeError = require('es-errors/type');

var isDecimalDigitOrASCIILetter = regexTester(/^[\da-zA-Z]$/);

var callBound = require('call-bind/callBound');

var $charCodeAt = callBound('String.prototype.charCodeAt');
var codePointStringToNum = function codePointStringToNumber(c) {
	var first = $charCodeAt(c, 0);
	if (first < 0xD800 || first > 0xDBFF || c.length === 1) {
		return first;
	}
	var second = $charCodeAt(c, 1);
	if (second < 0xDC00 || second > 0xDFFF) {
		return first;
	}
	return ((first - 0xD800) * 1024) + (second - 0xDC00) + 0x10000;
};

module.exports = function escape(S) {
	if (typeof S !== 'string') {
		throw new $TypeError('`S` must be a String'); // step 1
	}

	var escaped = ''; // step 2

	var cpList = StringToCodePoints(S); // step 3

	forEach(cpList, function (c) { // step 4
		if (escaped === '' && isDecimalDigitOrASCIILetter(c)) { // step 4.a
			var hex = NumberToString(codePointStringToNum(c), 16); // step 4.a.iii

			escaped += '\\x' + hex; // step 4.a.v
		} else { // step 4.b
			escaped += EncodeForRegExpEscape(codePointStringToNum(c)); // step 4.b.i
		}
	});

	return escaped; // step 5
};
