import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewInboxResponse,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestList,
	WorkflowReviewRequestState,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export type FetchWorkflowReviewInboxParams = {
	state?: WorkflowReviewRequestState;
	limit?: number;
	cursor?: string;
};

/** A decision a reviewer can submit; `pending` is the initial state, never an input. */
export type WorkflowReviewDecisionInput = Exclude<WorkflowReviewRequestDecision, 'pending'>;

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
	payload: { workflowId: string; workflowVersionId: string },
): Promise<WorkflowReviewRequestSummary> {
	return await makeRestApiRequest<WorkflowReviewRequestSummary>(
		context,
		'POST',
		`/workflow-review-requests/${workflowReviewRequestId}/update-version`,
		{ ...payload },
	);
}

export async function decideWorkflowReviewRequest(
	context: IRestApiContext,
	workflowReviewRequestId: string,
	payload: { decision: WorkflowReviewDecisionInput },
): Promise<WorkflowReviewRequestSummary> {
	return await makeRestApiRequest<WorkflowReviewRequestSummary>(
		context,
		'POST',
		`/workflow-review-requests/${workflowReviewRequestId}/decision`,
		{ ...payload },
	);
}

export async function fetchWorkflowReviewInboxSummary(
	context: IRestApiContext,
): Promise<GetWorkflowReviewInboxSummaryResponse> {
	return await makeRestApiRequest(context, 'GET', '/workflow-review-requests/summary');
}

/** Cross-project inbox list. */
export async function fetchWorkflowReviewInbox(
	context: IRestApiContext,
	params: FetchWorkflowReviewInboxParams,
): Promise<ListWorkflowReviewInboxResponse> {
	return await makeRestApiRequest(context, 'GET', '/workflow-review-requests/inbox', params);
}

export async function fetchWorkflowReviewRequestDetail(
	context: IRestApiContext,
	workflowReviewRequestId: string,
): Promise<WorkflowReviewRequestDetail> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflow-review-requests/${workflowReviewRequestId}`,
	);
}
