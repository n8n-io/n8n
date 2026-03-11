import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Unique,
	UpdateDateColumn,
} from '@n8n/typeorm';

import { StepStatus, StepType } from '../enums';
import { WorkflowExecution } from './workflow-execution.entity';

@Entity({ name: 'workflow_step_execution' })
@Unique(['executionId', 'stepId'])
@Index('idx_wse_execution', ['executionId'])
@Index('idx_wse_queue', ['status', 'retryAfter'])
@Index('idx_wse_waiting', ['status', 'waitUntil'])
@Index('idx_wse_step_lookup', ['executionId', 'stepId', 'status'])
@Index('idx_wse_stale', ['status', 'startedAt'])
@Index('idx_wse_exec_status', ['executionId', 'status'])
export class WorkflowStepExecution {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'uuid' })
	executionId!: string;

	@Column({ type: 'text' })
	stepId!: string;

	@Column({ type: 'text', default: StepType.Step })
	stepType!: string;

	@Column({ type: 'text', default: StepStatus.Pending })
	status!: string;

	@Column({ type: 'jsonb', nullable: true })
	input!: unknown;

	@Column({ type: 'jsonb', nullable: true })
	output!: unknown;

	@Column({ type: 'jsonb', nullable: true })
	error!: unknown;

	@Column({ type: 'int', default: 1 })
	attempt!: number;

	@Column({ type: 'timestamptz', nullable: true })
	retryAfter!: Date | null;

	@Column({ type: 'timestamptz', nullable: true })
	waitUntil!: Date | null;

	@Column({ type: 'text', nullable: true })
	approvalToken!: string | null;

	@Column({ type: 'uuid', nullable: true })
	parentStepExecutionId!: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	startedAt!: Date | null;

	@Column({ type: 'timestamptz', nullable: true })
	completedAt!: Date | null;

	@Column({ type: 'int', nullable: true })
	durationMs!: number | null;

	@Column({ type: 'jsonb', default: {} })
	metadata!: Record<string, unknown>;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt!: Date;

	@ManyToOne('WorkflowExecution', 'steps', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'executionId' })
	execution!: WorkflowExecution;

	@ManyToOne('WorkflowStepExecution', 'childSteps', { nullable: true })
	@JoinColumn({ name: 'parentStepExecutionId' })
	parentStep!: WorkflowStepExecution | null;

	@OneToMany('WorkflowStepExecution', 'parentStep')
	childSteps!: WorkflowStepExecution[];
}
