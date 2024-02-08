import type { ITemplatesWorkflowResponse, IWorkflowTemplate } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { get } from '@/utils/apiUtils';

export async function testHealthEndpoint(apiEndpoint: string) {
	return await get(apiEndpoint, '/health');
}

export async function getTemplateById(
	apiEndpoint: string,
	templateId: string,
	headers?: IDataObject,
): Promise<{ workflow: ITemplatesWorkflowResponse }> {
	return await get(apiEndpoint, `/templates/workflows/${templateId}`, undefined, headers);
}

export async function getWorkflowTemplate(
	apiEndpoint: string,
	templateId: string,
	headers?: IDataObject,
): Promise<IWorkflowTemplate> {
	return await get(apiEndpoint, `/workflows/templates/${templateId}`, undefined, headers);
}
