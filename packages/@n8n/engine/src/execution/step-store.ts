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
}

/** A step record. */
export interface StepRecord {
	id: string;
	executionId: string;
	nodeId: string;
	status: StepStatus;
	/** Outputs of a completed step; `null` until it completes. */
	outputs: JsonValue | null;
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
	 * Persist new step records; returns their generated ids, in input order.
	 * Batched rather than one-per-call so planning a fan-out costs a single
	 * round trip and cannot half-persist.
	 */
	createSteps(records: NewStepRecord[]): Promise<Array<{ id: string }>>;

	/** Load a single step by id. Throws `StepNotFoundError` if absent. */
	loadStep(id: string): Promise<StepRecord>;

	/**
	 * Compare-and-set status transition. Returns `true` iff this call performed
	 * the transition, so duplicate/redelivered events are handled idempotently.
	 */
	transitionStepStatus(id: string, from: StepStatus, to: StepStatus): Promise<boolean>;

	/**
	 * Record a successful run: persist `outputs` and mark the step completed.
	 * A compare-and-set on `running`, so it returns `false` if the caller no
	 * longer holds the claim — the outcome and the status are written together,
	 * which a bare `transitionStepStatus` can't do.
	 */
	completeStep(id: string, outputs: JsonValue): Promise<boolean>;

	/** Record a failed run: persist `error` and mark the step failed. As `completeStep`. */
	failStep(id: string, error: StepError): Promise<boolean>;

	/**
	 * Outputs of the given nodes within an execution, keyed by node id. A node
	 * with no step row, or one that hasn't completed, maps to `null`.
	 */
	loadStepOutputs(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, JsonValue | null>>;
}
