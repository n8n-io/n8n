import type {
	AgentExecutionStatus,
	AgentMessageAuthor,
	AgentPersistedMessageDto,
} from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	type ExecutionDataStorageLocation,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { AgentExecutionThread } from './agent-execution-thread.entity';
import type { TimelineEvent } from '../execution-recorder';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionFailureSummary } from '../utils/execution-failure-summary';

export type AgentExecutionHitlStatus = 'suspended' | 'resumed';

/**
 * One runtime execution within a session. Message references identify its
 * inputs and outputs. These columns store run state and legacy input copies.
 */
@Entity({ name: 'agent_execution' })
@Index(['threadId', 'createdAt'])
@Index(['status'], { where: '"status" = \'running\'' })
export class AgentExecution extends WithTimestampsAndStringId {
	/** Read projections. Absent for executions recorded before message references. */
	inputMessageIds?: string[];
	inputMessages?: AgentPersistedMessageDto[];

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

	/** Legacy input. New execution reads derive this value from message references. */
	@Column({ type: 'text', nullable: true })
	userMessage: string | null;

	/** Platform user who wrote the turn. Null for runs that did not come in through a chat integration. */
	@JsonColumn({ nullable: true })
	author: AgentMessageAuthor | null;

	/** Metadata of files attached to the user turn ({id, fileName, mimeType, sizeBytes}[]); bytes live in BinaryDataService. */
	@JsonColumn({ nullable: true })
	attachments: StoredAttachmentRef[] | null;

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

	@JsonColumn({ nullable: true })
	timeline: TimelineEvent[] | null;

	@Column({ type: 'text', nullable: true })
	error: string | null;

	@JsonColumn({ nullable: true })
	failureSummary: AgentExecutionFailureSummary | null;

	@Column({ type: 'varchar', length: 16, nullable: true })
	hitlStatus: AgentExecutionHitlStatus | null;

	/** Where the run originated, e.g. 'chat', 'slack'. */
	@Column({ type: 'varchar', length: 32, nullable: true })
	source: string | null;

	/** Where the timeline payload is stored: 'db' (inline column), 'fs', 's3', or 'az'. */
	@Column({ type: 'varchar', length: 2, nullable: false, default: 'db' })
	storedAt: ExecutionDataStorageLocation;
}
