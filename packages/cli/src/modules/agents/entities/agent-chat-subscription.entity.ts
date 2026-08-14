import { WithTimestamps } from '@n8n/db';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@n8n/typeorm';

import { Agent } from './agent.entity';

/** Subscribed chat thread for an agent integration, shared by all main instances. */
@Entity({ name: 'agent_chat_subscriptions' })
export class AgentChatSubscription extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Agent that owns this subscription',
	})
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 64,
		comment: 'Chat integration platform for this subscription',
	})
	integrationType: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 255,
		comment: 'Credential connection that owns this subscription',
	})
	credentialId: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 255,
		comment: 'Platform thread ID the agent is subscribed to',
	})
	threadId: string;
}
