import type { AggregatedTestRunMetrics, TestRunErrorCode, TestRunFinalResult } from '@n8n/db';
import { TestRun } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager, FindManyOptions } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { getTestRunFinalResult } from '@/evaluation.ee/test-runner/utils.ee';
import type { ListQuery } from '@/requests';

export type TestRunSummary = TestRun & {
	finalResult: TestRunFinalResult | null;
};

@Service()
export class TestRunRepository extends Repository<TestRun> {
	constructor(dataSource: DataSource) {
		super(TestRun, dataSource.manager);
	}

	async createTestRun(testDefinitionId: string) {
		const testRun = this.create({
			status: 'new',
			testDefinition: { id: testDefinitionId },
		});

		return await this.save(testRun);
	}

	async markAsRunning(id: string, totalCases: number) {
		return await this.update(id, {
			status: 'running',
			runAt: new Date(),
			totalCases,
			passedCases: 0,
			failedCases: 0,
		});
	}

	async markAsCompleted(id: string, metrics: AggregatedTestRunMetrics) {
		return await this.update(id, { status: 'completed', completedAt: new Date(), metrics });
	}

	async markAsCancelled(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.update(TestRun, id, { status: 'cancelled' });
	}

	async markAsError(id: string, errorCode: TestRunErrorCode, errorDetails?: IDataObject) {
		return await this.update(id, {
			status: 'error',
			errorCode,
			errorDetails,
		});
	}

	async markAllIncompleteAsFailed() {
		return await this.update(
			{ status: In(['new', 'running']) },
			{ status: 'error', errorCode: 'INTERRUPTED' },
		);
	}

	async incrementPassed(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.increment(TestRun, { id }, 'passedCases', 1);
	}

	async incrementFailed(id: string, trx?: EntityManager) {
		trx = trx ?? this.manager;
		return await trx.increment(TestRun, { id }, 'failedCases', 1);
	}

	async getMany(testDefinitionId: string, options: ListQuery.Options) {
		// FIXME: optimize fetching final result of each test run
		const findManyOptions: FindManyOptions<TestRun> = {
			where: { testDefinition: { id: testDefinitionId } },
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
	async getTestRunSummaryById(
		testDefinitionId: string,
		testRunId: string,
	): Promise<TestRunSummary> {
		const testRun = await this.findOne({
			where: { id: testRunId, testDefinition: { id: testDefinitionId } },
			relations: ['testCaseExecutions'],
		});

		if (!testRun) {
			throw new NotFoundError('Test run not found');
		}

		testRun.finalResult =
			testRun.status === 'completed' ? getTestRunFinalResult(testRun.testCaseExecutions) : null;

		return testRun as TestRunSummary;
	}
}
