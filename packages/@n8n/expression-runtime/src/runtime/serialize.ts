import { errorToSentinel } from './error-transfer';
import {
	isArray,
	mapDelete,
	mapGet,
	mapHas,
	mapSet,
	NativeMap,
	NativeSet,
	objectKeys,
	reflectApply,
	setAdd,
	setDelete,
	setHas,
} from './intrinsics';
import { encodeLuxonValue } from './luxon-transfer';
import type { ObjectWalk, SentinelEncoder } from './transfer';
import {
	defineOwnValue,
	encodeOnce,
	isPlainObject,
	isStructuredCloneBuiltin,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_VALUE_KEY,
	newObjectWalk,
} from './transfer';

/**
 * The types that go across as a marker. Each encoder claims the values it owns
 * and passes on every other, so a new type is one entry here.
 */
const ENCODERS: SentinelEncoder[] = [encodeLuxonValue];

function encode(value: object): object | undefined {
	for (const encoder of ENCODERS) {
		const sentinel = encoder(value);
		if (sentinel !== undefined) return sentinel;
	}
	return undefined;
}

export type ErrorEncodedHook = (error: Error, sentinel: object) => void;

export interface PrepareTransferOptions {
	/** Called for each encoded Error whose output was not truncated by an enclosing cycle. */
	onEncodeError?: ErrorEncodedHook;
	/** Called when a plain object or array refers back to itself outside an Error. */
	onPlainCycle?: () => never;
}

interface TrackedErrorWalk {
	done: Map<object, unknown>;
	open: Map<object, number>;
	cut: Map<object, number>;
	minCutStack: number[];
	seq: number;
}

interface PlainCycleGuard {
	open: Set<object>;
	onCycle: () => never;
}

function newTrackedErrorWalk(): TrackedErrorWalk {
	return {
		done: new NativeMap(),
		open: new NativeMap(),
		cut: new NativeMap(),
		minCutStack: [],
		seq: 0,
	};
}

function recordCut(walk: TrackedErrorWalk, cutId: number): void {
	const top = walk.minCutStack.length - 1;
	if (top >= 0 && cutId < walk.minCutStack[top]) {
		walk.minCutStack[top] = cutId;
	}
}

/**
 * Prepare a value for transfer across the V8 isolate boundary.
 *
 * isolated-vm's `copy: true` uses structured clone, which strips prototypes
 * from non-standard types. A class instance such as a luxon DateTime loses its
 * class identity and arrives on the host as a plain object.
 *
 * This function recursively walks a value and converts each such type into a
 * structured-cloneable marker object. The host rebuilds a real instance from
 * the marker. It runs inside the isolate before the result is transferred.
 *
 * Note: JS Date objects survive structured clone with prototype intact
 * (Date is a standard structured-cloneable type) and are not converted.
 *
 * Outside an Error, this walk does not record the objects it has seen, because
 * expression results are not expected to refer to themselves. Inside an Error
 * it records them: an Error can hold itself, and a host Error can share objects.
 */
export function __prepareForTransfer(value: unknown, options?: PrepareTransferOptions): unknown {
	const plainGuard: PlainCycleGuard | undefined = options?.onPlainCycle
		? { open: new NativeSet(), onCycle: options.onPlainCycle }
		: undefined;
	return prepareValue(value, undefined, undefined, plainGuard, options?.onEncodeError);
}

function prepareValue(
	value: unknown,
	walk: ObjectWalk | undefined,
	trackedWalk: TrackedErrorWalk | undefined,
	plainGuard: PlainCycleGuard | undefined,
	onEncodeError: ErrorEncodedHook | undefined,
): unknown {
	const inError = walk !== undefined || trackedWalk !== undefined;
	// An unsupported child must not prevent its Error from crossing the boundary.
	if (
		inError &&
		(typeof value === 'function' || typeof value === 'symbol' || value instanceof Promise)
	) {
		return undefined;
	}
	if (value === null || typeof value !== 'object') {
		return value;
	}
	if (trackedWalk !== undefined) {
		return encodeTracked(value, trackedWalk, onEncodeError!);
	}
	if (walk !== undefined) {
		return encodeOnce(value, walk, (object) =>
			prepareObject(object, walk, undefined, undefined, undefined),
		);
	}
	if (value instanceof Error) {
		if (onEncodeError !== undefined) {
			return encodeTracked(value, newTrackedErrorWalk(), onEncodeError);
		}
		const errorWalk = newObjectWalk();
		return encodeOnce(value, errorWalk, (object) =>
			prepareObject(object, errorWalk, undefined, undefined, undefined),
		);
	}
	return prepareObject(value, undefined, undefined, plainGuard, onEncodeError);
}

function encodeTracked(
	value: object,
	walk: TrackedErrorWalk,
	onEncodeError: ErrorEncodedHook,
): unknown {
	const openId: unknown = reflectApply(mapGet, walk.open, [value]);
	if (typeof openId === 'number') {
		recordCut(walk, openId);
		return undefined;
	}
	if (reflectApply(mapHas, walk.done, [value])) {
		const cachedCut: unknown = reflectApply(mapGet, walk.cut, [value]);
		if (typeof cachedCut === 'number') {
			recordCut(walk, cachedCut);
		}
		return reflectApply(mapGet, walk.done, [value]);
	}
	const startSeq = ++walk.seq;
	reflectApply(mapSet, walk.open, [value, startSeq]);
	walk.minCutStack.push(Infinity);
	let encoded: unknown;
	let minCut = Infinity;
	try {
		encoded = prepareObject(value, undefined, walk, undefined, onEncodeError);
	} finally {
		minCut = walk.minCutStack.pop() ?? Infinity;
		reflectApply(mapDelete, walk.open, [value]);
	}
	if (minCut < startSeq) {
		reflectApply(mapSet, walk.cut, [value, minCut]);
		recordCut(walk, minCut);
	}
	reflectApply(mapSet, walk.done, [value, encoded]);
	// Report only Error markers that did not lose fields to an enclosing open object.
	if (
		value instanceof Error &&
		minCut >= startSeq &&
		encoded !== null &&
		typeof encoded === 'object'
	) {
		onEncodeError(value, encoded);
	}
	return encoded;
}

function prepareObject(
	value: object,
	walk: ObjectWalk | undefined,
	trackedWalk: TrackedErrorWalk | undefined,
	plainGuard: PlainCycleGuard | undefined,
	onEncodeError: ErrorEncodedHook | undefined,
): unknown {
	const prepareChild = (child: unknown) =>
		prepareValue(child, walk, trackedWalk, plainGuard, onEncodeError);
	const sentinel = encode(value);
	if (sentinel !== undefined) return sentinel;

	if (value instanceof Error) {
		return errorToSentinel(value, prepareChild);
	}

	if (isArray(value)) {
		if (plainGuard !== undefined) {
			if (reflectApply(setHas, plainGuard.open, [value])) plainGuard.onCycle();
			reflectApply(setAdd, plainGuard.open, [value]);
		}
		try {
			const result: unknown[] = [];
			result.length = value.length;
			for (let i = 0; i < value.length; i++) {
				if (i in value) result[i] = prepareChild(value[i]);
			}
			return result;
		} finally {
			if (plainGuard !== undefined) reflectApply(setDelete, plainGuard.open, [value]);
		}
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

	if (plainGuard !== undefined) {
		if (reflectApply(setHas, plainGuard.open, [value])) plainGuard.onCycle();
		reflectApply(setAdd, plainGuard.open, [value]);
	}
	try {
		const result: Record<string, unknown> = {};
		let collides = false;
		for (const key of objectKeys(value)) {
			if (TRANSFER_FRAMING_KEYS.includes(key)) collides = true;
			defineOwnValue(result, key, prepareChild(value[key]));
		}
		// User data can hold the same keys as our framing. Escape such an object, so
		// the host reads the object itself as data but still walks what is inside it.
		return collides ? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: result } : result;
	} finally {
		if (plainGuard !== undefined) reflectApply(setDelete, plainGuard.open, [value]);
	}
}
