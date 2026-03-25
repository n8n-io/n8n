'use strict';

var $TypeError = require('es-errors/type');

var IsDetachedBuffer = require('./IsDetachedBuffer');
var TypedArrayElementSize = require('./TypedArrayElementSize');

var isTypedArrayWithBufferWitnessRecord = require('../helpers/records/typed-array-with-buffer-witness-record');

var typedArrayBuffer = require('typed-array-buffer');
var typedArrayByteOffset = require('typed-array-byte-offset');
var typedArrayLength = require('typed-array-length');

// https://tc39.es/ecma262/#sec-istypedarrayoutofbounds

module.exports = function IsTypedArrayOutOfBounds(taRecord) {
	if (!isTypedArrayWithBufferWitnessRecord(taRecord)) {
		throw new $TypeError('Assertion failed: `taRecord` must be a TypedArray With Buffer Witness Record');
	}

	var O = taRecord['[[Object]]']; // step 1

	var bufferByteLength = taRecord['[[CachedBufferByteLength]]']; // step 2

	if (IsDetachedBuffer(typedArrayBuffer(O)) && bufferByteLength !== 'DETACHED') {
		throw new $TypeError('Assertion failed: typed array is detached only if the byte length is ~DETACHED~'); // step 3
	}

	if (bufferByteLength === 'DETACHED') {
		return true; // step 4
	}

	var byteOffsetStart = typedArrayByteOffset(O); // step 5

	var byteOffsetEnd;
	var length = typedArrayLength(O);
	// TODO: probably use package for array length
	// seems to apply when TA is backed by a resizable/growable AB
	if (length === 'AUTO') { // step 6
		byteOffsetEnd = bufferByteLength; // step 6.a
	} else {
		var elementSize = TypedArrayElementSize(O); // step 7.a

		byteOffsetEnd = byteOffsetStart + (length * elementSize); // step 7.b
	}

	if (byteOffsetStart > bufferByteLength || byteOffsetEnd > bufferByteLength) {
		return true; // step 8
	}

	// 9. NOTE: 0-length TypedArrays are not considered out-of-bounds.

	return false; // step 10
};
