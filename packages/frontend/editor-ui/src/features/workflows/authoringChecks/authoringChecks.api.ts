import type {
	WorkflowAuthoringChecksListResponse,
	WorkflowAuthoringChecksPreviewResponse,
	WorkflowAuthoringCheckSeverity,
	WorkflowCheckConfigDto,
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

export async function listWorkflowAuthoringChecks(
	context: IRestApiContext,
): Promise<WorkflowAuthoringChecksListResponse> {
	return await makeRestApiRequest<WorkflowAuthoringChecksListResponse>(
		context,
		'GET',
		'/workflow-authoring-checks',
	);
}

export async function updateWorkflowAuthoringCheckConfig(
	context: IRestApiContext,
	checkId: string,
	patch: {
		enabled?: boolean;
		severityOverride?: WorkflowAuthoringCheckSeverity | null;
	},
): Promise<WorkflowCheckConfigDto> {
	return await makeRestApiRequest<WorkflowCheckConfigDto>(
		context,
		'PATCH',
		`/workflow-authoring-checks/${encodeURIComponent(checkId)}`,
		patch,
	);
}
