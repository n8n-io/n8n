import { Service } from '@n8n/di';
import { DataSource, Raw, Repository } from '@n8n/typeorm';

import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

@Service()
export class InstanceAiThreadRepository extends Repository<InstanceAiThread> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThread, dataSource.manager);
	}

	async searchHistory(resourceId: string, search: string, page: number, perPage: number) {
		const escapedSearch = search.replace(/[\\%_]/g, (char) => `\\${char}`);
		return await this.findAndCount({
			where: {
				resourceId,
				title: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:threadSearch) ESCAPE '\\'`, {
					threadSearch: `%${escapedSearch}%`,
				}),
			},
			order: { updatedAt: 'DESC', id: 'DESC' },
			take: perPage,
			skip: page * perPage,
		});
	}
}
