/**
 * The work queue for engine tasks.
 *
 * TODO: add additional message types and functionality as we build the engine components.
 */

export interface ExecutionEnqueuedEvent {
	type: 'execution:enqueued';
	executionId: string;
}

export type WorkQueueMessage = ExecutionEnqueuedEvent;

export interface WorkQueue {
	publish(message: WorkQueueMessage): Promise<void>;
}
