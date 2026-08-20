/**
 * Engine work queues.
 *
 * Two logical queues are used so a flood of step events can't starve
 * orchestration (or vice versa): an **orchestration queue** (execution/step
 * lifecycle planning) and a **step queue** (steps ready to execute). `WorkQueue`
 * is generic over its message type; adapters implement it per queue.
 */

export interface ExecutionEnqueuedEvent {
	type: 'execution:enqueued';
	executionId: string;
}

/**
 * A step has reached a terminal state — completed, failed, or skipped.
 * Carries ids only, like `step:ready` — the consumer reads the step row
 * for the outcome.
 */
export interface StepSettledEvent {
	type: 'step:settled';
	executionId: string;
	stepId: string;
}

/** Messages consumed by the orchestration worker. */
export type OrchestrationMessage = ExecutionEnqueuedEvent | StepSettledEvent;

export interface StepReadyEvent {
	type: 'step:ready';
	executionId: string;
	stepId: string;
}

/** Messages consumed by the step worker. */
export type StepMessage = StepReadyEvent;

export interface WorkQueue<TMessage> {
	publish(message: TMessage): Promise<void>;
	/** Register the single consumer; dispatch begins for queued and future messages. */
	start(handler: (message: TMessage) => Promise<void>): void;
	/**
	 * Stop consuming; awaits any in-flight handler and leaves queued messages
	 * unconsumed. Never blocks on work no longer being dispatched.
	 */
	stop(): Promise<void>;
}
