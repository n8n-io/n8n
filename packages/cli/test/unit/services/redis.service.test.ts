import Container from 'typedi';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { RedisService } from '@/services/redis.service';

const redisService = Container.get(RedisService);

function setDefaultConfig() {
	config.set('executions.mode', 'queue');
}

interface TestObject {
	test: string;
	test2: number;
	test3?: TestObject & { test4: TestObject };
}

const testObject: TestObject = {
	test: 'test',
	test2: 123,
	test3: {
		test: 'test3',
		test2: 123,
		test4: {
			test: 'test4',
			test2: 123,
		},
	},
};

const PUBSUB_CHANNEL = 'test-channel';
const LIST_CHANNEL = 'test-list';
const STREAM_CHANNEL = 'test-stream';

describe('cacheService', () => {
	beforeAll(async () => {
		LoggerProxy.init(getLogger());
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	test('should create list sender and receiver', async () => {
		const sender = await redisService.getListSender();
		const receiver = await redisService.getListReceiver();
		expect(sender).toBeDefined();
		expect(receiver).toBeDefined();
		await sender.pushToFront(LIST_CHANNEL, 'end');
		await sender.pushToFront(LIST_CHANNEL, 'middle');
		await sender.pushToFront(LIST_CHANNEL, 'first');
		let popResult = await receiver.popFromFront(LIST_CHANNEL);
		expect(popResult).toBe('first');
		popResult = await receiver.popFromBack(LIST_CHANNEL);
		expect(popResult).toBe('end');
		await sender.pushToFront(LIST_CHANNEL, 'somevalue');
		popResult = await receiver.popFromBack(LIST_CHANNEL);
		expect(popResult).toBe('middle');
		await sender.destroy();
		await receiver.destroy();
	});

	test('should create stream producer and consumer', async () => {
		const consumer = await redisService.getStreamConsumer();
		const producer = await redisService.getStreamProducer();
		expect(consumer).toBeDefined();
		expect(producer).toBeDefined();

		void consumer.listenToStream(STREAM_CHANNEL);
		const mockHandler = jest.fn();
		mockHandler.mockImplementation((channel: string, message: string) => {});
		consumer.addMessageHandler(STREAM_CHANNEL, mockHandler);

		await producer.add(STREAM_CHANNEL, [
			'message',
			'message.eventName',
			'event',
			'message.toString()',
		]);
		await new Promise((resolve) =>
			setTimeout(async () => {
				resolve(0);
			}, 100),
		);
		expect(mockHandler).toHaveBeenCalled();
		consumer.stopListeningToStream(STREAM_CHANNEL);

		await consumer.destroy();
		await producer.destroy();
	});
});
