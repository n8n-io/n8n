import { toResult } from '@n8n/utils/result';

import type { JsonValue } from '../common';
import type { EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type {
	ExecutionResponse,
	FailureMessage,
	ResponseEmitter,
} from './execution-response.types';
import type { ResponseTransport, Unsubscribe } from './response-transport';

/** A transport must be able to carry every frame the channel accepts. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

/**
 * Sends responses from an execution back to its caller.
 *
 * The engine publishes a response with an execution ID. A caller subscribes
 * with the same ID and receives only responses for that execution.
 *
 * This class serializes outgoing responses, limits their size, and validates
 * incoming responses. The transport delivers them in-process or across process
 * boundaries.
 */
export class ExecutionResponseChannel {
	constructor(
		private readonly transport: ResponseTransport,
		private readonly logger: EngineLogger,
		private readonly maxFrameBytes: number = MAX_FRAME_BYTES,
	) {}

	publish(response: ExecutionResponse): void {
		this.transport.publish(response.executionId, this.toFrame(response));
	}

	/** Listens to one execution. Call the returned function once the run is answered. */
	subscribe(executionId: string, handler: (response: ExecutionResponse) => void): Unsubscribe {
		return this.transport.subscribe(executionId, (frame) => {
			const response = this.fromFrame(frame);
			if (response === undefined) return;

			try {
				handler(response);
			} catch (error) {
				// One bad subscriber must not take the transport down with it.
				this.logger.error('a response subscriber threw', {
					executionId: response.executionId,
					type: response.type,
					error,
				});
			}
		});
	}

	/** Gives one step a response sender without exposing execution routing. */
	emitterFor(executionId: string): ResponseEmitter {
		return {
			send: (payload: JsonValue) => this.publish({ type: 'response', executionId, payload }),
		};
	}

	async stop(): Promise<void> {
		await this.transport.stop();
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

	private fromFrame(frame: string): ExecutionResponse | undefined {
		try {
			const parsed = executionResponseSchema.safeParse(JSON.parse(frame));
			if (!parsed.success) {
				this.logger.error('discarding a malformed response', {
					details: parsed.error.flatten(),
				});
				return undefined;
			}

			return parsed.data;
		} catch (error) {
			this.logger.error('discarding an unreadable response frame', { error });
			return undefined;
		}
	}
}
