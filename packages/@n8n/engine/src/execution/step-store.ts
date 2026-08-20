import type { JsonValue } from '../common';
import type { StepKey, StepKeyId, StepSlots, StepStatus } from './execution.types';

/**
 * A new step to persist. `id` and timestamps are assigned by the store.
 *
 * Creation statuses only: a row becomes `running`, `failed`, or `cancelled`
 * solely through `claimStep`, `failStep`, or `cancelQueuedSteps`, so it
 * cannot bypass the checks and locking those transitions enforce.
 *
 * A step created `completed` (the trigger) must carry its slot list, even
 * `[]`: a missing one persists as SQL NULL, which liveness reads as every
 * output slot dead.
 */
export type NewStepRecord = { nodeId: string; iteration: number } & (
	| { status: Extract<StepStatus, 'queued' | 'skipped'>; outputs?: never }
	| { status: Extract<StepStatus, 'completed'>; outputs: StepSlots }
);

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
	iteration: number;
	status: StepStatus;
	/** Outputs of a completed step, indexed by output slot; `null` until it completes. */
	outputs: StepSlots | null;
	/** The error that failed the step; `null` unless it failed. */
	error: StepError | null;
}

/**
 * Planning view of a step row: everything a settlement decision needs, and no
 * payloads — outputs can dominate row size, and planning only ever asks
 * whether a slot holds data, not what.
 */
export interface StepSummary {
	id: string;
	nodeId: string;
	iteration: number;
	status: StepStatus;
	/** Per output slot: whether the completed step put data there. Empty unless completed. */
	filledOutputSlots: boolean[];
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
	 * Persist new step records for one execution, batched so planning a fan-out
	 * costs a single round trip. Returns the rows actually created.
	 *
	 * If a step for a given `(executionId, nodeId, iteration)` already exists, it
	 * is skipped and not returned. This allows multiple planners to race to enqueue
	 * the same step without erroring or duplicating work. A further iteration of
	 * the same node is a new row, not a duplicate. We return the actually created rows
	 * so the caller knows which step creations it needs to publish.
	 *
	 * Creates nothing once any step in the execution has failed (serialized with
	 * `failStep`), so a planning insert cannot land after the failure's
	 * cancellation sweep and strand rows `queued` forever.
	 */
	createSteps(
		executionId: string,
		records: NewStepRecord[],
	): Promise<Array<{ id: string } & StepKey>>;

	/** Load a single step by id. Throws `StepNotFoundError` if absent. */
	loadStep(id: string): Promise<StepRecord>;

	/**
	 * Claim a queued step for execution (`queued -> running`). A compare-and-set,
	 * so it returns the claimed step for at most one caller — `null` means the
	 * claim was lost and duplicate/redelivered events are handled idempotently.
	 *
	 * The claim also refuses once any step in the execution has failed
	 * (serialized with `failStep`), so fail-fast holds even for a `step:ready`
	 * published before the failure landed.
	 *
	 * Transitions are exposed one named method at a time rather than as a generic
	 * `(from, to)` pair, so the interface can't express a transition the
	 * lifecycle doesn't allow.
	 */
	claimStep(id: string): Promise<StepRecord | null>;

	/**
	 * Record a successful run: persist `outputs` and mark the step completed.
	 * A compare-and-set on `running`, so it returns `false` if the caller no
	 * longer holds the claim — the outcome and the status are written together,
	 * so they can't be observed apart.
	 */
	completeStep(id: string, outputs: StepSlots): Promise<boolean>;

	/** Record a failed run: persist `error` and mark the step failed. As `completeStep`. */
	failStep(id: string, error: StepError): Promise<boolean>;

	/** Cancel every step of the execution still `queued` (`queued -> cancelled`). */
	cancelQueuedSteps(executionId: string): Promise<void>;

	/**
	 * Step rows of the given keys within an execution, keyed by `stepKeyId`. A
	 * key with no row yet is absent from the result — absence always means
	 * "not planned yet", never "forgotten".
	 *
	 * Full rows, outputs included — for gathering a ready step's inputs from its
	 * direct predecessors. Planning reads `loadStepSummariesByKeys` instead.
	 */
	loadStepsByKeys(executionId: string, keys: StepKey[]): Promise<Record<StepKeyId, StepRecord>>;

	/**
	 * Planning view of the given keys' rows, keyed by `stepKeyId`; absent as in
	 * `loadStepsByKeys`. The per-slot booleans are computed in the database, so
	 * planning never pulls the potentially large outputs over the wire.
	 */
	loadStepSummariesByKeys(
		executionId: string,
		keys: StepKey[],
	): Promise<Record<StepKeyId, StepSummary>>;

	/**
	 * The node's highest-iteration row, or `null` when it has none. For a
	 * batch node this is the loop's ledger tip.
	 */
	loadLatestStep(executionId: string, nodeId: string): Promise<StepRecord | null>;

	/**
	 * How many of the execution's steps have settled (completed, failed,
	 * skipped, or cancelled). Rows are unique per node and only exist for
	 * reachable nodes, so comparing this against the graph's reachable node
	 * count answers "has everything settled?" exactly.
	 */
	countSettledSteps(executionId: string): Promise<number>;

	/** Whether any of the execution's steps failed. */
	hasFailedSteps(executionId: string): Promise<boolean>;
}
