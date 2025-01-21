import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { TestRunExecutionMapping } from '@/databases/entities/test-run-executions.ee';

@Service()
export class TestRunExecutionsMappingRepository extends Repository<TestRunExecutionMapping> {
	constructor(dataSource: DataSource) {
		super(TestRunExecutionMapping, dataSource.manager);
	}
}
