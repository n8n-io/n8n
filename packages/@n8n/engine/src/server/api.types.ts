import type {
	ErrorSourceLink,
	ExecutionMode,
	ExecutionStatus,
	ParentLink,
	StepError,
	StepSlots,
	StepOutputSources,
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
	/** The parent link, or `null` for a top-level execution. */
	parent: ParentLink | null;
	/** The execution this error execution reports on, or `null`. */
	errorSource: ErrorSourceLink | null;
	createdAt: string;
	updatedAt: string;
	finishedAt: string | null;
	/** Only set when the request asked for steps. Oldest first. */
	steps?: StepDetail[];
	/** Only set when the request asked for steps. `null` for a top-level execution. */
	parentWorkflowId?: string | null;
	/** Only set when the request asked for steps. The executions the steps started, oldest first. */
	subExecutions?: SubExecutionDetail[];
}

/** An execution that a step started, as `GET /:id?includeSteps=true` reports it. */
export interface SubExecutionDetail {
	executionId: string;
	workflowId: string;
	/** The step that started it. */
	stepId: string;
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
	/** Where the outputs' items came from. Only a loop node that ran states it. Otherwise `null`. */
	outputSources: StepOutputSources | null;
	error: StepError | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Body of `POST /resume-requests/locate`, phase one of every kind of resume
 * request. `id` is the id in the resume URL or in the approval callback. The
 * token says whether it names an execution or a step. The control plane
 * forwards the token unread.
 */
export interface ResumeLocateRequest {
	id: string;
	token: string;
	/**
	 * The path and query of the resume URL as the caller sent them, without the
	 * token parameter, for example
	 * `/webhook-waiting/<step id>/<node id>?approved=true`. A step-bound token
	 * accepts the request only if this equals the string that it holds.
	 */
	pathAndQuery?: string;
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
