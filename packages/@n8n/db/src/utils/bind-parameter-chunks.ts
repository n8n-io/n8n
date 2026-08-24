/** Leaves room under SQLite's 32,766-parameter limit for three binds per id. */
export const DEFAULT_ID_CHUNK_SIZE = 10_000;

/** Splits ids into bind-safe query batches. */
export function idChunks<T>(ids: T[], size = DEFAULT_ID_CHUNK_SIZE): T[][] {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError('ID chunk size must be a positive integer');
	}
	if (ids.length <= size) return ids.length === 0 ? [] : [ids];

	const chunks: T[][] = [];
	for (let i = 0; i < ids.length; i += size) {
		chunks.push(ids.slice(i, i + size));
	}
	return chunks;
}
