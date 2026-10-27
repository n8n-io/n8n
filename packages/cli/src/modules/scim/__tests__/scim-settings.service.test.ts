import type { OperationContext, Settings, SettingsRepository, TransactionRunner } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@n8n/backend-services';

import { ScimSettingsService } from '../scim-settings.service';

describe('ScimSettingsService', () => {
	let settingsRepository: Mocked<SettingsRepository>;
	let cacheService: Mocked<CacheService>;
	let transactionRunner: Mocked<TransactionRunner>;
	let service: ScimSettingsService;

	/** The context that the transaction gives to the repository calls. */
	const trxCtx = mock<OperationContext>();

	beforeEach(() => {
		settingsRepository = mock<SettingsRepository>();
		cacheService = mock<CacheService>();
		transactionRunner = mock<TransactionRunner>();
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(trxCtx));
		service = new ScimSettingsService(settingsRepository, cacheService, transactionRunner);
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

	describe('update', () => {
		const ENABLED_KEY = 'scim.provisioning.enabled';

		const savedSwitch = (value: string) =>
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				mock<Settings>({ key: ENABLED_KEY, value }),
			);

		beforeEach(() => {
			savedSwitch('true');
		});

		it('saves the switch that it reads with a write lock', async () => {
			const result = await service.update({ enabled: false });

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(result).toEqual({ wasEnabled: true, enabled: false });
		});

		it('caches the switch only after the transaction', async () => {
			transactionRunner.run.mockImplementation(async (_ctx, fn) => {
				const result = await fn(trxCtx);
				expect(cacheService.set).not.toHaveBeenCalled();
				return result;
			});

			await service.update({ enabled: true });

			expect(cacheService.set).toHaveBeenCalledExactlyOnceWith(ENABLED_KEY, 'true');
		});

		it('does not cache the switch when the transaction fails', async () => {
			transactionRunner.run.mockRejectedValue(new Error('db down'));

			await expect(service.update({ enabled: true })).rejects.toThrow('db down');
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		// The lock creates a missing switch as off.
		it('reports SCIM as off before the change when no switch is stored', async () => {
			savedSwitch('false');

			const result = await service.update({ enabled: true });

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(result).toMatchObject({ wasEnabled: false, enabled: true });
		});

		it('checks an enable under the switch lock, before it saves the switch', async () => {
			savedSwitch('false');
			const assertCanEnable = vi.fn();

			await service.update({ enabled: true, assertCanEnable });

			// The check reads the saved method in the same transaction.
			expect(assertCanEnable).toHaveBeenCalledWith(trxCtx);

			const lockOrder = settingsRepository.getOrCreateWithWriteLock.mock.invocationCallOrder[0];
			const checkOrder = assertCanEnable.mock.invocationCallOrder[0];
			const saveOrder = settingsRepository.upsertByKey.mock.invocationCallOrder[0];
			expect(lockOrder).toBeLessThan(checkOrder);
			expect(checkOrder).toBeLessThan(saveOrder);
		});

		it('saves and caches nothing when the enable check fails', async () => {
			savedSwitch('false');
			const assertCanEnable = vi.fn(() => {
				throw new Error('single sign-on is off');
			});

			await expect(service.update({ enabled: true, assertCanEnable })).rejects.toThrow(
				'single sign-on is off',
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('does not run the enable check when the change turns SCIM off', async () => {
			const assertCanEnable = vi.fn();

			await service.update({ enabled: false, assertCanEnable });

			expect(assertCanEnable).not.toHaveBeenCalled();
		});
	});

	describe('turnOff', () => {
		const ENABLED_KEY = 'scim.provisioning.enabled';

		const savedSwitch = (value: string) =>
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				mock<Settings>({ key: ENABLED_KEY, value }),
			);

		// An enable can commit while the cache still holds the old value.
		it('turns off the saved switch when the cache says off and the database says on', async () => {
			cacheService.get.mockResolvedValue('false');
			savedSwitch('true');

			await expect(service.turnOff()).resolves.toBe(true);

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(cacheService.get).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledExactlyOnceWith(ENABLED_KEY, 'false');
		});

		it('saves nothing and reports off when the saved switch is off', async () => {
			cacheService.get.mockResolvedValue('true');
			savedSwitch('false');

			await expect(service.turnOff()).resolves.toBe(false);

			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(cacheService.set).toHaveBeenCalledExactlyOnceWith(ENABLED_KEY, 'false');
		});

		it('caches off only after the transaction', async () => {
			savedSwitch('true');
			transactionRunner.run.mockImplementation(async (_ctx, fn) => {
				const result = await fn(trxCtx);
				expect(cacheService.set).not.toHaveBeenCalled();
				return result;
			});

			await service.turnOff();

			expect(cacheService.set).toHaveBeenCalledTimes(1);
		});
	});

	describe('isSavedEnabled', () => {
		const ENABLED_KEY = 'scim.provisioning.enabled';

		// An enable can commit while the cache still holds the old value.
		it.each([
			['true', true],
			['false', false],
		])('reads the saved switch %s under the read lock, not the cache', async (saved, enabled) => {
			cacheService.get.mockResolvedValue(enabled ? 'false' : 'true');
			settingsRepository.getOrCreateWithReadLock.mockResolvedValue(
				mock<Settings>({ key: ENABLED_KEY, value: saved }),
			);

			await expect(service.isSavedEnabled()).resolves.toBe(enabled);

			expect(settingsRepository.getOrCreateWithReadLock).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(cacheService.get).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});
});
