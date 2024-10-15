import type { Publisher } from '@/scaling/pubsub/publisher.service';

export type MainResponseReceivedHandlerOptions = {
	hostId: string;
	publisher: Publisher;
};
