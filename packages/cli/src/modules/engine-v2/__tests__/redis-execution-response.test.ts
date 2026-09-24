import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';
import { mock, type MockProxy } from 'vitest-mock-extended';

import {
	RedisExecutionResponseReceiver,
	type RedisResponseSubscriber,
} from '../response-channel/redis-execution-response-receiver';
import {
	RedisExecutionResponseSender,
	SHUTDOWN_DRAIN_TIMEOUT_MS,
	type RedisResponsePublisher,
} from '../response-channel/redis-execution-response-sender';

const channelPrefix = 'n8n:engine-v2-responses';
const getChannelName = (executionId: string) => `${channelPrefix}:${executionId}`;
const executionChannel = `${channelPrefix}:exec-1`;

const ended = (executionId = 'exec-1', outputs: unknown = null): ExecutionResponse => ({
	type: 'ended',
	executionId,
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: outputs as never },
});

describe('Redis execution response sender', () => {
	it('serializes and publishes a response to its execution channel', () => {
		const publisher = mock<RedisResponsePublisher>();
		publisher.publish.mockResolvedValue(1);
		const sender = new RedisExecutionResponseSender(publisher, getChannelName, mockLogger());

		sender.send(ended('exec-1', [[{ at: new Date(0) }]]));

		expect(publisher.publish).toHaveBeenCalledExactlyOnceWith(
			`${channelPrefix}:exec-1`,
			JSON.stringify(ended('exec-1', [[{ at: '1970-01-01T00:00:00.000Z' }]])),
		);
	});

	it('logs a publish failure without throwing', async () => {
		const publisher = mock<RedisResponsePublisher>();
		const logger = mockLogger();
		publisher.publish.mockRejectedValue(new Error('Redis is unavailable'));
		const sender = new RedisExecutionResponseSender(publisher, getChannelName, logger);

		expect(() => sender.send(ended())).not.toThrow();
		await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
	});

	it('disconnects and stops publishing after shutdown', async () => {
		const publisher = mock<RedisResponsePublisher>();
		const sender = new RedisExecutionResponseSender(publisher, getChannelName, mockLogger());

		await sender.stop();
		sender.send(ended());
		await sender.stop();

		expect(publisher.disconnect).toHaveBeenCalledTimes(1);
		expect(publisher.publish).not.toHaveBeenCalled();
	});

	it('waits for an in-flight publish before it disconnects', async () => {
		const publisher = mock<RedisResponsePublisher>();
		let finishPublish: (() => void) | undefined;
		publisher.publish.mockReturnValue(
			new Promise((resolve) => {
				finishPublish = () => resolve(1);
			}),
		);
		const sender = new RedisExecutionResponseSender(publisher, getChannelName, mockLogger());
		sender.send(ended());

		const stop = sender.stop();
		await Promise.resolve();

		expect(publisher.disconnect).not.toHaveBeenCalled();
		finishPublish?.();
		await stop;
		expect(publisher.disconnect).toHaveBeenCalledTimes(1);
	});

	it('disconnects after the drain timeout when a publish never settles', async () => {
		vi.useFakeTimers();
		try {
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockReturnValue(new Promise(() => {}));
			const logger = mockLogger();
			const sender = new RedisExecutionResponseSender(publisher, getChannelName, logger);
			sender.send(ended());

			const stop = sender.stop();
			await vi.advanceTimersByTimeAsync(SHUTDOWN_DRAIN_TIMEOUT_MS - 1);
			expect(publisher.disconnect).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			await stop;
			expect(publisher.disconnect).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Execution responses were still being published at shutdown',
				{ count: 1 },
			);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('Redis execution response receiver', () => {
	const messageHandler = (subscriber: MockProxy<RedisResponseSubscriber>) => {
		const registration = subscriber.on.mock.calls.find(([event]) => event === 'message');
		expect(registration).toBeDefined();
		return registration![1];
	};

	it('refuses to receive before it starts', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());

		await expect(receiver.receive('exec-1', vi.fn())).rejects.toThrow('has not started');
		expect(subscriber.subscribe).not.toHaveBeenCalled();
	});

	it('waits for the execution subscription before registration completes', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		let finishSubscription: (() => void) | undefined;
		subscriber.subscribe.mockReturnValue(
			new Promise((resolve) => {
				finishSubscription = () => resolve(1);
			}),
		);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		await receiver.start();
		let registered = false;

		const receive = receiver.receive('exec-1', vi.fn()).then(() => {
			registered = true;
		});
		await Promise.resolve();

		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
		expect(registered).toBe(false);
		finishSubscription?.();
		await receive;
		expect(registered).toBe(true);
	});

	it('routes a valid response to its execution subscriber', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await receiver.start();
		await receiver.receive('exec-1', handler);

		messageHandler(subscriber)(executionChannel, JSON.stringify(ended()));

		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
		expect(handler).toHaveBeenCalledExactlyOnceWith(ended());
	});

	it('refuses a second subscriber for the same execution', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		await receiver.start();
		await receiver.receive('exec-1', vi.fn());

		await expect(receiver.receive('exec-1', vi.fn())).rejects.toThrow('already has a subscriber');
		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
	});

	it('does not route responses from another channel or execution', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await receiver.start();
		await receiver.receive('exec-1', handler);
		const onMessage = messageHandler(subscriber);

		onMessage('other:exec-1', JSON.stringify(ended()));
		onMessage(`${channelPrefix}:exec-2`, JSON.stringify(ended('exec-2')));

		expect(handler).not.toHaveBeenCalled();
	});

	it('discards invalid frames and isolates a handler failure', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const logger = mockLogger();
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, logger);
		await receiver.start();
		await receiver.receive('exec-1', () => {
			throw new Error('Handler failed');
		});
		const onMessage = messageHandler(subscriber);

		onMessage(executionChannel, '{"type":"unknown"}');
		onMessage(executionChannel, 'not JSON');
		onMessage(executionChannel, JSON.stringify(ended()));

		expect(logger.error).toHaveBeenCalledTimes(3);
	});

	it('unsubscribes from Redis when its subscriber leaves', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		subscriber.unsubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		await receiver.start();
		const unsubscribe = await receiver.receive('exec-1', vi.fn());

		unsubscribe();

		expect(subscriber.unsubscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
	});

	it('removes handlers and disconnects during shutdown', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		subscriber.unsubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await receiver.start();
		await receiver.receive('exec-1', handler);
		const onMessage = messageHandler(subscriber);

		await receiver.stop();
		onMessage(executionChannel, JSON.stringify(ended()));
		await receiver.stop();

		expect(handler).not.toHaveBeenCalled();
		expect(subscriber.unsubscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
		expect(subscriber.off).toHaveBeenCalledWith('message', onMessage);
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it('removes the execution after its subscription fails', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.subscribe.mockRejectedValue(new Error('Redis is unavailable'));
		const receiver = new RedisExecutionResponseReceiver(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await receiver.start();

		await expect(receiver.receive('exec-1', handler)).rejects.toThrow('Redis is unavailable');
		messageHandler(subscriber)(executionChannel, JSON.stringify(ended()));

		expect(handler).not.toHaveBeenCalled();
	});
});
