import type { ListDataTableQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { ProjectService } from '@/services/project.service.ee';

import { DataTableRepository } from './data-table.repository';

@Service()
export class DataTableAggregateService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly projectService: ProjectService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}
	async start() {}
	async shutdown() {}

	async getManyAndCount(user: User, options: ListDataTableQueryDto) {
		const projects = await this.projectService.getProjectRelationsForUser(user);
		let projectIds = projects.map((x) => x.projectId);
		if (options.filter?.projectId) {
			const mask = [options.filter?.projectId].flat();
			projectIds = projectIds.filter((x) => mask.includes(x));
		}

		if (projectIds.length === 0) {
			return { count: 0, data: [] };
		}

		return await this.dataTableRepository.getManyAndCount({
			...options,
			filter: {
				...options.filter,
				projectId: projectIds,
			},
		});
	}
}
