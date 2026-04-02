import type { FavoriteResourceType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { UserFavorite } from '../entities/user-favorite.entity';

@Service()
export class UserFavoriteRepository extends Repository<UserFavorite> {
	constructor(dataSource: DataSource) {
		super(UserFavorite, dataSource.manager);
	}

	async findByUser(userId: string): Promise<UserFavorite[]> {
		return await this.find({
			where: { userId },
			order: { id: 'DESC' },
		});
	}

	async deleteByResourceId(resourceId: string, resourceType: FavoriteResourceType): Promise<void> {
		await this.delete({ resourceId, resourceType });
	}

	async deleteByResourceIds(
		resourceIds: string[],
		resourceType: FavoriteResourceType,
	): Promise<void> {
		if (resourceIds.length === 0) return;
		await this.delete({ resourceId: In(resourceIds), resourceType });
	}
}
