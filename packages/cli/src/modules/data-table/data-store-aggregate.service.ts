import type { ListDataStoreQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { ProjectService } from '@/services/project.service.ee';

import { DataStoreRepository } from './data-store.repository';

@Service()
export class DataStoreAggregateService {
	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly projectService: ProjectService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}
	async start() {}
	async shutdown() {}

	async getManyAndCount(user: User, options: ListDataStoreQueryDto) {
		const projects = await this.projectService.getProjectRelationsForUser(user);
		let projectIds = projects.map((x) => x.projectId);
		if (options.filter?.projectId) {
			const mask = [options.filter?.projectId].flat();
			projectIds = projectIds.filter((x) => mask.includes(x));
		}

		if (projectIds.length === 0) {
			return { count: 0, data: [] };
		}

		return await this.dataStoreRepository.getManyAndCount({
			...options,
			filter: {
				...options.filter,
				projectId: projectIds,
			},
		});
	}
}
