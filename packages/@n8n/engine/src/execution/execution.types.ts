import type { JsonValue } from '../common';

/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/**
 * Lifecycle status of a single step within an execution. `skipped` marks a
 * node whose every incoming edge was dead — the explicit record that a branch
 * was not taken, written at planning time without the step ever running.
 */
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

/**
 * Status of a step that has settled: reached a terminal state, never to
 * produce more data. Every node an execution considers eventually settles, so
 * "predecessor not settled" always means "not yet", never "never" — which is
 * what lets a successor's readiness be decided locally.
 */
export type SettledStepStatus = Exclude<StepStatus, 'queued' | 'running'>;

/**
 * A step's data on one side of a connection, indexed by slot: outputs by output
 * index, inputs by input index. An edge copies one slot to another, so this is
 * the only structure the engine understands — a slot's contents are opaque.
 *
 * `null` marks a slot with no data, and means something slightly different on
 * each side. On outputs the producer did not fire that slot, so the planner does
 * not follow the edges leaving it. On inputs nothing arrived — either no edge
 * feeds that slot, or the edge's source slot was never filled.
 */
export type StepSlots = JsonValue[];
