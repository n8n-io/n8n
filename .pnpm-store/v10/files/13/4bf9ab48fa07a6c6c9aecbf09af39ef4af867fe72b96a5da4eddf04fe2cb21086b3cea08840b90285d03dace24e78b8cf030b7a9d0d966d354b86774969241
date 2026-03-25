'use strict';

var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bind/callBound');

var $RangeError = require('es-errors/range');
var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');
var $BigInt = GetIntrinsic('%BigInt%', true);

var hasOwnProperty = require('./HasOwnProperty');
var IsArray = require('./IsArray');
var IsBigIntElementType = require('./IsBigIntElementType');
var IsUnsignedElementType = require('./IsUnsignedElementType');

var bytesAsFloat32 = require('../helpers/bytesAsFloat32');
var bytesAsFloat64 = require('../helpers/bytesAsFloat64');
var bytesAsInteger = require('../helpers/bytesAsInteger');
var every = require('../helpers/every');
var isByteValue = require('../helpers/isByteValue');

var $reverse = callBound('Array.prototype.reverse');
var $slice = callBound('Array.prototype.slice');

var keys = require('object-keys');

// https://262.ecma-international.org/11.0/#table-the-typedarray-constructors
var TypeToSizes = {
	__proto__: null,
	Int8: 1,
	Uint8: 1,
	Uint8C: 1,
	Int16: 2,
	Uint16: 2,
	Int32: 4,
	Uint32: 4,
	BigInt64: 8,
	BigUint64: 8,
	Float32: 4,
	Float64: 8
};

// https://262.ecma-international.org/11.0/#sec-rawbytestonumeric

module.exports = function RawBytesToNumeric(type, rawBytes, isLittleEndian) {
	if (!hasOwnProperty(TypeToSizes, type)) {
		throw new $TypeError('Assertion failed: `type` must be a TypedArray element type: ' + keys(TypeToSizes));
	}
	if (!IsArray(rawBytes) || !every(rawBytes, isByteValue)) {
		throw new $TypeError('Assertion failed: `rawBytes` must be an Array of bytes');
	}
	if (typeof isLittleEndian !== 'boolean') {
		throw new $TypeError('Assertion failed: `isLittleEndian` must be a Boolean');
	}

	var elementSize = TypeToSizes[type]; // step 1

	if (rawBytes.length !== elementSize) {
		// this assertion is not in the spec, but it'd be an editorial error if it were ever violated
		throw new $RangeError('Assertion failed: `rawBytes` must have a length of ' + elementSize + ' for type ' + type);
	}

	var isBigInt = IsBigIntElementType(type);
	if (isBigInt && !$BigInt) {
		throw new $SyntaxError('this environment does not support BigInts');
	}

	// eslint-disable-next-line no-param-reassign
	rawBytes = $slice(rawBytes, 0, elementSize);
	if (!isLittleEndian) {
		$reverse(rawBytes); // step 2
	}

	if (type === 'Float32') { // step 3
		return bytesAsFloat32(rawBytes);
	}

	if (type === 'Float64') { // step 4
		return bytesAsFloat64(rawBytes);
	}

	return bytesAsInteger(rawBytes, elementSize, IsUnsignedElementType(type), isBigInt);
};
