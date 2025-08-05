import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { FindOptionsWhere, FindManyOptions } from '@n8n/typeorm';

import { SavedSearch } from '../entities/saved-search';

@Service()
export class SavedSearchRepository extends Repository<SavedSearch> {
	constructor(dataSource: DataSource) {
		super(SavedSearch, dataSource.manager);
	}

	async findByUserId(
		userId: string,
		options?: FindManyOptions<SavedSearch>,
	): Promise<SavedSearch[]> {
		return await this.find({
			where: { userId },
			order: { isPinned: 'DESC', updatedAt: 'DESC' },
			...options,
		});
	}

	async findPublicSearches(options?: FindManyOptions<SavedSearch>): Promise<SavedSearch[]> {
		return await this.find({
			where: { isPublic: true },
			order: { updatedAt: 'DESC' },
			...options,
		});
	}

	async findByUserIdAndName(userId: string, name: string): Promise<SavedSearch | null> {
		return await this.findOne({
			where: { userId, name },
		});
	}

	async updateExecutionStats(
		id: string,
		stats: { resultsCount: number; lastExecutedAt: string },
	): Promise<void> {
		await this.update(id, {
			metadata: {
				...stats,
				executionCount: () => 'COALESCE("metadata"->\'executionCount\', 0) + 1',
			} as any,
		});
	}
}
