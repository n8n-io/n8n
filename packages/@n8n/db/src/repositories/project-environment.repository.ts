import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectEnvironment } from '../entities/project-environment';

@Service()
export class ProjectEnvironmentRepository extends Repository<ProjectEnvironment> {
	constructor(dataSource: DataSource) {
		super(ProjectEnvironment, dataSource.manager);
	}

	async findAllByProject(projectId: string): Promise<ProjectEnvironment[]> {
		return await this.find({ where: { projectId }, order: { createdAt: 'ASC' } });
	}
}
