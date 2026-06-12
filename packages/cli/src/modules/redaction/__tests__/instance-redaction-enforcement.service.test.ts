import { REDACTION_FLOOR_DEFAULT, type RedactionFloor } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import { SELF_SEND_COMMANDS } from '@/scaling/constants';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { CacheService } from '@/services/cache/cache.service';

import { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';

const KEY = 'redaction.enforcement';

describe('InstanceRedactionEnforcementService', () => {
	let service: InstanceRedactionEnforcementService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	const cacheService = mock<CacheService>();
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();
	const globalConfig = mock<GlobalConfig>();

	const enableMultiMain = () => {
		Object.defineProperty(globalConfig, 'multiMainSetup', {
			value: { enabled: true },
			configurable: true,
		});
	};

	const disableMultiMain = () => {
		Object.defineProperty(globalConfig, 'multiMainSetup', {
			value: { enabled: false },
			configurable: true,
		});
	};

	// Mirrors the real CacheService.get refreshFn contract: on miss, invoke the
	// refreshFn, write the result back via set(), and return it.
	const simulateCacheMiss = () => {
		cacheService.get.mockImplementationOnce(async (key, opts) => {
			const refreshed = await opts!.refreshFn!(key);
			await cacheService.set(key, refreshed);
			return refreshed;
		});
	};

	const simulateCacheHit = (value: string) => {
		cacheService.get.mockResolvedValueOnce(value);
	};

	beforeEach(() => {
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		upsert = jest.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;

		disableMultiMain();
		publisher.publishCommand.mockResolvedValue(undefined);

		service = new InstanceRedactionEnforcementService(
			settingsRepository,
			cacheService,
			logger,
			publisher,
			globalConfig,
		);
	});

	describe('get', () => {
		it('returns parsed floor from cache on hit without reading DB', async () => {
			const cached: RedactionFloor = 'all';
			simulateCacheHit(JSON.stringify(cached));

			await expect(service.get()).resolves.toBe(cached);
			expect(findByKey).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('falls back to DB, returns row, and backfills cache on cache miss', async () => {
			const stored: RedactionFloor = 'production';
			simulateCacheMiss();
			findByKey.mockResolvedValueOnce(
				mock<Settings>({
					key: KEY,
					value: JSON.stringify(stored),
					loadOnStartup: true,
				}),
			);

			await expect(service.get()).resolves.toBe(stored);
			expect(findByKey).toHaveBeenCalledWith(KEY);
			expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(stored));
		});

		it('returns the default floor and backfills cache when no DB row exists', async () => {
			simulateCacheMiss();
			findByKey.mockResolvedValueOnce(null);

			await expect(service.get()).resolves.toBe(REDACTION_FLOOR_DEFAULT);
			expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(REDACTION_FLOOR_DEFAULT));
		});

		it('returns the default floor when cache has invalid JSON, and logs a warning', async () => {
			simulateCacheHit('not-json');

			await expect(service.get()).resolves.toBe(REDACTION_FLOOR_DEFAULT);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to parse redaction enforcement setting JSON',
				expect.objectContaining({ source: 'cache' }),
			);
			expect(findByKey).not.toHaveBeenCalled();
		});

		it('returns the default floor and backfills cache when DB value has an invalid shape, and logs a warning', async () => {
			simulateCacheMiss();
			findByKey.mockResolvedValueOnce(
				mock<Settings>({
					key: KEY,
					value: JSON.stringify('bogus'),
					loadOnStartup: true,
				}),
			);

			await expect(service.get()).resolves.toBe(REDACTION_FLOOR_DEFAULT);
			expect(logger.warn).toHaveBeenCalledWith(
				'Redaction enforcement setting has an invalid shape',
				expect.objectContaining({ source: 'database' }),
			);
			expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(REDACTION_FLOOR_DEFAULT));
		});
	});

	describe('set', () => {
		it('upserts the floor and writes the same serialized value to cache', async () => {
			const next: RedactionFloor = 'production';

			await service.set(next);

			expect(upsert).toHaveBeenCalledWith(
				{ key: KEY, value: JSON.stringify(next), loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(next));
		});

		it('rejects invalid input with a UserError and logs validation issues', async () => {
			const invalid = 'bogus' as unknown as RedactionFloor;

			await expect(service.set(invalid)).rejects.toThrow(UserError);
			expect(logger.warn).toHaveBeenCalledWith(
				'Invalid redaction enforcement settings payload',
				expect.objectContaining({ issues: expect.any(Array) }),
			);
			expect(upsert).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('publishes redaction-floor-changed when multi-main is enabled', async () => {
			enableMultiMain();

			await service.set('production');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'redaction-floor-changed',
			});
		});

		it('does not broadcast when multi-main is disabled', async () => {
			disableMultiMain();

			await service.set('production');

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('swallows publisher failures so the update keeps succeeding, and logs a warning', async () => {
			enableMultiMain();
			publisher.publishCommand.mockRejectedValueOnce(new Error('redis is down'));

			await expect(service.set('production')).resolves.toBeUndefined();
			// Allow the fire-and-forget catch handler to run.
			await Promise.resolve();
			// The update still persisted and re-cached despite the publish failure.
			expect(upsert).toHaveBeenCalledWith(
				{ key: KEY, value: JSON.stringify('production'), loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify('production'));
			expect(logger.warn).toHaveBeenCalledWith(
				'[InstanceRedactionEnforcementService] Failed to publish redaction-floor-changed',
				expect.objectContaining({ error: 'redis is down' }),
			);
		});
	});

	describe('handleRedactionFloorChanged', () => {
		it('deletes the local cache key without re-publishing — no broadcast loop', async () => {
			enableMultiMain();

			await service.handleRedactionFloorChanged();

			expect(cacheService.delete).toHaveBeenCalledWith(KEY);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('delete causes the next get to miss and re-read the new value from the DB', async () => {
			// Stateful in-memory cache so the delete — not the test harness — is what
			// forces the subsequent read to miss. The test fails if the handler stops
			// calling cacheService.delete.
			const store = new Map<string, string>();
			cacheService.set.mockImplementation(async (key, value) => {
				store.set(key, value as string);
			});
			cacheService.delete.mockImplementation(async (key) => {
				store.delete(key);
			});
			cacheService.get.mockImplementation(async (key, opts) => {
				if (store.has(key)) return store.get(key);
				const refreshed = (await opts!.refreshFn!(key)) as string;
				store.set(key, refreshed);
				return refreshed;
			});

			// Seed a STALE value and confirm reads hit it.
			const stale: RedactionFloor = 'off';
			await cacheService.set(KEY, JSON.stringify(stale));
			await expect(service.get()).resolves.toBe(stale);
			expect(findByKey).not.toHaveBeenCalled();

			// A peer main reports a change; the DB now holds the NEW value.
			const updated: RedactionFloor = 'production';
			findByKey.mockResolvedValue(
				mock<Settings>({
					key: KEY,
					value: JSON.stringify(updated),
					loadOnStartup: true,
				}),
			);

			await service.handleRedactionFloorChanged();
			expect(cacheService.delete).toHaveBeenCalledWith(KEY);

			// The dropped key makes the next read miss → refreshFn → DB → re-cache.
			await expect(service.get()).resolves.toBe(updated);
			expect(findByKey).toHaveBeenCalledWith(KEY);
			// The refreshFn re-cached the fresh value via the (stateful) cache.
			expect(store.get(KEY)).toBe(JSON.stringify(updated));
		});

		it('relies on redaction-floor-changed not being a self-send command', () => {
			// The originating main already updates its own cache synchronously in
			// set(); if this command became self-send, that main would also delete
			// its freshly written cache entry on receipt.
			expect(SELF_SEND_COMMANDS.has('redaction-floor-changed')).toBe(false);
		});
	});
});
