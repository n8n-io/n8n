import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import type { StepSlots, StepStatus } from '../../execution/execution.types';
import type { StepError } from '../../execution/step-store';
import { generateId } from '../generate-id';

@Entity('workflow_step_execution')
@Index('uniq_workflow_step_execution_execution_id_node_id', ['executionId', 'nodeId'], {
	unique: true,
})
export class WorkflowStepExecution {
	@PrimaryColumn('uuid')
	id!: string;

	@Column('uuid', { name: 'execution_id' })
	executionId!: string;

	@Column('varchar', { name: 'node_id' })
	nodeId!: string;

	@Column('varchar', { length: 32 })
	status!: StepStatus;

	@Column('jsonb', { nullable: true })
	outputs!: StepSlots | null;

	@Column('jsonb', { nullable: true })
	error!: StepError | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@BeforeInsert()
	setId(): void {
		if (!this.id) this.id = generateId();
	}
}
