import type { StepStatus } from './execution.types';

/** A new step to persist. `id` and timestamps are assigned by the store. */
export interface NewStepRecord {
	executionId: string;
	nodeId: string;
	status: StepStatus;
}

/** A persisted step record. */
export interface StepRecord {
	id: string;
	executionId: string;
	nodeId: string;
	status: StepStatus;
}

/**
 * Persistence port for step records. The core depends on this interface, not on
 * TypeORM; the adapter lives in `database/`.
 */
export interface StepStore {
	/** Persist a new step record; returns its generated id. */
	createStep(record: NewStepRecord): Promise<{ id: string }>;
}
