import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Not, Repository } from '@n8n/typeorm';
import type { DeepPartial } from '@n8n/typeorm/common/DeepPartial';
import type { IDataObject } from 'n8n-workflow';

import { TestCaseExecution } from '../entities';
import type { TestCaseExecutionErrorCode } from '../entities/types-db';

type StatusUpdateOptions = {
	testRunId: string;
	pastExecutionId: string;
	trx?: EntityManager;
};

type MarkAsFailedOptions = StatusUpdateOptions & {
	errorCode?: TestCaseExecutionErrorCode;
	errorDetails?: IDataObject;
};

type MarkAsRunningOptions = StatusUpdateOptions & {
	executionId: string;
};

type MarkAsCompletedOptions = StatusUpdateOptions & {
	metrics: Record<string, number>;
};

@Service()
export class TestCaseExecutionRepository extends Repository<TestCaseExecution> {
	constructor(dataSource: DataSource) {
		super(TestCaseExecution, dataSource.manager);
	}

	async createTestCaseExecution(testCaseExecutionProps: DeepPartial<TestCaseExecution>) {
		const testCaseExecution = this.create(testCaseExecutionProps);

		return await this.save(testCaseExecution);
	}

	async createBatch(testRunId: string, testCases: string[]) {
		const mappings = this.create(
			testCases.map<DeepPartial<TestCaseExecution>>(() => ({
				testRun: {
					id: testRunId,
				},
				status: 'new',
			})),
		);

		return await this.save(mappings);
	}

	async markAsRunning({ testRunId, pastExecutionId, executionId, trx }: MarkAsRunningOptions) {
		trx = trx ?? this.manager;

		return await trx.update(
			TestCaseExecution,
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'running',
				executionId,
				runAt: new Date(),
			},
		);
	}

	async markAsCompleted({ testRunId, pastExecutionId, metrics, trx }: MarkAsCompletedOptions) {
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

	async markAsFailed({
		testRunId,
		pastExecutionId,
		errorCode,
		errorDetails,
		trx,
	}: MarkAsFailedOptions) {
		trx = trx ?? this.manager;

		return await trx.update(
			TestCaseExecution,
			{ testRun: { id: testRunId }, pastExecutionId },
			{
				status: 'error',
				completedAt: new Date(),
				errorCode,
				errorDetails,
			},
		);
	}
}
