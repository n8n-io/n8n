import { bigintStringToNumber, DateTimeColumn, WithTimestampsAndStringId } from '@n8n/db';
import type { AgentExecutionLogStorageLocation } from '@n8n/config';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { AgentExecutionThread } from './agent-execution-thread.entity';

export type AgentExecutionStatus = 'success' | 'error';
export type AgentExecutionHitlStatus = 'suspended' | 'resumed';

/**
 * One agent run within a thread — the unit recorded for each user/agent
 * exchange. Replaces the per-agent rows that used to live in
 * `execution_entity` (with a fan-out of free-form key/value rows in
 * `execution_metadata`).
 *
 * Storing typed columns instead of metadata key/value pairs lets queries
 * filter and aggregate directly (e.g. "first userMessage in thread",
 * "suspended runs missing model"), without the index-unfriendly
 * `WHERE key = '...' AND value != ''` predicates the old schema needed.
 */
@Entity({ name: 'agent_execution' })
@Index(['threadId', 'createdAt'])
export class AgentExecution extends WithTimestampsAndStringId {
	@ManyToOne(() => AgentExecutionThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: AgentExecutionThread;

	// Thread ids are scoped with prefixes/user ids on some surfaces (e.g.
	// `test-<agentId>:<userId>`), so they exceed a bare uuid — widened to 128 in
	// AddSubAgentLinkageToAgentExecutionThreads1784000000022.
	@Column({ type: 'varchar', length: 128 })
	threadId: string;

	@Column({ type: 'varchar', length: 16 })
	status: AgentExecutionStatus;

	@DateTimeColumn({ precision: 3, nullable: true })
	startedAt: Date | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	stoppedAt: Date | null;

	/** Wall-clock generation time in milliseconds. */
	@Column({ type: 'int', default: 0 })
	duration: number;

	/**
	 * Cleaned user input. Empty for resumed runs (HITL continuations) where
	 * the user input belongs to an earlier suspended run in the same thread.
	 */
	@Column({ type: 'text' })
	userMessage: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	model: string | null;

	@Column({ type: 'int', nullable: true })
	promptTokens: number | null;

	@Column({ type: 'int', nullable: true })
	completionTokens: number | null;

	@Column({ type: 'int', nullable: true })
	totalTokens: number | null;

	@Column({ type: 'double precision', nullable: true })
	cost: number | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	hitlStatus: AgentExecutionHitlStatus | null;

	/** Where the run originated, e.g. 'chat', 'slack'. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	source: string | null;

	/** Where the external agent execution log payload is stored. */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'fs' })
	storedAt: AgentExecutionLogStorageLocation;

	/** Size in bytes of the serialized agent execution log payload. `0` means unknown. */
	@Column({ type: 'bigint', default: 0, transformer: bigintStringToNumber })
	logSizeBytes: number;
}
