import { bindStringList, inBoundStringList } from '../bound-list';

describe('bindStringList', () => {
	it('binds an array on postgres and a JSON array on sqlite', () => {
		expect(bindStringList(true, ['a', 'b'])).toEqual(['a', 'b']);
		expect(bindStringList(false, ['a', 'b'])).toBe('["a","b"]');
	});
});

describe('inBoundStringList', () => {
	it('matches the bound list as one parameter', () => {
		expect(inBoundStringList(true, 'ids')).toBe('= ANY(CAST(:ids AS text[]))');
		expect(inBoundStringList(false, 'ids')).toBe('IN (SELECT value FROM json_each(:ids))');
	});
});
