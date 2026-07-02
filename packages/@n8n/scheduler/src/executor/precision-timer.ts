import { Service } from '@n8n/di';

/**
 * The timing primitives the {@link PrecisionTimer} depends on, injected so tests
 * can drive time deterministically. The default is real wall-clock timers.
 */
export interface TimerBackend {
	now(): number;
	setTimer(fn: () => void, delayMs: number): NodeJS.Timeout;
	clearTimer(handle: NodeJS.Timeout): void;
}

const defaultBackend: TimerBackend = {
	now: () => Date.now(),
	setTimer: (fn, delayMs) => setTimeout(fn, delayMs),
	clearTimer: (handle) => clearTimeout(handle),
};

/** `setTimeout` treats delays above the 32-bit signed max as 1ms; clamp to it. */
const MAX_DELAY_MS = 2_147_483_647;

/**
 * Fires a callback at a precise future instant. The executor claims a task
 * slightly before its `runAt` and schedules it here, so it fires at the exact
 * instant rather than on the next poll: steady-state precision is milliseconds.
 *
 * A task already due (or past) fires on the next tick (delay 0). Pending timers
 * are tracked so {@link cancelAll} can clear them on shutdown.
 */
@Service()
export class PrecisionTimer {
	private readonly pending = new Set<NodeJS.Timeout>();

	constructor(private readonly backend: TimerBackend = defaultBackend) {}

	/** Fire `fn` at `runAt` (or immediately if that instant has passed). */
	schedule(runAt: Date, fn: () => void): void {
		// The delay is measured against the instance wall clock, whereas due-ness and
		// the lease use the DB clock; a skewed instance therefore fires slightly early
		// or late. Steady-state ms precision assumes the instance clock tracks the DB's.
		const delay = Math.min(Math.max(0, runAt.getTime() - this.backend.now()), MAX_DELAY_MS);
		// `setTimer` returns before the callback can run, so `handle` is assigned by the
		// time the callback fires and can remove itself from the pending set.
		const handle = this.backend.setTimer(() => {
			this.pending.delete(handle);
			fn();
		}, delay);
		this.pending.add(handle);
	}

	/** Cancel every pending timer (e.g. on shutdown). */
	cancelAll(): void {
		for (const handle of this.pending) this.backend.clearTimer(handle);
		this.pending.clear();
	}

	get pendingCount(): number {
		return this.pending.size;
	}
}
