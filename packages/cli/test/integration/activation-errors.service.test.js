'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const activation_errors_service_1 = require('@/activation-errors.service');
const cache_service_1 = require('@/services/cache/cache.service');
describe('ActivationErrorsService', () => {
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		cache: { backend: 'memory', memory: { maxSize: 3 * 1024 * 1024, ttl: 3600 * 1000 } },
	});
	const cacheService = new cache_service_1.CacheService(globalConfig);
	const activationErrorsService = new activation_errors_service_1.ActivationErrorsService(
		cacheService,
	);
	const firstWorkflowId = 'GSG0etbfTA2CNPDX';
	const secondWorkflowId = 'k2ORscMPO66K0Jk3';
	const firstErrorMsg = 'Failed to activate';
	const secondErrorMsg = 'Also failed to activate';
	afterEach(async () => {
		await activationErrorsService.clearAll();
	});
	describe('register', () => {
		test('should register an activation error for a workflow', async () => {
			await activationErrorsService.register(firstWorkflowId, firstErrorMsg);
			const activationError = await activationErrorsService.get(firstWorkflowId);
			expect(activationError).toBe(firstErrorMsg);
		});
	});
	describe('deregister', () => {
		test('should deregister an activation error for a workflow', async () => {
			await activationErrorsService.register(firstWorkflowId, firstErrorMsg);
			await activationErrorsService.deregister(firstWorkflowId);
			const activationError = await activationErrorsService.get(firstWorkflowId);
			expect(activationError).toBeNull();
		});
	});
	describe('get', () => {
		test('should retrieve an activation error for a workflow', async () => {
			await activationErrorsService.register(firstWorkflowId, firstErrorMsg);
			const activationError = await activationErrorsService.get(firstWorkflowId);
			expect(activationError).toBe(firstErrorMsg);
		});
		test('should return `null` if no activation error found for a workflow', async () => {
			const activationError = await activationErrorsService.get(firstWorkflowId);
			expect(activationError).toBeNull();
		});
	});
	describe('getAll', () => {
		test('should retrieve all activation errors', async () => {
			await activationErrorsService.register(firstWorkflowId, firstErrorMsg);
			await activationErrorsService.register(secondWorkflowId, secondErrorMsg);
			const allActivationErrors = await activationErrorsService.getAll();
			expect(allActivationErrors).toEqual({
				[firstWorkflowId]: firstErrorMsg,
				[secondWorkflowId]: secondErrorMsg,
			});
		});
		test('should return an empty object if no activation errors', async () => {
			const allActivationErrors = await activationErrorsService.getAll();
			expect(allActivationErrors).toEqual({});
		});
	});
	describe('clearAll()', () => {
		test('should clear activation errors', async () => {
			await activationErrorsService.register(firstWorkflowId, firstErrorMsg);
			await activationErrorsService.register(secondWorkflowId, secondErrorMsg);
			await activationErrorsService.clearAll();
			const allActivationErrors = await activationErrorsService.getAll();
			expect(allActivationErrors).toEqual({});
		});
	});
});
//# sourceMappingURL=activation-errors.service.test.js.map
