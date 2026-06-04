import { REDACTION_FLOOR_DEFAULT, type RedactionFloor } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { OperationalError, UserError } from 'n8n-workflow';

import type { CacheService } from '@/services/cache/cache.service';

import { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { N8N_ENV_FEAT_REDACTION_ENFORCEMENT } from '../redaction-enforcement.feature-flag';
import type { Mock } from 'vitest';

const KEY = 'redaction.enforcement';

describe('InstanceRedactionEnforcementService', () => {
	const originalFlag = process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];

	let service: InstanceRedactionEnforcementService;
	let findByKey: Mock<(...args: [string]) => Promise<Settings | null>>;
	let upsert: Mock;
	let settingsRepository: SettingsRepository;
	const cacheService = mock<CacheService>();
	const logger = mock<Logger>();

	const enableFlag = () => {
		process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] = 'true';
	};

	const disableFlag = () => {
		delete process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];
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
		vi.clearAllMocks();
		findByKey = vi.fn<(...args: [string]) => Promise<Settings | null>>();
		upsert = vi.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;

		service = new InstanceRedactionEnforcementService(settingsRepository, cacheService, logger);
	});

	afterEach(() => {
		if (originalFlag === undefined) {
			delete process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];
		} else {
			process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] = originalFlag;
		}
	});

	describe('get', () => {
		describe('with feature flag off', () => {
			beforeEach(() => disableFlag());

			it('returns the default floor without touching cache or repository', async () => {
				await expect(service.get()).resolves.toBe(REDACTION_FLOOR_DEFAULT);
				expect(cacheService.get).not.toHaveBeenCalled();
				expect(findByKey).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			});
		});

		describe('with feature flag on', () => {
			beforeEach(() => enableFlag());

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
	});

	describe('set', () => {
		describe('with feature flag off', () => {
			beforeEach(() => disableFlag());

			it('throws OperationalError without touching cache or repository', async () => {
				await expect(service.set('all')).rejects.toThrow(OperationalError);
				expect(upsert).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			});
		});

		describe('with feature flag on', () => {
			beforeEach(() => enableFlag());

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
		});
	});
});
