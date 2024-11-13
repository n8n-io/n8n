import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

// Base interface for common properties
export interface ITestDefinitionBase {
	name: string;
	workflowId: string;
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

export interface ITestDefinitionsApi {
	getTestDefinitions: (
		context: IRestApiContext,
		options?: ITestDefinitionsQueryOptions,
	) => Promise<{ count: number; testDefinitions: ITestDefinition[] }>;

	getTestDefinition: (context: IRestApiContext, id: number) => Promise<ITestDefinition>;

	createTestDefinition: (
		context: IRestApiContext,
		params: CreateTestDefinitionParams,
	) => Promise<ITestDefinition>;

	updateTestDefinition: (
		context: IRestApiContext,
		id: number,
		params: UpdateTestDefinitionParams,
	) => Promise<ITestDefinition>;

	deleteTestDefinition: (context: IRestApiContext, id: number) => Promise<{ success: boolean }>;
}

export function createTestDefinitionsApi(): ITestDefinitionsApi {
	const endpoint = '/evaluation/test-definitions';

	return {
		getTestDefinitions: async (
			context: IRestApiContext,
			options?: ITestDefinitionsQueryOptions,
		) => {
			return await makeRestApiRequest(context, 'GET', endpoint, options);
		},

		getTestDefinition: async (context: IRestApiContext, id: number) => {
			return await makeRestApiRequest(context, 'GET', `${endpoint}/${id}`);
		},

		createTestDefinition: async (context: IRestApiContext, params: CreateTestDefinitionParams) => {
			return await makeRestApiRequest(context, 'POST', endpoint, params);
		},

		updateTestDefinition: async (
			context: IRestApiContext,
			id: number,
			params: UpdateTestDefinitionParams,
		) => {
			return await makeRestApiRequest(context, 'PATCH', `${endpoint}/${id}`, params);
		},

		deleteTestDefinition: async (context: IRestApiContext, id: number) => {
			return await makeRestApiRequest(context, 'DELETE', `${endpoint}/${id}`);
		},
	};
}
