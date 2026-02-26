import { mock } from 'jest-mock-extended';
import type {
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import type { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';
import { FavoritesService } from '../favorites.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

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
	});

	describe('addFavorite', () => {
		it('should create and save a new favorite', async () => {
			const favorite = mock<UserFavorite>();
			repo.findOne.mockResolvedValue(null);
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
