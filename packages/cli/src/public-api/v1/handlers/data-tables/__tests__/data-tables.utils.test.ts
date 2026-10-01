import { stringifyQuery } from '../data-tables.utils';

describe('stringifyQuery', () => {
	it('converts values to strings', () => {
		expect(stringifyQuery({ limit: 10, sortBy: 'id', includeCount: true })).toEqual({
			limit: '10',
			sortBy: 'id',
			includeCount: 'true',
		});
	});

	it('drops undefined and null values', () => {
		expect(stringifyQuery({ limit: 10, cursor: undefined, filter: null })).toEqual({
			limit: '10',
		});
	});

	it('returns an empty object for an empty query', () => {
		expect(stringifyQuery({})).toEqual({});
	});
});
