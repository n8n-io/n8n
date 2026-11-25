import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ProjectWorkflowReviewSettingsResponse,
	UpdateProjectWorkflowReviewSettingsDto,
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

export async function getProjectWorkflowReviewSettings(
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectWorkflowReviewSettingsResponse> {
	return await makeRestApiRequest<ProjectWorkflowReviewSettingsResponse>(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/workflow-review-settings`,
	);
}

export async function updateProjectWorkflowReviewSettings(
	context: IRestApiContext,
	projectId: string,
	payload: UpdateProjectWorkflowReviewSettingsDto,
): Promise<ProjectWorkflowReviewSettingsResponse> {
	return await makeRestApiRequest<ProjectWorkflowReviewSettingsResponse>(
		context,
		'PATCH',
		`/projects/${encodeURIComponent(projectId)}/workflow-review-settings`,
		{ ...payload },
	);
}
