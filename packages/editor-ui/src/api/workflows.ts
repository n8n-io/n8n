import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	const response = await makeRestApiRequest(context, 'GET', `/workflows/new`, name ? { name } : {});
	return {
		name: response.name,
		onboardingFlowEnabled: response.onboardingFlowEnabled === true,
	};
}

