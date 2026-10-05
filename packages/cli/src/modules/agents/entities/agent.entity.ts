import type { ToolDescriptor } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, type Relation } from '@n8n/typeorm';

import type { AgentHistory } from './agent-history.entity';

@Entity({ name: 'agents' })
export class Agent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	/**
	 * Null in the database for an instance agent (`scope = 'instance'`). Its
	 * threads carry their own working project. Project-scoped queries never
	 * return instance agents, so project code can keep treating this as set.
	 * PoC shortcut: the type does not show the null yet.
	 */
	@Column({ type: 'varchar', nullable: true })
	projectId: string;

	/** `instance` agents belong to no project and get their runtime from code. */
	@Column({ type: 'varchar', length: 16, default: 'project' })
	scope: 'project' | 'instance';

	@JsonColumn({ nullable: true, default: null })
	schema: AgentJsonConfig | null;

	@JsonColumn({ default: '[]' })
	integrations: AgentIntegrationConfig[];

	@JsonColumn({ default: '{}' })
	tools: Record<
		string,
		{
			code: string;
			descriptor: ToolDescriptor;
		}
	>;

	@JsonColumn({ default: '{}' })
	skills: Record<string, AgentSkill>;

	/** Whether MCP clients granted agent scopes may operate on this agent. */
	@Column({ default: false })
	availableInMCP: boolean;

	/**
	 * When this agent first reached a complete, publishable setup. Set once and
	 * never cleared — it guards the one-off "Agent setup completed" telemetry.
	 */
	@DateTimeColumn({ nullable: true })
	setupCompletedAt: Date | null;

	/** UUID identifying the current draft; bumped on the first config save after each publish. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	versionId: string | null;

	/** Points to the `AgentHistory` row that is currently published, or null when unpublished. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	activeVersionId: string | null;

	@ManyToOne('AgentHistory', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'activeVersionId' })
	activeVersion?: Relation<AgentHistory> | null;

	/**
	 * Optimistic-lock token. Every write that can conflict — draft edits via
	 * `AgentRepository.saveDraftFenced`, publish/unpublish via
	 * `setActiveVersionFenced` — bumps it in SQL behind `WHERE revision =
	 * :expected`, so a concurrent writer that bumped `revision` in between
	 * loses the fence (user-retryable `ConflictError`) instead of silently
	 * overwriting newer state. Never bump or write this column any other way.
	 */
	@Column({ type: 'int', default: 0 })
	revision: number;
}
