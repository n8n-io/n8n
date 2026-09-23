import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionResponse,
	ExecutionResponseSender,
	JsonValue,
	ResponseEmitter,
	UndeliverableMessage,
} from '@n8n/engine';
import { toResult } from '@n8n/utils/result';
import { UnexpectedError } from 'n8n-workflow';

import type { InMemoryExecutionResponseChannel } from './in-memory-execution-response-channel';

/** A response channel must be able to carry every frame this class produces. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

type FrameAndMaybeError = {
	error?: Error;
	frame: string;
};

export class InMemoryExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly channel: InMemoryExecutionResponseChannel,
		private readonly logger: Logger,
		private readonly maxFrameBytes: number = MAX_FRAME_BYTES,
	) {}

	send(response: ExecutionResponse): Error | null {
		if (this.stopped) return null;

		const frameResult = this.toFrame(response);
		this.channel.publish(response.executionId, frameResult.frame);

		return frameResult.error ?? null;
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

	private toFrame(response: ExecutionResponse): FrameAndMaybeError {
		const serialized = toResult(() => JSON.stringify(response));
		if (!serialized.ok) {
			this.logger.warn('Could not serialize an execution response', {
				executionId: response.executionId,
				type: response.type,
				error: serialized.error,
			});
			return this.undeliverableFrame(response.executionId, {
				code: 'RESPONSE_SERIALIZATION_FAILED',
				message: 'The execution response could not be serialized.',
			});
		}

		if (Buffer.byteLength(serialized.result) > this.maxFrameBytes) {
			this.logger.warn('Execution response exceeds the frame size limit', {
				executionId: response.executionId,
				type: response.type,
			});
			return this.undeliverableFrame(response.executionId, {
				code: 'RESPONSE_TOO_LARGE',
				message: `The execution response exceeds the maximum size of ${this.maxFrameBytes} bytes.`,
			});
		}

		return { frame: serialized.result };
	}

	private undeliverableFrame(
		executionId: string,
		error: UndeliverableMessage['error'],
	): FrameAndMaybeError {
		const frame = JSON.stringify({
			type: 'undeliverable',
			executionId,
			error,
		} satisfies UndeliverableMessage);

		return {
			frame,
			error: new UnexpectedError(error.message, {
				extra: {
					code: error.code,
				},
			}),
		};
	}
}
