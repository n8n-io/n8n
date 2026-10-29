import type {
	ExecutionMode,
	ExecutionStatus,
	ParentLink,
	StepError,
	StepSlots,
	StepStatus,
	WorkflowDocument,
} from '../execution';
import type { ExecutionListFilter, ExecutionListQuery } from '../execution/execution-view-store';
import type { StoredWorkflowGraph } from '../graph';

/** A read-only search. The control plane supplies the visibility decision. */
export type SearchExecutionsRequest = ExecutionListQuery;

/**
 * `POST /search/latest` body: the search filter without its paging. The
 * response is the newest match as `GET /:id?includeSteps=true` reports it.
 */
export type FindLatestExecutionRequest = ExecutionListFilter;

/**
 * `POST /:id/cancel` response. Only ever `cancelled`: any other status answers
 * with a `not_cancellable` error instead.
 */
export interface CancelExecutionResponse {
	executionId: string;
	status: 'cancelled';
	/** When the execution ended, ISO-8601. The same time on a repeated cancel. */
	finishedAt: string;
}

/** `T` without its `K` fields. */
type Without<T, K extends keyof T> = Omit<T, K>;

export type ExecutionListItem = Without<ExecutionSnapshot, 'graph' | 'workflow' | 'steps'>;

export interface SearchExecutionsResponse {
	items: ExecutionListItem[];
	/** The `before` cursor for the next page, or `null` on the last page. */
	nextCursor: { createdAt: string; id: string } | null;
	total?: number;
}

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
	/** The host's finer execution mode. */
	hostMode: string;
	/** The graph captured at start, immutable for the execution's lifetime. */
	graph: StoredWorkflowGraph;
	/**
	 * The workflow the run came from, captured at start. Reported so a caller can
	 * render the execution against the workflow that ran, not the current one.
	 */
	workflow: WorkflowDocument;
	/** The execution that started this one, or `null` for a top-level one. */
	parent: ParentLink | null;
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

/** Body of `POST /workflow-executions/:id/resume-target`. The control plane forwards the token unread. */
export interface ResumeTargetRequest {
	token: string;
}

/**
 * The execution a resume request addresses, and the one step of it that
 * accepts a request. `target` is `null` when no step does: `execution.status`
 * says whether the execution ended or has not reached its wait yet.
 */
export interface ResumeTargetResponse {
	execution: ExecutionSnapshot;
	target: { stepId: string; nodeId: string } | null;
}

/** Body of `POST /step-executions/:id/resolve`. */
export interface ResolveStepRequest {
	token: string;
	/** What the node's resume method produced, one entry for each output slot. */
	outputs: StepSlots;
}

export interface ResolveStepResponse {
	executionId: string;
	stepId: string;
}
