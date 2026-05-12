import { REDACTION_ENFORCEMENT_DEFAULTS } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { OperationalError, UserError } from 'n8n-workflow';

import type { CacheService } from '@/services/cache/cache.service';

import { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { N8N_ENV_FEAT_REDACTION_ENFORCEMENT } from '../redaction-enforcement.feature-flag';

const KEY = 'redaction.enforcement';

describe('InstanceRedactionEnforcementService', () => {
	const originalFlag = process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT];

	let service: InstanceRedactionEnforcementService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
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
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		upsert = jest.fn();
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

			it('returns defaults without touching cache or repository', async () => {
				await expect(service.get()).resolves.toEqual(REDACTION_ENFORCEMENT_DEFAULTS);
				expect(cacheService.get).not.toHaveBeenCalled();
				expect(findByKey).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			});
		});

		describe('with feature flag on', () => {
			beforeEach(() => enableFlag());

			it('returns parsed value from cache on hit without reading DB', async () => {
				const cached = { enforced: true, manual: true, production: true };
				simulateCacheHit(JSON.stringify(cached));

				await expect(service.get()).resolves.toEqual(cached);
				expect(findByKey).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			});

			it('falls back to DB, returns row, and backfills cache on cache miss', async () => {
				const stored = { enforced: true, manual: false, production: true };
				simulateCacheMiss();
				findByKey.mockResolvedValueOnce(
					mock<Settings>({
						key: KEY,
						value: JSON.stringify(stored),
						loadOnStartup: true,
					}),
				);

				await expect(service.get()).resolves.toEqual(stored);
				expect(findByKey).toHaveBeenCalledWith(KEY);
				expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(stored));
			});

			it('returns defaults and backfills cache when no DB row exists', async () => {
				simulateCacheMiss();
				findByKey.mockResolvedValueOnce(null);

				await expect(service.get()).resolves.toEqual(REDACTION_ENFORCEMENT_DEFAULTS);
				expect(cacheService.set).toHaveBeenCalledWith(
					KEY,
					JSON.stringify(REDACTION_ENFORCEMENT_DEFAULTS),
				);
			});

			it('returns defaults when cache has invalid JSON, and logs a warning', async () => {
				simulateCacheHit('not-json');

				await expect(service.get()).resolves.toEqual(REDACTION_ENFORCEMENT_DEFAULTS);
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to parse redaction enforcement setting JSON',
					expect.objectContaining({ source: 'cache' }),
				);
				expect(findByKey).not.toHaveBeenCalled();
			});

			it('returns defaults and backfills cache when DB value has an invalid shape, and logs a warning', async () => {
				simulateCacheMiss();
				findByKey.mockResolvedValueOnce(
					mock<Settings>({
						key: KEY,
						value: JSON.stringify({ enforced: 'yes', manual: false, production: true }),
						loadOnStartup: true,
					}),
				);

				await expect(service.get()).resolves.toEqual(REDACTION_ENFORCEMENT_DEFAULTS);
				expect(logger.warn).toHaveBeenCalledWith(
					'Redaction enforcement setting has an invalid shape',
					expect.objectContaining({ source: 'database' }),
				);
				expect(cacheService.set).toHaveBeenCalledWith(
					KEY,
					JSON.stringify(REDACTION_ENFORCEMENT_DEFAULTS),
				);
			});
		});
	});

	describe('set', () => {
		describe('with feature flag off', () => {
			beforeEach(() => disableFlag());

			it('throws OperationalError without touching cache or repository', async () => {
				await expect(
					service.set({ enforced: true, manual: true, production: true }),
				).rejects.toThrow(OperationalError);
				expect(upsert).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			});
		});

		describe('with feature flag on', () => {
			beforeEach(() => enableFlag());

			it('upserts the setting and writes the same serialized value to cache', async () => {
				const next = { enforced: true, manual: false, production: true };

				await service.set(next);

				expect(upsert).toHaveBeenCalledWith(
					{ key: KEY, value: JSON.stringify(next), loadOnStartup: true },
					['key'],
				);
				expect(cacheService.set).toHaveBeenCalledWith(KEY, JSON.stringify(next));
			});

			it('rejects invalid input with a UserError and logs validation issues', async () => {
				const invalid = { enforced: true, manual: 'yes', production: true } as unknown as {
					enforced: boolean;
					manual: boolean;
					production: boolean;
				};

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
