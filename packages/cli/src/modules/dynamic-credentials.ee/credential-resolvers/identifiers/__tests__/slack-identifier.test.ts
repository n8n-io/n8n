import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { SlackIdentifier } from '../slack-identifier';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SlackIdentifier', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
	let identifier: SlackIdentifier;

	const authTestOptions = {
		validation: 'slack-auth-test' as const,
		subjectClaim: 'user_id',
	};

	const requestOptions = {
		validation: 'slack-request' as const,
	};

	const validAuthTestResponse = {
		ok: true,
		url: 'https://test-workspace.slack.com/',
		team: 'Test Workspace',
		user: 'testuser',
		team_id: 'T12345678',
		user_id: 'U12345678',
		is_enterprise_install: false,
	};

	const mockContext = {
		identity: 'xoxp-mock-slack-token',
		version: 1 as const,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		identifier = new SlackIdentifier(logger, cache);
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('slack-auth-test mode', () => {
		describe('Happy Path', () => {
			test('should resolve user_id successfully from Slack token', async () => {
				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: validAuthTestResponse,
				});

				const result = await identifier.resolve(mockContext, authTestOptions);

				expect(result).toBe('U12345678');
				expect(mockedAxios.post).toHaveBeenCalledWith(
					'https://slack.com/api/auth.test',
					{},
					expect.objectContaining({
						headers: { authorization: 'Bearer xoxp-mock-slack-token' },
					}),
				);
			});

			test('should cache the resolved subject', async () => {
				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: validAuthTestResponse,
				});

				await identifier.resolve(mockContext, authTestOptions);

				expect(cache.set).toHaveBeenCalledWith(
					expect.stringContaining('slack-identifier:subject:'),
					'U12345678',
					expect.any(Number),
				);
			});

			test('should return cached result on subsequent calls', async () => {
				cache.get.mockResolvedValueOnce('cached-U12345678');

				const result = await identifier.resolve(mockContext, authTestOptions);

				expect(result).toBe('cached-U12345678');
				expect(mockedAxios.post).not.toHaveBeenCalled();
			});

			test('should extract subject from custom claim', async () => {
				const customOptions = { ...authTestOptions, subjectClaim: 'team_id' };

				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: validAuthTestResponse,
				});

				const result = await identifier.resolve(mockContext, customOptions);

				expect(result).toBe('T12345678');
			});

			test('should work with bot tokens', async () => {
				const botContext = {
					identity: 'xoxb-mock-bot-token',
					version: 1 as const,
				};

				const botResponse = {
					...validAuthTestResponse,
					bot_id: 'B12345678',
					user_id: 'U87654321',
				};

				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: botResponse,
				});

				const result = await identifier.resolve(botContext, authTestOptions);

				expect(result).toBe('U87654321');
			});
		});

		describe('Critical Errors', () => {
			test('should throw when auth.test HTTP request fails', async () => {
				mockedAxios.post.mockResolvedValueOnce({
					status: 500,
					data: {},
				});

				await expect(identifier.resolve(mockContext, authTestOptions)).rejects.toThrow(
					IdentifierValidationError,
				);
			});

			test('should throw when Slack returns ok: false', async () => {
				mockedAxios.post.mockResolvedValue({
					status: 200,
					data: { ok: false, error: 'invalid_auth' },
				});

				await expect(identifier.resolve(mockContext, authTestOptions)).rejects.toThrow(
					'Slack auth.test failed: invalid_auth',
				);
			});

			test('should throw when subject claim is missing', async () => {
				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: { ok: true, team_id: 'T123' },
				});

				await expect(identifier.resolve(mockContext, authTestOptions)).rejects.toThrow(
					IdentifierValidationError,
				);
			});
		});

		describe('Caching', () => {
			test('should use default TTL for cache', async () => {
				mockedAxios.post.mockResolvedValueOnce({
					status: 200,
					data: validAuthTestResponse,
				});

				await identifier.resolve(mockContext, authTestOptions);

				const cacheCall = cache.set.mock.calls.find((call) =>
					call[0].includes('slack-identifier:subject:'),
				);
				expect(cacheCall).toBeDefined();
				expect(cacheCall![2]).toBe(60 * Time.seconds.toMilliseconds);
			});
		});
	});

	describe('slack-request mode (passthrough)', () => {
		test('should return identity directly without API call', async () => {
			const context = { identity: 'U0A293J0RFV', version: 1 as const };

			const result = await identifier.resolve(context, requestOptions);

			expect(result).toBe('U0A293J0RFV');
			expect(mockedAxios.post).not.toHaveBeenCalled();
			expect(cache.get).not.toHaveBeenCalled();
			expect(cache.set).not.toHaveBeenCalled();
		});

		test('should throw for empty identity', async () => {
			const context = { identity: '', version: 1 as const };

			await expect(identifier.resolve(context, requestOptions)).rejects.toThrow(
				IdentifierValidationError,
			);
			await expect(identifier.resolve(context, requestOptions)).rejects.toThrow(
				'Empty identity from Slack request',
			);
		});
	});

	describe('Validation', () => {
		test('should validate slack-auth-test options', async () => {
			await expect(identifier.validateOptions(authTestOptions)).resolves.toBeUndefined();
		});

		test('should validate slack-request options', async () => {
			await expect(identifier.validateOptions(requestOptions)).resolves.toBeUndefined();
		});

		test('should reject options without validation field', async () => {
			await expect(identifier.validateOptions({})).rejects.toThrow(IdentifierValidationError);
		});

		test('should reject options with invalid validation value', async () => {
			await expect(identifier.validateOptions({ validation: 'invalid' })).rejects.toThrow(
				IdentifierValidationError,
			);
		});
	});
});
