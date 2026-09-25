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
import type { RedisExecutionResponseChannelNameGenerator } from './redis-execution-response-channel';

export interface RedisResponsePublisher {
	publish(channel: string, message: string): Promise<unknown>;
	disconnect(): void;
}

/** Publishes serialized execution responses to execution-specific Redis channels. */
export class RedisExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly publisher: RedisResponsePublisher,
		private readonly getChannelName: RedisExecutionResponseChannelNameGenerator,
		private readonly logger: Logger,
	) {}

	send(response: ExecutionResponse): Result<void, Error> {
		if (this.stopped) {
			return createResultError(new UnexpectedError('The execution response sender has stopped.'));
		}

		const frameResult = serializeExecutionResponse(response, this.logger);

		void this.publisher
			.publish(this.getChannelName(response.executionId), frameResult.frame)
			.catch((error: unknown) => {
				this.logger.error('Failed to publish an execution response', {
					executionId: response.executionId,
					error,
				});
			});

		return frameResult.ok ? createResultOk(undefined) : createResultError(frameResult.error);
	}

	emitterFor(executionId: string): ResponseEmitter {
		return {
			send: (payload: JsonValue) => this.send({ type: 'response', executionId, payload }),
		};
	}

	async stop(): Promise<void> {
		if (this.stopped) return;

		this.stopped = true;
		this.publisher.disconnect();
	}
}
