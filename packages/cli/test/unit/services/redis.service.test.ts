import Container from 'typedi';
import { Logger } from '@/Logger';
import config from '@/config';
import { RedisService } from '@/services/redis.service';
import { mockInstance } from '../../shared/mocking';

mockInstance(Logger);
const redisService = Container.get(RedisService);

function setDefaultConfig() {
	config.set('executions.mode', 'queue');
}

const PUBSUB_CHANNEL = 'testchannel';
const LIST_CHANNEL = 'testlist';
const STREAM_CHANNEL = 'teststream';

describe('RedisService', () => {
	beforeAll(async () => {
		jest.mock('ioredis', () => {
			const Redis = require('ioredis-mock');
			if (typeof Redis === 'object') {
				// the first mock is an ioredis shim because ioredis-mock depends on it
				// https://github.com/stipsan/ioredis-mock/blob/master/src/index.js#L101-L111
				return {
					Command: { _transformer: { argument: {}, reply: {} } },
				};
			}
			// second mock for our code
			return function (...args: any) {
				return new Redis(args);
			};
		});
		setDefaultConfig();
	});

	test('should create pubsub publisher and subscriber with handler', async () => {
		const pub = await redisService.getPubSubPublisher();
		const sub = await redisService.getPubSubSubscriber();
		expect(pub).toBeDefined();
		expect(sub).toBeDefined();

		const mockHandler = jest.fn();
		mockHandler.mockImplementation((channel: string, message: string) => {});
		sub.addMessageHandler(PUBSUB_CHANNEL, mockHandler);
		await sub.subscribe(PUBSUB_CHANNEL);
		await pub.publish(PUBSUB_CHANNEL, 'test');
		await new Promise((resolve) =>
			setTimeout(async () => {
				resolve(0);
			}, 50),
		);
		expect(mockHandler).toHaveBeenCalled();
		await sub.destroy();
		await pub.destroy();
	});

	// NOTE: This test is failing because the mock Redis client does not support streams apparently
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	test.skip('should create stream producer and consumer', async () => {
		const consumer = await redisService.getStreamConsumer();
		const producer = await redisService.getStreamProducer();

		expect(consumer).toBeDefined();
		expect(producer).toBeDefined();

		const mockHandler = jest.fn();
		mockHandler.mockImplementation((stream: string, id: string, message: string[]) => {
			Container.get(Logger).info('Received message', { stream, id, message });
		});
		consumer.addMessageHandler('some handler', mockHandler);

		await consumer.setPollingInterval(STREAM_CHANNEL, 50);
		await consumer.listenToStream(STREAM_CHANNEL);

		let timeout;
		await new Promise((resolve) => {
			timeout = setTimeout(async () => {
				await producer.add(STREAM_CHANNEL, ['message', 'testMessage', 'event', 'testEveny']);
				resolve(0);
			}, 50);
		});

		await new Promise((resolve) =>
			setTimeout(async () => {
				resolve(0);
			}, 100),
		);

		clearInterval(timeout);

		consumer.stopListeningToStream(STREAM_CHANNEL);

		expect(mockHandler).toHaveBeenCalled();

		await consumer.destroy();
		await producer.destroy();
	});
});
