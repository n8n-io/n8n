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

	/**
	 * Seeds N pending test case rows for a run, indexed sequentially. Used at
	 * the start of `runTest` so the FE can render a placeholder card per case
	 * before any actual evaluation has happened.
	 */
	async createPendingBatch(testRunId: string, count: number): Promise<TestCaseExecution[]> {
		const rows = Array.from({ length: count }, (_, runIndex) =>
			this.create({
				testRun: { id: testRunId },
				status: 'new',
				runIndex,
			}),
		);
		return await this.save(rows);
	}

	/**
	 * Atomic check-and-set: flip a single row from `new` → `running`. Returns
	 * true when the transition succeeded; false when the row was already
	 * cancelled (or otherwise no longer `new`), in which case the runner
	 * should skip it.
	 */
	async tryMarkCaseAsRunning(id: string): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'new' },
			{ status: 'running', runAt: new Date() },
		);
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Atomic pre-emptive cancel: flip a single row from `new` → `cancelled`.
	 * Scoped by `testRunId` so a caller can't cancel a case belonging to a
	 * different run (defense-in-depth even though the controller already
	 * verifies workflow access). Returns false when the row is no longer
	 * `new` (or doesn't belong to the run) — caller should surface a conflict.
	 */
	async cancelIfNew(testRunId: string, id: string): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'new', testRun: { id: testRunId } },
			{ status: 'cancelled', completedAt: new Date() },
		);
		return (result.affected ?? 0) > 0;
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
