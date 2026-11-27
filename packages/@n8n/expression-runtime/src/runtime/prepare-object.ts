import { errorToSentinel } from './error-transfer';
import { isArray, objectKeys } from './intrinsics';
import { encodeLuxonValue } from './luxon-transfer';
import type { SentinelEncoder } from './transfer';
import {
	defineOwnValue,
	isPlainObject,
	isStructuredCloneBuiltin,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_VALUE_KEY,
} from './transfer';

/**
 * The types that go across as a marker. Each encoder claims the values it owns
 * and passes on every other, so a new type is one entry here.
 */
const ENCODERS: SentinelEncoder[] = [encodeLuxonValue];

function encode(value: object): object | undefined {
	for (let i = 0; i < ENCODERS.length; i++) {
		const sentinel = ENCODERS[i](value);
		if (sentinel !== undefined) return sentinel;
	}
	return undefined;
}

/**
 * Copy an array, and keep its holes. Reads only the length and the indexes,
 * so user code cannot change how the copy is made.
 */
function copyArray(value: unknown[], prepareChild: (child: unknown) => unknown): unknown[] {
	const length = value.length;
	// Fill from an empty array. A result with no holes then stays a packed array.
	const result: unknown[] = [];
	for (let i = 0; i < length; i++) {
		if (i in value) {
			result[i] = prepareChild(value[i]);
		}
	}
	if (result.length !== length) {
		result.length = length;
	}
	return result;
}

export function prepareObject(value: object, prepareChild: (child: unknown) => unknown): unknown {
	const sentinel = encode(value);
	if (sentinel !== undefined) return sentinel;

	if (value instanceof Error) {
		return errorToSentinel(value, prepareChild);
	}

	if (isArray(value)) {
		return copyArray(value, prepareChild);
	}

	if (!isPlainObject(value)) {
		if (isStructuredCloneBuiltin(value)) return value;
		// A class instance the host cannot rebuild. Structured clone flattens its
		// prototype away, so a marker key on it would read as one of ours. Mark it
		// opaque, and the host gives the contents back as data.
		return {
			[TRANSFER_ESCAPED_KEY]: true,
			[TRANSFER_OPAQUE_KEY]: true,
			[TRANSFER_VALUE_KEY]: value,
		};
	}

	const result: Record<string, unknown> = {};
	let collides = false;
	const keys = objectKeys(value);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (TRANSFER_FRAMING_KEYS.includes(key)) collides = true;
		defineOwnValue(result, key, prepareChild(value[key]));
	}
	// User data can hold the same keys as our framing. Escape such an object, so
	// the host reads the object itself as data but still walks what is inside it.
	return collides ? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: result } : result;
}
