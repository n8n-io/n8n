import { describe, expect, it, vi } from 'vitest';

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
