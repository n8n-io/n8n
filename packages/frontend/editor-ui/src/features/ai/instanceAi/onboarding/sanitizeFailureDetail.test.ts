import { sanitizeFailureDetail } from './sanitizeFailureDetail';

describe('sanitizeFailureDetail', () => {
	it('scrubs credential-shaped values', () => {
		const result = sanitizeFailureDetail(
			'Incorrect API key provided: sk-proj-abcdef1234567890abcdef',
		);

		expect(result).toContain('[REDACTED]');
		expect(result).not.toContain('sk-proj-abcdef');
	});

	it('drops URL query strings', () => {
		expect(sanitizeFailureDetail('request to https://api.example.com/v1?key=secret failed')).toBe(
			'request to https://api.example.com/v1 failed',
		);
	});

	it('caps the length at 512 characters', () => {
		expect(sanitizeFailureDetail('x'.repeat(600))).toHaveLength(512);
	});
});
