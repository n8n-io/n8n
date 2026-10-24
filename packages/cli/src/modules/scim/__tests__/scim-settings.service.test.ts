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

	/** The stored rows of a policy, one for each field. */
	const policyRows = (policy: Record<string, string>) =>
		Object.entries(policy).map(([field, value]) =>
			mock<Settings>({ key: `scim.provisioning.${field}`, value }),
		);

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
	describe('last auth failure', () => {
		const KEY = 'scim.provisioning.lastAuthFailure';
		const at = (minute: number) => new Date(Date.UTC(2026, 9, 19, 12, minute)).toISOString();
		const failure = { at: at(0), reason: 'superseded_token' } as const;

		/** The value of the failure row, or undefined while the row is missing. */
		let row: string | undefined;

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			row = undefined;
			settingsRepository.findByKey.mockImplementation(async () =>
				row === undefined ? null : mock<Settings>({ key: KEY, value: row }),
			);
			settingsRepository.getOrCreateWithWriteLock.mockImplementation(async (key, defaultValue) => {
				row ??= defaultValue;
				return mock<Settings>({ key, value: row });
			});
			settingsRepository.upsertByKey.mockImplementation(async (_key, value) => {
				row = value;
			});
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const resetAt = async (minute: number) => {
			vi.setSystemTime(new Date(at(minute)));
			await service.clearLastAuthFailure();
		};

		it('returns null when no failure is stored', async () => {
			await expect(service.getLastAuthFailure()).resolves.toBeNull();
			expect(settingsRepository.findByKey).toHaveBeenCalledWith(KEY);
		});

		it('returns the stored failure', async () => {
			row = JSON.stringify(failure);

			await expect(service.getLastAuthFailure()).resolves.toEqual(failure);
		});

		it.each([
			['a value that is not JSON', 'not json'],
			['an unknown reason', JSON.stringify({ ...failure, reason: 'scim_disabled' })],
			['a value without a time', JSON.stringify({ reason: 'invalid_token' })],
			['a reset time only', JSON.stringify({ resetAt: at(0) })],
		])('returns null for %s', async (_, value) => {
			row = value;

			await expect(service.getLastAuthFailure()).resolves.toBeNull();
		});

		it('stores the failure in a locked row that does not load on startup', async () => {
			await expect(service.setLastAuthFailure(failure)).resolves.toBe(true);

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				KEY,
				'{}',
				false,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				KEY,
				JSON.stringify(failure),
				false,
				trxCtx,
			);
			const lockOrder = settingsRepository.getOrCreateWithWriteLock.mock.invocationCallOrder[0];
			const saveOrder = settingsRepository.upsertByKey.mock.invocationCallOrder[0];
			expect(lockOrder).toBeLessThan(saveOrder);
			await expect(service.getLastAuthFailure()).resolves.toEqual(failure);
		});

		it('replaces the stored failure with the time of the reset, under the lock', async () => {
			row = JSON.stringify(failure);

			await resetAt(5);

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledWith(
				KEY,
				'{}',
				false,
				trxCtx,
			);
			expect(row).toBe(JSON.stringify({ resetAt: at(5) }));
			await expect(service.getLastAuthFailure()).resolves.toBeNull();
		});

		// A write that started before the reset can commit after it.
		it.each([
			['before', 4],
			['at the time of', 5],
		])('skips a failure from %s the last reset', async (_, minute) => {
			await resetAt(5);

			await expect(
				service.setLastAuthFailure({ at: at(minute), reason: 'superseded_token' }),
			).resolves.toBe(false);

			await expect(service.getLastAuthFailure()).resolves.toBeNull();
		});

		it('stores a failure from after the last reset, and still skips an older one', async () => {
			await resetAt(5);

			await expect(
				service.setLastAuthFailure({ at: at(6), reason: 'invalid_token' }),
			).resolves.toBe(true);
			await expect(
				service.setLastAuthFailure({ at: at(4), reason: 'superseded_token' }),
			).resolves.toBe(false);

			await expect(service.getLastAuthFailure()).resolves.toEqual({
				at: at(6),
				reason: 'invalid_token',
			});
		});

		// Any client can cause `missing_header` and `invalid_token`.
		it.each(['missing_header', 'invalid_token'] as const)(
			'does not replace a stored old-token failure with %s',
			async (reason) => {
				await service.setLastAuthFailure(failure);

				await expect(service.setLastAuthFailure({ at: at(1), reason })).resolves.toBe(false);

				await expect(service.getLastAuthFailure()).resolves.toEqual(failure);
			},
		);

		it('replaces a failure without a valid token with an old-token failure', async () => {
			await service.setLastAuthFailure({ at: at(0), reason: 'invalid_token' });

			await expect(
				service.setLastAuthFailure({ at: at(1), reason: 'superseded_token' }),
			).resolves.toBe(true);

			await expect(service.getLastAuthFailure()).resolves.toEqual({
				at: at(1),
				reason: 'superseded_token',
			});
		});

		it('replaces a stored old-token failure with a newer one', async () => {
			await service.setLastAuthFailure(failure);

			await service.setLastAuthFailure({ at: at(1), reason: 'superseded_token' });

			await expect(service.getLastAuthFailure()).resolves.toEqual({
				at: at(1),
				reason: 'superseded_token',
			});
		});

		it('stores a failure without a valid token after a reset removes an old-token failure', async () => {
			await service.setLastAuthFailure(failure);
			await resetAt(5);

			await expect(
				service.setLastAuthFailure({ at: at(6), reason: 'missing_header' }),
			).resolves.toBe(true);
		});
	});

	describe('deprovisioning policy', () => {
		// Instances that never saved a policy keep deactivating users.
		it('returns the default policy, which disables, when no policy is stored', async () => {
			settingsRepository.findByKeys.mockResolvedValue([]);

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual({
				onDelete: 'disable',
				dataAction: 'transfer',
				transferProjectId: null,
			});
			expect(settingsRepository.findByKeys).toHaveBeenCalledWith([
				'scim.provisioning.onDelete',
				'scim.provisioning.dataAction',
				'scim.provisioning.transferProjectId',
			]);
		});

		it('returns the stored policy', async () => {
			settingsRepository.findByKeys.mockResolvedValue(
				policyRows({ onDelete: 'delete', dataAction: 'delete', transferProjectId: 'team-1' }),
			);

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual({
				onDelete: 'delete',
				dataAction: 'delete',
				transferProjectId: 'team-1',
			});
		});

		it('returns the default for a field that does not parse, and no target for an empty one', async () => {
			settingsRepository.findByKeys.mockResolvedValue(
				policyRows({ onDelete: 'archive', dataAction: 'delete', transferProjectId: '' }),
			);

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual({
				onDelete: 'disable',
				dataAction: 'delete',
				transferProjectId: null,
			});
		});
	});

	describe('update', () => {
		const ENABLED_KEY = 'scim.provisioning.enabled';
		const stored = {
			onDelete: 'disable',
			dataAction: 'delete',
			transferProjectId: 'team-1',
		} as const;

		/** The saved switch, as the repository reads it with or without a lock. */
		const savedRows = (enabledValue: string) => {
			const read = async () => mock<Settings>({ key: ENABLED_KEY, value: enabledValue });
			settingsRepository.getOrCreateWithWriteLock.mockImplementation(read);
			settingsRepository.findByKeyInContext.mockImplementation(read);
		};

		beforeEach(() => {
			savedRows('true');
			settingsRepository.findByKeys.mockResolvedValue(policyRows(stored));
		});

		// `undefined` keeps a field, and `null` clears the target.
		it('saves each field that the change sets in its own row and returns the stored policy', async () => {
			const result = await service.update({
				policy: { onDelete: 'delete', dataAction: undefined, transferProjectId: null },
			});

			expect(settingsRepository.upsertByKey.mock.calls).toEqual([
				['scim.provisioning.onDelete', 'delete', false, trxCtx],
				['scim.provisioning.transferProjectId', '', false, trxCtx],
			]);
			expect(result).toEqual({ wasEnabled: true, enabled: true, policy: stored });
		});

		it('saves the switch and the policy in one transaction', async () => {
			await service.update({ enabled: false, policy: { dataAction: 'transfer' } });

			expect(transactionRunner.run).toHaveBeenCalledTimes(1);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				'scim.provisioning.dataAction',
				'transfer',
				false,
				trxCtx,
			);
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

		it('does not lock the switch when the change has no enabled field', async () => {
			await service.update({ policy: { onDelete: 'delete' } });

			expect(settingsRepository.getOrCreateWithWriteLock).not.toHaveBeenCalledWith(
				ENABLED_KEY,
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
		});

		// The lock creates a missing switch as off.
		it('reports SCIM as off before the change when no switch is stored', async () => {
			savedRows('false');

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
			savedRows('false');
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
			savedRows('false');
			const assertCanEnable = vi.fn(() => {
				throw new Error('single sign-on is off');
			});

			await expect(
				service.update({ enabled: true, policy: { onDelete: 'delete' }, assertCanEnable }),
			).rejects.toThrow('single sign-on is off');
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalledWith(
				ENABLED_KEY,
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
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
