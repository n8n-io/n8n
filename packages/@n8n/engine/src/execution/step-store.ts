import type { StepStatus } from './execution.types';

/** A new step to persist. `id` and timestamps are assigned by the store. */
export interface NewStepRecord {
	executionId: string;
	nodeId: string;
	status: StepStatus;
}

/**
 * Persistence port for step records.
 */
export interface StepStore {
	/** Persist a new step record; returns its generated id. */
	createStep(record: NewStepRecord): Promise<{ id: string }>;
}
