import type {
	ProjectReviewPolicyView,
	ReviewRequirementPatch,
	WorkflowReviewPolicyView,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function fetchProjectReviewPolicy(
	context: IRestApiContext,
	projectId: string,
): Promise<ProjectReviewPolicyView> {
	return await makeRestApiRequest<ProjectReviewPolicyView>(
		context,
		'GET',
		`/workflow-review-policies/projects/${encodeURIComponent(projectId)}`,
	);
}

export async function updateProjectReviewPolicy(
	context: IRestApiContext,
	projectId: string,
	patch: ReviewRequirementPatch,
): Promise<ProjectReviewPolicyView> {
	return await makeRestApiRequest<ProjectReviewPolicyView>(
		context,
		'PATCH',
		`/workflow-review-policies/projects/${encodeURIComponent(projectId)}`,
		patch,
	);
}

export async function fetchWorkflowReviewPolicy(
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowReviewPolicyView> {
	return await makeRestApiRequest<WorkflowReviewPolicyView>(
		context,
		'GET',
		`/workflow-review-policies/workflows/${encodeURIComponent(workflowId)}`,
	);
}

export async function updateWorkflowReviewPolicy(
	context: IRestApiContext,
	workflowId: string,
	patch: ReviewRequirementPatch,
): Promise<WorkflowReviewPolicyView> {
	return await makeRestApiRequest<WorkflowReviewPolicyView>(
		context,
		'PATCH',
		`/workflow-review-policies/workflows/${encodeURIComponent(workflowId)}`,
		patch,
	);
}
