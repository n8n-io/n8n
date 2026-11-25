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
	create: objectCreate,
	defineProperty,
	entries: objectEntries,
	getOwnPropertyDescriptor,
	getOwnPropertyDescriptors,
	getPrototypeOf,
	hasOwn,
	is: sameValue,
	isExtensible,
	keys: objectKeys,
	prototype: objectPrototype,
} = Object;

export const { isPrototypeOf, toString: objectToString } = objectPrototype;

export const stringPrototype: object = String.prototype;
export const stringValueOf: (this: unknown) => string = String.prototype.valueOf;

export const numberPrototype: object = Number.prototype;
export const numberValueOf: (this: unknown) => number = Number.prototype.valueOf;

export const booleanPrototype: object = Boolean.prototype;
export const booleanValueOf: (this: unknown) => boolean = Boolean.prototype.valueOf;

export const bigIntPrototype: object | undefined =
	typeof BigInt === 'function' ? BigInt.prototype : undefined;
export const bigIntValueOf: ((this: unknown) => bigint) | undefined =
	typeof BigInt === 'function' ? BigInt.prototype.valueOf : undefined;

export const { from: arrayFrom, isArray } = Array;

export const { isView: isArrayBufferView } = ArrayBuffer;

export const { isInteger } = Number;

export const { apply: reflectApply, get: reflectGet } = Reflect;
