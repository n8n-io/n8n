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
import type { LifecycleEventSubscription } from '../../lifecycle-events';
import type { ResponseExpectation } from '../../response-channel';

@Entity('workflow_execution')
@Index('idx_workflow_execution_workflow_id_created_at_id', ['workflowId', 'createdAt', 'id'])
@Index('idx_workflow_execution_created_at_id', ['createdAt', 'id'])
@Index('idx_workflow_execution_status', ['status'])
@Index('idx_workflow_execution_parent_execution_id', ['parentExecutionId'], {
	where: 'parent_execution_id IS NOT NULL',
})
@Index('idx_workflow_execution_stale_after', ['staleAfter'], { where: "status = 'queued'" })
@Index('idx_workflow_execution_finished_at_id', ['finishedAt', 'id'], {
	where: 'finished_at IS NOT NULL',
})
@Index('idx_workflow_execution_error_source_execution_id', ['errorSourceExecutionId'], {
	unique: true,
	where: 'error_source_execution_id IS NOT NULL',
})
@Index('idx_workflow_execution_error_workflow_due_at', ['errorWorkflowDueAt'], {
	where: 'error_workflow_due_at IS NOT NULL',
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

	/**
	 * The error source link, as two columns so the source execution can be
	 * indexed. Both are set, or none: see `chk_workflow_execution_error_source`.
	 */
	@Column('uuid', { name: 'error_source_execution_id', nullable: true })
	errorSourceExecutionId!: string | null;

	@Column('varchar', { name: 'error_source_workflow_id', nullable: true })
	errorSourceWorkflowId!: string | null;

	/** Whether a failure resolves an error workflow. The host decides at start. */
	@Column('boolean', { name: 'resolve_error_workflow_on_failure', default: false })
	resolveErrorWorkflowOnFailure!: boolean;

	/**
	 * Set by the write that ends the execution when an error workflow is
	 * expected, and cleared when the error execution starts or is skipped. The
	 * repair acts on a row whose time has passed.
	 */
	@Column({ name: 'error_workflow_due_at', type: 'timestamptz', precision: 3, nullable: true })
	errorWorkflowDueAt!: Date | null;

	/** Which lifecycle events (if any) the caller subscribes to. `null` means none. */
	@Column('jsonb', { name: 'lifecycle_event_subscription', nullable: true })
	lifecycleEventSubscription!: LifecycleEventSubscription | null;

	/**
	 * When the engine treats the execution as stuck in `queued`. The store
	 * writes it when the row becomes `queued`, and clears it when the row leaves
	 * that status.
	 */
	@Column({ name: 'stale_after', type: 'timestamptz', precision: 3, nullable: true })
	staleAfter!: Date | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@Column({ name: 'finished_at', type: 'timestamptz', nullable: true, precision: 3 })
	finishedAt!: Date | null;
}
