'use strict';

var forEach = require('for-each');
var callBind = require('call-bind');

var typedArrays = require('available-typed-arrays')();

/** @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array} TypedArray */
/** @typedef {(x: TypedArray) => number} ByteOffsetGetter */

/** @type {Object.<typeof typedArrays, ByteOffsetGetter>} */
var getters = {};
var hasProto = require('has-proto')();

var gOPD = require('gopd');
var oDP = Object.defineProperty;
if (gOPD) {
	/** @type {ByteOffsetGetter} */
	var getByteOffset = function (x) {
		return x.byteOffset;
	};
	forEach(typedArrays, function (typedArray) {
		// In Safari 7, Typed Array constructors are typeof object
		if (typeof global[typedArray] === 'function' || typeof global[typedArray] === 'object') {
			var Proto = global[typedArray].prototype;
			// @ts-expect-error TS can't guarantee the callback is invoked sync
			var descriptor = gOPD(Proto, 'byteOffset');
			if (!descriptor && hasProto) {
				// @ts-expect-error hush, TS, every object has a dunder proto
				var superProto = Proto.__proto__; // eslint-disable-line no-proto
				// @ts-expect-error TS can't guarantee the callback is invoked sync
				descriptor = gOPD(superProto, 'byteOffset');
			}
			// Opera 12.16 has a magic byteOffset data property on instances AND on Proto
			if (descriptor && descriptor.get) {
				getters[typedArray] = callBind(descriptor.get);
			} else if (oDP) {
				// this is likely an engine where instances have a magic byteOffset data property
				var arr = new global[typedArray](2);
				// @ts-expect-error TS can't guarantee the callback is invoked sync
				descriptor = gOPD(arr, 'byteOffset');
				if (descriptor && descriptor.configurable) {
					oDP(arr, 'length', { value: 3 });
				}
				if (arr.length === 2) {
					getters[typedArray] = getByteOffset;
				}
			}
		}
	});
}

/** @type {ByteOffsetGetter} */
var tryTypedArrays = function tryAllTypedArrays(value) {
	/** @type {number} */ var foundOffset;
	forEach(getters, /** @type {(getter: ByteOffsetGetter) => void} */ function (getter) {
		if (typeof foundOffset !== 'number') {
			try {
				var offset = getter(value);
				if (typeof offset === 'number') {
					foundOffset = offset;
				}
			} catch (e) {}
		}
	});
	// @ts-expect-error TS can't guarantee the callback is invoked sync
	return foundOffset;
};

var isTypedArray = require('is-typed-array');

/** @type {import('.')} */
module.exports = function typedArrayByteOffset(value) {
	if (!isTypedArray(value)) {
		return false;
	}
	return tryTypedArrays(value);
};
