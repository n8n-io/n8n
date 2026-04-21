import type {
	CreateWorkflowCheckDto,
	UpdateWorkflowCheckDto,
	WorkflowAuthoringCheckTypesListResponse,
	WorkflowAuthoringChecksListResponse,
	WorkflowAuthoringChecksPreviewResponse,
	WorkflowCheckDto,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function previewWorkflowAuthoringChecks(
	context: IRestApiContext,
	workflowId: string,
	versionId?: string,
): Promise<WorkflowAuthoringChecksPreviewResponse> {
	return await makeRestApiRequest<WorkflowAuthoringChecksPreviewResponse>(
		context,
		'GET',
		`/workflow-authoring-checks/preview/${workflowId}`,
		versionId ? { versionId } : undefined,
	);
}

export async function listWorkflowChecks(
	context: IRestApiContext,
): Promise<WorkflowAuthoringChecksListResponse> {
	return await makeRestApiRequest<WorkflowAuthoringChecksListResponse>(
		context,
		'GET',
		'/workflow-authoring-checks',
	);
}

export async function listWorkflowCheckTypes(
	context: IRestApiContext,
): Promise<WorkflowAuthoringCheckTypesListResponse> {
	return await makeRestApiRequest<WorkflowAuthoringCheckTypesListResponse>(
		context,
		'GET',
		'/workflow-authoring-checks/types',
	);
}

export async function createWorkflowCheck(
	context: IRestApiContext,
	body: CreateWorkflowCheckDto,
): Promise<WorkflowCheckDto> {
	return await makeRestApiRequest<WorkflowCheckDto>(
		context,
		'POST',
		'/workflow-authoring-checks',
		body as unknown as Record<string, unknown>,
	);
}

export async function updateWorkflowCheck(
	context: IRestApiContext,
	id: string,
	patch: UpdateWorkflowCheckDto,
): Promise<WorkflowCheckDto> {
	return await makeRestApiRequest<WorkflowCheckDto>(
		context,
		'PATCH',
		`/workflow-authoring-checks/${encodeURIComponent(id)}`,
		patch as unknown as Record<string, unknown>,
	);
}

export async function deleteWorkflowCheck(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/workflow-authoring-checks/${encodeURIComponent(id)}`,
	);
}
