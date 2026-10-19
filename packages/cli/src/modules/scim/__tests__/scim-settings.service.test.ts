import type { OperationContext, Settings, SettingsRepository, TransactionRunner } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@n8n/backend-services';

import { DEFAULT_SCIM_DEPROVISIONING_POLICY, ScimSettingsService } from '../scim-settings.service';

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

	describe('deprovisioning policy', () => {
		const KEY = 'scim.provisioning.deprovisioningPolicy';
		const policy = {
			onDelete: 'delete',
			dataAction: 'transfer',
			transferProjectId: 'team-1',
		} as const;

		// Instances that never saved a policy keep deactivating users.
		it('returns the default policy, which disables, when no policy is stored', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual({
				onDelete: 'disable',
				dataAction: 'transfer',
				transferProjectId: null,
			});
			expect(settingsRepository.findByKey).toHaveBeenCalledWith(KEY);
		});

		it('returns the stored policy', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				mock({ key: KEY, value: JSON.stringify(policy) }),
			);

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual(policy);
		});

		it.each([
			['a value that is not JSON', 'not json'],
			['an unknown onDelete', JSON.stringify({ ...policy, onDelete: 'archive' })],
			['a value without a data action', JSON.stringify({ onDelete: 'delete' })],
		])('returns the default policy for %s', async (_, value) => {
			settingsRepository.findByKey.mockResolvedValue(mock({ key: KEY, value }));

			await expect(service.getDeprovisioningPolicy()).resolves.toEqual(
				DEFAULT_SCIM_DEPROVISIONING_POLICY,
			);
		});
	});

	describe('update', () => {
		const ENABLED_KEY = 'scim.provisioning.enabled';
		const POLICY_KEY = 'scim.provisioning.deprovisioningPolicy';
		const stored = {
			onDelete: 'disable',
			dataAction: 'delete',
			transferProjectId: 'team-1',
		} as const;

		const row = (key: string, value: string) => mock<Settings>({ key, value });

		beforeEach(() => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				row(POLICY_KEY, JSON.stringify(stored)),
			);
			settingsRepository.findByKeyInContext.mockImplementation(async (key) =>
				key === ENABLED_KEY ? row(ENABLED_KEY, 'true') : row(POLICY_KEY, JSON.stringify(stored)),
			);
		});

		it('merges the change into the policy that it reads with a write lock', async () => {
			const result = await service.update({ policy: { onDelete: 'delete' } });

			const merged = { ...stored, onDelete: 'delete' };
			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				POLICY_KEY,
				JSON.stringify(DEFAULT_SCIM_DEPROVISIONING_POLICY),
				false,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				POLICY_KEY,
				JSON.stringify(merged),
				false,
				trxCtx,
			);
			expect(result).toEqual({ wasEnabled: true, enabled: true, policy: merged });
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
				POLICY_KEY,
				JSON.stringify({ ...stored, dataAction: 'transfer' }),
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

		it('clears the transfer target with null', async () => {
			const result = await service.update({ policy: { transferProjectId: null } });

			expect(result.policy).toEqual({ ...stored, transferProjectId: null });
		});

		it('keeps the policy and does not lock it when the change has no policy field', async () => {
			const result = await service.update({ enabled: false });

			expect(settingsRepository.getOrCreateWithWriteLock).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				ENABLED_KEY,
				'false',
				true,
				trxCtx,
			);
			expect(result).toEqual({ wasEnabled: true, enabled: false, policy: stored });
		});

		it('reports SCIM as off before the change when no switch is stored', async () => {
			settingsRepository.findByKeyInContext.mockResolvedValue(null);

			const result = await service.update({ enabled: true });

			expect(result).toMatchObject({ wasEnabled: false, enabled: true });
		});
	});
});
