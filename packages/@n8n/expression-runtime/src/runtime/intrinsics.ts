/**
 * Built-ins the runtime reads to move values between the host and an
 * expression, kept when the runtime loads.
 *
 * An expression can replace a built-in, and the context lives for the whole
 * execution. The runtime reads these references, so a replaced built-in does
 * not change how the next expression reads or returns its values.
 */
export const {
	assign,
	defineProperty,
	entries: objectEntries,
	getOwnPropertyDescriptor,
	getOwnPropertyDescriptors,
	getPrototypeOf,
	hasOwn,
	is: sameValue,
	keys: objectKeys,
} = Object;

export const { from: arrayFrom, isArray } = Array;

export const { isView: isArrayBufferView } = ArrayBuffer;

export const { isInteger } = Number;

export const { get: reflectGet } = Reflect;
