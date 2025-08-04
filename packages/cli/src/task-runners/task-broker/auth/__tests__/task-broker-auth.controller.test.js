'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const jest_mock_extended_1 = require('jest-mock-extended');
const cache_service_1 = require('@/services/cache/cache.service');
const bad_request_error_1 = require('../../../../errors/response-errors/bad-request.error');
const forbidden_error_1 = require('../../../../errors/response-errors/forbidden.error');
const task_broker_auth_controller_1 = require('../task-broker-auth.controller');
const task_broker_auth_service_1 = require('../task-broker-auth.service');
describe('TaskBrokerAuthController', () => {
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
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
	const cacheService = new cache_service_1.CacheService(globalConfig);
	const authService = new task_broker_auth_service_1.TaskBrokerAuthService(
		globalConfig,
		cacheService,
		TTL,
	);
	const authController = new task_broker_auth_controller_1.TaskBrokerAuthController(authService);
	const createMockGrantTokenReq = (token) => ({
		body: {
			token,
		},
	});
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('createGrantToken', () => {
		it('should throw BadRequestError when auth token is missing', async () => {
			const req = createMockGrantTokenReq();
			await expect(authController.createGrantToken(req)).rejects.toThrowError(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should throw ForbiddenError when auth token is invalid', async () => {
			const req = createMockGrantTokenReq('invalid');
			await expect(authController.createGrantToken(req)).rejects.toThrowError(
				forbidden_error_1.ForbiddenError,
			);
		});
		it('should return rant token when auth token is valid', async () => {
			const req = createMockGrantTokenReq('random-secret');
			await expect(authController.createGrantToken(req)).resolves.toStrictEqual({
				token: expect.any(String),
			});
		});
	});
	describe('authMiddleware', () => {
		const res = (0, jest_mock_extended_1.mock)();
		const next = jest.fn();
		const createMockReqWithToken = (token) =>
			(0, jest_mock_extended_1.mock)({
				headers: {
					authorization: `Bearer ${token}`,
				},
			});
		beforeEach(() => {
			res.status.mockReturnThis();
		});
		it('should respond with 401 when grant token is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({});
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
//# sourceMappingURL=task-broker-auth.controller.test.js.map
