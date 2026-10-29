import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse } from '@n8n/engine';

import type {
	ExecutionChannelSubscriber,
	UnsubscribeFromExecutionChannel,
} from './execution-channel';
import { deserializeExecutionResponse } from './execution-response-frame';

export type UnsubscribeExecutionResponse = UnsubscribeFromExecutionChannel;

/** Receives responses from executions and delivers them to their callers. */
export interface ExecutionResponseReceiver {
	receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): Promise<UnsubscribeExecutionResponse>;
	stop(): Promise<void>;
}

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
