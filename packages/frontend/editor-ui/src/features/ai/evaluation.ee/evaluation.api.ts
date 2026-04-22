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

// Start a new test run
export const startTestRun = async (context: IRestApiContext, workflowId: string) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/workflows/${workflowId}/test-runs/new`,
		headers: { 'push-ref': context.pushRef },
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
