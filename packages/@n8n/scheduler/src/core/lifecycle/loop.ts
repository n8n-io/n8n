import { Alarm, MAX_DELAY_MS } from './alarm';
import { Timeline } from './timeline';

/** Race sentinel: a pass can resolve to anything, so the timeout resolves to a symbol no pass can produce. */
const TIMED_OUT = Symbol('pass timed out');

/**
 * Abort reason a loop uses when it abandons a timed-out pass, distinct from the
 * default reason a graceful {@link Loop.stop} aborts with. A pass can read
 * `signal.reason === PASS_TIMED_OUT` to tell a timeout apart from a clean drain.
 */
export const PASS_TIMED_OUT = Symbol('pass aborted after timeout');

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

/** An unref'd, cancellable deadline that resolves to {@link TIMED_OUT} after `ms`. */
function timeoutAfter(ms: number): { timedOut: Promise<typeof TIMED_OUT>; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => resolve(TIMED_OUT), Math.min(ms, MAX_DELAY_MS));
		timer.unref();
	});
	return { timedOut, cancel: () => clearTimeout(timer) };
}

/**
 * Repeats an async pass on a fixed, jittered timeline (see {@link Timeline}):
 * a slow pass never shifts the cadence, and missed slots are skipped rather
 * than replayed as a burst.
 *
 * A tick that finds no free slot ({@link ConcurrencyMode}) is dropped, never
 * queued, so backpressure sheds new work instead of stacking it. A pass that
 * outlives `timeoutMs` is abandoned: its slot is freed, its `AbortSignal`
 * aborted, and its eventual outcome discarded. Claims and leases keep an
 * abandoned pass safe; it rolls back at its next cancellation point, but until
 * then it still holds what it acquired, so on a single-writer store (SQLite) a
 * fresh pass can briefly contend for the writer lock it has yet to release.
 *
 * {@link stop} cancels the pending tick, aborts the signal of every in-flight
 * pass so each can wind down at its next cancellation point, and waits for
 * them to settle or time out — teardown never waits on a hung pass for longer
 * than its timeout, and a signal-aware pass settles as soon as it observes
 * the abort.
 */
export class Loop {
	private readonly alarm: Alarm;

	private readonly inFlight = new Set<Promise<void>>();

	/** The abort controllers of in-flight passes, so {@link stop} can cancel them. */
	private readonly inFlightControllers = new Set<AbortController>();

	/**
	 * The one timeline this loop follows, anchored once at {@link start};
	 * its presence is what marks the loop as started.
	 */
	private timeline?: Timeline;

	private stopped = false;

	private readonly limit: number;

	constructor(
		private readonly pass: (signal: AbortSignal) => Promise<unknown>,
		private readonly options: LoopOptions,
		private readonly hooks: LoopHooks,
		private readonly random: () => number = Math.random,
		private readonly now: () => number = Date.now,
	) {
		this.limit = options.concurrency === 'sequential' ? 1 : options.maxConcurrent;
		this.alarm = new Alarm(now);
	}

	/**
	 * Anchor the timeline and arm the first tick.
	 * No-op when already started.
	 * A stopped loop stays stopped (one-shot lifecycle).
	 */
	start(): void {
		if (this.timeline === undefined && !this.stopped) {
			this.timeline = new Timeline(
				this.options.intervalMs,
				this.options.jitterRatio,
				this.random,
				this.now(),
			);
			this.alarm.set(this.timeline.firstTickAt, () => this.tick());
		}
	}

	/**
	 * Cancel the pending tick, abort in-flight passes, and wait for them to
	 * settle or time out. No tick fires after this resolves.
	 */
	async stop(): Promise<void> {
		this.stopped = true;
		this.alarm.cancel();
		for (const controller of this.inFlightControllers) {
			controller.abort();
		}
		await Promise.all(this.inFlight);
	}

	private tick(): void {
		if (this.timeline) {
			// Arm the next tick before running the pass:
			// the timeline must not depend on how long the pass takes.
			this.alarm.set(this.timeline.nextTickAt(this.now()), () => this.tick());
			this.launch();
		}
	}

	/** Run the pass for one tick, unless every slot is taken (then the tick is dropped). */
	private launch(): void {
		if (this.inFlight.size >= this.limit) {
			this.hooks.onSkippedTick({ inFlight: this.inFlight.size, limit: this.limit });
		} else {
			const run = this.runOnce();
			this.inFlight.add(run);
			void run.finally(() => this.inFlight.delete(run));
		}
	}

	/** Run one pass raced against its timeout. Reports through hooks; never rejects. */
	private async runOnce(): Promise<void> {
		const controller = new AbortController();
		this.inFlightControllers.add(controller);
		const timeout = timeoutAfter(this.options.timeoutMs);
		const pass = this.runPass(controller.signal);
		pass.catch(() => {}); // Deliberately NOT chained:
		try {
			if ((await Promise.race([pass, timeout.timedOut])) === TIMED_OUT) {
				controller.abort(PASS_TIMED_OUT);
				this.hooks.onTimeout({ timeoutMs: this.options.timeoutMs });
			}
		} catch (error) {
			if (!controller.signal.aborted) {
				this.hooks.onError(error);
			}
		} finally {
			this.inFlightControllers.delete(controller);
			timeout.cancel();
		}
	}

	private async runPass(signal: AbortSignal): Promise<unknown> {
		return await this.pass(signal);
	}
}
