import { parseOAuth2Scopes } from '@/utils';

describe('parseOAuth2Scopes', () => {
	test('returns an empty array for undefined', () => {
		expect(parseOAuth2Scopes(undefined)).toEqual([]);
	});

	test('returns an empty array for an empty string', () => {
		expect(parseOAuth2Scopes('')).toEqual([]);
	});

	test('returns an empty array for a whitespace-only string', () => {
		expect(parseOAuth2Scopes('   ')).toEqual([]);
	});

	test('splits a space-separated string into tokens', () => {
		expect(parseOAuth2Scopes('read write')).toEqual(['read', 'write']);
	});

	test('trims and filters extra whitespace between tokens', () => {
		expect(parseOAuth2Scopes('  read   write  ')).toEqual(['read', 'write']);
	});

	test('returns the array as-is for an array of scopes', () => {
		expect(parseOAuth2Scopes(['read', 'write'])).toEqual(['read', 'write']);
	});

	test('trims and filters empty tokens from an array', () => {
		expect(parseOAuth2Scopes([' read ', '', 'write', '   '])).toEqual(['read', 'write']);
	});

	test('returns an empty array for an empty array', () => {
		expect(parseOAuth2Scopes([])).toEqual([]);
	});
});
