import type { JsonValue } from '../common';

/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/** Lifecycle status of a single step within an execution. */
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * A step's data on one side of a connection, indexed by slot: outputs by
 * output slot, inputs by input slot. An edge copies one output slot into one
 * input slot; the engine understands the slot structure and nothing below it —
 * a slot's contents are opaque and step-type-specific.
 *
 * TODO(CAT-2874): only slot 0 is populated until multi-slot routing lands;
 * graph validation rejects edges that use any other slot.
 */
export type StepSlots = JsonValue[];
