import { redactSecrets, sanitizeCredentialShapedValues } from 'src/utils/redact-secrets';

const join = (prefix: string, suffix: string) => prefix + suffix;

describe('redactSecrets', () => {
	it('should replace credential-shaped values and keep the key', () => {
		expect(redactSecrets('Rejected request, api_key: sk-live-abcdef123456')).toBe(
			'Rejected request, api_key: [REDACTED]',
		);
		expect(redactSecrets('authorization: Bearer eyJhbGciOiJIUzI1NiJ9')).toBe(
			'authorization: [REDACTED]',
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
			'the run used [REDACTED] for calls',
		);
		expect(redactSecrets('cloned using ghp_ABCdef123456789012345678901234567890')).toBe(
			'cloned using [REDACTED]',
		);
		expect(redactSecrets('signed as AKIAIOSFODNN7EXAMPLE today')).toBe(
			'signed as [REDACTED] today',
		);
		expect(redactSecrets('got Bearer eyJhbGciOiJIUzI1NiJ9 back')).toBe('got [REDACTED] back');
	});

	it('should leave unlabeled lookalikes unchanged', () => {
		expect(redactSecrets('we use sk-learn for clustering')).toBe('we use sk-learn for clustering');
		expect(redactSecrets('AKIA is an AWS prefix')).toBe('AKIA is an AWS prefix');
	});

	it('should sanitize JWT values', () => {
		const jwt = `${join('eyJ', 'hbGciOiJIUzI1NiJ9')}.${join('eyJ', 'zdWIiOiIxMjMifQ')}.c2lnbmF0dXJl`;
		expect(redactSecrets(`token ${jwt} end`)).toBe('token [REDACTED] end');
	});

	it('should sanitize PEM private-key blocks', () => {
		const pem = `-----BEGIN PRIVATE KEY-----\n${'FAKEKEYMATERIAL'}\n-----END PRIVATE KEY-----`;
		expect(redactSecrets(`key:\n${pem}\ndone`)).toBe('key:\n[REDACTED]\ndone');
	});

	it('should sanitize Token authorization values', () => {
		expect(redactSecrets('header is Token abcdef1234567890')).toBe('header is [REDACTED]');
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
			api_key: '[REDACTED]',
			client_secret: '[REDACTED]',
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
			access_token: '[REDACTED]',
		});
	});

	it('should sanitize composite credential field names', () => {
		expect(
			sanitizeCredentialShapedValues({
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG',
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				Cookie: 'session=abc123',
				secretKey: 'local-dev-key',
				message: 'ok',
			}),
		).toEqual({
			secretAccessKey: '[REDACTED]',
			accessKeyId: '[REDACTED]',
			Cookie: '[REDACTED]',
			secretKey: '[REDACTED]',
			message: 'ok',
		});
	});

	it('should preserve Date serialization', () => {
		const createdAt = new Date('2026-08-25T12:00:00.000Z');
		expect(
			sanitizeCredentialShapedValues({
				createdAt,
				message: 'ok',
			}),
		).toEqual({
			createdAt: '2026-08-25T12:00:00.000Z',
			message: 'ok',
		});
	});

	it('should sanitize credential-shaped values inside stringified JSON', () => {
		const result = sanitizeCredentialShapedValues({
			response: JSON.stringify({ api_key: { nested: 'sk-live-abcdef123456' } }, null, 2),
		});

		expect(result).toEqual({
			response: JSON.stringify({ api_key: '[REDACTED]' }, null, 2),
		});
	});

	it('should keep pretty-printed JSON strings that do not need redaction', () => {
		const pretty = JSON.stringify({ msg: 'test response' }, null, 2);
		expect(sanitizeCredentialShapedValues({ response: pretty })).toEqual({
			response: pretty,
		});
	});

	it('should sanitize unlabeled credential formats in string fields', () => {
		expect(
			sanitizeCredentialShapedValues({
				response: 'the run used sk-abc123DEF456ghi789jkl012',
			}),
		).toEqual({
			response: 'the run used [REDACTED]',
		});
	});
});
