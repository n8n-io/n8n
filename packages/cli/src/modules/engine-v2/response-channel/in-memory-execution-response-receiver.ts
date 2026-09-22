import type { Logger } from '@n8n/backend-common';
import { executionResponseSchema, type ExecutionResponse } from '@n8n/engine';

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

	receive(
		executionId: string,
		handler: (response: ExecutionResponse) => void,
	): UnsubscribeExecutionResponse {
		if (this.stopped) return () => {};

		const unsubscribeFromChannel = this.channel.subscribe(executionId, (frame) => {
			const response = this.fromFrame(frame);
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

	private fromFrame(frame: string): ExecutionResponse | undefined {
		try {
			const parsed = executionResponseSchema.safeParse(JSON.parse(frame));
			if (!parsed.success) {
				this.logger.error('Discarding a malformed response', {
					details: parsed.error.flatten(),
				});
				return undefined;
			}

			return parsed.data;
		} catch (error) {
			this.logger.error('Discarding an unreadable response', { error });
			return undefined;
		}
	}
}
