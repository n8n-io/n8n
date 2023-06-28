import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntityWithVersion } from '../entities/WorkflowEntityWithVersion';

@Service()
export class WorkflowVersionsRepository extends Repository<WorkflowEntityWithVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntityWithVersion, dataSource.manager);
	}
}
