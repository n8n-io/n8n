import type {
	ExecutionMode,
	ExecutionStatus,
	StepError,
	StepSlots,
	StepStatus,
} from '../execution';
import type { WorkflowGraph } from '../graph';

/**
 * `GET /:id` response. Timestamps go out as ISO strings, since `Date` has no
 * JSON form.
 *
 * TODO(CAT-4234): report real run timing. `createdAt`/`updatedAt` are row
 * timestamps, the only timing available today.
 */
export interface ExecutionSnapshot {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	/** The graph captured at start, immutable for the execution's lifetime. */
	graph: WorkflowGraph;
	createdAt: string;
	updatedAt: string;
	finishedAt: string | null;
}

/**
 * A step's detail as `GET /:id/steps` reports it.
 *
 * No `input`: step inputs are re-derived at run time from predecessor outputs
 * and never persisted, so there's nothing to return. No `attempt`: the engine
 * has no retry mechanism, so it would always be `1`.
 */
export interface StepDetail {
	id: string;
	nodeId: string;
	iteration: number;
	status: StepStatus;
	outputs: StepSlots | null;
	error: StepError | null;
	createdAt: string;
	updatedAt: string;
}

/** An envelope, not a bare array, so the response can grow (e.g. pagination). */
export interface ExecutionStepsResponse {
	steps: StepDetail[];
}
