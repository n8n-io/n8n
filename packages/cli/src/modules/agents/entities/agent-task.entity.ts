import type { AgentTaskRunStatus } from '@n8n/api-types';
import { DateTimeColumn, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

/** A scheduled, recurring objective an agent runs on its own cron. */
@Entity({ name: 'agent_task' })
export class AgentTask extends WithTimestampsAndStringId {
	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text' })
	objective: string;

	@Column({ type: 'varchar', length: 255 })
	cronExpression: string;

	@DateTimeColumn({ precision: 3, nullable: true })
	lastRunAt: Date | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	lastRunStatus: AgentTaskRunStatus | null;
}
