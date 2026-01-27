import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2UserInfoIdentifier } from '../oauth2-userinfo-identifier';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuth2UserInfoIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
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
		identifier = new OAuth2UserInfoIdentifier(logger, cache);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Happy Path', () => {
		test('should resolve subject successfully', async () => {
			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: validUserInfoResponse,
				});

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('user-123');
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('oauth2-userinfo-identifier:subject'),
				'user-123',
				expect.any(Number),
			);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				'https://auth.example.com/oauth/userinfo',
				expect.objectContaining({
					headers: { authorization: 'Bearer mock-access-token' },
				}),
			);
		});

		test('should return cached result on subsequent calls', async () => {
			cache.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce('cached-user-123');

			mockedAxios.get.mockResolvedValueOnce({
				status: 200,
				data: validMetadata,
			});

			const result = await identifier.resolve(mockContext, validOptions);

			expect(result).toBe('cached-user-123');
			expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Only metadata call, no userinfo call
		});

		test('should extract subject from custom claim', async () => {
			const customOptions = { ...validOptions, subjectClaim: 'email' };
			const customResponse = { ...validUserInfoResponse, email: 'john.doe@example.com' };

			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: customResponse,
				});

			const result = await identifier.resolve(mockContext, customOptions);

			expect(result).toBe('john.doe@example.com');
		});
	});

	describe('Validation', () => {
		test('should validate successfully with valid options', async () => {
			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: validMetadata,
			});

			await expect(identifier.validateOptions(validOptions)).resolves.toBeUndefined();
		});

		test('should throw IdentifierValidationError when metadata missing userinfo_endpoint', async () => {
			const metadataWithoutUserInfo = {
				issuer: 'https://auth.example.com',
			};

			mockedAxios.get.mockResolvedValue({
				status: 200,
				data: metadataWithoutUserInfo,
			});

			await expect(identifier.validateOptions(validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.validateOptions(validOptions)).rejects.toThrow(
				'Invalid OAuth2 metadata format',
			);
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
			mockedAxios.get.mockResolvedValue({
				status: 404,
				data: {},
			});

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to fetch OAuth2 metadata'),
			);
		});

		test('should throw IdentifierValidationError when userinfo call fails', async () => {
			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 401,
					data: { error: 'invalid_token' },
				});

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

			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: responseWithoutSub,
				});

			await expect(identifier.resolve(mockContext, validOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('missing subject claim'));
		});
	});

	describe('TTL Handling', () => {
		test('should use default TTL when exp not provided', async () => {
			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: validUserInfoResponse,
				});

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

			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: longLivedResponse,
				});

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

			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: expiredResponse,
				});

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

			mockedAxios.get
				.mockResolvedValueOnce({
					status: 200,
					data: validMetadata,
				})
				.mockResolvedValueOnce({
					status: 200,
					data: expiringResponse,
				});

			await identifier.resolve(mockContext, validOptions);

			const subjectCacheCall = cache.set.mock.calls.find((call) => call[0].includes(':subject:'));
			expect(subjectCacheCall).toBeDefined();
			// Should be ~120 seconds, but at least MIN_TOKEN_CACHE_TIMEOUT
			expect(subjectCacheCall![2]).toBeGreaterThanOrEqual(30 * Time.seconds.toMilliseconds);
			expect(subjectCacheCall![2]).toBeLessThanOrEqual(120 * Time.seconds.toMilliseconds);
		});
	});
});
