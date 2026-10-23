import { UnimplementedError } from '../common';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStartHandler } from './execution-start-handler';
import type { StepSettledHandler } from './step-settled-handler';

/**
 * Consumes the orchestration queue and routes each message to its handler.
 */
export class OrchestrationWorker {
	constructor(
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly startHandler: ExecutionStartHandler,
		private readonly settledHandler: StepSettledHandler,
	) {}

	start(): void {
		this.orchestrationQueue.start(async (message) => {
			switch (message.type) {
				case 'execution:enqueued':
					await this.startHandler.handle(message);
					break;
				case 'step:settled':
					await this.settledHandler.handle(message);
					break;
				default: {
					// Exhaustive today; the throw guards an off-contract message at runtime.
					const unhandled: never = message;
					throw new UnimplementedError(
						`orchestration worker received an unimplemented message type: ${JSON.stringify(unhandled)}`,
					);
				}
			}
		});
	}

	async stop(): Promise<void> {
		await this.orchestrationQueue.stop();
	}
}
