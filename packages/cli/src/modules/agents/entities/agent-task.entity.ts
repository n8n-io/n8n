import { AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH, AGENT_TASK_ID_MAX_LENGTH } from '@n8n/api-types';
import { WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';

/** A scheduled, recurring objective an agent runs on its own cron. */
@Entity({ name: 'agent_task_definition' })
export class AgentTask extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: AGENT_TASK_ID_MAX_LENGTH,
		comment: 'Application-generated task ID referenced from agent JSON config',
	})
	id: string;

	@Index()
	@Column({
		type: 'varchar',
		length: 36,
		comment: 'Owning agent; task bodies are deleted when the agent is deleted',
	})
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'varchar', length: 128 })
	name: string;

	@Column({
		type: 'text',
		comment: 'User-authored instruction sent to the agent when this task runs',
	})
	objective: string;

	@Column({
		type: 'varchar',
		length: AGENT_TASK_CRON_EXPRESSION_MAX_LENGTH,
		comment: 'Cron schedule evaluated using the instance timezone',
	})
	cronExpression: string;
}
