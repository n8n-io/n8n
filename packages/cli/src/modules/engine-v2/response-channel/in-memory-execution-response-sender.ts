import type { Logger } from '@n8n/backend-common';
import type { ExecutionResponse, ExecutionResponseSender } from '@n8n/engine';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionChannelPublisher } from './execution-channel';
import { serializeExecutionResponse } from './execution-response-frame';

/** Sends execution responses on the `responses` topic of the execution channel. */
export class ExecutionResponseChannelSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly publisher: ExecutionChannelPublisher,
		private readonly logger: Logger,
		private readonly maxFrameBytes?: number,
	) {}

	send(response: ExecutionResponse): Result<void, Error> {
		if (this.stopped) {
			return createResultError(new UnexpectedError('The execution response sender has stopped.'));
		}

		const frameResult = serializeExecutionResponse(response, this.logger, this.maxFrameBytes);
		this.publisher.publish('responses', response.executionId, frameResult.frame);

		return frameResult.ok ? createResultOk(undefined) : createResultError(frameResult.error);
	}

	/** Stops sending. The owner of the publisher releases its connection. */
	async stop(): Promise<void> {
		this.stopped = true;
	}
}
