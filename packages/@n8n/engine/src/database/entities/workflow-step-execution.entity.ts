import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import type {
	StepError,
	StepResume,
	StepSlots,
	StepStatus,
	WaitDeclaration,
} from '../../execution/execution.types';
import { generateId } from '../generate-id';

@Entity('workflow_step_execution')
@Index(
	'uniq_workflow_step_execution_execution_id_node_id_iteration',
	['executionId', 'nodeId', 'iteration'],
	{ unique: true },
)
@Index('idx_workflow_step_execution_failed', ['executionId'], { where: "status = 'failed'" })
@Index('idx_workflow_step_execution_wait_till', ['waitTill'], { where: "status = 'waiting'" })
export class WorkflowStepExecution {
	@PrimaryColumn('uuid')
	id!: string;

	@Column('uuid', { name: 'execution_id' })
	executionId!: string;

	@Column('varchar', { name: 'node_id' })
	nodeId!: string;

	@Column('int', { default: 0 })
	iteration!: number;

	@Column('varchar', { length: 32 })
	status!: StepStatus;

	@Column('jsonb', { nullable: true })
	outputs!: StepSlots | null;

	@Column('jsonb', { nullable: true })
	error!: StepError | null;

	@Column('jsonb', { nullable: true })
	wait!: WaitDeclaration | null;

	/** Lifted out of `wait` so the sweep can index it; `suspendStep` writes both. */
	@Column({ name: 'wait_till', type: 'timestamptz', precision: 3, nullable: true })
	waitTill!: Date | null;

	@Column('jsonb', { nullable: true })
	resume!: StepResume | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@BeforeInsert()
	setId(): void {
		if (!this.id) this.id = generateId();
	}
}
