import { isErrorTransferSentinel, rebuildErrorValue } from './error-transfer';
import { decodeLuxonSentinel } from './luxon-transfer';
import type { SentinelDecoder, TransferSentinel } from './transfer';
import { transferTypeOf, TRANSFER_VALUE_KEY, unwrapTransferSentinels } from './transfer';

/** Names the wrapper the host puts around a value that holds markers. */
export const HOST_VALUE_TYPE = 'HostValue';

interface HostValue extends TransferSentinel {
	[TRANSFER_VALUE_KEY]: unknown;
}

function isHostValue(value: unknown): value is HostValue {
	return transferTypeOf(value) === HOST_VALUE_TYPE;
}

/** Rebuild a real instance from any marker the runtime writes. */
export const decodeTransferSentinel: SentinelDecoder = (sentinel, decodeChild) =>
	isErrorTransferSentinel(sentinel)
		? rebuildErrorValue(sentinel, decodeChild)
		: decodeLuxonSentinel(sentinel);

/** Walk a transferred value and rebuild every instance a marker in it carries. */
export function unwrapTransferredValue(value: unknown): unknown {
	return unwrapTransferSentinels(value, decodeTransferSentinel);
}

/**
 * Read a value a host callback returned.
 *
 * The host wraps a value only when it holds markers, so a value without the
 * wrapper is user data as it is, whatever keys it holds.
 */
export function decodeHostValue(value: unknown): unknown {
	return isHostValue(value) ? unwrapTransferredValue(value[TRANSFER_VALUE_KEY]) : value;
}
