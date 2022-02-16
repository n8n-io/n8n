import { IRestApiContext, IWorkflowTemplate } from '@/Interface';
import { makeRestApiRequest, get } from './helpers';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	return await makeRestApiRequest(context, 'GET', `/workflows/new`, name ? { name } : {});
}

export async function getWorkflowTemplate(templateId: string, apiEndpoint: string): Promise<IWorkflowTemplate> {
	return await get(apiEndpoint, `/workflows/templates/${templateId}`);
}
