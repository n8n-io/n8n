import type {
	DecideWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestResponse,
	ListWorkflowReviewActivityResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

/** What a reviewer submits with a decision; `pending` is the initial state, never an input. */
export type WorkflowReviewDecisionInput = Pick<DecideWorkflowReviewRequestDto, 'decision' | 'note'>;

export async function decideWorkflowReviewRequest(
	context: IRestApiContext,
	workflowReviewRequestId: string,
	payload: DecideWorkflowReviewRequestDto,
): Promise<DecideWorkflowReviewRequestResponse> {
	return await makeRestApiRequest<DecideWorkflowReviewRequestResponse>(
		context,
		'POST',
		`/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/decision`,
		{ ...payload },
	);
}

export async function fetchWorkflowReviewRequestDetail(
	context: IRestApiContext,
	workflowReviewRequestId: string,
): Promise<WorkflowReviewRequestDetail> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}`,
	);
}

export async function fetchWorkflowReviewActivity(
	context: IRestApiContext,
	workflowReviewRequestId: string,
	params: { limit?: number; cursor?: string },
): Promise<ListWorkflowReviewActivityResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/activity`,
		params,
	);
}

export async function createWorkflowReviewComment(
	context: IRestApiContext,
	workflowReviewRequestId: string,
	payload: { body: string },
): Promise<WorkflowReviewActivityEntry> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/comments`,
		{ ...payload },
	);
}
