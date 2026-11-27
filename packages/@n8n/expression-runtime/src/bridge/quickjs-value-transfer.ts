import { isErrorTransferSentinel, rebuildErrorValue } from '../runtime/error-transfer';
import { isLuxonSentinel, rebuildLuxonValue } from '../runtime/luxon-transfer';
import type { EscapedTransferValue } from '../runtime/transfer';
import { defineOwnValue, isEscapedTransferValue, unboxPrimitive } from '../runtime/transfer';
import { isArrayIndexKey } from '../runtime/utils';

const safeStringify = JSON.stringify;

// ============================================================================
// Sentinel helpers
//
// QuickJS's vm.dump() loses Date / NaN / boxed primitive / Map / Set / Error
// type identity (Date → ISO string, NaN → null, boxed primitives / Map / Set /
// Error → plain objects). Inside the QuickJS context we wrap those values as
// sentinel objects ({ __isDate: true, __isoString: ... } etc.) before they cross
// the boundary, then unwrap them on the host side. The isolated-vm bridge does
// NOT need this — structured clone preserves type identity natively.
// ============================================================================

function isDateSentinel(value: unknown): value is { __isDate: true; __isoString: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isDate === true &&
		typeof (value as Record<string, unknown>).__isoString === 'string'
	);
}

function isNaNSentinel(value: unknown): value is { __isNaN: true } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isNaN === true
	);
}

// The guest escapes a user object with this key. Only the sentinel has this key alone.
function isUndefinedSentinel(value: unknown): value is { __isUndefined: true } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isUndefined === true &&
		Object.keys(value).length === 1
	);
}

type BoxedPrimitiveSentinel =
	| { __isBoxedPrimitive: 'string'; __value: string }
	| { __isBoxedPrimitive: 'number'; __value: number | string }
	| { __isBoxedPrimitive: 'boolean'; __value: boolean }
	| { __isBoxedPrimitive: 'bigint'; __value: string };

function isBoxedPrimitiveSentinel(value: unknown): value is BoxedPrimitiveSentinel {
	if (typeof value !== 'object' || value === null) return false;
	const kind: unknown = Reflect.get(value, '__isBoxedPrimitive');
	const inner: unknown = Reflect.get(value, '__value');
	switch (kind) {
		case 'string':
		case 'bigint':
			return typeof inner === 'string';
		case 'number':
			return typeof inner === 'number' || typeof inner === 'string';
		case 'boolean':
			return typeof inner === 'boolean';
		default:
			return false;
	}
}

const toBoxedObject: (value: string | number | boolean | bigint) => unknown = Object;

function encodeBoxedNumber(value: number): number | string {
	if (Object.is(value, -0)) return '-0';
	return Number.isFinite(value) ? value : String(value);
}

function wrapBoxedPrimitive(value: object): BoxedPrimitiveSentinel | undefined {
	const primitive = unboxPrimitive(value);
	if (primitive === undefined) return undefined;
	switch (typeof primitive) {
		case 'string':
			return { __isBoxedPrimitive: 'string', __value: primitive };
		case 'number':
			return { __isBoxedPrimitive: 'number', __value: encodeBoxedNumber(primitive) };
		case 'boolean':
			return { __isBoxedPrimitive: 'boolean', __value: primitive };
		case 'bigint':
			return { __isBoxedPrimitive: 'bigint', __value: primitive.toString() };
	}
}

function rebuildBoxedPrimitive(sentinel: BoxedPrimitiveSentinel): unknown {
	switch (sentinel.__isBoxedPrimitive) {
		case 'string':
			return toBoxedObject(sentinel.__value);
		case 'number':
			return toBoxedObject(Number(sentinel.__value));
		case 'boolean':
			return toBoxedObject(sentinel.__value);
		case 'bigint':
			return toBoxedObject(BigInt(sentinel.__value));
	}
}

function isErrorValueSentinel(value: unknown): value is {
	__isErrorValue: true;
	__name: string;
	__message: string;
	__extra: Record<string, unknown>;
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isErrorValue === true
	);
}

function isMapSentinel(
	value: unknown,
): value is { __isMap: true; __entries: Array<[unknown, unknown]> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isMap === true
	);
}

function isSetSentinel(value: unknown): value is { __isSet: true; __values: unknown[] } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isSet === true
	);
}

function isKeyedArraySentinel(
	value: unknown,
): value is { __isKeyedArray: true; __items: unknown[]; __props: Record<string, unknown> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isKeyedArray === true
	);
}

function isEscapedObject(
	value: unknown,
): value is { __isEscaped: true; __value: Record<string, unknown> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isEscaped === true
	);
}

function isRefSentinel(value: unknown): value is { __isRef: true; __id: number } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isRef === true &&
		typeof (value as Record<string, unknown>).__id === 'number'
	);
}

function isRefDefSentinel(
	value: unknown,
): value is { __isRefDef: true; __id: number; __value: unknown } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isRefDef === true &&
		typeof (value as Record<string, unknown>).__id === 'number'
	);
}

function registerRef<T>(refs: Map<number, unknown>, defId: number | undefined, target: T): T {
	if (defId !== undefined) refs.set(defId, target);
	return target;
}

/**
 * Give back the payload of an escape wrapper.
 *
 * The guest escapes every marker-shaped object inside an opaque payload, so the
 * host walk can rebuild the markers in any payload.
 */
function unescapeTransferValue(
	value: EscapedTransferValue,
	refs: Map<number, unknown>,
	defId?: number,
): unknown {
	const inner: unknown = value.__value;
	if (typeof inner !== 'object' || inner === null) return inner;
	if (isEscapedObject(inner) || Array.isArray(inner)) return unwrapValue(inner, refs, defId);
	const unescaped = registerRef(refs, defId, {});
	for (const [key, entry] of Object.entries(inner)) {
		defineOwnValue(unescaped, key, unwrapValue(entry, refs));
	}
	return unescaped;
}

/**
 * Recursively reconstruct Date objects, NaN values, boxed primitives, Map, Set,
 * Error, and repeated or self-referencing objects from sentinels produced by
 * the QuickJS-side __prepareForTransfer wrapper.
 */
export function unwrapSentinels(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;
	return unwrapValue(value, new Map<number, unknown>());
}

function unwrapValue(value: unknown, refs: Map<number, unknown>, defId?: number): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
	if (isRefDefSentinel(value)) {
		return registerRef(refs, defId, unwrapValue(value.__value, refs, value.__id));
	}
	if (isRefSentinel(value)) {
		return registerRef(refs, defId, refs.get(value.__id));
	}
	// Escaped user objects: keys collided with the sentinel markers, so the
	// guest wrapped them (see injectTransferWrapper). Unwrap the values but
	// treat the object itself as plain data.
	if (isEscapedObject(value)) {
		const inner = value.__value;
		const result = registerRef(refs, defId, {});
		for (const key of Object.keys(inner)) {
			defineOwnValue(result, key, unwrapValue(inner[key], refs));
		}
		return result;
	}
	if (isLuxonSentinel(value)) return registerRef(refs, defId, rebuildLuxonValue(value));
	if (isErrorTransferSentinel(value)) {
		return rebuildErrorValue(
			value,
			(child) => unwrapValue(child, refs),
			(error) => registerRef(refs, defId, error),
		);
	}
	if (isEscapedTransferValue(value)) return unescapeTransferValue(value, refs, defId);
	if (isDateSentinel(value)) return registerRef(refs, defId, new Date(value.__isoString));
	if (isNaNSentinel(value)) return NaN;
	if (isUndefinedSentinel(value)) return undefined;
	if (isBoxedPrimitiveSentinel(value))
		return registerRef(refs, defId, rebuildBoxedPrimitive(value));
	if (isErrorValueSentinel(value)) {
		const ErrorCtor =
			(
				{
					TypeError,
					SyntaxError,
					EvalError,
					RangeError,
					ReferenceError,
					URIError,
				} as Record<string, ErrorConstructor>
			)[value.__name] ?? Error;
		const error = registerRef(refs, defId, new ErrorCtor(value.__message));
		if (value.__extra) {
			for (const [k, v] of Object.entries(value.__extra)) {
				defineOwnValue(error, k, unwrapValue(v, refs));
			}
		}
		return error;
	}
	if (isMapSentinel(value)) {
		const map = registerRef(refs, defId, new Map<unknown, unknown>());
		for (const [k, v] of value.__entries) {
			map.set(unwrapValue(k, refs), unwrapValue(v, refs));
		}
		return map;
	}
	if (isSetSentinel(value)) {
		const set = registerRef(refs, defId, new Set<unknown>());
		for (const entry of value.__values) {
			set.add(unwrapValue(entry, refs));
		}
		return set;
	}
	if (Array.isArray(value)) {
		const result = registerRef(refs, defId, new Array<unknown>(value.length));
		for (let i = 0; i < value.length; i++) {
			result[i] = unwrapValue(value[i], refs);
		}
		return result;
	}
	const result = registerRef(refs, defId, {});
	for (const key of Object.keys(value)) {
		defineOwnValue(result, key, unwrapValue((value as Record<string, unknown>)[key], refs));
	}
	return result;
}

/** Keys the transfer encoding reserves — keep in sync with `isQuickJsMarkerKey` in the guest runtime. */
const TRANSFER_MARKER_KEYS = new Set([
	'__isDate',
	'__isNaN',
	'__isUndefined',
	'__isBoxedPrimitive',
	'__isErrorValue',
	'__isMap',
	'__isSet',
	'__isEscaped',
	'__isError',
	'__isKeyedArray',
	'__isRef',
	'__isRefDef',
]);

interface RefEntry {
	id: number;
	out: unknown;
}

interface GuestWrapState {
	seen: Map<object, RefEntry>;
	repeated: RefEntry[];
	nextId: number;
}

function makeRefForGuest(entry: RefEntry, state: GuestWrapState): { __isRef: true; __id: number } {
	if (entry.id === -1) {
		entry.id = state.nextId++;
		state.repeated.push(entry);
	}
	return { __isRef: true, __id: entry.id };
}

function attachDefsForGuest(node: unknown, defIds: Map<object, number>): unknown {
	if (node === null || typeof node !== 'object') return node;
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			if (i in node) {
				const next = attachDefsForGuest(node[i], defIds);
				if (next !== node[i]) node[i] = next;
			}
		}
	} else {
		const record = node as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			const child = record[key];
			const next = attachDefsForGuest(child, defIds);
			if (next !== child) defineOwnValue(record, key, next);
		}
	}
	const id = defIds.get(node);
	return id !== undefined ? { __isRefDef: true, __id: id, __value: node } : node;
}

/**
 * True when the wrapped host graph contains a cycle outside a Map or Set.
 * Plain objects, arrays, and class instances arrive in the guest as plain
 * objects or arrays, and `__prepareForTransfer` rejects a cycle in those
 * outside an Error. Keep returning undefined for those host values, so an
 * expression that returns them does not fail.
 */
function hasPlainGuestCycle(
	node: unknown,
	byId: Map<number, unknown>,
	open: Set<object> = new Set(),
	done: Set<object> = new Set(),
): boolean {
	if (node === null || typeof node !== 'object') return false;
	if (isRefSentinel(node)) {
		return hasPlainGuestCycle(byId.get(node.__id), byId, open, done);
	}
	if (open.has(node)) return true;
	if (done.has(node)) return false;

	if (
		!isEscapedObject(node) &&
		(isDateSentinel(node) ||
			isNaNSentinel(node) ||
			isBoxedPrimitiveSentinel(node) ||
			isMapSentinel(node) ||
			isSetSentinel(node))
	) {
		return false;
	}

	open.add(node);
	if (isEscapedObject(node)) {
		for (const key of Object.keys(node.__value)) {
			if (hasPlainGuestCycle(node.__value[key], byId, open, done)) return true;
		}
	} else if (isKeyedArraySentinel(node)) {
		for (let i = 0; i < node.__items.length; i++) {
			if (i in node.__items && hasPlainGuestCycle(node.__items[i], byId, open, done)) return true;
		}
		for (const key of Object.keys(node.__props)) {
			if (hasPlainGuestCycle(node.__props[key], byId, open, done)) return true;
		}
	} else if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			if (i in node && hasPlainGuestCycle(node[i], byId, open, done)) return true;
		}
	} else {
		const record = node as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			if (hasPlainGuestCycle(record[key], byId, open, done)) return true;
		}
	}
	open.delete(node);
	done.add(node);
	return false;
}

/**
 * Recursively wrap host values that JSON.stringify would flatten (Date, NaN,
 * boxed primitives, Map, Set) or reject (self-referencing Map or Set graphs)
 * into the same sentinel format the guest transfer wrapper uses, escaping user
 * objects whose keys collide with the markers. Returns undefined when the graph
 * has a plain object or array cycle outside a Map or Set, because the guest
 * transfer walk has no cycle guard for those values outside an Error. The guest
 * rebuilds real instances via __unwrapFromHost (see injectTransferWrapper), so
 * host-callback results match what isolated-vm's structured clone delivers.
 */
function wrapSpecialValuesForGuest(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'number' && Number.isNaN(value)) return { __isNaN: true };
	if (typeof value !== 'object') return value;
	const state: GuestWrapState = { seen: new Map(), repeated: [], nextId: 0 };
	const root = wrapValueForGuest(value, state);
	if (state.repeated.length === 0) return root;
	const byId = new Map<number, unknown>();
	const defIds = new Map<object, number>();
	for (const entry of state.repeated) {
		byId.set(entry.id, entry.out);
		if (entry.out !== null && typeof entry.out === 'object') {
			defIds.set(entry.out, entry.id);
		}
	}
	if (hasPlainGuestCycle(root, byId)) return undefined;
	return attachDefsForGuest(root, defIds);
}

function wrapValueForGuest(value: unknown, state: GuestWrapState): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'number' && Number.isNaN(value)) return { __isNaN: true };
	if (typeof value !== 'object') return value;
	const existing = state.seen.get(value);
	if (existing !== undefined) return makeRefForGuest(existing, state);

	const entry: RefEntry = { id: -1, out: null };
	state.seen.set(value, entry);
	let out: unknown;
	if (value instanceof Date) {
		// Invalid Dates have no ISO string; '' rebuilds an Invalid Date in the guest.
		out = { __isDate: true, __isoString: isNaN(value.getTime()) ? '' : value.toISOString() };
	} else if (value instanceof Map) {
		out = {
			__isMap: true,
			__entries: [...value.entries()].map(([k, v]) => [
				wrapValueForGuest(k, state),
				wrapValueForGuest(v, state),
			]),
		};
	} else if (value instanceof Set) {
		out = {
			__isSet: true,
			__values: [...value.values()].map((entryValue) => wrapValueForGuest(entryValue, state)),
		};
	} else if (Array.isArray(value)) {
		out = wrapArrayForGuest(value, state);
	} else {
		const boxed = wrapBoxedPrimitive(value);
		if (boxed !== undefined) {
			out = boxed;
		} else {
			const record = value as Record<string, unknown>;
			const result: Record<string, unknown> = {};
			let collides = false;
			for (const key of Object.keys(record)) {
				if (TRANSFER_MARKER_KEYS.has(key)) collides = true;
				defineOwnValue(result, key, wrapValueForGuest(record[key], state));
			}
			out = collides ? { __isEscaped: true, __value: result } : result;
		}
	}
	entry.out = out;
	return out;
}

/** Matches a marker key as it reads in JSON. No marker key holds a regular expression character. */
const MARKER_KEY_IN_JSON = new RegExp(
	[...TRANSFER_MARKER_KEYS].map((key) => safeStringify(key)).join('|'),
);

/** JSON drops the named keys of an array, so an array with named keys goes across in a sentinel. */
function wrapArrayForGuest(value: unknown[], state: GuestWrapState): unknown {
	const items = value.map((item) => wrapValueForGuest(item, state));
	const keys = Object.keys(value);
	// Own keys list array indices first, so an array without named keys ends on an index.
	if (keys.length === 0 || isArrayIndexKey(keys[keys.length - 1])) {
		return items;
	}
	const namedKeys = keys.filter((key) => !isArrayIndexKey(key));
	const record = value as unknown as Record<string, unknown>;
	const props: Record<string, unknown> = {};
	namedKeys.forEach((key) => defineOwnValue(props, key, wrapValueForGuest(record[key], state)));
	return { __isKeyedArray: true, __items: items, __props: props };
}

/**
 * False only when the JSON of a host value holds no sentinel of
 * wrapSpecialValuesForGuest. The guest can then use the parsed JSON as it is.
 */
export function mayHoldGuestSentinel(json: string): boolean {
	return MARKER_KEY_IN_JSON.test(json);
}

/**

 * Convert a host JavaScript value to a JSON string suitable for round-tripping
 * into QuickJS via evalCode. Handles undefined (not valid JSON) by returning
 * the string "undefined".
 *
 * Only objects/arrays and strings with NUL or a lone surrogate reach this — other primitives
 * (including top-level NaN via newNumber) and Date are handled directly by
 * the caller. Everything else (lazy-proxy metadata, Intl outputs, typed-RPC results, error-sentinel
 * extras) is sentinel-wrapped first so nested Date/NaN/Map/Set survive the
 * JSON round-trip and rebuild in the guest via __unwrapFromHost — matching
 * what isolated-vm's structured clone delivers.
 */
export function hostValueToJson(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	try {
		// JSON.stringify returns undefined for a symbol or a function.
		return safeStringify(wrapSpecialValuesForGuest(value)) ?? 'undefined';
	} catch {
		return 'undefined';
	}
}
