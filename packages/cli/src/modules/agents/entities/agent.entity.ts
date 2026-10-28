import type { ToolDescriptor } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentSkill, StoredAgentConfig } from '@n8n/api-types';
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
	 * agent that belongs to no project. The project-agent APIs do not see
	 * instance agents: reads and writes report them as not found.
	 */
	@Column({ type: 'varchar', length: 16, default: 'project' })
	scope: AgentScope;

	@JsonColumn({ nullable: true, default: null })
	schema: StoredAgentConfig | null;

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

	/**
	 * @deprecated Agents keep their skills in the skills hub. Read and write them through
	 * `AgentSkillRefsService`. Only the data migration reads this column, and a later
	 * release drops it.
	 */
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

	/** ID of the current saved definition. Each changed draft receives a new ID. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	versionId: string | null;

	/** Points to the `AgentHistory` row that is currently published, or null when unpublished. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	activeVersionId: string | null;

	@ManyToOne('AgentHistory', { onDelete: 'SET NULL', nullable: true })
	@JoinColumn({ name: 'activeVersionId' })
	activeVersion?: Relation<AgentHistory> | null;

	/** Draft revision. Fenced saves advance it to reject stale draft writes. */
	@Column({ type: 'int', default: 0 })
	revision: number;

	/** Changes on publication and live connection edits, independently of draft saves. */
	@Column({ type: 'int', default: 0 })
	publicationRevision: number;
}
