import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { WorkQueueConsumer, WorkQueuePublisher } from '../work-queue.types';

export interface ContractMessage {
	n: number;
}

const contractMessageSchema = z.object({ n: z.number() });

/** For adapters that send messages across a process boundary. */
export const parseContractMessage = (value: unknown): ContractMessage =>
	contractMessageSchema.parse(value);

export interface WorkQueueUnderTest {
	publisher: WorkQueuePublisher<ContractMessage>;
	consumer: WorkQueueConsumer<ContractMessage>;
	/** Releases what the adapter holds (connections, keys). */
	dispose?: () => Promise<void>;
}

export type WorkQueueFactory = (options: {
	concurrency: number;
}) => WorkQueueUnderTest | Promise<WorkQueueUnderTest>;

interface Deferred {
	promise: Promise<void>;
	resolve: () => void;
	reject: (error: Error) => void;
}

function deferred(): Deferred {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Gates still open, so a failed case cannot leave `stop()` waiting forever. */
const openGates = new Set<Deferred>();

/**
 * A handler whose calls stay in flight until the test releases them. It
 * records which messages started and the highest number in flight at once.
 */
function gatedHandler() {
	const started: number[] = [];
	const finished: number[] = [];
	const gates = new Map<number, Deferred>();
	let inFlight = 0;
	let maxInFlight = 0;

	const handler = async ({ n }: ContractMessage) => {
		started.push(n);
		inFlight += 1;
		maxInFlight = Math.max(maxInFlight, inFlight);
		const gate = deferred();
		gates.set(n, gate);
		openGates.add(gate);
		try {
			await gate.promise;
		} finally {
			openGates.delete(gate);
			inFlight -= 1;
			finished.push(n);
		}
	};

	return {
		handler,
		started,
		finished,
		maxInFlight: () => maxInFlight,
		release: (n: number) => gates.get(n)?.resolve(),
		fail: (n: number) => gates.get(n)?.reject(new Error(`handler ${n} failed`)),
		releaseAll: () => {
			for (const gate of gates.values()) gate.resolve();
		},
	};
}

async function eventually(check: () => void): Promise<void> {
	await vi.waitFor(check, { timeout: 2_000, interval: 5 });
}

/** Gives an adapter time to start work it must not start. */
async function settleBriefly(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 50));
}

async function publishAll(
	publisher: WorkQueuePublisher<ContractMessage>,
	ns: number[],
): Promise<void> {
	for (const n of ns) await publisher.publish({ n });
}

const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

async function expectDeliveredExactly(received: number[], expected: number[]): Promise<void> {
	await eventually(() => expect([...received].sort((x, y) => x - y)).toEqual(expected));
	await settleBriefly();
	expect(received).toHaveLength(expected.length);
}

/**
 * The behaviour every work queue adapter must have. The contract makes no
 * promise about delivery order, so no case here asserts one.
 */
export function describeWorkQueueContract(adapterName: string, create: WorkQueueFactory): void {
	describe(`Work queue contract: ${adapterName}`, () => {
		const disposers: Array<() => Promise<void>> = [];

		async function build(concurrency: number) {
			const queue = await create({ concurrency });
			disposers.push(async () => {
				await queue.consumer.stop();
				await queue.dispose?.();
			});
			return queue;
		}

		afterEach(async () => {
			for (const gate of openGates) gate.resolve();
			for (const dispose of disposers.splice(0)) await dispose();
		});

		it.each([1, 2, 3, 4])(
			'delivers every published message exactly once at concurrency %i',
			async (concurrency) => {
				const { publisher, consumer } = await build(concurrency);
				const received: number[] = [];
				consumer.start(async ({ n }) => {
					received.push(n);
				});

				await publishAll(publisher, range(20));

				await expectDeliveredExactly(received, range(20));
			},
		);

		it('delivers messages that were published before the consumer started', async () => {
			const { publisher, consumer } = await build(2);
			await publishAll(publisher, [1, 2]);

			const received: number[] = [];
			consumer.start(async ({ n }) => {
				received.push(n);
			});

			await expectDeliveredExactly(received, [1, 2]);
		});

		it.each([1, 2, 3, 4])('never runs more than %i handlers at once', async (concurrency) => {
			const { publisher, consumer } = await build(concurrency);
			const gated = gatedHandler();
			consumer.start(gated.handler);

			await publishAll(publisher, range(10));
			await eventually(() => expect(gated.started).toHaveLength(concurrency));
			await settleBriefly();

			expect(gated.started).toHaveLength(concurrency);
			expect(gated.maxInFlight()).toBe(concurrency);

			gated.releaseAll();
			await eventually(() => {
				gated.releaseAll();
				expect(gated.finished).toHaveLength(10);
			});
			expect(gated.maxInFlight()).toBe(concurrency);
		});

		it('starts the next message as soon as one slot frees, while other handlers still run', async () => {
			const { publisher, consumer } = await build(2);
			const gated = gatedHandler();
			consumer.start(gated.handler);

			await publishAll(publisher, [1, 2, 3]);
			await eventually(() => expect(gated.started).toHaveLength(2));

			const [first, second] = gated.started;
			gated.release(first);

			await eventually(() => expect(gated.started).toHaveLength(3));
			expect(gated.finished).not.toContain(second);

			gated.releaseAll();
		});

		it('frees the slot of a handler that throws and keeps delivering', async () => {
			const { publisher, consumer } = await build(1);
			const gated = gatedHandler();
			consumer.start(gated.handler);

			await publishAll(publisher, [1, 2]);
			await eventually(() => expect(gated.started).toHaveLength(1));
			gated.fail(gated.started[0]);

			await eventually(() => expect(gated.started).toHaveLength(2));
			gated.releaseAll();
			await eventually(() => expect(gated.finished).toHaveLength(2));
		});

		it('starts the next message after a handler throws, while another handler still runs', async () => {
			const { publisher, consumer } = await build(2);
			const gated = gatedHandler();
			consumer.start(gated.handler);

			await publishAll(publisher, [1, 2, 3]);
			await eventually(() => expect(gated.started).toHaveLength(2));

			const [failing, other] = gated.started;
			gated.fail(failing);

			await eventually(() => expect(gated.started).toHaveLength(3));
			expect(gated.finished).not.toContain(other);

			gated.releaseAll();
			await eventually(() => expect(gated.finished).toHaveLength(3));
		});

		it('delivers messages that a handler publishes while it runs', async () => {
			const { publisher, consumer } = await build(2);
			const received: number[] = [];
			consumer.start(async ({ n }) => {
				received.push(n);
				if (n < 10) await publisher.publish({ n: n + 10 });
			});

			await publishAll(publisher, range(5));

			await expectDeliveredExactly(received, [1, 2, 3, 4, 5, 11, 12, 13, 14, 15]);
		});

		it('waits in stop for every in-flight handler', async () => {
			const { publisher, consumer } = await build(3);
			const gated = gatedHandler();
			consumer.start(gated.handler);
			await publishAll(publisher, [1, 2, 3]);
			await eventually(() => expect(gated.started).toHaveLength(3));

			let stopped = false;
			const stopping = consumer.stop().then(() => {
				stopped = true;
			});

			gated.release(1);
			gated.release(2);
			await settleBriefly();
			expect(stopped).toBe(false);

			gated.release(3);
			await stopping;
			expect(gated.finished).toHaveLength(3);
		});

		it('starts no queued message after stop is called', async () => {
			const { publisher, consumer } = await build(1);
			const gated = gatedHandler();
			consumer.start(gated.handler);
			await publishAll(publisher, [1, 2, 3]);
			await eventually(() => expect(gated.started).toHaveLength(1));

			const stopping = consumer.stop();
			gated.releaseAll();
			await stopping;
			await settleBriefly();

			expect(gated.started).toHaveLength(1);
		});

		it('resolves stop when no consumer ever started', async () => {
			const { publisher, consumer } = await build(2);
			await publisher.publish({ n: 1 });

			await expect(consumer.stop()).resolves.toBeUndefined();
		});
	});
}
