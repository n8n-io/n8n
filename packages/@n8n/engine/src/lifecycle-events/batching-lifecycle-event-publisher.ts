import type { LifecycleEventPublisher } from './lifecycle-event-publisher';
import { MAX_LIFECYCLE_EVENTS_PER_BATCH } from './lifecycle-event.schema';
import type { LifecycleEventCallback, LifecycleEvent } from './lifecycle-event.types';

/** Short enough that a host's view feels live, long enough to coalesce a fan-out. */
export const DEFAULT_LIFECYCLE_EVENT_FLUSH_INTERVAL_MS = 50;

/**
 * Deadline on one callback invocation, and on the whole drain in `stop()`. A
 * callback that hangs instead of rejecting must not wedge the drain or hold
 * shutdown open.
 */
export const DEFAULT_LIFECYCLE_EVENT_SEND_TIMEOUT_MS = 10_000;

/** Events allowed to wait for the host before new ones are dropped. */
export const DEFAULT_MAX_PENDING_EVENTS = 20 * MAX_LIFECYCLE_EVENTS_PER_BATCH;

/**
 * Buffers events and hands them to the host's callback in batches.
 *
 * One drain loop owns delivery: it takes a batch off the front of the buffer,
 * awaits the callback, and repeats. So batches reach the host in the order they
 * were produced, and only one is ever on the wire. A callback that rejects, or
 * that outlives its deadline, is logged and its batch dropped — the data plane
 * is the source of truth, so a failed delivery costs the host freshness, never
 * correctness. A batch dropped on its deadline aborts the signal its callback
 * was given, so the host can cancel the request behind it.
 *
 * A host slower than the engine is bounded rather than buffered: at most
 * `maxPending` events wait for it, and events published past that cap are
 * dropped instead of growing the backlog. Because batches are cut at send time,
 * a backlog coalesces into full batches rather than staying fragmented.
 *
 * publish() ──► pending[]  ──► drain(): while (pending && !abandoned) { splice; send }
 *                ▲                        │
 *             arm()/cap              withDeadline()
 */
export class BatchingLifecycleEventPublisher implements LifecycleEventPublisher {
	/** Events not yet sent. The drain loop slices batches off the front. */
	private readonly pending: LifecycleEvent[] = [];

	private flushTimer: NodeJS.Timeout | undefined;

	/** The drain loop while it runs, `undefined` while idle. */
	private draining: Promise<void> | undefined;

	private stopped = false;

	/** Set when shutdown gives up waiting. The loop then abandons what is left. */
	private abandoned = false;

	/** Events dropped at the cap, not yet reported. */
	private dropped = 0;

	constructor(
		private readonly send: LifecycleEventCallback,
		private readonly flushIntervalMs: number = DEFAULT_LIFECYCLE_EVENT_FLUSH_INTERVAL_MS,
		private readonly batchSize: number = MAX_LIFECYCLE_EVENTS_PER_BATCH,
		private readonly maxPending: number = DEFAULT_MAX_PENDING_EVENTS,
		private readonly sendTimeoutMs: number = DEFAULT_LIFECYCLE_EVENT_SEND_TIMEOUT_MS,
	) {}

	publish(event: LifecycleEvent): void {
		if (this.stopped) return;

		// Dropping the newest keeps the backlog bounded and the delivered prefix
		// in order. Buffering it instead would grow engine memory for as long as
		// the host stays slow.
		if (this.pending.length >= this.maxPending) {
			this.dropped++;
			return;
		}

		this.pending.push(event);

		// A full batch goes now rather than waiting out the interval: a
		// `step:completed` carries data the host cannot reconstruct from a later
		// event, so the buffer must not sit at its cap.
		if (this.pending.length >= this.batchSize) this.startDraining();
		else this.arm();
	}

	async stop(): Promise<void> {
		// Set first, so an event from a straggling handler cannot land behind the
		// final drain and be stranded in the buffer.
		this.stopped = true;
		this.startDraining();

		// Bounded as a whole, not just per send: a backlog of hung callbacks must
		// not stretch shutdown out one deadline at a time. Abandoning what is left
		// costs the host freshness, never correctness.
		try {
			await withDeadline('lifecycle event drain', this.sendTimeoutMs, async () => {
				await this.draining;
			});
		} catch {
			this.abandoned = true;
		}

		this.reportDropped();
	}

	/** Starts the drain loop, unless it is already running. */
	private startDraining(): void {
		this.disarm();
		if (this.draining) return;

		this.draining = this.drain().finally(() => {
			this.draining = undefined;
		});
	}

	/** Sends the buffered events, one batch at a time, until none are left. */
	private async drain(): Promise<void> {
		// Yields before the first send, so `startDraining` has recorded this loop
		// by the time the host's callback runs. The callback runs synchronously
		// from here, and one that publishes back into the engine would otherwise
		// find no loop recorded and start a second one. It also keeps `publish`
		// free of host code, as its contract promises.
		await Promise.resolve();

		while (this.pending.length > 0 && !this.abandoned) {
			const batch = this.pending.splice(0, this.batchSize);
			this.reportDropped();

			try {
				await withDeadline(
					'lifecycle event callback',
					this.sendTimeoutMs,
					async (signal) => await this.send(batch, signal),
				);
			} catch (error) {
				console.warn(
					`engine: lifecycle event callback failed, dropped ${batch.length} event(s)`,
					error,
				);
			}
		}

		// Only reachable once shutdown gave up: whatever is still buffered has no
		// one left to wait for it.
		if (this.pending.length > 0) {
			console.warn(
				`engine: lifecycle event publisher stopped, dropped ${this.pending.length} unsent event(s)`,
			);
			this.pending.length = 0;
		}
	}

	/** Reports the events the cap dropped, as one line per overflow. */
	private reportDropped(): void {
		if (this.dropped === 0) return;

		console.warn(`engine: lifecycle event backlog full, dropped ${this.dropped} event(s)`);
		this.dropped = 0;
	}

	/** Schedules the next drain, unless one is already scheduled. */
	private arm(): void {
		if (this.flushTimer) return;

		this.flushTimer = setTimeout(() => {
			this.flushTimer = undefined;
			this.startDraining();
		}, this.flushIntervalMs);
		// A pending drain must not hold the process open on shutdown.
		this.flushTimer.unref();
	}

	private disarm(): void {
		if (!this.flushTimer) return;

		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
	}
}

/**
 * Runs `work` under a deadline. On expiry the signal aborts, so the work can
 * cancel the request behind it, and this rejects. The abandoned work is left to
 * settle on its own: `Promise.race` stays subscribed to it, so a rejection
 * arriving after the deadline is handled rather than unhandled.
 *
 * The timer is unref'd — a deadline never holds the process open.
 */
async function withDeadline<T>(
	what: string,
	ms: number,
	work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const overdue = new AbortController();
	let timer: NodeJS.Timeout | undefined;

	try {
		return await Promise.race([
			work(overdue.signal),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					const error = new Error(`${what} did not settle within ${ms}ms`);
					overdue.abort(error);
					reject(error);
				}, ms);
				timer.unref();
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}
