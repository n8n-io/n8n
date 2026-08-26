import type { LifecycleEventPublisher } from './lifecycle-event-publisher';
import { MAX_LIFECYCLE_EVENTS_PER_BATCH } from './lifecycle-event.schema';
import type { LifecycleEventCallback, LifecycleEvent } from './lifecycle-event.types';

/** Short enough that a host's view feels live, long enough to coalesce a fan-out. */
export const DEFAULT_LIFECYCLE_EVENT_FLUSH_INTERVAL_MS = 50;

/**
 * Deadline on one callback invocation, and on the final flush in `stop()`. A
 * callback that hangs instead of rejecting must not wedge the chain or hold
 * shutdown open.
 */
export const DEFAULT_LIFECYCLE_EVENT_SEND_TIMEOUT_MS = 10_000;

/** Batches allowed on the chain before new ones are dropped. */
export const DEFAULT_MAX_PENDING_BATCHES = 20;

/**
 * Buffers events and hands them to the host's callback in batches.
 *
 * One flush is in flight at a time: each is chained onto its predecessor, so
 * batches reach the host in the order they were produced. A callback that
 * rejects, or that outlives its deadline, is logged and its batch dropped — the
 * data plane is the source of truth, so a failed delivery costs the host
 * freshness, never correctness. A batch dropped on its deadline aborts the
 * signal its callback was given, so the host can cancel the request behind it.
 *
 * A host slower than the engine is bounded rather than buffered: at most
 * `maxPendingBatches` batches wait on the chain, and a flush past that cap
 * drops its own batch instead of growing the backlog.
 */
export class BatchingLifecycleEventPublisher implements LifecycleEventPublisher {
	private buffer: LifecycleEvent[] = [];

	private flushTimer: NodeJS.Timeout | undefined;

	/** Tail of the flush chain. Never rejects — the callback's error is caught inside. */
	private inFlight: Promise<void> = Promise.resolve();

	/** Batches on the chain: the one on the wire plus those waiting behind it. */
	private pendingBatches = 0;

	private stopped = false;

	/** Set once shutdown stops waiting: batches still queued are dropped unsent. */
	private abandoned = false;

	constructor(
		private readonly send: LifecycleEventCallback,
		private readonly flushIntervalMs: number = DEFAULT_LIFECYCLE_EVENT_FLUSH_INTERVAL_MS,
		private readonly maxBuffered: number = MAX_LIFECYCLE_EVENTS_PER_BATCH,
		private readonly maxPendingBatches: number = DEFAULT_MAX_PENDING_BATCHES,
		private readonly sendTimeoutMs: number = DEFAULT_LIFECYCLE_EVENT_SEND_TIMEOUT_MS,
	) {}

	publish(event: LifecycleEvent): void {
		if (this.stopped) return;

		this.buffer.push(event);

		// Flushed rather than dropped on reaching the cap: a `step:completed`
		// carries data the host cannot reconstruct from a later event. The backlog
		// cap in `flush()` is what bounds memory when the host is the slow side.
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

		// Dropping the newest batch keeps the backlog bounded and the delivered
		// prefix in order. Chaining it instead would retain every batch the host
		// has not taken yet, so a sustained slowdown would grow engine memory.
		if (this.pendingBatches >= this.maxPendingBatches) {
			console.warn(
				`engine: lifecycle event backlog full at ${this.pendingBatches} batches, dropped ${batch.length} event(s)`,
			);
			return await this.inFlight;
		}

		this.pendingBatches++;
		this.inFlight = this.inFlight.then(async () => {
			try {
				// Shutdown has stopped waiting, so the chain behind it is abandoned
				// rather than worked through one deadline at a time.
				if (this.abandoned)
					throw new Error('lifecycle event publisher stopped before the batch was sent');
				await this.sendWithinDeadline(batch);
			} catch (error) {
				// Caught inside the chain: a rejected `inFlight` would silently stop
				// every later flush.
				console.warn(
					`engine: lifecycle event callback failed, dropped ${batch.length} event(s)`,
					error,
				);
			} finally {
				this.pendingBatches--;
			}
		});

		return await this.inFlight;
	}

	async stop(): Promise<void> {
		// Set first, so an event from a straggling handler cannot land behind the
		// final flush and be stranded in the buffer.
		this.stopped = true;

		// Bounded as a whole, not just per send: a backlog of hung callbacks must
		// not stretch shutdown out one deadline at a time. Abandoning what is left
		// costs the host freshness, never correctness.
		const deadline = delay(this.sendTimeoutMs);
		try {
			await Promise.race([
				this.flush(),
				deadline.promise.then(() => {
					this.abandoned = true;
				}),
			]);
		} finally {
			deadline.cancel();
		}
	}

	/** Awaits the callback, abandoning it once it outlives its deadline. */
	private async sendWithinDeadline(batch: LifecycleEvent[]): Promise<void> {
		const overdue = new AbortController();
		const deadline = delay(this.sendTimeoutMs);
		try {
			// `Promise.race` stays subscribed to the abandoned send, so a rejection
			// arriving after the deadline is handled rather than unhandled.
			await Promise.race([
				this.send(batch, overdue.signal),
				deadline.promise.then(() => {
					const error = new Error(
						`lifecycle event callback did not settle within ${this.sendTimeoutMs}ms`,
					);
					// The engine stops waiting either way. The signal is what lets the
					// host cancel the request behind the callback.
					overdue.abort(error);
					throw error;
				}),
			]);
		} finally {
			deadline.cancel();
		}
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

/** A cancellable timer as a promise. Unref'd: a deadline never holds the process open. */
function delay(ms: number): { promise: Promise<void>; cancel: () => void } {
	let timer: NodeJS.Timeout | undefined;
	const promise = new Promise<void>((resolve) => {
		timer = setTimeout(resolve, ms);
		timer.unref();
	});
	return { promise, cancel: () => clearTimeout(timer) };
}
