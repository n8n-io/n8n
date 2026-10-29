import { errorToSentinel } from '../runtime/error-transfer';
import { HOST_VALUE_TYPE } from '../runtime/transfer-codec';
import type { ObjectWalk } from '../runtime/transfer';
import {
	defineOwnValue,
	encodeOnce,
	isPlainObject,
	isStructuredCloneBuiltin,
	newObjectWalk,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_TYPE_KEY,
	TRANSFER_VALUE_KEY,
} from '../runtime/transfer';

interface Walk extends ObjectWalk {
	insideError: boolean;
}

function isObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null;
}

/** The objects the walks go into. Any other object goes across as it is. */
function isWalked(value: object): boolean {
	return Array.isArray(value) || isPlainObject(value) || value instanceof Error;
}

/**
 * Say whether a value holds an Error in the arrays and plain objects it is
 * made of. It runs on each host call result, so it reads the keys in place.
 */
function holdsError(value: unknown, seen: Set<object>): boolean {
	if (isObject(value) && !seen.has(value)) {
		seen.add(value);
		return value instanceof Error || childHoldsError(value, seen);
	}
	return false;
}

function childHoldsError(value: object, seen: Set<object>): boolean {
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			if (holdsError(value[index], seen)) {
				return true;
			}
		}
	} else if (isPlainObject(value)) {
		for (const key in value) {
			if (holdsError(value[key], seen)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * User data can hold the same keys as our framing. Such an object is escaped,
 * so the guest reads the object itself as data but still walks what is inside it.
 */
function encodeRecord(object: object, walk: Walk): unknown {
	const result: Record<string, unknown> = {};
	const entries = Object.entries(object).filter(([, value]) => typeof value !== 'function');
	entries.forEach(([key, value]) => defineOwnValue(result, key, encodeForGuest(value, walk)));
	return entries.some(([key]) => TRANSFER_FRAMING_KEYS.includes(key))
		? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: result }
		: result;
}

function encodeObject(value: object, walk: Walk): unknown {
	if (value instanceof Error) {
		const errorWalk = { ...walk, insideError: true };
		return errorToSentinel(value, (child) => encodeForGuest(child, errorWalk));
	}
	if (Array.isArray(value)) {
		return value.map((item: unknown) => encodeForGuest(item, walk));
	}
	return encodeRecord(value, walk);
}

/**
 * Inside an Error, a class instance gives undefined. Such an instance can be a
 * large host object, such as the request of an HTTP client error.
 */
function encodeUnwalked(value: object, walk: Walk): unknown {
	return walk.insideError && !isStructuredCloneBuiltin(value) ? undefined : value;
}

/**
 * Copy a value into a form both bridges can send. A function gives undefined,
 * and so does a reference back to an object the walk is inside.
 */
function encodeForGuest(value: unknown, walk: Walk): unknown {
	if (!isObject(value)) {
		return typeof value === 'function' ? undefined : value;
	}
	if (!isWalked(value)) {
		return encodeUnwalked(value, walk);
	}
	return encodeOnce(value, walk, (object) => encodeObject(object, walk));
}

function holdsTypeKey(value: unknown): boolean {
	return isObject(value) && Object.hasOwn(value, TRANSFER_TYPE_KEY);
}

/**
 * Prepare a value a host callback returns to the guest.
 *
 * A value that holds an Error goes across inside a wrapper, with each Error
 * turned into a marker. Every other value goes across as it is. A top-level
 * object that holds the type key is wrapped too, so the guest cannot read it
 * as a wrapper.
 */
export function prepareForGuest(value: unknown): unknown {
	if (holdsTypeKey(value) || holdsError(value, new Set<object>())) {
		return {
			[TRANSFER_TYPE_KEY]: HOST_VALUE_TYPE,
			[TRANSFER_VALUE_KEY]: encodeForGuest(value, { ...newObjectWalk(), insideError: false }),
		};
	}
	return value;
}
