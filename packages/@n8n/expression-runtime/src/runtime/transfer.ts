/**
 * Framing for values that cross the runtime boundary.
 *
 * Results cross by structured clone, which does not carry the prototype of a
 * class instance. A type the host must get back as a real instance goes across
 * as a structured-cloneable marker object instead: a plain object naming its
 * type under `__n8nType`, which the host reads and rebuilds from.
 *
 * This module knows the framing and nothing about any single type. The encoders
 * and the decoders live next to the type they carry, such as `luxon-transfer`.
 *
 * User data can hold the same keys. The escape wrapper below lets the host tell
 * a marker from user data that looks like one.
 */

/** Names the type a marker carries, and marks the object as one of ours. */
export const TRANSFER_TYPE_KEY = '__n8nType';

/** Marks a wrapper whose payload is user data, not a marker. */
export const TRANSFER_ESCAPED_KEY = '__n8nEscaped';

/** Marks an escaped payload the host must return without any walk. */
export const TRANSFER_OPAQUE_KEY = '__n8nOpaque';

/** Holds the payload of an escaped wrapper. */
export const TRANSFER_VALUE_KEY = '__value';

/**
 * Keys that make an object look like our framing.
 *
 * An object with one of these own keys is escaped, so the host reads it as
 * data. The opaque flag is in the set for the same reason. If it were not, user
 * data that holds it would make the host return an object without a walk.
 *
 * One type key covers every marker, so a new type does not grow this set.
 */
export const TRANSFER_FRAMING_KEYS: readonly string[] = [
	TRANSFER_TYPE_KEY,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_OPAQUE_KEY,
];

export interface TransferSentinel {
	[TRANSFER_TYPE_KEY]: string;
}

export interface EscapedTransferValue {
	[TRANSFER_ESCAPED_KEY]: true;
	[TRANSFER_OPAQUE_KEY]?: true;
	[TRANSFER_VALUE_KEY]: unknown;
}

/**
 * Rebuild a real instance from a marker.
 *
 * Only the guest walk writes the type key, and it escapes any user object that
 * carries one, so a decoder only ever sees a type its own encoder wrote.
 */
export type SentinelDecoder = (sentinel: TransferSentinel) => unknown;

/** Give back a sentinel for a value the decoder owns, or nothing for any other. */
export type SentinelEncoder = (value: object) => TransferSentinel | undefined;

function readKey(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined;
	return Reflect.get(value, key);
}

/** The type a marker names, or nothing when the value is not a marker. */
export function transferTypeOf(value: unknown): string | undefined {
	const type = readKey(value, TRANSFER_TYPE_KEY);
	return typeof type === 'string' ? type : undefined;
}

export function isTransferSentinel(value: unknown): value is TransferSentinel {
	return transferTypeOf(value) !== undefined;
}

export function isEscapedTransferValue(value: unknown): value is EscapedTransferValue {
	return readKey(value, TRANSFER_ESCAPED_KEY) === true;
}

/**
 * An escaped wrapper whose payload must be returned as data without any
 * further inspection for markers.
 */
export function isOpaqueTransferValue(value: unknown): boolean {
	return readKey(value, TRANSFER_OPAQUE_KEY) === true;
}

/** Type guard: plain object with Object.prototype or null prototype. */
export function isPlainObject(value: object): value is Record<string, unknown> {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/** Types that structured clone copies with the prototype intact. */
export function isStructuredCloneBuiltin(value: object): boolean {
	return (
		value instanceof Date ||
		value instanceof RegExp ||
		value instanceof Map ||
		value instanceof Set ||
		value instanceof Error ||
		value instanceof Promise ||
		value instanceof ArrayBuffer ||
		ArrayBuffer.isView(value)
	);
}

function unwrapPlainObject(
	value: Record<string, unknown>,
	decode: SentinelDecoder,
	seen: Map<object, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	// Record the result before the walk. A value that refers to itself then
	// resolves to the same object.
	seen.set(value, result);
	for (const key of Object.keys(value)) {
		result[key] = unwrapValue(value[key], decode, seen);
	}
	return result;
}

function unwrapValue(value: unknown, decode: SentinelDecoder, seen: Map<object, unknown>): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
	if (seen.has(value)) return seen.get(value);
	if (Array.isArray(value)) {
		const result: unknown[] = new Array<unknown>(value.length);
		seen.set(value, result);
		// `forEach` steps over the holes of a sparse array, which keeps it sparse.
		value.forEach((item, index) => {
			result[index] = unwrapValue(item, decode, seen);
		});
		return result;
	}
	if (!isPlainObject(value)) return value;
	if (isTransferSentinel(value)) return decode(value);
	if (isEscapedTransferValue(value)) {
		const inner: unknown = value[TRANSFER_VALUE_KEY];
		// An opaque payload is a value the guest could not walk, so nothing in it
		// is our framing. Give it back as it is. A walked payload only had its own
		// keys collide, so the walk goes on below and rebuilds markers deeper in.
		if (isOpaqueTransferValue(value)) return inner;
		if (typeof inner !== 'object' || inner === null) return inner;
		// An array payload is walked as an array. Its own entries carry no framing,
		// so reading it as a marker is never right.
		if (Array.isArray(inner)) return unwrapValue(inner, decode, seen);
		if (!isPlainObject(inner)) return inner;
		return unwrapPlainObject(inner, decode, seen);
	}
	return unwrapPlainObject(value, decode, seen);
}

/**
 * Say whether a value holds anything the walk would rebuild.
 *
 * Reads the same shapes the walk reads and builds nothing, so a result with no
 * marker in it costs a read and no memory. `for...in` over a plain object and
 * an index loop over an array both avoid the key array `Object.keys` returns.
 */
function holdsSentinel(value: unknown, seen: Set<object>): boolean {
	if (value === null || typeof value !== 'object') return false;
	if (seen.has(value)) return false;
	seen.add(value);
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			if (holdsSentinel(value[index], seen)) return true;
		}
		return false;
	}
	if (!isPlainObject(value)) return false;
	if (isTransferSentinel(value) || isEscapedTransferValue(value)) return true;
	for (const key in value) {
		if (holdsSentinel(value[key], seen)) return true;
	}
	return false;
}

/**
 * Rebuild instances from the markers `__prepareForTransfer` emits.
 *
 * Walks the same shapes that function walks: a top-level value, arrays, and
 * plain objects. Other structured-cloneable types are returned untouched.
 * A payload marked opaque is returned as data, without any inspection.
 * Objects already visited are reused, so a graph that repeats or contains
 * itself is walked once.
 *
 * A value that holds no marker is given back as it is. The walk copies every
 * plain object and array it enters, and most results carry no marker at all,
 * so the copy would double what an expression allocates for nothing.
 */
export function unwrapTransferSentinels(value: unknown, decode: SentinelDecoder): unknown {
	if (!holdsSentinel(value, new Set<object>())) return value;
	return unwrapValue(value, decode, new Map<object, unknown>());
}
