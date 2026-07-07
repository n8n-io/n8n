import { Alarm, MAX_DELAY_MS } from './alarm';
import { Timeline } from './timeline';

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
	private readonly alarm: Alarm;

	private readonly inFlight = new Set<Promise<void>>();

	private started = false;

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
		if (!this.started && !this.stopped) {
			this.started = true;
			const timeline = new Timeline(
				this.options.intervalMs,
				this.options.jitterRatio,
				this.random,
				this.now(),
			);
			const tick = (): void => {
				// Arm the next tick before running the pass:
				// the timeline must not depend on how long the pass takes.
				this.alarm.set(timeline.nextTickAt(this.now()), tick);
				this.launch();
			};
			this.alarm.set(timeline.firstTickAt, tick);
		}
	}

	/**
	 * Cancel the pending tick and wait for in-flight passes to settle or time out.
	 * No tick fires after this resolves.
	 */
	async stop(): Promise<void> {
		this.stopped = true;
		this.alarm.cancel();
		await Promise.all(this.inFlight);
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
		const timeout = timeoutAfter(this.options.timeoutMs);
		const pass = this.runPass(controller.signal);
		pass.catch(() => {}); // Deliberately NOT chained:
		try {
			if ((await Promise.race([pass, timeout.timedOut])) === TIMED_OUT) {
				controller.abort();
				this.hooks.onTimeout({ timeoutMs: this.options.timeoutMs });
			}
		} catch (error) {
			this.hooks.onError(error);
		} finally {
			timeout.cancel();
		}
	}

	private async runPass(signal: AbortSignal): Promise<unknown> {
		return await this.pass(signal);
	}
}
