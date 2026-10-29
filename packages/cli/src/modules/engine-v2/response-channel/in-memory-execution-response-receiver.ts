import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse } from '@n8n/engine';

import type {
	ExecutionChannelFrameHandler,
	ExecutionChannelSubscriber,
	ExecutionChannelTopic,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import { deserializeExecutionResponse } from './execution-response-frame';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';
import type { InMemoryExecutionChannel } from './in-memory-execution-response-channel';

/** Receives execution responses on the `responses` topic of the execution channel. */
export class ExecutionResponseChannelReceiver implements ExecutionResponseReceiver {
	private stopped = false;

	constructor(
		private readonly subscriber: ExecutionChannelSubscriber,
		private readonly logger: Logger,
	) {}

	async receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): Promise<UnsubscribeExecutionResponse> {
		if (this.stopped) return () => {};

		return await this.subscriber.subscribe('responses', executionId, (frame) => {
			if (this.stopped) return;

			const responseResult = deserializeExecutionResponse(frame, this.logger);
			if (!responseResult.ok) return;
			const response = responseResult.result;

			try {
				handler(response);
			} catch (error) {
				this.logger.error('An execution response handler failed', {
					executionId: response.executionId,
					type: response.type,
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
