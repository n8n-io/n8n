import type { CreatePromotionConnectionDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, TransactionRunner, User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { PromotionConnection } from '../database/entities/promotion-connection.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import type { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import type { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionConnectionsService } from '../promotion-connections.service';
import type { PromotionProvidersService } from '../promotion-providers.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import type { PromotionsGitService } from '../promotions-git.service';

vi.mock('@/permissions.ee/check-access');
const userHasScopesMock = userHasScopes as MockedFunction<typeof userHasScopes>;

/**
 * Everything reachable over HTTP is covered against a real database in
 * `test/integration/public-api/promotions.test.ts`. This file keeps only the
 * behavior that a request cannot show: write ordering, the local checkout, and
 * the project-link races.
 */
describe('PromotionConnectionsService', () => {
	const connectionRepository = mock<PromotionConnectionRepository>();
	const configRepository = mock<PromotionConfigRepository>();
	const linkRepository = mock<PromotionConnectionProjectRepository>();
	const projectRepository = mock<ProjectRepository>();
	const providersService = mock<PromotionProvidersService>();
	const gitService = mock<PromotionsGitService>();
	const txRunner = mock<TransactionRunner>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;
	let service: PromotionConnectionsService;

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

	const connection = () =>
		({
			id: 'conn1',
			name: 'Staging',
			scope: 'projects',
			providerId: 'prov1',
			target: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
			provider: provider(),
			createdAt: new Date(),
			updatedAt: new Date(),
		}) as PromotionConnection;

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		userHasScopesMock.mockResolvedValue(true);
		providersService.getEntity.mockResolvedValue(provider());
		connectionRepository.findByIdWithProvider.mockResolvedValue(connection());
		configRepository.findByConnectionIds.mockResolvedValue([]);
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));

		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-connections-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
		service = new PromotionConnectionsService(
			connectionRepository,
			configRepository,
			linkRepository,
			projectRepository,
			providersService,
			gitService,
			workingDirectory,
			txRunner,
			logger,
		);
	});

	afterEach(async () => {
		await rm(n8nFolder, { recursive: true, force: true });
	});

	it('checks branch names with Git before it opens a transaction', async () => {
		gitService.validateBranchName.mockRejectedValueOnce(new BadRequestError('bad branch'));

		await expect(
			service.create({
				name: 'Staging',
				scope: 'instance',
				providerId: 'prov1',
				target: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
				configs: { apply: { settings: { schemaVersion: 1, branchName: 'no..pe' } } },
			} as CreatePromotionConnectionDto),
		).rejects.toThrow(BadRequestError);

		expect(txRunner.run).not.toHaveBeenCalled();
	});

	it('rejects an update with no fields', async () => {
		await expect(service.update('conn1', {})).rejects.toThrow(BadRequestError);
	});

	it('removes the local checkout of every config it deletes', async () => {
		configRepository.findByConnectionIds.mockResolvedValue([
			{ id: 'cfgApply' },
			{ id: 'cfgPromote' },
		] as never);
		for (const configId of ['cfgApply', 'cfgPromote']) {
			await mkdir(workingDirectory.paths(configId).repositoryFolder, { recursive: true });
		}

		await service.delete('conn1');

		for (const configId of ['cfgApply', 'cfgPromote']) {
			await expect(stat(workingDirectory.paths(configId).rootFolder)).rejects.toThrow();
		}
	});

	describe('project links', () => {
		const user = mock<User>({ id: 'u1' });

		it('rejects linking a project the caller cannot edit', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.addProject({ user, connectionId: 'conn1', projectId: 'p1' }),
			).rejects.toThrow(ForbiddenError);
			expect(projectRepository.findOneBy).not.toHaveBeenCalled();
			expect(linkRepository.linkProject).not.toHaveBeenCalled();
		});

		it('rejects unlinking a project the caller cannot edit', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
			).rejects.toThrow(ForbiddenError);
			expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
		});

		it('does nothing when the project has no link', async () => {
			linkRepository.findByProjectId.mockResolvedValue(null);

			await service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' });

			expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
		});

		it('reports a conflict when the link moves to another connection mid-delete', async () => {
			linkRepository.findByProjectId
				.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'conn1' } as never)
				.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'other' } as never);
			linkRepository.unlinkProject.mockResolvedValue(0);

			await expect(
				service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
			).rejects.toThrow(ConflictError);
		});

		it('succeeds when another request removed the link first', async () => {
			linkRepository.findByProjectId
				.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'conn1' } as never)
				.mockResolvedValueOnce(null);
			linkRepository.unlinkProject.mockResolvedValue(0);

			await expect(
				service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
			).resolves.toBeUndefined();
		});
	});
});
