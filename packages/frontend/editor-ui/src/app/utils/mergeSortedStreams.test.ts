import { compareRowsBy, mergeSortedStreams, type SortableRow } from './mergeSortedStreams';

const row = (name: string, updatedAt: string, createdAt = updatedAt): SortableRow => ({
	name,
	updatedAt,
	createdAt,
});
const names = (rows: SortableRow[]) => rows.map((r) => r.name);

describe('compareRowsBy', () => {
	it('sorts by the newest update, the newest creation, or the name', () => {
		const a = row('alpha', '2026-01-02', '2026-01-01');
		const b = row('Beta', '2026-01-01', '2026-01-03');

		expect(names([b, a].sort(compareRowsBy('updatedAt:desc')))).toEqual(['alpha', 'Beta']);
		expect(names([a, b].sort(compareRowsBy('createdAt:desc')))).toEqual(['Beta', 'alpha']);
		expect(names([b, a].sort(compareRowsBy('name:asc')))).toEqual(['alpha', 'Beta']);
		expect(names([a, b].sort(compareRowsBy('name:desc')))).toEqual(['Beta', 'alpha']);
	});
});

describe('mergeSortedStreams', () => {
	const compare = compareRowsBy('updatedAt:desc');

	it('interleaves done streams by the sort order', () => {
		const merged = mergeSortedStreams(
			[
				{ rows: [row('w1', '2026-01-05'), row('w2', '2026-01-02')], done: true },
				{ rows: [row('a1', '2026-01-04'), row('a2', '2026-01-01')], done: true },
			],
			compare,
		);

		expect(names(merged)).toEqual(['w1', 'a1', 'w2', 'a2']);
	});

	it('holds back rows that sort after the last row of a stream that is not done', () => {
		const merged = mergeSortedStreams(
			[
				{ rows: [row('w1', '2026-01-05'), row('w2', '2026-01-03')], done: false },
				{ rows: [row('a1', '2026-01-04'), row('a2', '2026-01-01')], done: true },
			],
			compare,
		);

		// `a2` waits: the next workflow batch can still hold rows newer than it.
		expect(names(merged)).toEqual(['w1', 'a1', 'w2']);
	});

	it('shows nothing while a stream that is not done has no rows yet', () => {
		const merged = mergeSortedStreams(
			[
				{ rows: [], done: false },
				{ rows: [row('a1', '2026-01-04')], done: true },
			],
			compare,
		);

		expect(merged).toEqual([]);
	});

	it('shows every row once all streams are done', () => {
		const merged = mergeSortedStreams(
			[
				{ rows: [], done: true },
				{ rows: [row('a1', '2026-01-04')], done: true },
			],
			compare,
		);

		expect(names(merged)).toEqual(['a1']);
	});
});
