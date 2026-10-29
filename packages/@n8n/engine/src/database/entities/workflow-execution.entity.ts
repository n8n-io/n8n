import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import type {
	CallerContext,
	ExecutionMode,
	ExecutionStatus,
	TriggerOutputs,
	WorkflowDocument,
} from '../../execution/execution.types';
import type { StoredWorkflowGraph } from '../../graph';
import type { ResponseExpectation } from '../../response-channel';

@Entity('workflow_execution')
@Index('idx_workflow_execution_workflow_id', ['workflowId'])
@Index('idx_workflow_execution_status', ['status'])
@Index('idx_workflow_execution_parent_execution_id', ['parentExecutionId'], {
	where: 'parent_execution_id IS NOT NULL',
})
export class WorkflowExecution {
	@PrimaryColumn('uuid')
	id!: string;

	@Column('varchar', { name: 'workflow_id' })
	workflowId!: string;

	@Column('varchar', { length: 32 })
	status!: ExecutionStatus;

	@Column('varchar', { length: 32 })
	mode!: ExecutionMode;

	@Column('jsonb')
	graph!: StoredWorkflowGraph;

	/** The workflow captured at start. Stored and reported, never read by the engine. */
	@Column('jsonb')
	workflow!: WorkflowDocument;

	@Column('jsonb', { name: 'trigger_outputs', nullable: true })
	triggerOutputs!: TriggerOutputs | null;

	/** Caller-supplied, opaque to the engine. See `CallerContext`. */
	@Column('jsonb', { name: 'caller_context' })
	callerContext!: CallerContext;

	/** What kind of a response (if any) the caller expects */
	@Column('jsonb', { name: 'response_expectation' })
	responseExpectation!: ResponseExpectation;

	/**
	 * The parent link, as three columns so the parent execution can be indexed.
	 * All three are set, or none: see `chk_workflow_execution_parent`.
	 */
	@Column('uuid', { name: 'parent_execution_id', nullable: true })
	parentExecutionId!: string | null;

	@Column('uuid', { name: 'parent_step_id', nullable: true })
	parentStepId!: string | null;

	@Column('boolean', { name: 'parent_awaited', nullable: true })
	parentAwaited!: boolean | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@Column({ name: 'finished_at', type: 'timestamptz', nullable: true, precision: 3 })
	finishedAt!: Date | null;
}
