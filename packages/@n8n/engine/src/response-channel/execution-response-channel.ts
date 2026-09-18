import type { EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type { ExecutionResponse } from './execution-response.types';
import type { ResponseTransport, Unsubscribe } from './response-transport';

/**
 * Where an execution's responses go, and where a caller picks them up.
 *
 * Every call names one execution: a publish is addressed to the run that
 * produced it, and a subscriber asks for one run and hears nothing else. The
 * transport below decides how that is carried — one channel per execution, or
 * one shared bus — and no caller can tell the difference.
 *
 * One class over any `ResponseTransport`. Everything that must not vary
 * between deployments lives here — the envelope and validation on receive — so
 * an in-process deployment cannot accept a response that a networked one
 * mangles.
 */
export class ExecutionResponseChannel {
	constructor(
		private readonly transport: ResponseTransport,
		private readonly logger: EngineLogger,
	) {}

	publish(response: ExecutionResponse): void {
		this.transport.publish(response.executionId, JSON.stringify(response));
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
