import type {
	AddDatasetRowDto,
	DatasetCandidateResponse,
	EvaluationConfigDto,
	StartTestRunPayload,
	UpsertEvaluationConfigDto,
} from '@n8n/api-types';
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
	evaluationConfigId?: string;
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
	| 'evaluation_running'
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
	runIndex?: number | null;
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
	const body: Record<string, unknown> = {};
	if (options?.concurrency !== undefined) body.concurrency = options.concurrency;
	if (options?.evaluationConfigId !== undefined) {
		body.evaluationConfigId = options.evaluationConfigId;
	}
	if (options?.compileFromConfig !== undefined) {
		body.compileFromConfig = options.compileFromConfig;
	}
	const response = await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `/workflows/${workflowId}/test-runs/new`,
		headers: { 'push-ref': context.pushRef },
		// Sending an empty `{}` is equivalent to sending no body — the
		// controller's zod parse resolves the optional fields to undefined.
		data: Object.keys(body).length > 0 ? body : undefined,
	});
	// CLI is returning the response without wrapping it in `data` key
	return response as { success: boolean; testRunId: string };
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

// Persist an EvaluationConfig (the DB entity the runner compiles into a
// Set Metrics workflow). The wizard calls this on step 2 Next before
// dispatching the test run.
export const createEvaluationConfig = async (
	context: IRestApiContext,
	workflowId: string,
	payload: UpsertEvaluationConfigDto,
) => {
	return await makeRestApiRequest<EvaluationConfigDto>(
		context,
		'POST',
		`/workflows/${workflowId}/evaluation-configs`,
		payload as unknown as JsonObject,
	);
};

// EvaluationConfig has a `(workflowId, name)` unique index, so a second run
// of the wizard for the same workflow would otherwise 409. The wizard lists
// existing configs to find a reusable one before deciding create vs update.
export const listEvaluationConfigs = async (context: IRestApiContext, workflowId: string) => {
	return await makeRestApiRequest<EvaluationConfigDto[]>(
		context,
		'GET',
		`/workflows/${workflowId}/evaluation-configs`,
	);
};

export const updateEvaluationConfig = async (
	context: IRestApiContext,
	workflowId: string,
	configId: string,
	payload: UpsertEvaluationConfigDto,
) => {
	return await makeRestApiRequest<EvaluationConfigDto>(
		context,
		'PUT',
		`/workflows/${workflowId}/evaluation-configs/${configId}`,
		payload as unknown as JsonObject,
	);
};

export const deleteEvaluationConfig = async (
	context: IRestApiContext,
	workflowId: string,
	configId: string,
) => {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/workflows/${workflowId}/evaluation-configs/${configId}`,
	);
};

// Inspect a successful execution against an evaluation config for the "Add to dataset" modal.
export const getDatasetCandidate = async (
	context: IRestApiContext,
	workflowId: string,
	configId: string,
	executionId: string,
) => {
	return await makeRestApiRequest<DatasetCandidateResponse>(
		context,
		'GET',
		`/workflows/${workflowId}/evaluation-configs/${configId}/dataset-candidate`,
		{ executionId },
	);
};

// Insert one row into the config's data table, built from the execution per the user-reviewed mapping.
export const addDatasetRow = async (
	context: IRestApiContext,
	workflowId: string,
	configId: string,
	payload: AddDatasetRowDto,
) => {
	return await makeRestApiRequest<Array<{ id: number }>>(
		context,
		'POST',
		`/workflows/${workflowId}/evaluation-configs/${configId}/dataset-rows`,
		payload as unknown as JsonObject,
	);
};

// Pre-emptively cancel a single pending test case (status === 'new').
export const cancelTestCase = async (
	context: IRestApiContext,
	workflowId: string,
	runId: string,
	caseId: string,
) => {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'POST',
		`${getRunExecutionsEndpoint(workflowId, runId)}/${caseId}/cancel`,
	);
};
