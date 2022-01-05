import { IRestApiContext, IWorkflowTemplate } from '@/Interface';
import { makeRestApiRequest, get } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export async function getNewWorkflow(context: IRestApiContext, name?: string) {
	return await makeRestApiRequest(context, 'GET', `/workflows/new`, name ? { name } : {});
}

export async function getWorkflowTemplate(templateId: string): Promise<IWorkflowTemplate> {
	return await get(TEMPLATES_BASE_URL, `/workflows/templates/${templateId}`);
}
