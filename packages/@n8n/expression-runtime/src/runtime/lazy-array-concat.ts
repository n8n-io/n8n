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

/**
 * Same result as the native `concat`. A lazy array is read into a plain array
 * first, because the native `concat` needs far more memory for a Proxy.
 */
function concat(this: unknown, ...items: unknown[]): unknown[] {
	return holdsLazyProxy(this, items)
		? apply(nativeConcat, plainIfSpreadLazyArray(this), plainItems(items))
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
