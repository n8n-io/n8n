/**
 * The fixed, jittered tick timeline: pure arithmetic over wall-clock
 * milliseconds, no timers. It answers a single question — when is the next
 * tick? — so the timing model can be read (and tested) in one place.
 *
 * The anchor sits at a random phase within one interval of `startAt`, so
 * instances started together (a rolling restart) spread over the interval
 * instead of ticking in lockstep. After that, one slot per interval; each
 * tick fires at its slot plus a fresh jitter offset, so slot `k` always lands
 * at `anchor + k·interval ± jitter` and deviations never accumulate.
 */
export class Timeline {
	/** Next unjittered slot. */
	private slotAt: number;

	constructor(
		private readonly intervalMs: number,
		private readonly jitterRatio: number,
		private readonly random: () => number,
		startAt: number,
	) {
		this.slotAt = startAt + intervalMs * random();
	}

	/** The anchor itself: the first tick fires here, un-jittered (its phase is already random). */
	get firstTickAt(): number {
		return this.slotAt;
	}

	/**
	 * Consume the current slot and return the next tick's jittered instant.
	 * Slots a stall left wholly in the past are skipped, not replayed as a burst.
	 */
	nextTickAt(now: number): number {
		const missedSlots = Math.floor(Math.max(0, now - this.slotAt) / this.intervalMs);
		this.slotAt += (missedSlots + 1) * this.intervalMs;
		const jitterMs = this.intervalMs * this.jitterRatio * (2 * this.random() - 1);
		return this.slotAt + jitterMs;
	}
}
