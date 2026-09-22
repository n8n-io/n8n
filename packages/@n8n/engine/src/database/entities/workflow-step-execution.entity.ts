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
	ResumeCause,
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

	/**
	 * What the step waits for, as its executor declared it. The engine reads the
	 * deadline and the outputs to emit at it. Why the node waits is the node's
	 * business.
	 */
	@Column('jsonb', { name: 'wait_declaration', nullable: true })
	waitDeclaration!: WaitDeclaration | null;

	/**
	 * Lifted out of `wait_declaration` so the sweep can index it; `suspendStep`
	 * writes both.
	 */
	@Column({ name: 'wait_till', type: 'timestamptz', precision: 3, nullable: true })
	waitTill!: Date | null;

	/**
	 * What ended the wait: a deadline, or a request. It holds no output. The
	 * engine reads which of the two it was: a deadline resume emits
	 * `wait_declaration.outputsAtDeadline`, and a request's payload goes unread
	 * to the node's resume path. What that path returns lands in `outputs`, as
	 * it does for every step.
	 */
	@Column('jsonb', { name: 'resume_cause', nullable: true })
	resumeCause!: ResumeCause | null;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@BeforeInsert()
	setId(): void {
		if (!this.id) this.id = generateId();
	}
}
