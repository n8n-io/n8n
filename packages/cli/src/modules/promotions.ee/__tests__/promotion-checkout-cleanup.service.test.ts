import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionCheckoutCleanupService } from '../promotion-checkout-cleanup.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';

describe('PromotionCheckoutCleanupService', () => {
	const environmentRepository = mock<PromotionEnvironmentRepository>();
	const logger = mock<Logger>();

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
	let service: PromotionCheckoutCleanupService;

	const LIVE_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
	const DELETED_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c';

	const environmentsFolder = () => path.join(n8nFolder, 'promotions', 'environments');

	/** A checkout with pinned host keys, as a clone leaves it. */
	const createCheckout = async (environmentId: string) => {
		const paths = workingDirectory.paths(environmentId);
		await mkdir(paths.repositoryFolder, { recursive: true });
		await mkdir(paths.nextRepositoryFolder, { recursive: true });
		await mkdir(paths.sshDir, { recursive: true });
		await writeFile(path.join(paths.sshDir, 'known_hosts'), 'github.com ssh-ed25519 AAAA');
		await workingDirectory.writeDescriptor({
			schemaVersion: 1,
			environmentId,
			remoteUrl: 'git@github.com:o/r.git',
			checkoutBranchName: 'main',
		});
		return paths;
	};

	const exists = async (target: string) =>
		await stat(target).then(
			() => true,
			() => false,
		);

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-cleanup-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		service = new PromotionCheckoutCleanupService(workingDirectory, environmentRepository, logger);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(n8nFolder, { recursive: true, force: true });
	});

	describe('removeDeletedEnvironment', () => {
		it('removes the whole environment folder, host keys included', async () => {
			const paths = await createCheckout(LIVE_ID);

			await service.removeDeletedEnvironment(LIVE_ID);

			expect(await exists(paths.rootFolder)).toBe(false);
		});

		it('logs a warning and does not throw when the removal fails', async () => {
			vi.spyOn(workingDirectory, 'purge').mockRejectedValue(new Error('EBUSY'));

			await expect(service.removeDeletedEnvironment(LIVE_ID)).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith('Failed to remove the local promotion checkout', {
				environmentId: LIVE_ID,
				error: 'EBUSY',
			});
		});
	});

	describe('resetCheckouts', () => {
		it('removes the checkouts and the descriptors but keeps the host keys', async () => {
			const first = await createCheckout(LIVE_ID);
			const second = await createCheckout(DELETED_ID);

			await service.resetCheckouts([LIVE_ID, DELETED_ID]);

			for (const paths of [first, second]) {
				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(paths.nextRepositoryFolder)).toBe(false);
				expect(await exists(paths.descriptorFile)).toBe(false);
				expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf8')).toBe(
					'github.com ssh-ed25519 AAAA',
				);
			}
		});

		it('resets the other environments when one reset fails', async () => {
			const second = await createCheckout(DELETED_ID);
			const resetCheckout = workingDirectory.resetCheckout.bind(workingDirectory);
			vi.spyOn(workingDirectory, 'resetCheckout').mockImplementation(async (environmentId) => {
				if (environmentId === LIVE_ID) throw new Error('EBUSY');
				await resetCheckout(environmentId);
			});

			await expect(service.resetCheckouts([LIVE_ID, DELETED_ID])).resolves.toBeUndefined();

			expect(await exists(second.repositoryFolder)).toBe(false);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Failed to reset the local promotion checkout', {
				environmentId: LIVE_ID,
				error: 'EBUSY',
			});
		});
	});

	describe('resetCheckoutsForHostChange', () => {
		it('resets the environments that build their remote URL from the provider', async () => {
			const affected = await createCheckout(LIVE_ID);
			const unaffected = await createCheckout(DELETED_ID);
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([LIVE_ID]);

			await service.resetCheckoutsForHostChange('prov1');

			expect(environmentRepository.findIdsWithRepositoryPathByProvider).toHaveBeenCalledWith(
				'prov1',
			);
			expect(await exists(affected.repositoryFolder)).toBe(false);
			expect(await exists(unaffected.repositoryFolder)).toBe(true);
		});

		it('logs a warning and does not throw when the lookup fails', async () => {
			environmentRepository.findIdsWithRepositoryPathByProvider.mockRejectedValue(
				new Error('database is locked'),
			);

			await expect(service.resetCheckoutsForHostChange('prov1')).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith('Failed to find the promotion checkouts to reset', {
				providerId: 'prov1',
				error: 'database is locked',
			});
		});
	});

	describe('removeOrphanedCheckouts', () => {
		it('removes only the folders of environments that no longer exist', async () => {
			const live = await createCheckout(LIVE_ID);
			const deleted = await createCheckout(DELETED_ID);
			environmentRepository.findExistingIds.mockResolvedValue(new Set([LIVE_ID]));

			await service.removeOrphanedCheckouts();

			expect(await exists(live.rootFolder)).toBe(true);
			expect(await exists(deleted.rootFolder)).toBe(false);
		});

		it('ignores names that are not generated environment IDs', async () => {
			await mkdir(path.join(environmentsFolder(), 'notes'), { recursive: true });
			await mkdir(path.join(environmentsFolder(), LIVE_ID.toUpperCase()), { recursive: true });
			await writeFile(path.join(environmentsFolder(), DELETED_ID), 'a file, not a folder');
			environmentRepository.findExistingIds.mockResolvedValue(new Set());

			await service.removeOrphanedCheckouts();

			expect(environmentRepository.findExistingIds).toHaveBeenCalledWith([]);
			expect(await exists(path.join(environmentsFolder(), 'notes'))).toBe(true);
			expect(await exists(path.join(environmentsFolder(), LIVE_ID.toUpperCase()))).toBe(true);
			expect(await exists(path.join(environmentsFolder(), DELETED_ID))).toBe(true);
		});

		it('lists the folders before it reads the database', async () => {
			const listEnvironmentIds = vi.spyOn(workingDirectory, 'listEnvironmentIds');
			await createCheckout(LIVE_ID);
			environmentRepository.findExistingIds.mockResolvedValue(new Set([LIVE_ID]));

			await service.removeOrphanedCheckouts();

			expect(listEnvironmentIds.mock.invocationCallOrder[0]).toBeLessThan(
				environmentRepository.findExistingIds.mock.invocationCallOrder[0],
			);
		});

		it('does nothing when the environments folder does not exist', async () => {
			environmentRepository.findExistingIds.mockResolvedValue(new Set());

			await expect(service.removeOrphanedCheckouts()).resolves.toBeUndefined();

			expect(environmentRepository.findExistingIds).toHaveBeenCalledWith([]);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('logs a warning and does not throw when the database check fails', async () => {
			const deleted = await createCheckout(DELETED_ID);
			environmentRepository.findExistingIds.mockRejectedValue(new Error('database is locked'));

			await expect(service.removeOrphanedCheckouts()).resolves.toBeUndefined();

			expect(await exists(deleted.rootFolder)).toBe(true);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to check for promotion checkouts of deleted environments',
				{ error: 'database is locked' },
			);
		});
	});
});
