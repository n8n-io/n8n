'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const n8n_workflow_1 = require('n8n-workflow');
const config_2 = __importDefault(require('@/config'));
const cache_service_1 = require('@/services/cache/cache.service');
const retry_until_1 = require('@test-integration/retry-until');
const task_broker_auth_service_1 = require('../task-broker-auth.service');
describe('TaskBrokerAuthService', () => {
	config_2.default.set('taskRunners.authToken', 'random-secret');
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
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('isValidAuthToken', () => {
		it('should be valid for the configured token', () => {
			expect(authService.isValidAuthToken('random-secret')).toBe(true);
		});
		it('should be invalid for anything else', () => {
			expect(authService.isValidAuthToken('!random-secret')).toBe(false);
		});
	});
	describe('createGrantToken', () => {
		it('should generate a random token', async () => {
			expect(typeof (await authService.createGrantToken())).toBe('string');
		});
		it('should store the generated token in cache', async () => {
			const cacheSetSpy = jest.spyOn(cacheService, 'set');
			const token = await authService.createGrantToken();
			expect(cacheSetSpy).toHaveBeenCalledWith(`grant-token:${token}`, '1', TTL);
		});
	});
	describe('tryConsumeGrantToken', () => {
		it('should return false for an invalid grant token', async () => {
			expect(await authService.tryConsumeGrantToken('random-secret')).toBe(false);
		});
		it('should return true for a valid grant token', async () => {
			const grantToken = await authService.createGrantToken();
			expect(await authService.tryConsumeGrantToken(grantToken)).toBe(true);
		});
		it('should return false for a already used grant token', async () => {
			const grantToken = await authService.createGrantToken();
			expect(await authService.tryConsumeGrantToken(grantToken)).toBe(true);
			expect(await authService.tryConsumeGrantToken(grantToken)).toBe(false);
		});
		it('should return false for an expired grant token', async () => {
			const grantToken = await authService.createGrantToken();
			await (0, n8n_workflow_1.sleep)(TTL + 1);
			await (0, retry_until_1.retryUntil)(async () =>
				expect(await authService.tryConsumeGrantToken(grantToken)).toBe(false),
			);
		});
	});
});
//# sourceMappingURL=task-broker-auth.service.test.js.map
