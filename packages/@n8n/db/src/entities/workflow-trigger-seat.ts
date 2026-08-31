import { Column, Entity, Generated, Index, PrimaryColumn } from '@n8n/typeorm';

import { DateTimeColumn, WithTimestamps, dbType } from './abstract-entity';
import { idStringifier } from '../utils/transformers';

export const TriggerSeatDesiredStateList = ['active', 'inactive'] as const;
export type TriggerSeatDesiredState = (typeof TriggerSeatDesiredStateList)[number];

export const TriggerSeatActualStateList = ['registered', 'closed', 'error'] as const;
export type TriggerSeatActualState = (typeof TriggerSeatActualStateList)[number];

/**
 * Fencing token a seat holder presents when creating an execution for a
 * trigger emission. Checked in the same transaction as the execution insert:
 * the seat must still be held by this holder at this epoch, and its desired
 * version must match the version the trigger was registered for.
 */
export type TriggerSeatFence = {
	seatId: string;
	holderId: string;
	leaseEpoch: number;
	versionId: string;
};

/**
 * One leasable replica slot ("seat") of an in-memory trigger node.
 *
 * A trigger with replication N gets seats 0..N-1. A runner (main instance)
 * may hold at most one seat per trigger node, so the number of concurrently
 * running replicas is min(N, live runners). The row carries both the desired
 * state written by workflow publication (which version should run, whether
 * the trigger should run at all) and the lease of the runner currently
 * serving the seat.
 *
 * Every lease write is guarded on `holderId` + `leaseEpoch`; zero rows
 * affected means the seat is no longer ours, which is benign. The epoch, not
 * the wall-clock expiry, is what fences a stale holder's effects: an
 * expired-but-unreclaimed lease may still commit, only a newer claim revokes.
 */
@Entity({ name: 'workflow_trigger_seat' })
@Index(['workflowId', 'nodeId', 'seatIndex'], { unique: true })
@Index(['desiredState'])
export class WorkflowTriggerSeat extends WithTimestamps {
	@Generated()
	@PrimaryColumn({
		type: dbType === 'sqlite' ? 'integer' : 'bigint',
		transformer: idStringifier,
	})
	id: string;

	@Column({ type: 'varchar', length: 36 })
	workflowId: string;

	@Column({ type: 'varchar', length: 36 })
	nodeId: string;

	/** Which of the trigger's N replica slots this row is. */
	@Column({ type: 'int' })
	seatIndex: number;

	/**
	 * Whether a runner should be serving this seat. Publication flips this
	 * instead of deleting rows, so a holder observes the transition and tears
	 * down cleanly before the row is eventually pruned.
	 */
	@Column({ type: 'varchar', length: 16, default: 'active' })
	desiredState: TriggerSeatDesiredState;

	/** The published version the seat's trigger should run. */
	@Column({ type: 'varchar', length: 36 })
	desiredVersionId: string;

	/** Runner currently holding the seat's lease; `null` when vacant. */
	@Column({ type: 'varchar', length: 255, nullable: true })
	holderId: string | null;

	@DateTimeColumn({ nullable: true })
	leaseExpiresAt: Date | null;

	/** Fencing token, bumped on every claim. */
	@Column({ type: 'int', default: 0 })
	leaseEpoch: number;

	/**
	 * Set by an underloaded runner to politely request the seat. The current
	 * holder observes it on its next reconcile tick and releases; the seat is
	 * never seized from a live holder.
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	desiredHolderId: string | null;

	/** What the holder last reported doing with the seat. */
	@Column({ type: 'varchar', length: 16, nullable: true })
	actualState: TriggerSeatActualState | null;

	/** The version the holder's registered trigger is actually running. */
	@Column({ type: 'varchar', length: 36, nullable: true })
	actualVersionId: string | null;

	@Column({ type: 'text', nullable: true })
	lastError: string | null;
}
