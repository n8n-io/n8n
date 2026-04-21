import type { WorkflowAuthoringChecksPreviewResponse } from '@n8n/api-types';
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
