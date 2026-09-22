import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionResponse,
	ExecutionResponseSender,
	FailureMessage,
	JsonValue,
	ResponseEmitter,
} from '@n8n/engine';
import { toResult } from '@n8n/utils/result';

import type { InMemoryExecutionResponseChannel } from './in-memory-execution-response-channel';

/** A response channel must be able to carry every frame this class produces. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

export class InMemoryExecutionResponseSender implements ExecutionResponseSender {
	private stopped = false;

	constructor(
		private readonly channel: InMemoryExecutionResponseChannel,
		private readonly logger: Logger,
		private readonly maxFrameBytes: number = MAX_FRAME_BYTES,
	) {}

	send(response: ExecutionResponse): void {
		if (this.stopped) return;

		this.channel.publish(response.executionId, this.toFrame(response));
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

	private toFrame(response: ExecutionResponse): string {
		const serialized = toResult(() => JSON.stringify(response));
		if (!serialized.ok) {
			this.logger.warn('Could not serialize an execution response', {
				executionId: response.executionId,
				type: response.type,
				error: serialized.error,
			});
			return this.failureFrame(response.executionId, {
				code: 'RESPONSE_SERIALIZATION_FAILED',
				message: 'The execution response could not be serialized.',
			});
		}

		if (Buffer.byteLength(serialized.result) > this.maxFrameBytes) {
			this.logger.warn('Execution response exceeds the frame size limit', {
				executionId: response.executionId,
				type: response.type,
			});
			return this.failureFrame(response.executionId, {
				code: 'RESPONSE_TOO_LARGE',
				message: `The execution response exceeds the maximum size of ${this.maxFrameBytes} bytes.`,
			});
		}

		return serialized.result;
	}

	private failureFrame(executionId: string, error: FailureMessage['error']): string {
		return JSON.stringify({ type: 'failure', executionId, error } satisfies FailureMessage);
	}
}
