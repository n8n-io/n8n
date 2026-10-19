import type { SettingsRepository } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@n8n/backend-services';

import { ScimSettingsService } from '../scim-settings.service';

describe('ScimSettingsService', () => {
	let settingsRepository: Mocked<SettingsRepository>;
	let cacheService: Mocked<CacheService>;
	let service: ScimSettingsService;

	beforeEach(() => {
		settingsRepository = mock<SettingsRepository>();
		cacheService = mock<CacheService>();
		service = new ScimSettingsService(settingsRepository, cacheService);
	});

	describe('isEnabled', () => {
		it('should default to disabled when no setting is stored', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(service.isEnabled()).resolves.toBe(false);
			expect(cacheService.set).toHaveBeenCalledWith('scim.provisioning.enabled', 'false');
		});

		it('should read from the cache when available', async () => {
			cacheService.get.mockResolvedValue('true');

			await expect(service.isEnabled()).resolves.toBe(true);
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should read the stored setting on cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue(
				mock({ key: 'scim.provisioning.enabled', value: 'true' }),
			);

			await expect(service.isEnabled()).resolves.toBe(true);
		});

		// Staying disabled is the security-relevant outcome: while it is false
		// the middleware rejects every /scim/v2 request.
		it('stays disabled when the cache says so, without reading the database', async () => {
			cacheService.get.mockResolvedValue('false');

			await expect(service.isEnabled()).resolves.toBe(false);
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('stays disabled when the stored value is false', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue(
				mock({ key: 'scim.provisioning.enabled', value: 'false' }),
			);

			await expect(service.isEnabled()).resolves.toBe(false);
		});

		// Anything that is not exactly 'true' must not enable provisioning.
		it.each(['TRUE', '1', 'yes', ''])('treats %p as disabled', async (stored) => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue(
				mock({ key: 'scim.provisioning.enabled', value: stored }),
			);

			await expect(service.isEnabled()).resolves.toBe(false);
		});
	});

	describe('setEnabled', () => {
		it.each([true, false])('persists and caches %p', async (enabled) => {
			await service.setEnabled(enabled);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'scim.provisioning.enabled', value: String(enabled), loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith('scim.provisioning.enabled', String(enabled));
		});
	});
	describe('last auth failure', () => {
		const KEY = 'scim.provisioning.lastAuthFailure';
		const failure = { at: '2026-10-19T12:00:00.000Z', reason: 'superseded_token' } as const;

		it('returns null when no failure is stored', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(service.getLastAuthFailure()).resolves.toBeNull();
			expect(settingsRepository.findByKey).toHaveBeenCalledWith(KEY);
		});

		it('returns the stored failure', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				mock({ key: KEY, value: JSON.stringify(failure) }),
			);

			await expect(service.getLastAuthFailure()).resolves.toEqual(failure);
		});

		it.each([
			['a value that is not JSON', 'not json'],
			['an unknown reason', JSON.stringify({ ...failure, reason: 'scim_disabled' })],
			['a value without a time', JSON.stringify({ reason: 'invalid_token' })],
		])('returns null for %s', async (_, value) => {
			settingsRepository.findByKey.mockResolvedValue(mock({ key: KEY, value }));

			await expect(service.getLastAuthFailure()).resolves.toBeNull();
		});

		it('stores the failure in one row that does not load on startup', async () => {
			await service.setLastAuthFailure(failure);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: KEY, value: JSON.stringify(failure), loadOnStartup: false },
				['key'],
			);
		});

		it('clears the stored failure', async () => {
			await service.clearLastAuthFailure();

			expect(settingsRepository.delete).toHaveBeenCalledWith({ key: KEY });
		});
	});
});
