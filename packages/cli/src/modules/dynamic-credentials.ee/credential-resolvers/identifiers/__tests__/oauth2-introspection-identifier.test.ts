import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2TokenIntrospectionIdentifier } from '../oauth2-introspection-identifier';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuth2TokenIntrospectionIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
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

	beforeEach(() => {
		jest.clearAllMocks();
		identifier = new OAuth2TokenIntrospectionIdentifier(logger, cache);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Happy Path', () => {
		test('should resolve subject successfully with client_secret_basic', async () => {
			// Mock metadata endpoint
			mockedAxios.get.mockResolvedValueOnce({
				status: 200,
				data: validMetadata,
			});

			// Mock introspection endpoint
			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: validIntrospectionResponse,
			});

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('oauth2-introspection-identifier:subject'),
				'user-123',
				expect.any(Number),
			);
			expect(mockedAxios.post).toHaveBeenCalledWith(
				'https://auth.example.com/oauth/introspect',
				expect.any(URLSearchParams),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: expect.stringMatching(/^Basic /),
					}),
				}),
			);
		});

		test('should return cached result on subsequent calls', async () => {
			// First cache.get call is for metadata (returns undefined, so will fetch)
			// Second cache.get call is for subject (returns cached value)
			cache.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-user-123');

			mockedAxios.get.mockResolvedValueOnce({
				status: 200,
				data: validMetadata,
			});

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('cached-user-123');
			expect(mockedAxios.post).not.toHaveBeenCalled(); // Should not call introspection
		});

		test('should extract subject from custom claim', async () => {
			const customOptions = { ...validOptions, subjectClaim: 'username' };
			const customResponse = { ...validIntrospectionResponse, username: 'john.doe' };

			mockedAxios.get.mockResolvedValueOnce({
				status: 200,
				data: validMetadata,
			});

			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: customResponse,
			});

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
			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: validMetadata,
			});

			mockedAxios.post.mockResolvedValue({
				status: 200,
				data: { ...validIntrospectionResponse, active: false },
			});

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Token is not active',
			);
		});

		test('should throw IdentifierValidationError when metadata fetch fails', async () => {
			mockedAxios.get.mockResolvedValue({
				status: 404,
				data: {},
			});

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'Failed to fetch OAuth2 metadata',
			);
		});

		test('should throw IdentifierValidationError when subject claim is missing', async () => {
			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: validMetadata,
			});

			const responseWithoutSub = { active: true, exp: validIntrospectionResponse.exp };
			mockedAxios.post.mockResolvedValue({
				status: 200,
				data: responseWithoutSub,
			});

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				'missing subject claim',
			);
		});
	});

	describe('Edge Cases', () => {
		test('should default to client_secret_basic when auth methods not specified', async () => {
			const metadataWithoutAuthMethods = {
				issuer: 'https://auth.example.com',
				introspection_endpoint: 'https://auth.example.com/oauth/introspect',
			};

			mockedAxios.get.mockResolvedValueOnce({
				status: 200,
				data: metadataWithoutAuthMethods,
			});

			mockedAxios.post.mockResolvedValueOnce({
				status: 200,
				data: validIntrospectionResponse,
			});

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(mockedAxios.post).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(URLSearchParams),
				expect.objectContaining({
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

			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: validMetadata,
			});

			mockedAxios.post.mockResolvedValue({
				status: 200,
				data: longLivedResponse,
			});

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

			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: validMetadata,
			});

			mockedAxios.post.mockResolvedValue({
				status: 200,
				data: expiredButActiveResponse,
			});

			await identifier.resolve(mockContext, validOptions);

			// Check that the subject cache was set with the min TTL
			// Find the call that sets the subject (not metadata)
			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));

			expect(subjectCacheCall).toBeDefined();
			expect(subjectCacheCall![2]).toBe(30 * Time.seconds.toMilliseconds);
		});
	});
});
