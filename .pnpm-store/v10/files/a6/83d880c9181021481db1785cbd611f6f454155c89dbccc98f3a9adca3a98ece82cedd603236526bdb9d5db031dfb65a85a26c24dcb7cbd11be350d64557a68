'use strict';

var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bind/callBound');

var $fromCharCode = GetIntrinsic('%String.fromCharCode%');
var $TypeError = require('es-errors/type');
var $charCodeAt = callBound('String.prototype.charCodeAt');
var $push = callBound('Array.prototype.push');

module.exports = function CharacterRange(A, B) {
	if (A.length !== 1 || B.length !== 1) {
		throw new $TypeError('Assertion failed: CharSets A and B contain exactly one character');
	}

	var a = A[0];
	var b = B[0];

	var i = $charCodeAt(a, 0);
	var j = $charCodeAt(b, 0);

	if (!(i <= j)) {
		throw new $TypeError('Assertion failed: i is not <= j');
	}

	var arr = [];
	for (var k = i; k <= j; k += 1) {
		$push(arr, $fromCharCode(k));
	}
	return arr;
};
