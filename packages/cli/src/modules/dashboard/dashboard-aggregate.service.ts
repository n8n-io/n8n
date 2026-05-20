import type { ListDashboardsQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import { DashboardRepository } from './dashboard.repository';

@Service()
export class DashboardAggregateService {
	constructor(
		private readonly dashboardRepository: DashboardRepository,
		private readonly projectService: ProjectService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('dashboard');
	}

	async start() {}
	async shutdown() {}

	async getManyAndCount(user: User, options: ListDashboardsQueryDto) {
		if (hasGlobalScope(user, 'dashboard:listProject')) {
			return await this.dashboardRepository.getManyAndCount(options);
		}

		const projects = await this.projectService.getProjectRelationsForUser(user);
		let projectIds = projects.map((p) => p.projectId);
		if (options.filter?.projectId) {
			const mask = [options.filter.projectId].flat();
			projectIds = projectIds.filter((id) => mask.includes(id));
		}

		if (projectIds.length === 0) {
			return { count: 0, data: [] };
		}

		return await this.dashboardRepository.getManyAndCount({
			...options,
			filter: {
				...options.filter,
				projectId: projectIds,
			},
		});
	}
}
