import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import type {
	ExecutionMode,
	ExecutionStatus,
	TriggerOutputs,
	WorkflowDocument,
} from '../../execution/execution.types';
import type { WorkflowGraph } from '../../graph';

@Entity('workflow_execution')
@Index('idx_workflow_execution_workflow_id', ['workflowId'])
@Index('idx_workflow_execution_status', ['status'])
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
	graph!: WorkflowGraph;

	/** The workflow captured at start. Stored and reported, never read by the engine. */
	@Column('jsonb')
	workflow!: WorkflowDocument;

	@Column('jsonb', { name: 'trigger_outputs', nullable: true })
	triggerOutputs!: TriggerOutputs | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@Column({ name: 'finished_at', type: 'timestamptz', nullable: true, precision: 3 })
	finishedAt!: Date | null;
}
