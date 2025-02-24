import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest, request } from '@/utils/apiUtils';

export interface TestDefinitionRecord {
	id: string;
	name: string;
	workflowId: string;
	evaluationWorkflowId?: string | null;
	annotationTagId?: string | null;
	description?: string | null;
	updatedAt?: string;
	createdAt: string;
	annotationTag?: string | null;
	mockedNodes?: Array<{ name: string; id: string }>;
}

interface CreateTestDefinitionParams {
	name: string;
	workflowId: string;
	evaluationWorkflowId?: string | null;
}

export interface UpdateTestDefinitionParams {
	name?: string;
	evaluationWorkflowId?: string | null;
	annotationTagId?: string | null;
	description?: string | null;
	mockedNodes?: Array<{ name: string; id: string }>;
}

export interface UpdateTestResponse {
	createdAt: string;
	updatedAt: string;
	id: string;
	name: string;
	workflowId: string;
	description?: string | null;
	annotationTag?: string | null;
	evaluationWorkflowId?: string | null;
	annotationTagId?: string | null;
}

export interface TestRunRecord {
	id: string;
	testDefinitionId: string;
	status: 'new' | 'running' | 'completed' | 'error' | 'cancelled' | 'warning' | 'success';
	metrics?: Record<string, number>;
	createdAt: string;
	updatedAt: string;
	runAt: string;
	completedAt: string;
	errorCode?: string;
	errorDetails?: Record<string, unknown>;
	finalResult?: 'success' | 'error' | 'warning';
	failedCases?: number;
	passedCases?: number;
	totalCases?: number;
}

interface GetTestRunParams {
	testDefinitionId: string;
	runId: string;
}

interface DeleteTestRunParams {
	testDefinitionId: string;
	runId: string;
}

export interface TestCaseExecutionRecord {
	id: string;
	testRunId: string;
	executionId: string;
	pastExecutionId: string;
	evaluationExecutionId: string;
	status: 'running' | 'completed' | 'error';
	createdAt: string;
	updatedAt: string;
	runAt: string;
	metrics?: Record<string, number>;
	errorCode?: string;
	errorDetails?: Record<string, unknown>;
}

const endpoint = '/evaluation/test-definitions';
const getMetricsEndpoint = (testDefinitionId: string, metricId?: string) =>
	`${endpoint}/${testDefinitionId}/metrics${metricId ? `/${metricId}` : ''}`;

export async function getTestDefinitions(
	context: IRestApiContext,
	params?: { workflowId?: string },
) {
	let url = endpoint;
	if (params?.workflowId) {
		url += `?filter=${JSON.stringify({ workflowId: params.workflowId })}`;
	}
	return await makeRestApiRequest<{ count: number; testDefinitions: TestDefinitionRecord[] }>(
		context,
		'GET',
		url,
	);
}

export async function getTestDefinition(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<TestDefinitionRecord>(context, 'GET', `${endpoint}/${id}`);
}

export async function createTestDefinition(
	context: IRestApiContext,
	params: CreateTestDefinitionParams,
) {
	return await makeRestApiRequest<TestDefinitionRecord>(context, 'POST', endpoint, params);
}

export async function updateTestDefinition(
	context: IRestApiContext,
	id: string,
	params: UpdateTestDefinitionParams,
) {
	return await makeRestApiRequest<UpdateTestResponse>(
		context,
		'PATCH',
		`${endpoint}/${id}`,
		params,
	);
}

export async function deleteTestDefinition(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<{ success: boolean }>(context, 'DELETE', `${endpoint}/${id}`);
}

export async function getExampleEvaluationInput(
	context: IRestApiContext,
	testDefinitionId: string,
	annotationTagId: string,
) {
	return await makeRestApiRequest<Record<string, unknown> | null>(
		context,
		'GET',
		`${endpoint}/${testDefinitionId}/example-evaluation-input?annotationTagId=${annotationTagId}`,
	);
}

// Metrics
export interface TestMetricRecord {
	id: string;
	name: string;
	testDefinitionId: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateTestMetricParams {
	testDefinitionId: string;
	name: string;
}

export interface UpdateTestMetricParams {
	name: string;
	id: string;
	testDefinitionId: string;
}

export interface DeleteTestMetricParams {
	testDefinitionId: string;
	id: string;
}

export const getTestMetrics = async (context: IRestApiContext, testDefinitionId: string) => {
	return await makeRestApiRequest<TestMetricRecord[]>(
		context,
		'GET',
		getMetricsEndpoint(testDefinitionId),
	);
};

export const getTestMetric = async (
	context: IRestApiContext,
	testDefinitionId: string,
	id: string,
) => {
	return await makeRestApiRequest<TestMetricRecord>(
		context,
		'GET',
		getMetricsEndpoint(testDefinitionId, id),
	);
};

export const createTestMetric = async (
	context: IRestApiContext,
	params: CreateTestMetricParams,
) => {
	return await makeRestApiRequest<TestMetricRecord>(
		context,
		'POST',
		getMetricsEndpoint(params.testDefinitionId),
		{ name: params.name },
	);
};

export const updateTestMetric = async (
	context: IRestApiContext,
	params: UpdateTestMetricParams,
) => {
	return await makeRestApiRequest<TestMetricRecord>(
		context,
		'PATCH',
		getMetricsEndpoint(params.testDefinitionId, params.id),
		{ name: params.name },
	);
};

export const deleteTestMetric = async (
	context: IRestApiContext,
	params: DeleteTestMetricParams,
) => {
	return await makeRestApiRequest(
		context,
		'DELETE',
		getMetricsEndpoint(params.testDefinitionId, params.id),
	);
};

const getRunsEndpoint = (testDefinitionId: string, runId?: string) =>
	`${endpoint}/${testDefinitionId}/runs${runId ? `/${runId}` : ''}`;

// Get all test runs for a test definition
export const getTestRuns = async (context: IRestApiContext, testDefinitionId: string) => {
	return await makeRestApiRequest<TestRunRecord[]>(
		context,
		'GET',
		getRunsEndpoint(testDefinitionId),
	);
};

// Get specific test run
export const getTestRun = async (context: IRestApiContext, params: GetTestRunParams) => {
	return await makeRestApiRequest<TestRunRecord>(
		context,
		'GET',
		getRunsEndpoint(params.testDefinitionId, params.runId),
	);
};

// Start a new test run
export const startTestRun = async (context: IRestApiContext, testDefinitionId: string) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${endpoint}/${testDefinitionId}/run`,
		headers: { 'push-ref': context.pushRef },
	});
	// CLI is returning the response without wrapping it in `data` key
	return response as { success: boolean };
};

export const cancelTestRun = async (
	context: IRestApiContext,
	testDefinitionId: string,
	testRunId: string,
) => {
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${endpoint}/${testDefinitionId}/runs/${testRunId}/cancel`,
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
		getRunsEndpoint(params.testDefinitionId, params.runId),
	);
};

const getRunExecutionsEndpoint = (testDefinitionId: string, runId: string) =>
	`${endpoint}/${testDefinitionId}/runs/${runId}/cases`;

// Get all test cases of a test run
export const getTestCaseExecutions = async (
	context: IRestApiContext,
	testDefinitionId: string,
	runId: string,
) => {
	return await makeRestApiRequest<TestCaseExecutionRecord[]>(
		context,
		'GET',
		getRunExecutionsEndpoint(testDefinitionId, runId),
	);
};
