import { DateTimeColumn, User, WithTimestamps } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from '@n8n/typeorm';

import { InstanceAiCheckpoint } from './instance-ai-checkpoint.entity';
import { InstanceAiThread } from './instance-ai-thread.entity';

export type InstanceAiPendingConfirmationKind = 'suspended' | 'inline';

/**
 * Durable index of HITL confirmations the assistant is waiting on. The big
 * agent state blob lives in `instance_ai_checkpoints`; this table is purely
 * the lookup that lets a fresh process find a confirmation after the original
 * in-memory `pendingConfirmations` / `suspendedRuns` maps are gone (crash,
 * restart, multi-main failover).
 *
 * `kind` distinguishes the two flows:
 *  - `'inline'` — orchestrator was still running, awaiting a JS Promise from a
 *    HITL tool. The Promise dies with the process, so post-restart claims can
 *    only mark the run terminal, not resume it.
 *  - `'suspended'` — agent SDK returned `status: 'suspended'` and persisted a
 *    checkpoint. Post-restart claims can rebuild the agent and call
 *    `agent.resume(...)`.
 */
@Entity({ name: 'instance_ai_pending_confirmations' })
export class InstanceAiPendingConfirmation extends WithTimestamps {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	requestId: string;

	@ManyToOne(() => InstanceAiThread, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'threadId' })
	thread: InstanceAiThread;

	@Index()
	@Column({ type: 'uuid' })
	threadId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@Index()
	@Column({ type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 16 })
	kind: InstanceAiPendingConfirmationKind;

	@Column({ type: 'varchar', length: 36 })
	runId: string;

	@Column({ type: 'varchar', length: 64, nullable: true })
	toolCallId: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	messageGroupId: string | null;

	@ManyToOne(() => InstanceAiCheckpoint, { onDelete: 'CASCADE', nullable: true })
	@JoinColumn({ name: 'checkpointKey', referencedColumnName: 'key' })
	checkpoint: InstanceAiCheckpoint | null;

	@Index()
	@Column({ type: 'varchar', length: 255, nullable: true })
	checkpointKey: string | null;

	@Column({ type: 'varchar', length: 36, nullable: true })
	checkpointTaskId: string | null;

	@Index()
	@DateTimeColumn({ precision: 3, nullable: true })
	expiresAt: Date | null;
}
