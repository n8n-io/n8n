import type { ListDataTableQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

import { DataTableRepository } from './data-table.repository';

@Service()
export class DataTableAggregateService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}
	async start() {}
	async shutdown() {}

	async getManyAndCount(user: User, options: ListDataTableQueryDto) {
		if (hasGlobalScope(user, 'dataTable:listProject')) {
			return await this.dataTableRepository.getManyAndCount(options);
		}

		const roles = await this.roleService.rolesWithScope('project', ['dataTable:listProject']);
		let projectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(
			user.id,
			roles,
		);

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
