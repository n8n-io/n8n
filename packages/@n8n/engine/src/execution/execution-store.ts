import type { WorkflowGraph } from '../graph';
import type {
	ExecutionContext,
	ExecutionMode,
	ExecutionStatus,
	TriggerOutputs,
} from './execution.types';

/** The fields the write side supplies and the execution path reads back. */
interface BaseExecutionRecord {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	triggerOutputs: TriggerOutputs | null;
	context: ExecutionContext;
}

/** A new execution to persist. Timestamps are assigned by the store. */
export interface NewExecutionRecord extends BaseExecutionRecord {
	/** Caller-minted id. The store never mints one. */
	id: string;
}

/**
 * What running an execution needs of its row. No timing: the execution path
 * decides on `status`, never on when anything happened. The read path has its
 * own view (`ExecutionView`).
 */
export type ExecutionRecord = BaseExecutionRecord;

/** Thrown by `loadExecution` when no execution exists for the given id. */
export class ExecutionNotFoundError extends Error {
	constructor(readonly executionId: string) {
		super(`Execution not found: ${executionId}`);
		this.name = 'ExecutionNotFoundError';
	}
}

/** Persistence interface for executions. */
export interface ExecutionStore {
	/** Persist a new execution record under the caller-minted `record.id`. */
	createExecution(record: NewExecutionRecord): Promise<void>;

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
