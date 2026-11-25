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

const MAX_SMALL_INSTANCE_FIELDS = 100;

const MAX_SMALL_INSTANCE_CHARS = 10_000;

function isJsonPrimitive(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

/**
 * The own fields of a class instance as a plain object. Undefined unless the
 * instance has no `toJSON`, has only data fields that hold JSON primitives, and
 * stays within MAX_SMALL_INSTANCE_FIELDS fields and MAX_SMALL_INSTANCE_CHARS characters.
 * Never calls a getter. Undefined when a proxy trap throws.
 */
function smallInstanceFieldsOf(value: object): Record<string, unknown> | undefined {
	try {
		return readSmallInstanceFields(value);
	} catch {
		return undefined;
	}
}

function readSmallInstanceFields(value: object): Record<string, unknown> | undefined {
	const keys = Object.keys(value);
	if (keys.length > MAX_SMALL_INSTANCE_FIELDS || 'toJSON' in value) {
		return undefined;
	}

	const entries: Array<[string, unknown]> = [];
	let chars = 0;
	for (const key of keys) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);
		if (!descriptor || !('value' in descriptor) || !isJsonPrimitive(descriptor.value)) {
			return undefined;
		}
		chars += key.length + (typeof descriptor.value === 'string' ? descriptor.value.length : 0);
		if (chars > MAX_SMALL_INSTANCE_CHARS) {
			return undefined;
		}
		entries.push([key, descriptor.value]);
	}
	return Object.fromEntries(entries);
}

function isObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null;
}

/** The objects the walks go into. Any other object goes across as it is. */
function isWalked(value: object): boolean {
	return Array.isArray(value) || isPlainObject(value) || value instanceof Error;
}

const UNCLONABLE_TYPE_TAGS: ReadonlySet<string> = new Set([
	'[object Promise]',
	'[object WeakMap]',
	'[object WeakSet]',
	'[object WeakRef]',
	'[object FinalizationRegistry]',
]);

/** Say whether structured clone refuses to copy an object of this type. The object can come from any realm. */
function isUnclonableObject(value: object): boolean {
	return UNCLONABLE_TYPE_TAGS.has(Object.prototype.toString.call(value));
}

/** Say whether a value is a Proxy. Always false on a platform that cannot tell. */
const isProxy: (value: unknown) => boolean =
	globalThis.process?.getBuiltinModule?.('node:util').types.isProxy ?? (() => false);

/**
 * Say whether a value holds an Error, a Proxy or a value that structured clone
 * cannot copy, in the arrays and plain objects it is made of. It runs on each
 * host call result, so it reads the keys in place.
 */
function needsEncoding(value: unknown, seen: Set<object>): boolean {
	if (isObject(value) && !seen.has(value)) {
		seen.add(value);
		return (
			isProxy(value) ||
			value instanceof Error ||
			isUnclonableObject(value) ||
			childNeedsEncoding(value, seen)
		);
	}
	return typeof value === 'function' || typeof value === 'symbol';
}

function childNeedsEncoding(value: object, seen: Set<object>): boolean {
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			if (needsEncoding(value[index], seen)) {
				return true;
			}
		}
	} else if (isPlainObject(value)) {
		for (const key in value) {
			if (needsEncoding(value[key], seen)) {
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
	 * Inside an Error, a small class instance of primitive fields goes across as
	 * a plain object. Any other class instance or a Promise gives undefined. Such
	 * an instance can be a large host object, such as the request of an HTTP
	 * client error. Structured clone cannot copy a Promise.
	 *
	 * Outside an Error, a class instance is marked opaque. Structured clone
	 * flattens its prototype away, so a framing key on it would read as ours.
	 * A Proxy goes across as a plain object of its own fields. A Promise or a
	 * weak collection gives an empty object.
	 */
	private encodeUnwalked(value: object): unknown {
		const cloneable = isStructuredCloneBuiltin(value) && !(value instanceof Promise);
		if (this.insideError && !cloneable) {
			return value instanceof Promise
				? undefined
				: encodeOnce(value, this.walk, (instance) => this.encode(smallInstanceFieldsOf(instance)));
		}
		if (isProxy(value)) {
			return encodeOnce(value, this.walk, (target) => this.encodeRecord(target));
		}
		if (isUnclonableObject(value)) {
			return {};
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
 * turned into a marker. So does a value that holds a function, a symbol, a
 * Promise, a weak collection or a Proxy. A function or a symbol gives undefined,
 * a Promise or a weak collection gives an empty object, and a Proxy gives a
 * copy of its fields. Every other value goes across as it is. A top-level
 * object that holds the type key is wrapped too, so the guest cannot read it
 * as a wrapper.
 */
export function prepareForGuest(value: unknown): unknown {
	if (holdsTypeKey(value) || needsEncoding(value, new Set<object>())) {
		return {
			[TRANSFER_TYPE_KEY]: HOST_VALUE_TYPE,
			[TRANSFER_VALUE_KEY]: new GuestEncoder().encode(value),
		};
	}
	return value;
}
