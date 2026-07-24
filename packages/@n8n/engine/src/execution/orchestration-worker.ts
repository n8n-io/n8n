import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStartHandler } from './execution-start-handler';

/**
 * Consumes the orchestration queue and routes each message to its handler. M1
 * handles `execution:enqueued`; more message types arrive with later tickets.
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
			}
		});
	}

	async stop(): Promise<void> {
		await this.orchestrationQueue.stop();
	}
}
