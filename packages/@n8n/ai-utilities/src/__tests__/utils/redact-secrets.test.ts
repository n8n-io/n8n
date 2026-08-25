import { redactSecrets } from 'src/utils/redact-secrets';

describe('redactSecrets', () => {
	it('should replace credential-shaped values and keep the key', () => {
		expect(redactSecrets('Rejected request, api_key: sk-live-abcdef123456')).toBe(
			'Rejected request, api_key: [redacted]',
		);
		expect(redactSecrets('authorization: Bearer eyJhbGciOiJIUzI1NiJ9')).toBe(
			'authorization: Bearer [redacted]',
		);
	});

	it('should replace compound keys and unprefixed authorization values', () => {
		const input = JSON.stringify({
			message: 'Token exchange failed',
			client_secret: 'cs-live-abcdef',
			Authorization: 'abcdef-bare-key',
			token_type: 'Bearer',
		});

		const redacted = redactSecrets(input);

		expect(redacted).toContain('Token exchange failed');
		expect(redacted).toContain('client_secret');
		expect(redacted).not.toContain('cs-live-abcdef');
		expect(redacted).not.toContain('abcdef-bare-key');
		expect(redacted).toContain('"token_type":"Bearer"');
	});

	it('should leave strings without credential-shaped values unchanged', () => {
		expect(redactSecrets('Hello World')).toBe('Hello World');
	});
});
