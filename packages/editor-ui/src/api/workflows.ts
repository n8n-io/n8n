import { IRestApiContext } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	const response = await makeRestApiRequest(context, 'GET', '/workflows/new', name ? { name } : {});
	return {
		name: response.name,
		onboardingFlowEnabled: response.onboardingFlowEnabled === true,
	};
}

export async function getWorkflow(context: IRestApiContext, id: string, filter?: object) {
	const sendData = filter ? { filter } : undefined;

	return await makeRestApiRequest(context, 'GET', `/workflows/${id}`, sendData);
}

export async function getWorkflows(context: IRestApiContext, filter?: object) {
	const sendData = filter ? { filter } : undefined;

	return await makeRestApiRequest(context, 'GET', '/workflows', sendData);
}

export async function getActiveWorkflows(context: IRestApiContext) {
	return await makeRestApiRequest(context, 'GET', '/active');
}

export async function getCurrentExecutions(context: IRestApiContext, filter: IDataObject) {
	return await makeRestApiRequest(context, 'GET', '/executions-current', { filter });
}

export async function getFinishedExecutions(context: IRestApiContext, filter: IDataObject) {
	return await makeRestApiRequest(context, 'GET', '/executions', { filter });
}

export async function getExecutionData(context: IRestApiContext, executionId: string) {
	return await makeRestApiRequest(context, 'GET', `/executions/${executionId}`);
}
