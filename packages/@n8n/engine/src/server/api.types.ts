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
	/** Only set when the request asked for steps. Oldest first. */
	steps?: StepDetail[];
}

/**
 * A step's detail as `GET /:id?includeSteps=true` reports it.
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
