import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { isSecretKey, redactSecretKeys, truncateForLlm } from '../request-sanitizer';

// ---------------------------------------------------------------------------
// Mock logger to verify warning behavior
// ---------------------------------------------------------------------------
const mockWarn = jest.fn();
jest.spyOn(Container, 'get').mockImplementation((token) => {
	if (token === Logger) return { warn: mockWarn } as unknown as Logger;
	throw new Error(`Unexpected DI token: ${String(token)}`);
});

beforeEach(() => mockWarn.mockClear());

// ---------------------------------------------------------------------------
// isSecretKey
// ---------------------------------------------------------------------------
describe('isSecretKey', () => {
	describe('should classify secret keys', () => {
		const secretKeys = [
			'apiKey',
			'api_key',
			'API_KEY',
			'secretAccessKey',
			'secret_access_key',
			'accessToken',
			'access_token',
			'password',
			'PASSWORD',
			'credentials',
			'authHeader',
			'authorization',
			'Authorization',
			'x-api-key',
			'X-API-Key',
			'bearer',
			'bearerToken',
			'cookie',
			'Cookie',
			'sessionId',
			'session_token',
			'connectionString',
			'privateKey',
			'proxy-authorization',
			'set-cookie',
		];

		it.each(secretKeys)('"%s" → secret', (key) => {
			expect(isSecretKey(key)).toBe(true);
		});
	});

	describe('should classify safe keys', () => {
		const safeKeys = [
			'keyword',
			'keywords',
			'primaryKey',
			'primary_key',
			'foreignKey',
			'sortKey',
			'partitionKey',
			'groupKey',
			'keyName',
			'keyType',
			'keyField',
			'keyColumn',
			'authentication',
			'author',
			'authorName',
		];

		it.each(safeKeys)('"%s" → safe', (key) => {
			expect(isSecretKey(key)).toBe(false);
		});
	});

	describe('should classify compound keys with secret suffixes as secret', () => {
		const compoundSecretKeys = [
			'authenticationToken',
			'authenticationKey',
			'authorSecret',
			'authorToken',
		];

		it.each(compoundSecretKeys)('"%s" → secret', (key) => {
			expect(isSecretKey(key)).toBe(true);
		});
	});

	describe('should classify non-secret keys', () => {
		const normalKeys = [
			'name',
			'email',
			'url',
			'host',
			'region',
			'data',
			'body',
			'message',
			'query',
			'title',
			'description',
			'id',
			'channelId',
			'status',
		];

		it.each(normalKeys)('"%s" → not secret', (key) => {
			expect(isSecretKey(key)).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// redactSecretKeys
// ---------------------------------------------------------------------------
describe('redactSecretKeys', () => {
	it('should redact top-level secret keys', () => {
		const input = { apiKey: 'sk-123', name: 'test', token: 'abc' };
		expect(redactSecretKeys(input)).toEqual({
			apiKey: '<redacted>',
			name: 'test',
			token: '<redacted>',
		});
	});

	it('should redact entire value when key is secret, even if value is an object', () => {
		const input = {
			config: {
				auth: { password: 'hunter2', username: 'admin' },
				host: 'localhost',
			},
		};
		expect(redactSecretKeys(input)).toEqual({
			config: {
				auth: '<redacted>',
				host: 'localhost',
			},
		});
	});

	it('should still recurse into objects with non-secret keys', () => {
		const input = {
			config: {
				inner: { password: 'hunter2', username: 'admin' },
				host: 'localhost',
			},
		};
		expect(redactSecretKeys(input)).toEqual({
			config: {
				inner: { password: '<redacted>', username: 'admin' },
				host: 'localhost',
			},
		});
	});

	it('should handle arrays with objects containing secrets', () => {
		const input = [
			{ name: 'cred1', apiKey: 'key1' },
			{ name: 'cred2', apiKey: 'key2' },
		];
		expect(redactSecretKeys(input)).toEqual([
			{ name: 'cred1', apiKey: '<redacted>' },
			{ name: 'cred2', apiKey: '<redacted>' },
		]);
	});

	it('should handle mixed nested arrays and objects', () => {
		const input = {
			items: [
				{ data: { secret: 'hidden', value: 42 } },
				{ headers: { Authorization: 'Bearer xyz', 'Content-Type': 'application/json' } },
			],
		};
		expect(redactSecretKeys(input)).toEqual({
			items: [
				{ data: { secret: '<redacted>', value: 42 } },
				{ headers: { Authorization: '<redacted>', 'Content-Type': 'application/json' } },
			],
		});
	});

	it('should preserve safe key patterns that contain secret substrings', () => {
		const input = { primaryKey: 'id', keyword: 'search', author: 'Jane' };
		expect(redactSecretKeys(input)).toEqual({
			primaryKey: 'id',
			keyword: 'search',
			author: 'Jane',
		});
	});

	it('should return primitives unchanged', () => {
		expect(redactSecretKeys('hello')).toBe('hello');
		expect(redactSecretKeys(42)).toBe(42);
		expect(redactSecretKeys(true)).toBe(true);
		expect(redactSecretKeys(null)).toBeNull();
		expect(redactSecretKeys(undefined)).toBeUndefined();
	});

	it('should return empty object unchanged', () => {
		expect(redactSecretKeys({})).toEqual({});
	});

	it('should return empty array unchanged', () => {
		expect(redactSecretKeys([])).toEqual([]);
	});

	it('should handle deeply nested structures', () => {
		const input = {
			level1: {
				level2: {
					level3: {
						safeField: 'visible',
						secretToken: 'hidden-deep',
					},
				},
			},
		};
		expect(redactSecretKeys(input)).toEqual({
			level1: {
				level2: {
					level3: {
						safeField: 'visible',
						secretToken: '<redacted>',
					},
				},
			},
		});
	});

	it('should redact header-style keys', () => {
		const input = {
			'x-api-key': 'secret-value',
			'content-type': 'application/json',
			'proxy-authorization': 'Basic abc',
			'set-cookie': 'session=xyz',
		};
		expect(redactSecretKeys(input)).toEqual({
			'x-api-key': '<redacted>',
			'content-type': 'application/json',
			'proxy-authorization': '<redacted>',
			'set-cookie': '<redacted>',
		});
	});

	it('should handle a realistic API request body', () => {
		const input = {
			grant_type: 'client_credentials',
			client_id: 'app-123',
			client_secret: 'super-secret-value',
			scope: 'read write',
			redirect_uri: 'https://example.com/callback',
		};
		expect(redactSecretKeys(input)).toEqual({
			grant_type: 'client_credentials',
			client_id: 'app-123',
			client_secret: '<redacted>',
			scope: 'read write',
			redirect_uri: 'https://example.com/callback',
		});
	});

	it('should handle query string params with secrets', () => {
		const input = {
			api_key: 'my-key',
			page: '1',
			limit: '10',
			access_token: 'tok_abc',
		};
		expect(redactSecretKeys(input)).toEqual({
			api_key: '<redacted>',
			page: '1',
			limit: '10',
			access_token: '<redacted>',
		});
	});

	it('should handle a GraphQL body preserving the query but redacting auth', () => {
		const input = {
			query: 'mutation { createUser(name: "Test") { id } }',
			variables: { name: 'Test', authToken: 'secret-tok' },
		};
		expect(redactSecretKeys(input)).toEqual({
			query: 'mutation { createUser(name: "Test") { id } }',
			variables: { name: 'Test', authToken: '<redacted>' },
		});
	});

	it('should not mutate the original input', () => {
		const input = { apiKey: 'original', name: 'test' };
		const original = { ...input };
		redactSecretKeys(input);
		expect(input).toEqual(original);
	});
});

// ---------------------------------------------------------------------------
// truncateForLlm
// ---------------------------------------------------------------------------
describe('truncateForLlm', () => {
	it('should return short strings unchanged', () => {
		const short = '{"data": "hello"}';
		expect(truncateForLlm(short)).toBe(short);
	});

	it('should not log a warning for short strings', () => {
		truncateForLlm('short');
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it('should truncate strings exceeding the default limit', () => {
		const long = 'x'.repeat(5000);
		const result = truncateForLlm(long);
		expect(result).toHaveLength(4096 + '... [truncated]'.length);
		expect(result.endsWith('... [truncated]')).toBe(true);
	});

	it('should log a warning when truncating', () => {
		const long = 'x'.repeat(5000);
		truncateForLlm(long);
		expect(mockWarn).toHaveBeenCalledWith(
			expect.stringContaining('Request body truncated from 5000 to 4096'),
		);
	});

	it('should respect custom maxLength', () => {
		const input = 'x'.repeat(200);
		const result = truncateForLlm(input, 100);
		expect(result).toBe('x'.repeat(100) + '... [truncated]');
	});

	it('should not truncate a string exactly at the limit', () => {
		const exact = 'x'.repeat(4096);
		expect(truncateForLlm(exact)).toBe(exact);
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it('should truncate a string one char over the limit', () => {
		const overByOne = 'x'.repeat(4097);
		const result = truncateForLlm(overByOne);
		expect(result.endsWith('... [truncated]')).toBe(true);
		expect(mockWarn).toHaveBeenCalled();
	});
});
