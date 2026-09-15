/**
 * The fields of a tar entry the filter looks at. `tar` types the entry as
 * `ReadEntry | Stats` because the same option serves packing; on extraction it
 * is always a `ReadEntry`, which carries `type`.
 */
type TarEntryLike = { type?: string; size: number };

type DistTarLimits = { maxEntries: number; maxBytes: number };

export const DIST_TAR_LIMITS: DistTarLimits = { maxEntries: 5_000, maxBytes: 50 * 1024 * 1024 };

const isAbsolute = (entryPath: string) =>
	entryPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(entryPath);

const hasParentSegment = (entryPath: string) => entryPath.split(/[\\/]/).includes('..');

/**
 * Builds the `filter` for extracting a dist tarball. A rejected entry is
 * skipped, never written. Rejected: paths that could land outside the target
 * directory, anything that is not a plain file or directory (no links, no
 * devices), and everything past the entry-count or unpacked-size limit.
 *
 * Stateful by design: the limits count across the entries of one archive, so
 * one predicate serves one extraction.
 */
export function createDistTarFilter(limits: DistTarLimits = DIST_TAR_LIMITS) {
	let entries = 0;
	let bytes = 0;

	return (entryPath: string, entry: TarEntryLike): boolean => {
		if (isAbsolute(entryPath) || hasParentSegment(entryPath)) return false;
		if (entry.type !== 'File' && entry.type !== 'Directory') return false;
		if (entries + 1 > limits.maxEntries || bytes + entry.size > limits.maxBytes) return false;

		entries += 1;
		bytes += entry.size;
		return true;
	};
}
