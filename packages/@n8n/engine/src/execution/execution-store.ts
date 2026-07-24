import type { JsonObject } from '../common';
import type { WorkflowGraph } from '../graph';
import type { ExecutionMode, ExecutionStatus } from './execution.types';

/** A new execution to persist. `id` and timestamps are assigned by the store. */
export interface NewExecutionRecord {
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerPayload: JsonObject | null;
}

/**
 * The persistence store for executions.
 */
export interface ExecutionStore {
	/** Persist a new execution record; returns its generated id. */
	createExecution(record: NewExecutionRecord): Promise<{ id: string }>;
}
