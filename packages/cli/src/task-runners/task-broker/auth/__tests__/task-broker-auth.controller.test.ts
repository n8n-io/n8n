import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';

import { CacheService } from '@/services/cache/cache.service';

import { BadRequestError } from '../../../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../../../errors/response-errors/forbidden.error';
import type { AuthlessRequest } from '../../../../requests';
import { TaskBrokerAuthController } from '../task-broker-auth.controller';
import { TaskBrokerAuthService } from '../task-broker-auth.service';

describe('TaskBrokerAuthController', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		cache: {
			backend: 'memory',
			memory: {
				maxSize: 1024,
				ttl: 9999,
			},
		},
		taskRunners: {
			authToken: 'random-secret',
		},
	});
	const TTL = 100;
	const cacheService = new CacheService(globalConfig);
	const authService = new TaskBrokerAuthService(globalConfig, cacheService, TTL);
	const authController = new TaskBrokerAuthController(authService);

	const createMockGrantTokenReq = (token?: string) =>
		({
			body: {
				token,
			},
		}) as unknown as AuthlessRequest;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createGrantToken', () => {
		it('should throw BadRequestError when auth token is missing', async () => {
			const req = createMockGrantTokenReq();

			// Act
			await expect(authController.createGrantToken(req)).rejects.toThrowError(BadRequestError);
		});

		it('should throw ForbiddenError when auth token is invalid', async () => {
			const req = createMockGrantTokenReq('invalid');

			// Act
			await expect(authController.createGrantToken(req)).rejects.toThrowError(ForbiddenError);
		});

		it('should return grant token when auth token is valid', async () => {
			const req = createMockGrantTokenReq('random-secret');

			// Act
			await expect(authController.createGrantToken(req)).resolves.toStrictEqual({
				token: expect.any(String),
			});
		});
	});

	describe('validateUpgradeRequest', () => {
		it('should return 401 when Authorization header is missing', async () => {
			const result = await authController.validateUpgradeRequest(undefined);

			expect(result).toStrictEqual({
				isValid: false,
				statusCode: 401,
				reason: 'missing or invalid Authorization header',
			});
		});

		it('should return 401 when Authorization header is not a Bearer token', async () => {
			const result = await authController.validateUpgradeRequest('Basic abc123');

			expect(result).toStrictEqual({
				isValid: false,
				statusCode: 401,
				reason: 'missing or invalid Authorization header',
			});
		});

		it('should return 403 when grant token is invalid', async () => {
			const result = await authController.validateUpgradeRequest('Bearer invalid-token');

			expect(result).toStrictEqual({
				isValid: false,
				statusCode: 403,
				reason: 'invalid or expired grant token',
			});
		});

		it('should return valid when grant token is correct', async () => {
			// First create a valid grant token
			const { token } = await authController.createGrantToken(
				createMockGrantTokenReq('random-secret'),
			);

			const result = await authController.validateUpgradeRequest(`Bearer ${token}`);

			expect(result).toStrictEqual({
				isValid: true,
				statusCode: 200,
			});
		});

		it('should return 403 when grant token is used twice', async () => {
			const { token } = await authController.createGrantToken(
				createMockGrantTokenReq('random-secret'),
			);

			// First use should succeed
			await authController.validateUpgradeRequest(`Bearer ${token}`);

			// Second use should fail (token is consumed)
			const result = await authController.validateUpgradeRequest(`Bearer ${token}`);

			expect(result).toStrictEqual({
				isValid: false,
				statusCode: 403,
				reason: 'invalid or expired grant token',
			});
		});
	});
});
