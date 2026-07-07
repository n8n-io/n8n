import { MAX_INTEGER_32BITS_SIGNED } from '@n8n/constants';

/** `setTimeout` treats delays above the 32-bit signed max as 1ms; clamp to it. */
const MAX_DELAY_MS = MAX_INTEGER_32BITS_SIGNED;

/** Race sentinel: a pass can resolve to anything, so the timeout resolves to a symbol no pass can produce. */
const TIMED_OUT = Symbol('pass timed out');

/**
 * How a loop resolves a tick that would overlap in-flight passes.
 *
 * - `sequential`: at most one pass in flight; storage that serialises writers
 *   (SQLite) gains nothing from overlap, so an overlapping tick is dropped.
 * - `concurrent`: up to `maxConcurrent` passes in flight; storage that claims
 *   with row locks (Postgres) keeps overlapping passes correct.
 */
export type ConcurrencyMode = 'sequential' | 'concurrent';

export interface LoopOptions {
	/** Spacing of the fixed tick timeline. */
	intervalMs: number;

	/**
	 * How far each tick may deviate from its slot on the timeline, as a ratio
	 * of the interval (0.1 = ±10%). Jitter is applied per slot and never
	 * accumulates, so the timeline itself stays fixed.
	 */
	jitterRatio: number;

	/** How long a pass may run before it is abandoned and told to abort. */
	timeoutMs: number;

	concurrency: ConcurrencyMode;

	/** In-flight ceiling in `concurrent` mode; ignored in `sequential` mode. */
	maxConcurrent: number;
}

export interface LoopHooks {
	/** A pass rejected; the timeline continues. Trusted not to throw (the factory's event sink guarantees it). */
	onError: (error: unknown) => void;

	/**
	 * A pass outlived its timeout: its slot was freed, its signal aborted and
	 * its eventual settlement discarded. Same trust as {@link onError}.
	 */
	onTimeout: (context: { timeoutMs: number }) => void;

	/** A tick fired with every slot taken and was dropped. Same trust as {@link onError}. */
	onSkippedTick: (context: { inFlight: number; limit: number }) => void;
}

/**
 * Repeats an async pass on a fixed, jittered timeline.
 *
 * Ticks live on a fixed grid: an anchor at a random phase within one interval
 * (so instances started together — a rolling restart — spread over the
 * interval instead of hitting storage in lockstep), then one slot per
 * interval. Each tick fires at its slot plus a fresh jitter offset, so slot
 * `k` always lands at `anchor + k·interval ± jitter` no matter how long
 * passes take: a slow pass never shifts the cadence. When the process stalls
 * past whole slots (event-loop pause, clock jump) the missed slots are
 * skipped, not replayed as a burst.
 *
 * A tick that finds no free slot ({@link ConcurrencyMode}) is dropped — never
 * queued — so backpressure sheds new work instead of stacking it. A pass that
 * outlives `timeoutMs` is abandoned: its slot is freed, its `AbortSignal`
 * aborted, and its eventual outcome discarded. Storage claims and leases make
 * an abandoned pass no worse than one on an instance that crashed mid-pass.
 *
 * {@link stop} cancels the pending tick and waits for in-flight passes to
 * settle or time out, so teardown never waits on a hung pass for longer than
 * its timeout.
 */
export class Loop {
	private timer?: ReturnType<typeof setTimeout>;

	private readonly inFlight = new Set<Promise<void>>();

	private started = false;

	private stopped = false;

	/** Next unjittered slot on the tick timeline. */
	private slotAt = 0;

	/** When the armed timer is meant to fire (slot plus its jitter offset). */
	private targetAt = 0;

	private readonly limit: number;

	constructor(
		private readonly pass: (signal: AbortSignal) => Promise<unknown>,
		private readonly options: LoopOptions,
		private readonly hooks: LoopHooks,
		private readonly random: () => number = Math.random,
		private readonly now: () => number = Date.now,
	) {
		this.limit = options.concurrency === 'sequential' ? 1 : options.maxConcurrent;
	}

	/**
	 * Anchor the timeline at a random phase within one interval and arm the first tick.
	 * No-op when already started.
	 * A stopped loop stays stopped (one-shot lifecycle).
	 */
	start(): void {
		if (!this.started && !this.stopped) {
			this.started = true;
			this.slotAt = this.now() + this.options.intervalMs * this.random();
			this.armTimer(this.slotAt);
		}
	}

	/**
	 * Cancel the pending tick and wait for in-flight passes to settle or time out.
	 * No tick fires after this resolves.
	 */
	async stop(): Promise<void> {
		this.stopped = true;
		if (this.timer !== undefined) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
		await Promise.all(this.inFlight);
	}

	private armTimer(targetAt: number): void {
		if (!this.stopped) {
			this.targetAt = targetAt;
			const delayMs = Math.min(Math.max(0, targetAt - this.now()), MAX_DELAY_MS);
			this.timer = setTimeout(() => {
				this.timer = undefined;
				if (this.targetAt > this.now()) {
					this.armTimer(this.targetAt);
				} else {
					this.tick();
				}
			}, delayMs);
			this.timer.unref(); // never keep the process alive just for the next tick
		}
	}

	private tick(): void {
		// Arm the next tick before running the pass:
		// the timeline must not depend on how long the pass takes.
		this.armNextTick();
		if (this.inFlight.size >= this.limit) {
			this.hooks.onSkippedTick({ inFlight: this.inFlight.size, limit: this.limit });
		} else {
			const run = this.runOnce();
			this.inFlight.add(run);
			void run.finally(() => this.inFlight.delete(run));
		}
	}

	/** Advance to the next future slot (skipping slots a stall left behind) and arm it, jittered. */
	private armNextTick(): void {
		const { intervalMs, jitterRatio } = this.options;
		const missedSlots = Math.floor(Math.max(0, this.now() - this.slotAt) / intervalMs);
		this.slotAt += (missedSlots + 1) * intervalMs;
		const jitterMs = intervalMs * jitterRatio * (2 * this.random() - 1);
		this.armTimer(this.slotAt + jitterMs);
	}

	/** Run one pass raced against its timeout. Reports through hooks; never rejects. */
	private async runOnce(): Promise<void> {
		const controller = new AbortController();
		let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
		const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
			timeoutTimer = setTimeout(
				() => resolve(TIMED_OUT),
				Math.min(this.options.timeoutMs, MAX_DELAY_MS),
			);
			timeoutTimer.unref();
		});
		const pass = this.runPass(controller.signal);
		pass.catch(() => {}); // Deliberately NOT chained
		try {
			if ((await Promise.race([pass, timedOut])) === TIMED_OUT) {
				controller.abort();
				this.hooks.onTimeout({ timeoutMs: this.options.timeoutMs });
			}
		} catch (error) {
			this.hooks.onError(error);
		} finally {
			clearTimeout(timeoutTimer);
		}
	}

	private async runPass(signal: AbortSignal): Promise<unknown> {
		return await this.pass(signal);
	}
}
