import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { WorkflowEntityWithVersion } from '../entities/WorkflowEntityWithVersion';

@Service()
export class WorkflowWithVersionRepository extends Repository<WorkflowEntityWithVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntityWithVersion, dataSource.manager);
	}
}
