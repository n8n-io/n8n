import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

// Base interface for common properties
export interface ITestDefinitionBase {
	name: string;
	workflowId?: string;
	evaluationWorkflowId?: string;
	description?: string;
	annotationTagId?: string;
}

export interface ITestDefinition extends ITestDefinitionBase {
	id: number;
}

export type CreateTestDefinitionParams = Pick<
	ITestDefinitionBase,
	'name' | 'workflowId' | 'description' | 'evaluationWorkflowId'
>;

export type UpdateTestDefinitionParams = Partial<ITestDefinitionBase>;

// Query options type
export interface ITestDefinitionsQueryOptions {
	includeScopes?: boolean;
}

const endpoint = '/evaluation/test-definitions';

export async function getTestDefinitions(
	context: IRestApiContext,
	options?: ITestDefinitionsQueryOptions,
) {
	return await makeRestApiRequest<{ count: number; testDefinitions: ITestDefinition[] }>(
		context,
		'GET',
		endpoint,
		options,
	);
}

export async function getTestDefinition(context: IRestApiContext, id: number) {
	return await makeRestApiRequest<ITestDefinition>(context, 'GET', `${endpoint}/${id}`);
}

export async function createTestDefinition(
	context: IRestApiContext,
	params: CreateTestDefinitionParams,
) {
	return await makeRestApiRequest<ITestDefinition>(context, 'POST', endpoint, params);
}

export async function updateTestDefinition(
	context: IRestApiContext,
	id: number,
	params: UpdateTestDefinitionParams,
) {
	return await makeRestApiRequest<ITestDefinition>(context, 'PATCH', `${endpoint}/${id}`, params);
}

export async function deleteTestDefinition(context: IRestApiContext, id: number) {
	return await makeRestApiRequest<{ success: boolean }>(context, 'DELETE', `${endpoint}/${id}`);
}
