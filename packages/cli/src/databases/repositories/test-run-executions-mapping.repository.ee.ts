import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { DeepPartial } from '@n8n/typeorm/common/DeepPartial';

import { TestRunExecutionMapping } from '@/databases/entities/test-run-executions.ee';

@Service()
export class TestRunExecutionsMappingRepository extends Repository<TestRunExecutionMapping> {
	constructor(dataSource: DataSource) {
		super(TestRunExecutionMapping, dataSource.manager);
	}

	async createBatch(testRunId: string, pastExecutionIds: string[]) {
		const mappings = this.create(
			pastExecutionIds.map<DeepPartial<TestRunExecutionMapping>>((id) => ({
				testRun: {
					id: testRunId,
				},
				pastExecution: {
					id,
				},
				status: 'new',
			})),
		);

		return await this.save(mappings);
	}

	async markAsRunning(testRunId: string, pastExecutionId: string, executionId: string) {
		return await this.update(
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'running',
				executionId,
				runAt: new Date(),
			},
		);
	}

	async markAsEvaluationRunning(
		testRunId: string,
		pastExecutionId: string,
		evaluationExecutionId: string,
	) {
		return await this.update(
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'evaluation_running',
				evaluationExecutionId,
			},
		);
	}

	async markAsCompleted(testRunId: string, pastExecutionId: string) {
		return await this.update(
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'completed',
				completedAt: new Date(),
			},
		);
	}
}
