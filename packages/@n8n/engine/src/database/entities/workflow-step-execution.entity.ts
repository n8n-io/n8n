import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import type { StepKind } from '../../execution/step-store';
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
	{ unique: true, where: "kind = 'graph'" },
)
@Index(
	'uniq_workflow_step_execution_declaring_step_id_round_call_id',
	['declaringStepId', 'round', 'callId'],
	{ unique: true, where: "kind = 'spawned'" },
)
@Index('idx_workflow_step_execution_failed', ['executionId'], {
	where: "status = 'failed' AND kind = 'graph'",
})
@Index('idx_workflow_step_execution_wait_till', ['waitTill'], { where: "status = 'waiting'" })
@Index('idx_workflow_step_execution_unsettled', ['executionId', 'status'], {
	where: "status IN ('queued', 'running', 'waiting')",
})
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

	/** A graph step follows from the graph. A spawned step runs one action of a declaring step. */
	@Column('varchar', { length: 16, default: 'graph' })
	kind!: StepKind;

	@Column('uuid', { name: 'declaring_step_id', nullable: true })
	declaringStepId!: string | null;

	@Column('int', { nullable: true })
	round!: number | null;

	@Column('varchar', { name: 'call_id', nullable: true })
	callId!: string | null;

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
	 * What ended the wait: a deadline, or a request. A deadline carries nothing,
	 * because `wait_declaration.outputsAtDeadline` already holds what the step
	 * emits. A request carries the outputs the node's resume path produced where
	 * the request arrived. Either way the engine emits them and runs no node code.
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
