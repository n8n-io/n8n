import { AGENT_TASK_ID_MAX_LENGTH } from '@n8n/api-types';
import { Project, WithTimestampsAndStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { AgentHistory } from './agent-history.entity';
import { Agent } from './agent.entity';

/** Surface that started a session. */
export type AgentThreadOrigin = 'chat' | 'integration' | 'workflow' | 'task' | 'subagent' | 'test';

/**
 * One conversation between a user and an agent. Aggregates per-session
 * counters (token usage, cost, duration) so the sessions list can render
 * without scanning every message.
 *
 * Replaces the unreleased `ExecutionThread` entity (`execution_threads`
 * table). Per-message records live in `AgentExecution` (`agent_execution`
 * table) — see {@link AgentExecution}.
 *
 * Distinct from the SDK memory `AgentThreadEntity` (`agents_threads`),
 * which stores chat-history state owned by the n8n-memory integration.
 * Both use the same `threadId` value but serve different layers.
 */
@Index(['agentId', 'origin', 'originRef', 'externalKey'], {
	unique: true,
	where: '"externalKey" IS NOT NULL',
})
@Entity({ name: 'agent_execution_threads' })
export class AgentExecutionThread extends WithTimestampsAndStringId {
	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Index()
	@Column({ type: 'varchar', length: 36 })
	agentId: string;

	/** Denormalized for display — avoids joining agents table when listing threads. */
	@Column({ type: 'varchar', length: 255 })
	agentName: string;

	/**
	 * Identity of the conversation this session belongs to. `externalKey` is the
	 * thread key owned by the origin (a platform thread id, a caller-supplied
	 * session id); `originRef` namespaces it where the key is only unique within
	 * something else (the workflow, for workflow threads). Together with
	 * `agentId` they form the natural key a continuation is looked up by, so
	 * `id` itself can stay an opaque uuid. Null/empty for origins that mint a
	 * fresh session per run.
	 */
	@Column({ type: 'varchar', length: 32, nullable: true })
	origin: AgentThreadOrigin | null;

	@Column({ type: 'varchar', length: 255, default: '' })
	originRef: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	externalKey: string | null;

	/**
	 * Memory `resourceId` of whoever started the session. Immutable once set: a
	 * shared integration thread has several writers and ownership should not
	 * depend on who spoke last. Null for threads that predate this column.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	createdByResourceId: string | null;

	/** LLM-generated summary of the first user message. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	title: string | null;

	/** Emoji representing the session topic. */
	@Column({ type: 'varchar', length: 8, nullable: true })
	emoji: string | null;

	/**
	 * Parent session thread id that delegated this run, for navigating back to
	 * it. Holds another thread's id, so it matches the id column width (128).
	 */
	@Column({ type: 'varchar', length: 128, nullable: true })
	parentThreadId: string | null;

	/** Saved agent id of the parent that delegated this run. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	parentAgentId: string | null;

	@ManyToOne(() => Project, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'projectId' })
	project: Project;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	projectId: string;

	/**
	 * Published task ID that triggered this session. Intentionally not a live
	 * FK: published task runs can outlive mutable draft task definition rows.
	 */
	@Column({
		type: 'varchar',
		length: AGENT_TASK_ID_MAX_LENGTH,
		nullable: true,
		comment:
			'Published task ID that triggered this session; not an FK because published runs can outlive draft task definition rows',
	})
	taskId: string | null;

	/**
	 * Published agent version that supplied the task snapshot for this session.
	 * Null for manual draft runs and non-task sessions.
	 */
	@ManyToOne(() => AgentHistory, { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'taskVersionId' })
	taskVersion: AgentHistory | null;

	@Index()
	@Column({
		type: 'varchar',
		length: 36,
		nullable: true,
		comment: 'Published agent_history version that supplied the task snapshot',
	})
	taskVersionId: string | null;

	/** Stable, project-scoped incrementing counter assigned at creation. */
	@Column({ type: 'int', default: 0 })
	sessionNumber: number;

	@Column({ type: 'int', default: 0 })
	totalPromptTokens: number;

	@Column({ type: 'int', default: 0 })
	totalCompletionTokens: number;

	@Column({ type: 'double precision', default: 0 })
	totalCost: number;

	/** Total generation time across all messages, in milliseconds. */
	@Column({ type: 'int', default: 0 })
	totalDuration: number;
}
