import type { JsonObject } from '../common';
import type { WorkflowGraph } from '../graph';
import type { ExecutionMode, ExecutionStatus } from './entities';

/** A new execution to persist. `id` and timestamps are assigned by the store. */
export interface NewExecutionRecord {
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerPayload: JsonObject | null;
}

/**
 * Persistence port for executions. The core (`StartExecutionService`) depends
 * on this interface, not on TypeORM, so the storage backend stays swappable and
 * the policy is testable without a database.
 */
export interface ExecutionStore {
	/** Persist a new execution record; returns its generated id. */
	createExecution(record: NewExecutionRecord): Promise<{ id: string }>;
}
