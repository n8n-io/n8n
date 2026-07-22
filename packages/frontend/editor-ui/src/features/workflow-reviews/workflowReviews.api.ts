import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export interface CreateWorkflowReviewRequestPayload {
	title: string;
	description?: string;
	workflows: Array<{
		workflowId: string;
		workflowVersionId: string;
	}>;
}

export interface WorkflowReviewRequest {
	id: string;
	state: 'open';
	decision: 'pending';
}

export async function createWorkflowReviewRequest(
	context: IRestApiContext,
	payload: CreateWorkflowReviewRequestPayload,
): Promise<WorkflowReviewRequest> {
	return await makeRestApiRequest<WorkflowReviewRequest>(
		context,
		'POST',
		'/workflow-review-requests',
		{ ...payload },
	);
}
