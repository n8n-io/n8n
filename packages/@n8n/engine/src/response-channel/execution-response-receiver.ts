import type { EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type { ExecutionResponse } from './execution-response.types';
import type { ResponseFrameReceiver, Unsubscribe } from './response-frame';

/** Receives responses from executions and delivers them to their callers. */
export class ExecutionResponseReceiver {
	constructor(
		private readonly frameReceiver: ResponseFrameReceiver,
		private readonly logger: EngineLogger,
	) {}

	/** Listens to one execution. Call the returned function once the run is answered. */
	receive(executionId: string, handler: (response: ExecutionResponse) => void): Unsubscribe {
		return this.frameReceiver.receive(executionId, (frame) => {
			const response = this.fromFrame(frame);
			if (response === undefined) return;

			try {
				handler(response);
			} catch (error) {
				// One bad handler must not take the frame receiver down with it.
				this.logger.error('a response handler threw', {
					executionId: response.executionId,
					type: response.type,
					error,
				});
			}
		});
	}

	async stop(): Promise<void> {
		await this.frameReceiver.stop();
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
