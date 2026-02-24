import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { UserFavoriteRepository } from '../database/repositories/user-favorite.repository';
import type { UserFavorite } from '../database/entities/user-favorite.entity';
import { FavoritesService } from '../favorites.service';

describe('FavoritesService', () => {
	const repo = mock<UserFavoriteRepository>();
	const service = new FavoritesService(repo);

	afterEach(() => jest.clearAllMocks());

	describe('getFavorites', () => {
		it('should return all favorites for a user', async () => {
			const favorites = [mock<UserFavorite>({ userId: 'user1' })];
			repo.findByUser.mockResolvedValue(favorites);

			const result = await service.getFavorites('user1');

			expect(repo.findByUser).toHaveBeenCalledWith('user1');
			expect(result).toBe(favorites);
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
			await service.deleteByResource('res1');

			expect(repo.deleteByResourceId).toHaveBeenCalledWith('res1');
		});
	});

	describe('deleteByResourceIds', () => {
		it('should delete all favorites for multiple resources', async () => {
			await service.deleteByResourceIds(['res1', 'res2']);

			expect(repo.deleteByResourceIds).toHaveBeenCalledWith(['res1', 'res2']);
		});
	});
});
