import { defineProperty, isArray, reflectGet } from './intrinsics';
import { isLazyProxy } from './lazy-proxy';

const NativeArray = Array;

const nativeConcat = Array.prototype.concat;

const { apply } = Reflect;

/** Say whether `concat` spreads an array that has this `Symbol.isConcatSpreadable` value. */
function spreadsArray(spreadable: unknown): boolean {
	return spreadable === undefined || !!spreadable;
}

/** Say whether `concat` spreads the value and the value is a lazy array. */
function isSpreadLazyArray(value: unknown): value is unknown[] {
	return (
		isLazyProxy(value) &&
		isArray(value) &&
		spreadsArray(reflectGet(value, Symbol.isConcatSpreadable))
	);
}

/** Say whether the receiver or an item is a lazy proxy. */
function holdsLazyProxy(receiver: unknown, items: unknown[]): boolean {
	let found = isLazyProxy(receiver);
	for (let index = 0; !found && index < items.length; index++) {
		found = isLazyProxy(items[index]);
	}
	return found;
}

/** Give the plain array the constructor of the lazy array. `concat` creates its result from it. */
function keepConstructor(plain: unknown[], lazyArray: unknown[]): void {
	const { constructor } = lazyArray;
	if (constructor !== NativeArray) {
		defineProperty(plain, 'constructor', {
			value: constructor,
			writable: true,
			enumerable: false,
			configurable: true,
		});
	}
}

/** A plain array with the elements, the holes and the constructor of a lazy array. */
function toPlainArray(lazyArray: unknown[]): unknown[] {
	const { length } = lazyArray;
	const plain: unknown[] = [];
	for (let index = 0; index < length; index++) {
		if (index in lazyArray) {
			plain[index] = lazyArray[index];
		}
	}
	plain.length = length;
	keepConstructor(plain, lazyArray);
	return plain;
}

function plainIfSpreadLazyArray(value: unknown): unknown {
	return isSpreadLazyArray(value) ? toPlainArray(value) : value;
}

function plainItems(items: unknown[]): unknown[] {
	for (let index = 0; index < items.length; index++) {
		items[index] = plainIfSpreadLazyArray(items[index]);
	}
	return items;
}

/** Say whether `concat` creates a plain `Array` for this receiver. */
function givesPlainArray(receiver: unknown): receiver is unknown[] {
	return (
		isArray(receiver) &&
		receiver.constructor === NativeArray &&
		reflectGet(NativeArray, Symbol.species) === NativeArray
	);
}

/** Say whether `concat` spreads the value. The rule is the rule of the native `concat`. */
function isSpread(value: unknown): value is Record<number, unknown> {
	let spread = false;
	if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
		const spreadable: unknown = reflectGet(value, Symbol.isConcatSpreadable);
		spread = spreadable === undefined ? isArray(value) : !!spreadable;
	}
	return spread;
}

const MAX_LENGTH = 2 ** 53 - 1;

/** The length that the native `concat` reads from a spread value: an integer from 0 to 2^53 - 1. */
function spreadLengthOf(value: object): number {
	const length = +(reflectGet(value, 'length') as number);
	let result = 0;
	if (length > 0) {
		result = length >= MAX_LENGTH ? MAX_LENGTH : length - (length % 1);
	}
	return result;
}

/**
 * The result of `concat` as a plain array, with the holes of each spread value.
 * Each value is examined, then read, before the next value, as the native
 * `concat` does. The native `concat` needs far more memory after an expression
 * sets `Symbol.isConcatSpreadable` on an array.
 */
function mergeOperands(receiver: unknown, items: unknown[]): unknown[] {
	const result: unknown[] = [];
	let offset = 0;
	for (let index = -1; index < items.length; index++) {
		const value = index === -1 ? receiver : items[index];
		if (isSpread(value)) {
			const length = spreadLengthOf(value);
			for (let item = 0; item < length; item++) {
				if (item in value) {
					result[offset + item] = value[item];
				}
			}
			offset += length;
		} else {
			result[offset++] = value;
		}
	}
	if (result.length !== offset) {
		result.length = offset;
	}
	return result;
}

/** `concat` with a lazy array. Lazy arrays are read with index reads, not by the native `concat`. */
function concatWithLazyArray(receiver: unknown, items: unknown[]): unknown[] {
	return givesPlainArray(receiver)
		? mergeOperands(receiver, items)
		: apply(nativeConcat, plainIfSpreadLazyArray(receiver), plainItems(items));
}

/**
 * Same result as the native `concat`. A lazy array is not given to the native
 * `concat`, because the native `concat` needs far more memory for a Proxy.
 */
function concat(this: unknown, ...items: unknown[]): unknown[] {
	return holdsLazyProxy(this, items)
		? concatWithLazyArray(this, items)
		: apply(nativeConcat, this, items);
}

defineProperty(concat, 'length', { value: nativeConcat.length, configurable: true });
defineProperty(concat, 'name', { value: nativeConcat.name, configurable: true });

/** Replace `Array.prototype.concat` with a version that reads lazy arrays into plain arrays. */
export function installLazyArrayConcat(): void {
	defineProperty(Array.prototype, 'concat', {
		value: concat,
		writable: true,
		enumerable: false,
		configurable: true,
	});
}
