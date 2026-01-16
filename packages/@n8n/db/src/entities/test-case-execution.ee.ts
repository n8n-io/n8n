import { Column, Entity, ManyToOne, OneToOne } from '@n8n/typeorm';
import type { IDataObject, JsonObject } from 'n8n-workflow';

import { WithStringId, DateTimeColumn, JsonColumn } from './abstract-entity';
import type { ExecutionEntity } from './execution-entity';
import { TestRun } from './test-run.ee';
import type { TestCaseExecutionErrorCode } from './types-db';

export type TestCaseRunMetrics = Record<string, number | boolean>;

export type TestCaseExecutionStatus =
	| 'new' // Test case execution was created and added to the test run, but has not been started yet
	| 'running' // Workflow under test is running
	| 'evaluation_running' // Evaluation workflow is running
	| 'success' // Both workflows have completed successfully
	| 'error' // An error occurred during the execution of workflow under test or evaluation workflow
	| 'warning' // There were warnings during the execution of workflow under test or evaluation workflow. Used only to signal possible issues to user, not to indicate a failure.
	| 'cancelled';

/**
 * This entity represents the linking between the test runs and individual executions.
 * It stores status, link to the evaluation execution, and metrics produced by individual test case
 * Entries in this table are meant to outlive the execution entities, which might be pruned over time.
 * This allows us to keep track of the details of test runs' status and metrics even after the executions are deleted.
 */
@Entity({ name: 'test_case_execution' })
export class TestCaseExecution extends WithStringId {
	@ManyToOne('TestRun')
	testRun: TestRun;

	@OneToOne('ExecutionEntity', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	execution: ExecutionEntity | null;

	@Column({ type: 'varchar', nullable: true })
	executionId: string | null;

	@Column()
	status: TestCaseExecutionStatus;

	@DateTimeColumn({ nullable: true })
	runAt: Date | null;

	@DateTimeColumn({ nullable: true })
	completedAt: Date | null;

	@Column('varchar', { nullable: true })
	errorCode: TestCaseExecutionErrorCode | null;

	@JsonColumn({ nullable: true })
	errorDetails: IDataObject | null;

	@JsonColumn({ nullable: true })
	metrics: TestCaseRunMetrics;

	@JsonColumn({ nullable: true })
	inputs: JsonObject | null;

	@JsonColumn({ nullable: true })
	outputs: JsonObject | null;
}
