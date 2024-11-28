import { DataSource, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import type { AggregatedTestRunMetrics } from '@/databases/entities/test-run.ee';
import { TestRun } from '@/databases/entities/test-run.ee';

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	public async createTestRun(testDefinitionId: string) {
		const testRun = this.create({
			status: 'new',
			testDefinition: { id: testDefinitionId },
		});

		return await this.save(testRun);
	}

	public async markAsRunning(id: string) {
		return await this.update(id, { status: 'running', runAt: new Date() });
	}

	public async markAsCompleted(id: string, metrics: AggregatedTestRunMetrics) {
		return await this.update(id, { status: 'completed', completedAt: new Date(), metrics });
	}
}
