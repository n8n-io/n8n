import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

/**
 * When a channel last heard from a user. One row per channel, shared by every
 * process, so it outlives the per-process rows in `agent_channel_status`.
 */
@Entity({ name: 'agent_channel_activity' })
export class AgentChannelActivity extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36, comment: 'Agent that owns this channel' })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 64,
		comment: 'Chat integration platform for this channel',
	})
	integrationType: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Credential connection that backs this channel',
	})
	credentialId: string;

	@DateTimeColumn({ comment: 'When the channel last received a message from a user' })
	lastInboundAt: Date;
}
