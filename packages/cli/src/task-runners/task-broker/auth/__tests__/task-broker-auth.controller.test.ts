import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { NextFunction, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { CacheService } from '@/services/cache/cache.service';

import { BadRequestError } from '../../../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../../../errors/response-errors/forbidden.error';
import type { AuthlessRequest } from '../../../../requests';
import type { TaskBrokerServerInitRequest } from '../../task-broker-types';
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

		it('should return rant token when auth token is valid', async () => {
			const req = createMockGrantTokenReq('random-secret');

			// Act
			await expect(authController.createGrantToken(req)).resolves.toStrictEqual({
				token: expect.any(String),
			});
		});
	});

	describe('authMiddleware', () => {
		const res = mock<Response>();
		const next = jest.fn() as NextFunction;

		const createMockReqWithToken = (token?: string) =>
			mock<TaskBrokerServerInitRequest>({
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

		beforeEach(() => {
			res.status.mockReturnThis();
		});

		it('should respond with 401 when grant token is missing', async () => {
			const req = mock<TaskBrokerServerInitRequest>({});

			await authController.authMiddleware(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith({ code: 401, message: 'Unauthorized' });
		});

		it('should respond with 403 when grant token is invalid', async () => {
			const req = createMockReqWithToken('invalid');

			await authController.authMiddleware(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith({ code: 403, message: 'Forbidden' });
		});

		it('should call next() when grant token is valid', async () => {
			const { token: validToken } = await authController.createGrantToken(
				createMockGrantTokenReq('random-secret'),
			);

			await authController.authMiddleware(createMockReqWithToken(validToken), res, next);

			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
