import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchingLifecycleEventPublisher } from '../batching-lifecycle-event-publisher';
import type { LifecycleEvent } from '../lifecycle-event.types';

const FLUSH_MS = 50;
const TIMEOUT_MS = 1000;

const event = (executionId: string): LifecycleEvent => ({
	type: 'execution:completed',
	executionId,
	workflowId: 'wf-1',
	at: '2026-08-24T10:00:00.000Z',
});

const a = event('exec-a');
const b = event('exec-b');
const c = event('exec-c');
const d = event('exec-d');

/** Every send is handed the batch plus the signal that abandons it. */
const signal = expect.any(AbortSignal) as AbortSignal;

describe('BatchingLifecycleEventPublisher', () => {
	const capture = () => {
		let signal: AbortSignal | undefined;
		const send = vi.fn(async (_batch: LifecycleEvent[], given: AbortSignal) => {
			signal = given;
			await new Promise<void>(() => {});
		});
		return { send, signal: () => signal };
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('coalesces the events published within one interval into one call', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		publisher.publish(b);
		publisher.publish(c);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send).toHaveBeenCalledExactlyOnceWith([a, b, c], signal);
	});

	it('sends nothing before the interval elapses', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS - 1);

		expect(send).not.toHaveBeenCalled();
	});

	it('never calls the send when nothing was published', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		await vi.advanceTimersByTimeAsync(FLUSH_MS * 10);

		expect(send).not.toHaveBeenCalled();
	});

	it('arms one timer per batch, not per event', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b], signal],
		]);
	});

	it('delivers batches in order, one flush in flight at a time', async () => {
		let release: () => void = () => {};
		const firstCall = new Promise<void>((resolve) => {
			release = resolve;
		});
		const send = vi.fn().mockReturnValueOnce(firstCall).mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		// The second batch waits on the first, which has not resolved.
		expect(send).toHaveBeenCalledExactlyOnceWith([a], signal);

		release();
		await vi.advanceTimersByTimeAsync(0);

		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b], signal],
		]);
	});

	it('coalesces the backlog into one batch while the host is slow', async () => {
		let release: () => void = () => {};
		const send = vi
			.fn()
			.mockReturnValueOnce(
				new Promise<void>((resolve) => {
					release = resolve;
				}),
			)
			.mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(c);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		release();
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		// The two that waited out `a` go to the host together.
		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b, c], signal],
		]);
	});

	it('starts no second drain when the callback publishes re-entrantly', async () => {
		let inFlight = 0;
		let concurrent = 0;
		// The callback needs the publisher that calls it.
		const host: { publisher?: BatchingLifecycleEventPublisher } = {};
		const send = vi.fn(async (batch: LifecycleEvent[]) => {
			inFlight++;
			concurrent = Math.max(concurrent, inFlight);
			// A host callback that publishes back into the engine.
			if (batch[0] === a) host.publisher?.publish(c);
			await Promise.resolve();
			inFlight--;
		});
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 1);
		host.publisher = publisher;

		publisher.publish(a);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(concurrent).toBe(1);
		expect(send.mock.calls.map(([batch]) => batch)).toEqual([[a], [b], [c]]);
	});

	it('keeps flushing after the callback rejects', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const send = vi
			.fn()
			.mockRejectedValueOnce(new Error('control plane down'))
			.mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b], signal],
		]);
		expect(console.warn).toHaveBeenCalledWith(
			'engine: lifecycle event callback failed, dropped 1 event(s)',
			expect.any(Error),
		);
	});

	it('abandons a batch whose callback outlives the deadline, and keeps flushing', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const send = vi
			.fn()
			.mockReturnValueOnce(new Promise<void>(() => {}))
			.mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 500, 5_000, TIMEOUT_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		// The second batch is still waiting on the first, which never settles.
		expect(send).toHaveBeenCalledExactlyOnceWith([a], signal);

		await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b], signal],
		]);
		expect(console.warn).toHaveBeenCalledWith(
			'engine: lifecycle event callback failed, dropped 1 event(s)',
			expect.objectContaining({
				message: `lifecycle event callback did not settle within ${TIMEOUT_MS}ms`,
			}),
		);
	});

	it('aborts the callback signal once the batch outlives its deadline', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { send, signal } = capture();
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 500, 5_000, TIMEOUT_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		expect(signal()?.aborted).toBe(false);

		await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

		expect(signal()?.aborted).toBe(true);
	});

	it('drops new events instead of growing the backlog past the cap', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		let release: () => void = () => {};
		const send = vi
			.fn()
			.mockReturnValueOnce(
				new Promise<void>((resolve) => {
					release = resolve;
				}),
			)
			.mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 1, 2, TIMEOUT_MS);

		// One event on the wire, two waiting behind it; a fourth has nowhere to go.
		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(0);
		for (const published of [b, c, d]) publisher.publish(published);

		release();
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([
			[[a], signal],
			[[b], signal],
			[[c], signal],
		]);
		expect(console.warn).toHaveBeenCalledWith(
			'engine: lifecycle event backlog full, dropped 1 event(s)',
		);
	});

	it('stops within the deadline when the callback never settles', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const send = vi.fn().mockReturnValue(new Promise<void>(() => {}));
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 500, 5_000, TIMEOUT_MS);

		publisher.publish(a);
		let stopped = false;
		const stopping = publisher.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped).toBe(false);

		await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
		await stopping;

		expect(stopped).toBe(true);
	});

	it('drops what is still buffered once stopping gives up', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		// Every send hangs, so the drain outlives the deadline stop() waits on.
		const { send } = capture();
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 1, 500, TIMEOUT_MS);

		for (const published of [a, b, c]) publisher.publish(published);

		const stopping = publisher.stop();
		await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 4);
		await stopping;

		// Shutdown stopped waiting before `b` and `c` had their turn.
		expect(send.mock.calls.map(([batch]) => batch)).toEqual([[a]]);
		expect(console.warn).toHaveBeenCalledWith(
			'engine: lifecycle event publisher stopped, dropped 2 unsent event(s)',
		);
	});

	it('flushes early on reaching the buffer cap, dropping nothing', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS, 2);

		publisher.publish(a);
		publisher.publish(b);
		publisher.publish(c);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([
			[[a, b], signal],
			[[c], signal],
		]);
	});

	it('delivers the buffer on stop without waiting for the interval', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await publisher.stop();

		expect(send).toHaveBeenCalledExactlyOnceWith([a], signal);
	});

	it('waits on a flush already in flight when stopping', async () => {
		let release: () => void = () => {};
		const send = vi.fn().mockReturnValueOnce(
			new Promise<void>((resolve) => {
				release = resolve;
			}),
		);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		let stopped = false;
		const stopping = publisher.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped).toBe(false);

		release();
		await stopping;
		expect(stopped).toBe(true);
	});

	it('does not send the buffer twice after stopping', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await publisher.stop();
		await vi.advanceTimersByTimeAsync(FLUSH_MS * 2);

		expect(send).toHaveBeenCalledExactlyOnceWith([a], signal);
	});

	it('ignores events published after stopping', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingLifecycleEventPublisher(send, FLUSH_MS);

		await publisher.stop();
		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS * 2);

		expect(send).not.toHaveBeenCalled();
	});
});
