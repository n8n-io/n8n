import { WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiThread } from './instance-ai-thread.entity';

/**
 * Append-only log of durable Instance AI events — the source of truth for
 * rendering and SSE replay (see RFC: instance-ai durable event log).
 *
 * Rows are immutable: state transitions are new facts appended later (e.g. a
 * `run-finish` supersedes in-flight tool calls at fold time), never UPDATEs.
 * Token deltas are NOT stored — completed text/reasoning blocks are coalesced
 * into one row at the next structural fact. `seq` is the per-thread monotonic
 * SSE replay cursor; it survives restarts because it is derived from this
 * table (MAX(seq)), unlike the previous in-memory counter.
 */
@Entity({ name: 'instance_ai_events' })
@Index(['threadId', 'runId'])
export class InstanceAiEventLogEntry extends WithTimestamps {
	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: InstanceAiThread;

	@PrimaryColumn({ type: 'uuid' })
	threadId: string;

	/** Per-thread monotonic sequence — the SSE replay cursor. */
	@PrimaryColumn({ type: 'int' })
	seq: number;

	/** Indexed with threadId for run-scoped reads (agent-tree derivation, run summaries). */
	@Column({ type: 'varchar', length: 64 })
	runId: string;

	/** Event type discriminator, duplicated out of the payload for cheap filtering. */
	@Column({ type: 'varchar', length: 64 })
	type: string;

	/** JSON.stringify of the canonical `InstanceAiEvent` (already redacted upstream). */
	@Column({ type: 'text' })
	payload: string;
}
