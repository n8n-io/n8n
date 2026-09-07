import type { CreatePromotionConnectionDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, TransactionRunner, User } from '@n8n/db';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { PromotionConnection } from '../database/entities/promotion-connection.entity';
import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import { PromotionConflictError } from '../database/promotion-conflict.error';
import type { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import type { PromotionConnectionProjectRepository } from '../database/repositories/promotion-connection-project.repository';
import type { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionConnectionsService } from '../promotion-connections.service';
import type { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import type { PromotionsGitService } from '../promotions-git.service';

vi.mock('@/permissions.ee/check-access');
const userHasScopesMock = userHasScopes as MockedFunction<typeof userHasScopes>;

describe('PromotionConnectionsService', () => {
	const connectionRepository = mock<PromotionConnectionRepository>();
	const configRepository = mock<PromotionConfigRepository>();
	const linkRepository = mock<PromotionConnectionProjectRepository>();
	const projectRepository = mock<ProjectRepository>();
	const providersService = mock<PromotionProvidersService>();
	const gitService = mock<PromotionsGitService>();
	const workingDirectory = mock<PromotionWorkingDirectoryService>();
	const txRunner = mock<TransactionRunner>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new PromotionConnectionsService(
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

	const connection = (over: Partial<PromotionConnection> = {}) =>
		({
			id: 'conn1',
			name: 'Staging',
			scope: 'projects',
			providerId: 'prov1',
			target: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
			provider: provider(),
			createdAt: new Date(),
			updatedAt: new Date(),
			...over,
		}) as PromotionConnection;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		userHasScopesMock.mockResolvedValue(true);
		providersService.getEntity.mockResolvedValue(provider());
		providersService.toSummary.mockImplementation((p) => ({
			id: p.id,
			name: p.name,
			type: p.type,
			authType: p.authType,
			createdAt: p.createdAt.toISOString(),
			updatedAt: p.updatedAt.toISOString(),
		}));
		configRepository.findByConnectionIds.mockResolvedValue([]);
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
	});

	describe('create', () => {
		const input = (over: Partial<CreatePromotionConnectionDto> = {}) =>
			({
				name: 'Staging',
				scope: 'instance',
				providerId: 'prov1',
				target: { schemaVersion: 1, remoteUrl: 'git@github.com:o/r.git' },
				...over,
			}) as CreatePromotionConnectionDto;

		it('validates the remote URL against the provider auth method', async () => {
			connectionRepository.insertConnection.mockResolvedValue(connection({ scope: 'instance' }));

			await service.create(input());

			expect(gitService.validateRemoteUrl).toHaveBeenCalledWith(
				'git@github.com:o/r.git',
				'ssh-key',
			);
		});

		it('reports a duplicate instance connection as a conflict', async () => {
			connectionRepository.insertConnection.mockRejectedValue(
				new PromotionConflictError('instance-connection', 'An instance connection already exists'),
			);

			await expect(service.create(input())).rejects.toThrow(ConflictError);
			expect(configRepository.insertConfig).not.toHaveBeenCalled();
		});

		it('rejects an unknown provider before any write', async () => {
			providersService.getEntity.mockRejectedValue(
				new NotFoundError('Promotion provider not found'),
			);

			await expect(service.create(input())).rejects.toThrow(NotFoundError);
			expect(connectionRepository.insertConnection).not.toHaveBeenCalled();
		});

		it('writes both initial configs with their direction labels', async () => {
			connectionRepository.insertConnection.mockResolvedValue(connection({ scope: 'instance' }));
			configRepository.insertConfig.mockImplementation(
				async (config) =>
					({
						...config,
						id: `cfg-${config.direction}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					}) as never,
			);

			await service.create(
				input({
					configs: {
						apply: { settings: { schemaVersion: 1, branchName: 'dev' } },
						promote: {
							name: 'To staging',
							settings: {
								schemaVersion: 1,
								baseBranchName: 'staging',
								createBranchOnPromotion: false,
							},
						},
					},
				}),
			);

			// Branch names are checked with Git before the transaction opens.
			expect(gitService.validateBranchName).toHaveBeenCalledWith('dev');
			expect(gitService.validateBranchName).toHaveBeenCalledWith('staging');
			expect(configRepository.insertConfig).toHaveBeenCalledTimes(2);
			expect(configRepository.insertConfig.mock.calls[0][0]).toMatchObject({
				direction: 'apply',
				name: 'Apply',
			});
			expect(configRepository.insertConfig.mock.calls[1][0]).toMatchObject({
				direction: 'promote',
				name: 'To staging',
			});
		});

		it('does not open a transaction when a branch name is invalid', async () => {
			gitService.validateBranchName.mockRejectedValueOnce(new BadRequestError('bad branch'));

			await expect(
				service.create(
					input({ configs: { apply: { settings: { schemaVersion: 1, branchName: 'no..pe' } } } }),
				),
			).rejects.toThrow(BadRequestError);
			expect(txRunner.run).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('rechecks the target on every provider reassignment', async () => {
			connectionRepository.findByIdWithProvider.mockResolvedValue(connection());
			const tokenProvider = { ...provider(), id: 'prov2', authType: 'token' } as PromotionProvider;
			providersService.getEntity.mockResolvedValue(tokenProvider);

			await service.update('conn1', { providerId: 'prov2' });

			expect(gitService.validateRemoteUrl).toHaveBeenCalledWith('git@github.com:o/r.git', 'token');
			expect(connectionRepository.updateConnection).toHaveBeenCalledWith('conn1', {
				providerId: 'prov2',
			});
		});

		it('rejects an empty update', async () => {
			await expect(service.update('conn1', {})).rejects.toThrow(BadRequestError);
		});

		it('rejects an unknown connection with 404', async () => {
			connectionRepository.findByIdWithProvider.mockResolvedValue(null);

			await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundError);
		});
	});

	describe('delete', () => {
		it('removes the local checkout of every config it cascades', async () => {
			connectionRepository.findByIdWithProvider.mockResolvedValue(connection());
			configRepository.findByConnectionIds.mockResolvedValue([
				{ id: 'cfg-apply' },
				{ id: 'cfg-promote' },
			] as never);

			await service.delete('conn1');

			expect(connectionRepository.deleteConnection).toHaveBeenCalledWith('conn1');
			expect(workingDirectory.purge).toHaveBeenCalledWith('cfg-apply');
			expect(workingDirectory.purge).toHaveBeenCalledWith('cfg-promote');
		});
	});

	describe('project links', () => {
		const teamProject = { id: 'p1', type: 'team' };
		const personalProject = { id: 'p1', type: 'personal' };
		const user = mock<User>({ id: 'u1' });

		beforeEach(() => {
			connectionRepository.findByIdWithProvider.mockResolvedValue(connection());
		});

		describe('addProject', () => {
			it('creates a link for a team project', async () => {
				projectRepository.findOneBy.mockResolvedValue(teamProject as never);
				linkRepository.linkProject.mockResolvedValue({
					projectId: 'p1',
					connectionId: 'conn1',
				} as never);

				const result = await service.addProject({ user, connectionId: 'conn1', projectId: 'p1' });

				expect(userHasScopesMock).toHaveBeenCalledWith(user, ['project:update'], false, {
					projectId: 'p1',
				});
				expect(linkRepository.linkProject).toHaveBeenCalledWith('p1', 'conn1');
				expect(result).toEqual({ projectId: 'p1', connectionId: 'conn1' });
			});

			it('reports a project linked to another connection as a conflict', async () => {
				projectRepository.findOneBy.mockResolvedValue(teamProject as never);
				linkRepository.linkProject.mockRejectedValue(
					new PromotionConflictError('project-link', 'Linked elsewhere'),
				);

				await expect(
					service.addProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);
			});

			it('rejects when the user cannot edit the project', async () => {
				userHasScopesMock.mockResolvedValue(false);

				await expect(
					service.addProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(ForbiddenError);
				expect(projectRepository.findOneBy).not.toHaveBeenCalled();
				expect(linkRepository.linkProject).not.toHaveBeenCalled();
			});

			it('rejects an unknown project with 404', async () => {
				projectRepository.findOneBy.mockResolvedValue(null);

				await expect(
					service.addProject({ user, connectionId: 'conn1', projectId: 'missing' }),
				).rejects.toThrow(NotFoundError);
			});

			it('rejects a personal project with 400', async () => {
				projectRepository.findOneBy.mockResolvedValue(personalProject as never);

				await expect(
					service.addProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(BadRequestError);
			});

			it('rejects an instance connection with 400', async () => {
				connectionRepository.findByIdWithProvider.mockResolvedValue(
					connection({ scope: 'instance' }),
				);

				await expect(
					service.addProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(BadRequestError);
				expect(linkRepository.linkProject).not.toHaveBeenCalled();
			});

			it('rejects when the connection does not exist', async () => {
				connectionRepository.findByIdWithProvider.mockResolvedValue(null);

				await expect(
					service.addProject({ user, connectionId: 'missing', projectId: 'p1' }),
				).rejects.toThrow(NotFoundError);
				expect(projectRepository.findOneBy).not.toHaveBeenCalled();
			});
		});

		describe('removeProject', () => {
			it('removes a link that belongs to this connection', async () => {
				linkRepository.findByProjectId.mockResolvedValue({
					projectId: 'p1',
					connectionId: 'conn1',
				} as never);
				linkRepository.unlinkProject.mockResolvedValue(1);

				await service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' });

				expect(userHasScopesMock).toHaveBeenCalledWith(user, ['project:update'], false, {
					projectId: 'p1',
				});
				expect(linkRepository.unlinkProject).toHaveBeenCalledWith('p1', 'conn1');
			});

			it('is a no-op when the project is not linked', async () => {
				linkRepository.findByProjectId.mockResolvedValue(null);

				await service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' });

				expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects when the user cannot edit the project', async () => {
				userHasScopesMock.mockResolvedValue(false);

				await expect(
					service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(ForbiddenError);
				expect(linkRepository.findByProjectId).not.toHaveBeenCalled();
				expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects removing a link owned by a different connection', async () => {
				linkRepository.findByProjectId.mockResolvedValue({
					projectId: 'p1',
					connectionId: 'other',
				} as never);

				await expect(
					service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);
				expect(linkRepository.unlinkProject).not.toHaveBeenCalled();
			});

			it('rejects when the link is reassigned to another connection before the delete', async () => {
				linkRepository.findByProjectId
					.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'conn1' } as never)
					.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'other' } as never);
				linkRepository.unlinkProject.mockResolvedValue(0);

				await expect(
					service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).rejects.toThrow(ConflictError);
				expect(linkRepository.unlinkProject).toHaveBeenCalledWith('p1', 'conn1');
			});

			it('is a no-op when the link is removed by a concurrent request before the delete', async () => {
				linkRepository.findByProjectId
					.mockResolvedValueOnce({ projectId: 'p1', connectionId: 'conn1' } as never)
					.mockResolvedValueOnce(null);
				linkRepository.unlinkProject.mockResolvedValue(0);

				await expect(
					service.removeProject({ user, connectionId: 'conn1', projectId: 'p1' }),
				).resolves.toBeUndefined();
				expect(linkRepository.unlinkProject).toHaveBeenCalledWith('p1', 'conn1');
			});
		});

		describe('listProjects', () => {
			it('returns the linked project IDs', async () => {
				linkRepository.findProjectIdsByConnection.mockResolvedValue(['p1', 'p2']);

				await expect(service.listProjects('conn1')).resolves.toEqual({
					projectIds: ['p1', 'p2'],
				});
			});
		});
	});
});
