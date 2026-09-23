import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse, ExecutionResponseSender } from '@n8n/engine';

import { getRedisExecutionResponseChannel } from './redis-execution-response-channel';

export interface RedisResponsePublisher {
	publish(channel: string, message: string): Promise<unknown>;
	disconnect(): void;
}

export class RedisExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly publisher: RedisResponsePublisher,
		private readonly channelPrefix: string,
		private readonly logger: Logger,
	) {}

	send(response: ExecutionResponse): void {
		if (this.stopped) return;

		void this.publisher
			.publish(
				getRedisExecutionResponseChannel(this.channelPrefix, response.executionId),
				JSON.stringify(response),
			)
			.catch((error: unknown) => {
				this.logger.error('Failed to publish an execution response', {
					executionId: response.executionId,
					error,
				});
			});
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		this.publisher.disconnect();
	}
}
