import type { HttpRequestClient, OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';
import { OAuth2UserInfoIdentifier } from '../oauth2-userinfo-identifier';

describe('OAuth2UserInfoIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
	const request = jest.fn();
	const outboundHttp = mock<OutboundHttp>();
	let identifier: OAuth2UserInfoIdentifier;

	const validOptions = {
		metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
		subjectClaim: 'sub',
		validation: 'oauth2-userinfo' as const,
	};

	const validMetadata = {
		issuer: 'https://auth.example.com',
		userinfo_endpoint: 'https://auth.example.com/oauth/userinfo',
	};

	const validUserInfoResponse = {
		sub: 'user-123',
		email: 'user@example.com',
		name: 'Test User',
	};

	const mockContext = {
		identity: 'mock-access-token',
		version: 1 as const,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		const httpClient = new OAuth2MetadataHttpClient(
			logger,
			cache,
			outboundHttp,
			mock<SsrfProtectionService>(),
			mock<SsrfProtectionConfig>({ enabled: true }),
		);
		identifier = new OAuth2UserInfoIdentifier(logger, cache, httpClient);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Happy Path', () => {
		test('should resolve subject successfully', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validUserInfoResponse });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('oauth2-userinfo-identifier:subject'),
				'user-123',
				expect.any(Number),
			);
			// Metadata call is mapped to a plain JSON GET.
			expect(request).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: validOptions.metadataUri,
					method: 'GET',
					json: true,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				}),
			);
			// UserInfo call carries the caller's bearer token.
			expect(request).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://auth.example.com/oauth/userinfo',
					method: 'GET',
					headers: { authorization: 'Bearer mock-access-token' },
					json: true,
				}),
			);
		});

		test('should return cached result on subsequent calls', async () => {
			cache.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-user-123');

			request.mockResolvedValueOnce({ statusCode: 200, body: validMetadata });

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('cached-user-123');
			expect(request).toHaveBeenCalledTimes(1); // Only metadata call, no userinfo call
		});

		test('should extract subject from custom claim', async () => {
			const customOptions = { ...validOptions, subjectClaim: 'email' };
			const customResponse = { ...validUserInfoResponse, email: 'john.doe@example.com' };

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: customResponse });

			const result = await identifier.resolve(mockContext, customOptions);

			expect(result).toBe('john.doe@example.com');
		});
	});

	describe('Validation', () => {
		test('should validate successfully with valid options', async () => {
			request.mockResolvedValue({ statusCode: 200, body: validMetadata });

			await expect(identifier.validateOptions(validOptions)).resolves.toBeUndefined();
		});

		test('should throw IdentifierValidationError when metadata missing userinfo_endpoint', async () => {
			const metadataWithoutUserInfo = {
				issuer: 'https://auth.example.com',
			};

			request.mockResolvedValue({ statusCode: 200, body: metadataWithoutUserInfo });

			await expect(identifier.validateOptions(validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.validateOptions(validOptions)).rejects.toThrow(
				'Invalid OAuth2 metadata format',
			);
		});
	});

	describe('Network Errors', () => {
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

	describe('Critical Errors', () => {
		test('should throw IdentifierValidationError for invalid options', async () => {
			const invalidOptions = { metadataUri: 'not-a-url' };

			await expect(identifier.resolve(mockContext, invalidOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
		});

		test('should throw IdentifierValidationError when metadata fetch fails', async () => {
			request.mockResolvedValue({ statusCode: 404, body: {} });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to fetch OAuth2 metadata'),
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Failed to fetch OAuth2 metadata, status code: 404',
			);
		});

		test('should throw IdentifierValidationError when userinfo call fails', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 401, body: { error: 'invalid_token' } });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith('UserInfo failed', expect.any(Object));
		});

		test('should throw IdentifierValidationError when subject claim is missing', async () => {
			const responseWithoutSub = {
				email: 'user@example.com',
				name: 'Test User',
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: responseWithoutSub });

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('missing subject claim'));
		});
	});

	describe('TTL Handling', () => {
		test('should use default TTL when exp not provided', async () => {
			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: validUserInfoResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(60 * Time.seconds.toMilliseconds);
		});

		test('should cap TTL at MAX_TOKEN_CACHE_TIMEOUT for long-lived token', async () => {
			const longLivedResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: longLivedResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(5 * Time.minutes.toMilliseconds);
		});

		test('should use MIN_TOKEN_CACHE_TIMEOUT for expired token', async () => {
			const expiredResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: expiredResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(30 * Time.seconds.toMilliseconds);
		});

		test('should calculate correct TTL for token expiring in 2 minutes', async () => {
			const expiringResponse = {
				...validUserInfoResponse,
				exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
			};

			request
				.mockResolvedValueOnce({ statusCode: 200, body: validMetadata })
				.mockResolvedValueOnce({ statusCode: 200, body: expiringResponse });

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			// Should be ~120 seconds, but at least MIN_TOKEN_CACHE_TIMEOUT
			expect(subjectCacheCall![2]).toBeGreaterThanOrEqual(30 * Time.seconds.toMilliseconds);
			expect(subjectCacheCall![2]).toBeLessThanOrEqual(120 * Time.seconds.toMilliseconds);
		});
	});
});
