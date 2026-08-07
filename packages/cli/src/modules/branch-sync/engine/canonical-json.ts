/**
 * Canonical JSON for the branch-sync POC (LIGO-819, D006).
 *
 * The tracked repo's files must be byte-stable for a given logical content, so
 * that `git diff --name-status` over serialized packages is a trustworthy
 * per-resource change detector: identical independent edits must diff clean.
 */

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, sortValue((value as Record<string, unknown>)[key])]),
		);
	}
	return value;
}

/** Compact canonical form — identity comparison inside the engine. */
export function canon(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

/** Pretty canonical form — the on-disk file content in the tracked repo. */
export function canonicalStringify(value: unknown): string {
	return JSON.stringify(sortValue(value), null, 2) + '\n';
}
