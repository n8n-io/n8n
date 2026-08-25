import { DateTimeColumn, WithTimestamps } from '@n8n/db';
import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@n8n/typeorm';

import { Agent } from './agent.entity';

/** Outcome of the last attempt one process made to start a channel. */
export type AgentChannelStatusValue = 'connected' | 'error';

/**
 * What one process observed the last time it tried to start one channel.
 * Without it, a channel that failed to start is indistinguishable from a
 * running one, because the API can otherwise only infer "connected" from the
 * config plus the active version.
 *
 * Keyed by `hostId` as well as by channel, so **every row has exactly one
 * writer**. Webhook channels run on every main and each main succeeds or fails
 * on its own; sharing a row between them would mean each write contradicting
 * the last, and a reported status that flips on every pass. Per-process rows
 * make the reported status a pure function of the rows, so it only changes when
 * something really did. It also makes the retry counters below honest: a
 * throttle on this process's attempts, not a counter several processes race on.
 *
 * A reader combines the rows (see `buildChannelStatusReport`): any live row
 * reporting an error means the channel is degraded, because a main that cannot
 * start it cannot serve it either.
 */
@Entity({ name: 'agent_channel_status' })
export class AgentChannelStatus extends WithTimestamps {
	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment: 'Agent that owns this channel',
	})
	agentId: string;

	@ManyToOne(() => Agent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@PrimaryColumn({
		type: 'varchar',
		length: 64,
		comment: 'Chat integration platform for this channel',
	})
	integrationType: string;

	@PrimaryColumn({
		type: 'varchar',
		length: 36,
		comment:
			'Credential connection that backs this channel; no FK so a failure is still recordable after the credential is deleted',
	})
	credentialId: string;

	/** Indexed: every reconciliation pass reads this instance's own rows. */
	@Index()
	@PrimaryColumn({
		type: 'varchar',
		length: 128,
		comment: 'Process that observed this; the only writer of this row',
	})
	hostId: string;

	@Column({
		type: 'varchar',
		length: 16,
		comment: 'What this process last observed: connected or error',
	})
	status: AgentChannelStatusValue;

	@Column({
		type: 'text',
		nullable: true,
		comment: 'Why this process could not start the channel; null once it succeeds',
	})
	errorMessage: string | null;

	@Column({
		type: 'int',
		default: 0,
		comment: 'Consecutive failed startup attempts by this process, reset on success',
	})
	attempts: number;

	/**
	 * Separate from `updatedAt` on purpose: a heartbeat moves `updatedAt`, and a
	 * retry deadline that moved with it would bring every retry forward.
	 */
	@DateTimeColumn({
		nullable: true,
		comment: 'Earliest this process should retry; null when there is nothing to retry',
	})
	backoffUntil: Date | null;

	/**
	 * A process cannot delete its own rows when it crashes, and `hostId` is
	 * regenerated on restart, so a later process cannot recognise them either.
	 * The owner therefore keeps this ahead of now while it is alive, readers
	 * ignore rows past it, and the leader deletes them. Null means no reconciler
	 * is running to refresh it, so the row is the only account there is and is
	 * never treated as stale.
	 */
	@Index()
	@DateTimeColumn({
		nullable: true,
		comment: 'When this row stops counting unless its owner refreshes it; null never expires',
	})
	expiresAt: Date | null;
}
