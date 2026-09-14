import type { AgentMessageAuthor } from '@n8n/api-types';
import {
	DateTimeColumn,
	JsonColumn,
	type ExecutionDataStorageLocation,
	WithTimestampsAndStringId,
} from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';
import type { SerializedThread } from 'chat';

import { AgentExecutionThread } from './agent-execution-thread.entity';
import type { TimelineEvent } from '../execution-recorder';
import type { IntegrationMessageSubject } from '../integrations/integration-tool-types';
import type { AgentExecutionFailureSummary } from '../utils/execution-failure-summary';

export type AgentExecutionStatus =
	| 'queued'
	| 'running'
	| 'success'
	| 'error'
	| 'cancelled'
	| 'interrupted';

/** The Chat SDK thread at arrival and the n8n connection it came in on. */
export interface QueuedChannelTurn {
	integrationType: string;
	credentialId?: string;
	/** `thread.toJSON()`; includes the inbound message when the turn came from one. */
	thread: SerializedThread;
}

/**
 * What a queued row needs to run later: the turn kind and the inbound context
 * no column holds. Cleared when the run ends.
 */
export type AgentTurnRunContext =
	| {
			kind: 'message';
			channel?: QueuedChannelTurn & {
				isNewMention: boolean;
				subject?: IntegrationMessageSubject;
				/** Rotated conversation id at arrival; the row thread can be a bound task session. */
				conversationThreadId: string;
			};
	  }
	| {
			kind: 'resume';
			runId: string;
			toolCallId: string;
			resumeData: unknown;
			channel?: QueuedChannelTurn;
	  };
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
@Index(['status'], { where: '"status" = \'running\'' })
@Index(['threadId'], {
	unique: true,
	where: '"runContext" IS NOT NULL AND "status" = \'running\'',
})
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

	/** Memory resource id of the sender, so a queued turn later runs as that user. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	/** Set while the row waits in the turn queue; null once the run ends. */
	@JsonColumn({ nullable: true })
	runContext: AgentTurnRunContext | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	startedAt: Date | null;

	@DateTimeColumn({ precision: 3, nullable: true })
	stoppedAt: Date | null;

	/** Wall-clock generation time in milliseconds. */
	@Column({ type: 'int', default: 0 })
	duration: number;

	/** Cleaned user input. Null for resumed runs where the input belongs to an earlier run. */
	@Column({ type: 'text', nullable: true })
	userMessage: string | null;

	/** Platform user who wrote the turn. Null for runs that did not come in through a chat integration. */
	@JsonColumn({ nullable: true })
	author: AgentMessageAuthor | null;

	/** Metadata of files attached to the user turn ({id, fileName, mimeType, sizeBytes}[]); bytes live in BinaryDataService. */
	@JsonColumn({ nullable: true })
	attachments: Array<{
		id: string;
		fileName: string;
		mimeType: string;
		sizeBytes: number;
	}> | null;

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
