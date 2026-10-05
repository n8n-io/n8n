import type { JsonObject, JsonValue } from '../common';

/**
 * Lifecycle status of an execution. A resume does not update it, so it can
 * read `waiting` while the resumed step runs. See
 * `ExecutionStore.refreshLiveStatus`.
 */
export type ExecutionStatus =
	| 'queued'
	| 'running'
	| 'waiting'
	| 'completed'
	| 'failed'
	| 'cancelled';

/**
 * Started and not ended. `queued` is not live: it has no step rows yet. The SQL
 * in `TypeOrmExecutionStore.refreshLiveStatus` repeats this list.
 */
export const LIVE_EXECUTION_STATUSES = ['running', 'waiting'] as const;

export function isLiveExecutionStatus(status: ExecutionStatus): boolean {
	return (LIVE_EXECUTION_STATUSES as readonly ExecutionStatus[]).includes(status);
}

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/**
 * Facts about the caller, supplied by the host at start and stored with the
 * execution. The engine never reads them: it passes them to the step executor,
 * which needs them to act on the caller's behalf, for example to resolve a
 * credential.
 *
 * This is caller-supplied, opaque data. It is distinct from any per-request
 * context the engine builds for its own use (database handle, request id,
 * principal), which is never persisted and never given to a step executor.
 */
export interface CallerContext {
	/** The user on whose behalf the execution runs. */
	userId?: string;
	/** The project that owns the workflow. */
	projectId?: string;
	/**
	 * The host's own execution mode, which is finer than `ExecutionMode`. Opaque
	 * to the engine; a v1 host stores its `WorkflowExecuteMode` here.
	 */
	hostMode: string;
}

/**
 * Lifecycle status of a single step within an execution. `skipped` is terminal
 * at birth: the step was considered and decided against (no live input), so it
 * never runs. `waiting` is the other extreme: the step ran, but it produced no
 * outcome. It still owes the execution one.
 */
export const STEP_STATUSES = [
	'queued',
	'running',
	'waiting',
	'completed',
	'failed',
	'skipped',
	'cancelled',
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

/**
 * A settled step has reached a terminal state: its status and outputs are
 * immutable, and it will never produce more data. Planning decisions are made
 * over settled predecessors only, so they hold no matter when they're computed.
 */
export const SETTLED_STEP_STATUSES = ['completed', 'failed', 'skipped', 'cancelled'] as const;

export type SettledStepStatus = (typeof SETTLED_STEP_STATUSES)[number];

export function isSettledStatus(status: StepStatus): status is SettledStepStatus {
	return (SETTLED_STEP_STATUSES as readonly StepStatus[]).includes(status);
}

/**
 * A step's data on one side of a connection, indexed by slot: outputs by
 * output slot, inputs by input slot. An edge copies one output slot into one
 * input slot; the engine understands the slot structure and nothing below it —
 * a slot's contents are opaque and step-type-specific.
 *
 * `null` marks a slot without data: on outputs, the step didn't fire the slot
 * (a branch not taken); on inputs, nothing arrived (a dead edge). `[]` is not
 * the same thing — a step that ran and produced zero items is still live.
 */
export type StepSlots = JsonValue[];

/**
 * The trigger step's outputs, supplied by whoever starts the execution: one
 * entry per output slot, `null` for a slot the trigger didn't fire. Same shape
 * and same opacity as any other step's `StepSlots` — a v1 host puts JSON-shaped
 * `INodeExecutionData[]` in each slot.
 */
export type TriggerOutputs = StepSlots;

/**
 * The full workflow the run came from, supplied by CP. Opaque: the engine
 * never reads a field out of it. Different from WorkflowGraph, which
 * is only the graph that is executed (e.g. without disabled nodes).
 */
export type WorkflowDocument = JsonObject;

/** Slots recorded for a trigger that fired without a payload: no slots at all. */
export const DEFAULT_TRIGGER_OUTPUTS: TriggerOutputs = [];

/**
 * A step's declaration that it is not done: instead of outputs, it says when
 * to resume. The executor produces it, the engine persists it on the step row,
 * and whatever resumes the step reads it back — the engine never interprets
 * what a resume means to the node.
 *
 * A deadline can end the wait. A resume request can end it. A declaration can
 * name both, and then the first of the two ends it. A deadline comes paired
 * with the slots it emits, because the step is never re-run.
 */
export type WaitDeclaration =
	| {
			/** Deadline, ISO-8601. */
			resumeAt: string;
			/** The slots the step emits when the deadline fires. */
			outputsAtDeadline: StepSlots;
			/** Whether a resume request may end the wait early. */
			acceptsResumeRequest: boolean;
	  }
	| {
			/** No deadline, so only a resume request ends this wait. */
			resumeAt?: never;
			outputsAtDeadline?: never;
			acceptsResumeRequest: true;
	  };

/**
 * What ended a step's wait, recorded on the row when it resumed. No node code
 * runs on a resume. A deadline carries nothing: the declaration already holds
 * the outputs to emit. A request carries the outputs the node's resume path
 * produced where the request arrived, and the engine emits them unread.
 */
export type ResumeCause = { kind: 'deadline' } | { kind: 'request'; outputs: StepSlots };

/**
 * A wait with no deadline and no resume request would never end, and would
 * strand the execution. The union above makes that unrepresentable. This
 * function catches only a declaration that an executor built outside the type
 * system, as `assertCreatableRecord` does for step creation.
 */
export function hasResumeCondition(wait: WaitDeclaration): boolean {
	return wait.acceptsResumeRequest || wait.resumeAt !== undefined;
}

/**
 * The error that failed a step, as persisted on its row. Shared: the execution
 * path writes it, the read path reports it.
 */
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

export interface StepKey {
	nodeId: string;
	iteration: number;
}

/** A step key in the string form that keys instance-keyed lookups. */
export type StepKeyId = string;

export function stepKeyId({ nodeId, iteration }: StepKey): StepKeyId {
	return `${nodeId}@${iteration}`;
}
