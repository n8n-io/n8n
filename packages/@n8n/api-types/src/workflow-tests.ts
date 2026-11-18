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

/** A workflow that calls another workflow as a sub-workflow, with the state of its tests. */
export type WorkflowTestCaller = {
	workflowId: string;
	name: string;
	/** `null` when the caller has no test file. */
	testFileId: string | null;
	/** Whether a caller run that the sub-workflow started is queued or in progress. */
	running: boolean;
	/** The latest run of the caller's test file, from any source. */
	lastRun: WorkflowTestRunResult | null;
};

export type WorkflowTestCallers = {
	callers: WorkflowTestCaller[];
	/** Callers that the user cannot read. Their tests still run in a review. */
	inaccessibleCount: number;
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
