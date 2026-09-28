import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionResponse,
	ExecutionResponseSender,
	JsonValue,
	ResponseEmitter,
} from '@n8n/engine';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import { serializeExecutionResponse } from './execution-response-frame';
import type { InMemoryExecutionResponseChannel } from './in-memory-execution-response-channel';

export class InMemoryExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly channel: InMemoryExecutionResponseChannel,
		private readonly logger: Logger,
		private readonly maxFrameBytes?: number,
	) {}

	send(response: ExecutionResponse): Result<void, Error> {
		if (this.stopped) {
			return createResultError(new UnexpectedError('The execution response sender has stopped.'));
		}

		const frameResult = serializeExecutionResponse(response, this.logger, this.maxFrameBytes);
		this.channel.publish(response.executionId, frameResult.frame);

		return frameResult.ok ? createResultOk(undefined) : createResultError(frameResult.error);
	}

	/** Gives one step a response sender without exposing execution routing. */
	emitterFor(executionId: string): ResponseEmitter {
		return {
			send: (payload: JsonValue) => this.send({ type: 'response', executionId, payload }),
		};
	}

	async stop(): Promise<void> {
		this.stopped = true;
	}
}
