import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	const response = await makeRestApiRequest(context, 'GET', `/workflows/new`, name ? { name } : {});
	return {
		name: response.name,
		onboardingFlowEnabled: response.onboardingFlowEnabled === true,
	};
}

export async function getWorkflows(context: IRestApiContext, filter?: object) {
	const sendData = filter ? { filter } : undefined;

	return await makeRestApiRequest(context, 'GET', `/workflows`, sendData);
}

export async function getActiveWorkflows(context: IRestApiContext) {
	return await makeRestApiRequest(context, 'GET', `/active`);
}

