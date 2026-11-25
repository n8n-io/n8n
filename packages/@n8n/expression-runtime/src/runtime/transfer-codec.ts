import { isErrorTransferSentinel, rebuildErrorValue } from './error-transfer';
import {
	boxPrimitive,
	getPrototypeOf,
	isArray,
	objectCreate,
	objectEntries,
	setPrototypeOf,
} from './intrinsics';
import { decodeLuxonSentinel } from './luxon-transfer';
import type { SentinelDecoder, TransferSentinel } from './transfer';
import {
	defineOwnValue,
	transferTypeOf,
	TRANSFER_TYPE_KEY,
	TRANSFER_VALUE_KEY,
	unboxPrimitive,
	unwrapTransferSentinels,
} from './transfer';

/** Names the wrapper the host puts around a value that holds markers. */
export const HOST_VALUE_TYPE = 'HostValue';

/** Names the wrapper the host puts around data that holds no framing key. */
export const HOST_DATA_TYPE = 'HostData';

/** Names the marker the host emits for a boxed primitive with own or inherited fields. */
export const BOXED_VALUE_TYPE = 'BoxedPrimitive';

interface HostValue extends TransferSentinel {
	[TRANSFER_VALUE_KEY]: unknown;
}

export interface BoxedValueSentinel extends TransferSentinel {
	[TRANSFER_TYPE_KEY]: typeof BOXED_VALUE_TYPE;
	[TRANSFER_VALUE_KEY]: unknown;
	__props?: unknown;
	__hiddenKeys?: string[];
	__protoProps?: unknown;
	__protoHiddenKeys?: string[];
}

function isHostValue(value: unknown): value is HostValue {
	return transferTypeOf(value) === HOST_VALUE_TYPE;
}

function isBoxedTransferSentinel(value: unknown): value is BoxedValueSentinel {
	return transferTypeOf(value) === BOXED_VALUE_TYPE;
}

function copyBoxedFields(
	target: object,
	rawProps: unknown,
	rawHiddenKeys: unknown,
	decodeChild: (value: unknown) => unknown,
): void {
	if (rawProps === undefined) return;
	const decoded = decodeChild(rawProps);
	if (typeof decoded !== 'object' || decoded === null) return;
	const hiddenKeys = objectCreate(null) as Record<string, true>;
	if (isArray(rawHiddenKeys)) {
		for (let i = 0; i < rawHiddenKeys.length; i++) {
			const key: unknown = rawHiddenKeys[i];
			if (typeof key === 'string') {
				hiddenKeys[key] = true;
			}
		}
	}
	for (const [key, value] of objectEntries(decoded)) {
		defineOwnValue(target, key, value, hiddenKeys[key] !== true);
	}
}

function rebuildBoxedValue(
	sentinel: BoxedValueSentinel,
	decodeChild: (value: unknown) => unknown,
): unknown {
	const raw: unknown = sentinel[TRANSFER_VALUE_KEY];
	const primitive = typeof raw === 'object' && raw !== null ? unboxPrimitive(raw) : undefined;
	if (primitive === undefined) return sentinel;

	const target = boxPrimitive(primitive);
	copyBoxedFields(target, sentinel.__props, sentinel.__hiddenKeys, decodeChild);
	if (sentinel.__protoProps !== undefined) {
		const subProto = objectCreate(getPrototypeOf(target)) as object;
		copyBoxedFields(subProto, sentinel.__protoProps, sentinel.__protoHiddenKeys, decodeChild);
		setPrototypeOf(target, subProto);
	}
	return target;
}

/** Rebuild a real instance from any marker the runtime writes. */
export const decodeTransferSentinel: SentinelDecoder = (sentinel, decodeChild) =>
	isErrorTransferSentinel(sentinel)
		? rebuildErrorValue(sentinel, decodeChild)
		: decodeLuxonSentinel(sentinel);

const decodeHostSentinel: SentinelDecoder = (sentinel, decodeChild) =>
	isBoxedTransferSentinel(sentinel)
		? rebuildBoxedValue(sentinel, decodeChild)
		: decodeTransferSentinel(sentinel, decodeChild);

/** Walk a transferred value and rebuild every instance a marker in it carries. */
export function unwrapTransferredValue(value: unknown): unknown {
	return unwrapTransferSentinels(value, decodeTransferSentinel);
}

export function isHostData(value: unknown): value is HostValue {
	return transferTypeOf(value) === HOST_DATA_TYPE;
}

/**
 * Read a value a host callback returned.
 *
 * The host wraps a value that holds markers, and the walk rebuilds them. Data in
 * the data wrapper is given back without a walk. A value without a wrapper is
 * user data as it is, whatever keys it holds.
 */
export function decodeHostValue(value: unknown): unknown {
	if (isHostData(value)) {
		return value[TRANSFER_VALUE_KEY];
	}
	return isHostValue(value)
		? unwrapTransferSentinels(value[TRANSFER_VALUE_KEY], decodeHostSentinel)
		: value;
}
