import type { WorkflowGraph } from '../graph';
import type { ExecutionMode, ExecutionStatus, TriggerOutputs } from './execution.types';

/** A new execution to persist. `id` and timestamps are assigned by the store. */
export interface NewExecutionRecord {
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerOutputs: TriggerOutputs | null;
}

/**
 * What running an execution needs of its row. No timing: the execution path
 * decides on `status`, never on when anything happened. The read path has its
 * own view (`ExecutionView`).
 */
export interface ExecutionRecord {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerOutputs: TriggerOutputs | null;
}

/** Thrown by `loadExecution` when no execution exists for the given id. */
export class ExecutionNotFoundError extends Error {
	constructor(readonly executionId: string) {
		super(`Execution not found: ${executionId}`);
		this.name = 'ExecutionNotFoundError';
	}
}

/** Persistence interface for executions. */
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
	 * Record an execution's outcome: writes the final status and the finish time
	 * together, as a compare-and-set on `running`, so they can't be observed apart.
	 */
	finishExecution(id: string, status: 'completed' | 'failed'): Promise<boolean>;
}
