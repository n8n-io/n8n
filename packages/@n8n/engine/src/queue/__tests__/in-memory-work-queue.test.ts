import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryWorkQueue } from '../in-memory-work-queue';

interface Msg {
	type: 'x';
	n: number;
}

/**
 * A consumer that records what it receives and resolves `complete` once
 * `expected` messages have arrived — dispatch is asynchronous, so tests need
 * their own signal rather than a hook into the queue.
 */
function collect(expected: number) {
	const received: Msg[] = [];
	let done!: () => void;
	const complete = new Promise<void>((resolve) => (done = resolve));
	const handler = async (message: Msg) => {
		received.push(message);
		if (received.length >= expected) done();
		await Promise.resolve();
	};
	return { received, complete, handler };
}

describe('InMemoryWorkQueue', () => {
	afterEach(() => vi.restoreAllMocks());

	it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		'rejects invalid concurrency %s',
		(concurrency) => {
			expect(() => new InMemoryWorkQueue<Msg>(undefined, concurrency)).toThrow(
				'Work queue concurrency must be a positive safe integer',
			);
		},
	);

	it.each([1, 2, 5, 10])(
		'limits in-flight handlers to %s and refills when any handler finishes',
		async (concurrency) => {
			const queue = new InMemoryWorkQueue<Msg>(undefined, concurrency);
			const gates = Array.from({ length: concurrency + 2 }, () => createDeferredPromise());
			const started = gates.map(() => createDeferredPromise());
			const received: number[] = [];
			for (let n = 0; n < gates.length; n++) await queue.publish({ type: 'x', n });

			queue.start(async ({ n }) => {
				received.push(n);
				started[n].resolve();
				await gates[n].promise;
			});
			await Promise.all(started.slice(0, concurrency).map(async ({ promise }) => await promise));
			expect(received).toEqual(Array.from({ length: concurrency }, (_, n) => n));

			// Keep the oldest handler blocked when there is more than one slot.
			gates[concurrency - 1].resolve();
			await started[concurrency].promise;
			expect(received).toEqual(Array.from({ length: concurrency + 1 }, (_, n) => n));

			const stopped = queue.stop();
			for (const gate of gates) gate.resolve();
			await stopped;
			expect(received).toHaveLength(concurrency + 1);
		},
	);

	it('keeps the default dispatcher serial', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		const release = createDeferredPromise();
		const { received, complete, handler } = collect(2);
		queue.start(async (message) => {
			await handler(message);
			if (message.n === 1) await release.promise;
		});

		await queue.publish({ type: 'x', n: 1 });
		await queue.publish({ type: 'x', n: 2 });
		expect(received.map(({ n }) => n)).toEqual([1]);
		release.resolve();
		await complete;
		await queue.stop();
	});

	it.each(['throw', 'reject'])('releases a slot after a handler failure (%s)', async (failure) => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const queue = new InMemoryWorkQueue<Msg>(undefined, 2);
		const release = createDeferredPromise();
		const thirdStarted = createDeferredPromise();
		const received: number[] = [];
		const error = new Error('boom');
		// oxlint-disable-next-line typescript/promise-function-async -- Test a throw before the handler returns a promise.
		queue.start(({ n }) => {
			received.push(n);
			if (n === 1) {
				if (failure === 'throw') throw error;
				return Promise.reject(error);
			}
			if (n === 3) thirdStarted.resolve();
			return release.promise;
		});

		await Promise.all([1, 2, 3].map(async (n) => await queue.publish({ type: 'x', n })));
		await thirdStarted.promise;
		expect(received).toEqual([1, 2, 3]);
		expect(log).toHaveBeenCalledOnce();
		const stopped = queue.stop();
		release.resolve();
		await stopped;
	});

	it('waits for every active handler and keeps pending work for a restart', async () => {
		const queue = new InMemoryWorkQueue<Msg>(undefined, 2);
		const gates = [createDeferredPromise(), createDeferredPromise()];
		const received: number[] = [];
		queue.start(async ({ n }) => {
			received.push(n);
			await gates[n - 1].promise;
		});
		for (const n of [1, 2, 3]) await queue.publish({ type: 'x', n });
		const onStop = vi.fn();
		const stopping = [queue.stop().then(onStop), queue.stop().then(onStop)];

		gates[1].resolve();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(onStop).not.toHaveBeenCalled();
		expect(received).toEqual([1, 2]);
		await queue.publish({ type: 'x', n: 4 });
		gates[0].resolve();
		await Promise.all(stopping);
		expect(onStop).toHaveBeenCalledTimes(2);
		expect(received).toEqual([1, 2]);

		const restarted = collect(2);
		queue.start(restarted.handler);
		await restarted.complete;
		await queue.stop();
		expect(restarted.received.map(({ n }) => n)).toEqual([3, 4]);
	});

	it('dispatches messages published by a handler and after the queue becomes idle', async () => {
		const queue = new InMemoryWorkQueue<Msg>(undefined, 2);
		const { received, complete, handler } = collect(3);
		queue.start(async (message) => {
			await handler(message);
			if (message.n === 1) await queue.publish({ type: 'x', n: 2 });
		});
		await queue.publish({ type: 'x', n: 1 });
		await new Promise<void>((resolve) => setImmediate(resolve));
		await queue.publish({ type: 'x', n: 3 });
		await complete;
		await queue.stop();

		expect(received.map(({ n }) => n)).toEqual([1, 2, 3]);
	});

	it('dispatches published messages to a consumer, in order', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		const { received, complete, handler } = collect(2);
		queue.start(handler);

		await queue.publish({ type: 'x', n: 1 });
		await queue.publish({ type: 'x', n: 2 });
		await complete;

		expect(received).toEqual([
			{ type: 'x', n: 1 },
			{ type: 'x', n: 2 },
		]);
	});

	it('dispatches messages published before a consumer registers', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		await queue.publish({ type: 'x', n: 1 });

		const { received, complete, handler } = collect(1);
		queue.start(handler);
		await complete;

		expect(received).toEqual([{ type: 'x', n: 1 }]);
	});

	it('keeps dispatching after a consumer throws', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const queue = new InMemoryWorkQueue<Msg>();
		const { received, complete, handler } = collect(2);
		queue.start(async (message) => {
			await handler(message);
			if (message.n === 1) throw new Error('boom');
		});

		await queue.publish({ type: 'x', n: 1 });
		await queue.publish({ type: 'x', n: 2 });
		await complete;

		expect(received).toEqual([
			{ type: 'x', n: 1 },
			{ type: 'x', n: 2 },
		]);
	});

	it('stop awaits the in-flight message', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		const { received, handler } = collect(1);
		queue.start(handler);

		await queue.publish({ type: 'x', n: 1 });
		await queue.stop();

		expect(received).toEqual([{ type: 'x', n: 1 }]);
	});

	it('stop resolves when messages were published without a consumer', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		await queue.publish({ type: 'x', n: 1 });

		await expect(queue.stop()).resolves.toBeUndefined();
	});
});
