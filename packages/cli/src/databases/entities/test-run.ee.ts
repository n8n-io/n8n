import { Column, Entity, OneToMany } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import {
	datetimeColumnType,
	jsonColumnType,
	WithTimestampsAndStringId,
} from '@/databases/entities/abstract-entity';
import type { TestCaseExecution } from '@/databases/entities/test-case-execution.ee';
import type { TestRunFinalResult } from '@/databases/repositories/test-run.repository.ee';
import type { TestRunErrorCode } from '@/evaluation.ee/test-runner/errors.ee';

export type TestRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

export type AggregatedTestRunMetrics = Record<string, number | boolean>;

/**
 * Entity representing a Test Run.
 * It stores info about a specific run of a test, including the status and collected metrics
 */
@Entity()
export class TestRun extends WithTimestampsAndStringId {
	@Column('varchar')
	status: TestRunStatus;

	@Column({ type: datetimeColumnType, nullable: true })
	runAt: Date | null;

	@Column({ type: datetimeColumnType, nullable: true })
	completedAt: Date | null;

	@Column(jsonColumnType, { nullable: true })
	metrics: AggregatedTestRunMetrics;

	/**
	 * This will contain the error code if the test run failed.
	 * This is used for test run level errors, not for individual test case errors.
	 */
	@Column('varchar', { nullable: true, length: 255 })
	errorCode: TestRunErrorCode | null;

	/**
	 * Optional details about the error that happened during the test run
	 */
	@Column(jsonColumnType, { nullable: true })
	errorDetails: IDataObject | null;

	@OneToMany('TestCaseExecution', 'testRun')
	testCaseExecutions: TestCaseExecution[];

	/**
	 * Calculated property to determine the final result of the test run
	 * depending on the statuses of test case executions
	 */
	finalResult?: TestRunFinalResult | null;
}
