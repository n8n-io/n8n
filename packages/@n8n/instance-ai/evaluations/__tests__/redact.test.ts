import { redactSecrets, stringifyError, truncate } from '../harness/redact';

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
