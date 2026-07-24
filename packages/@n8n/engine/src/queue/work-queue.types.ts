/**
 * Engine work queues.
 *
 * Two logical queues are used so a flood of step events can't starve
 * orchestration (or vice versa): an **orchestration queue** (execution/step
 * lifecycle planning) and a **step queue** (steps ready to execute). The port
 * is generic over its message type; adapters (in-memory now, Redis later)
 * implement it per queue.
 */

export interface ExecutionEnqueuedEvent {
	type: 'execution:enqueued';
	executionId: string;
}

/** Messages consumed by the orchestration worker. */
export type OrchestrationMessage = ExecutionEnqueuedEvent;

export interface StepReadyEvent {
	type: 'step:ready';
	executionId: string;
	stepId: string;
}

/** Messages consumed by the step worker (CAT-2870). */
export type StepMessage = StepReadyEvent;

export interface WorkQueue<TMessage> {
	/** Publish a message onto the queue. */
	publish(message: TMessage): Promise<void>;
	/** Register the single consumer; dispatch begins for queued and future messages. */
	start(handler: (message: TMessage) => Promise<void>): void;
	/** Stop consuming; awaits any in-flight handler. */
	stop(): Promise<void>;
}
