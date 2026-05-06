import type { StartTestRunPayload } from '@n8n/api-types';
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

export type TestCaseExecutionStatus =
	| 'new'
	| 'running'
	| 'success'
	| 'error'
	| 'warning'
	| 'cancelled';

export interface TestCaseExecutionRecord {
	id: string;
	testRunId?: string; // FK not surfaced by API; store stamps it on records.
	executionId: string | null;
	status: TestCaseExecutionStatus;
	createdAt: string;
	updatedAt: string;
	runAt: string | null;
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

// FE alias of the shared payload contract from @n8n/api-types. Re-exporting
// instead of duplicating the shape avoids silent drift between FE and BE.
export type StartTestRunOptions = StartTestRunPayload;

// Start a new test run
export const startTestRun = async (
	context: IRestApiContext,
	workflowId: string,
	options?: StartTestRunOptions,
) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/workflows/${workflowId}/test-runs/new`,
		headers: { 'push-ref': context.pushRef },
		// `data: undefined` sends an empty POST body. Express's body-parser
		// normalises that to `req.body = {}`, which the controller's zod parse
		// resolves to `concurrency: undefined`, defaulting to sequential.
		data: options?.concurrency !== undefined ? { concurrency: options.concurrency } : undefined,
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
