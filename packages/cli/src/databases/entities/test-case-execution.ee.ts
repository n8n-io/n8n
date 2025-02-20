import { TestCaseExecutionStatus } from '@n8n/api-types';
import type { TestCaseExecutionErrorCode } from '@n8n/api-types';
import { Column, Entity, ManyToOne, OneToOne } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import {
	datetimeColumnType,
	jsonColumnType,
	WithStringId,
} from '@/databases/entities/abstract-entity';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import { TestRun } from '@/databases/entities/test-run.ee';

export type TestCaseRunMetrics = Record<string, number | boolean>;

/**
 * This entity represents the linking between the test runs and individual executions.
 * It stores status, links to past, new and evaluation executions, and metrics produced by individual evaluation wf executions
 * Entries in this table are meant to outlive the execution entities, which might be pruned over time.
 * This allows us to keep track of the details of test runs' status and metrics even after the executions are deleted.
 */
@Entity({ name: 'test_case_execution' })
export class TestCaseExecution extends WithStringId {
	@ManyToOne('TestRun')
	testRun: TestRun;

	@ManyToOne('ExecutionEntity', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	pastExecution: ExecutionEntity | null;

	@Column({ type: 'varchar', nullable: true })
	pastExecutionId: string | null;

	@OneToOne('ExecutionEntity', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	execution: ExecutionEntity | null;

	@Column({ type: 'varchar', nullable: true })
	executionId: string | null;

	@OneToOne('ExecutionEntity', {
		onDelete: 'SET NULL',
		nullable: true,
	})
	evaluationExecution: ExecutionEntity | null;

	@Column({ type: 'varchar', nullable: true })
	evaluationExecutionId: string | null;

	@Column()
	status: TestCaseExecutionStatus;

	@Column({ type: datetimeColumnType, nullable: true })
	runAt: Date | null;

	@Column({ type: datetimeColumnType, nullable: true })
	completedAt: Date | null;

	@Column('varchar', { nullable: true })
	errorCode: TestCaseExecutionErrorCode | null;

	@Column(jsonColumnType, { nullable: true })
	errorDetails: IDataObject | null;

	@Column(jsonColumnType, { nullable: true })
	metrics: TestCaseRunMetrics;
}
