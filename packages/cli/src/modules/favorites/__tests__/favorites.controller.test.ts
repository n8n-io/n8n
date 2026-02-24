import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { UserFavorite } from '../database/entities/user-favorite.entity';
import { FavoritesController } from '../favorites.controller';
import { FavoritesService } from '../favorites.service';

describe('FavoritesController', () => {
	const favoritesService = mock<FavoritesService>();
	const controller = new FavoritesController(favoritesService);

	const req = mock<AuthenticatedRequest>({ user: { id: 'user1' } });

	afterEach(() => jest.clearAllMocks());

	describe('getFavorites', () => {
		it('should return favorites for the authenticated user', async () => {
			const favorites = [mock<UserFavorite>()];
			favoritesService.getFavorites.mockResolvedValue(favorites);

			const result = await controller.getFavorites(req);

			expect(favoritesService.getFavorites).toHaveBeenCalledWith('user1');
			expect(result).toBe(favorites);
		});
	});

	describe('addFavorite', () => {
		it('should add a favorite for the authenticated user', async () => {
			const favorite = mock<UserFavorite>();
			favoritesService.addFavorite.mockResolvedValue(favorite);

			const result = await controller.addFavorite(req, undefined, {
				resourceId: 'res1',
				resourceType: 'workflow',
			});

			expect(favoritesService.addFavorite).toHaveBeenCalledWith('user1', 'res1', 'workflow');
			expect(result).toBe(favorite);
		});
	});

	describe('removeFavorite', () => {
		it('should remove a favorite for the authenticated user', async () => {
			favoritesService.removeFavorite.mockResolvedValue(undefined);

			const result = await controller.removeFavorite(req, undefined, 'res1', 'workflow');

			expect(favoritesService.removeFavorite).toHaveBeenCalledWith('user1', 'res1', 'workflow');
			expect(result).toBe(true);
		});
	});
});
