import { isEscapedTransferValue, TRANSFER_VALUE_KEY } from './transfer';
import { decodeHostValue, isHostData } from './transfer-codec';
import {
	arrayFrom,
	defineProperty,
	hasOwn,
	isArray as isArrayValue,
	isInteger,
	objectCreate,
} from './intrinsics';
import { isArrayIndexKey, isKeyOf } from './utils';

// ============================================================================
// Deep Lazy Proxy System
// ============================================================================
// For more information about Proxies see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy

// ---------------------------------------------------------------------------
// Proxy registry — used only for testing/introspection, not accessible from
// expression code. Avoids shadowing user data keys like __isProxy / __path.
// ---------------------------------------------------------------------------
const proxyPaths = new WeakMap<object, string[]>();

// ---------------------------------------------------------------------------
// Batched reads.
//
// A proxy reads one value for each host call until the expression shows that it
// reads many. A read of a value after a read of the key list is a read of every
// field. A read of the array index after the last one is a read of the items in
// order. Then one host call gives a batch of values.
// ---------------------------------------------------------------------------

/** Asks for each value that is small. */
export const SMALL_VALUES = 'small';

/** Asks for each value whole, because the expression reads all of each value. */
export const WHOLE_VALUES = 'whole';

/** What a batched read asks for. A list of names asks for only these fields of each array item. */
export type BatchRequest = typeof SMALL_VALUES | typeof WHOLE_VALUES | string[];

/** Reads a batch of item data values at `path` in one host call. */
export type ReadBatch = (
	path: string[],
	start: number,
	step: number,
	request: BatchRequest,
) => unknown;

/** How an expression read the data of a lazy proxy so far. */
interface ReadTrace {
	/**
	 * The expression read an item that shares this trace in full: every host key
	 * of an object after a key list, or an array in order to its last item.
	 */
	bulk: boolean;
	/** The first names of the fields the expression read by name. */
	names?: string[];
}

const MAX_TRACED_NAMES = 8;

/** Record a read of a field by name. A trace without a name list keeps no name. */
function recordFieldRead(trace: ReadTrace, name: string): void {
	const names = trace.names;
	if (names !== undefined && names.length < MAX_TRACED_NAMES && !names.includes(name)) {
		names.push(name);
	}
}

/**
 * The trace that the lazy items of an array share. For object items it starts
 * with no field name, so the next items stay lazy until the expression reads a field.
 */
function newItemTrace(firstLazyItem: unknown): ReadTrace {
	return isObjectMetadata(firstLazyItem) ? { bulk: false, names: [] } : { bulk: false };
}

/** What the next items are asked for, from how the expression read the lazy items so far. */
function requestAfter(itemTrace: ReadTrace | undefined): BatchRequest {
	return itemTrace?.bulk === true ? WHOLE_VALUES : (itemTrace?.names ?? SMALL_VALUES);
}

/** What a lazy proxy knows about the reads of its values. */
interface ChildReads {
	/** The index after the last item that a host read gave. A read of this index is a read in order. */
	nextInOrder: number;
	/** The count of reads in order. */
	readAheadStep: number;
	/** How the expression read the items that came as lazy proxies. They share this one trace. */
	itemTrace?: ReadTrace;
	/** True after the host gave one lazy item for a request of small items. The next items stay lazy. */
	smallItemsAreLazy: boolean;
	/**
	 * Items that the host gave with only some of their fields, by index. Each one
	 * becomes a lazy proxy on its first read, and the proxy starts with these fields.
	 */
	itemsWithSomeFields?: Record<string, Record<string, unknown>>;
	/** True between a read of the key list and the read of a value. */
	keysWereListed: boolean;
	/** The request of the last read of every field. The same request gives no new field. */
	fieldsRequest?: BatchRequest;
	/**
	 * The key of the last item, set when reads in order reach the end of the
	 * array. A read of this key then shows that the expression read the array to
	 * its end.
	 */
	endKey?: string;
	/**
	 * The count of host keys of an object that the expression read. The trace
	 * gets `bulk` when the last of these reads comes after a key list. Reads
	 * before the key list count too. A read before the proxy knows its host
	 * keys does not count.
	 */
	hostKeysRead: number;
}

function newChildReads(): ChildReads {
	return {
		nextInOrder: -1,
		readAheadStep: 0,
		smallItemsAreLazy: false,
		keysWereListed: false,
		hostKeysRead: 0,
	};
}

const MAX_SEARCHED_KEYS = 64;

const keyLookups = new WeakMap<string[], Record<string, true>>();

function keyLookupOf(keys: string[]): Record<string, true> {
	let lookup = keyLookups.get(keys);
	if (lookup === undefined) {
		lookup = objectCreate(null) as Record<string, true>;
		for (let i = 0; i < keys.length; i++) {
			lookup[keys[i]] = true;
		}
		keyLookups.set(keys, lookup);
	}
	return lookup;
}

/** Say whether the host key list holds the key. A wide object does not search its list on each read. */
function isHostKey(keys: string[], prop: string): boolean {
	return keys.length <= MAX_SEARCHED_KEYS ? keys.includes(prop) : keyLookupOf(keys)[prop] === true;
}

/** The host batched read for a path. Undefined for a path outside item data. */
function batchReadOf(
	basePath: string[],
	callbacks: { readBatch: ReadBatch },
): ReadBatch | undefined {
	return basePath[0] === '$json' ? callbacks.readBatch : undefined;
}

/** Cache the whole items that a host read gave from `start`. An item that is already cached stays. */
function cacheItems(cache: Record<string, unknown>, start: number, items: unknown[]): void {
	for (let offset = 0; offset < items.length; offset++) {
		const prop = String(start + offset);
		if (!hasOwn(cache, prop)) {
			cache[prop] = items[offset];
		}
	}
}

/** Keep the items that a host read gave from `start` with only some of their fields. */
function keepItemsWithSomeFields(
	reads: ChildReads,
	start: number,
	items: unknown[],
): Record<string, Record<string, unknown>> {
	const kept = (reads.itemsWithSomeFields ??= objectCreate(null) as Record<
		string,
		Record<string, unknown>
	>);
	for (let offset = 0; offset < items.length; offset++) {
		kept[String(start + offset)] = items[offset] as Record<string, unknown>;
	}
	return kept;
}

/** The values that a host batched read gave. Undefined when the host gave no batch. */
function batchOf<T>(result: unknown, isExpected: (values: unknown) => values is T): T | undefined {
	return isHostData(result) && isExpected(result[TRANSFER_VALUE_KEY])
		? result[TRANSFER_VALUE_KEY]
		: undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !isArrayValue(value);
}

/** The fields that a host read gave. Undefined when the host gave no batch. */
function fieldsOf(result: unknown): Record<string, unknown> | undefined {
	throwIfErrorSentinel(result);
	return batchOf(result, isRecord);
}

/**
 * Serialized error sentinel returned by host-side bridge callbacks.
 * When a callback throws, the bridge catches the error and returns this
 * sentinel instead of letting it cross the isolate boundary (which strips
 * custom class identity and properties).
 */
export interface ErrorSentinel {
	__isError: true;
	name: string;
	message: string;
	stack?: string;
	extra?: Record<string, unknown>;
	/** Set when a host callback threw the error, not guest code. */
	fromHost?: true;
}

interface ObjectMetadata {
	__isObject: true;
	__keys: string[];
}

interface ArrayMetadata {
	__isArray: true;
	__length: number;
}

export function isObjectMetadata(value: unknown): value is ObjectMetadata {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__isObject' in value &&
		value.__isObject === true
	);
}

export function isArrayMetadata(value: unknown): value is ArrayMetadata {
	return (
		typeof value === 'object' && value !== null && '__isArray' in value && value.__isArray === true
	);
}

function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' && value !== null && '__isError' in value && value.__isError === true
	);
}

/**
 * If `value` is an error sentinel from a host-side callback, throw it
 * directly. The isolate's outer try-catch will detect __isError and
 * return it as the result. Error reconstruction happens on the host only.
 */
export function throwIfErrorSentinel(value: unknown): void {
	if (isErrorSentinel(value)) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal -- sentinel is reconstructed on the host
		throw value;
	}
}

/**
 * Throw the error sentinel of a host call, or give back the data of the call
 * without its escape wrapper.
 */
export function readHostResult(value: unknown): unknown {
	throwIfErrorSentinel(value);
	return isEscapedTransferValue(value) ? value[TRANSFER_VALUE_KEY] : value;
}

/** Returns true if `obj` is a deep lazy proxy created by createDeepLazyProxy. */
export function isLazyProxy(obj: unknown): boolean {
	return typeof obj === 'object' && obj !== null && proxyPaths.has(obj);
}

/** Returns the basePath the proxy was created with, or undefined if not a proxy. */
export function getProxyPath(obj: object): string[] | undefined {
	return proxyPaths.get(obj);
}

/**
 * Tagged-union shape descriptor for a deep lazy proxy.
 *
 * - `object` proxies wrap a plain object target. `keys` is optional —
 *   when omitted, ownKeys/Object.keys() trigger a lazy `getValueAtPath`
 *   round-trip to fetch them.
 * - `array` proxies wrap an array target so `Array.isArray(proxy)` is `true`
 *   and structured clone / `Array.prototype.map` iterate indices correctly.
 */
export type ProxyMeta = { kind: 'object'; keys?: string[] } | { kind: 'array'; length: number };

/**
 * Creates a deep lazy-loading proxy for workflow data.
 *
 * This proxy system enables on-demand loading of nested properties across
 * the isolate boundary using metadata-driven callbacks.
 *
 * Pattern:
 * 1. When property accessed: Call getValueAtPath([path]) to get metadata
 * 2. Metadata indicates type: primitive, object, or array
 * 3. For objects/arrays: Create nested proxy (shape-matched) for lazy loading
 * 4. Cache all fetched values in target to avoid repeated callbacks
 * 5. On the first write or delete: shallow-materialize into the cache
 *    (copy-on-write). Mutations stay in the evaluation and never reach the host.
 *
 * Callable host bindings (`$('Foo').first()`, `$items()`, etc.) do not flow
 * through this proxy — they are wired as in-isolate stubs on `target` that
 * route through the typed-RPC dispatcher (`callHost`).
 *
 * @param basePath - Current path in object tree (e.g., ['$json', 'user'])
 * @param meta - Optional shape descriptor (object/array + known keys/length)
 * @param callbacks - ivm.Callback functions for cross-isolate communication
 * @param trace - Where this proxy records how the expression reads it
 * @param firstFields - Fields of the object that a host read already gave
 * @returns Proxy object with lazy loading behavior
 */
export function createDeepLazyProxy(
	basePath: string[] = [],
	meta?: ProxyMeta,
	callbacks?: {
		getValueAtPath: any;
		getArrayElement: any;
		readBatch: ReadBatch;
	},
	trace: ReadTrace = { bulk: false },
	firstFields?: Record<string, unknown>,
): Record<string | symbol, unknown> {
	if (!callbacks) {
		throw new Error('createDeepLazyProxy requires callbacks parameter');
	}
	const { getValueAtPath, getArrayElement } = callbacks;
	const batchRead = batchReadOf(basePath, callbacks);

	const isArray = meta?.kind === 'array';
	const arrayLength = isArray ? meta.length : 0;
	// The host keys of an object. Without a key list in `meta`, the first call of
	// resolveObjectKeys fetches it. Shared by ownKeys, getOwnPropertyDescriptor,
	// and materialize() so all three see the same key list.
	let knownKeys = meta?.kind === 'object' ? meta.keys : undefined;

	function resolveObjectKeys(): string[] {
		if (knownKeys) return knownKeys;
		const value = getValueAtPath(basePath);
		throwIfErrorSentinel(value);
		if (isObjectMetadata(value)) {
			knownKeys = value.__keys;
			return knownKeys;
		}
		return [];
	}

	let childReads: ChildReads | undefined;

	// Fields that a host read gave. A field goes to the cache when the expression
	// reads it. The cache then keeps the order of the reads, as it does without
	// batched reads.
	let givenFields = firstFields;

	function isInArrayBounds(prop: string): number | undefined {
		const idx = Number(prop);
		if (!isInteger(idx) || idx < 0 || idx >= arrayLength) return undefined;
		if (String(idx) !== prop) return undefined; // reject '00', '1.0', etc.
		return idx;
	}

	function materializeChild(
		basePath: string[],
		propOrIdx: string,
		value: unknown,
		childTrace?: ReadTrace,
	): unknown {
		if (value === undefined || value === null) return value;
		throwIfErrorSentinel(value);
		// `path = [...basePath, propOrIdx]` is built only inside the two branches
		// that actually use it, so non-metadata objects don't pay for the spread.
		if (isArrayMetadata(value)) {
			const path = [...basePath, propOrIdx];
			return createDeepLazyProxy(
				path,
				{ kind: 'array', length: value.__length },
				callbacks,
				childTrace,
			);
		}
		if (isObjectMetadata(value)) {
			const path = [...basePath, propOrIdx];
			return createDeepLazyProxy(
				path,
				{ kind: 'object', keys: value.__keys },
				callbacks,
				childTrace,
			);
		}
		// Decoded data can hold the same keys as metadata or callback errors.
		return decodeHostValue(value);
	}

	const target: object = isArray ? [] : {};

	// Evaluation-scoped copy-on-write. Reads stay lazy, but the first write or
	// delete shallow-materializes the data into `target` and flips this flag;
	// from then on every trap delegates to Reflect on the real target. Writes
	// never cross the isolate boundary — the host callback surface is read-only
	// (getValueAtPath / getArrayElement / readBatch) — and the mutated copy dies
	// with the per-evaluation context.
	// The guard must be in EVERY trap: after mutation, the construction-time
	// meta (arrayLength, host key list, host `in` checks) is stale — an
	// unguarded trap would report the pre-push length or resurrect deleted keys.
	let materialized = false;

	/** Cache an object item as a lazy proxy that starts with the fields that the host gave. */
	function cacheItemWithSomeFields(
		reads: ChildReads,
		prop: string,
		fields: Record<string, unknown>,
	): unknown {
		const t = target as Record<string, unknown>;
		t[prop] = createDeepLazyProxy(
			[...basePath, prop],
			{ kind: 'object' },
			callbacks,
			reads.itemTrace,
			fields,
		);
		return t[prop];
	}

	// `prop` is the already-stringified index — callers have it at hand, and
	// re-deriving it here would put a String() allocation on the hot read path.
	// Plain assignment is safe here (unlike fetchAndCacheObjectValue): `prop`
	// is always a canonical index string, never a setter-chain key like '__proto__'.
	function fetchAndCacheArrayElement(idx: number, prop: string): unknown {
		const t = target as Record<string, unknown>;
		const reads = (childReads ??= newChildReads());
		const someFields = reads.itemsWithSomeFields?.[prop];
		if (someFields !== undefined) {
			return cacheItemWithSomeFields(reads, prop, someFields);
		}
		const request = requestAfter(reads.itemTrace);
		const inOrder = idx === reads.nextInOrder;
		const readBatch =
			inOrder && !(request === SMALL_VALUES && reads.smallItemsAreLazy) ? batchRead : undefined;
		reads.nextInOrder = idx + 1;
		if (inOrder && reads.nextInOrder >= arrayLength) reads.endKey = prop;
		let element: unknown;
		if (readBatch !== undefined) {
			element = readBatch(basePath, idx, reads.readAheadStep++, request);
			const items = batchOf(element, isArrayValue);
			if (items !== undefined && items.length > 0) {
				reads.nextInOrder = idx + items.length;
				if (reads.nextInOrder >= arrayLength) reads.endKey = String(arrayLength - 1);
				if (isArrayValue(request)) {
					const kept = keepItemsWithSomeFields(reads, idx, items);
					return cacheItemWithSomeFields(reads, prop, kept[prop]);
				}
				cacheItems(t, idx, items);
				return t[prop];
			}
			reads.smallItemsAreLazy = request === SMALL_VALUES;
		} else {
			element = getArrayElement(basePath, idx);
		}
		// Primitives (and null) skip `materializeChild`'s metadata checks.
		if (element === null || typeof element !== 'object') {
			t[prop] = element;
			return element;
		}
		reads.itemTrace ??= newItemTrace(element);
		t[prop] = materializeChild(basePath, prop, element, reads.itemTrace);
		return t[prop];
	}

	/** Read every field in one host call, one time for each request. */
	function readEveryField(reads: ChildReads, request: BatchRequest): void {
		if (batchRead !== undefined && request !== reads.fieldsRequest) {
			reads.fieldsRequest = request;
			givenFields = fieldsOf(batchRead(basePath, 0, 0, request)) ?? givenFields;
		}
	}

	function fetchAndCacheObjectValue(prop: string): unknown {
		const t = target as Record<string, unknown>;
		recordFieldRead(trace, prop);
		const value = getValueAtPath([...basePath, prop]);
		// defineProperty, not assignment: a key like '__proto__' must land as an
		// own data property on the cache instead of walking the setter chain and
		// silently replacing the target's prototype.
		defineProperty(t, prop, {
			value: materializeChild(basePath, prop, value),
			writable: true,
			enumerable: true,
			configurable: true,
		});
		return t[prop];
	}

	function cacheGivenField(fields: Record<string, unknown>, prop: string): unknown {
		const t = target as Record<string, unknown>;
		// An assignment to a key that the prototype also has can run code of the prototype.
		if (prop in t) {
			defineProperty(t, prop, {
				value: fields[prop],
				writable: true,
				enumerable: true,
				configurable: true,
			});
		} else {
			t[prop] = fields[prop];
		}
		return fields[prop];
	}

	function cacheObjectValue(prop: string): unknown {
		return givenFields !== undefined && hasOwn(givenFields, prop)
			? cacheGivenField(givenFields, prop)
			: fetchAndCacheObjectValue(prop);
	}

	function materialize(): void {
		if (materialized) return;
		// Keep cached entries: a cached child proxy can already carry its own
		// copy-on-write mutations; a re-fetch would create a fresh proxy and
		// discard them.
		if (isArray) {
			for (let i = 0; i < arrayLength; i++) {
				const prop = String(i);
				if (!Object.prototype.hasOwnProperty.call(target, prop)) fetchAndCacheArrayElement(i, prop);
			}
			(target as unknown[]).length = arrayLength;
		} else {
			const reads = (childReads ??= newChildReads());
			if (batchRead !== undefined && reads.fieldsRequest === undefined) {
				readEveryField(reads, SMALL_VALUES);
			}
			for (const key of resolveObjectKeys()) {
				if (!Object.prototype.hasOwnProperty.call(target, key)) cacheObjectValue(key);
			}
		}
		materialized = true;
	}

	const proxy = new Proxy(target as any, {
		ownKeys(targetObj: any): Array<string | symbol> {
			if (materialized) return Reflect.ownKeys(targetObj);
			if (isArray) {
				const keys: Array<string | symbol> = arrayFrom({ length: arrayLength }, (_, i) =>
					String(i),
				);
				// Required by proxy invariant: target [] has non-configurable 'length'
				keys.push('length');
				return keys;
			}
			if (batchRead !== undefined) {
				(childReads ??= newChildReads()).keysWereListed = true;
			}
			return resolveObjectKeys();
		},
		getOwnPropertyDescriptor(
			targetObj: any,
			prop: string | symbol,
		): PropertyDescriptor | undefined {
			if (materialized) return Reflect.getOwnPropertyDescriptor(targetObj, prop);
			if (typeof prop === 'symbol') return undefined;
			if (isArray) {
				if (prop === 'length') {
					// Match the target array's own length descriptor shape so the
					// proxy invariant holds: writable & non-configurable.
					return {
						configurable: false,
						enumerable: false,
						writable: true,
						value: arrayLength,
					};
				}
				if (isInArrayBounds(prop) !== undefined) {
					// Before the first write, the proxy is a lazy read view; the
					// descriptor is reported read-only. Actual writes are handled by
					// the set trap, which materializes first (see `materialize`).
					// Reading `proxy[prop]` triggers the get trap, which fetches the
					// element from the host (if not cached) and stores it on the
					// target. Including `value` matches a native array's data
					// descriptor; the fetch is one-shot per index because of caching.
					return {
						configurable: true,
						enumerable: true,
						writable: false,
						value: proxy[prop],
					};
				}
				return undefined;
			}
			if (isHostKey(resolveObjectKeys(), prop)) {
				return { configurable: true, enumerable: true, writable: false };
			}
			return undefined;
		},
		get(targetObj: any, prop: string | symbol): unknown {
			if (materialized) return Reflect.get(targetObj, prop);
			// Symbol-keyed access falls through to the proxy target so that
			// well-known symbols on the prototype chain are reachable. For array
			// proxies this exposes `Array.prototype[Symbol.iterator]` etc., which
			// `[...arr]`, `for…of`, and destructuring need. For object proxies the
			// `{}` target has no own symbol-keyed entries; reads return undefined.
			// Symbols themselves aren't transferred across the isolate boundary —
			// only the values yielded by iteration, which already pay the proxy's
			// indexed `[[Get]]` (primitives or sub-proxies).
			if (typeof prop === 'symbol') {
				return targetObj[prop];
			}

			// `toString` and `valueOf` aren't intercepted — they fall through to the
			// target's prototype via the cache check below. That means `arr.toString()`
			// returns the canonical comma-joined string (via `Array.prototype.toString`
			// → `.join(',')`, paying one bridge call per element), and `obj.valueOf()`
			// returns the proxy itself instead of the internal target. Pre-fix this
			// trap shortcut to `''` / `targetObj` to avoid the O(n) cost, but the
			// divergence from native was surprising in expressions like
			// `={{ "items: " + $json.arr }}`. Users who care about the cost can call
			// `$json.arr.length` and index explicitly.

			// Array length is known at construction — no bridge call needed
			if (isArray && prop === 'length') {
				return arrayLength;
			}

			if (
				isKeyOf(targetObj, prop) ||
				(prop in targetObj && (isArray || !isHostKey(resolveObjectKeys(), prop)))
			) {
				if (prop === childReads?.endKey) trace.bulk = true;
				return targetObj[prop];
			}

			if (isArray) {
				const idx = isInArrayBounds(prop);
				if (idx !== undefined) {
					const item = fetchAndCacheArrayElement(idx, prop);
					if (prop === childReads?.endKey) trace.bulk = true;
					return item;
				}
				if (isArrayIndexKey(prop)) {
					return undefined;
				}
			}

			if (childReads?.keysWereListed === true) {
				childReads.keysWereListed = false;
				readEveryField(childReads, trace.bulk ? WHOLE_VALUES : SMALL_VALUES);
			}

			// A host array can carry named keys, for example a key that a Set node
			// writes on an item whose json is an array.
			const value = cacheObjectValue(prop);
			// Only object items have a trace with names, and only items use the mark.
			// Reads by name can stop at the top of a large field, so only a read of
			// every field (after a key list) marks the item.
			if (trace.names !== undefined && knownKeys !== undefined && isHostKey(knownKeys, prop)) {
				const reads = (childReads ??= newChildReads());
				if (++reads.hostKeysRead === knownKeys.length && reads.fieldsRequest !== undefined) {
					trace.bulk = true;
				}
			}
			return value;
		},

		// Expression code runs in sloppy mode (the eval wrapper adds no
		// 'use strict'), so a false result from these traps no-ops silently
		// instead of throwing. Materialize, then let Reflect apply the
		// mutation for real.
		set(_targetObj: any, prop: string | symbol, value: unknown, receiver: unknown): boolean {
			materialize();
			// Forward the receiver: when the proxy sits on another object's
			// prototype chain, the write must create an own property on that
			// object, not land in this proxy's cache.
			return Reflect.set(target, prop, value, receiver);
		},

		deleteProperty(_targetObj: any, prop: string | symbol): boolean {
			materialize();
			return Reflect.deleteProperty(target, prop);
		},

		has(targetObj: any, prop: string | symbol): boolean {
			if (materialized) return Reflect.has(targetObj, prop);

			// Mirror the get trap: symbol-keyed lookups defer to the target so
			// `Symbol.iterator in arr` reflects the prototype chain.
			if (typeof prop === 'symbol') return prop in targetObj;

			if (isArray) {
				if (prop === 'length') return true;
				if (prop in targetObj) return true;
				return isInArrayBounds(prop) !== undefined;
			}

			if (prop in targetObj) {
				return true;
			}

			const path = [...basePath, prop];
			const value = getValueAtPath(path);

			// Handle errors serialized by host-side callbacks — reconstruct and throw
			// so the isolate's outer try-catch can serialize them back via __reportError
			throwIfErrorSentinel(value);

			// Note: null values mean the property exists but is null.
			return value !== undefined;
		},
	});

	proxyPaths.set(proxy, basePath);
	return proxy as Record<string | symbol, unknown>;
}
