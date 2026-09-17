import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionResponse } from '@n8n/engine';
import { mock, type MockProxy } from 'vitest-mock-extended';

import {
	RedisExecutionResponseReceiver,
	type RedisResponseSubscriber,
} from '../response-channel/redis-execution-response-receiver';
import {
	RedisExecutionResponseSender,
	type RedisResponsePublisher,
} from '../response-channel/redis-execution-response-sender';

const channelPrefix = 'n8n:engine-v2-responses';
const pattern = `${channelPrefix}:*`;

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
		const sender = new RedisExecutionResponseSender(publisher, channelPrefix, mockLogger());

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
		const sender = new RedisExecutionResponseSender(publisher, channelPrefix, logger);

		expect(() => sender.send(ended())).not.toThrow();
		await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
	});

	it('disconnects and stops publishing after shutdown', async () => {
		const publisher = mock<RedisResponsePublisher>();
		const sender = new RedisExecutionResponseSender(publisher, channelPrefix, mockLogger());

		await sender.stop();
		sender.send(ended());
		await sender.stop();

		expect(publisher.disconnect).toHaveBeenCalledTimes(1);
		expect(publisher.publish).not.toHaveBeenCalled();
	});
});

describe('Redis execution response receiver', () => {
	const messageHandler = (subscriber: MockProxy<RedisResponseSubscriber>) => {
		const registration = subscriber.on.mock.calls.find(([event]) => event === 'pmessage');
		expect(registration).toBeDefined();
		return registration![1];
	};

	it('waits for the pattern subscription during startup', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		let finishSubscription: (() => void) | undefined;
		subscriber.psubscribe.mockReturnValue(
			new Promise((resolve) => {
				finishSubscription = () => resolve(1);
			}),
		);
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());
		let started = false;

		const start = receiver.start().then(() => {
			started = true;
		});
		await Promise.resolve();

		expect(subscriber.psubscribe).toHaveBeenCalledExactlyOnceWith(pattern);
		expect(started).toBe(false);
		finishSubscription?.();
		await start;
		expect(started).toBe(true);
	});

	it('routes a valid response to all handlers for its execution', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());
		const first = vi.fn();
		const second = vi.fn();
		receiver.receive('exec-1', first);
		receiver.receive('exec-1', second);
		await receiver.start();

		messageHandler(subscriber)(pattern, `${channelPrefix}:exec-1`, JSON.stringify(ended()));

		expect(first).toHaveBeenCalledExactlyOnceWith(ended());
		expect(second).toHaveBeenCalledExactlyOnceWith(ended());
	});

	it('does not route responses from another channel or execution', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());
		const handler = vi.fn();
		receiver.receive('exec-1', handler);
		await receiver.start();
		const onMessage = messageHandler(subscriber);

		onMessage(pattern, 'other:exec-1', JSON.stringify(ended()));
		onMessage(pattern, `${channelPrefix}:exec-2`, JSON.stringify(ended('exec-2')));

		expect(handler).not.toHaveBeenCalled();
	});

	it('discards invalid frames and isolates a handler failure', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockResolvedValue(1);
		const logger = mockLogger();
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, logger);
		const workingHandler = vi.fn();
		receiver.receive('exec-1', () => {
			throw new Error('Handler failed');
		});
		receiver.receive('exec-1', workingHandler);
		await receiver.start();
		const onMessage = messageHandler(subscriber);

		onMessage(pattern, `${channelPrefix}:exec-1`, '{"type":"unknown"}');
		onMessage(pattern, `${channelPrefix}:exec-1`, 'not JSON');
		onMessage(pattern, `${channelPrefix}:exec-1`, JSON.stringify(ended()));

		expect(workingHandler).toHaveBeenCalledExactlyOnceWith(ended());
		expect(logger.error).toHaveBeenCalledTimes(3);
	});

	it('removes a handler when it unsubscribes', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());
		const handler = vi.fn();
		const unsubscribe = receiver.receive('exec-1', handler);
		await receiver.start();

		unsubscribe();
		messageHandler(subscriber)(pattern, `${channelPrefix}:exec-1`, JSON.stringify(ended()));

		expect(handler).not.toHaveBeenCalled();
	});

	it('removes handlers and disconnects during shutdown', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockResolvedValue(1);
		subscriber.punsubscribe.mockResolvedValue(1);
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());
		const handler = vi.fn();
		receiver.receive('exec-1', handler);
		await receiver.start();
		const onMessage = messageHandler(subscriber);

		await receiver.stop();
		onMessage(pattern, `${channelPrefix}:exec-1`, JSON.stringify(ended()));
		await receiver.stop();

		expect(handler).not.toHaveBeenCalled();
		expect(subscriber.punsubscribe).toHaveBeenCalledExactlyOnceWith(pattern);
		expect(subscriber.off).toHaveBeenCalledWith('pmessage', onMessage);
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it('disconnects when startup fails', async () => {
		const subscriber = mock<RedisResponseSubscriber>();
		subscriber.psubscribe.mockRejectedValue(new Error('Redis is unavailable'));
		const receiver = new RedisExecutionResponseReceiver(subscriber, channelPrefix, mockLogger());

		await expect(receiver.start()).rejects.toThrow('Redis is unavailable');

		expect(subscriber.off).toHaveBeenCalledWith('pmessage', messageHandler(subscriber));
		expect(subscriber.disconnect).toHaveBeenCalledExactlyOnceWith();
	});
});
