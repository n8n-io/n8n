import Container, { Service } from 'typedi';
import { RedisServicePubSubSubscriber } from './redis/RedisServicePubSubSubscriber';
import { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import { RedisServiceListReceiver } from './redis/RedisServiceListReceiver';
import { RedisServiceListSender } from './redis/RedisServiceListSender';
import { RedisServiceStreamConsumer } from './redis/RedisServiceStreamConsumer';
import { RedisServiceStreamProducer } from './redis/RedisServiceStreamProducer';

/*
 * This is a convenience service that provides access to all the Redis clients.
 */
@Service()
export class RedisService {
	async getPubSubSubscriber() {
		const client = Container.get(RedisServicePubSubSubscriber);
		await client.init();
		return client;
	}

	async getPubSubPublisher() {
		const client = Container.get(RedisServicePubSubPublisher);
		await client.init();
		return client;
	}

	async getListSender() {
		const client = Container.get(RedisServiceListSender);
		await client.init();
		return client;
	}

	async getListReceiver() {
		const client = Container.get(RedisServiceListReceiver);
		await client.init();
		return client;
	}

	async getStreamProducer() {
		const client = Container.get(RedisServiceStreamProducer);
		await client.init();
		return client;
	}

	async getStreamConsumer() {
		const client = Container.get(RedisServiceStreamConsumer);
		await client.init();
		return client;
	}
}
