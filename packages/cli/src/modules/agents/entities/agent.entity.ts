import type { ToolDescriptor } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { DateTimeColumn, JsonColumn, Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, ManyToOne, JoinColumn, type Relation } from '@n8n/typeorm';

import type { AgentHistory } from './agent-history.entity';

export type AgentScope = 'project' | 'instance';

/** An agent row (or a column subset of one) that belongs to a project. */
export type ProjectScoped<T extends Pick<Agent, 'projectId'>> = T & { projectId: string };

/** A project agent. Project-scoped repository queries return only these. */
export type ProjectAgent = ProjectScoped<Agent>;

/**
 * Narrows an agent to a project agent. Project-scoped repository queries
 * filter on `scope` in SQL too; this guard gives callers the non-null
 * `projectId` without a cast. A column subset without `scope` counts as a
 * project agent when it has a project.
 */
export function isProjectAgent<T extends Pick<Agent, 'projectId'>>(
	agent: T,
): agent is ProjectScoped<T> {
	if ('scope' in agent && agent.scope === 'instance') return false;
	return agent.projectId !== null;
}

@Entity({ name: 'agents' })
export class Agent extends WithTimestampsAndStringId {
	@Column({ type: 'varchar', length: 128 })
	name: string;

	@ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'projectId' })
	project: Project | null;

	/** Null only for an instance agent (`scope = 'instance'`). Its threads carry the working project. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	projectId: string | null;

	/**
	 * `project`: a user-defined agent in `projectId`. `instance`: a code-defined
	 * agent that belongs to no project. Instance agents are read-only through
	 * the project-agent APIs.
	 */
	@Column({ type: 'varchar', length: 16, default: 'project' })
	scope: AgentScope;

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
