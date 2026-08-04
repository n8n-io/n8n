import {
	redactSecrets,
	redactSecretsInText,
	redactSecretsInTextDeep,
	stringifyError,
	truncate,
} from '../harness/redact';

describe('redactSecrets', () => {
	it('redacts values under secret-shaped keys', () => {
		const input = {
			username: 'alice',
			password: 'hunter2',
			apiKey: 'sk-abc',
			api_key: 'sk-def',
			'X-Api-Key': 'sk-ghi',
			authorization: 'Bearer xyz',
			refreshToken: 'rt-1',
			cookie: 'sid=1',
			privateKey: '----BEGIN----',
			sessionId: 's-1',
			credentials: { value: 'opaque' },
		};

		expect(redactSecrets(input)).toEqual({
			username: 'alice',
			password: '[REDACTED]',
			apiKey: '[REDACTED]',
			api_key: '[REDACTED]',
			'X-Api-Key': '[REDACTED]',
			authorization: '[REDACTED]',
			refreshToken: '[REDACTED]',
			cookie: '[REDACTED]',
			privateKey: '[REDACTED]',
			sessionId: '[REDACTED]',
			credentials: '[REDACTED]',
		});
	});

	it('walks nested objects and arrays', () => {
		const input = {
			outer: {
				inner: { token: 't', name: 'ok' },
				list: [{ password: 'p', kept: 'k' }],
			},
		};

		expect(redactSecrets(input)).toEqual({
			outer: {
				inner: { token: '[REDACTED]', name: 'ok' },
				list: [{ password: '[REDACTED]', kept: 'k' }],
			},
		});
	});

	it('passes primitives, null, and undefined through unchanged', () => {
		expect(redactSecrets('plain')).toBe('plain');
		expect(redactSecrets(42)).toBe(42);
		expect(redactSecrets(true)).toBe(true);
		expect(redactSecrets(null)).toBeNull();
		expect(redactSecrets(undefined)).toBeUndefined();
	});

	it('does not mutate the original object', () => {
		const original = { token: 'real-token' };
		redactSecrets(original);
		expect(original.token).toBe('real-token');
	});

	it('caps recursion depth so deeply nested input cannot blow the stack', () => {
		let nested: unknown = { token: 'leaf' };
		for (let i = 0; i < 12; i += 1) {
			nested = { wrap: nested };
		}
		expect(() => redactSecrets(nested)).not.toThrow();
	});

	it('leaves class instances untouched (only redacts plain objects)', () => {
		class WithSecret {
			constructor(public token: string) {}
		}
		const instance = new WithSecret('keep-me');
		expect(redactSecrets(instance)).toBe(instance);
	});
});

describe('redactSecretsInText', () => {
	it('masks an Authorization credential while keeping the scheme and message', () => {
		const out = redactSecretsInText('Request failed: Authorization: Bearer sk-abc.def123 (401)');
		expect(out).not.toContain('sk-abc.def123');
		expect(out).toContain('Authorization: Bearer [REDACTED]');
		expect(out).toContain('Request failed:');
		expect(out).toContain('(401)');
	});

	it('masks a standalone Bearer/Basic credential', () => {
		expect(redactSecretsInText('header was Bearer eyJ0eXAiOiJ.payload')).toBe(
			'header was Bearer [REDACTED]',
		);
		expect(redactSecretsInText('got Basic dXNlcjpwYXNz back')).toBe('got Basic [REDACTED] back');
	});

	it('masks secret-shaped key/value pairs in query strings and JSON', () => {
		expect(redactSecretsInText('GET https://api.x.com/v1?api_key=secret123&page=2')).toBe(
			'GET https://api.x.com/v1?api_key=[REDACTED]&page=2',
		);
		expect(redactSecretsInText('body {"token":"abc","ok":true}')).toBe(
			'body {"token":"[REDACTED]","ok":true}',
		);
		expect(redactSecretsInText('password: hunter2')).toBe('password: [REDACTED]');
	});

	it('masks bare well-known credential formats with no surrounding key', () => {
		// OpenAI/Anthropic-style
		expect(redactSecretsInText('the run used sk-abc123DEF456ghi789jkl012 for calls')).toBe(
			'the run used [REDACTED] for calls',
		);
		expect(redactSecretsInText('key sk-ant-api03-Zm9vYmFyYmF6cXV4 set')).toBe('key [REDACTED] set');
		// Slack bot/user/app tokens
		expect(redactSecretsInText('posted with xoxb-1234567890-abcdefghijkl')).toBe(
			'posted with [REDACTED]',
		);
		// Slack app-level tokens use the xapp- prefix, not xox?-
		expect(redactSecretsInText('socket mode via xapp-1-A012-3456-abcdef')).toBe(
			'socket mode via [REDACTED]',
		);
		// GitHub tokens (classic + fine-grained prefixes)
		expect(redactSecretsInText('cloned using ghp_ABCdef123456789012345678901234567890')).toBe(
			'cloned using [REDACTED]',
		);
		// AWS access key id
		expect(redactSecretsInText('signed as AKIAIOSFODNN7EXAMPLE today')).toBe(
			'signed as [REDACTED] today',
		);
	});

	it('leaves lookalike prose untouched (short or non-token shapes)', () => {
		expect(redactSecretsInText('we use sk-learn for clustering')).toBe(
			'we use sk-learn for clustering',
		);
		expect(redactSecretsInText('the xoxo sign-off stays')).toBe('the xoxo sign-off stays');
		expect(redactSecretsInText('AKIA is an AWS prefix')).toBe('AKIA is an AWS prefix');
	});

	it('leaves secret words used as prose untouched (no separator → no match)', () => {
		expect(redactSecretsInText('Invalid token format in the request')).toBe(
			'Invalid token format in the request',
		);
		expect(redactSecretsInText('the secret sauce was missing')).toBe(
			'the secret sauce was missing',
		);
	});
});

describe('redactSecretsInTextDeep', () => {
	it('scrubs inline tokens in string leaves of nested objects and arrays', () => {
		const input = {
			log: 'Request failed: Authorization: Bearer sk-abc.def (401)',
			nested: { note: 'retry with api_key=sk-inline-1' },
			list: ['header was Bearer eyJ0eXAi.payload', 'plain entry'],
		};

		expect(redactSecretsInTextDeep(input)).toEqual({
			log: 'Request failed: Authorization: Bearer [REDACTED] (401)',
			nested: { note: 'retry with api_key=[REDACTED]' },
			list: ['header was Bearer [REDACTED]', 'plain entry'],
		});
	});

	it('passes non-string primitives, null, and undefined through unchanged', () => {
		expect(redactSecretsInTextDeep(42)).toBe(42);
		expect(redactSecretsInTextDeep(true)).toBe(true);
		expect(redactSecretsInTextDeep(null)).toBeNull();
		expect(redactSecretsInTextDeep(undefined)).toBeUndefined();
	});

	it('leaves benign strings untouched', () => {
		expect(redactSecretsInTextDeep({ msg: 'Invalid token format in the request' })).toEqual({
			msg: 'Invalid token format in the request',
		});
	});

	it('does not mutate the original object', () => {
		const original = { note: 'api_key=sk-real' };
		redactSecretsInTextDeep(original);
		expect(original.note).toBe('api_key=sk-real');
	});

	it('caps recursion depth so deeply nested input cannot blow the stack', () => {
		let nested: unknown = { note: 'api_key=sk-leaf' };
		for (let i = 0; i < 12; i += 1) {
			nested = { wrap: nested };
		}
		expect(() => redactSecretsInTextDeep(nested)).not.toThrow();
	});

	it('leaves class instances untouched (only walks plain objects)', () => {
		class WithText {
			constructor(public note: string) {}
		}
		const instance = new WithText('api_key=sk-keep');
		expect(redactSecretsInTextDeep(instance)).toBe(instance);
	});
});

describe('truncate', () => {
	it('passes short values through after redaction', () => {
		expect(truncate({ name: 'a', token: 't' }, 200)).toEqual({ name: 'a', token: '[REDACTED]' });
	});

	it('returns the truncated stringified form when over the limit', () => {
		const big = { msg: 'a'.repeat(500) };
		const out = truncate(big, 50);
		expect(typeof out).toBe('string');
		expect((out as string).endsWith('... [truncated]')).toBe(true);
	});

	it('returns "<unserializable>" when JSON.stringify throws on circular refs', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(truncate(circular, 200)).toBe('<unserializable>');
	});

	it('returns "<unserializable>" when JSON.stringify returns undefined', () => {
		const fn = (): void => {};
		expect(truncate(fn, 200)).toBe('<unserializable>');
	});
});

describe('stringifyError', () => {
	it('returns string errors unchanged when within limit', () => {
		expect(stringifyError('boom', 100)).toBe('boom');
	});

	it('truncates long string errors', () => {
		const long = 'x'.repeat(50);
		expect(stringifyError(long, 10)).toBe('xxxxxxxxxx');
	});

	it('JSON-stringifies object errors and redacts secrets', () => {
		const out = stringifyError({ message: 'fail', token: 'leaked' }, 200);
		expect(out).toContain('"message":"fail"');
		expect(out).toContain('[REDACTED]');
		expect(out).not.toContain('leaked');
	});

	it('falls back to String() when JSON.stringify returns undefined', () => {
		const fn = (): void => {};
		expect(stringifyError(fn, 200)).toBe(String(fn));
	});

	it('falls back to String() when JSON.stringify throws on circular refs', () => {
		const circular: Record<string, unknown> = { name: 'cycle' };
		circular.self = circular;
		expect(() => stringifyError(circular, 200)).not.toThrow();
		expect(typeof stringifyError(circular, 200)).toBe('string');
	});

	it('truncates serialized object errors past max length', () => {
		const big = { msg: 'a'.repeat(500) };
		const out = stringifyError(big, 50);
		expect(out.length).toBe(50);
	});
});
