import { createConsoleLogger, type EngineLogger } from '../logging';
import { executionResponseSchema } from './execution-response.schema';
import type { ExecutionResponse } from './execution-response.types';
import { noopResponseTransport, type ResponseTransport } from './response-transport';

/**
 * Where an execution's responses go, and where a caller picks them up.
 *
 * One class over any `ResponseTransport`. Everything that must not vary
 * between deployments lives here — the envelope, validation on receive, and
 * the per-step scoping — so an in-process deployment cannot accept a response
 * that a networked one mangles.
 */
export class ExecutionResponseChannel {
	private readonly logger: EngineLogger;

	constructor(
		private readonly transport: ResponseTransport = noopResponseTransport,
		logger?: EngineLogger,
	) {
		this.logger = logger ?? createConsoleLogger();
	}

	publish(response: ExecutionResponse): void {
		this.transport.publish(JSON.stringify(response));
	}

	subscribe(handler: (response: ExecutionResponse) => void): void {
		this.transport.subscribe((frame) => {
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
			if (parsed.success) return parsed.data;

			this.logger.error('discarding a malformed response', {
				details: parsed.error.flatten(),
			});
		} catch (error) {
			this.logger.error('discarding an unreadable response frame', { error });
		}

		return undefined;
	}
}
