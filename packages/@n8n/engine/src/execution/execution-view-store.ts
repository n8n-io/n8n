import type { StoredWorkflowGraph } from '../graph';
import type {
	ExecutionMode,
	ExecutionStatus,
	ParentLink,
	StepError,
	StepSlots,
	StepStatus,
	WorkflowDocument,
	StepOutputSources,
} from './execution.types';

/**
 * Timestamps come back however the store's driver reports them: the only
 * consumer serializes them to JSON, where `Date` and an ISO string are the
 * same value, so there is no point parsing or formatting them in between.
 */
export interface ExecutionListItemView {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	/** The host's finer execution mode. */
	hostMode: string;
	/** The parent link, or `null` for a top-level execution. */
	parent: ParentLink | null;
	createdAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
}

/** The filter half of a list query: which executions, with no say in how many or from where. */
export interface ExecutionListFilter {
	workflowIds: readonly string[] | 'all';
	status?: ExecutionStatus[];
	hostMode?: string;
	/** Only the sub-executions of this execution. */
	parentExecutionId?: string;
	/** `true` for sub-executions only, `false` for top-level executions only. */
	hasParent?: boolean;
	createdAfter?: string;
	createdBefore?: string;
}

export interface ExecutionListQuery extends ExecutionListFilter {
	before?: { createdAt: string; id: string };
	/** Required at this layer; the API's default lives on the request schema. */
	limit: number;
	includeTotal?: boolean;
	/** Same shape the control plane's `ExecutionSummaries.Query` uses. */
	order?: { top?: ExecutionStatus; startedAt?: 'DESC' };
}

/** Where a reader of the ended feed stopped: the last row it took, in `(finishedAt, id)` order. */
export interface EndedExecutionCursor {
	finishedAt: string;
	id: string;
}

export interface EndedExecutionQuery {
	after?: EndedExecutionCursor;
	limit: number;
	/**
	 * Only rows that ended at least this long ago. `finished_at` is set before
	 * the row commits, so a row can commit behind one the reader already passed.
	 */
	settleMs: number;
}

/** An ended execution, with what the control plane needs to announce its end. */
export interface EndedExecutionView {
	id: string;
	workflowId: string;
	workflowName: string | null;
	status: ExecutionStatus;
	mode: ExecutionMode;
	hostMode: string;
	userId: string | null;
	projectId: string | null;
	parent: ParentLink | null;
	createdAt: Date;
	finishedAt: Date;
	/**
	 * When the first step after the trigger was created. The engine stores no start
	 * time, so this is the best available value. `createdAt` when no such step exists.
	 */
	startedAt: Date;
	/** From the settings of the workflow snapshot. */
	timeSavedMode: string | null;
	timeSavedPerExecution: number | null;
	/** The sum of `metadata.timeSaved.minutes` over all step runs. */
	dynamicTimeSavedMin: number;
	/** `callerContext.source`. */
	source: string | null;
	/** The reconciliation sweep failed a stalled step of the run. */
	endedBySweep: boolean;
	/** The first step that failed, or `null`. */
	failedStep: {
		nodeId: string;
		nodeName: string | null;
		/** The type from the workflow snapshot, when its node has the same id. */
		nodeType: string | null;
		error: StepError;
	} | null;
}

/** Where a reader of the started feed stopped, in `(createdAt, id)` order. */
export interface StartedExecutionCursor {
	createdAt: string;
	id: string;
}

export interface StartedExecutionQuery {
	after?: StartedExecutionCursor;
	limit: number;
	/** `created_at` is the transaction start, so a row can commit behind one the reader passed. */
	settleMs: number;
}

/** A run that the data plane started by itself: today, a sub-execution. */
export interface StartedExecutionView {
	id: string;
	workflowId: string;
	workflowName: string | null;
	mode: ExecutionMode;
	hostMode: string;
	userId: string | null;
	projectId: string | null;
	parent: ParentLink;
	createdAt: Date;
}

/**
 * Read view of an execution: what a caller is shown, which is not what running
 * one needs. It carries the timing the execution path never reads, and omits
 * `triggerOutputs`, which only the start handler consumes.
 */
export interface ExecutionView {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	/** The host's finer execution mode. */
	hostMode: string;
	/** The graph captured at start, immutable for the execution's lifetime. */
	graph: StoredWorkflowGraph;
	/** The workflow captured at start, alongside the graph and just as immutable. */
	workflow: WorkflowDocument;
	/** The parent link, or `null` for a top-level execution. */
	parent: ParentLink | null;
	createdAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
}

/**
 * Read view of a step. It carries the timing and the error the execution path
 * writes but never reads back, and omits `executionId`: a step is only ever
 * read under the execution that owns it.
 *
 * `createdAt`/`updatedAt` are ISO 8601 strings, not `Date`: the store reads
 * them out of a JSON aggregate, and the only consumer re-serializes them to
 * JSON, so there is no point parsing them in between.
 */
export interface StepView {
	id: string;
	nodeId: string;
	iteration: number;
	status: StepStatus;
	/** Outputs of a completed step, indexed by output slot; `null` until it completes. */
	outputs: StepSlots | null;
	/** Where the outputs' items came from. Only a loop node that ran states it. Otherwise `null`. */
	outputSources: StepOutputSources | null;
	/** The error that failed the step; `null` unless it failed. */
	error: StepError | null;
	createdAt: string;
	updatedAt: string;
}

/** An execution with its steps, read as one query so the two cannot disagree. */
export interface ExecutionWithStepsView extends ExecutionView {
	/** Every step of the execution, oldest first. Empty if it has run none yet. */
	steps: StepView[];
}

/**
 * Persistence interface for the read path, held apart from `ExecutionStore` and
 * `StepStore` so a reader cannot reach a transition, and so read concerns
 * (projection, pagination) can grow without widening the interfaces the engine
 * runs on.
 *
 * A projection is only as real as the SQL behind it: these types are
 * structural, so an adapter returning whole rows still type-checks. Name the
 * columns in the query.
 */
export interface ExecutionViewStore {
	listExecutionViews(query: ExecutionListQuery): Promise<ExecutionListItemView[]>;
	countExecutionViews(query: ExecutionListQuery): Promise<number>;
	/** Read view of one execution. Throws `ExecutionNotFoundError` if absent. */
	loadExecutionView(id: string): Promise<ExecutionView>;

	/**
	 * Read view of one execution and its steps. One query, so the status a caller
	 * reports cannot predate the steps it reports beside it. Throws
	 * `ExecutionNotFoundError` if absent.
	 */
	loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView>;

	/**
	 * Read view of the newest execution matching `filter`, with its steps, or
	 * `undefined` when none matches. Newest by `(created_at, id)`, the same
	 * order the list walks.
	 */
	loadLatestExecutionWithStepsView(
		filter: ExecutionListFilter,
	): Promise<ExecutionWithStepsView | undefined>;

	/** Ended executions after `query.after`, oldest end first. */
	listEndedExecutionViews(query: EndedExecutionQuery): Promise<EndedExecutionView[]>;

	/** Executions the data plane started by itself after `query.after`, oldest first. */
	listStartedExecutionViews(query: StartedExecutionQuery): Promise<StartedExecutionView[]>;
}
