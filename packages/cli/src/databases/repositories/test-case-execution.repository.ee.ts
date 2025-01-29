import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import type { DeepPartial } from '@n8n/typeorm/common/DeepPartial';

import { TestCaseExecution } from '@/databases/entities/test-case-execution.ee';

@Service()
export class TestCaseExecutionRepository extends Repository<TestCaseExecution> {
	constructor(dataSource: DataSource) {
		super(TestCaseExecution, dataSource.manager);
	}

	async createBatch(testRunId: string, pastExecutionIds: string[]) {
		const mappings = this.create(
			pastExecutionIds.map<DeepPartial<TestCaseExecution>>((id) => ({
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

	async markAsCompleted(
		testRunId: string,
		pastExecutionId: string,
		metrics: Record<string, number>,
		trx?: EntityManager,
	) {
		trx = trx ?? this.manager;

		return await trx.update(
			TestCaseExecution,
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'success',
				completedAt: new Date(),
				metrics,
			},
		);
	}

	async markAllPendingAsCancelled(testRunId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.update(
			TestCaseExecution,
			{ testRun: { id: testRunId }, status: Not(In(['success', 'error', 'cancelled'])) },
			{
				status: 'cancelled',
				completedAt: new Date(),
			},
		);
	}

	async markAsFailed(testRunId: string, pastExecutionId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.update(
			TestCaseExecution,
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'error',
				completedAt: new Date(),
			},
		);
	}
}
