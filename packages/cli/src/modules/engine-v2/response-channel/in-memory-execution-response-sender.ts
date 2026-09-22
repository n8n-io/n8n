import type { ExecutionResponse, ExecutionResponseSender } from '@n8n/engine';

import type { InMemoryExecutionResponseChannel } from './in-memory-execution-response-channel';

export class InMemoryExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(private readonly channel: InMemoryExecutionResponseChannel) {}

	send(response: ExecutionResponse): void {
		if (this.stopped) return;

		this.channel.publish(response.executionId, JSON.stringify(response));
	}

	async stop(): Promise<void> {
		this.stopped = true;
	}
}
