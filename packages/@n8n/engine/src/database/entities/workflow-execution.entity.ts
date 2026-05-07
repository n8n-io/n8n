import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';
import { nanoid } from 'nanoid';

import type { WorkflowGraph } from '../../graph';

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExecutionMode = 'production' | 'manual' | 'test';

@Entity('workflow_execution')
@Index('idx_workflow_execution_workflow_id', ['workflowId'])
@Index('idx_workflow_execution_status', ['status'])
export class WorkflowExecution {
	@PrimaryColumn('varchar')
	id!: string;

	@Column('varchar', { name: 'workflow_id' })
	workflowId!: string;

	@Column('varchar', { length: 32 })
	status!: ExecutionStatus;

	@Column('varchar', { length: 32 })
	mode!: ExecutionMode;

	@Column('jsonb')
	graph!: WorkflowGraph;

	@Column('jsonb', { name: 'trigger_payload', nullable: true })
	triggerPayload!: unknown;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@Column({ name: 'finished_at', type: 'timestamptz', nullable: true, precision: 3 })
	finishedAt!: Date | null;

	@BeforeInsert()
	generateId(): void {
		if (!this.id) this.id = nanoid();
	}
}
