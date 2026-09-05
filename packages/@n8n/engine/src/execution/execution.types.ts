import type { JsonValue } from '../common';

/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/**
 * Facts about the caller, supplied by the host at start and stored with the
 * execution. The engine never reads them: it passes them to the step executor,
 * which needs them to act on the caller's behalf, for example to resolve a
 * credential.
 */
export interface ExecutionContext {
	/** The user on whose behalf the execution runs. */
	userId?: string;
	/** The project that owns the workflow. */
	projectId?: string;
	/**
	 * The host's own execution mode, which is finer than `ExecutionMode`. Opaque
	 * to the engine; a v1 host stores its `WorkflowExecuteMode` here.
	 */
	hostMode?: string;
}

/**
 * Lifecycle status of a single step within an execution. `skipped` is terminal
 * at birth: the step was considered and decided against (no live input), so it
 * never runs.
 */
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

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
