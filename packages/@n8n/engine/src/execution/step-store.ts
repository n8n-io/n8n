import type {
	NodePass,
	NodePassId,
	StepError,
	StepKey,
	StepKeyId,
	ResumeCause,
	StepSlots,
	StepSources,
	StepStatus,
	WaitDeclaration,
} from './execution.types';

/**
 * A new step to persist. `id` and timestamps are assigned by the store.
 *
 * Creation statuses only: a row becomes `running`, `waiting`, `failed`, or
 * `cancelled` solely through `claimStep`, `suspendStep`, `failStep`,
 * `cancelStep`, or `cancelPendingSteps`, so it cannot bypass the checks and
 * locking those transitions enforce.
 *
 * A step created `completed` (the trigger) must carry its slot list, even
 * `[]`: a missing one persists as SQL NULL, which liveness reads as every
 * output slot dead.
 *
 * `sources` is what the step reads, per input slot. The trigger reads nothing,
 * so it has none.
 */
export type NewStepRecord = StepKey & { sources?: StepSources } & (
		| { status: Extract<StepStatus, 'queued' | 'skipped'>; outputs?: never }
		| { status: Extract<StepStatus, 'completed'>; outputs: StepSlots }
	);

/**
 * Type of what running and settling a step needs of its row
 */
export interface StepRecord {
	id: string;
	executionId: string;
	nodeId: string;
	iteration: number;
	branch: number;
	status: StepStatus;
	/** What the step reads, per input slot; `null` for the trigger. */
	sources: StepSources | null;
	/** Outputs of a completed step, indexed by output slot; `null` until it completes. */
	outputs: StepSlots | null;
	/** The wait this step declared; `null` unless it has suspended. */
	waitDeclaration: WaitDeclaration | null;
	/** What resumed this step's current dispatch; `null` on a first run. */
	resumeCause: ResumeCause | null;
	/** Why the step failed; absent unless it did. */
	error?: StepError | null;
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
	branch: number;
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

/** A wait the sweep resumed: what `step:ready` needs, and nothing more. */
export interface DueStep {
	id: string;
	executionId: string;
}

/** Persistence interface for step records. */
export interface StepStore {
	/**
	 * Persist new step records for one execution, batched so planning a fan-out
	 * costs a single round trip. Returns the rows actually created.
	 *
	 * If a step for a given `(executionId, nodeId, iteration, branch)` already
	 * exists, it is skipped and not returned. This allows multiple planners to
	 * race to enqueue the same step without erroring or duplicating work: a
	 * node-pass's steps are a pure function of settled steps, so racing planners
	 * compute the same rows. A further iteration or run of the same node is a new
	 * row, not a duplicate. We return the actually created rows so the caller
	 * knows which step creations it needs to publish.
	 *
	 * All steps of one node-pass are created in the same call. One statement
	 * inserts them, so a node-pass either has all of its steps or none, and any
	 * step of it proves that it was decided.
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

	/**
	 * Record a wait: persist `wait_declaration` and move the step to `waiting`. A
	 * compare-and-set on `running`, as `completeStep` — but `waiting` is no
	 * outcome, so nothing plans behind the step and nothing counts it settled.
	 */
	suspendStep(id: string, waitDeclaration: WaitDeclaration): Promise<boolean>;

	/**
	 * Resume a wait: persist `resume_cause` and return the step to `queued`, from
	 * where the normal worker path re-dispatches it. A compare-and-set on
	 * `waiting`, so a doubled resume — a webhook retry, a sweep racing a
	 * request — resolves the wait once. The declaration stays on the row: a
	 * deadline resume reads its captured outputs after the claim.
	 *
	 * Whether a given resume is allowed against a given wait is checked by
	 * whoever accepts it, not here.
	 */
	resumeStep(id: string, resumeCause: ResumeCause): Promise<boolean>;

	/**
	 * Resume every waiting step whose deadline has passed, up to `limit`, and
	 * return the rows resumed. The oldest deadlines are taken first. The order
	 * of the returned rows is not defined.
	 *
	 * One statement, unlike `resumeStep`, and that is the point: a second
	 * sweeper cannot take a step this one already claimed, and a step resolved
	 * by request and re-suspended with a later deadline cannot be fired early.
	 * Reading the rows and then transitioning them one by one leaves a window
	 * for both.
	 *
	 * `limit` bounds the batch, so a backlog cannot turn one sweep into a single
	 * long-running update.
	 *
	 * A due wait whose execution has ended is cancelled instead of resumed, and
	 * is not returned. A step that suspends after the execution's cancellation
	 * sweep ran is the one case that reaches here.
	 */
	resumeDueSteps(due: Date, limit: number): Promise<DueStep[]>;

	/**
	 * The earliest deadline any waiting step still holds, or `null` when no step
	 * waits on one.
	 *
	 * The sweep reads this to decide when to look next, so that a wait fires at
	 * its deadline rather than at the end of a fixed interval. The answer is a
	 * hint and never an authority: `resumeDueSteps` still decides what may
	 * resume, so a stale or lost answer costs precision and nothing else.
	 */
	nextWaitDeadline(): Promise<Date | null>;

	/** Record a failed run: persist `error` and mark the step failed. As `completeStep`. */
	failStep(id: string, error: StepError): Promise<boolean>;

	/**
	 * Fail a step that waits on a sub-execution the engine could not start. As
	 * `failStep`, but a compare-and-set on `waiting`: the step suspended before
	 * the start was attempted, so no worker owns it.
	 */
	failWaitingStep(id: string, error: StepError): Promise<boolean>;

	/**
	 * Settle a claimed step that will not run, because its execution ended
	 * between the claim and the run. As `completeStep`, a compare-and-set on
	 * `running`, so a worker that lost the claim writes nothing.
	 */
	cancelStep(id: string): Promise<boolean>;

	/**
	 * Cancel every pending step of the execution (`-> cancelled`). A pending step
	 * is `queued` or `waiting`. No worker runs either one, and nothing starts
	 * either one again after the execution ends.
	 *
	 * A `waiting` step must be included. Nothing resumes a request-only wait
	 * after the execution ends, so the step would stay `waiting` for ever. The
	 * sweep would also resume a deadline wait inside an execution that already
	 * failed. `resumeDueSteps` reads the status, so a cancelled row is invisible
	 * to it.
	 *
	 * A `running` step keeps its status. Its worker still owns the outcome, and
	 * `completeStep` and `failStep` compare-and-set on `running`.
	 */
	cancelPendingSteps(executionId: string): Promise<void>;

	/**
	 * Step rows of the given keys within an execution, keyed by `stepKeyId`. A
	 * key with no row yet is absent from the result — absence always means
	 * "not planned yet", never "forgotten".
	 *
	 * Full rows, outputs included — for gathering a ready step's inputs from the
	 * steps it records as its sources.
	 */
	loadStepsByKeys(executionId: string, keys: StepKey[]): Promise<Record<StepKeyId, StepRecord>>;

	/**
	 * Every step of the given node-passes, full rows, keyed by `nodePassId`, each
	 * list ordered by branch. A node-pass with no step yet is absent. For a batch
	 * node, which reads every run of its sources.
	 */
	loadStepsByPasses(
		executionId: string,
		passes: NodePass[],
	): Promise<Record<NodePassId, StepRecord[]>>;

	/**
	 * Planning view of every step of the given node-passes, keyed by `nodePassId`,
	 * each list ordered by branch. A node-pass with no step yet is absent, which
	 * always means "not decided yet". The per-slot booleans are computed in the
	 * database, so planning never pulls the potentially large outputs over the
	 * wire.
	 */
	loadStepSummariesByPasses(
		executionId: string,
		passes: NodePass[],
	): Promise<Record<NodePassId, StepSummary[]>>;

	/**
	 * Planning view of each named node's highest-iteration row, keyed by node id,
	 * omitting the nodes with no row. For a batch node this is the row that says
	 * whether its loop has ended.
	 *
	 * One query for every node asked about, since a settlement can span several
	 * loops. The row ending a loop holds everything that loop accumulated, so this
	 * returns the same slim view as `loadStepSummariesByPasses`, not the whole row.
	 */
	loadLatestStepSummaries(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepSummary>>;

	/**
	 * Every step of the execution, at every iteration.
	 *
	 * For the v1 shim, which resolves expressions against whatever the execution
	 * has produced so far and cannot know in advance which steps a given
	 * expression names. TODO(CAT-3017): load selectively instead.
	 */
	loadAllSteps(executionId: string): Promise<StepRecord[]>;

	/** The steps of the given nodes, every pass of each, with their outputs. */
	loadStepsByNodeIds(executionId: string, nodeIds: string[]): Promise<StepRecord[]>;

	/**
	 * Every step of the execution in the `waiting` status, with its wait
	 * declaration, whatever that declaration says. The caller decides which
	 * waits it can act on.
	 */
	loadWaitingSteps(executionId: string): Promise<StepRecord[]>;

	/**
	 * How many of the execution's node-passes have settled: decided, with every
	 * one of their steps completed, failed, skipped, or cancelled. A node-pass
	 * gets all of its steps at once, only exists for reachable nodes, and its
	 * steps never unsettle, so comparing this against the number of node-passes
	 * the execution owes answers "has everything settled?" exactly. Counting
	 * steps instead would not work: how many runs a node-pass has depends on the
	 * data.
	 */
	countSettledPasses(executionId: string): Promise<number>;

	/** Whether any of the execution's steps failed. */
	hasFailedSteps(executionId: string): Promise<boolean>;

	/** The execution's failed steps, by node and then by pass. */
	loadFailedSteps(executionId: string): Promise<StepRecord[]>;
}
