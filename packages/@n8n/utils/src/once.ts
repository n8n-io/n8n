/**
 * Wraps `read` so that it runs at the first call only. Each later call gives the same value,
 * also when that value is `undefined`. When `read` throws, the next call runs it again.
 */
export function once<T>(read: () => T): () => T {
	const cell: { result?: { readonly value: T } } = {};
	return () => (cell.result ??= { value: read() }).value;
}
