import type {
<<<<<<< HEAD
	WorkflowReviewEligibleReviewersList,
=======
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestResponse,
	GetWorkflowReviewEligibleReviewersQueryDto,
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewInboxResponse,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestDetail,
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	WorkflowReviewRequestList,
	WorkflowReviewRequestState,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

<<<<<<< HEAD
export interface CreateWorkflowReviewRequestPayload {
	title: string;
	description?: string;
	workflows: Array<{
		workflowId: string;
		workflowVersionId: string;
	}>;
	reviewerUserIds?: string[];
}

=======
export type FetchWorkflowReviewInboxParams = {
	state?: WorkflowReviewRequestState;
	limit?: number;
	cursor?: string;
};

/** A decision a reviewer can submit; `pending` is the initial state, never an input. */
export type WorkflowReviewDecisionInput = Exclude<WorkflowReviewRequestDecision, 'pending'>;

/** Workflow-scoped list used by the review status sync (toggle + canvas banner). */
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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
<<<<<<< HEAD
	query: { workflowId: string },
=======
	query: GetWorkflowReviewEligibleReviewersQueryDto,
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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
<<<<<<< HEAD
	payload: CreateWorkflowReviewRequestPayload,
=======
	payload: CreateWorkflowReviewRequestDto,
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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
): Promise<DecideWorkflowReviewRequestResponse> {
	return await makeRestApiRequest<DecideWorkflowReviewRequestResponse>(
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
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
