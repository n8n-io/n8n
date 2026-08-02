import type { JsonValue } from '../common';

/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/** Lifecycle status of a single step within an execution. */
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * A step's data on one side of a connection, indexed by slot: outputs by output
 * index, inputs by input index. An edge copies one slot to another, so this is
 * the only structure the engine understands — a slot's contents are opaque.
 *
 * `null` at a slot means that branch was not taken. A slot that was taken but
 * produced nothing is empty rather than `null`.
 */
export type StepSlots = JsonValue[];
