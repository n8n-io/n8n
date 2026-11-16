import { errorToSentinel } from '../runtime/error-transfer';
import { HOST_VALUE_TYPE } from '../runtime/transfer-codec';
import type { ObjectWalk } from '../runtime/transfer';
import {
	defineOwnValue,
	encodeOnce,
	isPlainObject,
	isStructuredCloneBuiltin,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_TYPE_KEY,
	TRANSFER_VALUE_KEY,
} from '../runtime/transfer';

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
 * Each mode needs its own cache because Error contents use different filtering.
 * Both modes share the active objects to cut cycles through an Error.
 */
class GuestEncoder {
	private readonly walk: ObjectWalk;

	private errorEncoder?: GuestEncoder;

	constructor(
		private readonly insideError = false,
		open = new Set<object>(),
	) {
		this.walk = { done: new Map(), open };
	}

	/**
	 * Copy a value into a form both bridges can send. A function or a symbol gives
	 * undefined, and so does a reference back to an object the walk is inside.
	 */
	encode(value: unknown): unknown {
		if (!isObject(value)) {
			return typeof value === 'function' || typeof value === 'symbol' ? undefined : value;
		}
		if (!isWalked(value)) {
			return this.encodeUnwalked(value);
		}
		return encodeOnce(value, this.walk, (object) => this.encodeObject(object));
	}

	private inError(): GuestEncoder {
		return this.insideError ? this : (this.errorEncoder ??= new GuestEncoder(true, this.walk.open));
	}

	private encodeObject(value: object): unknown {
		if (value instanceof Error) {
			const encoder = this.inError();
			return errorToSentinel(value, (child) => encoder.encode(child));
		}
		if (Array.isArray(value)) {
			return value.map((item: unknown) => this.encode(item));
		}
		return this.encodeRecord(value);
	}

	/**
	 * User data can hold the same keys as our framing. Such an object is escaped,
	 * so the guest reads the object itself as data but still walks what is inside it.
	 */
	private encodeRecord(object: object): unknown {
		const result: Record<string, unknown> = {};
		const entries = Object.entries(object);
		entries.forEach(([key, value]) => defineOwnValue(result, key, this.encode(value)));
		return entries.some(([key]) => TRANSFER_FRAMING_KEYS.includes(key))
			? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: result }
			: result;
	}

	/**
	 * Inside an Error, a class instance or a Promise gives undefined. Such an
	 * instance can be a large host object, such as the request of an HTTP client
	 * error. Structured clone cannot copy a Promise.
	 *
	 * Outside an Error, a class instance is marked opaque. Structured clone
	 * flattens its prototype away, so a framing key on it would read as ours.
	 */
	private encodeUnwalked(value: object): unknown {
		const cloneable = isStructuredCloneBuiltin(value) && !(value instanceof Promise);
		if (this.insideError && !cloneable) {
			return undefined;
		}
		return isStructuredCloneBuiltin(value)
			? value
			: { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_OPAQUE_KEY]: true, [TRANSFER_VALUE_KEY]: value };
	}
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
			[TRANSFER_VALUE_KEY]: new GuestEncoder().encode(value),
		};
	}
	return value;
}
