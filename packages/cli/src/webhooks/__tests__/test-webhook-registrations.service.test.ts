import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';
import type { TestWebhookRegistration } from '@/webhooks/test-webhook-registrations.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

describe('TestWebhookRegistrationsService', () => {
	const cacheService = mock<CacheService>();
	const registrations = new TestWebhookRegistrationsService(
		cacheService,
		mock<InstanceSettings>({ isMultiMain: false }),
	);

	const registration = mock<TestWebhookRegistration>({
		version: 1,
		webhook: { httpMethod: 'GET', path: 'hello', webhookId: undefined },
	});

	const webhookKey = 'GET|hello';
	const cacheKey = 'test-webhooks';

	beforeEach(() => {
		vi.resetAllMocks();
		cacheService.exists.mockResolvedValue(true);
	});

	describe('register()', () => {
		test('should register a test webhook registration', async () => {
			await registrations.register(registration);

			expect(cacheService.setHash).toHaveBeenCalledWith(cacheKey, {
				[webhookKey]: expect.objectContaining({ version: 1, expiresAt: expect.any(Number) }),
			});
		});

		test('should skip setting TTL in single-main setup', async () => {
			await registrations.register(registration);

			expect(cacheService.expire).not.toHaveBeenCalled();
		});

		test('should set the given TTL on the hash in multi-main setup', async () => {
			const multiMainRegistrations = new TestWebhookRegistrationsService(
				cacheService,
				mock<InstanceSettings>({ isSingleMain: false }),
			);

			await multiMainRegistrations.register(registration, 1234);

			expect(cacheService.expire).toHaveBeenCalledWith(cacheKey, 1234);
		});

		test('should keep the hash TTL at the longest remaining registration in multi-main setup', async () => {
			const multiMainRegistrations = new TestWebhookRegistrationsService(
				cacheService,
				mock<InstanceSettings>({ isSingleMain: false }),
			);
			const longLivedKey = 'POST|long';
			cacheService.getHash.mockResolvedValue({
				[longLivedKey]: { version: 1, expiresAt: Date.now() + 500_000 },
			});

			await multiMainRegistrations.register(registration, 1234);

			const [, ttl] = cacheService.expire.mock.calls[0];
			expect(ttl).toBeGreaterThan(499_000);
			expect(ttl).toBeLessThanOrEqual(500_000);
		});

		test('should throw an error if the registration fails', async () => {
			cacheService.exists.mockResolvedValue(false);

			await expect(registrations.register(registration)).rejects.toThrow(
				'Test webhook registration failed: workflow is too big. Remove pinned data',
			);
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

		test('should skip registrations with outdated version', async () => {
			const { version, ...outdatedRegistration } = registration; // remove the version property to simulate outdated registration
			cacheService.getHashValue.mockResolvedValueOnce(outdatedRegistration);

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
			cacheService.getHash.mockResolvedValueOnce({
				[webhookKey]: registration,
				ANOTHER_KEY: { invalid: 'data' }, // invalid registration to test filtering
			});

			const result = await registrations.getAllRegistrations();

			expect(result).toEqual([registration]);
		});
	});

	describe('toKey()', () => {
		test('should convert a test webhook registration to a key', () => {
			const result = registrations.toKey(registration.webhook);

			expect(result).toBe(webhookKey);
		});
	});
});
