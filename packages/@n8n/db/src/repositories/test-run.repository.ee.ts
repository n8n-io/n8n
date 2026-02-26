import { Service } from '@n8n/di';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { UnexpectedError, type IDataObject } from 'n8n-workflow';

import { TestRun } from '../entities';
import type {
	AggregatedTestRunMetrics,
	TestRunErrorCode,
	TestRunFinalResult,
	ListQuery,
} from '../entities/types-db';
import { getTestRunFinalResult } from '../utils/get-final-test-result';

export type TestRunSummary = TestRun & {
	finalResult: TestRunFinalResult | null;
};

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	async createTestRun(workflowId: string): Promise<TestRun> {
		const testRun = this.create({
			status: 'new',
			workflow: {
				id: workflowId,
			},
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
			{ status: 'error', errorCode: 'INTERRUPTED', completedAt: new Date() },
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

	async getMany(workflowId: string, options: ListQuery.Options) {
		// FIXME: optimize fetching final result of each test run
		const findManyOptions: FindManyOptions<TestRun> = {
			where: { workflow: { id: workflowId } },
			order: { createdAt: 'DESC' },
			relations: ['testCaseExecutions'],
		};

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const testRuns = await this.find(findManyOptions);

		return testRuns.map(({ testCaseExecutions, ...testRun }) => {
			const finalResult =
				testRun.status === 'completed' ? getTestRunFinalResult(testCaseExecutions) : null;
			return { ...testRun, finalResult };
		});
	}

	/**
	 * Test run summary is a TestRun with a final result.
	 * Final result is calculated based on the status of all test case executions.
	 * E.g. Test Run is considered successful if all test case executions are successful.
	 * Test Run is considered failed if at least one test case execution is failed.
	 */
	async getTestRunSummaryById(testRunId: string): Promise<TestRunSummary> {
		const testRun = await this.findOne({
			where: { id: testRunId },
			relations: ['testCaseExecutions'],
		});

		if (!testRun) {
			throw new UnexpectedError('Test run not found');
		}

		testRun.finalResult =
			testRun.status === 'completed' ? getTestRunFinalResult(testRun.testCaseExecutions) : null;

		return testRun as TestRunSummary;
	}
}
