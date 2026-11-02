import type { UpdatePromotionEnvironmentDto } from '@n8n/api-types';
import { LockService, type Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { OperationContext, ProjectRepository, TransactionRunner, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ConflictError, ForbiddenError, LockedError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import type { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import { PromotionCheckoutCleanupService } from '../promotion-checkout-cleanup.service';
import { PromotionEnvironmentLockService } from '../promotion-environment-lock.service';
import { PromotionEnvironmentsService } from '../promotion-environments.service';
import type { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import type { PromotionsGitService } from '../promotions-git.service';

vi.mock('@/permissions.ee/check-access');
const userHasScopesMock = userHasScopes as MockedFunction<typeof userHasScopes>;

/**
 * Everything reachable over HTTP is covered against a real database in
 * `test/integration/public-api/promotions.test.ts`. This file keeps only the
 * behavior that a request cannot show: the local checkout and the project-link
 * races.
 */
describe('PromotionEnvironmentsService', () => {
	const environmentRepository = mock<PromotionEnvironmentRepository>();
	const linkRepository = mock<PromotionEnvironmentProjectRepository>();
	const projectRepository = mock<ProjectRepository>();
	const providersService = mock<PromotionProvidersService>();
	const gitService = mock<PromotionsGitService>();
	const reviewRepository = mock<PromotionReviewRepository>();
	const txRunner = mock<TransactionRunner>({
		run: async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) =>
			await fn(ctx),
	});
	const eventService = mock<EventService>();
	const actor = mock<User>({ id: 'user-1' });
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const publisher = mock<Publisher>();

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
	let environmentLock: PromotionEnvironmentLockService;
	let service: PromotionEnvironmentsService;

	const ENVIRONMENT_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';

	const provider = () =>
		({
			id: 'prov1',
			name: 'Deploy key',
			type: 'git',
			authType: 'ssh-key',
			config: { schemaVersion: 1, publicKey: 'PUB', keyType: 'ed25519' },
			auth: 'enc:auth',
			createdAt: new Date(),
			updatedAt: new Date(),
		}) as PromotionProvider;

	const environment = () =>
		({
			id: ENVIRONMENT_ID,
			name: 'Staging',
			scope: 'projects',
			providerId: 'prov1',
			remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
			direction: 'promote',
			settings: {
				schemaVersion: 1,
				baseBranchName: 'main',
				createBranchOnPromotion: false,
			},
			provider: provider(),
			createdAt: new Date(),
			updatedAt: new Date(),
		}) as PromotionEnvironment;

	/** Holds the environment lock until the returned function is called. */
	const holdLock = async () => {
		let release!: () => void;
		let acquired!: () => void;
		const held = new Promise<void>((resolve) => (acquired = resolve));
		const done = environmentLock.run(ENVIRONMENT_ID, async () => {
			acquired();
			await new Promise<void>((resolve) => (release = resolve));
		});
		await held;
		return async () => {
			release();
			await done;
		};
	};

	const isLockFree = async () =>
		await environmentLock.run(ENVIRONMENT_ID, async () => true).catch(() => false);

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		userHasScopesMock.mockResolvedValue(true);
		providersService.getEntity.mockResolvedValue(provider());
		environmentRepository.findByIdWithProvider.mockResolvedValue(environment());
		publisher.publishCommand.mockResolvedValue();
		reviewRepository.closeOpenByEnvironmentId.mockResolvedValue(0);

		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-environments-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		environmentLock = new PromotionEnvironmentLockService(Container.get(LockService));
		service = new PromotionEnvironmentsService(
			environmentRepository,
			linkRepository,
			projectRepository,
			providersService,
			gitService,
			workingDirectory,
			new PromotionCheckoutCleanupService(
				workingDirectory,
				environmentRepository,
				environmentLock,
				logger,
				publisher,
				mock<InstanceSettings>({ isMultiMain: true }),
			),
			reviewRepository,
			txRunner,
			logger,
			eventService,
		);
	});

	afterEach(async () => {
		await rm(n8nFolder, { recursive: true, force: true });
	});

	it('removes the local checkout of the environment it deletes', async () => {
		await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });

		await service.delete(ENVIRONMENT_ID, actor);

		await expect(stat(workingDirectory.paths(ENVIRONMENT_ID).rootFolder)).rejects.toThrow();
	});

	it('logs a warning and still deletes when the checkout removal fails', async () => {
		environmentRepository.deleteEnvironment.mockResolvedValue(true);
		vi.spyOn(workingDirectory, 'purge').mockRejectedValueOnce(new Error('EBUSY'));

		await expect(service.delete(ENVIRONMENT_ID, actor)).resolves.toBeUndefined();

		expect(environmentRepository.deleteEnvironment).toHaveBeenCalledWith(ENVIRONMENT_ID, {});
		expect(logger.warn).toHaveBeenCalledWith('Failed to remove the local promotion checkout', {
			environmentId: ENVIRONMENT_ID,
			error: 'EBUSY',
		});
	});

	it('deletes the environment while it holds the environment lock', async () => {
		environmentRepository.deleteEnvironment.mockImplementation(async () => {
			expect(await isLockFree()).toBe(false);
			return true;
		});

		await service.delete(ENVIRONMENT_ID, actor);

		expect(environmentRepository.deleteEnvironment).toHaveBeenCalledOnce();
		expect(await isLockFree()).toBe(true);
	});

	it('fails with 423 and changes nothing when another operation holds the lock', async () => {
		const paths = workingDirectory.paths(ENVIRONMENT_ID);
		await mkdir(paths.repositoryFolder, { recursive: true });
		const release = await holdLock();

		await expect(service.delete(ENVIRONMENT_ID, actor)).rejects.toThrow(LockedError);

		expect(reviewRepository.closeOpenByEnvironmentId).not.toHaveBeenCalled();
		expect(environmentRepository.deleteEnvironment).not.toHaveBeenCalled();
		await expect(stat(paths.repositoryFolder)).resolves.toBeDefined();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		await release();
	});

	it('asks the other mains to remove the checkout of the environment it deletes', async () => {
		environmentRepository.deleteEnvironment.mockResolvedValue(true);

		await service.delete(ENVIRONMENT_ID, actor);

		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'promotion-checkout-cleanup',
			payload: { environmentIds: [ENVIRONMENT_ID], reason: 'deleted' },
		});
	});

	it('emits an event with the direction and scope of the environment it deletes', async () => {
		environmentRepository.deleteEnvironment.mockResolvedValue(true);

		await service.delete(ENVIRONMENT_ID, actor);

		expect(eventService.emit).toHaveBeenCalledWith('promotion-environment-deleted', {
			user: actor,
			environmentId: ENVIRONMENT_ID,
			direction: 'promote',
			environmentScope: 'projects',
		});
	});

	it('emits no event when a concurrent request already deleted the environment', async () => {
		environmentRepository.deleteEnvironment.mockResolvedValue(false);

		await service.delete(ENVIRONMENT_ID, actor);

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it.each(['update', 'delete'] as const)(
		'emits no event when closing the reviews fails during an environment %s',
		async (operation) => {
			const error = new Error('Review close failed');
			environmentRepository.updateEnvironment.mockResolvedValue(true);
			reviewRepository.closeOpenByEnvironmentId.mockRejectedValueOnce(error);

			const result =
				operation === 'update'
					? service.update(
							ENVIRONMENT_ID,
							{ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
							actor,
						)
					: service.delete(ENVIRONMENT_ID, actor);

			await expect(result).rejects.toThrow(error);
			expect(eventService.emit).not.toHaveBeenCalled();
		},
	);

	it('emits no event for an update that changes nothing', async () => {
		environmentRepository.updateEnvironment.mockResolvedValue(true);

		await service.update(ENVIRONMENT_ID, { providerId: 'prov1' }, actor);

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('does not report the provider as changed when the request resends the current one', async () => {
		environmentRepository.updateEnvironment.mockResolvedValue(true);

		await service.update(ENVIRONMENT_ID, { name: 'Renamed', providerId: 'prov1' }, actor);

		expect(eventService.emit).toHaveBeenCalledWith('promotion-environment-updated', {
			user: actor,
			environmentId: ENVIRONMENT_ID,
			direction: 'promote',
			changedFields: ['name'],
		});
	});

	describe('checkout reset on update', () => {
		const createCheckout = async () => {
			const paths = workingDirectory.paths(ENVIRONMENT_ID);
			await mkdir(paths.repositoryFolder, { recursive: true });
			await mkdir(paths.sshDir, { recursive: true });
			return paths;
		};

		const exists = async (target: string) =>
			await stat(target).then(
				() => true,
				() => false,
			);

		beforeEach(() => {
			environmentRepository.updateEnvironment.mockResolvedValue(true);
		});

		it.each<{ change: string; input: UpdatePromotionEnvironmentDto }>([
			{
				change: 'the remote',
				input: { remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
			},
			{ change: 'the provider', input: { providerId: 'prov2' } },
			{
				change: 'the base branch',
				input: {
					settings: { schemaVersion: 1, baseBranchName: 'release', createBranchOnPromotion: false },
				},
			},
		])(
			'resets the checkout and keeps the host keys after it changes $change',
			async ({ input }) => {
				providersService.getEntity.mockResolvedValue({ ...provider(), id: 'prov2' });
				const paths = await createCheckout();

				await service.update(ENVIRONMENT_ID, input, actor);

				expect(await exists(paths.repositoryFolder)).toBe(false);
				expect(await exists(paths.sshDir)).toBe(true);
				expect(publisher.publishCommand).toHaveBeenCalledWith({
					command: 'promotion-checkout-cleanup',
					payload: { environmentIds: [ENVIRONMENT_ID], reason: 'settings-changed' },
				});
			},
		);

		it('resets the checkout after the apply branch changes', async () => {
			environmentRepository.findByIdWithProvider.mockResolvedValue({
				...environment(),
				direction: 'apply',
				settings: { schemaVersion: 1, branchName: 'main' },
			} as PromotionEnvironment);
			const paths = await createCheckout();

			await service.update(
				ENVIRONMENT_ID,
				{ settings: { schemaVersion: 1, branchName: 'production' } },
				actor,
			);

			expect(await exists(paths.repositoryFolder)).toBe(false);
		});

		it.each<{ change: string; input: UpdatePromotionEnvironmentDto }>([
			{ change: 'only the name changes', input: { name: 'Renamed' } },
			{
				change: 'the request sends the current remote again',
				input: { remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' } },
			},
			{ change: 'the request sends the current provider again', input: { providerId: 'prov1' } },
			{
				change: 'the settings change but keep the branch',
				input: {
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
				},
			},
		])('keeps the checkout when $change', async ({ input }) => {
			const paths = await createCheckout();

			await service.update(ENVIRONMENT_ID, input, actor);

			expect(await exists(paths.repositoryFolder)).toBe(true);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('updates while it holds the environment lock when the update changes the checkout', async () => {
			environmentRepository.updateEnvironment.mockImplementation(async () => {
				expect(await isLockFree()).toBe(false);
				return true;
			});

			await service.update(
				ENVIRONMENT_ID,
				{ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
				actor,
			);

			expect(environmentRepository.updateEnvironment).toHaveBeenCalledOnce();
		});

		it('fails with 423 and changes nothing when the update changes the checkout and the lock is busy', async () => {
			const paths = await createCheckout();
			const release = await holdLock();

			await expect(
				service.update(
					ENVIRONMENT_ID,
					{ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
					actor,
				),
			).rejects.toThrow(LockedError);

			expect(environmentRepository.updateEnvironment).not.toHaveBeenCalled();
			expect(reviewRepository.closeOpenByEnvironmentId).not.toHaveBeenCalled();
			expect(await exists(paths.repositoryFolder)).toBe(true);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			await release();
		});

		it('takes no lock for an update that keeps the checkout', async () => {
			const paths = await createCheckout();
			const release = await holdLock();

			await expect(
				service.update(ENVIRONMENT_ID, { name: 'Renamed' }, actor),
			).resolves.toMatchObject({ id: ENVIRONMENT_ID });

			expect(environmentRepository.updateEnvironment).toHaveBeenCalledOnce();
			expect(await exists(paths.repositoryFolder)).toBe(true);
			await release();
		});

		it('keeps the checkout when the update loses a race', async () => {
			environmentRepository.updateEnvironment.mockResolvedValue(false);
			const paths = await createCheckout();

			await expect(
				service.update(
					ENVIRONMENT_ID,
					{ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
					actor,
				),
			).rejects.toThrow(ConflictError);

			expect(await exists(paths.repositoryFolder)).toBe(true);
		});

		it('logs a warning and still returns the update when the reset fails', async () => {
			vi.spyOn(workingDirectory, 'resetCheckout').mockRejectedValueOnce(new Error('EBUSY'));

			await expect(
				service.update(
					ENVIRONMENT_ID,
					{ remote: { schemaVersion: 1, remoteUrl: 'git@github.com:o/other.git' } },
					actor,
				),
			).resolves.toMatchObject({ id: ENVIRONMENT_ID });

			expect(logger.warn).toHaveBeenCalledWith('Failed to reset the local promotion checkout', {
				environmentId: ENVIRONMENT_ID,
				error: 'EBUSY',
			});
		});
	});

	describe('checkout state', () => {
		it('reports an environment with no checkout as disconnected', async () => {
			gitService.hasCheckout.mockResolvedValue(false);

			const result = await service.findOne(ENVIRONMENT_ID);

			expect(result.checkout).toEqual({
				hasCheckout: false,
				matchesEnvironment: false,
			});
		});

		it('reports a checkout from the current remote and branch as connected', async () => {
			gitService.hasCheckout.mockResolvedValue(true);
			await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });
			await workingDirectory.writeDescriptor({
				schemaVersion: 1,
				environmentId: ENVIRONMENT_ID,
				remoteUrl: 'git@github.com:o/r.git',
				checkoutBranchName: 'main',
			});

			const result = await service.findOne(ENVIRONMENT_ID);

			expect(result.checkout).toEqual({
				hasCheckout: true,
				matchesEnvironment: true,
			});
		});

		it('normalizes the stored remote the same way an operation does', async () => {
			environmentRepository.findByIdWithProvider.mockResolvedValue({
				...environment(),
				remote: { schemaVersion: 1, remoteUrl: '  git@github.com:o/r.git  ' },
			} as PromotionEnvironment);
			gitService.hasCheckout.mockResolvedValue(true);
			await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });
			// A clone writes the descriptor from the resolved (trimmed) remote URL.
			await workingDirectory.writeDescriptor({
				schemaVersion: 1,
				environmentId: ENVIRONMENT_ID,
				remoteUrl: 'git@github.com:o/r.git',
				checkoutBranchName: 'main',
			});

			const result = await service.findOne(ENVIRONMENT_ID);

			expect(result.checkout).toEqual({
				hasCheckout: true,
				matchesEnvironment: true,
			});
		});

		it('marks a path-based checkout as stale after a provider host change', async () => {
			const gitlabEnvironment = {
				...environment(),
				remote: { schemaVersion: 1, repositoryPath: 'platform/workflows' },
				provider: {
					...provider(),
					type: 'gitlab',
					authType: 'token',
					config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
				},
			} as PromotionEnvironment;
			environmentRepository.findByIdWithProvider.mockResolvedValue(gitlabEnvironment);
			gitService.hasCheckout.mockResolvedValue(true);
			await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });
			await workingDirectory.writeDescriptor({
				schemaVersion: 1,
				environmentId: ENVIRONMENT_ID,
				remoteUrl: 'https://gitlab.example.com/platform/workflows.git',
				checkoutBranchName: 'main',
			});
			expect((await service.findOne(ENVIRONMENT_ID)).checkout.matchesEnvironment).toBe(true);
			gitlabEnvironment.provider.config = {
				schemaVersion: 1,
				baseUrl: 'https://other.example.com/installation',
			};
			const after = await service.findOne(ENVIRONMENT_ID);
			expect(after.remote.remoteUrl).toBe(
				'https://other.example.com/installation/platform/workflows.git',
			);
			expect(after.checkout).toEqual({
				hasCheckout: true,
				matchesEnvironment: false,
			});
		});

		it.each([
			{
				changedField: 'branch',
				remoteUrl: 'git@github.com:o/r.git',
				checkoutBranchName: 'release',
			},
			{
				changedField: 'remote',
				remoteUrl: 'git@github.com:o/other.git',
				checkoutBranchName: 'main',
			},
		])('reports a checkout as stale when its $changedField changed', async (descriptor) => {
			gitService.hasCheckout.mockResolvedValue(true);
			await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });
			await workingDirectory.writeDescriptor({
				schemaVersion: 1,
				environmentId: ENVIRONMENT_ID,
				remoteUrl: descriptor.remoteUrl,
				checkoutBranchName: descriptor.checkoutBranchName,
			});

			const result = await service.findOne(ENVIRONMENT_ID);

			expect(result.checkout).toEqual({
				hasCheckout: true,
				matchesEnvironment: false,
			});
		});
	});

	describe('project links', () => {
		const user = mock<User>({ id: 'u1' });

		it('rejects linking a project the caller cannot edit', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.addProject({ user, environmentId: ENVIRONMENT_ID, projectId: 'p1' }),
			).rejects.toThrow(ForbiddenError);
			expect(projectRepository.findOneBy).not.toHaveBeenCalled();
			expect(linkRepository.linkProject).not.toHaveBeenCalled();
		});

		it('rejects unlinking a project the caller cannot edit', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.removeProject({ user, environmentId: ENVIRONMENT_ID, projectId: 'p1' }),
			).rejects.toThrow(ForbiddenError);
			expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
		});

		it('does nothing when the project has no link', async () => {
			linkRepository.findForProject.mockResolvedValue(null);

			await service.removeProject({ user, environmentId: ENVIRONMENT_ID, projectId: 'p1' });

			expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
		});

		it('reports a conflict when the link moves to another environment mid-delete', async () => {
			linkRepository.findForProject
				.mockResolvedValueOnce({ projectId: 'p1', environmentId: ENVIRONMENT_ID } as never)
				.mockResolvedValueOnce({ projectId: 'p1', environmentId: 'other' } as never);
			linkRepository.unlinkProject.mockResolvedValue(0);

			await expect(
				service.removeProject({ user, environmentId: ENVIRONMENT_ID, projectId: 'p1' }),
			).rejects.toThrow(ConflictError);
		});

		it('succeeds when another request removed the link first', async () => {
			linkRepository.findForProject
				.mockResolvedValueOnce({ projectId: 'p1', environmentId: ENVIRONMENT_ID } as never)
				.mockResolvedValueOnce(null);
			linkRepository.unlinkProject.mockResolvedValue(0);

			await expect(
				service.removeProject({ user, environmentId: ENVIRONMENT_ID, projectId: 'p1' }),
			).resolves.toBeUndefined();
		});
	});
});
