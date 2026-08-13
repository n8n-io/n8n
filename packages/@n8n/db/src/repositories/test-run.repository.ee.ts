import { Service } from '@n8n/di';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { UnexpectedError, type IDataObject } from 'n8n-workflow';

import { TestRun } from '../entities';
import type { TestRunStatus } from '../entities/test-run.ee';
import { TestRunErrorCode } from '../entities/types-db';
import type { AggregatedTestRunMetrics, TestRunFinalResult, ListQuery } from '../entities/types-db';
import { getTestRunFinalResult } from '../utils/get-final-test-result';

export type TestRunSummary = TestRun & {
	finalResult: TestRunFinalResult | null;
};

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	async createTestRun(
		workflowId: string,
		attrs?: {
			collectionId?: string | null;
			workflowVersionId?: string | null;
			evaluationConfigId?: string | null;
			evaluationConfigSnapshot?: IDataObject | null;
		},
	): Promise<TestRun> {
		const testRun = this.create({
			status: 'new',
			workflow: {
				id: workflowId,
			},
			collectionId: attrs?.collectionId ?? null,
			workflowVersionId: attrs?.workflowVersionId ?? null,
			evaluationConfigId: attrs?.evaluationConfigId ?? null,
			evaluationConfigSnapshot: attrs?.evaluationConfigSnapshot ?? null,
		});

		return await this.save(testRun);
	}

	async markAsRunning(id: string, instanceId?: string) {
		return await this.update(id, {
			status: 'running',
			runAt: new Date(),
			runningInstanceId: instanceId ?? null,
		});
	}

	async markAsCompleted(id: string, metrics: AggregatedTestRunMetrics) {
		return await this.update(id, { status: 'completed', completedAt: new Date(), metrics });
	}

	async markAsCancelled(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.update(TestRun, id, { status: 'cancelled', completedAt: new Date() });
	}

	async markAsError(id: string, errorCode: TestRunErrorCode, errorDetails?: IDataObject) {
		return await this.update(id, {
			status: 'error',
			errorCode,
			errorDetails,
			completedAt: new Date(),
		});
	}

	async markAllIncompleteAsFailed() {
		return await this.update(
			{ status: In(['new', 'running']) },
			{ status: 'error', errorCode: TestRunErrorCode.INTERRUPTED, completedAt: new Date() },
		);
	}

	/**
	 * Request cancellation of a test run by setting the cancelRequested flag.
	 * This is used as a fallback mechanism for multi-main mode.
	 */
	async requestCancellation(id: string) {
		return await this.update(id, { cancelRequested: true });
	}

	/**
	 * Check if cancellation has been requested for a test run.
	 */
	async isCancellationRequested(id: string): Promise<boolean> {
		const testRun = await this.findOneBy({ id });
		return testRun?.cancelRequested ?? false;
	}

	/**
	 * Clear the instance tracking when test run completes.
	 */
	async clearInstanceTracking(id: string) {
		return await this.update(id, { runningInstanceId: null, cancelRequested: false });
	}

	async getMany(workflowId: string, options: ListQuery.Options, status?: TestRunStatus) {
		const findManyOptions: FindManyOptions<TestRun> = {
			where: { workflow: { id: workflowId }, ...(status ? { status } : {}) },
			// `id` tiebreaker keeps offset pagination stable when runs share a `createdAt` (ms precision).
			order: { createdAt: 'DESC', id: 'DESC' },
			// Only `status` is needed per case — `finalResult` is derived from case
			// statuses and `testCaseCount` from the row count — so avoid loading the
			// heavy JSON columns (inputs/outputs/metrics/errorDetails) of every case.
			relations: { testCaseExecutions: true },
			select: { testCaseExecutions: { id: true, status: true } },
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const testRuns = await this.find(findManyOptions);

		return testRuns.map(({ testCaseExecutions, ...testRun }) => {
			const finalResult =
				testRun.status === 'completed' ? getTestRunFinalResult(testCaseExecutions) : null;
			// `testCaseExecutions` is already loaded above, so the count is free —
			// no extra query. Consumed by the public API's `TestRunSummaryDto`.
			return { ...testRun, finalResult, testCaseCount: testCaseExecutions.length };
		});
	}

	/**
	 * Count test runs for a workflow, optionally filtered by status. Used by the
	 * public API to compute the pagination cursor without loading rows.
	 */
	async countByWorkflowId(workflowId: string, status?: TestRunStatus) {
		return await this.countBy({
			workflow: { id: workflowId },
			...(status ? { status } : {}),
		});
	}

	/**
	 * Whether a test run exists and belongs to the given workflow. Scoped and
	 * relation-free, so callers can authorize access to a run without loading
	 * its (potentially large) set of test case executions.
	 */
	async existsInWorkflow(testRunId: string, workflowId: string): Promise<boolean> {
		return await this.existsBy({ id: testRunId, workflow: { id: workflowId } });
	}

	/**
	 * Test run summary is a TestRun with a final result.
	 * Final result is calculated based on the status of all test case executions.
	 * E.g. Test Run is considered successful if all test case executions are successful.
	 * Test Run is considered failed if at least one test case execution is failed.
	 */
	async getTestRunSummaryById(testRunId: string): Promise<TestRunSummary> {
		const summary = await this.findTestRunSummary({ id: testRunId });

		if (!summary) {
			throw new UnexpectedError('Test run not found');
		}

		return summary;
	}

	/**
	 * Scoped variant of {@link getTestRunSummaryById}: returns the summary only
	 * when the run belongs to `workflowId`, else `null`. A single query (no
	 * separate existence check) that also prevents cross-workflow access.
	 */
	async getTestRunSummaryByWorkflowId(
		testRunId: string,
		workflowId: string,
	): Promise<TestRunSummary | null> {
		return await this.findTestRunSummary(
			{ id: testRunId, workflow: { id: workflowId } },
			{ minimalCases: true },
		);
	}

	private async findTestRunSummary(
		where: FindManyOptions<TestRun>['where'],
		{ minimalCases = false }: { minimalCases?: boolean } = {},
	): Promise<TestRunSummary | null> {
		const testRun = await this.findOne({
			where,
			relations: { testCaseExecutions: true },
			// `minimalCases` loads only what `finalResult`/`testCaseCount` need;
			// `getTestRunSummaryById` serializes the full relation, so keeps all columns.
			...(minimalCases ? { select: { testCaseExecutions: { id: true, status: true } } } : {}),
		});

		if (!testRun) return null;

		testRun.finalResult =
			testRun.status === 'completed' ? getTestRunFinalResult(testRun.testCaseExecutions) : null;

		return testRun as TestRunSummary;
	}
}
