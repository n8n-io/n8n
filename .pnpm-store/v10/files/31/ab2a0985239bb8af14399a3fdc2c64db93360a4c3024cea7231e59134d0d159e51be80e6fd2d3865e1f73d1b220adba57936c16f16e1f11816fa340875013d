'use strict';

var GetIntrinsic = require('get-intrinsic');

var $Number = GetIntrinsic('%Number%');
var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');

var IsIntegralNumber = require('./IsIntegralNumber');
var substring = require('./substring');

var isNaN = require('../helpers/isNaN');

// https://262.ecma-international.org/14.0/#sec-parsehexoctet

module.exports = function ParseHexOctet(string, position) {
	if (typeof string !== 'string') {
		throw new $TypeError('Assertion failed: `string` must be a String');
	}
	if (!IsIntegralNumber(position) || position < 0) {
		throw new $TypeError('Assertion failed: `position` must be a nonnegative integer');
	}

	var len = string.length; // step 1
	if ((position + 2) > len) { // step 2
		var error = new $SyntaxError('requested a position on a string that does not contain 2 characters at that position'); // step 2.a
		return [error]; // step 2.b
	}
	var hexDigits = substring(string, position, position + 2); // step 3

	var n = $Number('0x' + hexDigits);
	if (isNaN(n)) {
		return [new $SyntaxError('Invalid hexadecimal characters')];
	}
	return n;

	/*
	4. Let _parseResult_ be ParseText(StringToCodePoints(_hexDigits_), |HexDigits[~Sep]|).
    5. If _parseResult_ is not a Parse Node, return _parseResult_.
    6. Let _n_ be the unsigned 8-bit value corresponding with the MV of _parseResult_.
    7. Return _n_.
    */
};
