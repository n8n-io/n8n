import { isErrorTransferSentinel, rebuildErrorValue } from './error-transfer';
import { decodeLuxonSentinel } from './luxon-transfer';
import type { SentinelDecoder } from './transfer';
import { unwrapTransferSentinels } from './transfer';

/** Rebuild a real instance from any marker the runtime writes. */
export const decodeTransferSentinel: SentinelDecoder = (sentinel, decodeChild) =>
	isErrorTransferSentinel(sentinel)
		? rebuildErrorValue(sentinel, decodeChild)
		: decodeLuxonSentinel(sentinel);

/** Walk a transferred value and rebuild every instance a marker in it carries. */
export function unwrapTransferredValue(value: unknown): unknown {
	return unwrapTransferSentinels(value, decodeTransferSentinel);
}
