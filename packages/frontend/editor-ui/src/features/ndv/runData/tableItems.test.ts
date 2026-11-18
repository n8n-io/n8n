import type { IDataObject } from 'n8n-workflow';

import { inferColumnTypes, sortAndFilterTableItems, type TableItem } from './tableItems';

const items = (...jsons: IDataObject[]): TableItem[] =>
	jsons.map((json, index) => ({ item: { json }, index }));

const indexes = (tableItems: TableItem[]) => tableItems.map(({ index }) => index);

describe('inferColumnTypes', () => {
	it('should give a column the type of its values', () => {
		expect(
			inferColumnTypes([
				{ json: { age: 1, active: true, name: 'a', tags: ['x'], user: { id: 1 } } },
				{ json: { age: 2, active: false, name: 'b', tags: [], user: null } },
			]),
		).toEqual({ age: 'number', active: 'boolean', name: 'string', tags: 'json', user: 'json' });
	});

	it('should use string for columns with mixed value types', () => {
		expect(inferColumnTypes([{ json: { value: 1 } }, { json: { value: 'one' } }])).toEqual({
			value: 'string',
		});
	});

	it('should use string for columns that only have missing values', () => {
		expect(inferColumnTypes([{ json: { note: null } }, { json: {} }])).toEqual({ note: 'string' });
	});

	it('should ignore missing values', () => {
		expect(inferColumnTypes([{ json: { age: null } }, { json: {} }, { json: { age: 3 } }])).toEqual(
			{ age: 'number' },
		);
	});
});

describe('sortAndFilterTableItems', () => {
	const types = { age: 'number', name: 'string' } as const;

	it('should return the items unchanged without sort and filters', () => {
		const tableItems = items({ age: 2 }, { age: 1 });

		expect(sortAndFilterTableItems(tableItems, null, [], types)).toEqual(tableItems);
	});

	it('should sort by a column and keep the item indexes', () => {
		const tableItems = items({ age: 2 }, { age: 10 }, { age: 1 });

		expect(
			indexes(sortAndFilterTableItems(tableItems, { field: 'age', direction: 'asc' }, [], types)),
		).toEqual([2, 0, 1]);
		expect(
			indexes(sortAndFilterTableItems(tableItems, { field: 'age', direction: 'desc' }, [], types)),
		).toEqual([1, 0, 2]);
	});

	it('should keep the original order for equal values', () => {
		const tableItems = items({ age: 1 }, { age: 0 }, { age: 1 });

		expect(
			indexes(sortAndFilterTableItems(tableItems, { field: 'age', direction: 'desc' }, [], types)),
		).toEqual([0, 2, 1]);
	});

	it('should keep only the items that match all filters', () => {
		const tableItems = items(
			{ age: 30, name: 'Alice' },
			{ age: 20, name: 'Alina' },
			{ age: 40, name: 'Bob' },
		);

		expect(
			indexes(
				sortAndFilterTableItems(
					tableItems,
					null,
					[
						{ field: 'name', operator: 'contains', value: 'ali' },
						{ field: 'age', operator: 'greaterThan', value: 25 },
					],
					types,
				),
			),
		).toEqual([0]);
	});

	it('should treat columns without a known type as text', () => {
		const tableItems = items({ code: 'b' }, { code: 'a' });

		expect(
			indexes(sortAndFilterTableItems(tableItems, { field: 'code', direction: 'asc' }, [], {})),
		).toEqual([1, 0]);
	});
});
