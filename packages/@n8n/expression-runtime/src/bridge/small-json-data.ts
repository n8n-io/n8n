import { defineOwnValue, isPlainObject, TRANSFER_FRAMING_KEYS } from '../runtime/transfer';

/** Deeper data stays lazy, so a batch never sends a deeply nested value. */
const MAX_DEPTH = 16;

/** The characters counted for each value, on top of the length of a string. */
const NODE_CHARS = 8;

/** The characters that a walk can still accept. */
interface CharBudget {
	remaining: number;
}

function spend(budget: CharBudget, chars: number): boolean {
	budget.remaining -= chars;
	return budget.remaining >= 0;
}

/** JSON turns a non-finite number into null and drops the sign of -0. */
function isJsonNumber(value: unknown): boolean {
	return Number.isFinite(value) && !Object.is(value, -0);
}

/** The result of a walk for a value that is not small JSON data. */
const NOT_SMALL = Symbol('not small');

function copyOfSmallJsonValue(
	value: unknown,
	budget: CharBudget,
	depth: number,
): unknown | typeof NOT_SMALL {
	if (typeof value === 'string') {
		return spend(budget, value.length + NODE_CHARS) ? value : NOT_SMALL;
	}
	if (value === null || typeof value === 'boolean' || isJsonNumber(value)) {
		return spend(budget, NODE_CHARS) ? value : NOT_SMALL;
	}
	return typeof value === 'object' &&
		value !== null &&
		depth < MAX_DEPTH &&
		spend(budget, NODE_CHARS)
		? copyOfSmallJsonContainer(value, budget, depth + 1)
		: NOT_SMALL;
}

/**
 * The copy of the value that a key reads as, when the key is an enumerable data
 * property that holds small JSON data. An accessor is never called.
 */
function copyOfSmallJsonChild(
	container: object,
	key: string | symbol,
	budget: CharBudget,
	depth: number,
): unknown | typeof NOT_SMALL {
	const descriptor = Object.getOwnPropertyDescriptor(container, key);
	return typeof key === 'string' && descriptor?.enumerable === true && 'value' in descriptor
		? copyOfSmallJsonValue((container as Record<string, unknown>)[key], budget, depth)
		: NOT_SMALL;
}

/** NOT_SMALL for an array subclass, and for an array with a hole, a named key or a hidden key. */
function copyOfSmallJsonArray(
	value: unknown[],
	budget: CharBudget,
	depth: number,
): unknown[] | typeof NOT_SMALL {
	// Checked before the keys are listed, so a long array costs nothing.
	if (
		Object.getPrototypeOf(value) !== Array.prototype ||
		value.length * NODE_CHARS > budget.remaining
	) {
		return NOT_SMALL;
	}
	const keys = Object.keys(value);
	// The own keys of a plain array are its indices and `length`.
	if (keys.length !== value.length || Reflect.ownKeys(value).length !== value.length + 1) {
		return NOT_SMALL;
	}
	const copy: unknown[] = [];
	for (let index = 0; index < keys.length; index++) {
		// A hole and a named key together keep the two counts right.
		const item =
			keys[index] === String(index)
				? copyOfSmallJsonChild(value, keys[index], budget, depth)
				: NOT_SMALL;
		if (item === NOT_SMALL) {
			return NOT_SMALL;
		}
		copy.push(item);
	}
	return copy;
}

/**
 * Set a field of a copy. A key that the prototype of the copy also has is
 * defined, because an assignment to it can run code of the prototype.
 */
function setCopyField(copy: Record<string, unknown>, key: string, value: unknown): void {
	if (key in copy) {
		defineOwnValue(copy, key, value);
	} else {
		copy[key] = value;
	}
}

function copyOfSmallJsonContainer(
	value: object,
	budget: CharBudget,
	depth: number,
): unknown | typeof NOT_SMALL {
	if (Array.isArray(value)) {
		return copyOfSmallJsonArray(value, budget, depth);
	}
	if (!isPlainObject(value)) {
		return NOT_SMALL;
	}
	const copy: Record<string, unknown> = {};
	for (const key of Reflect.ownKeys(value)) {
		const field =
			typeof key === 'string' && !TRANSFER_FRAMING_KEYS.includes(key) && spend(budget, key.length)
				? copyOfSmallJsonChild(value, key, budget, depth)
				: NOT_SMALL;
		if (field === NOT_SMALL) {
			return NOT_SMALL;
		}
		setCopyField(copy, key as string, field);
	}
	return copy;
}

/** A copy of small JSON data, and the characters that its walk counted. */
export interface SmallJsonCopy {
	/**
	 * Holds only plain objects, arrays, and JSON primitives. Undefined when the
	 * value is not small JSON data.
	 */
	copy: unknown;
	/**
	 * The characters that the walk counted, at most `maxChars`. See NODE_CHARS.
	 * For a value that is not small JSON data, the count until the walk stopped.
	 * It leaves out the work to list the keys of an object, so a charge of it
	 * limits repeated walks but does not bound the work.
	 */
	chars: number;
}

/**
 * A copy of a value, when JSON carries the value without loss in at most
 * `maxChars` characters. The copy holds what each key reads as, in plain objects
 * and arrays, so it never holds a host proxy.
 *
 * No copy for data that holds undefined, a non-finite number, -0, a Date, a class
 * instance, an array subclass, a function, an accessor, a symbol key, a key that
 * is not enumerable, a sparse or keyed array, a framing key, or more than
 * MAX_DEPTH levels. No copy when a proxy trap throws.
 */
export function smallJsonCopy(value: unknown, maxChars: number): SmallJsonCopy {
	const budget = { remaining: maxChars };
	let copy: unknown;
	try {
		copy = copyOfSmallJsonValue(value, budget, 0);
	} catch {
		copy = NOT_SMALL;
	}
	// The spend that stops a walk can go past the limit by a whole string.
	const chars = Math.min(maxChars, maxChars - budget.remaining);
	return { copy: copy === NOT_SMALL ? undefined : copy, chars };
}
