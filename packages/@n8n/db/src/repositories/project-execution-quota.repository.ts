import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectExecutionQuota } from '../entities/project-execution-quota';

@Service()
export class ProjectExecutionQuotaRepository extends Repository<ProjectExecutionQuota> {
	constructor(dataSource: DataSource) {
		super(ProjectExecutionQuota, dataSource.manager);
	}
}
