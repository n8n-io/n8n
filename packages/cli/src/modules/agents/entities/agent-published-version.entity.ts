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

import { AgentEntity } from './agent.entity';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

@Entity({ name: 'agent_published_version' })
export class AgentPublishedVersion extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@OneToOne(() => AgentEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<AgentEntity>;

	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	/**
	 * The agent's draft versionId at the time this snapshot was published.
	 * Compared against Agent.versionId to detect draft divergence from the published version.
	 */
	@Column({ type: 'varchar', length: 36 })
	publishedFromVersionId: string;

	@Column({ type: 'varchar', length: 128, nullable: true })
	model: string | null;

	@Column({ type: 'varchar', length: 128, nullable: true })
	provider: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	credentialId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	publishedById: string | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'publishedById' })
	publishedBy?: User | null;
}
