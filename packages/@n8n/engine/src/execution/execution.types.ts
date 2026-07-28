/** Lifecycle status of an execution. */
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** How an execution was initiated. */
export type ExecutionMode = 'production' | 'manual';

/** Lifecycle status of a single step within an execution. */
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
