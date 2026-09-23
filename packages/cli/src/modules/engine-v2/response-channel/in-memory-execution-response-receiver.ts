import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse } from '@n8n/engine';

import { deserializeExecutionResponse } from './execution-response-frame';
import type {
	ExecutionResponseReceiver,
	UnsubscribeExecutionResponse,
} from './execution-response-receiver';
import type { InMemoryExecutionResponseChannel } from './in-memory-execution-response-channel';

export class InMemoryExecutionResponseReceiver implements ExecutionResponseReceiver {
	private readonly subscriptions = new Set<UnsubscribeExecutionResponse>();

	private stopped = false;

	constructor(
		private readonly channel: InMemoryExecutionResponseChannel,
		private readonly logger: Logger,
	) {}

	async receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): Promise<UnsubscribeExecutionResponse> {
		if (this.stopped) return () => {};

		const unsubscribeFromChannel = this.channel.subscribe(executionId, (frame) => {
			const response = deserializeExecutionResponse(frame, this.logger);
			if (response === undefined) return;

			try {
				handler(response);
			} catch (error) {
				this.logger.error('A response handler threw', {
					executionId: response.executionId,
					type: response.type,
					error,
				});
			}
		});
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
