import { parseListQuerySortBy } from '../list-query-sort';

describe('parseListQuerySortBy', () => {
	it.each([
		['createdAt:desc', { column: 'createdAt', direction: 'DESC' }],
		['createdAt:DESC', { column: 'createdAt', direction: 'DESC' }],
		['name:asc', { column: 'name', direction: 'ASC' }],
		['name:ASC', { column: 'name', direction: 'ASC' }],
		['updatedAt', { column: 'updatedAt', direction: 'ASC' }],
		['name:foo', { column: 'name', direction: 'ASC' }],
	] as const)('parses %s', (sortBy, expected) => {
		expect(parseListQuerySortBy(sortBy)).toEqual(expected);
	});
});
