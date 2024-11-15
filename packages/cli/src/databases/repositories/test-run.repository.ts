import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { TestRun } from '@/databases/entities/test-run.ee';

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}
}
