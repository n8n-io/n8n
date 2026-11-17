export type AutomationSortBy = 'updatedAt:desc' | 'createdAt:desc' | 'name:asc' | 'name:desc';

export interface SortableRow {
	name: string;
	updatedAt: string | number | Date;
	createdAt: string | number | Date;
}

const time = (value: string | number | Date) => new Date(value).getTime();

/** Orders rows the same way as the list API does for each sort option */
export function compareRowsBy(sortBy: string) {
	return (a: SortableRow, b: SortableRow): number => {
		switch (sortBy) {
			case 'createdAt:desc':
				return time(b.createdAt) - time(a.createdAt);
			case 'name:asc':
				return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
			case 'name:desc':
				return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
			case 'updatedAt:desc':
			default:
				return time(b.updatedAt) - time(a.updatedAt);
		}
	};
}

export interface SortedStream<T> {
	/** The rows loaded so far, in sort order */
	rows: T[];
	/** True when the stream has no more rows to load */
	done: boolean;
}

/**
 * Merges streams of rows that each load in batches and are each in sort order.
 *
 * A row shows only when no stream can still load a row that sorts before it, so the merged
 * order does not change as more batches load. A stream that is not done holds back every row
 * that sorts after its last loaded row.
 */
export function mergeSortedStreams<T>(
	streams: Array<SortedStream<T>>,
	compare: (a: T, b: T) => number,
): T[] {
	const merged = streams.flatMap((stream) => stream.rows).sort(compare);

	const horizons: T[] = [];
	for (const stream of streams) {
		if (stream.done) continue;
		const last = stream.rows.at(-1);
		// A stream that is not done but has no rows yet can still start with any row.
		if (last === undefined) return [];
		horizons.push(last);
	}

	return merged.filter((row) => horizons.every((horizon) => compare(row, horizon) <= 0));
}
