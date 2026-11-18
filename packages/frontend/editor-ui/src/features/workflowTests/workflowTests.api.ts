import type { WorkflowTestCallers, WorkflowTestFile } from '@n8n/api-types';
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

/** The workflows that call this one as a sub-workflow, with the state of their tests. */
export async function getWorkflowTestCallers(
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowTestCallers> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/tests/callers`);
}

/** Runs the tests of each caller, with the draft of this workflow in each caller's package. */
export async function runWorkflowTestCallers(
	context: IRestApiContext,
	workflowId: string,
): Promise<{ started: string[] }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/workflows/${workflowId}/tests/callers/run`,
		{},
	);
}

export async function runWorkflowTests(
	context: IRestApiContext,
	workflowId: string,
	id: string,
): Promise<{ runId: string }> {
	return await makeRestApiRequest(context, 'POST', `/workflows/${workflowId}/tests/${id}/run`, {});
}
