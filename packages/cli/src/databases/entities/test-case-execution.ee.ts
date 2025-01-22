import { Column, Entity, ManyToOne, OneToOne } from '@n8n/typeorm';

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
	status: 'new' | 'running' | 'evaluation_running' | 'success' | 'error' | 'cancelled';

	@Column({ type: datetimeColumnType, nullable: true })
	runAt: Date | null;

	@Column({ type: datetimeColumnType, nullable: true })
	completedAt: Date | null;

	@Column('varchar', { nullable: true })
	errorCode: string | null;

	@Column(jsonColumnType, { nullable: true })
	errorDetails: Record<string, unknown>;

	@Column(jsonColumnType, { nullable: true })
	metrics: TestCaseRunMetrics;
}
