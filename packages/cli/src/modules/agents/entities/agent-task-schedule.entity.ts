import { type ScheduledJob, WithCreatedAt } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { Agent } from './agent.entity';

/**
 * Links a `scheduled_job` row to the agent that owns it. Agent jobs carry
 * `workflowId = NULL`, so this table is what makes them queryable and
 * cleanable per agent. One row per agent-owned job.
 *
 * Deleting the agent cascades the link rows, which are the only route from an
 * agent to its jobs — deprovision the linked jobs BEFORE removing the agent row.
 */
@Entity({ name: 'agent_task_schedule' })
export class AgentTaskSchedule extends WithCreatedAt {
	@PrimaryColumn({ type: 'int', comment: 'The scheduled_job this agent owns' })
	jobId: number;

	@ManyToOne('ScheduledJob', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'jobId' })
	job: Relation<ScheduledJob>;

	@Index()
	@Column({ type: 'varchar', length: 36, comment: 'Owning agent' })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({
		type: 'varchar',
		length: 32,
		nullable: true,
		comment:
			'Agent task definition this job was provisioned from; null for agent-owned jobs with no task body',
	})
	taskId: string | null;
}
