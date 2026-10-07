import type { AgentTaskCancellationState, AgentTaskStopFailure } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, WithTimestamps } from '@n8n/db';
import {
	Check,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { AgentExecutionThread } from './agent-execution-thread.entity';
import type { AgentPlan } from './agent-plan.entity';

@Entity({ name: 'agent_task_cancellation' })
@Check("\"status\" IN ('stopping', 'failed', 'stopped')")
@Check("\"reportStatus\" IN ('pending', 'claimed', 'reported', 'failed')")
@Index(['threadId', 'createdAt'])
export class AgentTaskCancellation extends WithTimestamps {
	@PrimaryColumn({ type: 'uuid' })
	id: string;

	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@ManyToOne('AgentExecutionThread', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: Relation<AgentExecutionThread>;

	@Column({ type: 'uuid', nullable: true })
	planId: string | null;

	@ManyToOne('AgentPlan', { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'planId' })
	plan: Relation<AgentPlan> | null;

	@Column({ type: 'varchar', length: 16, comment: 'stopping, failed, or stopped' })
	status: AgentTaskCancellationState['status'];

	@JsonColumn({ comment: 'Captured execution, job, and child session IDs for this cancellation' })
	generation: { executionIds: string[]; jobIds: string[]; threadIds: string[] };

	@DateTimeColumn({ precision: 3, comment: 'Work accepted at or before this time cannot restart' })
	cutoffAt: Date;

	@DateTimeColumn({ precision: 3, nullable: true })
	settledAt: Date | null;

	@JsonColumn({ comment: 'Jobs that still require a confirmed stop' })
	failures: AgentTaskStopFailure[];

	@Column({ type: 'varchar', length: 16, comment: 'pending, claimed, reported, or failed' })
	reportStatus: AgentTaskCancellationState['reportStatus'];

	@Column({ type: 'text', comment: 'Saved facts for the acknowledgement and fallback notice' })
	report: string;
}
