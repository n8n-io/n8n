import { mockLogger } from '@n8n/backend-test-utils';

import type { HypervisorWorker } from '@/scaling/hypervisor-message-router';

import { HypervisorMessageTransport, PubSubHost } from '../hypervisor-message-transport';
import type { PubSubPublish, PubSubSubscribe } from '../hypervisor-message-transport';

const emitMessage = (message: unknown) =>
	(process.emit as (event: string, message: unknown) => boolean)('message', message);

describe('HypervisorMessageTransport', () => {
	const logger = mockLogger();
	let transport: HypervisorMessageTransport;
	let originalSend: typeof process.send;

	beforeEach(() => {
		originalSend = process.send;
		process.send = vi.fn();
		transport = new HypervisorMessageTransport(logger);
	});

	afterEach(() => {
		transport.shutdown();
		process.send = originalSend;
	});

	describe('publish', () => {
		it('sends a publish message to the primary', async () => {
			await transport.publish('chan', 'hello');

			expect(process.send).toHaveBeenCalledWith({
				type: 'pubsub:publish',
				channel: 'chan',
				message: 'hello',
			});
		});
	});

	describe('subscribe', () => {
		it('sends a subscribe message to the primary', async () => {
			await transport.subscribe('chan', vi.fn());

			expect(process.send).toHaveBeenCalledWith({ type: 'pubsub:subscribe', channel: 'chan' });
		});

		it('dispatches an incoming publish only to handlers on the matching channel', async () => {
			const chanHandler = vi.fn();
			const otherHandler = vi.fn();
			await transport.subscribe('chan', chanHandler);
			await transport.subscribe('other', otherHandler);

			emitMessage({ type: 'pubsub:publish', channel: 'chan', message: 'payload' });

			expect(chanHandler).toHaveBeenCalledWith('payload', 'chan');
			expect(otherHandler).not.toHaveBeenCalled();
		});

		it('supports multiple handlers on the same channel', async () => {
			const first = vi.fn();
			const second = vi.fn();
			await transport.subscribe('chan', first);
			await transport.subscribe('chan', second);

			emitMessage({ type: 'pubsub:publish', channel: 'chan', message: 'payload' });

			expect(first).toHaveBeenCalledWith('payload', 'chan');
			expect(second).toHaveBeenCalledWith('payload', 'chan');
		});

		it('ignores non-publish messages', async () => {
			const handler = vi.fn();
			await transport.subscribe('chan', handler);

			emitMessage({ type: 'leader:assign', isLeader: true });

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('stops dispatching after shutdown', async () => {
			const handler = vi.fn();
			await transport.subscribe('chan', handler);

			transport.shutdown();
			emitMessage({ type: 'pubsub:publish', channel: 'chan', message: 'payload' });

			expect(handler).not.toHaveBeenCalled();
		});
	});
});

describe('PubSubHost', () => {
	const makeWorker = (id: number): HypervisorWorker => ({
		id,
		send: vi.fn(),
		process: { pid: 1000 + id },
	});
	let host: PubSubHost;

	beforeEach(() => {
		host = new PubSubHost();
	});

	const subscribe = (worker: HypervisorWorker, channel: string) => {
		const message: PubSubSubscribe = { type: 'pubsub:subscribe', channel };
		host.onMessage(worker, message);
	};

	const publish = (worker: HypervisorWorker, channel: string, message: string) => {
		const publishMessage: PubSubPublish = { type: 'pubsub:publish', channel, message };
		host.onMessage(worker, publishMessage);
	};

	it('delivers a publish only to workers subscribed to that channel', () => {
		const subscriber = makeWorker(1);
		const other = makeWorker(2);
		subscribe(subscriber, 'chan');
		subscribe(other, 'other-chan');

		publish(subscriber, 'chan', 'hello');

		expect(subscriber.send).toHaveBeenCalledWith({
			type: 'pubsub:publish',
			channel: 'chan',
			message: 'hello',
		});
		expect(other.send).not.toHaveBeenCalled();
	});

	it('delivers to every subscriber, including the publisher itself if subscribed', () => {
		const a = makeWorker(1);
		const b = makeWorker(2);
		subscribe(a, 'chan');
		subscribe(b, 'chan');

		publish(a, 'chan', 'broadcast');

		expect(a.send).toHaveBeenCalledWith({
			type: 'pubsub:publish',
			channel: 'chan',
			message: 'broadcast',
		});
		expect(b.send).toHaveBeenCalledWith({
			type: 'pubsub:publish',
			channel: 'chan',
			message: 'broadcast',
		});
	});

	it('stops delivering to a worker that exits', () => {
		const subscriber = makeWorker(1);
		subscribe(subscriber, 'chan');

		host.onExit(subscriber);
		publish(makeWorker(2), 'chan', 'hello');

		expect(subscriber.send).not.toHaveBeenCalled();
	});

	it('accumulates multiple subscriptions from the same worker', () => {
		const subscriber = makeWorker(1);
		subscribe(subscriber, 'chan-a');
		subscribe(subscriber, 'chan-b');

		publish(makeWorker(2), 'chan-b', 'hello');

		expect(subscriber.send).toHaveBeenCalledWith({
			type: 'pubsub:publish',
			channel: 'chan-b',
			message: 'hello',
		});
	});
});
