import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export interface TestDefinitionRecord {
	id: string;
	name: string;
	workflowId: string;
	evaluationWorkflowId?: string | null;
	annotationTagId?: string | null;
	description?: string | null;
	updatedAt?: string;
	createdAt?: string;
	annotationTag: string | null;
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

const endpoint = '/evaluation/test-definitions';
const getMetricsEndpoint = (testDefinitionId: string) => `${endpoint}/${testDefinitionId}/metrics`;

export async function getTestDefinitions(context: IRestApiContext) {
	return await makeRestApiRequest<{ count: number; testDefinitions: TestDefinitionRecord[] }>(
		context,
		'GET',
		endpoint,
	);
}

export async function getTestDefinition(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<{ id: string }>(context, 'GET', `${endpoint}/${id}`);
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
		`${getMetricsEndpoint(testDefinitionId)}/${id}`,
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
		`${getMetricsEndpoint(params.testDefinitionId)}/${params.id}`,
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
		`${getMetricsEndpoint(params.testDefinitionId)}/${params.id}`,
	);
};
