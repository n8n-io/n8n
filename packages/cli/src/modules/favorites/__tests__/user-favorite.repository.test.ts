import { mock } from 'jest-mock-extended';
import type { DataSource, DeleteResult, EntityManager } from '@n8n/typeorm';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';

const makeEntity = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
	id: 1,
	userId: 'user1',
	resourceId: 'res1',
	resourceType: 'workflow',
	user: undefined as never,
	...overrides,
});

describe('UserFavoriteRepository', () => {
	const mockManager = mock<EntityManager>();
	const mockDataSource = mock<DataSource>({ manager: mockManager });

	let repo: UserFavoriteRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new UserFavoriteRepository(mockDataSource);
		// Spy on inherited TypeORM methods
		jest.spyOn(repo, 'find').mockResolvedValue([]);
		jest.spyOn(repo, 'delete').mockResolvedValue({ affected: 1 } as DeleteResult);
	});

	describe('findByUser', () => {
		it('should query favorites for a user ordered by id DESC', async () => {
			const favorites = [makeEntity({ id: 2 }), makeEntity({ id: 1 })];
			jest.spyOn(repo, 'find').mockResolvedValue(favorites);

			const result = await repo.findByUser('user1');

			expect(repo.find).toHaveBeenCalledWith({
				where: { userId: 'user1' },
				order: { id: 'DESC' },
			});
			expect(result).toEqual(favorites);
		});

		it('should return empty array when user has no favorites', async () => {
			jest.spyOn(repo, 'find').mockResolvedValue([]);

			const result = await repo.findByUser('user1');

			expect(result).toEqual([]);
		});
	});

	describe('deleteByResourceId', () => {
		it('should delete favorites matching resourceId and resourceType', async () => {
			await repo.deleteByResourceId('res1', 'workflow');

			expect(repo.delete).toHaveBeenCalledWith({ resourceId: 'res1', resourceType: 'workflow' });
		});
	});

	describe('deleteByResourceIds', () => {
		it('should skip deletion when resourceIds array is empty', async () => {
			await repo.deleteByResourceIds([], 'workflow');

			expect(repo.delete).not.toHaveBeenCalled();
		});

		it('should delete favorites matching any of the resourceIds and the resourceType', async () => {
			await repo.deleteByResourceIds(['res1', 'res2'], 'dataTable');

			expect(repo.delete).toHaveBeenCalledWith(
				expect.objectContaining({ resourceType: 'dataTable' }),
			);
		});

		it('should handle single resourceId in array', async () => {
			await repo.deleteByResourceIds(['res1'], 'workflow');

			expect(repo.delete).toHaveBeenCalledWith(
				expect.objectContaining({ resourceType: 'workflow' }),
			);
		});
	});
});
