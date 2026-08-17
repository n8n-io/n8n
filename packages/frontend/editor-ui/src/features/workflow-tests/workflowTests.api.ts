import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/**
 * Frontend mirror of `WorkflowTestSummary` in
 * `packages/cli/src/modules/workflow-tests/workflow-tests.types.ts`.
 * PoC accepts this duplication rather than sharing types across the cli/editor-ui boundary.
 */
export interface WorkflowTestSummary {
	id: string;
	name: string;
	workflowId: string;
	sourceExecutionId: string;
	triggerNodeName: string;
	mockedNodeNames: string[];
	assertedNodeNames: string[];
	createdAt: string;
}

/** Frontend mirror of `WorkflowTestNodeResult` — see workflowTests.api.ts header note. */
export interface WorkflowTestNodeResult {
	nodeName: string;
	status: 'passed' | 'failed' | 'not-executed';
	/** Only set when status !== 'passed' — JSON-stringified (pretty, 2-space) for the diff viewer. */
	expected?: string;
	actual?: string;
}

/** Frontend mirror of `WorkflowTestRunResult` — see workflowTests.api.ts header note. */
export interface WorkflowTestRunResult {
	testId: string;
	testName: string;
	executionId: string | null;
	/** passed: all assertions match; failed: assertion mismatch; error: run itself errored */
	status: 'passed' | 'failed' | 'error';
	errorMessage?: string;
	firstFailedNode?: string;
	nodeResults: WorkflowTestNodeResult[];
	completedAt: string;
}

export const fetchWorkflowTests = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowTestSummary[]> =>
	await makeRestApiRequest(context, 'GET', '/workflow-tests', { workflowId });

export const createWorkflowTestFromExecution = async (
	context: IRestApiContext,
	executionId: string,
	name?: string,
): Promise<WorkflowTestSummary> =>
	await makeRestApiRequest(context, 'POST', '/workflow-tests', { executionId, name });

export const runWorkflowTest = async (
	context: IRestApiContext,
	testId: string,
): Promise<WorkflowTestRunResult> =>
	await makeRestApiRequest(context, 'POST', `/workflow-tests/${testId}/run`);

export const deleteWorkflowTest = async (
	context: IRestApiContext,
	testId: string,
): Promise<{ success: boolean }> =>
	await makeRestApiRequest(context, 'DELETE', `/workflow-tests/${testId}`);
