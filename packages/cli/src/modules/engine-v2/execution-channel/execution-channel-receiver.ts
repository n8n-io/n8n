import type { Logger } from '@n8n/backend-common';

import type {
	ExecutionChannelCodec,
	ExecutionChannelFrameHandler,
	ExecutionChannelSubscriber,
	ExecutionChannelTopic,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import type { InMemoryExecutionChannel } from './in-memory-execution-channel';

/** Receives messages on the topic of its codec. */
export class ExecutionChannelReceiver<T> {
	private stopped = false;

	constructor(
		private readonly subscriber: ExecutionChannelSubscriber,
		private readonly codec: ExecutionChannelCodec<T>,
		private readonly logger: Logger,
	) {}

	async receive(
		executionId: string,
		handler: (message: T) => void,
	): Promise<UnsubscribeFromExecutionChannel> {
		if (this.stopped) return () => {};

		const { topic } = this.codec;
		return await this.subscriber.subscribe(topic, executionId, (frame) => {
			if (this.stopped) return;

			const messageResult = this.codec.deserialize(frame);
			if (!messageResult.ok) return;

			try {
				handler(messageResult.result);
			} catch (error) {
				this.logger.error('An execution channel message handler failed', {
					topic,
					executionId,
					error,
				});
			}
		});
	}

	/** Stops delivery. The owner of the subscriber releases its connection. */
	async stop(): Promise<void> {
		this.stopped = true;
	}
}

export class InMemoryExecutionChannelSubscriber implements ExecutionChannelSubscriber {
	private readonly subscriptions = new Set<UnsubscribeFromExecutionChannel>();

	private stopped = false;

	constructor(private readonly channel: InMemoryExecutionChannel) {}

	async subscribe(
		topic: ExecutionChannelTopic,
		executionId: string,
		handler: ExecutionChannelFrameHandler,
	): Promise<UnsubscribeFromExecutionChannel> {
		if (this.stopped) return () => {};

		const unsubscribeFromChannel = this.channel.subscribe(topic, executionId, handler);
		const unsubscribe = () => {
			unsubscribeFromChannel();
			this.subscriptions.delete(unsubscribe);
		};
		this.subscriptions.add(unsubscribe);

		return unsubscribe;
	}

	async stop(): Promise<void> {
		this.stopped = true;
		for (const unsubscribe of this.subscriptions) unsubscribe();
	}
}
