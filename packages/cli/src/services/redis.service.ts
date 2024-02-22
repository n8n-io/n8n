import { Service } from 'typedi';
import { RedisServicePubSubSubscriber } from './redis/RedisServicePubSubSubscriber';
import { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';

/*
 * This is a convenience service that provides access to all the Redis clients.
 */
@Service()
export class RedisService {
	constructor(
		private redisServicePubSubSubscriber: RedisServicePubSubSubscriber,
		private redisServicePubSubPublisher: RedisServicePubSubPublisher,
	) {}

	async getPubSubSubscriber() {
		await this.redisServicePubSubSubscriber.init();
		return this.redisServicePubSubSubscriber;
	}

	async getPubSubPublisher() {
		await this.redisServicePubSubPublisher.init();
		return this.redisServicePubSubPublisher;
	}
}
