import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_checkpoints' })
@Index('IDX_agent_checkpoints_thread', ['agentId', 'threadId', 'expired', 'updatedAt'])
export class AgentCheckpoint extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	runId: string;

	@ManyToOne(() => Agent, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	agentId: string | null;

	@Column({
		type: 'text',
		nullable: true,
		comment: 'SDK thread key from checkpoint state. Execution history is optional.',
	})
	@Index()
	threadId: string | null;

	@Column({ type: 'text', nullable: true })
	state: string | null;

	@Column({ type: 'boolean', default: false })
	expired: boolean;
}
