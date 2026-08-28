import { UnimplementedError } from '../common';
import type { StepMessage, WorkQueue } from '../queue';
import type { StepReadyHandler } from './step-ready-handler';

/**
 * Consumes the step queue and routes each message to its handler. Kept separate
 * from the orchestration worker so a flood of step work can't starve planning.
 */
export class StepWorker {
	constructor(
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly readyHandler: StepReadyHandler,
	) {}

	start(): void {
		this.stepQueue.start(async (message) => {
			switch (message.type) {
				case 'step:ready':
					await this.readyHandler.handle(message);
					break;
				default: {
					// Exhaustive today; the throw guards an off-contract message at runtime.
					// `message.type`, not `message`: a non-union doesn't narrow to `never`.
					const unhandled: never = message.type;
					throw new UnimplementedError(
						`step worker received an unimplemented message type: ${String(unhandled)}`,
					);
				}
			}
		});
	}

	async stop(): Promise<void> {
		await this.stepQueue.stop();
	}
}
