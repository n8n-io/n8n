import { toResult } from '@n8n/utils/result';

import type { EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type { ExecutionResponse, FailureMessage } from './execution-response.types';
import type { ResponseTransport, Unsubscribe } from './response-transport';

/** A transport must be able to carry every frame the channel accepts. */
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

/**
 * Where an execution's responses go, and where a caller picks them up.
 *
 * Every call names one execution: a publish is addressed to the run that
 * produced it, and a subscriber asks for one run and hears nothing else. The
 * transport below decides how that is carried — one channel per execution, or
 * one shared bus — and no caller can tell the difference.
 *
 * One class over any `ResponseTransport`. Everything that must not vary
 * between deployments lives here — the envelope, the size cap and validation on
 * receive — so an in-process deployment cannot accept a response that a
 * networked one mangles.
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
