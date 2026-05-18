import { DateTimeColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_tasks' })
export class AgentTask extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	projectId: string;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({ type: 'text' })
	goal: string;

	@Column({ type: 'varchar', length: 255 })
	cronExpression: string;

	@Column({ type: 'boolean', default: false })
	active: boolean;

	@DateTimeColumn({ nullable: true })
	lastRunAt: Date | null;
}
