import type { ToolDescriptor } from '@n8n/agents';
import { type AgentJsonConfig, type AgentSkill } from '@n8n/api-types';
import { JsonColumn, User, WithTimestamps } from '@n8n/db';
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
 * Immutable snapshot of an agent's published state. Created on publish and
 * never mutated. The currently-active row for an agent is the one pointed to
 * by `Agent.activeVersionId`.
 */
@Entity({ name: 'agent_history' })
export class AgentHistory extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	versionId: string;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	@JsonColumn({ nullable: true, default: null })
	tools: Record<
		string,
		{
			code: string;
			descriptor: ToolDescriptor;
		}
	> | null;

	@JsonColumn({ nullable: true, default: null })
	skills: Record<string, AgentSkill> | null;

	@Column({ type: 'uuid', nullable: true })
	publishedById: string | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'publishedById' })
	publishedBy?: User | null;
}
