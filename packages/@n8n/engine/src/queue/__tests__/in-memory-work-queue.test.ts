import { describe, expect, it } from 'vitest';

import { InMemoryWorkQueue } from '../in-memory-work-queue';

interface Msg {
	type: 'x';
	n: number;
}

describe('InMemoryWorkQueue', () => {
	it('records published messages', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		await queue.publish({ type: 'x', n: 1 });
		expect(queue.messages).toEqual([{ type: 'x', n: 1 }]);
	});

	it('dispatches published messages to the handler and drains in order', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		const seen: number[] = [];
		queue.start(async (m) => {
			seen.push(m.n);
			await Promise.resolve();
		});

		await queue.publish({ type: 'x', n: 1 });
		await queue.publish({ type: 'x', n: 2 });
		await queue.drain();

		expect(seen).toEqual([1, 2]);
	});

	it('dispatches messages published before a handler is registered', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		await queue.publish({ type: 'x', n: 1 });

		const seen: number[] = [];
		queue.start(async (m) => {
			seen.push(m.n);
			await Promise.resolve();
		});
		await queue.drain();

		expect(seen).toEqual([1]);
	});

	it('stop awaits in-flight processing', async () => {
		const queue = new InMemoryWorkQueue<Msg>();
		const seen: number[] = [];
		queue.start(async (m) => {
			seen.push(m.n);
			await Promise.resolve();
		});
		await queue.publish({ type: 'x', n: 1 });
		await queue.stop();
		expect(seen).toEqual([1]);
	});
});
