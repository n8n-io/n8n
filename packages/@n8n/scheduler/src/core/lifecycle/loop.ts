import { MAX_INTEGER_32BITS_SIGNED } from '@n8n/constants';

/** `setTimeout` treats delays above the 32-bit signed max as 1ms; clamp to it. */
const MAX_DELAY_MS = MAX_INTEGER_32BITS_SIGNED;

/**
 * Repeats an async pass on a jittered cadence.
 *
 * The first tick fires at a random phase within one interval and every later
 * delay is jittered around the interval, so instances started together (a
 * rolling restart) spread their passes over the interval instead of hitting
 * storage in lockstep. The next tick is scheduled only once the pass settles,
 * so a pass never overlaps itself and a slow pass stretches the cadence
 * rather than stacking.
 *
 * A pass failure is routed to `onError` and the cadence continues; `onError`
 * is trusted not to throw (the factory's event sink guarantees it).
 *
 * {@link stop} waits out an in-flight pass, so a pass and teardown never
 * overlap (the contract `Executor.stop` requires of its driver).
 */
export class Loop {
	private timer?: ReturnType<typeof setTimeout>;

	private inFlight?: Promise<void>;

	private stopped = false;

	constructor(
		private readonly pass: () => Promise<unknown>,
		private readonly intervalMs: number,
		private readonly jitterRatio: number,
		private readonly onError: (error: unknown) => void,
		private readonly random: () => number = Math.random,
	) {}

	/**
	 * Schedule the first tick at a random phase within one interval.
	 * No-op when already started.
	 * A stopped loop stays stopped (one-shot lifecycle).
	 */
	start(): void {
		if (this.timer === undefined && this.inFlight === undefined && !this.stopped) {
			this.schedule(this.intervalMs * this.random());
		}
	}

	/**
	 * Cancel the pending tick and wait out an in-flight pass.
	 * No tick fires after this resolves.
	 */
	async stop(): Promise<void> {
		this.stopped = true;
		if (this.timer !== undefined) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
		await this.inFlight;
	}

	private schedule(delayMs: number): void {
		if (!this.stopped) {
			this.timer = setTimeout(
				() => {
					this.timer = undefined;
					this.inFlight = this.tick();
				},
				Math.min(delayMs, MAX_DELAY_MS),
			);
			this.timer.unref(); // never keep the process alive just for the next tick
		}
	}

	private async tick(): Promise<void> {
		try {
			await this.pass();
		} catch (error) {
			this.onError(error);
		}
		this.inFlight = undefined;
		this.schedule(this.nextDelayMs());
	}

	/** Uniform in [interval·(1−jitter), interval·(1+jitter)]. */
	private nextDelayMs(): number {
		return this.intervalMs * (1 + this.jitterRatio * (2 * this.random() - 1));
	}
}
