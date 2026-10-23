import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	UpdateWorkflowReviewRequestVersionDto,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestList,
	WorkflowReviewRequestState,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

/** Workflow-scoped list used by the review status sync (toggle + canvas banner). */
export async function fetchWorkflowReviewRequests(
	context: IRestApiContext,
	query: { workflowId: string; state?: WorkflowReviewRequestState; take?: number; skip?: number },
): Promise<WorkflowReviewRequestList> {
	return await makeRestApiRequest<WorkflowReviewRequestList>(
		context,
		'GET',
		'/workflow-review-requests',
		{ ...query },
	);
}

export async function fetchEligibleReviewers(
	context: IRestApiContext,
	query: GetWorkflowReviewEligibleReviewersQueryDto,
): Promise<WorkflowReviewEligibleReviewersList> {
	return await makeRestApiRequest<WorkflowReviewEligibleReviewersList>(
		context,
		'GET',
		'/workflow-review-requests/eligible-reviewers',
		{ ...query },
	);
}

export async function createWorkflowReviewRequest(
	context: IRestApiContext,
	payload: CreateWorkflowReviewRequestDto,
): Promise<WorkflowReviewRequestSummary> {
	return await makeRestApiRequest<WorkflowReviewRequestSummary>(
		context,
		'POST',
		'/workflow-review-requests',
		{ ...payload },
	);
}

export async function updateWorkflowReviewRequestVersion(
	context: IRestApiContext,
	workflowReviewRequestId: string,
	payload: UpdateWorkflowReviewRequestVersionDto,
): Promise<WorkflowReviewRequestSummary> {
	return await makeRestApiRequest<WorkflowReviewRequestSummary>(
		context,
		'POST',
		`/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/update-version`,
		{ ...payload },
	);
}
