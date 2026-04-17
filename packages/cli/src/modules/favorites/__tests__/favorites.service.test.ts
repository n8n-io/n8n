import { mock } from 'jest-mock-extended';
import type {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import type { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';
import { FavoritesService } from '../favorites.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

const makeUserFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite =>
	({
		id: 1,
		userId: 'user1',
		resourceId: 'res1',
		resourceType: 'workflow',
		...overrides,
	}) as UserFavorite;

describe('FavoritesService', () => {
	const repo = mock<UserFavoriteRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const projectRepository = mock<ProjectRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const folderRepository = mock<FolderRepository>();
	const service = new FavoritesService(
		repo,
		workflowRepository,
		projectRepository,
		sharedWorkflowRepository,
		dataTableRepository,
		folderRepository,
	);

	afterEach(() => jest.clearAllMocks());

	describe('getEnrichedFavorites', () => {
		it('should return empty array when user has no favorites', async () => {
			repo.findByUser.mockResolvedValue([]);

			const result = await service.getEnrichedFavorites('user1');

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

			const result = await service.getEnrichedFavorites('user1');

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

			const result = await service.getEnrichedFavorites('user1');

			expect(result).toHaveLength(0);
		});

		it('should skip workflow enrichment when there are no accessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'wf1', resourceType: 'workflow' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([]);

			const result = await service.getEnrichedFavorites('user1');

			expect(workflowRepository.findByIds).not.toHaveBeenCalled();
			expect(result).toHaveLength(0);
		});

		it('should enrich project favorites with name for accessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'proj1', resourceType: 'project' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);

			const result = await service.getEnrichedFavorites('user1');

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ resourceId: 'proj1', resourceName: 'My Project' });
		});

		it('should exclude project favorites for inaccessible projects', async () => {
			const favorite = makeUserFavorite({ resourceId: 'proj-other', resourceType: 'project' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);

			const result = await service.getEnrichedFavorites('user1');

			expect(result).toHaveLength(0);
		});

		it('should enrich dataTable favorites with name and projectId for accessible tables', async () => {
			const favorite = makeUserFavorite({ resourceId: 'dt1', resourceType: 'dataTable' });
			repo.findByUser.mockResolvedValue([favorite]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'Project 1' } as never,
			]);
			dataTableRepository.find.mockResolvedValue([
				{ id: 'dt1', name: 'My Table', projectId: 'proj1' } as never,
			]);

			const result = await service.getEnrichedFavorites('user1');

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
			dataTableRepository.find.mockResolvedValue([
				{ id: 'dt1', name: 'My Table', projectId: 'proj-other' } as never,
			]);

			const result = await service.getEnrichedFavorites('user1');

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

			const result = await service.getEnrichedFavorites('user1');

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

			const result = await service.getEnrichedFavorites('user1');

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

			const result = await service.getEnrichedFavorites('user1');

			expect(result).toHaveLength(0);
		});

		it('should handle multiple resource types in one call', async () => {
			repo.findByUser.mockResolvedValue([
				makeUserFavorite({ id: 1, resourceId: 'wf1', resourceType: 'workflow' }),
				makeUserFavorite({ id: 2, resourceId: 'proj1', resourceType: 'project' }),
				makeUserFavorite({ id: 3, resourceId: 'dt1', resourceType: 'dataTable' }),
				makeUserFavorite({ id: 4, resourceId: 'folder1', resourceType: 'folder' }),
			]);
			projectRepository.getAccessibleProjects.mockResolvedValue([
				{ id: 'proj1', name: 'My Project' } as never,
			]);
			workflowRepository.findByIds.mockResolvedValue([{ id: 'wf1', name: 'My Workflow' } as never]);
			sharedWorkflowRepository.find.mockResolvedValue([{ workflowId: 'wf1' } as never]);
			dataTableRepository.find.mockResolvedValue([
				{ id: 'dt1', name: 'My Table', projectId: 'proj1' } as never,
			]);
			folderRepository.find.mockResolvedValue([
				{ id: 'folder1', name: 'My Folder', homeProject: { id: 'proj1' } } as never,
			]);

			const result = await service.getEnrichedFavorites('user1');

			expect(result).toHaveLength(4);
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
			{ resourceType: 'dataTable' as const, repository: 'dataTableRepository' },
			{ resourceType: 'folder' as const, repository: 'folderRepository' },
		])(
			'should check existence using the correct repository for $resourceType',
			async ({ resourceType, repository }) => {
				const repositories = {
					workflowRepository,
					projectRepository,
					dataTableRepository,
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
