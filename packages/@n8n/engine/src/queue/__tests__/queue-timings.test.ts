import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { QueueTimings, QueueTimingsReporter, queueTimingsOf, SampleWindow } from '../queue-timings';

describe('SampleWindow', () => {
	it('summarizes the samples with nearest-rank percentiles', () => {
		const window = new SampleWindow();
		for (let value = 100; value >= 1; value--) window.add(value);

		expect(window.takeSummary()).toEqual({ n: 100, p50: 50, p90: 90, p99: 99, max: 100 });
	});

	it('forgets the samples after a summary', () => {
		const window = new SampleWindow();
		window.add(5);
		window.takeSummary();

		expect(window.takeSummary()).toEqual({ n: 0 });
	});

	it('keeps only the last samples, but counts all of them', () => {
		const window = new SampleWindow(4);
		for (const value of [1000, 1, 2, 3, 4]) window.add(value);

		expect(window.takeSummary()).toEqual({ n: 5, p50: 2, p90: 4, p99: 4, max: 1000 });
	});
});

describe('QueueTimings', () => {
	it('records a pickup gap only when the message was waiting before the slot became free', () => {
		const timings = new QueueTimings();
		timings.handlerStarted(0, 10);
		timings.handlerEnded(20);
		// Published at 15, before the slot became free at 20: a hand-off gap of 3.
		timings.handlerStarted(15, 23);
		timings.handlerEnded(30);
		// Published at 40, after the slot became free: an idle slot, not a gap.
		timings.handlerStarted(40, 41);

		const summary = timings.takeSummary();
		expect(summary.n).toBe(3);
		expect(summary.latency_ms).toEqual({ n: 3, p50: 8, p90: 10, p99: 10, max: 10 });
		expect(summary.pickup_gap_ms).toEqual({ n: 1, p50: 3, p90: 3, p99: 3, max: 3 });
		expect(summary.fetch_ms).toBeUndefined();
	});

	it('pairs the next start with the slot that became free first', () => {
		const timings = new QueueTimings();
		timings.handlerStarted(0, 1);
		timings.handlerStarted(0, 1);
		timings.handlerEnded(10);
		timings.handlerEnded(20);
		timings.handlerStarted(5, 25);

		expect(timings.takeSummary().pickup_gap_ms).toEqual({
			n: 1,
			p50: 15,
			p90: 15,
			p99: 15,
			max: 15,
		});
	});

	it('records no latency or gap without a publish time', () => {
		const timings = new QueueTimings(true);
		timings.handlerEnded(10);
		timings.handlerStarted(undefined, 12);
		timings.fetched(2.5);

		expect(timings.takeSummary()).toEqual({
			n: 1,
			latency_ms: { n: 0 },
			pickup_gap_ms: { n: 0 },
			fetch_ms: { n: 1, p50: 2.5, p90: 2.5, p99: 2.5, max: 2.5 },
		});
	});
});

describe('queueTimingsOf', () => {
	it('returns the timings of a queue that records them', () => {
		const timings = new QueueTimings();

		expect(queueTimingsOf({ timings })).toBe(timings);
		expect(queueTimingsOf({ timings: 'other' })).toBeUndefined();
		expect(queueTimingsOf({})).toBeUndefined();
	});
});

describe('QueueTimingsReporter', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('logs one line per interval and resets the timings', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		const info = vi.fn();
		const logger: EngineLogger = { debug: () => {}, info, warn: () => {}, error: () => {} };
		const orchestration = new QueueTimings();
		const step = new QueueTimings(true);
		const reporter = new QueueTimingsReporter(logger, { orchestration, step }, 30_000);
		reporter.start();
		orchestration.handlerStarted(0, 4);
		step.fetched(1);

		await vi.advanceTimersByTimeAsync(30_000);
		await vi.advanceTimersByTimeAsync(30_000);
		reporter.stop();

		expect(info).toHaveBeenCalledTimes(2);
		const [firstLine] = info.mock.calls[0] as [string];
		const [secondLine] = info.mock.calls[1] as [string];
		expect(firstLine).toMatch(/^engine-queue-timings \{/);
		const first = JSON.parse(firstLine.slice('engine-queue-timings '.length));
		expect(first).toEqual({
			window_s: expect.any(Number),
			orchestration: {
				n: 1,
				latency_ms: { n: 1, p50: 4, p90: 4, p99: 4, max: 4 },
				pickup_gap_ms: { n: 0 },
			},
			step: {
				n: 0,
				latency_ms: { n: 0 },
				pickup_gap_ms: { n: 0 },
				fetch_ms: { n: 1, p50: 1, p90: 1, p99: 1, max: 1 },
			},
			eventLoopDelay_ms: expect.objectContaining({ n: expect.any(Number) }),
		});
		const second = JSON.parse(secondLine.slice('engine-queue-timings '.length));
		expect(second.orchestration.n).toBe(0);
		expect(second.step.fetch_ms).toEqual({ n: 0 });
	});
});
