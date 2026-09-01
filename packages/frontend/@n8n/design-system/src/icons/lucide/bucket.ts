/**
 * Icon names are partitioned into a fixed number of buckets by name hash. The
 * Vite plugin (`./vite.ts`) emits one virtual module per bucket, and the
 * runtime loader (`./index.ts`) uses the same function to know which bucket to
 * import for a given icon — sharing this module is what keeps the two in sync.
 *
 * FNV-1a is stable per name, so adding or removing icons never moves existing
 * names between buckets; an icon set update only invalidates the chunks whose
 * contents actually changed.
 */

/** Changing this reshuffles every bucket → one-time full cache bust on deploy. */
export const BUCKET_COUNT = 16;

/** FNV-1a 32-bit hash of the icon name, mapped onto [0, BUCKET_COUNT). */
export function getBucketIndex(name: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < name.length; index++) {
		hash ^= name.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0) % BUCKET_COUNT;
}
