import type { RedisServicePubSubPublisher } from '@/services/redis/redis-service-pub-sub-publisher';

export type MainResponseReceivedHandlerOptions = {
	queueModeId: string;
	redisPublisher: RedisServicePubSubPublisher;
};
