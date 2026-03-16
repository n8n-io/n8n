import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowExecution } from '../entities';

export class WorkflowExecutionRepository extends Repository<WorkflowExecution> {
	constructor(dataSource: DataSource) {
		super(WorkflowExecution, dataSource.manager);
	}
}
