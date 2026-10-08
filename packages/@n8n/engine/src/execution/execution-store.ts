import type { WorkflowGraph } from '../graph';
import type { ResponseExpectation } from '../response-channel';
import type {
	CallerContext,
	ExecutionMode,
	ExecutionStatus,
	SeededSteps,
	TriggerOutputs,
	WorkflowDocument,
} from './execution.types';

/** The fields the write side supplies and the execution path reads back. */
interface BaseExecutionRecord {
	/** Caller-minted id. The store never mints one. */
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	graph: WorkflowGraph;
	/** Stored for the read path only. Nothing on the execution path reads it. */
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
	/** Recorded as completed at start, beside the trigger. */
	seededSteps?: SeededSteps | null;
	callerContext: CallerContext;
	/** What kind of a response the caller expects. */
	responseExpectation: ResponseExpectation;
}

/** A new execution to persist. Timestamps are assigned by the store. */
export type NewExecutionRecord = BaseExecutionRecord;

/**
 * What running an execution needs of its row. The execution path decides on
 * `status`, never on when anything happened, so the only time it carries is
 * `finishedAt`, which it reports but never decides on. The read path has its
 * own view (`ExecutionView`).
 */
export type ExecutionRecord = BaseExecutionRecord & {
	/** When the execution ended, or `null` while it has not. */
	finishedAt: Date | null;
};

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
	 * together, as a compare-and-set on the live statuses, so they can't be
	 * observed apart. Returns the finish time it wrote, so the caller reports the
	 * time the row records, or `null` when the compare-and-set lost.
	 */
	finishExecution(id: string, status: 'completed' | 'failed'): Promise<{ finishedAt: Date } | null>;

	/**
	 * End an execution on request, from any status that has not ended. Returns
	 * the finish time it wrote, so the caller reports the time the row records,
	 * or `null` when the execution had already ended.
	 */
	cancelExecution(id: string): Promise<{ finishedAt: Date } | null>;

	/**
	 * Sets a live execution's status from the state of its steps: `waiting` when
	 * every step it still owes is suspended, `running` when one step can run.
	 *
	 * Call this when a step suspends and when a step settles. A resume does not
	 * call it, so the status can lag until the resumed step settles.
	 *
	 * The refresh takes no lock, so it can lose a race and confuse `running`
	 * with `waiting`. Callers may test whether the execution ended, as both step
	 * handlers do. Read the step rows to tell `running` from `waiting`.
	 */
	refreshLiveStatus(id: string): Promise<void>;
}
