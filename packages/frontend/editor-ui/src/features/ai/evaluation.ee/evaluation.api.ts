import type { EvalPlan } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, request } from '@n8n/rest-api-client';
import type { JsonObject } from 'n8n-workflow';

export interface TestRunRecord {
	id: string;
	workflowId: string;
	status: 'new' | 'running' | 'completed' | 'error' | 'cancelled' | 'warning' | 'success';
	metrics?: Record<string, number> | null;
	createdAt: string;
	updatedAt: string;
	runAt: string;
	completedAt: string | null;
	errorCode?: string;
	errorDetails?: Record<string, unknown>;
	finalResult?: 'success' | 'error' | 'warning';
}

interface GetTestRunParams {
	workflowId: string;
	runId: string;
}

interface DeleteTestRunParams {
	workflowId: string;
	runId: string;
}

export interface TestCaseExecutionRecord {
	id: string;
	testRunId: string;
	executionId: string;
	status: 'running' | 'completed' | 'error';
	createdAt: string;
	updatedAt: string;
	runAt: string;
	metrics?: Record<string, number>;
	errorCode?: string;
	errorDetails?: Record<string, unknown>;
	inputs?: JsonObject;
	outputs?: JsonObject;
}

const getTestRunsEndpoint = (workflowId: string, runId?: string) =>
	`/workflows/${workflowId}/test-runs${runId ? `/${runId}` : ''}`;

// Get all test runs for a test definition
export const getTestRuns = async (context: IRestApiContext, workflowId: string) => {
	return await makeRestApiRequest<TestRunRecord[]>(context, 'GET', getTestRunsEndpoint(workflowId));
};

// Get specific test run
export const getTestRun = async (context: IRestApiContext, params: GetTestRunParams) => {
	return await makeRestApiRequest<TestRunRecord>(
		context,
		'GET',
		getTestRunsEndpoint(params.workflowId, params.runId),
	);
};

// Start a new test run. `concurrency` is gated server-side on the
// eval_mode_experiment flag — when the flag is off the value is ignored and
// the runner stays sequential.
export const startTestRun = async (
	context: IRestApiContext,
	workflowId: string,
	options: { concurrency?: number } = {},
) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/workflows/${workflowId}/test-runs/new`,
		headers: { 'push-ref': context.pushRef },
		data: options.concurrency !== undefined ? { concurrency: options.concurrency } : {},
	});
	// CLI is returning the response without wrapping it in `data` key
	return response as { success: boolean };
};

export const cancelTestRun = async (
	context: IRestApiContext,
	workflowId: string,
	testRunId: string,
) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/workflows/${workflowId}/test-runs/${testRunId}/cancel`,
		headers: { 'push-ref': context.pushRef },
	});
	// CLI is returning the response without wrapping it in `data` key
	return response as { success: boolean };
};

// Ask the AI wizard for an evaluation plan (dataset rows + metrics) for a
// specific LLM node. The backend falls back to an empty plan on LLM failure,
// so this call always resolves; an empty `datasetRows` array is the signal
// to retry.
export const postEvalPlan = async (
	context: IRestApiContext,
	workflowId: string,
	llmNodeName: string,
	userIntent: string | undefined,
) => {
	return await makeRestApiRequest<EvalPlan>(context, 'POST', '/instance-ai/eval-plan', {
		workflowId,
		llmNodeName,
		...(userIntent ? { userIntent } : {}),
	});
};

// Delete a test run
export const deleteTestRun = async (context: IRestApiContext, params: DeleteTestRunParams) => {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		getTestRunsEndpoint(params.workflowId, params.runId),
	);
};

const getRunExecutionsEndpoint = (workflowId: string, runId: string) =>
	`/workflows/${workflowId}/test-runs/${runId}/test-cases`;

// Get all test cases of a test run
export const getTestCaseExecutions = async (
	context: IRestApiContext,
	workflowId: string,
	runId: string,
) => {
	return await makeRestApiRequest<TestCaseExecutionRecord[]>(
		context,
		'GET',
		getRunExecutionsEndpoint(workflowId, runId),
	);
};
