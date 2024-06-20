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

describe('RedisService', () => {
	beforeAll(async () => {
		setDefaultConfig();
	});

	test('should create pubsub publisher and subscriber with handler', async () => {
		const pub = await redisService.getPubSubPublisher();
		const sub = await redisService.getPubSubSubscriber();
		expect(pub).toBeDefined();
		expect(sub).toBeDefined();

		const mockHandler = jest.fn();
		mockHandler.mockImplementation((_channel: string, _message: string) => {});
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
});
