import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchingStatusPublisher } from '../batching-status-publisher';
import type { StatusUpdate } from '../status-update.types';

const FLUSH_MS = 50;

const update = (executionId: string): StatusUpdate => ({
	type: 'execution:completed',
	executionId,
	workflowId: 'wf-1',
	at: '2026-08-24T10:00:00.000Z',
});

const a = update('exec-a');
const b = update('exec-b');
const c = update('exec-c');

describe('BatchingStatusPublisher', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('coalesces the updates published within one interval into one call', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		publisher.publish(b);
		publisher.publish(c);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send).toHaveBeenCalledExactlyOnceWith([a, b, c]);
	});

	it('sends nothing before the interval elapses', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS - 1);

		expect(send).not.toHaveBeenCalled();
	});

	it('never calls the send when nothing was published', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		new BatchingStatusPublisher(send, FLUSH_MS);

		await vi.advanceTimersByTimeAsync(FLUSH_MS * 10);

		expect(send).not.toHaveBeenCalled();
	});

	it('arms one timer per batch, not per update', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([[[a]], [[b]]]);
	});

	it('delivers batches in order, one flush in flight at a time', async () => {
		let release: () => void = () => {};
		const firstCall = new Promise<void>((resolve) => {
			release = resolve;
		});
		const send = vi.fn().mockReturnValueOnce(firstCall).mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		// The second batch waits on the first, which has not resolved.
		expect(send).toHaveBeenCalledExactlyOnceWith([a]);

		release();
		await vi.advanceTimersByTimeAsync(0);

		expect(send.mock.calls).toEqual([[[a]], [[b]]]);
	});

	it('keeps flushing after the callback rejects', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const send = vi
			.fn()
			.mockRejectedValueOnce(new Error('control plane down'))
			.mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);
		publisher.publish(b);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([[[a]], [[b]]]);
		expect(console.warn).toHaveBeenCalledWith(
			'engine: status callback failed, dropped 1 update(s)',
			expect.any(Error),
		);
	});

	it('flushes early on reaching the buffer cap, dropping nothing', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS, 2);

		publisher.publish(a);
		publisher.publish(b);
		publisher.publish(c);
		await vi.advanceTimersByTimeAsync(FLUSH_MS);

		expect(send.mock.calls).toEqual([[[a, b]], [[c]]]);
	});

	it('delivers the buffer on stop without waiting for the interval', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await publisher.stop();

		expect(send).toHaveBeenCalledExactlyOnceWith([a]);
	});

	it('waits on a flush already in flight when stopping', async () => {
		let release: () => void = () => {};
		const send = vi.fn().mockReturnValueOnce(
			new Promise<void>((resolve) => {
				release = resolve;
			}),
		);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

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
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		publisher.publish(a);
		await publisher.stop();
		await vi.advanceTimersByTimeAsync(FLUSH_MS * 2);

		expect(send).toHaveBeenCalledExactlyOnceWith([a]);
	});

	it('ignores updates published after stopping', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const publisher = new BatchingStatusPublisher(send, FLUSH_MS);

		await publisher.stop();
		publisher.publish(a);
		await vi.advanceTimersByTimeAsync(FLUSH_MS * 2);

		expect(send).not.toHaveBeenCalled();
	});
});
