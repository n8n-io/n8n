/**
 * Engine work queue — see design doc §2.2.
 *
 * The production deployment uses Redis as the queue backbone (orchestration
 * queue + step queue, both consumed with BRPOP). For M1 we ship an in-memory
 * impl by default; the consumer (orchestration worker) is in a later ticket
 * and the queue *boundary* is the contract we want to lock in now, not the
 * impl.
 */

export interface ExecutionStartedEvent {
	type: 'execution:started';
	executionId: string;
}

export type WorkQueueMessage = ExecutionStartedEvent;

export interface WorkQueue {
	publish(message: WorkQueueMessage): Promise<void>;
}
