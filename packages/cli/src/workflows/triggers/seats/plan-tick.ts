import { desiredHolders, fairShare } from './rendezvous';

/** The reconciler's view of one seat row, with times pre-resolved by the caller. */
export interface SeatView {
	id: string;
	workflowId: string;
	nodeId: string;
	desiredState: 'active' | 'inactive';
	desiredVersionId: string;
	holderId: string | null;
	/** Whether `leaseExpiresAt` has passed; false when vacant. */
	leaseExpired: boolean;
	leaseEpoch: number;
	desiredHolderId: string | null;
	/** How long the row has been in its current shape (from `updatedAt`); drives the grace fallback. */
	msSinceUpdated: number;
}

/** What this runner knows about a seat it holds. */
export interface HeldSeat {
	seatId: string;
	leaseEpoch: number;
	registeredVersionId: string;
}

export type TickAction =
	/** Extend the lease of a seat we hold whose state matches desire. */
	| { type: 'renew'; seat: SeatView; held: HeldSeat }
	/** DB says we hold this seat but we have no registration (process restarted): register at the existing epoch. */
	| { type: 'adopt'; seat: SeatView }
	/** Deregister the old version and register the desired one in place; same seat, same epoch. */
	| { type: 'swapVersion'; seat: SeatView; held: HeldSeat }
	/** Seat no longer wants to run (or wants someone else): deregister, report closed, release. */
	| { type: 'retire'; seat: SeatView; held: HeldSeat }
	/** Claim a vacant/expired seat (bumps the epoch), then register. */
	| { type: 'claim'; seat: SeatView }
	/** Ask an overloaded holder to hand the seat over; the holder retires it on its next tick. */
	| { type: 'requestHandoff'; seat: SeatView }
	/** We have a registration for a seat that is no longer ours: tear the trigger down. */
	| { type: 'deregisterGhost'; held: HeldSeat };

export interface PlanTickInput {
	myRunnerId: string;
	liveRunners: string[];
	seats: SeatView[];
	/** Seats this process believes it holds, by seat id. */
	held: Map<string, HeldSeat>;
	/** How long a vacant seat may wait for its rendezvous-desired holder before anyone may claim it. */
	graceMs: number;
}

/**
 * Pure per-tick decision function of the seat reconciler. Encodes the
 * assignment rules — anti-affinity, rendezvous eligibility with a grace
 * fallback, pull-based rate-limited handoffs, ghost teardown — so they are
 * testable without a database or registry.
 *
 * Steady state emits only renews: no epoch bumps, no registrations, no
 * consumer-group churn.
 */
export function planTick(input: PlanTickInput): TickAction[] {
	const { myRunnerId, liveRunners, seats, held, graceMs } = input;
	const actions: TickAction[] = [];

	const triggerKey = (seat: { workflowId: string; nodeId: string }) =>
		`${seat.workflowId}:${seat.nodeId}`;

	// Sibling seats per trigger, for anti-affinity and rendezvous N.
	const seatsByTrigger = new Map<string, SeatView[]>();
	for (const seat of seats) {
		const key = triggerKey(seat);
		const group = seatsByTrigger.get(key);
		if (group) group.push(seat);
		else seatsByTrigger.set(key, [seat]);
	}

	const activeSeatCountOf = (seat: SeatView) =>
		(seatsByTrigger.get(triggerKey(seat)) ?? []).filter((s) => s.desiredState === 'active').length;

	const iHoldSiblingOf = (seat: SeatView) =>
		(seatsByTrigger.get(triggerKey(seat)) ?? []).some(
			(sibling) => sibling.id !== seat.id && sibling.holderId === myRunnerId,
		);

	const seatIds = new Set(seats.map((seat) => seat.id));
	const heldCountByRunner = new Map<string, number>();
	for (const seat of seats) {
		if (seat.holderId !== null && !seat.leaseExpired) {
			heldCountByRunner.set(seat.holderId, (heldCountByRunner.get(seat.holderId) ?? 0) + 1);
		}
	}

	let retiredThisTick = 0;
	let requestedHandoffThisTick = false;

	for (const seat of seats) {
		const heldEntry = held.get(seat.id);
		const rowSaysMine = seat.holderId === myRunnerId;

		if (heldEntry && rowSaysMine && seat.leaseEpoch === heldEntry.leaseEpoch) {
			// A seat we hold, and the row agrees.
			if (seat.desiredState !== 'active') {
				actions.push({ type: 'retire', seat, held: heldEntry });
			} else if (seat.desiredHolderId !== null && seat.desiredHolderId !== myRunnerId) {
				// Honor at most one handoff per tick, so rebalancing trickles
				// instead of pausing every consumer group at once.
				if (retiredThisTick === 0) {
					actions.push({ type: 'retire', seat, held: heldEntry });
					retiredThisTick++;
				} else {
					actions.push({ type: 'renew', seat, held: heldEntry });
				}
			} else if (heldEntry.registeredVersionId !== seat.desiredVersionId) {
				actions.push({ type: 'swapVersion', seat, held: heldEntry });
			} else {
				actions.push({ type: 'renew', seat, held: heldEntry });
			}
			continue;
		}

		if (heldEntry) {
			// The row moved on without us (re-claimed, released, deleted): our
			// registration is a ghost. Handled below via the held sweep as well,
			// but catching it here keeps one pass per seat.
			actions.push({ type: 'deregisterGhost', held: heldEntry });
			continue;
		}

		if (rowSaysMine && !seat.leaseExpired && seat.desiredState === 'active') {
			// The DB says we hold it but we have no registration — a restart.
			// Re-register at the existing epoch instead of bouncing the lease.
			actions.push({ type: 'adopt', seat });
			continue;
		}

		// Vacant or expired active seats: claim if we're allowed. A pending
		// handoff request reserves the vacancy for its requester until the grace
		// elapses (the requester may have died); otherwise eligibility is the
		// rendezvous ranking, with the same grace fallback so a seat never
		// starves on an absent desired holder.
		const claimable =
			seat.desiredState === 'active' && (seat.holderId === null || seat.leaseExpired);
		if (claimable && !iHoldSiblingOf(seat)) {
			const graceElapsed = seat.msSinceUpdated >= graceMs;
			let eligible: boolean;
			if (seat.desiredHolderId !== null) {
				eligible = seat.desiredHolderId === myRunnerId || graceElapsed;
			} else {
				const holders = desiredHolders(
					seat.workflowId,
					seat.nodeId,
					liveRunners,
					activeSeatCountOf(seat),
				);
				eligible = holders.includes(myRunnerId) || graceElapsed;
			}
			if (eligible) actions.push({ type: 'claim', seat });
		}
	}

	// Ghosts for seats that vanished entirely.
	for (const [seatId, heldEntry] of held) {
		if (!seatIds.has(seatId)) actions.push({ type: 'deregisterGhost', held: heldEntry });
	}

	// Pull-based rebalancing: only an underloaded runner asks, only an
	// overloaded holder is asked, one request per tick fleet-entry-point.
	const totalActiveSeats = seats.filter((seat) => seat.desiredState === 'active').length;
	const share = fairShare(totalActiveSeats, liveRunners.length);
	const myHeldCount = heldCountByRunner.get(myRunnerId) ?? 0;

	if (myHeldCount < share) {
		for (const seat of seats) {
			if (requestedHandoffThisTick) break;
			if (
				seat.desiredState === 'active' &&
				seat.holderId !== null &&
				seat.holderId !== myRunnerId &&
				!seat.leaseExpired &&
				seat.desiredHolderId === null &&
				(heldCountByRunner.get(seat.holderId) ?? 0) > share &&
				!iHoldSiblingOf(seat)
			) {
				actions.push({ type: 'requestHandoff', seat });
				requestedHandoffThisTick = true;
			}
		}
	}

	return actions;
}
