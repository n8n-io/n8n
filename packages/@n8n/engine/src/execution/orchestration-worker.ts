import { UnimplementedError } from '../common';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStartHandler } from './execution-start-handler';

/**
 * Consumes the orchestration queue and routes each message to its handler.
 */
export class OrchestrationWorker {
	constructor(
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly startHandler: ExecutionStartHandler,
	) {}

	start(): void {
		this.orchestrationQueue.start(async (message) => {
			switch (message.type) {
				case 'execution:enqueued':
					await this.startHandler.handle(message);
					break;
				default:
					throw new UnimplementedError(
						`orchestration worker received an unimplemented message type: ${String(message.type)}`,
					);
			}
		});
	}

	async stop(): Promise<void> {
		await this.orchestrationQueue.stop();
	}
}
