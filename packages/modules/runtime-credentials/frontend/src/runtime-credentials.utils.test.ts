import {
	findInvalidAllowedDomain,
	normalizeAllowedDomains,
	parseAllowedDomains,
} from './runtime-credentials.utils';

describe('allowed domains helpers', () => {
	it('parses and normalizes a comma separated list', () => {
		expect(parseAllowedDomains(' a.com ,, *.b.com ')).toEqual(['a.com', '*.b.com']);
		expect(parseAllowedDomains(null)).toEqual([]);
		expect(normalizeAllowedDomains(' a.com ,, *.b.com ')).toBe('a.com, *.b.com');
		expect(normalizeAllowedDomains('  , ')).toBe('');
	});

	it('accepts bare hosts and wildcards', () => {
		expect(findInvalidAllowedDomain('api.example.com, *.example.com')).toBeUndefined();
		expect(findInvalidAllowedDomain('')).toBeUndefined();
	});

	it.each(['https://a.com', 'a.com/x', 'a.com:443', 'u@a.com', 'a\\b', 'a b.com'])(
		'rejects %s',
		(entry) => {
			expect(findInvalidAllowedDomain(`ok.com, ${entry}`)).toBe(entry);
		},
	);
});
