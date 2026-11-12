import type { JsonValue } from '../common';
import type { ActionDeclaration, ActionsDeclaration } from './actions.types';
import type {
	StepError,
	StepKey,
	StepKeyId,
	ResumeCause,
	StepSlots,
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
 */
export type NewStepRecord = { nodeId: string; iteration: number } & (
	| { status: Extract<StepStatus, 'queued' | 'skipped'>; outputs?: never }
	| { status: Extract<StepStatus, 'completed'>; outputs: StepSlots }
);

/**
 * A graph step follows from the graph. A spawned step runs one action of a
 * declaring step (ADR-20261109-store-rounds-in-their-own-table-and-spawned-steps-with-the-graph-steps).
 */
export type StepKind = 'graph' | 'spawned';

/**
 * Type of what running and settling a step needs of its row
 */
export interface StepRecord {
	id: string;
	executionId: string;
	nodeId: string;
	iteration: number;
	status: StepStatus;
	/** Outputs of a completed step, indexed by output slot; `null` until it completes. */
	outputs: StepSlots | null;
	/** The wait this step declared; `null` unless it has suspended. */
	waitDeclaration: WaitDeclaration | null;
	/** What resumed this step's current dispatch; `null` on a first run. */
	resumeCause: ResumeCause | null;
	/** Why the step failed; absent unless it did. */
	error?: StepError | null;
	// SPIKE: the four fields below are optional so that the existing test
	// fixtures stay valid. An absent `kind` means `graph`. Make them required.
	kind?: StepKind;
	/** For a spawned step: the step that declared its action. */
	declaringStepId?: string | null;
	/** For a spawned step: the round of the declaring step. */
	round?: number | null;
	/** For a spawned step: the call id of its action. */
	callId?: string | null;
}

/** One round of a declaring step that ended with actions. */
export interface RoundRecord {
	stepId: string;
	round: number;
	/** In declared order. */
	actions: ActionDeclaration[];
	payload: JsonValue;
}

/** Per-execution caps on actions (ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps, decision 8). */
export interface ActionLimits {
	maxRoundsPerExecution: number;
	maxSpawnedStepsPerExecution: number;
}

/** What `recordRound` did. */
export type RecordRoundResult =
	/** The round, the wait and the spawned steps are stored. `spawned` is in declared order. */
	| { kind: 'recorded'; round: number; spawned: Array<{ id: string }> }
	/** The step is no longer `running`: something else took it over. Nothing is stored. */
	| { kind: 'lost' }
	/** The execution ended, or a graph step of it failed. Nothing is stored. */
	| { kind: 'execution-ended' }
	/** The round would go over a cap. Nothing is stored. */
	| { kind: 'over-cap'; limit: keyof ActionLimits; value: number };

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
	 * If a step for a given `(executionId, nodeId, iteration)` already exists, it
	 * is skipped and not returned. This allows multiple planners to race to enqueue
	 * the same step without erroring or duplicating work. A further iteration of
	 * the same node is a new row, not a duplicate. We return the actually created rows
	 * so the caller knows which step creations it needs to publish.
	 *
	 * Creates nothing once any graph step in the execution has failed (serialized with
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
	 * The claim also refuses once any graph step in the execution has failed
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
	 * Graph step rows of the given keys within an execution, keyed by `stepKeyId`. A
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
	 * Planning view of each named node's highest-iteration row, keyed by node id,
	 * omitting the nodes with no row. For a batch node this is the row that says
	 * whether its loop has ended.
	 *
	 * One query for every node asked about, since a settlement can span several
	 * loops. The row ending a loop holds everything that loop accumulated, so this
	 * returns the same slim view as `loadStepSummariesByKeys`, not the whole row.
	 */
	loadLatestStepSummaries(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepSummary>>;

	/**
	 * Every graph step of the execution, at every iteration. Spawned steps are
	 * left out: expressions cannot read the outputs of an action.
	 *
	 * For the v1 shim, which resolves expressions against whatever the execution
	 * has produced so far and cannot know in advance which steps a given
	 * expression names. TODO(CAT-3017): load selectively instead.
	 */
	loadAllSteps(executionId: string): Promise<StepRecord[]>;

	/** The graph steps of the given nodes, every pass of each, with their outputs. */
	loadStepsByNodeIds(executionId: string, nodeIds: string[]): Promise<StepRecord[]>;

	/**
	 * Every step of the execution in the `waiting` status, with its wait
	 * declaration, whatever that declaration says. The caller decides which
	 * waits it can act on.
	 */
	loadWaitingSteps(executionId: string): Promise<StepRecord[]>;

	/**
	 * How many of the execution's graph steps have settled (completed, failed,
	 * skipped, or cancelled). Rows are unique per `(node, iteration)`, only exist
	 * for reachable nodes, and never unsettle, so comparing this against the
	 * number of rows the execution owes answers "has everything settled?" exactly.
	 * A loop makes that number more than the node count, so the comparison runs
	 * against `expectedSettledRows` rather than against the graph.
	 */
	countSettledSteps(executionId: string): Promise<number>;

	/** Whether any of the execution's graph steps failed. A failed action is data. */
	hasFailedSteps(executionId: string): Promise<boolean>;

	/** The execution's failed graph steps, by node and then by pass. */
	loadFailedSteps(executionId: string): Promise<StepRecord[]>;

	/**
	 * Record a round that ended with actions, in one transaction: store the
	 * round row, suspend the step (`running -> waiting` with a `{ round }`
	 * wait) and create one queued spawned step for each action. So the
	 * execution never shows a round without its spawned steps.
	 *
	 * The round number is the count of the step's earlier rounds. The caps
	 * are counted inside the same transaction.
	 */
	recordRound(
		step: Pick<StepRecord, 'id' | 'executionId' | 'iteration'>,
		declaration: ActionsDeclaration,
		limits: ActionLimits,
	): Promise<RecordRoundResult>;

	/** One round of a step, or `null` if it has none with that number. */
	loadRound(stepId: string, round: number): Promise<RoundRecord | null>;

	/** Every round of a step, in round order. */
	loadRounds(stepId: string): Promise<RoundRecord[]>;

	/** The spawned steps of a declaring step, of every round. */
	loadSpawnedSteps(declaringStepId: string): Promise<StepRecord[]>;

	/**
	 * Whether every spawned step of the round has settled. Call it only after
	 * the caller's own settlement committed, as a separate statement, so the
	 * last action to settle always sees all the others.
	 */
	allActionsSettled(declaringStepId: string, round: number): Promise<boolean>;

	/**
	 * Wake a declaring step whose actions of `round` all settled
	 * (`waiting -> queued`, resume cause `{ kind: 'actions', round }`). A
	 * compare-and-set on `waiting` and on the round of the wait, so a late
	 * settlement of an earlier round cannot wake a later round, and a step
	 * that was cancelled with its execution is not woken.
	 */
	resumeStepForActions(stepId: string, round: number): Promise<boolean>;
}
