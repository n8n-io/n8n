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

/** How `concat` adds a value to its result. `other` is a spread value that is not an array. */
type OperandKind = 'spread' | 'single' | 'other';

function operandKindOf(value: unknown): OperandKind {
	if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
		return 'single';
	}
	const spreadable: unknown = reflectGet(value, Symbol.isConcatSpreadable);
	if (spreadable === undefined) {
		return isArray(value) ? 'spread' : 'single';
	}
	if (!spreadable) {
		return 'single';
	}
	return isArray(value) ? 'spread' : 'other';
}

/** The receiver and the items, each with how `concat` adds it. Undefined when one is `other`. */
function operandsOf(
	receiver: unknown,
	items: unknown[],
): Array<{ value: unknown; kind: OperandKind }> | undefined {
	const operands: Array<{ value: unknown; kind: OperandKind }> = [];
	let isSupported = true;
	for (let index = -1; isSupported && index < items.length; index++) {
		const value = index === -1 ? receiver : items[index];
		const kind = operandKindOf(value);
		isSupported = kind !== 'other';
		operands[operands.length] = { value, kind };
	}
	return isSupported ? operands : undefined;
}

/**
 * The result of `concat` for arrays and single values, with the holes of each
 * array. The result gets its full length first. The native `concat` needs far
 * more memory after an expression sets `Symbol.isConcatSpreadable` on an array.
 */
function mergeOperands(operands: Array<{ value: unknown; kind: OperandKind }>): unknown[] {
	let total = 0;
	for (let index = 0; index < operands.length; index++) {
		const { value, kind } = operands[index];
		total += kind === 'spread' ? (value as unknown[]).length : 1;
	}
	const result = new NativeArray<unknown>(total);
	let offset = 0;
	for (let index = 0; index < operands.length; index++) {
		const { value, kind } = operands[index];
		if (kind === 'spread') {
			const array = value as unknown[];
			const { length } = array;
			for (let item = 0; item < length; item++) {
				if (item in array) {
					result[offset + item] = array[item];
				}
			}
			offset += length;
		} else {
			result[offset++] = value;
		}
	}
	return result;
}

/** `concat` with a lazy array. Lazy arrays are read with index reads, not by the native `concat`. */
function concatWithLazyArray(receiver: unknown, items: unknown[]): unknown[] {
	const operands = givesPlainArray(receiver) ? operandsOf(receiver, items) : undefined;
	return operands !== undefined
		? mergeOperands(operands)
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
