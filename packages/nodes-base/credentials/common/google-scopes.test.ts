import { formatGoogleScopesForJwt, parseGoogleScopes } from './google-scopes';

describe('parseGoogleScopes', () => {
	it('should split scopes on commas, whitespace, and newlines', () => {
		expect(
			parseGoogleScopes(
				'https://www.googleapis.com/auth/calendar.readonly,\nhttps://www.googleapis.com/auth/gmail.readonly ',
			),
		).toEqual([
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/gmail.readonly',
		]);
	});

	it('should unescape literal \\n sequences before splitting', () => {
		expect(
			parseGoogleScopes(
				'https://www.googleapis.com/auth/calendar.readonly\\nhttps://www.googleapis.com/auth/gmail.readonly',
			),
		).toEqual([
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/gmail.readonly',
		]);
	});

	it('should return an empty array for blank input', () => {
		expect(parseGoogleScopes('')).toEqual([]);
		expect(parseGoogleScopes('   ')).toEqual([]);
	});
});

describe('formatGoogleScopesForJwt', () => {
	it('should join scopes with spaces for JWT claims', () => {
		expect(
			formatGoogleScopesForJwt([
				'https://www.googleapis.com/auth/calendar.readonly',
				'https://www.googleapis.com/auth/gmail.readonly',
			]),
		).toBe(
			'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
		);
	});
});
