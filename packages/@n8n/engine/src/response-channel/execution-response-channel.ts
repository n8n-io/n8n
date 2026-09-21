import type { EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type { ExecutionResponse } from './execution-response.types';
import type { ResponseTransport, Unsubscribe } from './response-transport';

/**
 * Sends responses from an execution back to its caller.
 *
 * The engine publishes a response with an execution ID. A caller subscribes
 * with the same ID and receives only responses for that execution.
 *
 * This class serializes outgoing responses and validates incoming responses.
 * The transport delivers them in-process or across process boundaries.
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
