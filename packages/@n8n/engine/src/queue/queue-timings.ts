import { monitorEventLoopDelay, performance, type IntervalHistogram } from 'node:perf_hooks';

import type { EngineLogger } from '../logging';

/**
 * Benchmark-only hand-off timings of the engine work queues. Each queue
 * records into its own `QueueTimings`, and `QueueTimingsReporter` logs one
 * summary line per interval.
 */

/** Epoch milliseconds with sub-millisecond precision. */
export function epochNowMs(): number {
	return performance.timeOrigin + performance.now();
}

export interface SampleSummary {
	n: number;
	p50?: number;
	p90?: number;
	p99?: number;
	max?: number;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Picks the nearest-rank percentile `p` (0-100) of ascending `sorted`. */
function percentile(sorted: Float64Array, p: number): number {
	const rank = Math.ceil((p / 100) * sorted.length) - 1;
	return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

/** Keeps the last `capacity` samples of one metric, so memory stays fixed under any load. */
export class SampleWindow {
	private readonly samples: Float64Array;

	private count = 0;

	private max = Number.NEGATIVE_INFINITY;

	constructor(capacity = 20_000) {
		this.samples = new Float64Array(capacity);
	}

	add(value: number): void {
		this.samples[this.count % this.samples.length] = value;
		this.count += 1;
		if (value > this.max) this.max = value;
	}

	/** Summarizes the samples since the last call and forgets them. `n` counts every sample, `max` too. */
	takeSummary(): SampleSummary {
		const n = this.count;
		const max = this.max;
		this.count = 0;
		this.max = Number.NEGATIVE_INFINITY;
		if (n === 0) return { n };
		const sorted = this.samples.slice(0, Math.min(n, this.samples.length)).sort();
		return {
			n,
			p50: round(percentile(sorted, 50)),
			p90: round(percentile(sorted, 90)),
			p99: round(percentile(sorted, 99)),
			max: round(max),
		};
	}
}

export interface QueueTimingsSummary {
	/** Handlers started. */
	n: number;
	latency_ms: SampleSummary;
	pickup_gap_ms: SampleSummary;
	fetch_ms?: SampleSummary;
}

/** The timings of one queue, all in milliseconds. */
export class QueueTimings {
	/** From `publish()` of a message to the start of its handler. */
	readonly latency = new SampleWindow();

	/** From the end of a handler to the start of the next one on that slot, while work was waiting. */
	readonly pickupGap = new SampleWindow();

	/** Each fetch that returned a message. Only queues that fetch record it. */
	readonly fetch = new SampleWindow();

	private started = 0;

	/** When each free slot became free, oldest first. A slot that never ran a handler has no entry. */
	private readonly freeSince: number[] = [];

	constructor(private readonly measuresFetch = false) {}

	/** `enqueuedAt` is the epoch time of `publish()`, if the message carries it. */
	handlerStarted(enqueuedAt: number | undefined, now = epochNowMs()): void {
		this.started += 1;
		if (enqueuedAt !== undefined) this.latency.add(now - enqueuedAt);
		// The slot that became free first is the one the queue fills next.
		const freeSince = this.freeSince.shift();
		if (freeSince !== undefined && enqueuedAt !== undefined && enqueuedAt < freeSince) {
			this.pickupGap.add(now - freeSince);
		}
	}

	handlerEnded(now = epochNowMs()): void {
		this.freeSince.push(now);
	}

	fetched(durationMs: number): void {
		this.fetch.add(durationMs);
	}

	takeSummary(): QueueTimingsSummary {
		const summary: QueueTimingsSummary = {
			n: this.started,
			latency_ms: this.latency.takeSummary(),
			pickup_gap_ms: this.pickupGap.takeSummary(),
		};
		this.started = 0;
		const fetch = this.fetch.takeSummary();
		if (this.measuresFetch) summary.fetch_ms = fetch;
		return summary;
	}
}

/** Returns the timings that a queue records, if it records any. */
export function queueTimingsOf(queue: object): QueueTimings | undefined {
	return 'timings' in queue && queue.timings instanceof QueueTimings ? queue.timings : undefined;
}

export const QUEUE_TIMINGS_LOG_PREFIX = 'engine-queue-timings';

const NS_PER_MS = 1_000_000;

/** Logs one line of queue timings and event-loop delay every interval, then resets them. */
export class QueueTimingsReporter {
	private timer: NodeJS.Timeout | undefined;

	private eventLoopDelay: IntervalHistogram | undefined;

	private windowStart = 0;

	constructor(
		private readonly logger: EngineLogger,
		private readonly queues: { orchestration?: QueueTimings; step?: QueueTimings },
		private readonly intervalMs = 30_000,
	) {}

	start(): void {
		if (this.timer) return;
		this.eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
		this.eventLoopDelay.enable();
		this.windowStart = performance.now();
		this.timer = setInterval(() => this.report(), this.intervalMs);
		this.timer.unref();
	}

	stop(): void {
		clearInterval(this.timer);
		this.timer = undefined;
		this.eventLoopDelay?.disable();
		this.eventLoopDelay = undefined;
	}

	report(): void {
		this.logger.info(`${QUEUE_TIMINGS_LOG_PREFIX} ${JSON.stringify(this.takeSummary())}`);
	}

	takeSummary(): Record<string, unknown> {
		const now = performance.now();
		const summary: Record<string, unknown> = {
			window_s: Math.round((now - this.windowStart) / 100) / 10,
		};
		this.windowStart = now;
		if (this.queues.orchestration) summary.orchestration = this.queues.orchestration.takeSummary();
		if (this.queues.step) summary.step = this.queues.step.takeSummary();
		const histogram = this.eventLoopDelay;
		if (histogram) {
			summary.eventLoopDelay_ms =
				histogram.count === 0
					? { n: 0 }
					: {
							n: histogram.count,
							p50: round(histogram.percentile(50) / NS_PER_MS),
							p99: round(histogram.percentile(99) / NS_PER_MS),
							max: round(histogram.max / NS_PER_MS),
						};
			histogram.reset();
		}
		return summary;
	}
}
