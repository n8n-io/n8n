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
	StepOutputSources,
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
@Index('idx_workflow_step_execution_unsettled', ['executionId', 'status'], {
	where: "status IN ('queued', 'running', 'waiting')",
})
@Index('idx_workflow_step_execution_stale_after', ['status', 'staleAfter'], {
	where: 'stale_after IS NOT NULL',
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

	@Column('jsonb', { nullable: true })
	outputs!: StepSlots | null;

	/** Where the outputs' items came from. Only a loop node writes it; see `StepOutputSources`. */
	@Column('jsonb', { name: 'output_sources', nullable: true })
	outputSources!: StepOutputSources | null;

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

	/**
	 * When the engine treats the step as stuck. The store writes it at each
	 * transition into `queued` or `running`. The store also writes it at each
	 * transition into `completed`, `failed` or `skipped`, and clears it after the
	 * orchestration worker handled the `step:settled` message of the step. It is
	 * NULL in every other case.
	 */
	@Column({ name: 'stale_after', type: 'timestamptz', precision: 3, nullable: true })
	staleAfter!: Date | null;

	/**
	 * How many times the engine queued the step to run it from the start. It is
	 * 1 at creation. The reconciliation sweeper adds 1 when it queues a step
	 * again after the worker of the step stopped. A resume after a wait does not
	 * change it.
	 */
	@Column('int', { default: 1 })
	attempt!: number;

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
	createdAt!: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
	updatedAt!: Date;

	@BeforeInsert()
	setId(): void {
		if (!this.id) this.id = generateId();
	}
}
