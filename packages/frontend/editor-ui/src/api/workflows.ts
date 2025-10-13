import type {
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	IWorkflowDb,
	NewWorkflowResponse,
	WorkflowListResource,
	WorkflowResource,
} from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	ExecutionFilters,
	ExecutionOptions,
	ExecutionSummary,
	IDataObject,
} from 'n8n-workflow';
import { getFullApiResponse, makeRestApiRequest } from '@n8n/rest-api-client';

export async function getNewWorkflow(context: IRestApiContext, data?: IDataObject) {
	const response = await makeRestApiRequest<NewWorkflowResponse>(
		context,
		'GET',
		'/workflows/new',
		data,
	);
	return {
		name: response.name,
		settings: response.defaultSettings,
	};
}

export async function getWorkflow(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<IWorkflowDb>(context, 'GET', `/workflows/${id}`);
}

export async function getWorkflows(context: IRestApiContext, filter?: object, options?: object) {
	return await getFullApiResponse<IWorkflowDb[]>(context, 'GET', '/workflows', {
		includeScopes: true,
		...(filter ? { filter } : {}),
		...(options ? options : {}),
	});
}

export async function getWorkflowsWithNodesIncluded(context: IRestApiContext, nodeTypes: string[]) {
	return await getFullApiResponse<WorkflowResource[]>(
		context,
		'POST',
		'/workflows/with-node-types',
		{
			nodeTypes,
		},
	);
}

export async function getWorkflowsAndFolders(
	context: IRestApiContext,
	filter?: object,
	options?: object,
	includeFolders?: boolean,
	onlySharedWithMe?: boolean,
) {
	return await getFullApiResponse<WorkflowListResource[]>(context, 'GET', '/workflows', {
		includeScopes: true,
		includeFolders,
		onlySharedWithMe,
		...(filter ? { filter } : {}),
		...(options ? options : {}),
	});
}

export async function getActiveWorkflows(context: IRestApiContext) {
	return await makeRestApiRequest<string[]>(context, 'GET', '/active-workflows');
}

export async function getActiveExecutions(context: IRestApiContext, filter: IDataObject) {
	const output = await makeRestApiRequest<{
		results: ExecutionSummary[];
		count: number;
		estimated: boolean;
	}>(context, 'GET', '/executions', { filter });

	return output.results;
}

export async function getExecutions(
	context: IRestApiContext,
	filter?: ExecutionFilters,
	options?: ExecutionOptions,
): Promise<{ count: number; results: IExecutionsCurrentSummaryExtended[]; estimated: boolean }> {
	return await makeRestApiRequest(context, 'GET', '/executions', { filter, ...options });
}

export async function getExecutionData(context: IRestApiContext, executionId: string) {
	return await makeRestApiRequest<IExecutionResponse | null>(
		context,
		'GET',
		`/executions/${executionId}`,
	);
}
