import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { UserFavoriteRepository } from './database/repositories/user-favorite.repository';

@Service()
export class FavoritesService {
	constructor(private readonly userFavoriteRepository: UserFavoriteRepository) {}

	async getFavorites(userId: string) {
		return await this.userFavoriteRepository.findByUser(userId);
	}

	async addFavorite(userId: string, resourceId: string, resourceType: string) {
		const existing = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (existing) return existing;

		const favorite = this.userFavoriteRepository.create({ userId, resourceId, resourceType });
		return await this.userFavoriteRepository.save(favorite);
	}

	async removeFavorite(userId: string, resourceId: string, resourceType: string) {
		const favorite = await this.userFavoriteRepository.findOne({
			where: { userId, resourceId, resourceType },
		});

		if (!favorite) {
			throw new NotFoundError('Favorite not found');
		}

		await this.userFavoriteRepository.remove(favorite);
	}

	async deleteByResource(resourceId: string): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceId(resourceId);
	}

	async deleteByResourceIds(resourceIds: string[]): Promise<void> {
		await this.userFavoriteRepository.deleteByResourceIds(resourceIds);
	}
}
