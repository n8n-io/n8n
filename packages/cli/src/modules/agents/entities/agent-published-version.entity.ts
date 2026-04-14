import { JsonColumn, User, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import type { AgentJsonConfig } from '../json-config/agent-json-config';
import type { Agent } from './agent.entity';

@Entity({ name: 'agent_published_version' })
export class AgentPublishedVersion extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@OneToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	model: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	provider: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	@Column({ type: 'datetime' })
	publishedAt: Date;

	@Column({ type: 'varchar', length: 36, nullable: true })
	publishedById: string | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'publishedById' })
	publishedBy?: User | null;
}
