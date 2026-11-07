import { mockLogger } from '@n8n/backend-test-utils';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ExecutionChannelTopic } from '../response-channel/execution-channel';
import {
	RedisExecutionChannelPublisher,
	SHUTDOWN_DRAIN_TIMEOUT_MS,
	type RedisChannelPublisher,
} from '../response-channel/redis-execution-response-sender';
import {
	RedisExecutionChannelSubscriber,
	type RedisChannelSubscriber,
} from '../response-channel/redis-execution-response-receiver';

const getChannelName = (topic: ExecutionChannelTopic, executionId: string) =>
	`n8n:engine-v2-${topic}:${executionId}`;
const executionChannel = 'n8n:engine-v2-responses:exec-1';
const lifecycleChannel = 'n8n:engine-v2-lifecycle:exec-1';

describe('Redis execution channel publisher', () => {
	it('publishes a frame to the channel of its topic and execution', () => {
		const publisher = mock<RedisChannelPublisher>();
		publisher.publish.mockResolvedValue(1);
		const channel = new RedisExecutionChannelPublisher(publisher, getChannelName, mockLogger());

		channel.publish('responses', 'exec-1', 'response');
		channel.publish('lifecycle', 'exec-1', 'event');

		expect(publisher.publish).toHaveBeenNthCalledWith(1, executionChannel, 'response');
		expect(publisher.publish).toHaveBeenNthCalledWith(2, lifecycleChannel, 'event');
	});

	it('logs a publish failure without throwing', async () => {
		const publisher = mock<RedisChannelPublisher>();
		const logger = mockLogger();
		publisher.publish.mockRejectedValue(new Error('Redis is unavailable'));
		const channel = new RedisExecutionChannelPublisher(publisher, getChannelName, logger);

		expect(() => channel.publish('responses', 'exec-1', 'frame')).not.toThrow();
		await vi.waitFor(() =>
			expect(logger.error).toHaveBeenCalledWith('Failed to publish to the execution channel', {
				topic: 'responses',
				executionId: 'exec-1',
				error: expect.any(Error),
			}),
		);
	});

	it('disconnects and stops publishing after shutdown', async () => {
		const publisher = mock<RedisChannelPublisher>();
		const channel = new RedisExecutionChannelPublisher(publisher, getChannelName, mockLogger());

		await channel.stop();
		channel.publish('responses', 'exec-1', 'frame');
		await channel.stop();

		expect(publisher.disconnect).toHaveBeenCalledTimes(1);
		expect(publisher.publish).not.toHaveBeenCalled();
	});

	it('waits for an in-flight publish before it disconnects', async () => {
		const publisher = mock<RedisChannelPublisher>();
		let finishPublish: (() => void) | undefined;
		publisher.publish.mockReturnValue(
			new Promise((resolve) => {
				finishPublish = () => resolve(1);
			}),
		);
		const channel = new RedisExecutionChannelPublisher(publisher, getChannelName, mockLogger());
		channel.publish('responses', 'exec-1', 'frame');

		const stop = channel.stop();
		await Promise.resolve();

		expect(publisher.disconnect).not.toHaveBeenCalled();
		finishPublish?.();
		await stop;
		expect(publisher.disconnect).toHaveBeenCalledTimes(1);
	});

	it('disconnects after the drain timeout when a publish never settles', async () => {
		vi.useFakeTimers();
		try {
			const publisher = mock<RedisChannelPublisher>();
			publisher.publish.mockReturnValue(new Promise(() => {}));
			const logger = mockLogger();
			const channel = new RedisExecutionChannelPublisher(publisher, getChannelName, logger);
			channel.publish('responses', 'exec-1', 'frame');

			const stop = channel.stop();
			await vi.advanceTimersByTimeAsync(SHUTDOWN_DRAIN_TIMEOUT_MS - 1);
			expect(publisher.disconnect).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			await stop;
			expect(publisher.disconnect).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Execution channel frames were still being published at shutdown',
				{ count: 1 },
			);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('Redis execution channel subscriber', () => {
	const messageHandler = (subscriber: MockProxy<RedisChannelSubscriber>) => {
		const registration = subscriber.on.mock.calls.find(([event]) => event === 'message');
		expect(registration).toBeDefined();
		return registration![1];
	};

	const connectionHandler = (
		subscriber: MockProxy<RedisChannelSubscriber>,
		event: 'close' | 'ready',
	): (() => void) => {
		// Mock calls are typed by the last overload, which is the `message` one.
		const registration = subscriber.on.mock.calls.find(([name]) => (name as string) === event);
		expect(registration).toBeDefined();
		return registration![1] as () => void;
	};

	it('refuses to subscribe before it starts', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());

		await expect(channel.subscribe('responses', 'exec-1', vi.fn())).rejects.toThrow(
			'has not started',
		);
		expect(subscriber.subscribe).not.toHaveBeenCalled();
	});

	it('waits for the Redis subscription before registration completes', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		let finishSubscription: (() => void) | undefined;
		subscriber.subscribe.mockReturnValue(
			new Promise((resolve) => {
				finishSubscription = () => resolve(1);
			}),
		);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		let registered = false;

		const subscribe = channel.subscribe('responses', 'exec-1', vi.fn()).then(() => {
			registered = true;
		});
		await Promise.resolve();

		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
		expect(registered).toBe(false);
		finishSubscription?.();
		await subscribe;
		expect(registered).toBe(true);
	});

	it('routes a frame to the subscriber of its channel', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await channel.start();
		await channel.subscribe('responses', 'exec-1', handler);

		messageHandler(subscriber)(executionChannel, 'frame');

		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
		expect(handler).toHaveBeenCalledExactlyOnceWith('frame');
	});

	it('keeps the topics of one execution apart', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		const onResponse = vi.fn();
		const onLifecycle = vi.fn();
		await channel.start();
		await channel.subscribe('responses', 'exec-1', onResponse);
		await channel.subscribe('lifecycle', 'exec-1', onLifecycle);
		const onMessage = messageHandler(subscriber);

		onMessage(executionChannel, 'response');
		onMessage(lifecycleChannel, 'event');

		expect(subscriber.subscribe).toHaveBeenNthCalledWith(1, executionChannel);
		expect(subscriber.subscribe).toHaveBeenNthCalledWith(2, lifecycleChannel);
		expect(onResponse).toHaveBeenCalledExactlyOnceWith('response');
		expect(onLifecycle).toHaveBeenCalledExactlyOnceWith('event');
	});

	it('refuses a second subscriber for the same topic and execution', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		await channel.subscribe('responses', 'exec-1', vi.fn());

		await expect(channel.subscribe('responses', 'exec-1', vi.fn())).rejects.toThrow(
			'already has a subscriber',
		);
		expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
	});

	it('does not route frames from another channel or execution', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await channel.start();
		await channel.subscribe('responses', 'exec-1', handler);
		const onMessage = messageHandler(subscriber);

		onMessage('other:exec-1', 'frame');
		onMessage(getChannelName('responses', 'exec-2'), 'frame');

		expect(handler).not.toHaveBeenCalled();
	});

	it('isolates a handler failure', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const logger = mockLogger();
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, logger);
		await channel.start();
		await channel.subscribe('responses', 'exec-1', () => {
			throw new Error('Handler failed');
		});

		expect(() => messageHandler(subscriber)(executionChannel, 'frame')).not.toThrow();
		expect(logger.error).toHaveBeenCalledWith('An execution channel frame handler failed', {
			topic: 'responses',
			executionId: 'exec-1',
			error: expect.any(Error),
		});
	});

	it('unsubscribes from Redis when its subscriber leaves', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		subscriber.unsubscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		const unsubscribe = await channel.subscribe('responses', 'exec-1', vi.fn());

		unsubscribe();

		expect(subscriber.unsubscribe).toHaveBeenCalledExactlyOnceWith(executionChannel);
	});

	it('removes handlers and disconnects during shutdown', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await channel.start();
		await channel.subscribe('responses', 'exec-1', handler);
		const onMessage = messageHandler(subscriber);

		await channel.stop();
		onMessage(executionChannel, 'frame');
		await channel.stop();

		expect(handler).not.toHaveBeenCalled();
		// Closing the connection ends its subscriptions, so shutdown sends no UNSUBSCRIBE.
		expect(subscriber.unsubscribe).not.toHaveBeenCalled();
		expect(subscriber.off).toHaveBeenCalledWith('message', onMessage);
		expect(subscriber.off).toHaveBeenCalledWith('close', connectionHandler(subscriber, 'close'));
		expect(subscriber.off).toHaveBeenCalledWith('ready', connectionHandler(subscriber, 'ready'));
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it('stops without waiting for a subscription that is still in flight', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockReturnValue(new Promise(() => {}));
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		void channel.subscribe('responses', 'exec-1', vi.fn());

		await channel.stop();

		expect(subscriber.unsubscribe).not.toHaveBeenCalled();
		expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
	});

	it('subscribes again to active channels after Redis recovers', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		subscriber.unsubscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		await channel.subscribe('responses', 'exec-1', vi.fn());
		await channel.subscribe('responses', 'exec-2', vi.fn());
		const leave = await channel.subscribe('responses', 'exec-3', vi.fn());
		leave();
		subscriber.subscribe.mockClear();

		connectionHandler(subscriber, 'close')();
		connectionHandler(subscriber, 'ready')();

		await vi.waitFor(() =>
			expect(subscriber.subscribe).toHaveBeenCalledExactlyOnceWith(
				executionChannel,
				getChannelName('responses', 'exec-2'),
			),
		);
	});

	it('does not subscribe again when the connection becomes ready for the first time', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		await channel.start();
		await channel.subscribe('responses', 'exec-1', vi.fn());
		subscriber.subscribe.mockClear();

		connectionHandler(subscriber, 'ready')();

		expect(subscriber.subscribe).not.toHaveBeenCalled();
	});

	it('logs a failure to subscribe again and retries on the next recovery', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockResolvedValue(1);
		const logger = mockLogger();
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, logger);
		await channel.start();
		await channel.subscribe('responses', 'exec-1', vi.fn());
		subscriber.subscribe.mockClear();
		subscriber.subscribe.mockRejectedValueOnce(new Error('Redis is unavailable'));
		const onReady = connectionHandler(subscriber, 'ready');

		connectionHandler(subscriber, 'close')();
		onReady();
		await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
		onReady();

		await vi.waitFor(() => expect(subscriber.subscribe).toHaveBeenCalledTimes(2));
	});

	it('removes the subscription after Redis refuses it', async () => {
		const subscriber = mock<RedisChannelSubscriber>();
		subscriber.subscribe.mockRejectedValue(new Error('Redis is unavailable'));
		const channel = new RedisExecutionChannelSubscriber(subscriber, getChannelName, mockLogger());
		const handler = vi.fn();
		await channel.start();

		await expect(channel.subscribe('responses', 'exec-1', handler)).rejects.toThrow(
			'Redis is unavailable',
		);
		messageHandler(subscriber)(executionChannel, 'frame');

		expect(handler).not.toHaveBeenCalled();
	});
});
