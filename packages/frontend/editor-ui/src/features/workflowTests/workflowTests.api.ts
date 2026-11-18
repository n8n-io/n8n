import type { WorkflowTestFile } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function getWorkflowTests(
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowTestFile[]> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/tests`);
}

export async function saveWorkflowTests(
	context: IRestApiContext,
	workflowId: string,
	source: string,
): Promise<WorkflowTestFile> {
	return await makeRestApiRequest(context, 'PUT', `/workflows/${workflowId}/tests`, { source });
}

export async function runWorkflowTests(
	context: IRestApiContext,
	workflowId: string,
	id: string,
): Promise<{ runId: string }> {
	return await makeRestApiRequest(context, 'POST', `/workflows/${workflowId}/tests/${id}/run`, {});
}
