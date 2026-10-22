import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ConflictError, ForbiddenError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { PromotionEnvironment } from '../database/entities/promotion-environment.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
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
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
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

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		userHasScopesMock.mockResolvedValue(true);
		providersService.getEntity.mockResolvedValue(provider());
		environmentRepository.findByIdWithProvider.mockResolvedValue(environment());

		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-environments-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		service = new PromotionEnvironmentsService(
			environmentRepository,
			linkRepository,
			projectRepository,
			providersService,
			gitService,
			workingDirectory,
			logger,
		);
	});

	afterEach(async () => {
		await rm(n8nFolder, { recursive: true, force: true });
	});

	it('removes the local checkout of the environment it deletes', async () => {
		await mkdir(workingDirectory.paths(ENVIRONMENT_ID).repositoryFolder, { recursive: true });

		await service.delete(ENVIRONMENT_ID);

		await expect(stat(workingDirectory.paths(ENVIRONMENT_ID).rootFolder)).rejects.toThrow();
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
