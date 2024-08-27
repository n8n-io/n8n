import type { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';

export type MainResponseReceivedHandlerOptions = {
	queueModeId: string;
	redisPublisher: RedisServicePubSubPublisher;
};
