import type { Publisher } from '@/scaling/pubsub/publisher.service';

export type MainResponseReceivedHandlerOptions = {
	queueModeId: string;
	redisPublisher: Publisher;
};
