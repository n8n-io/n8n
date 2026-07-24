import type {
<<<<<<< HEAD
=======
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewInboxResponse,
>>>>>>> fe649efcbf42809f4b2307918b7520b23226abaa
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestList,
	WorkflowReviewRequestState,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export interface CreateWorkflowReviewRequestPayload {
	title: string;
	description?: string;
	workflows: Array<{
		workflowId: string;
		workflowVersionId: string;
	}>;
	reviewerUserIds?: string[];
}

<<<<<<< HEAD
=======
export type FetchWorkflowReviewInboxParams = {
	state?: WorkflowReviewRequestState;
	limit?: number;
	cursor?: string;
};

/** Workflow-scoped list used by review-required toggle sync. */
>>>>>>> fe649efcbf42809f4b2307918b7520b23226abaa
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
	query: { workflowId: string },
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
	payload: CreateWorkflowReviewRequestPayload,
): Promise<WorkflowReviewRequestSummary> {
	return await makeRestApiRequest<WorkflowReviewRequestSummary>(
		context,
		'POST',
		'/workflow-review-requests',
		{ ...payload },
	);
}
<<<<<<< HEAD
=======

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
>>>>>>> fe649efcbf42809f4b2307918b7520b23226abaa
