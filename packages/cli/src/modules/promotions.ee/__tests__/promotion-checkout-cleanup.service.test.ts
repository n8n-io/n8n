import { LockService, type Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { LockedError } from '@n8n/errors';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionCheckoutCleanupService } from '../promotion-checkout-cleanup.service';
import {
	PromotionEnvironmentLockService,
	PromotionLockLostError,
} from '../promotion-environment-lock.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';

describe('PromotionCheckoutCleanupService', () => {
	const environmentRepository = mock<PromotionEnvironmentRepository>();
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();

	let n8nFolder: string;
	let isMultiMain: boolean;
	let workingDirectory: PromotionWorkingDirectoryService;
	let environmentLock: PromotionEnvironmentLockService;
	let service: PromotionCheckoutCleanupService;

	const LIVE_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
	const DELETED_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c';

	const environmentsFolder = () => path.join(n8nFolder, 'promotions', 'environments');
	const trashFolder = () => path.join(n8nFolder, 'promotions', 'trash');

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

	/** Holds the environment lock until the returned function is called. */
	const holdLock = async (environmentId: string) => {
		let release!: () => void;
		let acquired!: () => void;
		const held = new Promise<void>((resolve) => (acquired = resolve));
		const done = environmentLock.run(environmentId, async () => {
			acquired();
			await new Promise<void>((resolve) => (release = resolve));
		});
		await held;
		return async () => {
			release();
			await done;
		};
	};

	/** Whether another operation can take the lock now. */
	const isLockFree = async (environmentId: string) =>
		await environmentLock.run(environmentId, async () => true).catch(() => false);

	/** Runs the locked part with a controller, so a test can fire the signal as a lost Redis lease does. */
	const controlLock = () => {
		const controller = new AbortController();
		vi.spyOn(environmentLock, 'run').mockImplementation(
			async (_environmentId, fn) => await fn(controller.signal),
		);
		return controller;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		publisher.publishCommand.mockResolvedValue();
		environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([LIVE_ID]);
		isMultiMain = false;
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-cleanup-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		environmentLock = new PromotionEnvironmentLockService(Container.get(LockService));
		service = new PromotionCheckoutCleanupService(
			workingDirectory,
			environmentRepository,
			environmentLock,
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

	/** The four requests that clean up, each with a database change (or a read for Disconnect). */
	const entryPoints = () => {
		const change = vi.fn(async () => 'changed');
		return [
			{
				name: 'deleteEnvironment',
				run: async () => await service.deleteEnvironment(LIVE_ID, change),
				change,
				reason: 'deleted',
			},
			{
				name: 'disconnect',
				run: async () => await service.disconnect(LIVE_ID, change),
				change,
				reason: 'disconnected',
			},
			{
				name: 'changeCheckoutSettings',
				run: async () => await service.changeCheckoutSettings(LIVE_ID, change),
				change,
				reason: 'settings-changed',
			},
			{
				name: 'changeHostUrl',
				run: async () => await service.changeHostUrl('prov1', change),
				change,
				reason: 'settings-changed',
			},
		] as const;
	};
	const entryPointNames = entryPoints().map(({ name }) => ({ name }));
	const entryPoint = (name: string) => entryPoints().find((entry) => entry.name === name)!;

	describe('deleteEnvironment', () => {
		it('runs the change and removes the whole environment folder, host keys included', async () => {
			const paths = await createCheckout(LIVE_ID);
			const deleteRows = vi.fn(async () => ({ deleted: true }));

			await expect(service.deleteEnvironment(LIVE_ID, deleteRows)).resolves.toEqual({
				deleted: true,
			});

			expect(deleteRows).toHaveBeenCalledOnce();
			expect(await exists(paths.rootFolder)).toBe(false);
		});

		it('logs a warning and does not throw when the removal fails', async () => {
			vi.spyOn(workingDirectory, 'purge').mockRejectedValue(new Error('EBUSY'));

			await expect(service.deleteEnvironment(LIVE_ID, async () => 'deleted')).resolves.toBe(
				'deleted',
			);

			expect(logger.warn).toHaveBeenCalledWith('Failed to remove the local promotion checkout', {
				environmentId: LIVE_ID,
				error: 'EBUSY',
			});
		});
	});

	describe.each([{ name: 'disconnect' }, { name: 'changeCheckoutSettings' }])(
		'$name',
		({ name }) => {
			it('removes the checkout and the descriptor but keeps the host keys', async () => {
				const paths = await createCheckout(LIVE_ID);

				await expect(entryPoint(name).run()).resolves.toBe('changed');

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(paths.nextRepositoryFolder)).toBe(false);
				expect(await exists(paths.descriptorFile)).toBe(false);
				expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf8')).toBe(
					'github.com ssh-ed25519 AAAA',
				);
			});

			it('logs a warning and does not throw when the reset fails', async () => {
				vi.spyOn(workingDirectory, 'resetCheckout').mockRejectedValue(new Error('EBUSY'));

				await expect(entryPoint(name).run()).resolves.toBe('changed');

				expect(logger.warn).toHaveBeenCalledWith('Failed to reset the local promotion checkout', {
					environmentId: LIVE_ID,
					error: 'EBUSY',
				});
			});
		},
	);

	describe('changeHostUrl', () => {
		it('resets the environments that build their remote URL from the provider', async () => {
			const affected = await createCheckout(LIVE_ID);
			const unaffected = await createCheckout(DELETED_ID);

			await service.changeHostUrl('prov1', async () => {});

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
				return await resetCheckout(environmentId);
			});

			await expect(service.changeHostUrl('prov1', async () => {})).resolves.toBeUndefined();

			expect(await exists(second.repositoryFolder)).toBe(false);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith('Failed to reset the local promotion checkout', {
				environmentId: LIVE_ID,
				error: 'EBUSY',
			});
		});

		it('fails and does not run the change when the lookup fails', async () => {
			environmentRepository.findIdsWithRepositoryPathByProvider.mockRejectedValue(
				new Error('database is locked'),
			);
			const update = vi.fn(async () => {});

			await expect(service.changeHostUrl('prov1', update)).rejects.toThrow('database is locked');

			expect(update).not.toHaveBeenCalled();
		});

		it('runs the change without a lock when no environment is affected', async () => {
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([]);
			const run = vi.spyOn(environmentLock, 'run');
			const update = vi.fn(async () => 'updated');

			await expect(service.changeHostUrl('prov1', update)).resolves.toBe('updated');

			expect(run).not.toHaveBeenCalled();
			expect(update).toHaveBeenCalledOnce();
		});

		it('takes one lock for each affected environment before the change', async () => {
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([
				LIVE_ID,
				DELETED_ID,
			]);
			const update = vi.fn(async () => {
				expect(await isLockFree(LIVE_ID)).toBe(false);
				expect(await isLockFree(DELETED_ID)).toBe(false);
			});

			await service.changeHostUrl('prov1', update);

			expect(update).toHaveBeenCalledOnce();
			expect(await isLockFree(LIVE_ID)).toBe(true);
			expect(await isLockFree(DELETED_ID)).toBe(true);
		});

		it('releases the locks it holds and changes nothing when a later lock is busy', async () => {
			const first = await createCheckout(LIVE_ID);
			const second = await createCheckout(DELETED_ID);
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([
				LIVE_ID,
				DELETED_ID,
			]);
			const release = await holdLock(DELETED_ID);
			const update = vi.fn(async () => {});
			isMultiMain = true;

			await expect(service.changeHostUrl('prov1', update)).rejects.toThrow(LockedError);

			expect(update).not.toHaveBeenCalled();
			expect(await isLockFree(LIVE_ID)).toBe(true);
			expect(await exists(first.descriptorFile)).toBe(true);
			expect(await exists(second.descriptorFile)).toBe(true);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			await release();
		});
	});

	describe('environment lock', () => {
		it.each(entryPointNames)(
			'$name runs the change while it holds the environment lock',
			async ({ name }) => {
				const { run, change } = entryPoint(name);
				change.mockImplementation(async () => {
					expect(await isLockFree(LIVE_ID)).toBe(false);
					return 'changed';
				});

				await run();

				expect(change).toHaveBeenCalledOnce();
			},
		);

		it.each(entryPointNames)(
			'$name fails with 423 and changes nothing when the lock is busy',
			async ({ name }) => {
				isMultiMain = true;
				const paths = await createCheckout(LIVE_ID);
				const release = await holdLock(LIVE_ID);
				const { run, change } = entryPoint(name);

				await expect(run()).rejects.toThrow(LockedError);

				expect(change).not.toHaveBeenCalled();
				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(await exists(paths.descriptorFile)).toBe(true);
				expect(publisher.publishCommand).not.toHaveBeenCalled();
				await release();
			},
		);

		it.each(entryPointNames)(
			'$name publishes and deletes the trash after it releases the lock',
			async ({ name }) => {
				isMultiMain = true;
				await createCheckout(LIVE_ID);
				let lockFreeOnPublish: boolean | undefined;
				publisher.publishCommand.mockImplementation(async () => {
					lockFreeOnPublish = await isLockFree(LIVE_ID);
				});
				let lockFreeOnTrashDeletion: boolean | undefined;
				const deleteTrash = workingDirectory.deleteTrash.bind(workingDirectory);
				vi.spyOn(workingDirectory, 'deleteTrash').mockImplementation(async (folders) => {
					lockFreeOnTrashDeletion = await isLockFree(LIVE_ID);
					await deleteTrash(folders);
				});

				await entryPoint(name).run();

				await vi.waitFor(() => expect(lockFreeOnPublish).toBe(true));
				expect(lockFreeOnTrashDeletion).toBe(true);
			},
		);

		it.each(entryPointNames)(
			'$name stops with 503 and changes nothing when the lock is lost before the change',
			async ({ name }) => {
				isMultiMain = true;
				const paths = await createCheckout(LIVE_ID);
				controlLock().abort();
				const { run, change } = entryPoint(name);

				await expect(run()).rejects.toThrow(PromotionLockLostError);

				// Disconnect changes nothing in the database, so it reads first and stops before the removal.
				if (name !== 'disconnect') expect(change).not.toHaveBeenCalled();
				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(await exists(paths.descriptorFile)).toBe(true);
				expect(publisher.publishCommand).not.toHaveBeenCalled();
			},
		);

		it.each([
			{ name: 'deleteEnvironment' },
			{ name: 'changeCheckoutSettings' },
			{ name: 'changeHostUrl' },
		])(
			'$name succeeds, keeps the folder, and still publishes when the lock is lost after the change',
			async ({ name }) => {
				isMultiMain = true;
				const paths = await createCheckout(LIVE_ID);
				const controller = controlLock();
				const { run, change } = entryPoint(name);
				change.mockImplementation(async () => {
					controller.abort();
					return 'changed';
				});

				await expect(run()).resolves.toBe('changed');

				expect(await exists(paths.repositoryFolder)).toBe(true);
				expect(await exists(paths.descriptorFile)).toBe(true);
				expect(logger.warn).toHaveBeenCalledWith(
					'Kept the local promotion checkout because n8n lost its lock on the environment',
					{ environmentIds: [LIVE_ID] },
				);
				expect(publisher.publishCommand).toHaveBeenCalledOnce();
			},
		);
	});

	describe('trash', () => {
		it.each(entryPointNames)(
			'$name moves the folders to trash, then empties it',
			async ({ name }) => {
				await createCheckout(LIVE_ID);
				const deleteTrash = vi.spyOn(workingDirectory, 'deleteTrash');

				await entryPoint(name).run();

				const [trashed] = deleteTrash.mock.calls[0];
				expect(trashed.length).toBeGreaterThan(0);
				for (const folder of trashed) expect(path.dirname(folder)).toBe(trashFolder());
				expect(await readdir(trashFolder())).toEqual([]);
			},
		);

		it.each(entryPointNames)(
			'$name logs a warning and succeeds when the trash deletion fails',
			async ({ name }) => {
				const paths = await createCheckout(LIVE_ID);
				vi.spyOn(workingDirectory, 'deleteTrash').mockRejectedValue(new Error('EACCES'));

				await expect(entryPoint(name).run()).resolves.toBe('changed');

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to delete the promotion checkouts in the trash',
					expect.objectContaining({ error: 'EACCES' }),
				);
			},
		);
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

		it('deletes leftover trash folders and does not treat them as environments', async () => {
			const leftover = path.join(trashFolder(), DELETED_ID);
			await mkdir(path.join(leftover, '.git'), { recursive: true });
			await writeFile(path.join(leftover, '.git', 'index.lock'), '');
			environmentRepository.findExistingIds.mockResolvedValue(new Set());

			await service.removeOrphanedCheckouts();

			expect(await readdir(trashFolder())).toEqual([]);
			expect(environmentRepository.findExistingIds).toHaveBeenCalledWith([]);
		});

		it('checks the environment folders when the trash deletion fails', async () => {
			const deleted = await createCheckout(DELETED_ID);
			vi.spyOn(workingDirectory, 'emptyTrash').mockRejectedValue(new Error('EACCES'));
			environmentRepository.findExistingIds.mockResolvedValue(new Set());

			await expect(service.removeOrphanedCheckouts()).resolves.toBeUndefined();

			expect(await exists(deleted.rootFolder)).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete the promotion checkouts in the trash',
				{ error: 'EACCES' },
			);
		});

		it('takes no lock', async () => {
			const deleted = await createCheckout(DELETED_ID);
			environmentRepository.findExistingIds.mockResolvedValue(new Set());
			const release = await holdLock(DELETED_ID);

			await service.removeOrphanedCheckouts();

			expect(await exists(deleted.rootFolder)).toBe(false);
			await release();
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

		it.each(entryPointNames)(
			'$name publishes the IDs and the reason after the local cleanup on multi-main',
			async ({ name }) => {
				isMultiMain = true;
				const paths = await createCheckout(LIVE_ID);
				vi.spyOn(workingDirectory, 'purge');
				vi.spyOn(workingDirectory, 'resetCheckout');
				const { run, reason } = entryPoint(name);

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

			await service.changeHostUrl('prov1', async () => {});

			expect(publisher.publishCommand).toHaveBeenCalledWith(
				command([LIVE_ID, DELETED_ID], 'settings-changed'),
			);
		});

		it.each(entryPointNames)('$name does not publish on a single instance', async ({ name }) => {
			await entryPoint(name).run();

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not publish when a host change resets no environment', async () => {
			isMultiMain = true;
			environmentRepository.findIdsWithRepositoryPathByProvider.mockResolvedValue([]);

			await service.changeHostUrl('prov1', async () => {});

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not publish when the change fails', async () => {
			isMultiMain = true;
			const paths = await createCheckout(LIVE_ID);

			await expect(
				service.changeCheckoutSettings(LIVE_ID, async () => {
					throw new Error('The environment changed during the update.');
				}),
			).rejects.toThrow('The environment changed during the update.');

			expect(await exists(paths.repositoryFolder)).toBe(true);
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

			await expect(service.deleteEnvironment(LIVE_ID, async () => 'deleted')).resolves.toBe(
				'deleted',
			);
		});

		it('logs a warning and does not throw when the publish fails', async () => {
			isMultiMain = true;
			const paths = await createCheckout(LIVE_ID);
			publisher.publishCommand.mockRejectedValue(new Error('Connection is closed'));

			await expect(service.deleteEnvironment(LIVE_ID, async () => 'deleted')).resolves.toBe(
				'deleted',
			);

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

		it.each(['deleted', 'disconnected', 'settings-changed'] as const)(
			'handles `%s` without the environment lock',
			async (reason) => {
				await createCheckout(LIVE_ID);
				environmentRepository.findExistingIds.mockResolvedValue(new Set());
				environmentRepository.findByIdWithProvider.mockResolvedValue(null);
				const release = await holdLock(LIVE_ID);

				await service.handleCleanupFromOtherMain({ environmentIds: [LIVE_ID], reason });

				expect(await exists(workingDirectory.paths(LIVE_ID).repositoryFolder)).toBe(false);
				await release();
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
