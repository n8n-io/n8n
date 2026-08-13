import type { ListProjectFilesQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

import { ProjectFileRepository } from './project-file.repository';

@Service()
export class FileStorageAggregateService {
	constructor(
		private readonly projectFileRepository: ProjectFileRepository,
		private readonly projectService: ProjectService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('file-storage');
	}

	async getManyAndCount(user: User, options: ListProjectFilesQueryDto) {
		if (hasGlobalScope(user, 'file:listProject')) {
			return await this.projectFileRepository.getManyAndCount(options);
		}

		const projects = await this.projectService.getProjectRelationsForUser(user);

		let projectIds = projects.map((x) => x.projectId);
		if (options.filter?.projectId) {
			const mask = [options.filter?.projectId].flat();
			projectIds = projectIds.filter((x) => mask.includes(x));
		}

		if (projectIds.length === 0) {
			return { count: 0, data: [] };
		}

		return await this.projectFileRepository.getManyAndCount({
			...options,
			filter: {
				...options.filter,
				projectId: projectIds,
			},
		});
	}
}
