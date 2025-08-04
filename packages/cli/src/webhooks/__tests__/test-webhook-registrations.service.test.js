'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const test_webhook_registrations_service_1 = require('@/webhooks/test-webhook-registrations.service');
describe('TestWebhookRegistrationsService', () => {
	const cacheService = (0, jest_mock_extended_1.mock)();
	const registrations = new test_webhook_registrations_service_1.TestWebhookRegistrationsService(
		cacheService,
		(0, jest_mock_extended_1.mock)({ isMultiMain: false }),
	);
	const registration = (0, jest_mock_extended_1.mock)({
		webhook: { httpMethod: 'GET', path: 'hello', webhookId: undefined },
	});
	const webhookKey = 'GET|hello';
	const cacheKey = 'test-webhooks';
	describe('register()', () => {
		test('should register a test webhook registration', async () => {
			await registrations.register(registration);
			expect(cacheService.setHash).toHaveBeenCalledWith(cacheKey, { [webhookKey]: registration });
		});
		test('should skip setting TTL in single-main setup', async () => {
			await registrations.register(registration);
			expect(cacheService.expire).not.toHaveBeenCalled();
		});
	});
	describe('deregister()', () => {
		test('should deregister a test webhook registration', async () => {
			await registrations.register(registration);
			await registrations.deregister(webhookKey);
			expect(cacheService.deleteFromHash).toHaveBeenCalledWith(cacheKey, webhookKey);
		});
	});
	describe('get()', () => {
		test('should retrieve a test webhook registration', async () => {
			cacheService.getHashValue.mockResolvedValueOnce(registration);
			const promise = registrations.get(webhookKey);
			await expect(promise).resolves.toBe(registration);
		});
		test('should return undefined if no such test webhook registration was found', async () => {
			cacheService.getHashValue.mockResolvedValueOnce(undefined);
			const promise = registrations.get(webhookKey);
			await expect(promise).resolves.toBeUndefined();
		});
	});
	describe('getAllKeys()', () => {
		test('should retrieve all test webhook registration keys', async () => {
			cacheService.getHash.mockResolvedValueOnce({ [webhookKey]: registration });
			const result = await registrations.getAllKeys();
			expect(result).toEqual([webhookKey]);
		});
	});
	describe('getAllRegistrations()', () => {
		test('should retrieve all test webhook registrations', async () => {
			cacheService.getHash.mockResolvedValueOnce({ [webhookKey]: registration });
			const result = await registrations.getAllRegistrations();
			expect(result).toEqual([registration]);
		});
	});
	describe('deregisterAll()', () => {
		test('should deregister all test webhook registrations', async () => {
			await registrations.deregisterAll();
			expect(cacheService.delete).toHaveBeenCalledWith(cacheKey);
		});
	});
	describe('toKey()', () => {
		test('should convert a test webhook registration to a key', () => {
			const result = registrations.toKey(registration.webhook);
			expect(result).toBe(webhookKey);
		});
	});
});
//# sourceMappingURL=test-webhook-registrations.service.test.js.map
