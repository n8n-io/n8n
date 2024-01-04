import type { CacheService } from '@/services/cache.service';
import type { TestWebhookRegistration } from '@/services/test-webhook-registrations.service';
import { TestWebhookRegistrationsService } from '@/services/test-webhook-registrations.service';
import { mock } from 'jest-mock-extended';

describe('TestWebhookRegistrationsService', () => {
	const cacheService = mock<CacheService>();
	const registrations = new TestWebhookRegistrationsService(cacheService);

	const registration = mock<TestWebhookRegistration>({
		webhook: { httpMethod: 'GET', path: 'hello', webhookId: undefined },
	});

	const key = 'test-webhook:GET|hello';
	const fullCacheKey = `n8n:cache:${key}`;

	describe('register()', () => {
		test('should register a test webhook registration', async () => {
			await registrations.register(registration);

			expect(cacheService.set).toHaveBeenCalledWith(key, registration);
		});
	});

	describe('deregister()', () => {
		test('should deregister a test webhook registration', async () => {
			await registrations.register(registration);

			await registrations.deregister(key);

			expect(cacheService.delete).toHaveBeenCalledWith(key);
		});
	});

	describe('get()', () => {
		test('should retrieve a test webhook registration', async () => {
			cacheService.get.mockResolvedValueOnce(registration);

			const promise = registrations.get(key);

			await expect(promise).resolves.toBe(registration);
		});

		test('should return undefined if no such test webhook registration was found', async () => {
			cacheService.get.mockResolvedValueOnce(undefined);

			const promise = registrations.get(key);

			await expect(promise).resolves.toBeUndefined();
		});
	});

	describe('getAllKeys()', () => {
		test('should retrieve all test webhook registration keys', async () => {
			cacheService.keys.mockResolvedValueOnce([fullCacheKey]);

			const result = await registrations.getAllKeys();

			expect(result).toEqual([key]);
		});
	});

	describe('getAllRegistrations()', () => {
		test('should retrieve all test webhook registrations', async () => {
			cacheService.keys.mockResolvedValueOnce([fullCacheKey]);
			cacheService.getMany.mockResolvedValueOnce([registration]);

			const result = await registrations.getAllRegistrations();

			expect(result).toEqual([registration]);
		});
	});

	describe('updateWebhookProperties()', () => {
		test('should update the properties of a test webhook registration', async () => {
			cacheService.get.mockResolvedValueOnce(registration);

			const newProperties = { ...registration.webhook, isTest: true };

			await registrations.updateWebhookProperties(newProperties);

			registration.webhook = newProperties;

			expect(cacheService.set).toHaveBeenCalledWith(key, registration);

			delete registration.webhook.isTest;
		});
	});

	describe('deregisterAll()', () => {
		test('should deregister all test webhook registrations', async () => {
			cacheService.keys.mockResolvedValueOnce([fullCacheKey]);

			await registrations.deregisterAll();

			expect(cacheService.delete).toHaveBeenCalledWith(key);
		});
	});

	describe('toKey()', () => {
		test('should convert a test webhook registration to a key', () => {
			const result = registrations.toKey(registration.webhook);

			expect(result).toBe(key);
		});
	});
});
