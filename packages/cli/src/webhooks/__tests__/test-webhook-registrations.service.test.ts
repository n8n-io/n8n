import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	TEST_WEBHOOK_MAX_TIMEOUT,
	TEST_WEBHOOK_TIMEOUT,
	TEST_WEBHOOK_TIMEOUT_BUFFER,
} from '@/constants';
import type { CacheService } from '@/services/cache/cache.service';
import type { TestWebhookRegistration } from '@/webhooks/test-webhook-registrations.service';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';

describe('TestWebhookRegistrationsService', () => {
	const now = new Date('2026-01-01T00:00:00.000Z').getTime();
	const cacheService = mock<CacheService>();
	const registrations = new TestWebhookRegistrationsService(
		cacheService,
		mock<InstanceSettings>({ isMultiMain: false }),
	);

	// `expiresAt` is set explicitly: a deep mock would return a function for it and read as expired.
	const registration = mock<TestWebhookRegistration>({
		version: 1,
		webhook: { httpMethod: 'GET', path: 'hello', webhookId: undefined },
		expiresAt: now + 60_000,
	});

	const webhookKey = 'GET|hello';
	const cacheKey = 'test-webhooks';

	beforeAll(() => {
		vi.setSystemTime(now);
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.resetAllMocks();
		cacheService.exists.mockResolvedValue(true);
	});

	describe('register()', () => {
		test('should register a test webhook registration', async () => {
			await registrations.register(registration);

			expect(cacheService.setHash).toHaveBeenCalledWith(cacheKey, {
				[webhookKey]: expect.objectContaining({
					version: 1,
					expiresAt: now + TEST_WEBHOOK_TIMEOUT + TEST_WEBHOOK_TIMEOUT_BUFFER,
				}),
			});
		});

		test('should skip setting TTL in single-main setup', async () => {
			await registrations.register(registration);

			expect(cacheService.expire).not.toHaveBeenCalled();
		});

		test('should set the maximum window plus buffer as the hash TTL in multi-main setup', async () => {
			const multiMainRegistrations = new TestWebhookRegistrationsService(
				cacheService,
				mock<InstanceSettings>({ isSingleMain: false }),
			);

			await multiMainRegistrations.register(registration, 1234);

			expect(cacheService.expire).toHaveBeenCalledWith(
				cacheKey,
				TEST_WEBHOOK_MAX_TIMEOUT + TEST_WEBHOOK_TIMEOUT_BUFFER,
			);
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

		test('should skip and delete an expired registration', async () => {
			cacheService.getHashValue.mockResolvedValueOnce({ version: 1, expiresAt: now - 1 });

			await expect(registrations.get(webhookKey)).resolves.toBeUndefined();
			expect(cacheService.deleteFromHash).toHaveBeenCalledExactlyOnceWith(cacheKey, webhookKey);
		});

		test('should skip registrations with outdated version', async () => {
			const { version, ...outdatedRegistration } = registration; // remove the version property to simulate outdated registration
			cacheService.getHashValue.mockResolvedValueOnce(outdatedRegistration);

			const promise = registrations.get(webhookKey);

			await expect(promise).resolves.toBeUndefined();
			// A main on another version may own it, so it stays in the store.
			expect(cacheService.deleteFromHash).not.toHaveBeenCalled();
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
		test('should retrieve live registrations and delete expired ones', async () => {
			cacheService.getHash.mockResolvedValueOnce({
				[webhookKey]: registration,
				ANOTHER_KEY: { invalid: 'data' }, // invalid registration to test filtering
				EXPIRED_KEY: { version: 1, expiresAt: now - 1 },
			});

			const result = await registrations.getAllRegistrations();

			expect(result).toEqual([registration]);
			expect(cacheService.deleteFromHash).toHaveBeenCalledExactlyOnceWith(cacheKey, 'EXPIRED_KEY');
		});
	});

	describe('getRegistrationsHash()', () => {
		test('should drop invalid registrations and delete expired ones', async () => {
			cacheService.getHash.mockResolvedValueOnce({
				[webhookKey]: registration,
				ANOTHER_KEY: { invalid: 'data' },
				EXPIRED_KEY: { version: 1, expiresAt: now - 1 },
			});

			const result = await registrations.getRegistrationsHash();

			expect(result).toEqual({ [webhookKey]: registration });
			expect(cacheService.deleteFromHash).toHaveBeenCalledExactlyOnceWith(cacheKey, 'EXPIRED_KEY');
		});
	});

	describe('toKey()', () => {
		test('should convert a test webhook registration to a key', () => {
			const result = registrations.toKey(registration.webhook);

			expect(result).toBe(webhookKey);
		});
	});
});
