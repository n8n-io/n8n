import { redactMatches } from '../mask';
import type { GuardrailResult } from '../types';

const result = (info: GuardrailResult['info']): GuardrailResult => ({
	guardrailName: 'test',
	tripwireTriggered: true,
	info,
});

describe('redactMatches', () => {
	it('returns the text unchanged when no check reported matches', () => {
		expect(redactMatches('hello', [])).toBe('hello');
		expect(redactMatches('hello', [result({})])).toBe('hello');
		expect(redactMatches('hello', [result({ maskEntities: {} })])).toBe('hello');
	});

	it('masks maskEntities with their type token', () => {
		const masked = redactMatches('Email john@example.com or call 555-1234 about SSN 111-22-3333', [
			result({
				maskEntities: {
					EMAIL_ADDRESS: ['john@example.com'],
					PHONE_NUMBER: ['555-1234'],
					US_SSN: ['111-22-3333'],
				},
			}),
		]);
		expect(masked).toBe('Email <EMAIL_ADDRESS> or call <PHONE_NUMBER> about SSN <US_SSN>');
	});

	it('merges matches from several results, longest match first', () => {
		const masked = redactMatches('Visit https://example.com/a and https://example.com/a/b', [
			result({ maskEntities: { URL: ['https://example.com/a/b', 'https://example.com/a'] } }),
			result({ maskEntities: { HOST: ['example.com'] } }),
		]);
		expect(masked).toBe('Visit <URL> and <URL>');
	});

	it('masks matchedKeywords with a KEYWORD token', () => {
		const masked = redactMatches('The secret plans are internal only', [
			result({ matchedKeywords: ['secret', 'internal'] }),
		]);
		expect(masked).toBe('The <KEYWORD> plans are <KEYWORD> only');
	});

	it('ignores non-string keyword entries', () => {
		const masked = redactMatches('unchanged', [result({ matchedKeywords: [42, null] })]);
		expect(masked).toBe('unchanged');
	});

	it('treats regex metacharacters literally', () => {
		const masked = redactMatches('Key a.b*c present', [
			result({ maskEntities: { SECRET: ['a.b*c'] } }),
		]);
		expect(masked).toBe('Key <SECRET> present');
	});
});
