import type { LifecycleEventPublisher } from './lifecycle-event-publisher';
import {
	MAX_LIFECYCLE_EVENTS_PER_BATCH,
	MAX_LIFECYCLE_EVENT_BATCH_BYTES,
	MAX_STEP_COMPLETED_OUTPUTS_BYTES,
} from './lifecycle-event.schema';
import type { LifecycleEventCallback, LifecycleEvent } from './lifecycle-event.types';

/** Short enough to feel live, long enough to coalesce a burst. */
export const DEFAULT_LIFECYCLE_EVENT_FLUSH_INTERVAL_MS = 50;

/** A callback that hangs must not wedge delivery or hold shutdown open. */
export const DEFAULT_LIFECYCLE_EVENT_SEND_TIMEOUT_MS = 10_000;

/** Events allowed to wait for the host before new ones are dropped. */
export const DEFAULT_MAX_PENDING_EVENTS = 20 * MAX_LIFECYCLE_EVENTS_PER_BATCH;

/** Bytes `JSON.stringify` adds around an event's `outputs` value: `,"outputs":`. */
const OUTPUTS_KEY_BYTES = 11;

/** An event waiting to be sent, with its size measured once on arrival. */
interface PendingEvent {
	event: LifecycleEvent;
	bytes: number;
}

/**
 * Buffers events and hands them to the host's callback in batches.
 *
 * One batch is on the wire at a time, in the order the events were produced. A
 * batch that fails or outlives its deadline is dropped: the data plane is the
 * source of truth, so a lost delivery costs the host freshness, never
 * correctness. A slow host is bounded rather than buffered — events published
 * past `maxPending` are dropped too.
 */
export class BatchingLifecycleEventPublisher implements LifecycleEventPublisher {
	/** Events not yet sent. Batches are cut off the front. */
	private readonly pending: PendingEvent[] = [];

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
		private readonly maxBatchBytes: number = MAX_LIFECYCLE_EVENT_BATCH_BYTES,
	) {}

	publish(event: LifecycleEvent): void {
		if (this.stopped) return;

		// Dropping the newest bounds memory when the host is the slow side.
		if (this.pending.length >= this.maxPending) {
			this.dropped++;
			return;
		}

		this.pending.push(measure(event));

		// A full batch does not wait out the interval.
		if (this.pending.length >= this.batchSize) this.startDraining();
		else this.arm();
	}

	async stop(): Promise<void> {
		// Set first, so a straggling handler's event is not stranded in the buffer.
		this.stopped = true;
		this.startDraining();

		// One deadline for the whole drain: a backlog of hung callbacks must not
		// stretch shutdown out one deadline at a time.
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
		// Yield first: the callback runs synchronously below, and one that publishes
		// back into the engine must find this loop already recorded.
		await Promise.resolve();

		while (this.pending.length > 0 && !this.abandoned) {
			const batch = this.takeBatch();
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

		// Shutdown gave up, so nothing is left to wait for these.
		if (this.pending.length > 0) {
			console.warn(
				`engine: lifecycle event publisher stopped, dropped ${this.pending.length} unsent event(s)`,
			);
			this.pending.length = 0;
		}
	}

	/**
	 * Cuts the next batch off the front, at the count cap or the byte cap,
	 * whichever comes first. The first event always goes, so a batch is never
	 * empty: `measure` keeps every event under the byte cap on its own.
	 */
	private takeBatch(): LifecycleEvent[] {
		let count = 0;
		let bytes = 0;
		while (count < this.pending.length && count < this.batchSize) {
			bytes += this.pending[count].bytes;
			if (bytes > this.maxBatchBytes && count > 0) break;
			count++;
		}

		return this.pending.splice(0, count).map(({ event }) => event);
	}

	/** One line per overflow, not one per dropped event. */
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
		// Unref'd: a pending drain must not hold the process open.
		this.flushTimer.unref();
	}

	private disarm(): void {
		if (!this.flushTimer) return;

		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
	}
}

/**
 * Sizes an event for batch cutting, once, on arrival. The envelope is measured
 * exactly: its strings come from the workflow, so a node name can make an
 * identifier-only event arbitrarily large. The outputs are measured apart from
 * it, so the one large value is serialized a single time. Outputs over
 * `MAX_STEP_COMPLETED_OUTPUTS_BYTES` are dropped from the event: the host still
 * learns the step completed and can read the outputs from the data plane.
 */
function measure(event: LifecycleEvent): PendingEvent {
	if (event.type !== 'step:completed' || event.outputs === undefined) {
		return { event, bytes: serializedBytes(event) };
	}

	const { outputs, ...envelope } = event;
	const envelopeBytes = serializedBytes(envelope) + OUTPUTS_KEY_BYTES;
	const outputBytes = serializedBytes(outputs);
	if (outputBytes <= MAX_STEP_COMPLETED_OUTPUTS_BYTES) {
		return { event, bytes: envelopeBytes + outputBytes };
	}

	console.warn(
		`engine: lifecycle event outputs over the wire limit, sent step:completed without outputs (execution ${event.executionId}, step ${event.stepId}, ${outputBytes} bytes)`,
	);
	return { event: envelope, bytes: envelopeBytes - OUTPUTS_KEY_BYTES };
}

function serializedBytes(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value));
}

/**
 * Runs `work` under a deadline. On expiry this rejects and the signal aborts, so
 * `work` can cancel what it started. Abandoned work is left to settle.
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
