import { Service } from 'typedi';
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
	constructor(
		private redisServicePubSubSubscriber: RedisServicePubSubSubscriber,
		private redisServicePubSubPublisher: RedisServicePubSubPublisher,
		private redisServiceListReceiver: RedisServiceListReceiver,
		private redisServiceListSender: RedisServiceListSender,
		private redisServiceStreamConsumer: RedisServiceStreamConsumer,
		private redisServiceStreamProducer: RedisServiceStreamProducer,
	) {}

	async getPubSubSubscriber() {
		await this.redisServicePubSubSubscriber.init();
		return this.redisServicePubSubSubscriber;
	}

	async getPubSubPublisher() {
		await this.redisServicePubSubPublisher.init();
		return this.redisServicePubSubPublisher;
	}

	async getListSender() {
		await this.redisServiceListSender.init();
		return this.redisServiceListSender;
	}

	async getListReceiver() {
		await this.redisServiceListReceiver.init();
		return this.redisServiceListReceiver;
	}

	async getStreamProducer() {
		await this.redisServiceStreamProducer.init();
		return this.redisServiceStreamProducer;
	}

	async getStreamConsumer() {
		await this.redisServiceStreamConsumer.init();
		return this.redisServiceStreamConsumer;
	}
}
