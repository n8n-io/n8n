import type { JsonValue } from '../common';

/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/**
 * Lifecycle status of a single step within an execution. `skipped` is terminal
 * at birth: the step was considered and decided against (no live input), so it
 * never runs. `waiting` is the opposite end: the step ran, produced no outcome,
 * and still owes the execution one.
 */
export type StepStatus =
	| 'queued'
	| 'running'
	| 'waiting'
	| 'completed'
	| 'failed'
	| 'skipped'
	| 'cancelled';

/**
 * A settled step has reached a terminal state: its status and outputs are
 * immutable, and it will never produce more data. Planning decisions are made
 * over settled predecessors only, so they hold no matter when they're computed.
 */
export const SETTLED_STEP_STATUSES: readonly StepStatus[] = [
	'completed',
	'failed',
	'skipped',
	'cancelled',
];

export function isSettledStatus(status: StepStatus): boolean {
	return SETTLED_STEP_STATUSES.includes(status);
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

/** Slots recorded for a trigger that fired without a payload: no slots at all. */
export const DEFAULT_TRIGGER_OUTPUTS: TriggerOutputs = [];

/**
 * A step's declaration that it is not done: instead of outputs, it says when
 * to resume. The executor produces it, the engine persists it on the step row,
 * and whatever resumes the step reads it back - the engine never interprets
 * what a resume means to the node.
 *
 * A deadline ends the wait, or a resume request does, or either one first. A
 * deadline comes paired with the slots it emits: the step is never re-run, so
 * a deadline with nothing captured would resume into nothing.
 */
export type WaitDeclaration =
	| {
			/** Deadline, ISO-8601. */
			resumeAt: string;
			/**
			 * The slots the step emits when the deadline fires. The step is never
			 * re-run, so the outputs it would have produced are captured up front.
			 */
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
 * What ended a step's wait, recorded on the row when it resumed. The engine
 * emits a deadline's captured outputs itself; only a request reaches an
 * executor, which runs the node's resume path with the payload.
 */
export type StepResume = { kind: 'deadline' } | { kind: 'request'; payload: JsonValue };

/**
 * A wait with neither condition would never end, stranding the execution. The
 * union above rules that out, so this only ever catches an executor that built
 * a declaration outside the type system - as `assertCreatableRecord` does for
 * step creation.
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
