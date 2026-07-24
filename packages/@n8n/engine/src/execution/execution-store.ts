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

/** A full execution as loaded by a worker. */
export interface ExecutionRecord {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerPayload: JsonObject | null;
}

/** Thrown by `loadExecution` when no execution exists for the given id. */
export class ExecutionNotFoundError extends Error {
	constructor(readonly executionId: string) {
		super(`Execution not found: ${executionId}`);
		this.name = 'ExecutionNotFoundError';
	}
}

/**
 * Persistence port for executions. The core depends on this interface, not on
 * TypeORM; the adapter lives in `database/`.
 */
export interface ExecutionStore {
	/** Persist a new execution record; returns its generated id. */
	createExecution(record: NewExecutionRecord): Promise<{ id: string }>;

	/** Load a full execution by id. Throws `ExecutionNotFoundError` if absent. */
	loadExecution(id: string): Promise<ExecutionRecord>;

	/**
	 * Compare-and-set status transition. Returns `true` iff this call performed
	 * the transition, so duplicate/redelivered events are handled idempotently.
	 */
	transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean>;

	/**
	 * Mark a running execution `failed` and stamp `finishedAt`. CAS on the
	 * `running` status; returns `true` iff this call performed the transition.
	 */
	failExecution(id: string): Promise<boolean>;
}
