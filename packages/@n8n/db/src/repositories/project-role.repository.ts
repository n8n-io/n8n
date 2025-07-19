import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectRole } from '../entities/project-role';

@Service()
export class ProjectRoleRepository extends Repository<ProjectRole> {
	constructor(dataSource: DataSource) {
		super(ProjectRole, dataSource.manager);
	}
}
