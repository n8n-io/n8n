import { DateTimeColumn } from '@n8n/db';
import {
	BaseEntity,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';

@Entity({ name: 'agent_conversation_lease' })
export class AgentConversationLease extends BaseEntity {
	@PrimaryColumn({ type: 'varchar', length: 128 })
	threadId: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Column({ type: 'uuid' })
	ownerToken: string;

	@DateTimeColumn({ precision: 3 })
	expiresAt: Date;
}
