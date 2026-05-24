import { Column, Entity, Index, OneToMany, ManyToOne } from '@n8n/typeorm';
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
	 * ID of the instance that is running this test run.
	 * Used for coordinating cancellation across multiple main instances.
	 */
	@Column('varchar', { length: 255, nullable: true })
	runningInstanceId: string | null;

	/**
	 * Flag to request cancellation of the test run.
	 * Used as a fallback mechanism when the running instance cannot be reached via pub/sub.
	 */
	@Column('boolean', { default: false })
	cancelRequested: boolean;

	@Column('varchar', { length: 36, nullable: true })
	workflowVersionId: string | null;

	// FK column only — no `@ManyToOne` decorator. Service code queries via
	// `evaluationConfigId` and resolves the config through its own repository
	// when needed. Declaring the relation on `TestRun` would extend the
	// TypeORM entity-relation type graph enough to trip TS2589
	// ("type instantiation excessively deep") in unrelated repositories that
	// transitively reach `TestRun` through `WorkflowEntity.testRuns` — e.g.
	// `FolderRepository.upsert()` in `source-control-import.service.ee.ts`.
	// The FK constraint is preserved by the migration's raw SQL; the
	// decorator is purely TypeORM-side metadata.
	@Index()
	@Column('varchar', { length: 36, nullable: true })
	evaluationConfigId: string | null;

	@JsonColumn({ nullable: true })
	evaluationConfigSnapshot: IDataObject | null;

	// FK column only — see `evaluationConfigId` comment above for rationale.
	@Index()
	@Column('varchar', { length: 36, nullable: true })
	collectionId: string | null;

	/**
	 * Calculated property to determine the final result of the test run
	 * depending on the statuses of test case executions
	 */
	finalResult?: TestRunFinalResult | null;
}
