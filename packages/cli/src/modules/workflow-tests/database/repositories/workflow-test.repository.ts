import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowTest } from '../entities/workflow-test.entity';

@Service()
export class WorkflowTestRepository extends Repository<WorkflowTest> {
	constructor(dataSource: DataSource) {
		super(WorkflowTest, dataSource.manager);
	}
}
