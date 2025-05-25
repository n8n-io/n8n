import { Column, Entity, OneToMany, ManyToOne } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { DateTimeColumn, JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import type { TestCaseExecution } from './test-case-execution.ee';
import { AggregatedTestRunMetrics } from './types-db';
import type { TestRunErrorCode, TestRunFinalResult } from './types-db';
import { WorkflowEntity } from './workflow-entity';

export type TestRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

/**
 * Entity representing a Test Run.
 * It stores info about a specific run of a test, including the status and collected metrics
 */
@Entity()
export class TestRun extends WithTimestampsAndStringId {
	@Column('varchar')
	status: TestRunStatus;

	@DateTimeColumn({ nullable: true })
	runAt: Date | null;

	@DateTimeColumn({ nullable: true })
	completedAt: Date | null;

	@JsonColumn({ nullable: true })
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
	@JsonColumn({ nullable: true })
	errorDetails: IDataObject | null;

	@OneToMany('TestCaseExecution', 'testRun')
	testCaseExecutions: TestCaseExecution[];

	@ManyToOne('WorkflowEntity')
	workflow: WorkflowEntity;

	@Column('varchar', { length: 255 })
	workflowId: string;

	/**
	 * Calculated property to determine the final result of the test run
	 * depending on the statuses of test case executions
	 */
	finalResult?: TestRunFinalResult | null;
}
