import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '@n8n/typeorm';

import { ExecutionStatus } from '../enums';
import type { WorkflowStepExecution } from './workflow-step-execution.entity';

@Entity({ name: 'workflow_execution' })
@Index('idx_we_workflow', ['workflowId', 'createdAt'])
@Index('idx_we_status', ['status'])
export class WorkflowExecution {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'uuid' })
	workflowId!: string;

	@Column({ type: 'int' })
	workflowVersion!: number;

	@Column({ type: 'text', default: ExecutionStatus.Running })
	status!: string;

	@Column({ type: 'text', default: 'production' })
	mode!: string;

	@Column({ type: 'jsonb', nullable: true })
	result!: unknown;

	@Column({ type: 'jsonb', nullable: true })
	error!: unknown;

	@Column({ type: 'boolean', default: false })
	cancelRequested!: boolean;

	@Column({ type: 'boolean', default: false })
	pauseRequested!: boolean;

	@Column({ type: 'timestamptz', nullable: true })
	resumeAfter!: Date | null;

	@Column({ type: 'timestamptz', default: () => 'now()' })
	startedAt!: Date;

	@Column({ type: 'timestamptz', nullable: true })
	completedAt!: Date | null;

	@Column({ type: 'int', nullable: true })
	durationMs!: number | null;

	@Column({ type: 'int', nullable: true })
	computeMs!: number | null;

	@Column({ type: 'int', nullable: true })
	waitMs!: number | null;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt!: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt!: Date;

	@OneToMany('WorkflowStepExecution', 'execution')
	steps!: WorkflowStepExecution[];
}
