import type { WorkflowTestRunEvent } from './push/workflow-test';

type TestFinishedEvent = Extract<WorkflowTestRunEvent, { type: 'testFinished' }>;
type RunFinishedEvent = Extract<WorkflowTestRunEvent, { type: 'runFinished' }>;

/** The result of one test in a run. */
export type WorkflowTestResult = Omit<TestFinishedEvent, 'type'>;

/** The result of one run of a test file, built from the run events. */
export type WorkflowTestRunResult = {
	runId: string;
	status: RunFinishedEvent['status'];
	errors: string[];
	tests: WorkflowTestResult[];
	finishedAt: string;
};

/** A stored `@n8n/test` Vitest file for a workflow. */
export type WorkflowTestFile = {
	id: string;
	workflowId: string;
	source: string;
	updatedAt: string;
	/** The result of the latest run of the stored source. `null` before the first run. */
	lastRun: WorkflowTestRunResult | null;
};
