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
