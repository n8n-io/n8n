import {
	FavoriteResourceResolverRegistry,
	type FavoriteResourceResolver,
	type FolderFinderService,
	type ProjectScopeService,
} from '@n8n/backend-services';
import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	type Folder,
	type FolderRepository,
	type Project,
	type ProjectRepository,
	type SharedWorkflowRepository,
	type User,
	type WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, NotFoundError } from '@n8n/errors';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import type { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';
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
	const projectScopeService = mock<ProjectScopeService>();
	const folderFinderService = mock<FolderFinderService>();
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
		projectScopeService,
		folderFinderService,
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
				projectScopeService,
				folderFinderService,
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
		const allowWorkflowAccess = (resourceId = 'res1') => {
			projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:viewer']);
			sharedWorkflowRepository.findWorkflowIdsInUserProjects.mockResolvedValue(
				new Set([resourceId]),
			);
		};

		it('should create and save a new favorite when user has access', async () => {
			const user = makeUser();
			const favorite = mock<UserFavorite>();
			allowWorkflowAccess();
			repo.findOne.mockResolvedValue(null);
			repo.count.mockResolvedValue(0);
			repo.create.mockReturnValue(favorite);
			repo.save.mockResolvedValue(favorite);

			const result = await service.addFavorite(user, 'res1', 'workflow');

			expect(projectScopeService.getProjectRoleSlugs).toHaveBeenCalledWith(user, ['workflow:read']);
			expect(sharedWorkflowRepository.findWorkflowIdsInUserProjects).toHaveBeenCalledWith(
				['res1'],
				'user1',
				['project:viewer'],
			);
			expect(repo.create).toHaveBeenCalledWith({
				userId: 'user1',
				resourceId: 'res1',
				resourceType: 'workflow',
			});
			expect(repo.save).toHaveBeenCalledWith(favorite);
			expect(result).toBe(favorite);
		});

		it('should return existing favorite without saving if already exists and accessible', async () => {
			const existing = mock<UserFavorite>();
			allowWorkflowAccess();
			repo.findOne.mockResolvedValue(existing);

			const result = await service.addFavorite(makeUser(), 'res1', 'workflow');

			expect(repo.create).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
			expect(result).toBe(existing);
		});

		it('should throw NotFoundError even if a prior favorite row exists when user lacks access', async () => {
			projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:viewer']);
			sharedWorkflowRepository.findWorkflowIdsInUserProjects.mockResolvedValue(new Set());

			await expect(service.addFavorite(makeUser(), 'res1', 'workflow')).rejects.toThrow(
				NotFoundError,
			);

			expect(repo.findOne).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when favorites limit is reached', async () => {
			allowWorkflowAccess();
			repo.findOne.mockResolvedValue(null);
			repo.count.mockResolvedValue(200);

			await expect(service.addFavorite(makeUser(), 'res1', 'workflow')).rejects.toThrow(
				BadRequestError,
			);

			expect(repo.create).not.toHaveBeenCalled();
			expect(repo.save).not.toHaveBeenCalled();
		});

		it('should allow adding when count is one below the limit', async () => {
			const favorite = mock<UserFavorite>();
			allowWorkflowAccess();
			repo.findOne.mockResolvedValue(null);
			repo.count.mockResolvedValue(199);
			repo.create.mockReturnValue(favorite);
			repo.save.mockResolvedValue(favorite);

			const result = await service.addFavorite(makeUser(), 'res1', 'workflow');

			expect(repo.save).toHaveBeenCalled();
			expect(result).toBe(favorite);
		});

		describe('workflow access', () => {
			it('should throw NotFoundError when user lacks workflow:read access', async () => {
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:viewer']);
				sharedWorkflowRepository.findWorkflowIdsInUserProjects.mockResolvedValue(new Set());

				await expect(service.addFavorite(makeUser(), 'wf1', 'workflow')).rejects.toThrow(
					NotFoundError,
				);

				expect(repo.save).not.toHaveBeenCalled();
			});

			it('should check workflow existence directly for users with global workflow:read', async () => {
				const admin = makeAdmin();
				const favorite = mock<UserFavorite>();
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(null);
				workflowRepository.existsBy.mockResolvedValue(true);
				repo.findOne.mockResolvedValue(null);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite(admin, 'wf1', 'workflow');

				expect(workflowRepository.existsBy).toHaveBeenCalledWith({ id: 'wf1' });
				expect(sharedWorkflowRepository.findWorkflowIdsInUserProjects).not.toHaveBeenCalled();
				expect(result).toBe(favorite);
			});

			it('should throw NotFoundError for global admin when workflow does not exist', async () => {
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(null);
				workflowRepository.existsBy.mockResolvedValue(false);

				await expect(service.addFavorite(makeAdmin(), 'missing', 'workflow')).rejects.toThrow(
					NotFoundError,
				);

				expect(repo.save).not.toHaveBeenCalled();
			});
		});

		describe('project access', () => {
			it('should create favorite when user has project:read on the project', async () => {
				const user = makeUser();
				const favorite = mock<UserFavorite>();
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:viewer']);
				projectRepository.findOneWithUserRoles.mockResolvedValue(mock<Project>({ id: 'proj1' }));
				repo.findOne.mockResolvedValue(null);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite(user, 'proj1', 'project');

				expect(projectScopeService.getProjectRoleSlugs).toHaveBeenCalledWith(user, [
					'project:read',
				]);
				expect(projectRepository.findOneWithUserRoles).toHaveBeenCalledWith('proj1', 'user1', [
					'project:viewer',
				]);
				expect(result).toBe(favorite);
			});

			it('should throw NotFoundError when user lacks project:read on the project', async () => {
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(['project:viewer']);
				projectRepository.findOneWithUserRoles.mockResolvedValue(null);

				await expect(service.addFavorite(makeUser(), 'proj1', 'project')).rejects.toThrow(
					NotFoundError,
				);

				expect(repo.save).not.toHaveBeenCalled();
			});

			it('should throw NotFoundError without querying repository when no project roles grant project:read', async () => {
				projectScopeService.getProjectRoleSlugs.mockResolvedValue([]);

				await expect(service.addFavorite(makeUser(), 'proj1', 'project')).rejects.toThrow(
					NotFoundError,
				);

				expect(projectRepository.findOneWithUserRoles).not.toHaveBeenCalled();
				expect(repo.save).not.toHaveBeenCalled();
			});

			it('should allow global admin to favorite an existing project', async () => {
				const admin = makeAdmin();
				const favorite = mock<UserFavorite>();
				projectScopeService.getProjectRoleSlugs.mockResolvedValue(null);
				projectRepository.findOneWithUserRoles.mockResolvedValue(mock<Project>({ id: 'proj1' }));
				repo.findOne.mockResolvedValue(null);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite(admin, 'proj1', 'project');

				expect(projectRepository.findOneWithUserRoles).toHaveBeenCalledWith(
					'proj1',
					'admin1',
					undefined,
				);
				expect(result).toBe(favorite);
			});
		});

		describe('folder access', () => {
			it('should create favorite when user has folder:read on the folder', async () => {
				const user = makeUser();
				const favorite = mock<UserFavorite>();
				folderFinderService.findFoldersByIdsForUser.mockResolvedValue([
					mock<Folder>({ id: 'folder1', homeProject: mock<Project>({ id: 'proj1' }) }),
				]);
				repo.findOne.mockResolvedValue(null);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite(user, 'folder1', 'folder');

				expect(folderFinderService.findFoldersByIdsForUser).toHaveBeenCalledWith(
					['folder1'],
					user,
					['folder:read'],
				);
				expect(result).toBe(favorite);
			});

			it('should throw NotFoundError when user lacks folder:read or folder does not exist', async () => {
				folderFinderService.findFoldersByIdsForUser.mockResolvedValue([]);

				await expect(service.addFavorite(makeUser(), 'folder1', 'folder')).rejects.toThrow(
					NotFoundError,
				);

				expect(repo.save).not.toHaveBeenCalled();
			});

			it('should throw NotFoundError when folder has no homeProject', async () => {
				folderFinderService.findFoldersByIdsForUser.mockResolvedValue([
					mock<Folder>({ id: 'folder1', homeProject: undefined as unknown as Project }),
				]);

				await expect(service.addFavorite(makeUser(), 'folder1', 'folder')).rejects.toThrow(
					NotFoundError,
				);

				expect(repo.save).not.toHaveBeenCalled();
			});
		});

		describe.each([
			{ resourceType: 'dataTable' as const, resolver: dataTableResolver },
			{ resourceType: 'agent' as const, resolver: agentResolver },
		])('$resourceType access', ({ resourceType, resolver }) => {
			it('should create favorite when resource exists and user has read scope in its project', async () => {
				const user = makeUser();
				const favorite = mock<UserFavorite>();
				resolver.findMeta.mockResolvedValue(
					new Map([['res1', { name: 'Res', projectId: 'proj1' }]]),
				);
				projectScopeService.hasScopes.mockResolvedValue(true);
				repo.findOne.mockResolvedValue(null);
				repo.count.mockResolvedValue(0);
				repo.create.mockReturnValue(favorite);
				repo.save.mockResolvedValue(favorite);

				const result = await service.addFavorite(user, 'res1', resourceType);

				expect(resolver.findMeta).toHaveBeenCalledWith(['res1']);
				expect(projectScopeService.hasScopes).toHaveBeenCalledWith(user, 'proj1', [
					resolver.globalReadScope,
				]);
				expect(repo.create).toHaveBeenCalledWith({
					userId: 'user1',
					resourceId: 'res1',
					resourceType,
				});
				expect(repo.save).toHaveBeenCalledWith(favorite);
				expect(result).toBe(favorite);
			});

			it('should throw NotFoundError when resource does not exist', async () => {
				resolver.findMeta.mockResolvedValue(new Map());

				await expect(service.addFavorite(makeUser(), 'res1', resourceType)).rejects.toThrow(
					NotFoundError,
				);

				expect(resolver.findMeta).toHaveBeenCalledWith(['res1']);
				expect(projectScopeService.hasScopes).not.toHaveBeenCalled();
				expect(repo.save).not.toHaveBeenCalled();
			});

			it('should throw NotFoundError when user lacks read scope in the resource project', async () => {
				const user = makeUser();
				resolver.findMeta.mockResolvedValue(
					new Map([['res1', { name: 'Res', projectId: 'proj-other' }]]),
				);
				projectScopeService.hasScopes.mockResolvedValue(false);

				await expect(service.addFavorite(user, 'res1', resourceType)).rejects.toThrow(
					NotFoundError,
				);

				expect(projectScopeService.hasScopes).toHaveBeenCalledWith(user, 'proj-other', [
					resolver.globalReadScope,
				]);
				expect(repo.save).not.toHaveBeenCalled();
			});
		});

		it('should throw NotFoundError when the resource type has no registered resolver', async () => {
			const serviceWithoutResolvers = new FavoritesService(
				repo,
				workflowRepository,
				projectRepository,
				sharedWorkflowRepository,
				folderRepository,
				new FavoriteResourceResolverRegistry(),
				projectScopeService,
				folderFinderService,
			);

			await expect(
				serviceWithoutResolvers.addFavorite(makeUser(), 'res1', 'agent'),
			).rejects.toThrow(NotFoundError);
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
