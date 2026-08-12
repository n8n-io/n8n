import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	type FolderRepository,
	type ProjectRepository,
	type SharedWorkflowRepository,
	type User,
	type WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import type { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';
import {
	FavoriteResourceResolverRegistry,
	type FavoriteResourceResolver,
} from '../favorite-resource-resolver.registry';
import { FavoritesService } from '../favorites.service';

const makeUserFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite =>
	({
		id: 1,
		userId: 'user1',
		resourceId: 'res1',
		resourceType: 'workflow',
		...overrides,
	}) as UserFavorite;

const makeUser = (overrides: Partial<User> = {}): User =>
	({
		id: 'user1',
		role: GLOBAL_MEMBER_ROLE,
		...overrides,
	}) as unknown as User;

const makeAdmin = (overrides: Partial<User> = {}): User =>
	makeUser({
		id: 'admin1',
		role: GLOBAL_ADMIN_ROLE,
		...overrides,
	});

describe('FavoritesService', () => {
	const repo = mock<UserFavoriteRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const projectRepository = mock<ProjectRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const folderRepository = mock<FolderRepository>();
	const dataTableResolver = {
		globalReadScope: 'dataTable:read',
		findMeta: vi.fn<FavoriteResourceResolver['findMeta']>(),
		exists: vi.fn<FavoriteResourceResolver['exists']>(),
	} satisfies FavoriteResourceResolver;
	const agentResolver = {
		globalReadScope: 'agent:read',
		findMeta: vi.fn<FavoriteResourceResolver['findMeta']>(),
		exists: vi.fn<FavoriteResourceResolver['exists']>(),
	} satisfies FavoriteResourceResolver;
	const resolverRegistry = new FavoriteResourceResolverRegistry();
	resolverRegistry.register('dataTable', dataTableResolver);
	resolverRegistry.register('agent', agentResolver);
	const service = new FavoritesService(
		repo,
		workflowRepository,
		projectRepository,
		sharedWorkflowRepository,
		folderRepository,
		resolverRegistry,
	);

	afterEach(() => vi.clearAllMocks());

	describe('getEnrichedFavorites', () => {
		it('should return empty array when user has no favorites', async () => {
			repo.findByUser.mockResolvedValue([]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(repo.findByUser).toHaveBeenCalledWith('user1');
			expect(result).toEqual([]);
		});

		it('should enrich workflow favorites with name for accessible workflows', async () => {
			const favorite = makeUserFavorite({ resourceId: 'wf1', resourceType: 'workflow' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			workflowRepository.findByIds.mockResolvedValue([{ id: 'wf1', name: 'My Workflow' } as never]);
			sharedWorkflowRepository.find.mockResolvedValue([{ workflowId: 'wf1' } as never]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ resourceId: 'wf1', resourceName: 'My Workflow' });
		});

		it('should exclude workflow favorites that are not accessible', async () => {
			const favorite = makeUserFavorite({ resourceId: 'wf1', resourceType: 'workflow' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			workflowRepository.findByIds.mockResolvedValue([{ id: 'wf1', name: 'My Workflow' } as never]);
			// Not in accessible workflows via SharedWorkflow
			sharedWorkflowRepository.find.mockResolvedValue([]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should skip workflow enrichment when there are no accessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'wf1', resourceType: 'workflow' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(workflowRepository.findByIds).not.toHaveBeenCalled();
			expect(result).toHaveLength(0);
		});

		it('should enrich project favorites with name for accessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'proj1', resourceType: 'project' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ resourceId: 'proj1', resourceName: 'My Project' });
		});

		it('should exclude project favorites for inaccessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'proj-other', resourceType: 'project' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should enrich dataTable favorites with name and projectId for accessible tables', async () => {
			const favorite = makeUserFavorite({ resourceId: 'dt1', resourceType: 'dataTable' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			dataTableResolver.findMeta.mockResolvedValue(
				new Map([['dt1', { name: 'My Table', projectId: 'proj1' }]]),
			);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(dataTableResolver.findMeta).toHaveBeenCalledWith(['dt1']);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				resourceId: 'dt1',
				resourceName: 'My Table',
				resourceProjectId: 'proj1',
			});
		});

		it('should exclude dataTable favorites for inaccessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'dt1', resourceType: 'dataTable' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			dataTableResolver.findMeta.mockResolvedValue(
				new Map([['dt1', { name: 'My Table', projectId: 'proj-other' }]]),
			);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should exclude favorites of a type that has no registered resolver', async () => {
			const favorite = makeUserFavorite({ resourceId: 'dt1', resourceType: 'dataTable' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			const serviceWithoutResolvers = new FavoritesService(
				repo,
				workflowRepository,
				projectRepository,
				sharedWorkflowRepository,
				folderRepository,
				new FavoriteResourceResolverRegistry(),
			);

			const result = await serviceWithoutResolvers.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should enrich folder favorites with name and projectId for accessible folders', async () => {
			const favorite = makeUserFavorite({ resourceId: 'folder1', resourceType: 'folder' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			folderRepository.find.mockResolvedValue([
				{
					id: 'folder1',
					name: 'My Folder',
					homeProject: { id: 'proj1' },
				} as never,
			]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				resourceId: 'folder1',
				resourceName: 'My Folder',
				resourceProjectId: 'proj1',
			});
		});

		it('should exclude folder favorites for inaccessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'folder1', resourceType: 'folder' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			folderRepository.find.mockResolvedValue([
				{
					id: 'folder1',
					name: 'My Folder',
					homeProject: { id: 'proj-other' },
				} as never,
			]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should exclude folders with no homeProject', async () => {
			const favorite = makeUserFavorite({ resourceId: 'folder1', resourceType: 'folder' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			folderRepository.find.mockResolvedValue([
				{
					id: 'folder1',
					name: 'My Folder',
					homeProject: undefined,
				} as never,
			]);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should enrich agent favorites with name and projectId for accessible agents', async () => {
			const favorite = makeUserFavorite({ resourceId: 'agent1', resourceType: 'agent' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			agentResolver.findMeta.mockResolvedValue(
				new Map([['agent1', { name: 'My Agent', projectId: 'proj1' }]]),
			);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(agentResolver.findMeta).toHaveBeenCalledWith(['agent1']);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				resourceId: 'agent1',
				resourceName: 'My Agent',
				resourceProjectId: 'proj1',
			});
		});

		it('should exclude agent favorites for inaccessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'agent1', resourceType: 'agent' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			agentResolver.findMeta.mockResolvedValue(
				new Map([['agent1', { name: 'My Agent', projectId: 'proj-other' }]]),
			);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(0);
		});

		it('should handle multiple resource types in one call', async () => {
			repo.findByUser.mockResolvedValue([
				makeUserFavorite({ id: 1, resourceId: 'wf1', resourceType: 'workflow' }),
				makeUserFavorite({ id: 2, resourceId: 'proj1', resourceType: 'project' }),
				makeUserFavorite({ id: 3, resourceId: 'dt1', resourceType: 'dataTable' }),
				makeUserFavorite({ id: 4, resourceId: 'folder1', resourceType: 'folder' }),
				makeUserFavorite({ id: 5, resourceId: 'agent1', resourceType: 'agent' }),
			]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);
			workflowRepository.findByIds.mockResolvedValue([{ id: 'wf1', name: 'My Workflow' } as never]);
			sharedWorkflowRepository.find.mockResolvedValue([{ workflowId: 'wf1' } as never]);
			dataTableResolver.findMeta.mockResolvedValue(
				new Map([['dt1', { name: 'My Table', projectId: 'proj1' }]]),
			);
			folderRepository.find.mockResolvedValue([
				{ id: 'folder1', name: 'My Folder', homeProject: { id: 'proj1' } } as never,
			]);
			agentResolver.findMeta.mockResolvedValue(
				new Map([['agent1', { name: 'My Agent', projectId: 'proj1' }]]),
			);

			const result = await service.getEnrichedFavorites(makeUser());

			expect(result).toHaveLength(5);
		});

		describe('global admin access', () => {
			it('should enrich workflow favorites without explicit project membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'wf1', resourceType: 'workflow' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([]);
				workflowRepository.findByIds.mockResolvedValue([
					{ id: 'wf1', name: 'My Workflow' } as never,
				]);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({ resourceId: 'wf1', resourceName: 'My Workflow' });
				expect(sharedWorkflowRepository.find).not.toHaveBeenCalled();
			});

			it('should enrich project favorites without explicit project membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'proj-other', resourceType: 'project' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([]);
				projectRepository.find.mockResolvedValue([
					{ id: 'proj-other', name: 'Other Project' } as never,
				]);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					resourceId: 'proj-other',
					resourceName: 'Other Project',
				});
			});

			it('should enrich dataTable favorites without explicit project membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'dt1', resourceType: 'dataTable' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([]);
				dataTableResolver.findMeta.mockResolvedValue(
					new Map([['dt1', { name: 'My Table', projectId: 'proj-other' }]]),
				);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					resourceId: 'dt1',
					resourceName: 'My Table',
					resourceProjectId: 'proj-other',
				});
			});

			it('should enrich folder favorites without explicit project membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'folder1', resourceType: 'folder' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([]);
				folderRepository.find.mockResolvedValue([
					{
						id: 'folder1',
						name: 'My Folder',
						homeProject: { id: 'proj-other' },
					} as never,
				]);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					resourceId: 'folder1',
					resourceName: 'My Folder',
					resourceProjectId: 'proj-other',
				});
			});

			it('should enrich agent favorites without explicit project membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'agent1', resourceType: 'agent' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([]);
				agentResolver.findMeta.mockResolvedValue(
					new Map([['agent1', { name: 'My Agent', projectId: 'proj-other' }]]),
				);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					resourceId: 'agent1',
					resourceName: 'My Agent',
					resourceProjectId: 'proj-other',
				});
			});

			it('should not query for additional projects when admin already has membership', async () => {
				const favorite = makeUserFavorite({ resourceId: 'proj1', resourceType: 'project' });
				repo.findByUser.mockResolvedValue([favorite]);
				projectRepository.getAccessibleProjects.mockResolvedValue([
					{ id: 'proj1', name: 'My Project' } as never,
				]);

				const result = await service.getEnrichedFavorites(makeAdmin());

				expect(projectRepository.find).not.toHaveBeenCalled();
				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({ resourceId: 'proj1', resourceName: 'My Project' });
			});
		});
	});

	describe('addFavorite', () => {
		it('should create and save a new favorite', async () => {
			const favorite = mock<UserFavorite>();
			repo.findOne.mockResolvedValue(null);
			workflowRepository.existsBy.mockResolvedValue(true);
			repo.count.mockResolvedValue(0);
			repo.create.mockReturnValue(favorite);
			repo.save.mockResolvedValue(favorite);

			const result = await service.addFavorite('user1', 'res1', 'workflow');

			expect(repo.create).toHaveBeenCalledWith({
				userId: 'user1',
				resourceId: 'res1',
				resourceType: 'workflow',
			});
			expect(repo.save).toHaveBeenCalledWith(favorite);
			expect(result).toBe(favorite);
		});

		it('should return existing favorite without saving if already exists', async () => {
			const existing = mock<UserFavorite>();
			repo.findOne.mockResolvedValue(existing);

			const result = await service.addFavorite('user1', 'res1', 'workflow');

			expect(repo.create).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
			expect(result).toBe(existing);
		});

		it('should throw NotFoundError when resource does not exist', async () => {
			repo.findOne.mockResolvedValue(null);
			workflowRepository.existsBy.mockResolvedValue(false);

			await expect(service.addFavorite('user1', 'res1', 'workflow')).rejects.toThrow(NotFoundError);

			expect(repo.create).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when favorites limit is reached', async () => {
			repo.findOne.mockResolvedValue(null);
			workflowRepository.existsBy.mockResolvedValue(true);
			repo.count.mockResolvedValue(200);

			await expect(service.addFavorite('user1', 'res1', 'workflow')).rejects.toThrow(
				BadRequestError,
			);

			expect(repo.create).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
		});

		it('should allow adding when count is one below the limit', async () => {
			const favorite = mock<UserFavorite>();
			repo.findOne.mockResolvedValue(null);
			workflowRepository.existsBy.mockResolvedValue(true);
			repo.count.mockResolvedValue(199);
			repo.create.mockReturnValue(favorite);
			repo.save.mockResolvedValue(favorite);

			const result = await service.addFavorite('user1', 'res1', 'workflow');

			expect(repo.save).toHaveBeenCalled();
			expect(result).toBe(favorite);
		});

		it.each([
			{ resourceType: 'workflow' as const, repository: 'workflowRepository' },
			{ resourceType: 'project' as const, repository: 'projectRepository' },
			{ resourceType: 'folder' as const, repository: 'folderRepository' },
		])(
			'should check existence using the correct repository for $resourceType',
			async ({ resourceType, repository }) => {
				const repositories = {
					workflowRepository,
					projectRepository,
					folderRepository,
				};
				repo.findOne.mockResolvedValue(null);
				repositories[repository as keyof typeof repositories].existsBy.mockResolvedValue(false);

				await expect(service.addFavorite('user1', 'res1', resourceType)).rejects.toThrow(
					NotFoundError,
				);
				expect(repositories[repository as keyof typeof repositories].existsBy).toHaveBeenCalledWith(
					{ id: 'res1' },
				);
			},
		);

		it.each([
			{ resourceType: 'dataTable' as const, resolver: dataTableResolver },
			{ resourceType: 'agent' as const, resolver: agentResolver },
		])(
			'should check existence using the registered resolver for $resourceType',
			async ({ resourceType, resolver }) => {
				repo.findOne.mockResolvedValue(null);
				resolver.exists.mockResolvedValue(false);

				await expect(service.addFavorite('user1', 'res1', resourceType)).rejects.toThrow(
					NotFoundError,
				);
				expect(resolver.exists).toHaveBeenCalledWith('res1');
			},
		);

		it.each([
			{ resourceType: 'dataTable' as const, resolver: dataTableResolver },
			{ resourceType: 'agent' as const, resolver: agentResolver },
		])(
			'should create the favorite when the resolver reports the $resourceType exists',
			async ({ resourceType, resolver }) => {
				const favorite = mock<UserFavorite>();
				repo.findOne.mockResolvedValue(null);
				resolver.exists.mockResolvedValue(true);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite('user1', 'res1', resourceType);

				expect(resolver.exists).toHaveBeenCalledWith('res1');
				expect(repo.create).toHaveBeenCalledWith({
					userId: 'user1',
					resourceId: 'res1',
					resourceType,
				});
				expect(repo.save).toHaveBeenCalledWith(favorite);
				expect(result).toBe(favorite);
			},
		);

		it('should throw NotFoundError when the resource type has no registered resolver', async () => {
			const serviceWithoutResolvers = new FavoritesService(
				repo,
				workflowRepository,
				projectRepository,
				sharedWorkflowRepository,
				folderRepository,
				new FavoriteResourceResolverRegistry(),
			);
			repo.findOne.mockResolvedValue(null);

			await expect(serviceWithoutResolvers.addFavorite('user1', 'res1', 'agent')).rejects.toThrow(
				NotFoundError,
			);
			expect(repo.save).not.toHaveBeenCalled();
		});
	});

	describe('removeFavorite', () => {
		it('should remove an existing favorite', async () => {
			const favorite = mock<UserFavorite>();
			repo.findOne.mockResolvedValue(favorite);

			await service.removeFavorite('user1', 'res1', 'workflow');

			expect(repo.remove).toHaveBeenCalledWith(favorite);
		});

		it('should throw NotFoundError when favorite does not exist', async () => {
			repo.findOne.mockResolvedValue(null);

			await expect(service.removeFavorite('user1', 'res1', 'workflow')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('deleteByResource', () => {
		it('should delete all favorites for a resource', async () => {
			await service.deleteByResource('res1', 'workflow');

			expect(repo.deleteByResourceId).toHaveBeenCalledWith('res1', 'workflow');
		});
	});

	describe('deleteByResourceIds', () => {
		it('should delete all favorites for multiple resources', async () => {
			await service.deleteByResourceIds(['res1', 'res2'], 'dataTable');

			expect(repo.deleteByResourceIds).toHaveBeenCalledWith(['res1', 'res2'], 'dataTable');
		});
	});
});
