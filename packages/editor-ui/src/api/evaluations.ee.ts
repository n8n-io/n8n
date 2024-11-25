import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
export interface TestDefinitionRecord {
	id: string;
	name: string;
	workflowId: string;
	evaluationWorkflowId?: string;
	annotationTagId?: string;
	description?: string;
}
interface CreateTestDefinitionParams {
	name: string;
	workflowId: string;
	evaluationWorkflowId?: string;
}

export interface UpdateTestDefinitionParams {
	name?: string;
	evaluationWorkflowId?: string;
	annotationTagId?: string;
	description?: string;
}
export interface UpdateTestResponse {
	createdAt: string;
	updatedAt: string;
	id: string;
	name: string;
	workflowId: string;
	description: string | null;
	annotationTag: string | null;
	evaluationWorkflowId: string | null;
	annotationTagId: string | null;
}

export interface ITestDefinitionsQueryOptions {
	includeScopes?: boolean;
}

const endpoint = '/evaluation/test-definitions';

export async function getTestDefinitions(
	context: IRestApiContext,
	options?: ITestDefinitionsQueryOptions,
) {
	return await makeRestApiRequest<{ count: number; testDefinitions: TestDefinitionRecord[] }>(
		context,
		'GET',
		endpoint,
		options,
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
