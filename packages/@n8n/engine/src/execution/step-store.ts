import type { JsonValue } from '../common';
import type { StepStatus } from './execution.types';

/** A new step to persist. `id` and timestamps are assigned by the store. */
export interface NewStepRecord {
	executionId: string;
	nodeId: string;
	status: StepStatus;
}

/** The error that failed a step, as persisted on its row. */
export interface StepError {
	name: string;
	message: string;
	stack?: string;
	/**
	 * Step-type-specific error detail, persisted without inspection — the engine
	 * owns only `name`/`message`/`stack`. Unpopulated until executors have a way
	 * to hand structured detail across the seam; they only throw today.
	 */
	details?: JsonValue;
}

/** A step record. */
export interface StepRecord {
	id: string;
	executionId: string;
	nodeId: string;
	status: StepStatus;
	/** Outputs of a completed step; `null` until it completes. */
	outputs: JsonValue | null;
	/** The error that failed the step; `null` unless it failed. */
	error: StepError | null;
}

/** Thrown by `loadStep` when no step exists for the given id. */
export class StepNotFoundError extends Error {
	constructor(readonly stepId: string) {
		super(`Step not found: ${stepId}`);
		this.name = 'StepNotFoundError';
	}
}

/** Persistence interface for step records. */
export interface StepStore {
	/**
	 * Persist new step records, batched so planning a fan-out costs a single round
	 * trip. Returns the rows actually created.
	 *
	 * If a step for a given `(executionId, nodeId)` already exists, it is skipped
	 * and not returned. This allows multiple planners to race to enqueue the same
	 * node without erroring or duplicating work. We return the actually created rows
	 * so the caller knows which step creations it needs to publish.
	 */
	createSteps(records: NewStepRecord[]): Promise<Array<{ id: string; nodeId: string }>>;

	/** Load a single step by id. Throws `StepNotFoundError` if absent. */
	loadStep(id: string): Promise<StepRecord>;

	/**
	 * Claim a queued step for execution (`queued → running`). A compare-and-set,
	 * so it returns `true` for at most one caller and duplicate/redelivered
	 * events are handled idempotently.
	 *
	 * Transitions are exposed one named method at a time rather than as a generic
	 * `(from, to)` pair, so the interface can't express a transition the
	 * lifecycle doesn't allow.
	 */
	claimStep(id: string): Promise<boolean>;

	/**
	 * Record a successful run: persist `outputs` and mark the step completed.
	 * A compare-and-set on `running`, so it returns `false` if the caller no
	 * longer holds the claim — the outcome and the status are written together,
	 * so they can't be observed apart.
	 */
	completeStep(id: string, outputs: JsonValue): Promise<boolean>;

	/** Record a failed run: persist `error` and mark the step failed. As `completeStep`. */
	failStep(id: string, error: StepError): Promise<boolean>;

	/**
	 * Outputs of the given nodes' *completed* steps within an execution, keyed by
	 * node id. A node whose step is absent or hasn't completed maps to `null`.
	 *
	 * This is for gathering a step's inputs, so it deliberately can't answer
	 * "have all predecessors completed?" — the two are indistinguishable from a
	 * `null` here. Use `loadCompletedNodeIds` for that.
	 */
	loadStepOutputs(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, JsonValue | null>>;

	/**
	 * Which of `nodeIds` have a completed step in the execution. Returns the
	 * subset rather than a yes/no so one query can answer readiness for several
	 * candidate steps at once.
	 */
	loadCompletedNodeIds(executionId: string, nodeIds: string[]): Promise<Set<string>>;

	/** Whether the execution has any step still `queued` or `running`. */
	hasActiveSteps(executionId: string): Promise<boolean>;

	/** Whether any of the execution's steps failed. */
	hasFailedSteps(executionId: string): Promise<boolean>;
}
