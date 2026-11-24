/**
 * Engine work queues.
 *
 * Two logical queues are used so a flood of step events can't starve
 * orchestration (or vice versa): an **orchestration queue** (execution/step
 * lifecycle planning) and a **step queue** (steps ready to execute). Each queue
 * has a publisher side and a consumer side, generic over its message type.
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

export interface WorkQueuePublisher<TMessage> {
	publish(message: TMessage): Promise<void>;
}

export interface WorkQueueConsumer<TMessage> {
	/**
	 * Register the single consumer; dispatch begins for queued and future
	 * messages. The adapter runs up to its concurrency limit of handlers at once
	 * and does not promise a delivery order. When a handler finishes, the adapter
	 * starts the next queued message. A handler that throws frees its slot. Its
	 * error affects only its own message.
	 */
	start(handler: (message: TMessage) => Promise<void>): void;
	/**
	 * Stop consuming. Starts no new message, waits for every in-flight handler
	 * and leaves queued messages unconsumed. Never blocks on work no longer
	 * being dispatched.
	 */
	stop(): Promise<void>;
}

/** The two queues the engine runs on, by side. */
export interface EngineWorkQueues {
	publishers: {
		orchestration: WorkQueuePublisher<OrchestrationMessage>;
		step: WorkQueuePublisher<StepMessage>;
	};
	/** The runtime starts and stops only the consumers of its roles. */
	consumers: {
		/** Feeds the orchestration worker. */
		orchestration: WorkQueueConsumer<OrchestrationMessage>;
		/** Feeds the step worker. */
		step: WorkQueueConsumer<StepMessage>;
	};
}
