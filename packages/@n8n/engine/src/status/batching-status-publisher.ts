import type { StatusPublisher } from './status-publisher';
import { MAX_STATUS_UPDATES_PER_BATCH } from './status-update.schema';
import type { StatusCallback, StatusUpdate } from './status-update.types';

/** Short enough that a host's view feels live, long enough to coalesce a fan-out. */
export const DEFAULT_STATUS_FLUSH_INTERVAL_MS = 50;

/**
 * Buffers updates and hands them to the host's callback in batches.
 *
 * One flush is in flight at a time: each is chained onto its predecessor, so
 * batches reach the host in the order they were produced. A callback that
 * rejects is logged and its batch dropped — the data plane is the source of
 * truth, so a failed delivery costs the host freshness, never correctness.
 */
export class BatchingStatusPublisher implements StatusPublisher {
	private buffer: StatusUpdate[] = [];

	private flushTimer: NodeJS.Timeout | undefined;

	/** Tail of the flush chain. Never rejects — the callback's error is caught inside. */
	private inFlight: Promise<void> = Promise.resolve();

	private stopped = false;

	constructor(
		private readonly send: StatusCallback,
		private readonly flushIntervalMs: number = DEFAULT_STATUS_FLUSH_INTERVAL_MS,
		private readonly maxBuffered: number = MAX_STATUS_UPDATES_PER_BATCH,
	) {}

	publish(update: StatusUpdate): void {
		if (this.stopped) return;

		this.buffer.push(update);

		// Flushed rather than dropped on reaching the cap: a `step:completed`
		// carries data the host cannot reconstruct from a later event. Chaining
		// keeps memory bounded even when the host is slower than the engine.
		if (this.buffer.length >= this.maxBuffered) {
			void this.flush();
			return;
		}

		this.arm();
	}

	/** Sends what is buffered, queued behind any flush already in flight. */
	async flush(): Promise<void> {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
		// Still awaits the chain: `stop()` relies on this to wait out a flush that
		// is already on the wire.
		if (this.buffer.length === 0) return await this.inFlight;

		const batch = this.buffer;
		this.buffer = [];

		this.inFlight = this.inFlight.then(async () => {
			try {
				await this.send(batch);
			} catch (error) {
				// Caught inside the chain: a rejected `inFlight` would silently stop
				// every later flush.
				console.warn(`engine: status callback failed, dropped ${batch.length} update(s)`, error);
			}
		});

		return await this.inFlight;
	}

	async stop(): Promise<void> {
		// Set first, so an update from a straggling handler cannot land behind the
		// final flush and be stranded in the buffer.
		this.stopped = true;
		await this.flush();
	}

	/** Schedules the next flush, unless one is already scheduled. */
	private arm(): void {
		if (this.flushTimer) return;

		this.flushTimer = setTimeout(() => {
			this.flushTimer = undefined;
			void this.flush();
		}, this.flushIntervalMs);
		// A pending flush must not hold the process open on shutdown.
		this.flushTimer.unref();
	}
}
