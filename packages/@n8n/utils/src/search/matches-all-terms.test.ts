import { matchesAllTerms, splitSearchTerms } from './matches-all-terms';

describe('splitSearchTerms', () => {
	it('splits on any whitespace and drops empty terms', () => {
		expect(splitSearchTerms('  John \t DOE  ')).toEqual(['John', 'DOE']);
	});

	it('returns no terms for a blank query', () => {
		expect(splitSearchTerms('   ')).toEqual([]);
	});
});

describe('matchesAllTerms', () => {
	const fields = ['José', 'Doe', 'jose.doe@example.com'];

	it.each([
		['', true],
		['   ', true],
		['jose', true],
		['JOSÉ', true],
		['jose doe', true],
		['doe jose', true],
		['  doe  ', true],
		['example.com jos', true],
		['jose smith', false],
		['josedoe', false],
	])('query %j returns %s', (query, expected) => {
		expect(matchesAllTerms(query, fields)).toBe(expected);
	});

	it.each([
		['soren', 'Søren'],
		['lukasz', 'Łukasz'],
		['strasse', 'Straße'],
		['aesir', 'Æsir'],
		['dorde', 'Đorđe'],
	])('folds letters that NFD keeps whole: %j matches %j', (query, field) => {
		expect(matchesAllTerms(query, [field])).toBe(true);
		expect(matchesAllTerms(field, [query])).toBe(true);
	});

	it('ignores missing fields', () => {
		expect(matchesAllTerms('doe', [null, undefined, 'Doe'])).toBe(true);
		expect(matchesAllTerms('doe', [null, undefined])).toBe(false);
	});
});
