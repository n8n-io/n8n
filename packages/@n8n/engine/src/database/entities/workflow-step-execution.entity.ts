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

import type { StepStatus } from '../../execution/execution.types';

@Entity('workflow_step_execution')
@Index('idx_workflow_step_execution_execution_id', ['executionId'])
export class WorkflowStepExecution {
	@PrimaryColumn('varchar')
	id!: string;

	@Column('varchar', { name: 'execution_id' })
	executionId!: string;

	@Column('varchar', { name: 'node_id' })
	nodeId!: string;

	@Column('varchar', { length: 32 })
	status!: StepStatus;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@BeforeInsert()
	generateId(): void {
		if (!this.id) this.id = nanoid();
	}
}
