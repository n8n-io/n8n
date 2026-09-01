import type {
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestResponse,
	GetWorkflowReviewEligibleReviewersQueryDto,
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewActivityResponse,
	ListWorkflowReviewInboxResponse,
	UpdateWorkflowReviewRequestVersionDto,
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewInboxCategory,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestList,
	WorkflowReviewRequestState,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export type FetchWorkflowReviewInboxParams = {
	state?: WorkflowReviewRequestState;
	/** Partitions the open tab by authorship */
	category?: WorkflowReviewInboxCategory;
	limit?: number;
	cursor?: string;
};

/** What a reviewer submits with a decision; `pending` is the initial state, never an input. */
export type WorkflowReviewDecisionInput = Pick<DecideWorkflowReviewRequestDto, 'decision' | 'note'>;

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
