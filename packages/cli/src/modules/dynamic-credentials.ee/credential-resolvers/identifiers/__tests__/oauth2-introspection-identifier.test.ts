import type { HttpRequestClient, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2TokenIntrospectionIdentifier } from '../oauth2-introspection-identifier';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';

describe('OAuth2TokenIntrospectionIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();
	let identifier: OAuth2TokenIntrospectionIdentifier;

	const validOptions = {
		metadataUri: 'https://auth.example.com/.well-known/oauth-authorization-server',
		clientId: 'test-client',
		clientSecret: 'test-secret',
		subjectClaim: 'sub',
		validation: 'oauth2-introspection',
	};

	const validMetadata = {
		issuer: 'https://auth.example.com',
		introspection_endpoint: 'https://auth.example.com/oauth/introspect',
		introspection_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
	};

	const validIntrospectionResponse = {
		active: true,
		sub: 'user-123',
		exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
		scope: 'read write',
		client_id: 'test-client',
	};

	const mockContext = {
		identity: 'mock-access-token',
		version: 1 as const,
	};

	/**
	 * Branch the single `request` mock on HTTP method so tests can invoke
	 * `resolve` more than once without exhausting a `mockResolvedValueOnce` chain.
	 */
	const stubFlow = (metadata: unknown, introspection: unknown) => {
		request.mockImplementation(async (options: IHttpRequestOptions) =>
			options.method === 'POST'
				? { statusCode: 200, body: introspection }
				: { statusCode: 200, body: metadata },
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		const httpClient = new OAuth2MetadataHttpClient(
			logger,
			cache,
			outboundHttp,
			mock<SsrfProtectionService>(),
			mock<SsrfProtectionConfig>({ enabled: true }),
		);
		identifier = new OAuth2TokenIntrospectionIdentifier(logger, cache, httpClient);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Happy Path', () => {
		test('should resolve subject successfully with client_secret_basic', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validIntrospectionResponse });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('oauth2-introspection-identifier:subject'),
				'user-123',
				expect.any(Number),
			);
			// Introspection POST: form-urlencoded body, JSON response, Basic auth header.
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://auth.example.com/oauth/introspect',
					method: 'POST',
					body: expect.any(URLSearchParams),
					json: true,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
					headers: expect.objectContaining({
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: expect.stringMatching(/^Basic /),
					}),
				}),
			);
		});

		test('should use client_secret_post auth params in the body', async () => {
			const metadataPostOnly = {
				...validMetadata,
				introspection_endpoint_auth_methods_supported: ['client_secret_post'],
			};
			request
				.mockResolvedValueOnce({ statusCode: 200, body: metadataPostOnly })
				.mockResolvedValueOnce({ statusCode: 200, body: validIntrospectionResponse });

			await identifier.resolve(mockContext, validOptions);

			const postCall = request.mock.calls[1][0] as IHttpRequestOptions;
			expect(postCall.headers).not.toHaveProperty('Authorization');
			const body = postCall.body as URLSearchParams;
			expect(body.get('client_id')).toBe('test-client');
			expect(body.get('client_secret')).toBe('test-secret');
			expect(body.get('token')).toBe('mock-access-token');
		});

		test('should return cached result on subsequent calls', async () => {
			// First cache.get call is for metadata (returns undefined, so will fetch)
			// Second cache.get call is for subject (returns cached value)
			cache.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-user-123');

			request.mockResolvedValueOnce({ statusCode: 200, body: validMetadata });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('cached-user-123');
			// Only the metadata GET — never the introspection POST.
			expect(request).toHaveBeenCalledTimes(1);
			expect(request.mock.calls.every((call) => call[0].method === 'GET')).toBe(true);
		});

		test('should extract subject from custom claim', async () => {
			const customOptions = { ...validOptions, subjectClaim: 'username' };
			const customResponse = { ...validIntrospectionResponse, username: 'john.doe' };

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: customResponse });

			const result = await identifier.resolve(mockContext, customOptions);

			expect(result).toBe('john.doe');
		});
	});

	describe('Critical Errors', () => {
		test('should throw IdentifierValidationError for invalid options', async () => {
			const invalidOptions = { metadataUri: 'not-a-url' };

			await expect(identifier.resolve(mockContext, invalidOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should throw IdentifierValidationError when token is not active', async () => {
			stubFlow(validMetadata, { ...validIntrospectionResponse, active: false });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Token is not active',
			);
		});

		test('should throw IdentifierValidationError when metadata fetch fails', async () => {
			request.mockResolvedValue({ statusCode: 404, body: {} });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Failed to fetch OAuth2 metadata, status code: 404',
			);
		});

		test('should throw IdentifierValidationError when subject claim is missing', async () => {
			const responseWithoutSub = { active: true, exp: validIntrospectionResponse.exp };
			stubFlow(validMetadata, responseWithoutSub);

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'missing subject claim',
			);
		});
	});

	describe('Validation', () => {
		test('should reject empty clientId', async () => {
			const optionsWithEmptyClientId = { ...validOptions, clientId: '' };

			await expect(identifier.resolve(mockContext, optionsWithEmptyClientId)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should reject whitespace-only clientId', async () => {
			const optionsWithWhitespaceClientId = { ...validOptions, clientId: '   ' };

			await expect(identifier.resolve(mockContext, optionsWithWhitespaceClientId)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should reject empty clientSecret', async () => {
			const optionsWithEmptyClientSecret = { ...validOptions, clientSecret: '' };

			await expect(identifier.resolve(mockContext, optionsWithEmptyClientSecret)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should reject whitespace-only clientSecret', async () => {
			const optionsWithWhitespaceClientSecret = { ...validOptions, clientSecret: '   ' };

			await expect(
				identifier.resolve(mockContext, optionsWithWhitespaceClientSecret),
			).rejects.toThrow(IdentifierValidationError);
		});

		test('should throw IdentifierValidationError when metadata URL is unreachable', async () => {
			request.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:443'));

			const error = await identifier.validateOptions(validOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});

		test('should throw IdentifierValidationError on DNS resolution failure', async () => {
			request.mockRejectedValue(new Error('getaddrinfo ENOTFOUND auth.example.com'));

			const error = await identifier.validateOptions(validOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});

		test('should throw IdentifierValidationError on request timeout', async () => {
			request.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

			const error = await identifier.validateOptions(validOptions).catch((e) => e);
			expect(error).toBeInstanceOf(IdentifierValidationError);
			expect(error.message).toContain('Could not reach metadata URL');
		});
	});

	describe('Edge Cases', () => {
		test('should default to client_secret_basic when auth methods not specified', async () => {
			const metadataWithoutAuthMethods = {
				issuer: 'https://auth.example.com',
				introspection_endpoint: 'https://auth.example.com/oauth/introspect',
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: metadataWithoutAuthMethods })
				.mockResolvedValueOnce({ statusCode: 200, body: validIntrospectionResponse });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					method: 'POST',
					body: expect.any(URLSearchParams),
					headers: expect.objectContaining({
						Authorization: expect.stringMatching(/^Basic /),
					}),
				}),
			);
		});

		test('should cap TTL at MAX_TOKEN_CACHE_TIMEOUT for long-lived token', async () => {
			const longLivedResponse = {
				...validIntrospectionResponse,
				exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
			};

			stubFlow(validMetadata, longLivedResponse);

			await identifier.resolve(mockContext, validOptions);

			// Check that the subject cache was set with the max TTL
			// Find the call that sets the subject (not metadata)
			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));

			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(5 * Time.minutes.toMilliseconds);
		});

		test('should use MIN_TOKEN_CACHE_TIMEOUT for expired but active token', async () => {
			const expiredButActiveResponse = {
				...validIntrospectionResponse,
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			stubFlow(validMetadata, expiredButActiveResponse);

			await identifier.resolve(mockContext, validOptions);

			// Check that the subject cache was set with the min TTL
			// Find the call that sets the subject (not metadata)
			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));

			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(30 * Time.seconds.toMilliseconds);
		});
	});
});
