import { ERROR_TYPE } from './error-transfer';
import {
	bigIntValueOf,
	getPrototypeOf,
	isArray,
	mapGet,
	mapHas,
	mapSet,
	NativeMap,
	NativeSet,
	objectKeys,
	objectPrototype,
	reflectApply,
	reflectGet,
	sameValue,
} from './intrinsics';
import { __prepareForTransfer } from './serialize';
import {
	defineOwnValue,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_TYPE_KEY,
	unboxPrimitive,
} from './transfer';

// Keep native functions before an expression can replace them.
const NativeDate = Date;
const NativeError = Error;
const NativePromise = Promise;
const NativeRangeError = RangeError;
const NativeTypeError = TypeError;
const NativeArray = Array;
const toObject = Object;
const toString = String;
const toNumber = Number;
const toBigInt = BigInt;
const parseJSON: (json: string) => unknown = JSON.parse;
const numberIsNaN = Number.isNaN;
const isFiniteNumber = Number.isFinite;
const dateGetTime = Date.prototype.getTime;
const dateToISOString = Date.prototype.toISOString;
const mapForEach = Map.prototype.forEach;
const setForEach = Set.prototype.forEach;
const setAdd = Set.prototype.add;
const bigIntToString = BigInt.prototype.toString;

interface ReferenceEntry {
	id: number;
	value: unknown;
}

/** One result owns its references. No state survives an evaluation. */
class ResultEncoder {
	private seen?: Map<object, ReferenceEntry>;
	private readonly repeated: ReferenceEntry[] = [];
	private errors?: Map<Error, object>;
	private markers?: Map<object, Error>;
	private nextId = 0;

	encode(value: unknown): unknown {
		const prepared = __prepareForTransfer(value, {
			onPlainCycle: () => {
				throw new NativeRangeError('Maximum call stack size exceeded');
			},
			onEncodeError: (error, marker) => {
				this.errors ??= new NativeMap();
				this.markers ??= new NativeMap();
				if (!reflectApply(mapHas, this.errors, [error])) {
					reflectApply(mapSet, this.errors, [error, marker]);
				}
				reflectApply(mapSet, this.markers, [marker, error]);
			},
		});
		const root = this.wrap(prepared, false, false);
		this.seen = undefined;
		this.errors = undefined;
		this.markers = undefined;
		if (this.repeated.length === 0) {
			return root;
		}
		const definitions = new NativeMap<object, number>();
		for (let i = 0; i < this.repeated.length; i++) {
			const entry = this.repeated[i];
			if (entry.value !== null && typeof entry.value === 'object') {
				reflectApply(mapSet, definitions, [entry.value, entry.id]);
			}
		}
		this.repeated.length = 0;
		return attachDefinitions(root, definitions);
	}

	private reference(entry: ReferenceEntry): object {
		if (entry.id === -1) {
			entry.id = this.nextId++;
			this.repeated[this.repeated.length] = entry;
		}
		return { __isRef: true, __id: entry.id };
	}

	private remember(value: object): ReferenceEntry {
		const entry: ReferenceEntry = { id: -1, value: undefined };
		reflectApply(mapSet, (this.seen ??= new NativeMap()), [value, entry]);
		return entry;
	}

	private wrapError(error: Error, marker: object): unknown {
		const seen = (this.seen ??= new NativeMap());
		const existing: ReferenceEntry | undefined =
			reflectApply(mapGet, seen, [error]) ?? reflectApply(mapGet, seen, [marker]);
		if (existing !== undefined) {
			reflectApply(mapSet, seen, [error, existing]);
			reflectApply(mapSet, seen, [marker, existing]);
			return this.reference(existing);
		}
		const entry = this.remember(error);
		reflectApply(mapSet, seen, [marker, entry]);
		entry.value = this.wrapErrorMarker(marker);
		return entry.value;
	}

	/** Encode one child. `vm.dump()` drops an undefined child, so it goes across as a marker. */
	private wrap(value: unknown, userData: boolean, trackReferences: boolean): unknown {
		if (value === undefined) {
			return { __isUndefined: true };
		}
		if (typeof value === 'function') {
			throw new NativeTypeError(`${toString(value)} could not be cloned`);
		}
		if (numberIsNaN(value)) {
			return { __isNaN: true };
		}
		if (value === null || typeof value !== 'object') {
			return value;
		}
		if (value instanceof NativePromise) {
			throw new NativeTypeError('#<Promise> could not be cloned');
		}
		const existing: ReferenceEntry | undefined =
			this.seen === undefined ? undefined : reflectApply(mapGet, this.seen, [value]);
		if (existing !== undefined) {
			return this.reference(existing);
		}
		const marker: object | undefined =
			this.errors === undefined ? undefined : reflectApply(mapGet, this.errors, [value]);
		if (marker !== undefined && value instanceof NativeError) {
			return this.wrapError(value, marker);
		}
		if (!userData) {
			const error: Error | undefined =
				this.markers === undefined ? undefined : reflectApply(mapGet, this.markers, [value]);
			if (error !== undefined) {
				return this.wrapError(error, value);
			}
			if (!trackReferences && isArray(value)) {
				return this.wrapArray(value, false, false);
			}
			if (getPrototypeOf(value) === objectPrototype) {
				const type: unknown = reflectGet(value, TRANSFER_TYPE_KEY);
				if (reflectGet(value, TRANSFER_ESCAPED_KEY) === true && typeof type !== 'string') {
					return this.wrapEscape(value, trackReferences);
				}
				if (!trackReferences && type !== ERROR_TYPE) {
					return typeof type === 'string' ? value : this.wrapFields(value, false, false);
				}
			}
		}
		const entry = this.remember(value);
		entry.value = this.wrapObject(value, userData);
		return entry.value;
	}

	private wrapObject(value: object, userData: boolean): unknown {
		if (value instanceof NativeDate) {
			return {
				__isDate: true,
				__isoString: numberIsNaN(reflectApply(dateGetTime, value, []))
					? ''
					: reflectApply(dateToISOString, value, []),
			};
		}
		if (value instanceof NativeError) {
			const extra: Record<string, unknown> = {};
			const keys = objectKeys(value);
			for (let k = 0; k < keys.length; k++) {
				const key = keys[k];
				if (key !== 'name' && key !== 'message' && key !== 'stack') {
					defineOwnValue(extra, key, this.wrap(reflectGet(value, key), true, true));
				}
			}
			return { __isErrorValue: true, __name: value.name, __message: value.message, __extra: extra };
		}
		if (value instanceof NativeMap) {
			const entries: Array<[unknown, unknown]> = [];
			reflectApply(mapForEach, value, [
				(child: unknown, key: unknown) => {
					entries[entries.length] = [key, child];
				},
			]);
			// Encode outside the callback, so a nested Map uses less guest stack.
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				entry[0] = this.wrap(entry[0], true, true);
				entry[1] = this.wrap(entry[1], true, true);
			}
			return { __isMap: true, __entries: entries };
		}
		if (value instanceof NativeSet) {
			const values: unknown[] = [];
			reflectApply(setForEach, value, [
				(child: unknown) => {
					values[values.length] = child;
				},
			]);
			for (let i = 0; i < values.length; i++) {
				values[i] = this.wrap(values[i], true, true);
			}
			return { __isSet: true, __values: values };
		}
		if (isArray(value)) {
			return this.wrapArray(value, userData, true);
		}
		const boxed = encodeBoxedPrimitive(value);
		if (boxed !== undefined) {
			return boxed;
		}
		if (!userData) {
			const type: unknown = reflectGet(value, TRANSFER_TYPE_KEY);
			if (type === ERROR_TYPE) {
				return this.wrapErrorMarker(value);
			}
			if (typeof type === 'string') {
				return value;
			}
		}
		return this.wrapFields(value, userData, true);
	}

	private wrapEscape(wrapper: object, trackReferences: boolean): unknown {
		const payload: unknown = reflectGet(wrapper, '__value');
		const opaque = reflectGet(wrapper, TRANSFER_OPAQUE_KEY) === true;
		const track = opaque || trackReferences;
		let entry: ReferenceEntry | undefined;
		if (track) {
			const seen = (this.seen ??= new NativeMap());
			const existing: ReferenceEntry | undefined = reflectApply(mapGet, seen, [payload]);
			if (existing !== undefined) {
				reflectApply(mapSet, seen, [wrapper, existing]);
				return this.reference(existing);
			}
			entry = this.remember(wrapper);
			if (payload !== null && typeof payload === 'object') {
				reflectApply(mapSet, seen, [payload, entry]);
			}
		}
		const result: Record<string, unknown> = { [TRANSFER_ESCAPED_KEY]: true };
		if (opaque) {
			result[TRANSFER_OPAQUE_KEY] = true;
		}
		result.__value =
			payload !== null && typeof payload === 'object' && (opaque || !isArray(payload))
				? this.wrapFields(payload, opaque, track)
				: isArray(payload)
					? this.wrapArray(payload, false, track)
					: payload === undefined
						? undefined
						: this.wrap(payload, false, track);
		if (entry !== undefined) {
			entry.value = result;
		}
		return result;
	}

	private wrapArray(value: unknown[], userData: boolean, track: boolean): unknown[] {
		const result = new NativeArray<unknown>(value.length);
		for (let i = 0; i < value.length; i++) {
			if (i in value) {
				result[i] = this.wrap(value[i], userData, track);
			}
		}
		return result;
	}

	private wrapErrorMarker(marker: object): object {
		const result: Record<string, unknown> = {};
		const keys = objectKeys(marker);
		for (let k = 0; k < keys.length; k++) {
			const key = keys[k];
			const value: unknown = reflectGet(marker, key);
			defineOwnValue(
				result,
				key,
				key === '__props' || key === '__cause' || key === '__json'
					? this.wrap(value, false, true)
					: value,
			);
		}
		return result;
	}

	private wrapFields(value: object, userData: boolean, track: boolean): object {
		const result: Record<string, unknown> = {};
		let escape = false;
		const keys = objectKeys(value);
		for (let k = 0; k < keys.length; k++) {
			const key = keys[k];
			if (
				isQuickJsMarkerKey(key) ||
				(userData &&
					(key === '__isError' ||
						key === TRANSFER_TYPE_KEY ||
						key === TRANSFER_ESCAPED_KEY ||
						key === TRANSFER_OPAQUE_KEY))
			) {
				escape = true;
			}
			defineOwnValue(result, key, this.wrap(reflectGet(value, key), userData, track));
		}
		return escape ? { __isEscaped: true, __value: result } : result;
	}
}

function isQuickJsMarkerKey(key: string): boolean {
	return (
		key === '__isDate' ||
		key === '__isNaN' ||
		key === '__isUndefined' ||
		key === '__isBoxedPrimitive' ||
		key === '__isErrorValue' ||
		key === '__isMap' ||
		key === '__isSet' ||
		key === '__isEscaped' ||
		key === '__isRef' ||
		key === '__isRefDef'
	);
}

function encodeBoxedPrimitive(value: object): object | undefined {
	const primitive = unboxPrimitive(value);
	if (primitive === undefined) {
		return undefined;
	}
	let encoded: unknown = primitive;
	if (typeof primitive === 'number') {
		encoded = sameValue(primitive, -0)
			? '-0'
			: isFiniteNumber(primitive)
				? primitive
				: toString(primitive);
	} else if (typeof primitive === 'bigint' && bigIntValueOf !== undefined) {
		encoded = reflectApply(bigIntToString, primitive, []);
	}
	return { __isBoxedPrimitive: typeof primitive, __value: encoded };
}

function attachDefinitions(value: unknown, definitions: Map<object, number>): unknown {
	if (value === null || typeof value !== 'object') {
		return value;
	}
	const keys = objectKeys(value);
	for (let k = 0; k < keys.length; k++) {
		const key = keys[k];
		const child: unknown = reflectGet(value, key);
		const next = attachDefinitions(child, definitions);
		if (next !== child) {
			defineOwnValue(value, key, next);
		}
	}
	const id: number | undefined = reflectApply(mapGet, definitions, [value]);
	return id === undefined ? value : { __isRefDef: true, __id: id, __value: value };
}

/** A parsed JSON object or array. Every key is an own data property. */
function isJsonContainer(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

/** Record the result that a reference definition names. */
function registerDefinition<T>(
	refs: Map<number, unknown>,
	definition: number | undefined,
	result: T,
): T {
	if (definition !== undefined) {
		reflectApply(mapSet, refs, [definition, result]);
	}
	return result;
}

/** Register each empty container before decoding its children. */
function decodeHostValue(value: unknown, refs: Map<number, unknown>, definition?: number): unknown {
	if (!isJsonContainer(value)) {
		return value;
	}
	if (value.__isRefDef === true && typeof value.__id === 'number') {
		return registerDefinition(refs, definition, decodeHostValue(value.__value, refs, value.__id));
	}
	if (value.__isRef === true && typeof value.__id === 'number') {
		return registerDefinition(refs, definition, reflectApply(mapGet, refs, [value.__id]));
	}
	if (value.__isDate === true && typeof value.__isoString === 'string') {
		return registerDefinition(refs, definition, new NativeDate(value.__isoString));
	}
	if (value.__isNaN === true) {
		return NaN;
	}
	switch (value.__isBoxedPrimitive) {
		case 'string':
		case 'boolean':
			return registerDefinition(refs, definition, toObject(value.__value));
		case 'number':
			return registerDefinition(refs, definition, toObject(toNumber(value.__value)));
		case 'bigint':
			if (typeof value.__value === 'string') {
				return registerDefinition(refs, definition, toObject(toBigInt(value.__value)));
			}
	}
	if (value.__isMap === true && isArray(value.__entries)) {
		const entries = value.__entries;
		const result = registerDefinition(refs, definition, new NativeMap<unknown, unknown>());
		for (let i = 0; i < entries.length; i++) {
			const pair: unknown = entries[i];
			if (isArray(pair)) {
				reflectApply(mapSet, result, [
					decodeHostValue(pair[0], refs),
					decodeHostValue(pair[1], refs),
				]);
			}
		}
		return result;
	}
	if (value.__isSet === true && isArray(value.__values)) {
		const values = value.__values;
		const result = registerDefinition(refs, definition, new NativeSet<unknown>());
		for (let i = 0; i < values.length; i++) {
			reflectApply(setAdd, result, [decodeHostValue(values[i], refs)]);
		}
		return result;
	}
	if (value.__isKeyedArray === true && isArray(value.__items)) {
		const result = registerDefinition<unknown[]>(refs, definition, []);
		decodeItems(value.__items, result, refs);
		decodeFields(value.__props, result, refs);
		return result;
	}
	if (value.__isEscaped === true) {
		const result = registerDefinition(refs, definition, {});
		decodeFields(value.__value, result, refs);
		return result;
	}
	if (isArray(value)) {
		const result = registerDefinition(refs, definition, new NativeArray<unknown>(value.length));
		decodeItems(value, result, refs);
		return result;
	}
	const result = registerDefinition(refs, definition, {});
	decodeFields(value, result, refs);
	return result;
}

function decodeItems(items: unknown[], result: unknown[], refs: Map<number, unknown>): void {
	for (let i = 0; i < items.length; i++) {
		result[i] = decodeHostValue(items[i], refs);
	}
}

function decodeFields(value: unknown, result: object, refs: Map<number, unknown>): void {
	if (isJsonContainer(value)) {
		const keys = objectKeys(value);
		for (let i = 0; i < keys.length; i++) {
			defineOwnValue(result, keys[i], decodeHostValue(value[keys[i]], refs));
		}
	}
}

/** Install the JSON transport only in QuickJS. The V8 path uses structured clone. */
export function installQuickJsTransfer(): void {
	globalThis.__prepareForTransfer = (value) => {
		if (typeof value === 'function') {
			throw new NativeTypeError(`${toString(value)} could not be cloned`);
		}
		if (numberIsNaN(value)) {
			return { __isNaN: true };
		}
		return value === null || typeof value !== 'object' ? value : new ResultEncoder().encode(value);
	};
	globalThis.__unwrapFromHost = (json, holdsSentinel) => {
		const parsed = parseJSON(json);
		return holdsSentinel ? decodeHostValue(parsed, new NativeMap()) : parsed;
	};
}
