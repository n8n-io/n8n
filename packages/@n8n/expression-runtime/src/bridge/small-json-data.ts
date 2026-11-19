import { isPlainObject, TRANSFER_FRAMING_KEYS } from '../runtime/transfer';

/** Deeper data stays lazy, so a host call never sends a deeply nested value. */
const MAX_DEPTH = 16;

/** The characters counted for a value that is not a string, and for each container. */
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

function isSmallJsonValue(value: unknown, budget: CharBudget, depth: number): boolean {
	if (typeof value === 'string') {
		return spend(budget, value.length + NODE_CHARS);
	}
	if (value === null || typeof value === 'boolean' || isJsonNumber(value)) {
		return spend(budget, NODE_CHARS);
	}
	return (
		typeof value === 'object' &&
		value !== null &&
		depth < MAX_DEPTH &&
		spend(budget, NODE_CHARS) &&
		isSmallJsonContainer(value, budget, depth + 1)
	);
}

/** Say whether a key holds small JSON data in an enumerable data property. An accessor is never called. */
function isSmallJsonChild(
	container: object,
	key: string | symbol,
	budget: CharBudget,
	depth: number,
): boolean {
	const descriptor = Object.getOwnPropertyDescriptor(container, key);
	return (
		typeof key === 'string' &&
		descriptor?.enumerable === true &&
		'value' in descriptor &&
		isSmallJsonValue(descriptor.value, budget, depth)
	);
}

/** False for an array subclass, and for an array with a hole, a named key or a hidden key. */
function isSmallJsonArray(value: unknown[], budget: CharBudget, depth: number): boolean {
	// Checked before the keys are listed, so a long array costs nothing.
	if (
		Object.getPrototypeOf(value) !== Array.prototype ||
		value.length * NODE_CHARS > budget.remaining
	) {
		return false;
	}
	const keys = Object.keys(value);
	return (
		keys.length === value.length &&
		// The own keys of a plain array are its indices and `length`.
		Reflect.ownKeys(value).length === value.length + 1 &&
		// A hole and a named key together keep the two counts right.
		keys.every((key, index) => key === String(index) && isSmallJsonChild(value, key, budget, depth))
	);
}

function isSmallJsonContainer(value: object, budget: CharBudget, depth: number): boolean {
	if (Array.isArray(value)) {
		return isSmallJsonArray(value, budget, depth);
	}
	return (
		isPlainObject(value) &&
		Reflect.ownKeys(value).every(
			(key) =>
				typeof key === 'string' &&
				!TRANSFER_FRAMING_KEYS.includes(key) &&
				spend(budget, key.length) &&
				isSmallJsonChild(value, key, budget, depth),
		)
	);
}

/**
 * Say whether a value is an array or a plain object that JSON carries without
 * loss, in at most `maxChars` characters of keys and values.
 *
 * False for data that holds undefined, a non-finite number, -0, a Date, a class
 * instance, an array subclass, a function, an accessor, a symbol key, a key that
 * is not enumerable, a sparse or keyed array, a framing key, or more than
 * MAX_DEPTH levels. False when a proxy trap throws.
 */
export function isSmallJsonData(value: unknown, maxChars: number): value is object {
	if (maxChars <= 0 || typeof value !== 'object' || value === null) {
		return false;
	}
	try {
		return isSmallJsonContainer(value, { remaining: maxChars }, 1);
	} catch {
		return false;
	}
}
