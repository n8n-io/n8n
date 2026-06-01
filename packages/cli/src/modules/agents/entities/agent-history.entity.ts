import type { ToolDescriptor } from '@n8n/agents';
import { type AgentJsonConfig, type AgentSkill, type AgentTaskConfig } from '@n8n/api-types';
import { JsonColumn, WithTimestamps } from '@n8n/db';
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

	/**
	 * Frozen map of `taskId → { name, objective, cronExpression }` at publish
	 * time. Scheduled runs read the task body from here so the whole body (not
	 * just membership/enabled) is gated behind publish.
	 */
	@JsonColumn({
		nullable: true,
		default: null,
		comment: 'Frozen map of taskId to { name, objective, cronExpression } at publish time',
	})
	tasks: Record<string, AgentTaskConfig> | null;

	/**
	 * Runtime pointer to the publishing user. Auto-nulls when the user is
	 * deleted (DB FK with ON DELETE SET NULL). Read by the schedule trigger
	 * and the published-runtime loader to resolve an execution identity.
	 */
	@Column({ type: 'uuid', nullable: true })
	publishedById: string | null;

	/**
	 * Denormalized human-readable attribution, frozen at publish time.
	 * Survives user deletion and rename — the version timeline shows the
	 * name the publisher had at the time of publish.
	 */
	@Column()
	author: string;
}
