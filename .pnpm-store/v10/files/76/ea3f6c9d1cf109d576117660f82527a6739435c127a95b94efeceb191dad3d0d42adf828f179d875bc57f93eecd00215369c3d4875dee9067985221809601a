'use strict';

var GetIntrinsic = require('get-intrinsic');

var $ArrayPrototype = GetIntrinsic('%Array.prototype%');
var $RangeError = require('es-errors/range');
var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');

var isInteger = require('../helpers/isInteger');

var MAX_ARRAY_LENGTH = Math.pow(2, 32) - 1;

var hasProto = require('has-proto')();

var $setProto = GetIntrinsic('%Object.setPrototypeOf%', true) || (
	hasProto
		? function (O, proto) {
			O.__proto__ = proto; // eslint-disable-line no-proto, no-param-reassign
			return O;
		}
		: null
);

// https://262.ecma-international.org/12.0/#sec-arraycreate

module.exports = function ArrayCreate(length) {
	if (!isInteger(length) || length < 0) {
		throw new $TypeError('Assertion failed: `length` must be an integer Number >= 0');
	}
	if (length > MAX_ARRAY_LENGTH) {
		throw new $RangeError('length is greater than (2**32 - 1)');
	}
	var proto = arguments.length > 1 ? arguments[1] : $ArrayPrototype;
	var A = []; // steps 3, 5
	if (proto !== $ArrayPrototype) { // step 4
		if (!$setProto) {
			throw new $SyntaxError('ArrayCreate: a `proto` argument that is not `Array.prototype` is not supported in an environment that does not support setting the [[Prototype]]');
		}
		$setProto(A, proto);
	}
	if (length !== 0) { // bypasses the need for step 6
		A.length = length;
	}
	/* step 6, the above as a shortcut for the below
	OrdinaryDefineOwnProperty(A, 'length', {
		'[[Configurable]]': false,
		'[[Enumerable]]': false,
		'[[Value]]': length,
		'[[Writable]]': true
	});
	*/
	return A;
};
