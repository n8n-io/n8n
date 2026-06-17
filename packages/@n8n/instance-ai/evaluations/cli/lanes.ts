// ---------------------------------------------------------------------------
// Lane partitioning helpers for multi-container eval runs
//
// Pure functions, intentionally separated from index.ts so unit tests can
// import them without triggering main()'s side effects.
// ---------------------------------------------------------------------------

/**
 * Partition `items` into `laneCount` round-robin buckets by source-order index.
 * Item at index i goes to bucket `i % laneCount`.
 *
 * Empty buckets are returned (not omitted) when laneCount > items.length so
 * callers can safely zip buckets with their lanes.
 */
export function partitionRoundRobin<T>(items: T[], laneCount: number): T[][] {
	if (laneCount < 1) {
		throw new Error(`laneCount must be >= 1, got ${String(laneCount)}`);
	}
	return Array.from({ length: laneCount }, (_, laneIdx) =>
		items.filter((_, i) => i % laneCount === laneIdx),
	);
}

/**
 * Yield items grouped by file in a round-robin order across files, with each
 * item duplicated `iterations` times via `tag`. Pure ordering logic — caller
 * provides the file accessor and the tagger.
 *
 * Order: round 1 = first item of each group, round 2 = second item of each
 * group, etc. Within each yielded item, all `iterations` copies are emitted
 * consecutively before moving to the next item.
 */
export function* expandWithIterations<T>(
	items: T[],
	getFile: (item: T) => string,
	iterations: number,
	tag: (item: T, iter: number) => T,
): IterableIterator<T> {
	const byFile = new Map<string, T[]>();
	for (const item of items) {
		const file = getFile(item);
		let group = byFile.get(file);
		if (!group) {
			group = [];
			byFile.set(file, group);
		}
		group.push(item);
	}
	const groups = [...byFile.values()];
	const maxScenarios = groups.reduce((m, g) => Math.max(m, g.length), 0);
	for (let s = 0; s < maxScenarios; s++) {
		for (const group of groups) {
			if (s < group.length) {
				const item = group[s];
				for (let i = 0; i < iterations; i++) yield tag(item, i);
			}
		}
	}
}
