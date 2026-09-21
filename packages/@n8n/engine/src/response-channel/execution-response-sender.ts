import type { ExecutionResponse } from './execution-response.types';
import type { ResponseFrameSender } from './response-frame';

/** Sends responses from an execution back to its caller. */
export class ExecutionResponseSender {
	constructor(private readonly frameSender: ResponseFrameSender) {}

	send(response: ExecutionResponse): void {
		this.frameSender.send(response.executionId, JSON.stringify(response));
	}

	async stop(): Promise<void> {
		await this.frameSender.stop();
	}
}
