import type { EngineLogger } from '../logging';
import { InMemoryWorkQueue } from './in-memory-work-queue';
import type { EngineWorkQueues, OrchestrationMessage, StepMessage } from './work-queue.types';

export interface InMemoryWorkQueuesOptions {
	/** The maximum number of handlers that each queue runs at once. Defaults to 1 each. */
	concurrency?: { orchestration?: number; step?: number };
	/** Defaults to the console. */
	logger?: EngineLogger;
}

/**
 * Creates the engine work queues in the memory of this process. Only this
 * process consumes them, and queued messages are lost when it ends.
 */
export function createInMemoryWorkQueues({
	concurrency = {},
	logger,
}: InMemoryWorkQueuesOptions = {}): EngineWorkQueues {
	return {
		orchestration: new InMemoryWorkQueue<OrchestrationMessage>(logger, {
			concurrency: concurrency.orchestration,
		}),
		step: new InMemoryWorkQueue<StepMessage>(logger, { concurrency: concurrency.step }),
	};
}
