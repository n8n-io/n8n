import type { IExecutionsCurrentSummaryExtended, IRestApiContext } from '@/Interface';
import type { ExecutionFilters, ExecutionOptions, IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	const response = await makeRestApiRequest(context, 'GET', '/workflows/new', name ? { name } : {});
	return {
		name: response.name,
		onboardingFlowEnabled: response.onboardingFlowEnabled === true,
	};
}

export async function getWorkflow(context: IRestApiContext, id: string, filter?: object) {
	const sendData = filter ? { filter } : undefined;

	return makeRestApiRequest(context, 'GET', `/workflows/${id}`, sendData);
}

export async function getWorkflows(context: IRestApiContext, filter?: object) {
	const sendData = filter ? { filter } : undefined;

	return makeRestApiRequest(context, 'GET', '/workflows', sendData);
}

export async function getActiveWorkflows(context: IRestApiContext) {
	return makeRestApiRequest(context, 'GET', '/active');
}

export async function getCurrentExecutions(context: IRestApiContext, filter: IDataObject) {
	return makeRestApiRequest(context, 'GET', '/executions-current', { filter });
}

export async function getExecutions(
	context: IRestApiContext,
	filter?: ExecutionFilters,
	options?: ExecutionOptions,
): Promise<{ count: number; results: IExecutionsCurrentSummaryExtended[]; estimated: boolean }> {
	return makeRestApiRequest(context, 'GET', '/executions', { filter, ...options });
}

export async function getExecutionData(context: IRestApiContext, executionId: string) {
	return makeRestApiRequest(context, 'GET', `/executions/${executionId}`);
}
