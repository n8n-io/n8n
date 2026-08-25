import { redactSecrets, sanitizeCredentialShapedValues } from 'src/utils/redact-secrets';

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

	it('should sanitize unlabeled credential formats', () => {
		expect(redactSecrets('the run used sk-abc123DEF456ghi789jkl012 for calls')).toBe(
			'the run used [redacted] for calls',
		);
		expect(redactSecrets('cloned using ghp_ABCdef123456789012345678901234567890')).toBe(
			'cloned using [redacted]',
		);
		expect(redactSecrets('signed as AKIAIOSFODNN7EXAMPLE today')).toBe(
			'signed as [redacted] today',
		);
		expect(redactSecrets('got Bearer eyJhbGciOiJIUzI1NiJ9 back')).toBe(
			'got Bearer [redacted] back',
		);
	});

	it('should leave unlabeled lookalikes unchanged', () => {
		expect(redactSecrets('we use sk-learn for clustering')).toBe('we use sk-learn for clustering');
		expect(redactSecrets('AKIA is an AWS prefix')).toBe('AKIA is an AWS prefix');
	});
});

describe('sanitizeCredentialShapedValues', () => {
	it('should replace object and array credential properties with a sentinel', () => {
		expect(
			sanitizeCredentialShapedValues({
				api_key: { nested: 'sk-live-abcdef123456' },
				client_secret: ['cs-live-abcdef'],
				message: 'ok',
			}),
		).toEqual({
			api_key: '[redacted]',
			client_secret: '[redacted]',
			message: 'ok',
		});
	});

	it('should keep keys that only resemble credentials', () => {
		expect(
			sanitizeCredentialShapedValues({
				token_type: 'Bearer',
				access_token: 'xyz-live-token',
			}),
		).toEqual({
			token_type: 'Bearer',
			access_token: '[redacted]',
		});
	});

	it('should sanitize credential-shaped values inside stringified JSON', () => {
		const result = sanitizeCredentialShapedValues({
			response: JSON.stringify({ api_key: { nested: 'sk-live-abcdef123456' } }, null, 2),
		});

		expect(result).toEqual({
			response: JSON.stringify({ api_key: '[redacted]' }),
		});
	});

	it('should sanitize unlabeled credential formats in string fields', () => {
		expect(
			sanitizeCredentialShapedValues({
				response: 'the run used sk-abc123DEF456ghi789jkl012',
			}),
		).toEqual({
			response: 'the run used [redacted]',
		});
	});
});
