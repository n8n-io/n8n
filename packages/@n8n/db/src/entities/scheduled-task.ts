import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from '@n8n/typeorm';
import type { Relation } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps } from './abstract-entity';
import type { ScheduledJob } from './scheduled-job';

export const ScheduledTaskStatus = {
	Pending: 'pending',
	Running: 'running',
	Succeeded: 'succeeded',
	Failed: 'failed',
	Cancelled: 'cancelled',
} as const;

export type ScheduledTaskStatus = (typeof ScheduledTaskStatus)[keyof typeof ScheduledTaskStatus];

@Entity({ name: 'scheduled_task' })
@Index(['jobId'])
@Index(['workflowId', 'nodeId'])
@Index(['status', 'runAt'])
@Index(['status', 'leaseExpiresAt'])
@Index(['jobId', 'scheduledFor'], { unique: true })
export class ScheduledTask extends WithTimestamps {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	jobId: number;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 64 })
	nodeId: string;

	@DateTimeColumn()
	scheduledFor: Date;

	@DateTimeColumn()
	runAt: Date;

	@Column({ type: 'varchar', length: 16 })
	status: ScheduledTaskStatus;

	@Column({ default: 0 })
	attempts: number;

	@Column({ default: 1 })
	maxAttempts: number;

	@Column({ type: 'varchar', length: 64, nullable: true })
	claimedBy: string | null;

	@DateTimeColumn({ nullable: true })
	leaseExpiresAt: Date | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	executionId: string | null;

	@DateTimeColumn({ nullable: true })
	startedAt: Date | null;

	@DateTimeColumn({ nullable: true })
	finishedAt: Date | null;

	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;

	@ManyToOne('ScheduledJob', 'tasks', { onDelete: 'CASCADE' })
	job: Relation<ScheduledJob>;
}
