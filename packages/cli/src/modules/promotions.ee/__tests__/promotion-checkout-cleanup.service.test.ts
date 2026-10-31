import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionCheckoutCleanupService } from '../promotion-checkout-cleanup.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';

describe('PromotionCheckoutCleanupService', () => {
	const environmentRepository = mock<PromotionEnvironmentRepository>();
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();

	let n8nFolder: string;
	let isMultiMain: boolean;
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

	/** Stored settings that match the descriptor that `createCheckout` writes. */
	const environment = (overrides: Record<string, unknown> = {}) =>
		({
			id: LIVE_ID,
			providerId: 'prov1',
			provider: { id: 'prov1', type: 'git', config: {} } as PromotionProvider,
			remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
			direction: 'apply',
			settings: { schemaVersion: 1, branchName: 'main' },
			...overrides,
		}) as PromotionEnvironment;

	const exists = async (target: string) =>
		await stat(target).then(
			() => true,
			() => false,
		);

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		publisher.publishCommand.mockResolvedValue();
		isMultiMain = false;
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-cleanup-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		service = new PromotionCheckoutCleanupService(
			workingDirectory,
			environmentRepository,
			logger,
			publisher,
			{
				get isMultiMain() {
					return isMultiMain;
				},
			} as InstanceSettings,
		);
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

	describe.each([
		{ method: 'resetCheckoutAfterDisconnect' as const },
		{ method: 'resetCheckoutAfterSettingsChange' as const },
	])('$method', ({ method }) => {
		it('removes the checkout and the descriptor but keeps the host keys', async () => {
			const paths = await createCheckout(LIVE_ID);

			await service[method](LIVE_ID);

			expect(await exists(paths.repositoryFolder)).toBe(false);
			expect(await exists(paths.nextRepositoryFolder)).toBe(false);
			expect(await exists(paths.descriptorFile)).toBe(false);
			expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf8')).toBe(
				'github.com ssh-ed25519 AAAA',
			);
		});

		it('logs a warning and does not throw when the reset fails', async () => {
			vi.spyOn(workingDirectory, 'resetCheckout').mockRejectedValue(new Error('EBUSY'));

			await expect(service[method](LIVE_ID)).resolves.toBeUndefined();

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

		it('resets the other environments when one reset fails', async () => {
			const second = await createCheckout(DELETED_ID);
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([
				LIVE_ID,
				DELETED_ID,
			]);
			const resetCheckout = workingDirectory.resetCheckout.bind(workingDirectory);
			vi.spyOn(workingDirectory, 'resetCheckout').mockImplementation(async (environmentId) => {
				if (environmentId === LIVE_ID) throw new Error('EBUSY');
				await resetCheckout(environmentId);
			});

			await expect(service.resetCheckoutsForHostChange('prov1')).resolves.toBeUndefined();

			expect(await exists(second.repositoryFolder)).toBe(false);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Failed to reset the local promotion checkout', {
				environmentId: LIVE_ID,
				error: 'EBUSY',
			});
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

	describe('publishing to the other mains', () => {
		const command = (environmentIds: string[], reason: string) => ({
			command: 'promotion-checkout-cleanup',
			payload: { environmentIds, reason },
		});

		const entryPoints = [
			{
				name: 'removeDeletedEnvironment',
				run: async () => await service.removeDeletedEnvironment(LIVE_ID),
				reason: 'deleted',
			},
			{
				name: 'resetCheckoutAfterDisconnect',
				run: async () => await service.resetCheckoutAfterDisconnect(LIVE_ID),
				reason: 'disconnected',
			},
			{
				name: 'resetCheckoutAfterSettingsChange',
				run: async () => await service.resetCheckoutAfterSettingsChange(LIVE_ID),
				reason: 'settings-changed',
			},
			{
				name: 'resetCheckoutsForHostChange',
				run: async () => await service.resetCheckoutsForHostChange('prov1'),
				reason: 'settings-changed',
			},
		];

		beforeEach(() => {
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([LIVE_ID]);
		});

		it.each(entryPoints)(
			'$name publishes the IDs and the reason `$reason` after the local cleanup on multi-main',
			async ({ run, reason }) => {
				isMultiMain = true;
				const paths = await createCheckout(LIVE_ID);
				vi.spyOn(workingDirectory, 'purge');
				vi.spyOn(workingDirectory, 'resetCheckout');

				await run();

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
				expect(publisher.publishCommand).toHaveBeenCalledWith(command([LIVE_ID], reason));
				const cleanup =
					reason === 'deleted' ? workingDirectory.purge : workingDirectory.resetCheckout;
				expect(vi.mocked(cleanup).mock.invocationCallOrder[0]).toBeLessThan(
					publisher.publishCommand.mock.invocationCallOrder[0],
				);
			},
		);

		it('publishes every environment that a host change resets', async () => {
			isMultiMain = true;
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([
				LIVE_ID,
				DELETED_ID,
			]);

			await service.resetCheckoutsForHostChange('prov1');

			expect(publisher.publishCommand).toHaveBeenCalledWith(
				command([LIVE_ID, DELETED_ID], 'settings-changed'),
			);
		});

		it.each(entryPoints)('$name does not publish on a single instance', async ({ run }) => {
			await run();

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not publish when a host change resets no environment', async () => {
			isMultiMain = true;
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([]);

			await service.resetCheckoutsForHostChange('prov1');

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not publish when the host change lookup fails', async () => {
			isMultiMain = true;
			environmentRepository.findIdsWithRepositoryPathByProvider.mockRejectedValue(
				new Error('database is locked'),
			);

			await service.resetCheckoutsForHostChange('prov1');

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not publish from the startup check', async () => {
			isMultiMain = true;
			const deleted = await createCheckout(DELETED_ID);
			environmentRepository.findExistingIds.mockResolvedValue(new Set());

			await service.removeOrphanedCheckouts();

			expect(await exists(deleted.rootFolder)).toBe(false);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not wait for the publish', async () => {
			isMultiMain = true;
			publisher.publishCommand.mockReturnValue(new Promise(() => {}));

			await expect(service.removeDeletedEnvironment(LIVE_ID)).resolves.toBeUndefined();
		});

		it('logs a warning and does not throw when the publish fails', async () => {
			isMultiMain = true;
			const paths = await createCheckout(LIVE_ID);
			publisher.publishCommand.mockRejectedValue(new Error('Connection is closed'));

			await expect(service.removeDeletedEnvironment(LIVE_ID)).resolves.toBeUndefined();

			expect(await exists(paths.rootFolder)).toBe(false);
			await vi.waitFor(() =>
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to ask the other mains to remove their promotion checkouts',
					{ environmentIds: [LIVE_ID], reason: 'deleted', error: 'Connection is closed' },
				),
			);
		});
	});

	describe('handleCleanupFromOtherMain', () => {
		beforeEach(() => {
			isMultiMain = true;
		});

		describe('deleted', () => {
			it('removes the whole folder when the environment is gone', async () => {
				const paths = await createCheckout(DELETED_ID);
				environmentRepository.findExistingIds.mockResolvedValue(new Set());

				await service.handleCleanupFromOtherMain({
					environmentIds: [DELETED_ID],
					reason: 'deleted',
				});

				expect(environmentRepository.findExistingIds).toHaveBeenCalledWith([DELETED_ID]);
				expect(await exists(paths.rootFolder)).toBe(false);
			});

			it('keeps the folder and logs a warning when the environment still exists', async () => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findExistingIds.mockResolvedValue(new Set([LIVE_ID]));

				await service.handleCleanupFromOtherMain({ environmentIds: [LIVE_ID], reason: 'deleted' });

				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(logger.warn).toHaveBeenCalledWith(
					'Kept the promotion checkout of an environment that still exists',
					{ environmentId: LIVE_ID },
				);
			});

			it('keeps the folder and logs a warning when the database check fails', async () => {
				const paths = await createCheckout(DELETED_ID);
				environmentRepository.findExistingIds.mockRejectedValue(new Error('database is locked'));

				await expect(
					service.handleCleanupFromOtherMain({ environmentIds: [DELETED_ID], reason: 'deleted' }),
				).resolves.toBeUndefined();

				expect(await exists(paths.rootFolder)).toBe(true);
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to clean up the promotion checkouts for another main',
					{ environmentIds: [DELETED_ID], reason: 'deleted', error: 'database is locked' },
				);
			});
		});

		describe('settings-changed', () => {
			const handle = async () =>
				await service.handleCleanupFromOtherMain({
					environmentIds: [LIVE_ID],
					reason: 'settings-changed',
				});

			it('keeps a checkout that matches the current settings', async () => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findByIdWithProvider.mockResolvedValue(environment());

				await handle();

				expect(environmentRepository.findByIdWithProvider).toHaveBeenCalledWith(LIVE_ID);
				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(await exists(paths.descriptorFile)).toBe(true);
			});

			it.each<{ change: string; overrides: Record<string, unknown> }>([
				{
					change: 'branch',
					overrides: { settings: { schemaVersion: 1, branchName: 'production' } },
				},
				{
					change: 'remote',
					overrides: { remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
				},
			])('resets a checkout of an old $change and keeps the host keys', async ({ overrides }) => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findByIdWithProvider.mockResolvedValue(environment(overrides));

				await handle();

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(paths.descriptorFile)).toBe(false);
				expect(await exists(path.join(paths.sshDir, 'known_hosts'))).toBe(true);
			});

			it('keeps a checkout without a descriptor when the settings changed', async () => {
				// A clone writes the descriptor only after it succeeds.
				const paths = await createCheckout(LIVE_ID);
				await rm(paths.descriptorFile);
				environmentRepository.findByIdWithProvider.mockResolvedValue(
					environment({ settings: { schemaVersion: 1, branchName: 'production' } }),
				);

				await handle();

				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(await exists(paths.nextRepositoryFolder)).toBe(true);
			});

			it('removes the whole folder when the environment is gone', async () => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findByIdWithProvider.mockResolvedValue(null);

				await handle();

				expect(await exists(paths.rootFolder)).toBe(false);
			});

			it.each<{ part: string; overrides: Record<string, unknown> }>([
				{ part: 'settings', overrides: { settings: { schemaVersion: 99 } } },
				{ part: 'remote', overrides: { remote: { schemaVersion: 99 } } },
			])('resets the checkout when the stored $part cannot be read', async ({ overrides }) => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findByIdWithProvider.mockResolvedValue(environment(overrides));

				await handle();

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(paths.sshDir)).toBe(true);
			});

			it('keeps the checkout and logs a warning when the database read fails', async () => {
				const paths = await createCheckout(LIVE_ID);
				environmentRepository.findByIdWithProvider.mockRejectedValue(
					new Error('database is locked'),
				);

				await expect(handle()).resolves.toBeUndefined();

				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(logger.warn).toHaveBeenCalledWith('Failed to check the local promotion checkout', {
					environmentId: LIVE_ID,
					error: 'database is locked',
				});
			});

			it('checks the other environments when one check fails', async () => {
				const second = await createCheckout(DELETED_ID);
				environmentRepository.findByIdWithProvider.mockImplementation(async (id) => {
					if (id === LIVE_ID) throw new Error('database is locked');
					return null;
				});

				await service.handleCleanupFromOtherMain({
					environmentIds: [LIVE_ID, DELETED_ID],
					reason: 'settings-changed',
				});

				expect(await exists(second.rootFolder)).toBe(false);
				expect(logger.warn).toHaveBeenCalledTimes(1);
			});
		});

		describe('disconnected', () => {
			it('resets the checkout without a database check and keeps the host keys', async () => {
				const paths = await createCheckout(LIVE_ID);

				await service.handleCleanupFromOtherMain({
					environmentIds: [LIVE_ID],
					reason: 'disconnected',
				});

				expect(environmentRepository.findExistingIds).not.toHaveBeenCalled();
				expect(environmentRepository.findByIdWithProvider).not.toHaveBeenCalled();
				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(path.join(paths.sshDir, 'known_hosts'))).toBe(true);
			});
		});

		it.each(['deleted', 'disconnected', 'settings-changed'] as const)(
			'never publishes for `%s`',
			async (reason) => {
				await createCheckout(LIVE_ID);
				environmentRepository.findExistingIds.mockResolvedValue(new Set());
				environmentRepository.findByIdWithProvider.mockResolvedValue(environment());

				await service.handleCleanupFromOtherMain({ environmentIds: [LIVE_ID], reason });

				expect(publisher.publishCommand).not.toHaveBeenCalled();
			},
		);

		it.each(['deleted', 'disconnected', 'settings-changed'] as const)(
			'handles a duplicate `%s` message without a warning',
			async (reason) => {
				await createCheckout(LIVE_ID);
				environmentRepository.findExistingIds.mockResolvedValue(new Set());
				environmentRepository.findByIdWithProvider.mockResolvedValue(
					environment({ settings: { schemaVersion: 1, branchName: 'production' } }),
				);
				const message = { environmentIds: [LIVE_ID], reason };

				await service.handleCleanupFromOtherMain(message);
				await service.handleCleanupFromOtherMain(message);

				expect(await exists(workingDirectory.paths(LIVE_ID).repositoryFolder)).toBe(false);
				expect(logger.warn).not.toHaveBeenCalled();
			},
		);

		it('logs a warning and does not throw for an ID that is not a generated ID', async () => {
			await expect(
				service.handleCleanupFromOtherMain({
					environmentIds: ['../outside'],
					reason: 'disconnected',
				}),
			).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to reset the local promotion checkout',
				expect.objectContaining({ environmentId: '../outside' }),
			);
		});
	});
});
